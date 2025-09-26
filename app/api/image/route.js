// app/api/image/route.js
export const runtime = "nodejs";

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // fine if undefined
});

const ALLOWED_SIZES = new Set(["256x256", "512x512", "1024x1024"]);

// Small helper for consistent JSON responses
const json = (data, status = 200) => Response.json(data, { status });

// Promise timeout guard to avoid serverless 504s
function withTimeout(promise, ms = 25000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Image request timed out")), ms)
    ),
  ]);
}

async function generateOnce({ prompt, size }) {
  const res = await withTimeout(
    client.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
    }),
    25000 // 25s per attempt
  );
  const b64 = res?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data returned");
  return b64;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { prompt, size = "1024x1024" } = body || {};

    if (typeof prompt !== "string") prompt = "";
    prompt = prompt.trim();
    if (!prompt) return json({ ok: false, error: "Missing prompt text." }, 400);
    if (!ALLOWED_SIZES.has(size)) size = "1024x1024";

    // try requested size, then step down if needed
    const sizes = [size, ...(size !== "512x512" ? ["512x512"] : []), ...(size !== "256x256" ? ["256x256"] : [])];

    let lastErr = null;
    for (const s of sizes) {
      try {
        const b64 = await generateOnce({ prompt, size: s });
        return json({ ok: true, b64, size: s, downgraded: s !== size });
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Image generation failed");
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.status === 403 && msg.toLowerCase().includes("verify")) {
      return json(
        { ok: false, error: "Org verification required for gpt-image-1." },
        403
      );
    }
    if (msg.includes("timed out")) {
      return json({ ok: false, error: "HTTP 504: Image timed out. Try a shorter prompt." }, 504);
    }
    return json({ ok: false, error: msg || "Image error" }, e?.status ?? 500);
  }
}

// Single GET (help text)
export async function GET() {
  return new Response(
    "POST JSON: { prompt: string, size?: '256x256'|'512x512'|'1024x1024' }",
    { status: 405 }
  );
}

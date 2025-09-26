// app/api/image/route.js
export const runtime = "nodejs";

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // fine if undefined
});

const ALLOWED_SIZES = new Set(["256x256", "512x512", "1024x1024"]);

function json(data, status = 200) {
  return Response.json(data, { status });
}

function withTimeout(promise, ms = 20000) {
  // Reject if the model takes too long (prevents 504s from Vercel)
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
    20000 // 20s timeout window
  );
  const b64 = res?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data returned");
  return b64;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { prompt, size = "512x512" } = body || {};

    if (typeof prompt !== "string") prompt = "";
    prompt = prompt.trim();
    if (!prompt) return json({ ok: false, error: "Missing prompt text." }, 400);
    if (!ALLOWED_SIZES.has(size)) size = "512x512";

    try {
      const b64 = await generateOnce({ prompt, size });
      return json({ ok: true, b64, size });
    } catch (e) {
      // Retry one step smaller if possible
      if (size !== "256x256") {
        try {
          const b64 = await generateOnce({ prompt, size: "256x256" });
          return json({ ok: true, b64, size: "256x256", downgraded: true });
        } catch (e2) {
          // fall through to error handler below
        }
      }
      throw e;
    }
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.status === 403 && msg.toLowerCase().includes("verify")) {
      return json(
        { ok: false, error: "Org verification required for gpt-image-1.", needsVerification: true },
        403
      );
    }
    if (msg.includes("timed out")) {
      return json({ ok: false, error: "Image timed out. Try a shorter prompt or smaller size." }, 504);
    }
    return json({ ok: false, error: msg || "Image error" }, e?.status ?? 500);
  }
}

// Single GET for help text (avoid duplicate GET exports)
export async function GET() {
  return new Response(
    "POST JSON: { prompt: string, size?: '256x256'|'512x512'|'1024x1024' }",
    { status: 405 }
  );
}

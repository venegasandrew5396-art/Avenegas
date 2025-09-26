// app/api/image/route.js
export const runtime = "nodejs";
export const maxDuration = 60; // give Vercel up to 60s if your plan allows

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // ok if undefined
});

const VALID_SIZES = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
const json = (data, status = 200) => Response.json(data, { status });

function withTimeout(promise, ms = 45000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Image request timed out")), ms)
    ),
  ]);
}

async function tryGenerate({ prompt, size }) {
  const res = await withTimeout(
    client.images.generate({
      model: "gpt-image-1",
      prompt,
      size, // "auto" | "1024x1024" | "1024x1536" | "1536x1024"
    }),
    45000
  );
  const b64 = res?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data returned");
  return b64;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { prompt, size = "auto" } = body || {};

    if (typeof prompt !== "string") prompt = "";
    prompt = prompt.trim();
    if (!prompt) return json({ ok: false, error: "Missing prompt text." }, 400);

    if (!VALID_SIZES.has(size)) size = "auto";

    // OPTIONAL: append your style from env
    const style = (process.env.MY_ART_STYLE || "").trim();
    if (style) prompt = `${prompt}, ${style}`;

    // Try up to 3 times with backoff (auto -> 1024 -> 1024 again)
    const plan = [size, "1024x1024", "1024x1024"];
    let lastErr;
    for (let i = 0; i < plan.length; i++) {
      try {
        const s = plan[i];
        const b64 = await tryGenerate({ prompt, size: s });
        return json({ ok: true, b64, size: s, retries: i });
      } catch (e) {
        lastErr = e;
        // exponential backoff: 0.5s, 1s
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
      }
    }
    throw lastErr || new Error("Image generation failed.");
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.status === 403 && msg.toLowerCase().includes("verify")) {
      return json({ ok: false, error: "Org verification required for gpt-image-1." }, 403);
    }
    if (msg.includes("timed out")) {
      return json({ ok: false, error: "HTTP 504: Image timed out. Try again or simplify the prompt." }, 504);
    }
    return json({ ok: false, error: msg || "Image error" }, e?.status ?? 500);
  }
}

export async function GET() {
  return new Response(
    "POST JSON: { prompt: string, size?: 'auto'|'1024x1024'|'1024x1536'|'1536x1024' }",
    { status: 405 }
  );
}

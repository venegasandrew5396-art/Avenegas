// app/api/image/route.js
export const runtime = "nodejs";
export const preferredRegion = "iad1";   // East (close to you)
export const maxDuration = 60;           // used if plan allows

import OpenAI from "openai";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // ok if undefined
});

// Valid sizes per latest API
const VALID_SIZES = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
const json = (data, status = 200) => Response.json(data, { status });

// short timeout (Hobby often has ~10s); we’ll retry quickly
function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ]);
}

function trimPrompt(p) {
  if (!p) return "";
  p = p.trim().replace(/\s+/g, " ");
  if (p.length > 500) p = p.slice(0, 500); // keep it reasonable
  return p;
}

async function tryOnce({ prompt, size }) {
  const res = await withTimeout(
    client.images.generate({
      model: "gpt-image-1",
      prompt,
      size, // 'auto' | '1024x1024' | '1024x1536' | '1536x1024'
    }),
    12000
  );
  const b64 = res?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data returned");
  return b64;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { prompt, size = "1024x1024" } = body || {};

    prompt = trimPrompt(prompt);
    if (!prompt) return json({ ok: false, error: "Missing prompt text." }, 400);
    if (!VALID_SIZES.has(size)) size = "1024x1024";

    // Append art style from env if present
    const style = (process.env.MY_ART_STYLE || "").trim();
    if (style) prompt = `${prompt}, ${style}`;

    // Two quick tries (short backoff). Keep size fixed to reduce variability.
    for (let i = 0; i < 2; i++) {
      try {
        const b64 = await tryOnce({ prompt, size });
        return json({ ok: true, b64, size, retries: i });
      } catch (e) {
        if (i === 0) await new Promise(r => setTimeout(r, 600));
      }
    }
    return json({ ok: false, error: "HTTP 504: Image timed out. Try a shorter prompt or 'auto' size." }, 504);
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.status === 403 && msg.toLowerCase().includes("verify")) {
      return json({ ok: false, error: "Org verification required for gpt-image-1." }, 403);
    }
    if (msg.includes("timed out")) {
      return json({ ok: false, error: "HTTP 504: Image timed out." }, 504);
    }
    return json({ ok: false, error: msg || "Image error" }, e?.status ?? 500);
  }
}

export async function GET() {
  return new Response(
    "POST JSON: { prompt: string, size?: '1024x1024'|'1024x1536'|'1536x1024'|'auto' }",
    { status: 405 }
  );
}

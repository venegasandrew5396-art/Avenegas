// app/api/image/route.js
export const runtime = "nodejs";        // <-- longer window than Edge
export const preferredRegion = "iad1";  // close to you (East)
export const maxDuration = 60;          // Pro plan honors up to 60s

import OpenAI from "openai";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// Only sizes OpenAI supports now
const VALID = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
const norm = (s) => {
  s = String(s || "").toLowerCase().trim();
  if (s === "256x256" || s === "512x512") return "1024x1024";
  return VALID.has(s) ? s : "1024x1024";
};

// Small guard so we don't spend time on giant prompts
function trimPrompt(p) {
  if (!p || typeof p !== "string") return "";
  p = p.trim().replace(/\s+/g, " ");
  if (p.length > 500) p = p.slice(0, 500);
  return p;
}

// Simple timeout wrapper (gives OpenAI ~40s to respond)
function withTimeout(promise, ms = 40000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ]);
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { prompt, size = "1024x1024" } = body || {};
    prompt = trimPrompt(prompt);
    if (!prompt) {
      return new Response(JSON.stringify({ ok: false, error: "Missing or invalid prompt" }), { status: 400 });
    }
    size = norm(size);

    // Optional: append your style from env
    const style = (process.env.MY_ART_STYLE || "").trim();
    if (style) prompt = `${prompt}, ${style}`;

    // Try once; if it times out, try again with 'auto' which can be faster
    const plan = [size, size === "auto" ? "auto" : "auto"];
    let lastErr;
    for (let i = 0; i < plan.length; i++) {
      try {
        const s = plan[i];
        const res = await withTimeout(
          client.images.generate({ model: "gpt-image-1", prompt, size: s }),
          40000
        );
        const b64 = res?.data?.[0]?.b64_json;
        if (!b64) throw new Error("No image returned");
        return new Response(JSON.stringify({ ok: true, b64, size: s, retries: i }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        lastErr = e;
        if (i === 0) await new Promise(r => setTimeout(r, 700)); // brief backoff
      }
    }
    throw lastErr || new Error("Image generation failed");
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("timed out")) {
      return new Response(JSON.stringify({ ok: false, error: "HTTP 504: Image timed out." }), { status: 504 });
    }
    return new Response(JSON.stringify({ ok: false, error: msg || "Image error" }), { status: 500 });
  }
}

export async function GET() {
  return new Response(
    "POST JSON: { prompt: string, size?: '1024x1024'|'1024x1536'|'1536x1024'|'auto' }",
    { status: 405 }
  );
}

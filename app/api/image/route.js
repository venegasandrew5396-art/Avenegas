// app/api/image/route.js
export const runtime = "edge"; // keep your original working base

import OpenAI from "openai";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // ok if undefined
});

// Only sizes OpenAI supports now
const VALID = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
function normalizeSize(s) {
  if (!s) return "1024x1024";
  s = String(s).toLowerCase().trim();
  // map legacy/invalid -> supported
  if (s === "256x256" || s === "512x512") return "1024x1024";
  return VALID.has(s) ? s : "1024x1024";
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { prompt, size } = body || {};

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "Missing or invalid prompt" }), { status: 400 });
    }

    // absolute guard: force valid size no matter what the client sent
    size = normalizeSize(size);

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size, // always valid now
    });

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(JSON.stringify({ ok: false, error: "No image returned" }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, b64, size }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || "Image error" }), { status: 500 });
  }
}

export async function GET() {
  return new Response(
    "POST JSON: { prompt: string, size?: '1024x1024'|'1024x1536'|'1536x1024'|'auto' }",
    { status: 405 }
  );
}

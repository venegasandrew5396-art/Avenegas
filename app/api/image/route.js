// app/api/image/route.js
export const runtime = "edge";

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // ok if undefined
});

// ✅ Only sizes OpenAI supports now
const VALID = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
const norm = (s) => (VALID.has(s) ? s : "1024x1024");

export async function POST(req) {
  try {
    const body = await req.json();
    let { prompt, size = "1024x1024" } = body || {};

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "Missing or invalid prompt" }), { status: 400 });
    }

    // ✅ hard-normalize legacy/invalid sizes to avoid the 400 you saw
    size = norm((size || "").toString());

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size, // always valid now
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(JSON.stringify({ ok: false, error: "No image returned" }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, b64, size }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || "Image error" }),
      { status: 500 }
    );
  }
}

export async function GET() {
  return new Response(
    "POST JSON: { prompt: string, size?: '1024x1024'|'1024x1536'|'1536x1024'|'auto' }",
    { status: 405 }
  );
}

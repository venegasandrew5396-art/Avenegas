// app/api/image/route.js
export const runtime = "edge";

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // fine if not set
});

export async function POST(req) {
  try {
    const { prompt, size = "1024x1024" } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing or invalid prompt" }),
        { status: 400 }
      );
    }

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size, // default stays 1024x1024
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(
        JSON.stringify({ ok: false, error: "No image returned" }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ ok: true, b64 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || "Image error" }),
      { status: 500 }
    );
  }
}

export async function GET() {
  return new Response(
    "POST JSON: { prompt: string, size?: '256x256'|'512x512'|'1024x1024' }",
    { status: 405 }
  );
}

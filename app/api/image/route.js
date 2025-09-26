export const runtime = "edge"; // makes it run fast on Vercel Edge

import OpenAI from "openai";

// Create client with your API key from environment
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { prompt, size = "1024x1024" } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing prompt" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const gen = await client.images.generate({
      model: "gpt-image-1", // latest image model
      prompt,
      size, // "512x512", "1024x1024", "2048x2048" (if enabled)
    });

    // Return the base64 so frontend can render
    const b64 = gen.data[0].b64_json;

    return Response.json({ ok: true, b64 });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message }),
      { status: e.status ?? 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Optional: sanity check when you visit /api/image in the browser
export async function GET() {
  return new Response("POST { prompt } to this endpoint", { status: 405 });
}

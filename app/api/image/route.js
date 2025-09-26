export const runtime = "edge";
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { prompt, size = "1024x1024" } = await req.json();

    const gen = await client.images.generate({
      model: "gpt-image-1", // latest image model
      prompt,
      size,                 // "512x512", "1024x1024", "2048x2048" (if enabled)
    });

    const b64 = gen.data[0].b64_json;
    return Response.json({ ok: true, b64 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: e.status ?? 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

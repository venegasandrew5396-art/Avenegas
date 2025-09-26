export const runtime = "edge";
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { prompt, size = "1024x1024" } = await req.json();
    const gen = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
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

// (optional quick sanity check in browser)
export async function GET() {
  return new Response("Use POST with { prompt }", { status: 405 });
}

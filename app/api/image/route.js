export const runtime = "edge";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // ← add this line
});

export async function POST(req) {
  try {
    const { prompt, size = "1024x1024" } = await req.json();
    if (!prompt) {
      return Response.json({ ok: false, error: "Missing prompt" }, { status: 400 });
    }
    const gen = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
    });
    const b64 = gen.data?.[0]?.b64_json;
    if (!b64) throw new Error("Image generation returned no data");
    return Response.json({ ok: true, b64 });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: e.status ?? 500 });
  }
}

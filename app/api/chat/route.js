export const runtime = "edge";
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { messages = [{ role: "user", content: "Hello!" }] } = await req.json();
    const completion = await client.chat.completions.create({
      model: "gpt-5",     // <- GPT-5 here
      messages,
    });
    return Response.json({ ok: true, message: completion.choices[0].message });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: e.status ?? 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

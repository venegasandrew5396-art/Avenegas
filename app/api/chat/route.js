export const runtime = "node.js";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // ← add this line
});

export async function POST(req) {
  try {
    const { messages = [{ role: "user", content: "Hello!" }] } = await req.json();
    const completion = await client.chat.completions.create({
      model: "gpt-5",
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

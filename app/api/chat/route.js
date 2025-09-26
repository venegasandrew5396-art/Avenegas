import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // ✅ this line replaces your old key
});

export const runtime = "nodejs";     // stable SDK support
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const messages = body?.messages || [];
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
    }

    const client = new OpenAI({ apiKey });

    // Minimal system message for tone/safety
    const sys = {
      role: "system",
      content: "You are VenegasAI: concise, clear, and helpful. Avoid PHI; do not provide unsafe medical advice."
    };

    const completion = await client.chat.completions.create({
      model,
      messages: [sys, ...messages.map(m => ({ role: m.role, content: m.content }))],
      temperature: 0.6
    });

    const reply = completion?.choices?.[0]?.message?.content ?? "Sorry, I had trouble thinking of a reply.";
    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (err) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

// app/api/chat/route.ts
export const runtime = "edge"; // optional, works great on Vercel Edge

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response("Missing OPENAI_API_KEY", { status: 500 });
    }

    const body = await req.json();
    const messages = body?.messages ?? [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Say hello." },
    ];
    const model = body?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";

    const completion = await client.chat.completions.create({
      model,
      messages,
    });

    // Return just the assistant message; adjust if your UI expects more
    return Response.json({
      message: completion.choices[0].message,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500 }
    );
  }
}

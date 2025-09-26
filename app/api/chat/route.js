// app/api/chat/route.js
export const runtime = "edge"; // optional: faster on Vercel

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response("Missing OPENAI_API_KEY", { status: 500 });
    }

    const { messages } = await req.json();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // or another model you want
      messages: messages || [{ role: "user", content: "Hello!" }],
    });

    return Response.json({
      message: completion.choices[0].message,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}

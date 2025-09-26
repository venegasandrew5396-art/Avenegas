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
// app/api/image/route.ts
export const runtime = "edge";
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const gen = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });
    // Return base64 for the client to render
    const b64 = gen.data[0].b64_json;
    return Response.json({ b64 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}


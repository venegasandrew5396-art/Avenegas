// app/api/image/route.js
export const runtime = "edge"; // fastest cold start

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID || undefined,
});

// Accepted sizes per current API
const VALID = new Set(["auto", "1024x1024", "1024x1536", "1536x1024"]);
function normSize(s) {
  s = String(s || "").toLowerCase().trim();
  if (s === "256x256" || s === "512x512") return "auto";
  return VALID.has(s) ? s : "auto";
}
function trimPrompt(p) {
  if (!p || typeof p !== "string") return "";
  p = p.trim().replace(/\s+/g, " ");
  // keep it tight for Hobby
  if (p.length > 300) p = p.slice(0, 300);
  return p;
}

// Fast timeout (≈8.5s) to stay within Hobby’s ~10s wall clock
function withTimeout(promise, ms = 8500) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ]);
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { prompt, size = "auto" } = body || {};

    prompt = trimPrompt(prompt);
    if (!prompt) {
      return new Response(JSON.stringify({ ok: false, error: "Missing prompt" }), { status: 400 });
    }
    size = normSize(size);

    // Optional “house style” appended from env
    const style = (process.env.MY_ART_STYLE || "").trim();
    if (style) prompt = `${prompt}, ${style}`;

    const res = await withTimeout(
      client.images.generate({
        model: "gpt-image-1",
        prompt,
        size, // "auto" | "1024x1024" | "1024x1536" | "1536x1024"
      }),
      8500
    );

    const b64 = res?.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(JSON.stringify({ ok: false, error: "No image returned" }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true, b64, size }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = String(e?.message || "");
    const status = msg.includes("timed out") ? 504 : 500;
    return new Response(JSON.stringify({ ok: false, error: status === 504 ? "HTTP 504: timed out" : msg }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET() {
  return new Response(
    "POST JSON: { prompt: string, size?: 'auto'|'1024x1024'|'1024x1536'|'1536x1024' }",
    { status: 405 }
  );
}

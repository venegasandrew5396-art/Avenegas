export const runtime = "nodejs"; // more time than Edge

import OpenAI from "openai";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // ok if undefined
});

const ALLOWED_SIZES = new Set(["256x256", "512x512", "1024x1024"]);

async function generateOnce({ prompt, size }) {
  const res = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
  });
  const b64 = res?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data returned");
  return b64;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { prompt, size = "512x512" } = body;

    if (typeof prompt !== "string") prompt = "";
    prompt = prompt.trim();
    if (!prompt) {
      return Response.json({ ok: false, error: "Missing prompt text." }, { status: 400 });
    }
    if (!ALLOWED_SIZES.has(size)) size = "512x512";

    // try once, then retry smaller size on failure/timeout-ish errors
    try {
      const b64 = await generateOnce({ prompt, size });
      return Response.json({ ok: true, b64 });
    } catch (e) {
      const msg = String(e?.message || "");
      // retry smaller if not already smallest
      if (size !== "256x256") {
        const b64 = await generateOnce({ prompt, size: "256x256" });
        return Response.json({ ok: true, b64, downgraded: true });
      }
      throw new Error(msg || "Image generation failed");
    }
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.status === 403 && msg.toLowerCase().includes("verify")) {
      return Response.json(
        { ok: false, error: "Org verification required for gpt-image-1.", needsVerification: true },
        { status: 403 }
      );
    }
    return Response.json({ ok: false, error: msg || "Image error" }, { status: e?.status ?? 500 });
  }
}

export async function GET() {
  return new Response("POST { prompt: string, size?: '256x256'|'512x512'|'1024x1024' }", { status: 405 });
}

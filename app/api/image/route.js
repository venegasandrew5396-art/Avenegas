export const runtime = "edge";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // ok if undefined
});

// allowlist sizes required by OpenAI
const ALLOWED_SIZES = new Set(["256x256", "512x512", "1024x1024"]);

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { prompt, size = "1024x1024" } = body;

    // Normalize/validate
    if (typeof prompt !== "string") prompt = "";
    prompt = prompt.trim().replace(/\s+/g, " ");
    if (!prompt) {
      return Response.json({ ok: false, error: "Missing prompt text." }, { status: 400 });
    }
    if (!ALLOWED_SIZES.has(size)) {
      size = "1024x1024"; // force a valid default
    }

    const gen = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
    });

    const b64 = gen?.data?.[0]?.b64_json;
    if (!b64) throw new Error("Image generation returned no data");

    return Response.json({ ok: true, b64 });
  } catch (e) {
    // friendlier errors
    const msg = String(e?.message || "");
    if (msg.includes("did not match the expected pattern")) {
      return Response.json(
        { ok: false, error: "Invalid request shape. Ensure prompt is text and size is 256x256, 512x512, or 1024x1024." },
        { status: 400 }
      );
    }
    return Response.json({ ok: false, error: msg || "Image error" }, { status: e?.status ?? 500 });
  }
}

export async function GET() {
  return new Response("POST JSON: { prompt: string, size?: '256x256'|'512x512'|'1024x1024' }", { status: 405 });
}

// app/api/image/route.js
export const runtime = "nodejs";

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // safe if undefined
});

const VALID_SIZES = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
const asJson = (data, status = 200) => Response.json(data, { status });

// timeout guard
function withTimeout(promise, ms = 25000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Image request timed out")), ms)
    ),
  ]);
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { prompt, size = "1024x1024" } = body || {};

    if (typeof prompt !== "string") prompt = "";
    prompt = prompt.trim();
    if (!prompt) {
      return asJson({ ok: false, error: "Missing prompt text." }, 400);
    }

    if (!VALID_SIZES.has(size)) {
      size = "1024x1024"; // default fallback
    }

    const res = await withTimeout(
      client.images.generate({
        model: "gpt-image-1",
        prompt,
        size, // valid size only
      }),
      25000
    );

    const b64 = res?.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image data returned");

    return asJson({ ok: true, b64, size });
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.status === 403 && msg.toLowerCase().includes("verify")) {
      return asJson(
        { ok: false, error: "Org verification required for gpt-image-1." },
        403
      );
    }
    if (msg.includes("timed out")) {
      return asJson({ ok: false, error: "HTTP 504: Image timed out." }, 504);
    }
    return asJson({ ok: false, error: msg || "Image error" }, e?.status ?? 500);
  }
}

export async function GET() {
  return new Response(
    "POST JSON: { prompt: string, size?: '1024x1024'|'1024x1536'|'1536x1024'|'auto' }",
    { status: 405 }
  );
}

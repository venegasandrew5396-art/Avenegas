export const runtime = 'edge'; // fastest on Hobby

import OpenAI from 'openai';
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { prompt, size } = await req.json();
    const s = String(size || 'auto').toLowerCase();
    const valid = new Set(['auto','1024x1024','1024x1536','1536x1024']);
    const finalSize = (s === '256x256' || s === '512x512') ? 'auto' : (valid.has(s) ? s : 'auto');

    const res = await client.images.generate({
      model: 'gpt-image-1',
      prompt: (prompt || '').trim().slice(0, 300),
      size: finalSize,
    });

    const b64 = res?.data?.[0]?.b64_json;
    if (!b64) return Response.json({ ok:false, error:'No image returned' }, { status:502 });
    return Response.json({ ok:true, b64, size: finalSize });
  } catch (e) {
    const msg = String(e?.message || '');
    const status = msg.includes('timed out') ? 504 : 500;
    return Response.json({ ok:false, error: msg || 'Image error' }, { status });
  }
}

export async function GET() {
  return new Response(
    "POST JSON: { prompt: string, size?: 'auto'|'1024x1024'|'1024x1536'|'1536x1024' }",
    { status: 405 }
  );
}

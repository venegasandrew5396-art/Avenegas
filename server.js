import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json({ limit: "2mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,           // <-- set in your hosting env (NOT in the browser)
  organization: process.env.OPENAI_ORG_ID || undefined
});

const VALID = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
const norm = s => {
  s = String(s || "").toLowerCase().trim();
  if (s === "256x256" || s === "512x512") return "1024x1024";
  return VALID.has(s) ? s : "1024x1024";
};

// Keep prompts sane so they resolve faster
const trimPrompt = p => {
  if (!p || typeof p !== "string") return "";
  p = p.trim().replace(/\s+/g, " ");
  if (p.length > 500) p = p.slice(0, 500);
  return p;
};

app.post("/image", async (req, res) => {
  try {
    let { prompt, size = "1024x1024" } = req.body || {};
    prompt = trimPrompt(prompt);
    if (!prompt) return res.status(400).json({ ok: false, error: "Missing prompt" });
    size = norm(size);

    // Optional: append your house style from env
    const style = (process.env.MY_ART_STYLE || "").trim();
    if (style) prompt = `${prompt}, ${style}`;

    // Give OpenAI real time to finish (service has longer timeouts than Vercel Hobby)
    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size
    });

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ ok: false, error: "No image returned" });
    return res.json({ ok: true, b64, size });
  } catch (e) {
    const msg = String(e?.message || "Image error");
    const code = msg.toLowerCase().includes("timed out") ? 504 : 500;
    return res.status(code).json({ ok: false, error: msg });
  }
});

app.get("/", (_req, res) => res.send("ok"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("image-service listening on", PORT));

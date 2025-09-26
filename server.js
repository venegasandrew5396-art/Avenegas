import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json({ limit: "2mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID || undefined
});

const VALID = new Set(["1024x1024","1024x1536","1536x1024","auto"]);
const norm = s => {
  s = String(s || "").toLowerCase().trim();
  if (s === "256x256" || s === "512x512") return "1024x1024";
  return VALID.has(s) ? s : "auto";
};
const trim = p => (p || "").trim().replace(/\s+/g," ").slice(0,500);

app.post("/image", async (req, res) => {
  try {
    let { prompt, size="auto" } = req.body || {};
    prompt = trim(prompt);
    if (!prompt) return res.status(400).json({ ok:false, error:"Missing prompt" });
    size = norm(size);

    const result = await client.images.generate({ model:"gpt-image-1", prompt, size });
    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ ok:false, error:"No image returned" });
    res.json({ ok:true, b64, size });
  } catch (e) {
    const msg = String(e?.message || "Image error");
    res.status(msg.toLowerCase().includes("timed out") ? 504 : 500)
       .json({ ok:false, error:msg });
  }
});

app.get("/", (_req, res) => res.send("ok"));
app.listen(process.env.PORT || 3000, () => console.log("image-service up"));

/**
 * LanguageLink backend
 * --------------------
 * A small Express server that:
 *   1. Serves the frontend from /public
 *   2. Proxies translation requests to the Anthropic API,
 *      keeping the API key on the server (never in the browser)
 *
 * Endpoints:
 *   POST /api/translate        { text, targets: ["es","fr",...] }
 *   POST /api/translate-image  { image, media_type, targets }
 *
 * Setup:
 *   cp .env.example .env   # then paste your key in
 *   npm install
 *   npm start
 */

require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

if (!API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY. Copy .env.example to .env and add your key.");
  process.exit(1);
}

app.use(express.json({ limit: "15mb" })); // screenshots arrive as base64
app.use(express.static(path.join(__dirname, "public")));

// ---------- language catalogue (must match the frontend) ----------
const LANGUAGES = {
  es: "Spanish", fr: "French", zh: "Chinese (Simplified)", ja: "Japanese",
  ko: "Korean", de: "German", pt: "Portuguese", it: "Italian",
  hi: "Hindi", ar: "Arabic", ru: "Russian", vi: "Vietnamese",
  tr: "Turkish", nl: "Dutch", pl: "Polish", th: "Thai",
  he: "Hebrew", en: "English",
};
const MAX_TARGETS = 5;

// ---------- tiny in-memory rate limit: 30 requests / minute / IP ----------
const hits = new Map();
app.use("/api/", (req, res, next) => {
  const now = Date.now();
  const ip = req.ip;
  const windowStart = now - 60_000;
  const list = (hits.get(ip) || []).filter((t) => t > windowStart);
  if (list.length >= 30) {
    return res.status(429).json({ error: "Too many requests — wait a moment and try again." });
  }
  list.push(now);
  hits.set(ip, list);
  next();
});

// ---------- helpers ----------
function validateTargets(targets) {
  if (!Array.isArray(targets) || targets.length === 0) {
    return { error: "Pick at least one target language." };
  }
  if (targets.length > MAX_TARGETS) {
    return { error: `You can translate into at most ${MAX_TARGETS} languages at a time.` };
  }
  const unknown = targets.filter((c) => !LANGUAGES[c]);
  if (unknown.length) {
    return { error: `Unknown language code(s): ${unknown.join(", ")}` };
  }
  return { targets };
}

function targetSpec(targets) {
  return targets.map((c) => `"${c}" (${LANGUAGES[c]})`).join(", ");
}

async function callClaude(content) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Anthropic API error", response.status, body.slice(0, 300));
    const err = new Error("Upstream translation service error");
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const text = (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ---------- POST /api/translate ----------
app.post("/api/translate", async (req, res) => {
  const { text } = req.body || {};
  const v = validateTargets((req.body || {}).targets);
  if (v.error) return res.status(400).json({ error: v.error });
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Nothing to translate — send some text." });
  }
  if (text.length > 5000) {
    return res.status(400).json({ error: "Text is too long (5,000 character limit)." });
  }

  const prompt =
    "You are the translation engine for LanguageLink.\n" +
    `Translate the text below into each of these target languages: ${targetSpec(v.targets)}.\n` +
    "Detect the source language yourself. Keep tone, names, and numbers intact. " +
    "If the text is already in a target language, still include that language with the text unchanged.\n" +
    "Respond with ONLY a raw JSON object, no markdown fences, no commentary, exactly in this shape:\n" +
    '{"detected_source":"<English name of source language>","translations":{"<code>":"<translation>", ...}}\n\n' +
    "TEXT:\n" + text;

  try {
    const result = await callClaude(prompt);
    res.json({
      detected_source: result.detected_source || "unknown",
      translations: result.translations || {},
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Translation failed — please try again." });
  }
});

// ---------- POST /api/translate-image ----------
app.post("/api/translate-image", async (req, res) => {
  const { image, media_type } = req.body || {};
  const v = validateTargets((req.body || {}).targets);
  if (v.error) return res.status(400).json({ error: v.error });
  if (typeof image !== "string" || image.length < 100) {
    return res.status(400).json({ error: "No image data received." });
  }
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(media_type)) {
    return res.status(400).json({ error: "Unsupported image type." });
  }

  const prompt =
    "You are the translation engine for LanguageLink. The image is a cropped screenshot.\n" +
    "1. Extract all readable text from the image (keep its natural reading order).\n" +
    `2. Translate that text into each of these target languages: ${targetSpec(v.targets)}.\n` +
    "Respond with ONLY a raw JSON object, no markdown fences:\n" +
    '{"extracted_text":"<text found in image>","detected_source":"<English name of source language>","translations":{"<code>":"<translation>", ...}}\n' +
    'If the image contains no readable text, respond {"extracted_text":"","detected_source":"none","translations":{}}.';

  try {
    const result = await callClaude([
      { type: "image", source: { type: "base64", media_type, data: image } },
      { type: "text", text: prompt },
    ]);
    res.json({
      extracted_text: result.extracted_text || "",
      detected_source: result.detected_source || "unknown",
      translations: result.translations || {},
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Capture translation failed — please try again." });
  }
});

// ---------- health check ----------
app.get("/api/health", (_req, res) => res.json({ ok: true, model: MODEL }));

app.listen(PORT, () => {
  console.log(`LanguageLink running at http://localhost:${PORT}`);
});

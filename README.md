# LanguageLink

Translate anything — typed, spoken, or captured off your screen — into up to **5 languages at once**.

| Mode | What it does |
|------|--------------|
| **Text** | Type or paste anything; source language is auto-detected and translated into every selected target language. |
| **Voice** | Tap the mic and talk. Each finished sentence is transcribed live (Web Speech API) and auto-translated as you speak. |
| **Capture** | Take a snapshot of your screen (Screen Capture API), drag your mouse over any region, and the text inside is extracted and translated. |

Translation and image text extraction are powered by the Anthropic Claude API, proxied through a small Express backend so the API key never touches the browser.

## Quick start

```bash
git clone https://github.com/zheqi111/languagelink.git
cd languagelink
npm install
cp .env.example .env      # then open .env and paste your Anthropic API key
npm start
```

Visit **http://localhost:3000**. Get an API key at https://console.anthropic.com/settings/keys.

Requires **Node.js 18+** (uses built-in `fetch`).

## Project structure

```
languagelink/
├── public/
│   └── index.html    # the whole frontend: markup, styles, and logic
├── server.js         # Express backend: static serving + Anthropic API proxy
├── package.json
├── .env.example      # copy to .env and add ANTHROPIC_API_KEY
└── README.md
```

## API

### `POST /api/translate`
```json
{ "text": "Hello, how are you?", "targets": ["es", "fr", "zh"] }
```
Returns `{ "detected_source": "English", "translations": { "es": "…", "fr": "…", "zh": "…" } }`

### `POST /api/translate-image`
```json
{ "image": "<base64 png>", "media_type": "image/png", "targets": ["es"] }
```
Returns `{ "extracted_text": "…", "detected_source": "…", "translations": { … } }`

### `GET /api/health`
Returns `{ "ok": true, "model": "claude-haiku-4-5" }`

The backend enforces: 1–5 valid target languages, 5,000-character text limit, PNG/JPEG/WebP images only, and a light rate limit of 30 requests/minute per IP.

## Browser support

| Feature | Support |
|---------|---------|
| Text translate | All modern browsers |
| Voice (Web Speech API) | Chrome / Edge (best), Safari (partial) |
| Screen capture | Desktop Chrome / Edge / Firefox — not available on mobile |

Voice needs microphone permission; Capture asks which screen, window, or tab to share and grabs a single frame (nothing is recorded).

## Configuration

Set in `.env`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | — (required) | Your Anthropic API key |
| `PORT` | `3000` | Server port |
| `CLAUDE_MODEL` | `claude-haiku-4-5` | Model used for translation |

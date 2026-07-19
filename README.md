# LanguageLink

Translate anything — typed, spoken, or captured off your screen — into up to **5 languages at once**.

LanguageLink is a single-file web app (`index.html`, no build step, no dependencies) with three input modes:

| Mode | What it does |
|------|--------------|
| **Text** | Type or paste anything; source language is auto-detected and translated into every selected target language. |
| **Voice** | Tap the mic and talk. Each finished sentence is transcribed live (Web Speech API) and auto-translated as you speak. |
| **Capture** | Take a snapshot of your screen (Screen Capture API), drag your mouse over any region, and the text inside is extracted and translated. |

Translation and image text extraction are powered by the Anthropic Claude API.

## Features

- Pick 1–5 target languages from an 18-language catalogue, shown by their native names (Español, 中文, العربية, …)
- Automatic source-language detection
- Right-to-left rendering for Arabic and Hebrew
- Results collect as a running ledger, newest first, with per-card copy buttons
- One HTML file — open it and go

## Running it

Open `index.html` in a browser, or serve the folder locally:

```bash
# any static server works, e.g.
python3 -m http.server 8000
# then visit http://localhost:8000
```

> **Note:** the app calls the Anthropic API endpoint directly and is designed to run inside environments that inject API authentication (e.g. Claude artifacts). To run it fully standalone, add your own API key handling — ideally through a small backend proxy so the key is never exposed in the browser.

## Browser support

| Feature | Support |
|---------|---------|
| Text translate | All modern browsers |
| Voice (Web Speech API) | Chrome / Edge (best), Safari (partial) |
| Screen capture | Desktop Chrome / Edge / Firefox — not available on mobile |

Voice needs microphone permission; Capture asks which screen, window, or tab to share and grabs a single frame (nothing is recorded).

## Project structure

```
languagelink/
├── index.html   # the whole app: markup, styles, and logic
├── README.md
└── .gitignore
```

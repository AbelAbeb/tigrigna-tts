# Tigrigna Text-to-Speech

A small web app for Tigrigna (Tigrinya) text-to-speech, built on Meta's MMS
model ([`facebook/mms-tts-tir`](https://huggingface.co/facebook/mms-tts-tir)).

Visitors can submit input three ways:

- Typed text
- An uploaded `.txt` file
- An uploaded `.pdf` file (text is extracted automatically)

The server synthesizes speech and returns a WAV file the browser can play
inline or download.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # macOS/Linux

pip install -r requirements.txt
```

The first run downloads the `facebook/mms-tts-tir` model (a few hundred MB)
from Hugging Face, so it needs an internet connection and may take a minute.
A GPU is not required; it will be used automatically if available.

## Run

```bash
python app.py
```

Then open http://localhost:5000 in a browser.

## Project layout

- `app.py` — Flask routes: serves the page, handles `/synthesize`, serves
  generated audio from `outputs/`.
- `tts_engine.py` — model loading, PDF text extraction, text chunking, and
  WAV synthesis (adapted from the original `tig.py` CLI script).
- `templates/index.html`, `static/` — the single-page UI.
- `outputs/` — generated WAV files (not committed to git; grows over time,
  safe to clear).

## Notes

- The model is licensed CC-BY-NC-4.0 — **non-commercial use only**.
- Uploads are capped at 10 MB; only `.txt` and `.pdf` are accepted.
- This is a simple single-process app intended for local or small-scale use.
  For public deployment, put it behind a production WSGI server (e.g.
  gunicorn/waitress) and add rate limiting, since synthesis is CPU/GPU
  intensive.

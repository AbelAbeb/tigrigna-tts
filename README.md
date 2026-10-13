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

## Deploying (Render free tier)

The Android app (see `android/`) needs the backend reachable over the
internet, so it can't just point at your laptop. [Render](https://render.com)
has a free web-service tier that works for this:

1. Push this repo to GitHub (already done) and sign up at render.com with
   that GitHub account.
2. In the Render dashboard: **New → Blueprint**, pick this repo. Render
   reads `render.yaml` and sets everything up (build command, start command,
   Python version) automatically.
3. First deploy takes a few minutes (installing torch + downloading the
   model). Once live, Render gives you a URL like
   `https://tigrigna-tts.onrender.com` — that's what the Android app points at.

Notes on the free tier:
- `requirements-render.txt` installs a CPU-only build of torch (the default
  PyPI wheel is much larger and not needed here) to keep the build small.
- Free instances spin down after inactivity, so the first request after a
  quiet period will be slow (cold start) while it spins back up and reloads
  the model.
- Free instances have limited RAM (512 MB). This model is small enough to
  usually fit, but if you see out-of-memory errors, Render's next paid tier
  up resolves it.

## Android app

`android/` is a small WebView-based Android app (Kotlin, Gradle) that wraps
this same web UI — it supports file uploads (for the .txt/.pdf tabs),
downloads the generated WAV via Android's DownloadManager, and opens
external links (like the model card) in the system browser instead of
inside the app.

It points at `BuildConfig.BASE_URL`, set in `android/app/build.gradle.kts`.
Update the debug and release values to match your own setup.

To build it:

```bash
cd android
./gradlew assembleDebug
```

Or just open the `android/` folder in Android Studio.

## Notes

- The model is licensed CC-BY-NC-4.0 — **non-commercial use only**.
- Uploads are capped at 10 MB; only `.txt` and `.pdf` are accepted.
- This is a simple single-process app intended for local or small-scale use.
  For public deployment, put it behind a production WSGI server (handled by
  `render.yaml` via gunicorn) and consider rate limiting, since synthesis is
  CPU/GPU intensive.

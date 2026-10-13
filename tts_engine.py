"""
Core Tigrigna (Tigrinya) text-to-speech engine, built on Meta's MMS model
(facebook/mms-tts-tir). Adapted from the original standalone CLI script into
a reusable module for the web app.

Model license: CC-BY-NC-4.0 (non-commercial use only).
"""

import gc
import re
import threading
import uuid

import numpy as np
import scipy.io.wavfile
import torch
from transformers import AutoTokenizer, VitsModel, set_seed

MODEL_ID = "facebook/mms-tts-tir"
MAX_CHARS = 20000  # guard against runaway input on the web endpoint

# Multi-threaded BLAS kernels allocate their own per-thread scratch buffers;
# on a memory-capped instance (e.g. Render's free 512MB tier) that overhead
# matters more than the throughput it buys.
torch.set_num_threads(1)

_model_lock = threading.Lock()
_tokenizer = None
_model = None
_device = None
_needs_uroman = False
_uroman = None


def _load_model():
    """Lazily load the model once per process, then reuse it for every request."""
    global _tokenizer, _model, _device, _needs_uroman, _uroman
    if _model is not None:
        return

    with _model_lock:
        if _model is not None:
            return
        device = "cuda" if torch.cuda.is_available() else "cpu"
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        # low_cpu_mem_usage avoids the default "allocate random weights, then
        # overwrite with loaded weights" pattern, which briefly holds two
        # copies of the model in memory at once.
        model = VitsModel.from_pretrained(MODEL_ID, low_cpu_mem_usage=True).to(device).eval()

        needs_uroman = getattr(tokenizer, "is_uroman", False)
        uroman = None
        if needs_uroman:
            import uroman as ur

            uroman = ur.Uroman()

        _tokenizer, _model, _device = tokenizer, model, device
        _needs_uroman, _uroman = needs_uroman, uroman

        gc.collect()


def read_pdf(file_obj):
    """Extract text from a PDF given a file path or a file-like object."""
    from pypdf import PdfReader

    reader = PdfReader(file_obj)
    pages = [(p.extract_text() or "") for p in reader.pages]
    return "\n".join(pages)


def split_into_chunks(text, max_chars=200):
    """Split on Ge'ez/Latin sentence punctuation, then pack into short chunks."""
    text = re.sub(r"\s+", " ", text).strip()
    sentences = re.split(r"(?<=[።፧?!.])\s+", text)
    chunks, current = [], ""
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        while len(s) > max_chars:
            cut = max(s.rfind("፣", 0, max_chars), s.rfind(",", 0, max_chars), s.rfind(" ", 0, max_chars))
            if cut <= 0:
                cut = max_chars
            part, s = s[: cut + 1].strip(), s[cut + 1 :].strip()
            if current:
                chunks.append(current)
                current = ""
            chunks.append(part)
        if len(current) + len(s) + 1 <= max_chars:
            current = f"{current} {s}".strip()
        else:
            if current:
                chunks.append(current)
            current = s
    if current:
        chunks.append(current)
    return chunks


class EmptyTextError(ValueError):
    pass


def synthesize_to_file(text, out_dir, seed=555, pause_sec=0.35):
    """Synthesize `text` to a WAV file in `out_dir`. Returns the filename."""
    text = (text or "").strip()
    if not text:
        raise EmptyTextError("No text to synthesize.")
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS]

    _load_model()
    sr = _model.config.sampling_rate

    chunks = split_into_chunks(text)
    silence = np.zeros(int(sr * pause_sec), dtype=np.float32)
    pieces = []

    for chunk in chunks:
        if _needs_uroman:
            chunk = _uroman.romanize_string(chunk)
        inputs = _tokenizer(chunk, return_tensors="pt").to(_device)
        if inputs["input_ids"].shape[1] == 0:
            continue
        set_seed(seed)  # VITS is stochastic; fixed seed keeps the voice consistent
        with torch.no_grad():
            wav = _model(**inputs).waveform[0].cpu().numpy().astype(np.float32)
        pieces.extend([wav, silence])

    if not pieces:
        raise EmptyTextError("No audio generated. Check that the input text is Tigrigna (Ge'ez script).")

    audio = np.concatenate(pieces)
    audio_int16 = np.clip(audio, -1.0, 1.0)
    audio_int16 = (audio_int16 * 32767).astype(np.int16)

    filename = f"{uuid.uuid4().hex}.wav"
    out_path = out_dir / filename
    scipy.io.wavfile.write(out_path, rate=sr, data=audio_int16)
    return filename

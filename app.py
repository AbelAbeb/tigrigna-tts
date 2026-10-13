"""
Flask web app for Tigrigna text-to-speech.

Users can submit input three ways (typed text, a .txt upload, or a .pdf
upload), the server synthesizes speech with facebook/mms-tts-tir, and the
browser gets back a playable/downloadable WAV file.
"""

from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_from_directory

from tts_engine import EmptyTextError, read_pdf, synthesize_to_file

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {"txt", "pdf"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES


def _extension_of(filename):
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/synthesize", methods=["POST"])
def synthesize():
    mode = request.form.get("mode", "text")

    try:
        if mode == "text":
            text = request.form.get("text", "")
        elif mode == "file":
            upload = request.files.get("file")
            if upload is None or upload.filename == "":
                return jsonify(error="Please choose a .txt or .pdf file."), 400

            ext = _extension_of(upload.filename)
            if ext not in ALLOWED_EXTENSIONS:
                return jsonify(error="Only .txt and .pdf files are supported."), 400

            if ext == "txt":
                text = upload.read().decode("utf-8", errors="ignore")
            else:
                text = read_pdf(upload.stream)
        else:
            return jsonify(error="Unknown submission mode."), 400

        audio_filename = synthesize_to_file(text, OUTPUT_DIR)
    except EmptyTextError as exc:
        return jsonify(error=str(exc)), 400
    except Exception as exc:  # model/runtime failures surfaced to the UI
        return jsonify(error=f"Synthesis failed: {exc}"), 500

    return jsonify(audio_url=f"/outputs/{audio_filename}")


@app.route("/outputs/<path:filename>")
def serve_output(filename):
    return send_from_directory(OUTPUT_DIR, filename, mimetype="audio/wav")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

from flask import Flask, request, jsonify
from utils.api_client import get_ai_client
from flask_cors import CORS
from pydub import AudioSegment
from pydub.utils import which
import io
import os


AudioSegment.converter = which("ffmpeg")
AudioSegment.ffprobe = which("ffprobe")

app = Flask(__name__)
CORS(app)  # Permitir CORS para todas las rutas

# Test provider list
PROVIDERS = ["openai"]

# helper function to convert audio to WAV
def convert_to_wav(audio_bytes):
    """convert audio bytes to WAV format using pydub"""
    try:
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        wav_io = io.BytesIO()
        audio.export(wav_io, format="wav")
        wav_io.seek(0)
        wav_io.name = "audio.wav"
        return wav_io
    except Exception as e:
        print(f"[ERROR] Converting to WAV format failed: {e}")
        return None

# Main processing route
@app.route("/process_input", methods=["POST"])
def process_input():
    # get data from frontend
    provider_name = request.form.get("provider_name", "openai")  
    user_text = request.form.get("user_text", "").strip()
    images = request.files.getlist("images")
    image_types = request.form.getlist("image_types")

    # image processing -- Format: [(image_file, image_type), ...]
    image_list = []
    for img_file, img_type in zip(images, image_types):
        image_list.append({"file": img_file, "type": img_type})

    # audio processing (convert to WAV)
    audio_file = request.files.get("audio")
    audio_wav = None
    if audio_file:
        audio_bytes = audio_file.read()
        audio_wav = convert_to_wav(audio_bytes)
        if audio_wav is None:
            return jsonify({"error": "Failed to convert audio format"}), 400

        
    # result processing
    ai_client = get_ai_client(provider_name)
    try:
        result = ai_client.process(user_text, image_list, user_audio=audio_wav)
    except Exception as e:
        print(f"[ERROR] process_input failed: {e}")
        return jsonify({"error": str(e)}), 500

    return jsonify(result)


@app.route("/providers", methods=["GET"])
def get_providers():
    return jsonify(PROVIDERS)

@app.route("/speech2text", methods=["POST"])
def speech2text():
    provider_name = request.form.get("provider_name", "openai")

    if "audio" not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400

    audio_file = request.files["audio"]
    audio_bytes = audio_file.read()

    audio_wav = convert_to_wav(audio_bytes)
    if audio_wav is None:
        return jsonify({"error": "Failed to convert audio format"}), 400

    try:
        ai_client = get_ai_client(provider_name)
        transcript = ai_client.speech2text(audio_wav)
        return jsonify({"transcript": transcript})
    except Exception as e:
        print(f"[ERROR] Audio transcrib failed: {e}")
        return jsonify({"error": "Speech-to-text failed"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


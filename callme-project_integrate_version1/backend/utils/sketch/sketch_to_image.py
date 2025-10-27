import requests
import base64
import mimetypes
import re
from io import BytesIO

# === Gemini API Configuration ===
API_URL = "https://new.12ai.org"
API_KEY = "sk-TD18zZ2DIvt0mYDfRpxXXinFHUCviiUehkiaEHRjYYgOTt1i"
MODEL = "gemini-2.5-flash-image-preview"


def load_image_as_base64(image_file):
    """
    Read an image file (binary or path) and convert it to base64 format.
    Supports both open file objects and file paths.
    """
    if isinstance(image_file, str):
        # image_file is a file path
        with open(image_file, "rb") as f:
            image_data = f.read()
        mime_type, _ = mimetypes.guess_type(image_file)
    else:
        # image_file is an uploaded file object
        image_data = image_file.read()
        mime_type = getattr(image_file, "mimetype", "image/png")

    img_base64 = base64.b64encode(image_data).decode("utf-8")
    if not mime_type:
        mime_type = "image/png"
    return img_base64, mime_type


def extract_base64_from_markdown(text):
    """
    Extract base64 image data from Markdown format:
    Example: ![image](data:image/png;base64,XXXX...)
    """
    pattern = r"!\[image\]\(data:image/[^;]+;base64,([A-Za-z0-9+/=]+)\)"
    match = re.search(pattern, text)
    if match:
        return match.group(1)
    return None


def transform_image_to_realistic(image_file):
    """
    Core function: Transform a cartoon/comic image into a realistic scene.
    
    Args:
        image_file (str or file): Path to image or file object.
    
    Returns:
        bytes: Generated image data (in bytes) if successful, else None.
    """
    print("[INFO] Transforming sketch to realistic image...")
    img_base64, mime_type = load_image_as_base64(image_file)
    if not img_base64:
        raise ValueError("Failed to read image")

    user_prompt = "Please help me transform this comic picture into a real-life scene picture."

    # Build request payload
    parts = [
        {"text": user_prompt},
        {"inline_data": {"mime_type": mime_type, "data": img_base64}},
    ]
    data = {
        "contents": [{"parts": parts}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 4096, "topP": 1.0},
        "stream": False,
    }

    try:
        # Send POST request to Gemini endpoint
        response = requests.post(
            f"{API_URL}/v1beta/models/{MODEL}:generateContent?key={API_KEY}",
            headers={"Content-Type": "application/json"},
            json=data,
            timeout=60,
            verify=False,
        )

        if response.status_code != 200:
            raise RuntimeError(
                f"API request failed ({response.status_code}): {response.text[:300]}"
            )

        result = response.json()

        # Parse and extract the generated image
        for candidate in result.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if "text" in part:
                    base64_data = extract_base64_from_markdown(part["text"])
                    if base64_data:
                        return base64.b64decode(base64_data)

        raise RuntimeError("No image found in API response")

    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Request error: {e}")
    except Exception as e:
        raise RuntimeError(f"Unexpected error: {e}")

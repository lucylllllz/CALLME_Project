import base64
import mimetypes
import re
from io import BytesIO
import os
from dotenv import load_dotenv

# === No API calls used in this version ===
load_dotenv()


def load_image_as_base64(image_file):
    """
    Read an image file (binary or path) and convert it to base64 format.
    Supports both open file objects and file paths.
    """
    if isinstance(image_file, str):
        with open(image_file, "rb") as f:
            image_data = f.read()
        mime_type, _ = mimetypes.guess_type(image_file)
    else:
        image_data = image_file.read()
        mime_type = getattr(image_file, "mimetype", "image/png")

    img_base64 = base64.b64encode(image_data).decode("utf-8")
    if not mime_type:
        mime_type = "image/png"
    return img_base64, mime_type


def extract_base64_from_markdown(text):
    """Extract base64 image data from Markdown format."""
    pattern = r"!\[image\]\(data:image/[^;]+;base64,([A-Za-z0-9+/=]+)\)"
    match = re.search(pattern, text)
    if match:
        return match.group(1)
    return None


def transform_image_to_realistic(image_file):
    """
    Simple pass-through version.
    Returns the original image bytes without modification.
    """
    # print("[INFO] Returning original image (no transformation).")

    if isinstance(image_file, str):
        with open(image_file, "rb") as f:
            image_bytes = f.read()
    else:
        image_bytes = image_file.read()

    return image_bytes


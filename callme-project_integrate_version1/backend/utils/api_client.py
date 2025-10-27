import os
import base64
from dotenv import load_dotenv
from openai import OpenAI
from .openai_output_parser import parse_ai_output
from .audio.fluency_test import evaluate_fluency  # For audio fluency and level evaluation
from .sketch.sketch_to_image_test import transform_image_to_realistic # For sketch image processing
from .grounding.image_grounding import grounding_dino_detect  # For image grounding (if needed)
# =====================================================
# 1. Environment setup and OpenAI client initialization
# =====================================================

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# =====================================================
# 2. Helper functions
# =====================================================

def encode_image_to_base64(image_file):
    """Convert an image file to a Base64-encoded string."""
    return base64.b64encode(image_file.read()).decode("utf-8")


def build_fluency_context(fluency_result):
    """Create a short paragraph describing the user's fluency score and level."""
    if not fluency_result:
        return ""
    score = fluency_result.get("Fluency")
    level = fluency_result.get("Level")
    return (
        f"\nThe user's spoken fluency was automatically evaluated as follows:\n"
        f"- Fluency Score: {score}\n"
        f"- Fluency Level: {level}\n"
        "You should incorporate this numerical information into your feedback."
    )


def build_system_prompt(image_list=None, fluency_context=""):
    """
    Build a concise and instruction-focused system prompt for an ESL teaching assistant.
    The assistant should be friendly, structured, and concise.
    """
    image_context = (
        "Refer to the attached image(s) for visual context (camera shots or sketches)."
        if image_list else ""
    )

    return (
        "You are an English-speaking coach helping ESL learners express themselves naturally and fluently.\n"
        "The learner provides either text or speech (with a fluency evaluation). "
        f"{image_context}\n\n"
        "Please respond in **five short sections** with clear labels:\n\n"
        "1. **Fluency & Understanding** — Summarize what the learner said and show their fluency results:\n"
        f"{fluency_context if fluency_context else '(No fluency data provided)'}\n\n"
        "2. **Better Expression** — Give your improved, natural English version.\n"
        "3. **Feedback** — Briefly list what was good and what can be improved.\n"
        "4. **Key Phrases** — Highlight 2–3 useful words or expressions from your version.\n"
        "5. **Speaking Tip** — One short, practical tip to improve pronunciation, rhythm, or clarity.\n\n"
        "Keep your tone encouraging and concise — like a friendly tutor giving actionable feedback."
    )


def build_user_content(transcript=None, typed_text=None, image_list=None):
    """Prepare the structured user message content (text + image) for GPT."""
    user_content = []

    # Add text content (speech transcript or typed text)
    if transcript:
        user_content.append({"type": "text", "text": f"User's speech transcript: \"{transcript}\""})
    if typed_text:
        user_content.append({"type": "text", "text": f"User's typed text: \"{typed_text}\""})
    if not transcript and not typed_text:
        user_content.append({
            "type": "text",
            "text": "The user did not provide any text. Please describe the situation based on the image(s)."
        })

    # Add image context if provided
    if image_list:
        for item in image_list:
            image_type = item['type']
            image_file = item['file']
            img_b64 = encode_image_to_base64(image_file)

            user_content.extend([
                {"type": "text", "text": f"The following image is a {image_type.lower()}:"},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}}
            ])

    return user_content


# =====================================================
# 3. OpenAI Client Class
# =====================================================

class OpenAIClient:
    """
    OpenAI-based pipeline for English tutoring:
    - Handles speech/audio input → text transcription + fluency evaluation
    - Handles typed text input
    - Handles images (photo or sketch → text)
    - Combines all input to refine expression and generate structured feedback
    """

    def process(self, user_text=None, image_list=None, user_audio=None):
        """
        Main entry point for processing user input.
        Supports: speech/audio, typed text, and optional image input.
        """
        # Step 1: Handle audio → text + fluency
        if user_audio:
            user_text = self.speech2text(user_audio)
            print(f"[INFO] Transcription result: {user_text}")
            fluency_result = evaluate_fluency(user_audio)
            print(f"[INFO] Fluency evaluation: {fluency_result}")
        elif user_text:
            fluency_result = None
        else:
            raise ValueError("[ERROR] Either audio input or user text is required.")

        # ⭐ It will be used in stage 2.
        # Step 2: Process images -- don't need -- Now setting: image captionis extracted in build_user_content
        # image_texts = []
        # if image_list:
        #     for item in image_list:
        #         img_file = item['file']
        #         img_type = item['type'].lower()

        #         if img_type == "camera shot 📸":
        #             image_texts.append(self.photo2text(img_file))
        #         elif img_type == "manual sketch 🎨":
        #             # Convert sketch → realistic image → text
        #             real_image_bytes = self.sketch2image(img_file)
        #             print(f"[INFO] Converted sketch to realistic image ({len(real_image_bytes)} bytes).")
        #             image_texts.append(self.photo2text(real_image_bytes))
        #             print(f"[INFO] Extracted text from realistic image derived from sketch.")
        #         else:
        #             print(f"[ERROR] Unknown image type: {img_type}")

        # Step 3: Refine expression with text, fluency, and image descriptions
        refined_output = self.refine_expression(
            transcript=user_text,
            typed_text=user_text,
            image_list=image_list,
            fluency_result=fluency_result
        )

        return {"output": refined_output}

    # === Methods ===

    def speech2text(self, audio_file):
        """Convert user speech into text using OpenAI transcription."""
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file
        )
        return transcript.text

    def sketch2image(self, sketch_file):
        """Convert sketch to realistic image (bytes)."""
        transformed_image_bytes = transform_image_to_realistic(sketch_file)
        if transformed_image_bytes:
            with open("/home/zlllllau/callme-project/backend/utils/sketch/preview_realistic.png", "wb") as f:
                f.write(transformed_image_bytes)
        return transformed_image_bytes

    def photo2bbox(self, image_file):
        results = grounding_dino_detect(image_file)
        print(f"[INFO] Grounding DINO detected {results} objects.")
        return results
    
    # ⭐ It will changed in the stage 2 by using the bounding box results
    def photo2caption(self, image_file):
        ROLE = "You are a mentor. Watch the images carefully, generate the caption that grammatically continues the story."
        system_prompt={"role": "system", "content": ROLE}
        user_prompt = {"role": "user", "content": []}
        if image_file:
            img_b64 = encode_image_to_base64(image_file)
            user_prompt.extend([
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}}
            ])
        image_caption = client.chat.completions.create(
            model="gpt-5-nano",
            messages=[
                system_prompt,
                user_prompt,
            ],
        ).choices[0].message.content
        return image_caption

    def refine_expression(self, transcript, typed_text=None, image_list=None, fluency_result=None):
        """Generate refined English expression + structured feedback from all inputs."""
        fluency_context = build_fluency_context(fluency_result)
        system_prompt = build_system_prompt(image_list=image_list, fluency_context=fluency_context)
        user_content = build_user_content(transcript, typed_text, image_list)

        # Call GPT model
        response = client.chat.completions.create(
            model="gpt-5-nano",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
        )

        # Parse and return structured output
        return parse_ai_output(response.choices[0].message.content)


# =====================================================
# 4. Client Factory
# =====================================================

def get_ai_client(provider_name="openai"):
    """Factory function: return the appropriate AI client instance."""
    if provider_name == "openai":
        return OpenAIClient()
    else:
        raise ValueError(f"Unsupported provider: {provider_name}")


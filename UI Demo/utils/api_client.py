# utils/api_client.py

import os
from dotenv import load_dotenv
from openai import OpenAI
import base64
from .openai_output_parser import parse_ai_output
# import google.generativeai as genai

load_dotenv()
client = OpenAI(api_key = os.getenv("OPENAI_API_KEY"))

class OpenAIClient:
    """Pipeline for OpenAI models (40-mini-transcribe + GPT-5-nano)."""
    def process(self, user_text=None, image_list=None, user_audio=None):
        
        if not user_audio:
            raise ValueError("Audio input is required.")  # enforce mandatory audio

        # Step 1: transcribe (always, since audio is mandatory)
        transcript = None
        if user_audio:
            transcript = self.speech2text(user_audio)

        # Step 2: refine expression (prompt adapts depending on text + image)
        output = self.refine_expression(transcript, user_text, image_list)

        return {"output": output}

    def speech2text(self, audio_file):
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",  # Whisper successor
            file=audio_file
        )
        return transcript.text

    def refine_expression(self, transcript, typed_text=None, image_list=None):
        # Build system prompt based on inputs
        
        prompt_image_context = ("Also, please look at the following image(s) to understand the context. "
                                "Note that they may be camera shots or manual sketches.")


        system_prompt = (
            "You are an English language helper."
            "The user is trying to describe a situation. Use their speech transcript and/or typed text as their attempt. "
            f"{prompt_image_context if image_list else ''}"
            "Reply in the following four pointers:\n"
            "1. Our understanding of the situation\n"
            "2. Our recommended expression\n"
            "3. Comparing the user's original attempt(s) and your recommendation, "
            "list Doing Well and Areas of Improvement\n"
            "4. List useful phrases the learner could pick up."
        )
        
        # Prepare user content list for the API
        user_content = []

        # Prepare text content
        if transcript:
            user_content.append({"type": "text", "text": f"User's speech transcript: \"{transcript}\""})
        if typed_text:
            user_content.append({"type": "text", "text": f"User's typed text: \"{typed_text}\""})
        if not transcript and not typed_text:
             user_content.append({"type": "text", "text": "The user did not provide any text, please describe the situation based on the image(s)."})

        # Add image content
        if image_list:
            for item in image_list:
                image_type = item['type']
                image_file = item['file']
                
                # Add a text description for context before each image
                user_content.append({
                    "type": "text",
                    "text": f"The following image is a {image_type.lower()}:"
                })
                
                # Add the image itself, converted to base64
                img_bytes = image_file.read()
                img_b64 = base64.b64encode(img_bytes).decode("utf-8")
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{img_b64}"}
                })

        # Call OpenAI
        response = client.chat.completions.create(
            model="gpt-5-nano",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
        )
        return parse_ai_output(response.choices[0].message.content)

class CustomAIClient:
    """Example of a custom AI pipeline with 5 steps."""
    def process(self, user_text=None, user_image=None, user_audio=None):
        # Speech2Text
        if user_audio and not user_text:
            user_text = self.speech2text(user_audio)

        # Photo2Text
        photo_context = self.photo2text(user_image) if user_image else None

        # Sketch2Text
        sketch_context = self.sketch2text(None)  # placeholder

        # Refine Expression
        refined = self.refine_expression(user_text, photo_context, sketch_context)

        # Feedback
        feedback = self.feedback(user_text, refined)

        return {
            "expression": refined,
            "feedback": feedback,
            "phrases": ["custom_phrase1", "custom_phrase2"]
        }

    # Placeholder methods
    def speech2text(self, audio_file): return "Transcribed text (CustomAI)"
    def photo2text(self, image_file): return "Photo description (CustomAI)"
    def sketch2text(self, sketch_file): return "Sketch description (CustomAI)"
    def refine_expression(self, text, photo=None, sketch=None): return "Refined text (CustomAI)"
    def feedback(self, original, refined): return "Feedback (CustomAI)"


def get_ai_client(provider_name="openai"):
    if provider_name == "openai":
        return OpenAIClient()
    elif provider_name == "custom":
        return CustomAIClient()
    else:
        raise ValueError(f"Unsupported provider: {provider_name}")

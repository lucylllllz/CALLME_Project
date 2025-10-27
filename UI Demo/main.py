# main.py
import streamlit as st
from utils.api_client import get_ai_client
import os
from dotenv import load_dotenv

load_dotenv()

def process_user_input(user_text, image_list=None, user_audio=None, provider_name="openai"):
    print("Processing the following images:")
    if image_list:
        for item in image_list:
            print(f"- File: {item['file'].name}, Type: {item['type']}")
    
    ai_client = get_ai_client(provider_name)
    return ai_client.process(user_text, image_list, user_audio)

st.set_page_config(page_title="Call Me!", layout="wide")

st.title("⛄️ Call Me! – Learning English Together")
st.write("Say it in English, upload an image, and we'll help you improve!")

provider_name = st.selectbox("Choose AI provider", ["openai"])

# --- Input Section ---
st.header("Tell us your situation")

# Initialize session state for text and to track the processed audio
if "user_text" not in st.session_state:
    st.session_state.user_text = ""
if "last_audio_bytes" not in st.session_state:
    st.session_state.last_audio_bytes = None



# Voice input
st.subheader("Step 1: 🎤 Record your voice to describe your situation in ENGLISH!")
audio_bytes = st.audio_input(
    "🎤 Record your voice to describe your situation in ENGLISH!",
    label_visibility='collapsed'
    )

if st.session_state.get("show_success"):
    st.success("✅ Transcription completed!")
    # Clear the flag so the message doesn't reappear.
    del st.session_state.show_success

# Automatically transcribe if new audio is uploaded
if audio_bytes and audio_bytes != st.session_state.last_audio_bytes:
    st.audio(audio_bytes)  # Playback the new audio
    with st.spinner("Transcribing your voice..."):
        ai_client = get_ai_client(provider_name)
        # The API client needs raw bytes, st.audio_input provides this directly
        transcript = ai_client.speech2text(audio_bytes)

    if transcript:
        st.session_state.show_success = True
        st.session_state.user_text = transcript  # Update session state with the transcript
        st.session_state.last_audio_bytes = audio_bytes  # Remember the audio we just processed
        st.rerun()  # Force the script to rerun to display the transcript in the text_area
    else:
        st.warning("No speech detected or transcription failed.")
        st.session_state.last_audio_bytes = audio_bytes # Remember to avoid re-transcribing a failed audio

# Editable text area.
# The 'key' argument links this widget directly to the session_state variable.
# It will now automatically display the transcript and allow user edits.

st.text_area(
    "Amend your voice description in English (Optional)",
    key="user_text",  # Link to st.session_state.user_text
    placeholder="Type in English. Edit based on your voice transcript."
)

# Image upload
st.subheader("Step 2: 🖼️ Upload images(s) about the situation")

uploaded_files = st.file_uploader(
    "Upload at least one image and indicate whether the image is a camera shot 📸 or manual sketch 🎨", 
    type=["jpg", "jpeg", "png"],
    accept_multiple_files=True
    )

image_list = []
if uploaded_files:
    for uploaded_file in uploaded_files:
        # Use columns for a side-by-side layout
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.image(uploaded_file, width=150)
        
        with col2:
            # Create a radio button with a unique key for each image
            image_type = st.radio(
                f"What type of image is `{uploaded_file.name}`?",
                options=["Camera Shot 📸", "Manual Sketch 🎨"],
                key=f"radio_{uploaded_file.file_id}", # Use unique file_id
                horizontal=True
            )
            # 5. Store the file and its selected type
            image_list.append({
                "file": uploaded_file,
                "type": image_type
            })

# Submit button
if st.button("Submit"):
    # The user_text in session_state will have the transcript OR the user's edits
    user_text = st.session_state.user_text.strip()
    if not audio_bytes and not image_list:
        st.warning("Please provide a voice input and upload at least one image.")
    else:
        with st.spinner("Processing..."):
            result = process_user_input(user_text, image_list, audio_bytes, provider_name)

            # --- Output Section ---
            st.header("Our Suggestions")

            # Get the parsed dictionary from the "output" key
            parsed_output = result.get("output")

            if not parsed_output:
                # Fallback for unstructured or failed output
                st.write("Could not generate a structured output. Here is the raw response:")
                st.write(result)
            else:
                # 🔖 Recap the scenario
                if parsed_output.get("situation"):
                    st.subheader("🔖 Recap the scenario")
                    st.info(parsed_output["situation"])

                # 💡 Better English Expression
                if parsed_output.get("expression"):
                    st.subheader("💡 Better English Expression")
                    st.success(parsed_output["expression"])

                # ✅ Feedback on Your Attempt
                if parsed_output.get("feedback"):
                    st.subheader("✅ Feedback on Your Attempt")
                    # Using st.markdown to correctly render lists and formatting
                    st.info(parsed_output["feedback"])

                # 📚 Useful Phrases
                if parsed_output.get("phrases"):
                    st.subheader("📚 Useful Phrases")
                    st.success(parsed_output["phrases"])


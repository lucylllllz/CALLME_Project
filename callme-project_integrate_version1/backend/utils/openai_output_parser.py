# utils/openai_output_parser.py

def parse_ai_output(text):
    """
    Parses the structured AI output from the English-speaking coach.
    Expected sections:
      1. Fluency & Understanding
      2. Better Expression
      3. Feedback
      4. Key Phrases
      5. Speaking Tip
    Handles extra newlines, bullets (-, •), and numbering variations.
    """
    if not text:
        return {}

    print(f"\nThe raw OpenAI output is:\n{text}\n")

    # Section mapping based on your prompt
    section_keywords = {
        "fluency_understanding": ["fluency", "understanding"],
        "better_expression": ["better", "expression"],
        "feedback": ["feedback"],
        "key_phrases": ["key", "phrases"],
        "speaking_tip": ["speaking", "tip"],
    }

    def is_header_match(line, essential_words):
        """Check if all essential words appear in the line (case-insensitive)."""
        line_lower = line.lower()
        return all(word in line_lower for word in essential_words)

    parsed_data = {key: [] for key in section_keywords.keys()}
    current_section_key = None

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        # Remove numbering, bullets, etc.
        cleaned = stripped.lstrip("12345.)-• ").strip()

        # Check if this is a section header
        is_header = False
        for key, words in section_keywords.items():
            if is_header_match(cleaned, words):
                current_section_key = key
                is_header = True
                break

        if is_header:
            continue  # Skip the header line

        # Add content to current section
        if current_section_key:
            parsed_data[current_section_key].append(cleaned)

    # Join each section’s lines into single string
    final_output = {
        key: "\n".join(lines).strip() if lines else ""
        for key, lines in parsed_data.items()
    }

    return final_output



text = """
1. Fluency & Understanding
- What you said: "Mulla." 
- Your spoken fluency was automatically evaluated as follows:
  - Fluency Score: 0.78
  - Fluency Level: Advanced

2. Better Expression
- Natural version: Hi, I’m Mulla. 
- If you’re describing the image: This is Mulla—a cute character in a pink hood.

3. Feedback
- What’s good: Clear one-word utterance; confident delivery of a name; concise.
- What to improve: Add a little context to show who/what you are talking about (e.g., a quick self-introduction or a description of the image). Practice linking sounds so phrases feel smooth rather than choppy.

4. Key Phrases
- Hi, I’m Mulla.
- This is Mulla.
- a cute character in a pink hood

5. Speaking Tip
- Pronunciation/ Rhythm tip: After a simple name like “Mulla,” gently connect the words with a slight, natural pause instead of a hard break. Try: “Hi, I’m Mulla.” Record and compare your speech to your target rhythm to keep your intonation flowing.
"""

print(parse_ai_output(text))
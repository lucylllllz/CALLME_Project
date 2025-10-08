# utils/openai_output_parser.py

def parse_ai_output(text):
    """
    Parses the structured AI output string by iterating line by line.
    This method is very robust against formatting changes like extra newlines.
    """
    if not text:
        return {}
    
    print(f'\nThe raw OpenAI output is:\n{text}\n')
    # Define the keywords that signal the start of a new section
    # and map them to the keys we want in our final dictionary.

    section_keywords = {
        "situation": ["understanding", "of", "the", "situation"],
        "expression": ["recommended", "expression"],
        "feedback": ["do", "well", "area", "improvement"],
        "phrases": ["useful", "phrases", "pick", "up"]
    }

    # Helper function for flexible matching
    def is_header_match(line, essential_words):
        line_lower = line.lower()
        return all(word in line_lower for word in essential_words)

    # Initialize containers for the results
    parsed_data = {key: [] for key in section_keywords.keys()}
    current_section_key = None

    # Go through the text line by line
    for line in text.splitlines():
        is_header = False
        # Check if the line matches any of our section keyword sets
        for key, words in section_keywords.items():
            if is_header_match(line, words):
                current_section_key = key
                is_header = True
                break
        
        # If the line is a header, skip it. Otherwise, append its content.
        if is_header:
            continue
        
        if current_section_key:
            if line:
                parsed_data[current_section_key].append(line)

    # Join the lists of lines back into single strings
    final_output = {key: '\n'.join(lines) for key, lines in parsed_data.items()}
    
    return final_output

text = """
1) Our understanding of the situation
- You want to buy a protein powder. The one you have now isn’t satisfactory. The last protein you bought online arrived damaged— the bottle leaked and powder spilled. You’re asking for help finding a different type/brand of protein and want guidance in choosing.

2) Our recommended expression
- A natural, clear way to say this:
  "Hi, I’m looking for a different protein powder. The last one I bought online arrived damaged—the bottle leaked and powder spilled. Could you help me find another type or brand?"

3) Doing Well vs. Areas for Improvement
- Doing Well in your drafts:
  - You state the goal (buying protein) and the problem (previous product was faulty/damaged).
  - You express a request for help.
- Areas of improvement:
  - Use complete sentences and articles (e.g., "a protein powder," "the last one").
  - Use past tense and natural verbs (e.g., "arrived damaged," "the bottle leaked," "powder spilled").
  - Be specific about what you want (another type vs. another brand; “protein powder” rather than just “protein”).
  - Avoid phrases like "This type no good" which are not natural in English; instead describe the issue and ask for options.
  - If you’re in a store, reference the setting: “at this supplement shop” or “in this store.”

4) Useful phrases the learner could pick up
- I’m looking for a protein powder.
- I’d like a different type/brand of protein powder.
- The last one I bought online arrived damaged.
- The bottle leaked and powder spilled.
- Could you help me choose another option?
- What are the differences between these options?
- Do you have a recommended alternative for [goal/diet]?
- Is there a more sturdy/packaged option you’d suggest?
- Do you have any samples or smaller sizes to try?
"""

print(parse_ai_output(text))
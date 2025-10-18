import os
import argparse
import numpy as np
import pandas as pd
import base64
import openai
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
import math
import asyncio
from datetime import datetime

from evaluate import load
from sentence_transformers import SentenceTransformer, util
from tqdm import tqdm
import warnings
warnings.filterwarnings("ignore")
import torch, gc
import tiktoken
from copy import deepcopy
from transformers import CLIPProcessor, CLIPModel
from PIL import Image


sbert_model = SentenceTransformer("all-MiniLM-L6-v2",device="cpu")
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").eval()
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# -----------------------------
# Helper Functions
# -----------------------------

def clip_image_text_score(image_paths, text):
    """Compute average CLIP similarity between text and multiple images."""
    sims = []
    for img_path in image_paths:
        if not os.path.exists(img_path):
            continue
        image = Image.open(img_path).convert("RGB")
        inputs = clip_processor(text=[text], images=image, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs = clip_model(**inputs)
            sims.append(outputs.logits_per_image[0, 0].item())
    return np.mean(sims) if sims else float("nan")



def count_tokens(messages, model="gpt-4o"):
    enc = tiktoken.encoding_for_model(model)
    text = ""
    for m in messages:
        if isinstance(m["content"], list):
            for c in m["content"]:
                if c["type"] == "text":
                    text += c["text"] + " "
        elif isinstance(m["content"], str):
            text += m["content"] + " "
    return len(enc.encode(text))

def image_to_dataurl(path):
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    ext = os.path.splitext(path)[1].lstrip(".").lower()
    return f"data:image/{ext};base64,{b64}"

def get_cropped_imgs(i, imagedir):
    return [f for f in os.listdir(imagedir) if f.startswith(str(i) + "-")]

def get_sample(df, id=-1, n=1):
    df = df.sample(n=n) if id == -1 else df.iloc[id]
    return list(df[["1_image", "2_image", "3_image", "4_image", "5_image", "6_image"]].iloc[0])

    
def compute_perplexity_and_confidence(response):
    """
    Safely compute perplexity and confidence score from an OpenAI chat completion response.

    Returns:
        tuple(float, float):
            - perplexity: exp(-mean_logprob), or NaN if unavailable
            - confidence_score: mean(exp(logprob)) across tokens, or NaN if unavailable
    """
    try:
        logprob_values = []

        # Extract token-level logprobs
        if hasattr(response.choices[0], "logprobs") and response.choices[0].logprobs:
            if hasattr(response.choices[0].logprobs, "content"):
                for tok in response.choices[0].logprobs.content:
                    if tok and getattr(tok, "logprob", None) is not None:
                        logprob_values.append(tok.logprob)

        # Handle empty case
        if len(logprob_values) == 0:
            return float("nan"), float("nan")

        logprob_values = np.array(logprob_values, dtype=np.float64)
        avg_logprob = np.mean(logprob_values)

        # Compute perplexity and confidence
        ppl = math.exp(-avg_logprob)
        confidence = float(np.mean(np.exp(logprob_values)))  # avg token probability

        # Handle overflow / invalid values
        if not np.isfinite(ppl) or ppl > 1e6:
            ppl = float("nan")
        if not np.isfinite(confidence) or confidence > 1:
            confidence = float("nan")

        return ppl, confidence

    except Exception as e:
        print(f"[Warning] Could not compute perplexity/confidence: {e}")
        return float("nan"), float("nan")
# -----------------------------
# Async Query Function
# -----------------------------
@retry(
    retry=retry_if_exception_type(openai.RateLimitError),
    wait=wait_exponential(min=1, max=60),  # Exponential backoff
    stop=stop_after_attempt(5),
)
async def query_openai(prompt, client):
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=prompt["messages"],
            logprobs=True,
            top_logprobs=1,
        )

        ppl, conf = compute_perplexity_and_confidence(response)
        text = response.choices[0].message.content

        return text, ppl, conf

    except openai.RateLimitError as e:
        print("Rate limit reached, retrying...")
        raise e
# -----------------------------
# Main Function
# -----------------------------
def main(args):
    # === Set Task Flags ===
    ONE_SHOT = NO_BBOX = WITHOUT_IMGS = WHOLE_STORY = False
    TASK = args.task

    if TASK == "generate_all":
        ONE_SHOT = False
    elif TASK == "no_bbox":
        ONE_SHOT = True
        NO_BBOX = True
    elif TASK == "no_imgs":
        WITHOUT_IMGS = True
        NO_BBOX = True
    elif TASK == "whole_story":
        WITHOUT_IMGS = True
        NO_BBOX = True
        WHOLE_STORY = True
    else:
        ONE_SHOT = True

    # === Load Data ===
    imagedir = args.imagedir
    stu_df = pd.read_excel(args.student_file)
    stu_df = stu_df.fillna("")
    stu_df = stu_df.astype(str)
    teach_df = pd.read_excel(args.teacher_file)

    ROLE = "You are a mentor. Watch the images carefully, generate the caption that grammatically continues the story."
    if not ONE_SHOT:
        ROLE += ". Consider both the student captions and the images. Generate your own story captions and correct the student captions if they are irrelevant to the images. Adapt the student's tone and style. Reply only in 'Teacher: <caption>' format."
        infer_on = -1
    elif not WITHOUT_IMGS:
        ROLE = "You are a mentor. Generate the caption that grammatically continues the story. Consider correcting the student captions. Adapt the student's tone and style. Reply only in 'Teacher: <caption>' format."
        infer_on = -1
    elif WHOLE_STORY:
        ROLE = "You are a mentor. Generate a story based on the student's story and grammatically correct their responses if necessary. Adapt the student's tone and style but the story should be concise. Reply only in 'Teacher: <story>' format."
        infer_on = -1
    else:
        ROLE += " consistent with the given mentor captions. Adapt the student's tone and style. Reply only in 'Teacher: <caption>' format."
        infer_on = np.random.randint(6) + 1

    USER_TEMPL = {"role": "user", "content": []}
    ASST_TEMPL = {"role": "assistant", "content": []}
    template = {"messages": [{"role": "system", "content": ROLE}]}

    student_text = "Student: {student_cap}"
    teacher_text = "Teacher: {teacher_cap}"
    infer_text = "Teacher: <caption for frame {i}>"

    all_results = []

    # Collate for eval
    ref_d = teach_df[["1_image", "2_image", "3_image", "4_image", "5_image", "6_image"]]
    ref_stories=[]
    # Compute alignment for teacher and model output
    
    for _, row in ref_d.iterrows():
        ref_stories.append( "".join([row["1_image"],row["2_image"],row["3_image"],row["4_image"],row["5_image"],row["6_image"]]))

    for sid in tqdm(range(len(stu_df)), desc="Processing students", unit="student"):
      student_imgs = list(stu_df.loc[sid, ["1_image", "2_image", "3_image", "4_image", "5_image", "6_image"]])
      student_story, teacher_story, gt_story = [], [],[]

      template = {"messages": [{"role": "system", "content": ROLE}]}


      if not ONE_SHOT:
          template["messages"].append({"role": "user", "content": []})

      # === Build frames for this student ===
      for i, (scap, tcap) in enumerate(zip(student_imgs, get_sample(teach_df)), start=1):
          frame_temp = [{"type": "text", "text": f"Frame {i} of 6:"}]

          if not WITHOUT_IMGS:
              frame_temp += [{"type": "image_url", "image_url": {"url": image_to_dataurl(os.path.join(imagedir, f"{i}.png"))}}]
              if not NO_BBOX:
                  for crop_f in get_cropped_imgs(i, imagedir):
                      frame_temp += [{"type": "image_url", "image_url": {"url": image_to_dataurl(os.path.join(imagedir, crop_f))}}]

          student_rep = student_text.format(student_cap=scap)
          teacher_rep = teacher_text.format(teacher_cap=tcap)
          gt_story.append(teacher_rep) # For missing 1 tasks

          if infer_on == i or infer_on == -1:
              teacher_rep = infer_text.format(i=i)

          student_story.append(scap)
          teacher_story.append(teacher_rep)

          user = deepcopy(USER_TEMPL)
          asst = deepcopy(ASST_TEMPL)

          user["content"] += frame_temp + [{"type": "text", "text": student_rep}]
          asst["content"] += [{"type": "text", "text": teacher_rep}]

          if ONE_SHOT:
              template["messages"].extend([user, asst])
          elif WHOLE_STORY:
              pass
          else:
              template["messages"][1]["content"] += frame_temp + [
                  {"type": "text", "text": student_rep},
                  {"type": "text", "text": teacher_rep},
              ]

      if ONE_SHOT:
          one_shot_instruct = deepcopy(USER_TEMPL)
          one_shot_instruct["content"].append(
              {"type": "text", "text": f"Generate the missing teacher caption by replacing <natural caption> for frame {infer_on}."}
          )
          template["messages"].append(one_shot_instruct)
      elif WHOLE_STORY:
          template["messages"][1]["content"].append({"type": "text", "text": "Student: " + " ".join(student_story)})
          asst =deepcopy(ASST_TEMPL)
          asst["content"].append({"type": "text", "text": "Teacher: <story>"})
      else:
          template["messages"][1]["content"].append(
              {"type": "text", "text": "Generate the missing teacher caption for all frames by replacing <natural caption>. Do not describe your caption with 'In frame'."}
          )
          asst = deepcopy(ASST_TEMPL)
          asst["content"].append({"type": "text", "text": "\n".join(teacher_story)})
          template["messages"].append(asst)

      token_count = count_tokens(template["messages"])
      print(f"🔹 Approx tokens for student {sid}: {token_count}")
      # print(template)

      # === Run OpenAI Query ===
      os.environ["OPENAI_API_KEY"] = args.api_key
      llm_client = openai.AsyncOpenAI()
      output, ppl,ave_conf = asyncio.run(query_openai(template, client=llm_client))
      output=output.replace("Teacher: ","")
      # print("=== Student Story ===")
      # print(student_story)
      # print("\n=== Teacher Story ===")
      # print(teacher_story)
      # print("\n=== Model Output ===")
      # print(output)
      # print(f"\nPerplexity: {ppl:.4f}")


      # ========= EVALUATION =========
      rouge_metric = load("rouge")
      bleu_metric = load("bleu")
      bertscore_metric = load("bertscore")


      pred = output.strip()
      refs = ref_stories

      rouge = rouge_metric.compute(predictions=[pred], references=[refs])
      bleu = bleu_metric.compute(predictions=[pred], references=[refs])

      # --- BERTScore ---
      bs = bertscore_metric.compute(predictions=[pred], references=[refs], lang="en", model_type="bert-base-uncased", batch_size=1, device="cpu")
      P, R, F1 = bs["precision"][0], bs["recall"][0], bs["f1"][0]

      # --- Sentence-BERT cosine ---
      emb_pred = sbert_model.encode(pred, convert_to_tensor=True)
      emb_refs = sbert_model.encode(refs, convert_to_tensor=True)
      cosine_sims = [util.cos_sim(emb_pred, emb_ref).item() for emb_ref in emb_refs]
      cosine_sim = max(cosine_sims)

      eval_summary = {
          "rouge1": rouge["rouge1"],
          "rouge2": rouge["rouge2"],
          "rougeL": rouge["rougeL"],
          "rougeLsum": rouge["rougeLsum"],
          "bleu": bleu["bleu"],
          "bertscore_P": P,
          "bertscore_R": R,
          "bertscore_F1": F1,
          "sbert_cosine": cosine_sim
      }
      torch.cuda.empty_cache()
      gc.collect()

      # print("\n=== Evaluation Metrics ===")
      # for k, v in eval_summary.items():
      #     print(f"{k}: {v:.4f}")
      tqdm.write(f"Student {sid} done. BLEU={eval_summary['bleu']:.4f}, SBERT={eval_summary['sbert_cosine']:.4f}")

      all_results.append({
          "student_id": sid,
          "timestamp": datetime.now().isoformat(timespec='seconds'),
          "task": TASK,
          "model": "gpt-4o",
          "student_story": " ".join([str(x) for x in student_story if pd.notna(x)]),
          "teacher_story": " ".join([str(x) for x in teacher_story if pd.notna(x)]),
          "model_output": output,
          "perplexity": ppl,
          "ave_conf": ave_conf,
          **eval_summary
      })

    # === Save Results ===
    if args.save_output:
      os.makedirs(os.path.dirname(args.save_output), exist_ok=True)

      out_df = pd.DataFrame(all_results)
      dir, base = os.path.dirname(args.save_output), os.path.basename(args.save_output)
      file = f"{dir}/{TASK}_{base}"
      out_df.to_csv(file, index=False)
    print(f"\n All student outputs + metrics saved to: {file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run multimodal teacher-student story generation with GPT-4o.")
    parser.add_argument("--task", type=str, default="generate_all",
                        choices=["generate_all", "no_bbox", "no_imgs", "whole_story","generate_1"],
                        help="Task type for caption generation")
    parser.add_argument("--imagedir", type=str, default="images/real-1", help="Directory containing images (1.png, 2.png, etc.)")
    parser.add_argument("--student_file", type=str, default="selected_transcript_PTJ.xlsx", help="Path to student transcript Excel file")
    parser.add_argument("--teacher_file", type=str, default="teacher_transcript_PTJ.xlsx", help="Path to teacher transcript Excel file")
    parser.add_argument("--api_key", type=str, default='', help="OpenAI API key")
    parser.add_argument("--save_output", type=str, default="outputs/story_results.csv",
                        help="Path to save output CSV (e.g. outputs/results.csv)")

    args = parser.parse_args()
    main(args)






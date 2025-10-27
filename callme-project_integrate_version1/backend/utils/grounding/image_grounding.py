import torch
from PIL import Image
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection


def grounding_dino_detect(image_file, text_queries=None, box_threshold=0.25):
    model_id = "IDEA-Research/grounding-dino-base"
    processor = AutoProcessor.from_pretrained(model_id)
    model = AutoModelForZeroShotObjectDetection.from_pretrained(model_id)

    # Load image
    if isinstance(image_file, str):
        image = Image.open(image_file).convert("RGB")
    else:
        image = Image.open(image_file).convert("RGB")

    if text_queries is None:
        text_queries = ["object"]

    # Preprocess and run inference
    inputs = processor(images=image, text=text_queries, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)

    target_sizes = torch.tensor([image.size[::-1]])
    results = processor.post_process_grounded_object_detection(
        outputs=outputs,
        target_sizes=target_sizes
    )[0]

    pred = []
    for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
        if float(score) < box_threshold:
            continue
        pred.append({
            "type": "dino",
            "label": str(label),
            "score": float(score),
            "bbox_xyxy": [float(x) for x in box.tolist()]
        })

    return pred

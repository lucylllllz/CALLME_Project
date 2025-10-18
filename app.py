from PIL import Image
import torch
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
import cv2
import numpy as np

import json


BLOB_THRES = 0.25
INDV_THRES = 0.10

with open("common_item.json", "r") as f:
    categories = json.load(f)


# 1) Load model & processor (choose a ckpt from HF hub)
model_id = "IDEA-Research/grounding-dino-base"   # or tiny / large if available
processor = AutoProcessor.from_pretrained(model_id)
model = AutoModelForZeroShotObjectDetection.from_pretrained(model_id)

# 2) Prepare inputs
image = Image.open("images/cartoon-1/1.png").convert("RGB")
# turn your sentence into short object phrases (see the list below for extraction tips) 
# text_queries = ["man", "sign", "electronic store", "surfboard", "ocean", "friends"]
# flatten into one big list of queries for detection
text_queries = [item for group in categories.values() for item in group]
def chunk(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i+n]

BATCH = 50

all_boxes, all_scores, all_labels = [], [], []

for text_batch in chunk(text_queries, BATCH):
    # 3) Run zero-shot detection
    inputs = processor(images=image, text=text_batch, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)

    # 4) Post-process to get boxes (xyxy) + scores + labels
    target_sizes = torch.tensor([image.size[::-1]])  # (h, w)
    results = processor.post_process_grounded_object_detection(
        outputs,
        target_sizes=target_sizes,
    )[0]

    boxes = results["boxes"]
    scores = results["scores"]
    labels = results["labels"]
    
    # 5) Apply threshold and keep consistent indices
    keep = scores > INDV_THRES
    boxes = boxes[keep]
    scores = scores[keep]
    labels = [labels[i] for i in torch.where(keep)[0]]
    
    # map back to text
    batch_labels = labels
    all_boxes.append(boxes.cpu())
    all_scores.append(scores.cpu())
    all_labels.extend(batch_labels)


# 6) Convert to CPU/numpy for visualization
# merge all results
boxes = torch.cat(all_boxes, dim=0).numpy()
scores = torch.cat(all_scores, dim=0).numpy()
labels = all_labels

# Map to original text queries if labels are integer indices
if isinstance(labels[0], torch.Tensor):
    labels = [text_queries[int(i)] for i in torch.stack(labels).numpy()]
elif isinstance(labels[0], (int, float)):
    labels = [text_queries[int(i)] for i in labels]

# --- Build confidence heatmap from DINO boxes ---
image_np = np.array(image)
h, w = image_np.shape[:2]
heatmap = np.zeros((h, w), dtype=np.float32)

for (x1, y1, x2, y2), s in zip(boxes, scores):
    heatmap[int(y1):int(y2), int(x1):int(x2)] += s

# Normalize and threshold
heatmap = np.clip(heatmap / heatmap.max(), 0, 1)
_, binary = cv2.threshold(heatmap, 0.4, 1, cv2.THRESH_BINARY)
binary = (binary * 255).astype(np.uint8)

# --- Blob detection ---
params = cv2.SimpleBlobDetector_Params()
params.filterByArea = True
params.filterByCircularity = False
params.filterByInertia = False
params.filterByConvexity = False
params.filterByColor = False
params.minArea = 5
params.maxArea = 1e7
detector = cv2.SimpleBlobDetector_create(params)
keypoints = detector.detect(binary)

# --- Visualization ---
# copy image for drawing
image_combined = image_np.copy()

# Draw bounding boxes (from DINO)
for box, score, label in zip(boxes, scores, labels):
    x1, y1, x2, y2 = [int(v) for v in box]
    
    # draw green rectangle
    cv2.rectangle(image_combined, (x1, y1), (x2, y2), (0, 255, 0), 2)
    
    # add label + score
    text = f"{label} ({score:.2f})"
    cv2.putText(
        image_combined, text, (x1, max(20, y1 - 10)),
        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2, cv2.LINE_AA,
    )

# Draw blob keypoints
for i, kp in enumerate(keypoints):
    x, y = kp.pt
    r = kp.size / 2
    
    # red circle outline
    cv2.circle(image_combined, (int(x), int(y)), int(r), (0, 0, 255), 2)
    # small green dot for center
    cv2.circle(image_combined, (int(x), int(y)), 3, (0, 255, 0), -1)
    # index label
    cv2.putText(
        image_combined, f"blob{i+1}", (int(x)+5, int(y)-5),
        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA
    )

# Show combined result
cv2.imshow("Bounding Boxes + Blobs", image_combined)
cv2.waitKey(0)
cv2.destroyAllWindows()
# --- Post-process GroundingDINO detections to JSON ---
scores = results["scores"].cpu().numpy()
boxes = results["boxes"].cpu().numpy()
labels = results["labels"]

pred = []
for score, label, box in zip(scores, labels, boxes):
    if float(score) < BLOB_THRES:
        continue

    # Handle label type (index vs string)
    if isinstance(label, (torch.Tensor, np.integer, int)):
        label_str = text_queries[int(label)]
    else:
        label_str = str(label)

    pred.append({
        "label": label_str,
        "score": float(score),
        "bbox_xyxy": [float(x) for x in box.tolist()]
    })

print(pred)
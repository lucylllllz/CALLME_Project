# api.py
# FastAPI server exposing three GPU endpoints:
# 1. /fluency        – oral-fluency scoring
# 2. /sketch2real    – sketch-to-realistic (pass-through)
# 3. /grounding      – open-vocabulary detection (Grounding-DINO)
# Run:  uvicorn api:app --host 0.0.0.0 --port 7777

from typing import List, Optional, Dict, Any
import io
import os
import torch
from PIL import Image
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from pydantic import BaseModel

# ------------------------------------------------------------------
# Import existing business-logic modules (keep them untouched)
# ------------------------------------------------------------------
from fluency import evaluate_fluency
from sketch_to_image_test import transform_image_to_realistic
from image_grounding import grounding_dino_detect

# ------------------------------------------------------------------
# FastAPI app instance
# ------------------------------------------------------------------
app = FastAPI(
    title="GPU-Backend",
    description="Unified REST interface for fluency, sketch2real and grounding services.",
    version="1.0.0",
)

# ------------------------------------------------------------------
# Pydantic response models
# ------------------------------------------------------------------
class FluencyOut(BaseModel):
    Fluency: float
    Level: str
    # allow extra metrics returned by evaluate_fluency
    class Config:
        extra = "allow"

class BoxItem(BaseModel):
    type: str
    label: str
    score: float
    bbox_xyxy: List[float]

class GroundingOut(BaseModel):
    boxes: List[BoxItem]

# ------------------------------------------------------------------
# API endpoints
# ------------------------------------------------------------------

@app.post("/fluency", response_model=FluencyOut, summary="Oral-fluency scoring")
async def fluency(
    audio: UploadFile = File(..., description="Audio file to evaluate"),
    vad_model: str = Form("pyannote/voice-activity-detection"),
    hf_token: Optional[str] = Form("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"),
    asr_model: str = Form("small.en"),
    use_prosody: bool = Form(False),
    long_pause_sec: float = Form(0.7),
    mlfr_pause_sec: float = Form(0.25),
):
    """
    Evaluate the oral fluency of an uploaded audio file.
    Returns overall score, proficiency level and detailed metrics.
    """
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid audio file")

    tmp_path = f"/tmp/{audio.filename}"
    try:
        with open(tmp_path, "wb") as f:
            f.write(await audio.read())

        result = evaluate_fluency(
            audio_path=tmp_path,
            vad_model=vad_model,
            hf_token=hf_token or None,
            asr_model=asr_model,
            use_prosody=use_prosody,
            long_pause_sec=long_pause_sec,
            mlfr_pause_sec=mlfr_pause_sec,
        )
    finally:
        os.remove(tmp_path)

    return result


@app.post("/sketch2real", summary="Sketch-to-realistic (pass-through)")
async def sketch2real(
    image: UploadFile = File(..., description="Sketch image file"),
):
    """
    Convert a sketch into a realistic image.
    Currently returns the original bytes without modification.
    """
    img_bytes = await image.read()
    out_bytes = transform_image_to_realistic(io.BytesIO(img_bytes))
    # Return hex string for JSON compatibility; decode with bytes.fromhex(...) on client
    return {"image_bytes": out_bytes.hex()}


@app.post("/grounding", response_model=GroundingOut, summary="Open-vocabulary detection")
async def grounding(
    image: UploadFile = File(..., description="Image to inspect"),
    text_queries: Optional[str] = Form(None, description="Comma-separated class names"),
    box_threshold: float = Form(0.25, description="Confidence threshold"),
):
    """
    Detect objects in an image using Grounding-DINO.
    Supply arbitrary text queries; receive bounding boxes with scores.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image file")

    img_bytes = await image.read()
    queries = text_queries.split(",") if text_queries else None

    preds = grounding_dino_detect(
        image_file=io.BytesIO(img_bytes),
        text_queries=queries,
        box_threshold=box_threshold,
    )
    return GroundingOut(boxes=preds)


# ------------------------------------------------------------------
# Health-check endpoint
# ------------------------------------------------------------------
@app.get("/", tags=["health"])
def root():
    return {"message": "GPU backend is ready", "cuda": torch.cuda.is_available()}
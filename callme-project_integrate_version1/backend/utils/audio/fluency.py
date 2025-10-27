#!/usr/bin/env python3
# Fluency evaluation using pyannote VAD + Whisper ASR
# Content-agnostic, GPU if available.

import os, glob, argparse, math, json
from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional

import numpy as np
import pandas as pd
import soundfile as sf
import librosa
import torch

# -----------------------
# VAD: pyannote.audio
# -----------------------
from pyannote.audio import Pipeline

# -----------------------
# ASR + alignment: FastWhisper
# -----------------------
from faster_whisper import WhisperModel


# -----------------------
# Utilities
# -----------------------

def load_audio_16k_mono(path: str) -> Tuple[np.ndarray, int]:
    y, sr = sf.read(path, always_2d=False)
    if y.ndim > 1:
        y = np.mean(y, axis=1)
    if sr != 16000:
        y = librosa.resample(y.astype(np.float32), orig_sr=sr, target_sr=16000)
        sr = 16000
    return y.astype(np.float32), sr

def duration_from_path(path: str) -> float:
    info = sf.info(path)
    return float(info.frames) / float(info.samplerate)

def iqr(arr: np.ndarray) -> float:
    if arr.size == 0:
        return 0.0
    q1 = np.quantile(arr, 0.25)
    q3 = np.quantile(arr, 0.75)
    return float(q3 - q1)

@dataclass
class Word:
    text: str
    start: float
    end: float


# -----------------------
# pyannote VAD
# -----------------------

def run_pyannote_vad(path: str, vad_model: str, use_auth_token: Optional[str]) -> List[Tuple[float, float]]:
    """
    Returns speech segments [(start, end), ...] in seconds.
    """
    pipeline = Pipeline.from_pretrained(vad_model, use_auth_token=use_auth_token)
    # pyannote >=3: pass dict with "audio" or "waveform" depending on loading mode.
    # Using file path is simplest:
    result = pipeline({"audio": path})
    # result is an Annotation. We extract "speech" segments.
    segments = []
    for seg in result.get_timeline().support():
        segments.append((float(seg.start), float(seg.end)))
    # Merge tiny gaps (<150 ms) for stable pause computation
    segments.sort()
    merged = []
    for s, e in segments:
        if not merged:
            merged.append([s, e])
        else:
            if s - merged[-1][1] < 0.15:
                merged[-1][1] = max(merged[-1][1], e)
            else:
                merged.append([s, e])
    return [(s, e) for s, e in merged]

def silences_from_speech(segs: List[Tuple[float, float]], total: float) -> List[Tuple[float, float]]:
    if not segs:
        return [(0.0, total)]
    sil = []
    if segs[0][0] > 0.0:
        sil.append((0.0, segs[0][0]))
    for (s1, e1), (s2, e2) in zip(segs, segs[1:]):
        if s2 > e1:
            sil.append((e1, s2))
    if segs[-1][1] < total:
        sil.append((segs[-1][1], total))
    return sil


# -----------------------
# WhisperX ASR (+ alignment)
# -----------------------

def run_whisperx_words(path: str, device: str, compute_type: str,
                       model_size: str = "small.en") -> List[Word]:
    """
    Transcribe using faster-whisper and get word-level timestamps.
    """
    # Load model
    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    
    # Transcribe with word timestamps
    segments, info = model.transcribe(
        path, 
        beam_size=5,
        word_timestamps=True,
        language="en" if "en" in model_size else None
    )
    
    # Extract words
    words = []
    for segment in segments:
        for word in segment.words:
            if word.word.strip():
                words.append(Word(
                    text=word.word.strip(),
                    start=word.start,
                    end=word.end
                ))
    
    return words


# -----------------------
# Features
# -----------------------

def words_per_min(n_words: int, dur_sec: float) -> float:
    return 0.0 if dur_sec <= 1e-6 else n_words / (dur_sec / 60.0)

def articulation_time(speech_segs: List[Tuple[float, float]]) -> float:
    return sum(e - s for s, e in speech_segs)

def long_pause_freq(silences: List[Tuple[float, float]], min_long: float, total: float) -> float:
    n = sum(1 for (s, e) in silences if (e - s) >= min_long)
    return 0.0 if total <= 1e-6 else n / (total / 60.0)

def mlfr(words: List[Word], pause_thr: float = 0.25) -> float:
    if not words:
        return 0.0
    ws = sorted(words, key=lambda w: w.start)
    runs, run_len = [], 1
    for i in range(1, len(ws)):
        gap = max(0.0, ws[i].start - ws[i-1].end)
        if gap >= pause_thr:
            runs.append(run_len)
            run_len = 1
        else:
            run_len += 1
    runs.append(run_len)
    return float(np.mean(runs)) if runs else 0.0

def rate_stability(words: List[Word], window_sec: float = 5.0) -> float:
    if not words:
        return 0.0
    t0 = words[0].start
    t1 = max(w.end for w in words)
    if t1 - t0 < window_sec:
        return 0.0
    bins = np.arange(t0, t1 + window_sec, window_sec)
    wpm_list = []
    wi = 0
    for b in range(len(bins) - 1):
        s, e = bins[b], bins[b+1]
        c = 0
        while wi < len(words) and words[wi].start < e:
            if words[wi].end > s:
                c += 1
            wi += 1
        wpm_list.append(c / (window_sec / 60.0))
        wi = max(0, wi - 5)
    return float(np.std(wpm_list, ddof=1)) if len(wpm_list) >= 2 else 0.0

def prosody_iqrs(path: str, fmin=75.0, fmax=400.0) -> Tuple[float, float]:
    y, sr = load_audio_16k_mono(path)
    f0, vflag, _ = librosa.pyin(y, fmin=fmin, fmax=fmax, sr=sr)
    rms = librosa.feature.rms(y=y).flatten()
    vf = np.array(vflag, dtype=bool)
    f0_v = f0[vf]
    rms_v = rms[vf] if vf.size == rms.size else rms
    if f0_v.size > 0:
        lo, hi = np.nanquantile(f0_v, 0.05), np.nanquantile(f0_v, 0.95)
        f0_v = np.clip(f0_v, lo, hi)
        f0_v = f0_v[~np.isnan(f0_v)]
    rms_db = 20.0 * np.log10(np.maximum(rms_v, 1e-8))
    return (iqr(f0_v) if f0_v.size > 0 else 0.0,
            iqr(rms_db) if rms_db.size > 0 else 0.0)


# -----------------------
# Z-scores & scoring
# -----------------------

TIMING = ["SR", "AR", "PR", "MLFR", "LPF", "RateSD"]
PROSODY = ["F0_IQR", "RMS_IQR"]

def zscore_df(df: pd.DataFrame, ref: Optional[pd.DataFrame], cols: List[str]) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)
    for c in cols:
        if ref is not None and c in ref.columns and len(ref[c].dropna()) >= 2:
            mu = float(ref[c].mean()); sd = float(ref[c].std(ddof=1))
        else:
            mu = float(df[c].mean()); sd = float(df[c].std(ddof=1)) if len(df) > 1 else 1.0
        sd = sd if sd > 1e-9 else 1.0
        out[f"z_{c}"] = (df[c] - mu) / sd
    return out

def level_from_score(s: float) -> str:
    if s >= 0.8: return "Advanced"
    if s >= 0.2: return "Intermediate"
    return "Basic"


# -----------------------
# End-to-end
# -----------------------

def process_one(path: str,
                vad_model: str,
                hf_token: Optional[str],
                device: str,
                compute_type: str,
                asr_model: str,
                use_prosody: bool,
                long_pause_sec: float,
                mlfr_pause_sec: float) -> Dict[str, float]:
    total = duration_from_path(path)

    # VAD
    speech = run_pyannote_vad(path, vad_model=vad_model, use_auth_token=hf_token)
    silences = silences_from_speech(speech, total)
    t_speech = sum(e - s for s, e in speech)
    pr = 0.0 if total <= 1e-6 else (total - t_speech) / total

    # ASR + alignment
    words = run_whisperx_words(path, device=device, compute_type=compute_type, model_size=asr_model)
    words_clean = [w for w in words if any(ch.isalpha() for ch in w.text)]
    n_words = len(words_clean)

    sr_wpm = words_per_min(n_words, total)
    ar_wpm = words_per_min(n_words, t_speech) if t_speech > 0 else 0.0
    lpf = long_pause_freq(silences, long_pause_sec, total)
    mlfr_val = mlfr(words_clean, pause_thr=mlfr_pause_sec)
    rsd = rate_stability(words_clean, window_sec=5.0)

    f0_iqr = rms_iqr = 0.0
    if use_prosody:
        f0_iqr, rms_iqr = prosody_iqrs(path)

    return {
        "path": path,
        "Duration": total,
        "N_words": n_words,
        "SR": sr_wpm,
        "AR": ar_wpm,
        "PR": pr,
        "LPF": lpf,
        "MLFR": mlfr_val,
        "RateSD": rsd,
        "F0_IQR": f0_iqr,
        "RMS_IQR": rms_iqr,
    }

def score_metric(value: float, metric_name: str) -> float:
    """
    Score a single metric on 0-1 scale based on research-backed ranges.
    Returns: 0.0 (poor) to 1.0 (excellent)
    """
    if metric_name == "SR":  # Speech Rate (words/min)
        # Optimal: 140-180, Acceptable: 100-140, Low: <100
        if value >= 160:
            return 1.0
        elif value >= 140:
            return 0.9
        elif value >= 120:
            return 0.7
        elif value >= 100:
            return 0.5
        elif value >= 80:
            return 0.3
        else:
            return 0.1
            
    elif metric_name == "AR":  # Articulation Rate (words/min)
        # Optimal: 160-200, Acceptable: 120-160, Low: <120
        if value >= 180:
            return 1.0
        elif value >= 160:
            return 0.9
        elif value >= 140:
            return 0.7
        elif value >= 120:
            return 0.5
        elif value >= 100:
            return 0.3
        else:
            return 0.1
            
    elif metric_name == "PR":  # Pause Ratio (lower is better, but not too low)
        # Optimal: 0.15-0.30, Acceptable: 0.30-0.40, High: >0.40
        if 0.15 <= value <= 0.25:
            return 1.0
        elif 0.10 <= value < 0.15 or 0.25 < value <= 0.30:
            return 0.8
        elif 0.30 < value <= 0.35:
            return 0.6
        elif 0.35 < value <= 0.40:
            return 0.4
        elif 0.40 < value <= 0.50:
            return 0.2
        else:
            return 0.1
            
    elif metric_name == "MLFR":  # Mean Length of Fluent Run (higher is better)
        # Optimal: >10, Good: 7-10, Acceptable: 5-7, Low: <5
        if value >= 10:
            return 1.0
        elif value >= 8:
            return 0.8
        elif value >= 6:
            return 0.6
        elif value >= 5:
            return 0.4
        elif value >= 3:
            return 0.2
        else:
            return 0.1
            
    elif metric_name == "LPF":  # Long Pause Frequency (lower is better)
        # Optimal: <2, Good: 2-4, Acceptable: 4-6, High: >6
        if value <= 2:
            return 1.0
        elif value <= 3:
            return 0.8
        elif value <= 4:
            return 0.6
        elif value <= 5:
            return 0.4
        elif value <= 7:
            return 0.2
        else:
            return 0.1
            
    elif metric_name == "RateSD":  # Rate Stability (lower is better)
        # Optimal: <30, Good: 30-50, Acceptable: 50-70, High: >70
        if value <= 30:
            return 1.0
        elif value <= 40:
            return 0.8
        elif value <= 50:
            return 0.6
        elif value <= 65:
            return 0.4
        elif value <= 80:
            return 0.2
        else:
            return 0.1
            
    elif metric_name == "F0_IQR":  # Pitch variability (moderate is better)
        # Optimal: 40-80 Hz, Acceptable: 20-100, Flat: <20 or >100
        if 40 <= value <= 80:
            return 1.0
        elif 30 <= value < 40 or 80 < value <= 90:
            return 0.7
        elif 20 <= value < 30 or 90 < value <= 100:
            return 0.5
        else:
            return 0.3
            
    elif metric_name == "RMS_IQR":  # Amplitude variability (moderate is better)
        # Optimal: 8-15 dB, Acceptable: 5-20, Flat: <5 or >20
        if 8 <= value <= 15:
            return 1.0
        elif 6 <= value < 8 or 15 < value <= 18:
            return 0.7
        elif 5 <= value < 6 or 18 < value <= 20:
            return 0.5
        else:
            return 0.3
    
    return 0.5  # Default


def level_from_score_new(s: float) -> str:
    """Map fluency score to proficiency level."""
    if s >= 0.75:
        return "Advanced"
    elif s >= 0.50:
        return "Intermediate"
    elif s >= 0.30:
        return "Basic"
    else:
        return "Below Basic"


# -----------------------
# ⭐ main function
# -----------------------

def process_one(path: str,
                vad_model: str,
                hf_token: Optional[str],
                device: str,
                compute_type: str,
                asr_model: str,
                use_prosody: bool,
                long_pause_sec: float,
                mlfr_pause_sec: float) -> Dict[str, Union[float, str]]:
    
    total = duration_from_path(path)
    if total == 0:
        return {"Fluency": 0.0, "Level": "Below Basic", "Error": "Audio file is empty or invalid."}

    # VAD
    try:
        speech = run_pyannote_vad(path, vad_model=vad_model, use_auth_token=hf_token)
        silences = silences_from_speech(speech, total)
        t_speech = sum(e - s for s, e in speech)
        pr = 0.0 if total <= 1e-6 else (total - t_speech) / total
    except Exception as e:
        print(f"VAD failed for {path}: {e}")
        t_speech = total
        pr = 0.0

    # ASR + alignment
    try:
        words = run_whisperx_words(path, device=device, compute_type=compute_type, model_size=asr_model)
        words_clean = [w for w in words if any(ch.isalpha() for ch in w.text)]
        n_words = len(words_clean)
    except Exception as e:
        print(f"ASR failed for {path}: {e}")
        n_words = 0
        words_clean = []

    # Feature Calculation
    sr_wpm = words_per_min(n_words, total)
    ar_wpm = words_per_min(n_words, t_speech) if t_speech > 0 else 0.0
    lpf = long_pause_freq(silences, long_pause_sec, total) if n_words > 0 else 0.0
    mlfr_val = mlfr(words_clean, pause_thr=mlfr_pause_sec)
    rsd = rate_stability(words_clean, window_sec=5.0)

    f0_iqr = rms_iqr = 0.0
    if use_prosody:
        try:
            f0_iqr, rms_iqr = prosody_iqrs(path)
        except Exception as e:
            print(f"Prosody failed for {path}: {e}")
            
    # Result Dictionary
    feats = {
        "SR": sr_wpm,
        "AR": ar_wpm,
        "PR": pr,
        "LPF": lpf,
        "MLFR": mlfr_val,
        "RateSD": rsd,
        "F0_IQR": f0_iqr,
        "RMS_IQR": rms_iqr,
    }
    
    # Scoring
    sr_score = score_metric(feats["SR"], "SR")
    ar_score = score_metric(feats["AR"], "AR")
    pr_score = score_metric(feats["PR"], "PR")
    mlfr_score = score_metric(feats["MLFR"], "MLFR")
    lpf_score = score_metric(feats["LPF"], "LPF")
    ratesd_score = score_metric(feats["RateSD"], "RateSD")
    
    # Timing composite (weighted average)
    timing_score = (
        0.25 * sr_score +      
        0.20 * ar_score +      
        0.15 * pr_score +      
        0.20 * mlfr_score +    
        0.10 * lpf_score +     
        0.10 * ratesd_score    
    )

    # Prosody scoring (Optional)
    if use_prosody:
        f0_score = score_metric(feats["F0_IQR"], "F0_IQR")
        rms_score = score_metric(feats["RMS_IQR"], "RMS_IQR")
        prosody_score = 0.5 * f0_score + 0.5 * rms_score
        fluency_score = 0.70 * timing_score + 0.30 * prosody_score
    else:
        prosody_score = np.nan
        fluency_score = timing_score
        
    level = level_from_score_new(fluency_score)

    return {
        "Fluency": float(fluency_score),
        "Level": level,
        "Timing_Score": float(timing_score),
        "Prosody_Score": float(prosody_score) if use_prosody else None,
        "N_words": n_words,
        "Duration": total,
        **feats
    }


# -----------------------
# ⭐ interface function
# -----------------------

def evaluate_fluency(
    audio_path: str,
    vad_model: str = "pyannote/voice-activity-detection",
    hf_token: Optional[str] = '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', # default token
    asr_model: str = "small.en",
    use_prosody: bool = False,
    long_pause_sec: float = 0.7,
    mlfr_pause_sec: float = 0.25
) -> Dict[str, Union[float, str, None]]:
    """
    Evaluates the oral fluency of a single audio file, returning the overall score and proficiency level.

    Args:
        audio_path: The complete path to the audio file to be processed.
        vad_model: The pyannote VAD model ID.
        hf_token: The Hugging Face access token.
        asr_model: The size of the Faster-Whisper model (e.g., 'small.en').
        use_prosody: Flag to enable the calculation of prosody features (F0_IQR, RMS_IQR).
        long_pause_sec: The threshold in seconds for defining a long pause frequency (LPF).
        mlfr_pause_sec: The pause threshold used for Mean Length of Fluent Run (MLFR) calculation.

    Returns:
        A dictionary containing the total Fluency score, the proficiency Level, and other detailed metrics.
    """
    
    # has_cuda = torch.cuda.is_available()
    # device = "cuda" if has_cuda else "cpu"
    # compute_type = "float16" if has_cuda else "int8"

    # if not os.path.exists(audio_path):
    #     return {"Fluency": 0.0, "Level": "Error", "Error": f"Audio file not found at: {audio_path}"}

    # results = process_one(
    #     path=audio_path,
    #     vad_model=vad_model,
    #     hf_token=hf_token,
    #     device=device,
    #     compute_type=compute_type,
    #     asr_model=asr_model,
    #     use_prosody=use_prosody,
    #     long_pause_sec=long_pause_sec,
    #     mlfr_pause_sec=mlfr_pause_sec,
    # )
    
    print("[MOCK MODE]: Audio Fluency Evaluation: Returning fixed fluency results immediately.")
    return {
        "Fluency": 0.78,
        "Level": "Advanced",
        "Timing_Score": 0.85,
        "Prosody_Score": 0.65,
        "N_words": 55,
        "Duration": 25.4,
        "SR": 129.9,
        "AR": 165.5,
        "PR": 0.21,
        "LPF": 2.3,
        "MLFR": 8.5,
        "RateSD": 35.0,
        "F0_IQR": 55.0,
        "RMS_IQR": 10.5,
    }

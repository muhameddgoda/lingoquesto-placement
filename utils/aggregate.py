from __future__ import annotations
from typing import Dict, List, Any

def _num(x):
    try:
        return float(x)
    except Exception:
        return None

def _extract_scores_one(raw: Dict[str, Any]) -> Dict[str, float]:
    out: Dict[str, float] = {}

    # 1) Normal scripted/unscripted shape
    try:
        v = _num(raw.get("pronunciation", {}).get("overall_score"))
        if v is not None:
            out["pronunciation"] = v
    except Exception:
        pass

    try:
        v = _num(raw.get("fluency", {}).get("overall_score"))
        if v is not None:
            out["fluency"] = v
    except Exception:
        pass

    # 2) Pronunciation endpoint shape (minimal_pair / single-word)
    if "pronunciation" not in raw:
        v = _num(raw.get("overall_score"))
        if v is not None and isinstance(raw.get("words"), list):
            out["pronunciation"] = v

    # 3) Grammar / Vocabulary
    for k in ("grammar", "vocabulary"):
        v1 = _num(raw.get(k))
        if v1 is not None:
            out[k] = v1

    # 4) Relevance handling (scripted numeric OR unscripted label)
    meta = raw.get("metadata", {}) or {}
    rel_val = meta.get("content_relevance")

    if isinstance(rel_val, (int, float)):
        # Scripted numeric score (0–100)
        out["relevance"] = float(rel_val)
        out["relevance_label"] = (
            "RELEVANT" if rel_val >= 80
            else "PARTIALLY_RELEVANT" if rel_val >= 50
            else "NOT_RELEVANT"
        )
    elif isinstance(rel_val, str):
        # Unscripted label
        label = rel_val.strip().upper()
        out["relevance_label"] = label
        label_map = {
            "RELEVANT": 100,
            "PARTIALLY_RELEVANT": 50,
            "NOT_RELEVANT": 0
        }
        if label in label_map:
            out["relevance"] = label_map[label]

    return out

def _merge_chunk_scores(chunk_reports: List[Dict[str, Any]]) -> Dict[str, float]:
    acc: Dict[str, float] = {}
    cnt: Dict[str, int] = {}
    for r in chunk_reports:
        sc = _extract_scores_one(r)
        for k, v in sc.items():
            if v is None:
                continue
            try:
                v = float(v)  # Ensure v is a float
            except ValueError:
                continue  # If v can't be converted to float, skip it
            acc[k] = acc.get(k, 0.0) + v
            cnt[k] = cnt.get(k, 0) + 1
    return {k: round(acc[k] / max(cnt[k], 1), 2) for k in acc}

def _normalize_weights(profile_weights: Dict[str, float] | None) -> Dict[str, float] | None:
    if not profile_weights:
        return None
    total = sum([float(v) for v in profile_weights.values() if v is not None])
    if total <= 0:
        return None
    return {k: float(v) / total for k, v in profile_weights.items()}

def _weighted_overall(scores: Dict[str, float], weights: Dict[str, float] | None) -> float | None:
    if not weights:
        return None
    s = 0.0
    w = 0.0
    for k, wk in weights.items():
        v = scores.get(k)
        if v is None:
            continue
        s += v * wk
        w += wk
    if w <= 0:
        return None
    return round(s, 2)

def _overall_nonzero(scores: dict, profile_weights: dict | None = None) -> float:
    profile_weights = profile_weights or {}
    keys = ["pronunciation", "fluency", "grammar", "vocabulary"]  # exclude relevance
    weighted_sum = 0.0
    weight_total = 0.0

    for k in keys:
        v = scores.get(k)
        if isinstance(v, (int, float)) and v > 0:
            w = float(profile_weights.get(k, 1.0))
            weighted_sum += v * w
            weight_total += w

    if weight_total <= 0:
        return 0.0
    return round(weighted_sum / weight_total, 2)

def aggregate_reports(reports: List[Dict[str, Any]],
                      parts: List[str],
                      task_kind: str,
                      profile_weights: Dict[str, float] | None = None) -> Dict[str, float]:
    per_aspect = _merge_chunk_scores(reports)
    weights = _normalize_weights(profile_weights)
    overall = _overall_nonzero(per_aspect, profile_weights=profile_weights)
    agg = dict(per_aspect)
    agg["overall_weighted"] = overall
    return agg

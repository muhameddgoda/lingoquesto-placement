import json, os
from typing import List, Dict

def load_questions(path: str) -> List[Dict]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def select_for_test(items: List[Dict], cfg: dict) -> List[Dict]:
    tc = cfg.get("test", {})
    if not tc.get("enabled", False): 
        return []
    allowed_types = set(tc.get("question_types", []))
    include_ids = set(tc.get("include_ids", []))
    exclude_ids = set(tc.get("exclude_ids", []))
    max_per_type = int(tc.get("max_per_type", 1))

    selected = []
    per_type_count = {}

    def ok(it):
        if include_ids and it.get("id") not in include_ids: return False
        if it.get("id") in exclude_ids: return False
        if it.get("type") not in allowed_types: return False
        return True

    for it in items:
        if not ok(it): 
            continue
        t = it.get("type")
        if per_type_count.get(t, 0) >= max_per_type:
            continue
        selected.append(it)
        per_type_count[t] = per_type_count.get(t, 0) + 1

    return selected

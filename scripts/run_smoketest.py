import asyncio, os, sys
from config.loader import get_config, limit_for, default_accent
from utils.select_questions import load_questions, select_for_test
from utils.chunk_audio import chunk_audio
from utils.aggregate import aggregate_reports
from integrations.lc_client import lc_scripted, lc_unscripted, lc_pron

QUESTIONS_PATH = "questions/a1.json"
IMG_DIR = "questions/images"
AUD_DIR = "questions/audio"

def _exists(path):
    return os.path.exists(path) and os.path.isfile(path)

async def eval_one(item, cfg):
    q_type = item["type"]
    meta = item.get("metadata", {})
    accent = meta.get("accent", default_accent(cfg))
    limit = limit_for(q_type, cfg)
    # Resolve media
    audio_ref = meta.get("audioRef")
    image_ref = meta.get("imageRef")
    if image_ref and not _exists(os.path.join(IMG_DIR, image_ref)):
        raise FileNotFoundError(f"Missing image: {image_ref}")
    # For listen_answer/dictation, you likely play audio to user; here we only test user response recording path
    # So we expect a test recording per item under /questions/audio/<id>.wav
    user_audio = os.path.join(AUD_DIR, f"{item['id']}.wav")
    if not _exists(user_audio):
        raise FileNotFoundError(f"Missing test recording for {item['id']}: {user_audio}")

    parts = chunk_audio(user_audio, max_sec=limit, overlap_ms=0)
    reports = []
    for p in parts:
        if q_type in {"repeat_sentence","dictation","scripted"}:
            et = meta.get("expectedText") or item.get("prompt")
            reports.append(await lc_scripted(p, expected_text=et, accent=accent))
        elif q_type in {"minimal_pair","pronunciation"}:
            et = meta.get("expectedText")
            reports.append(await lc_pron(p, expected_text=et, accent=accent))
        else:
            ctx = (meta.get("context") or {})
            reports.append(await lc_unscripted(
                p, question=ctx.get("question"), context_description=ctx.get("context_description"), accent=accent
            ))
    task_kind = "scripted" if q_type in {"repeat_sentence","dictation","scripted","minimal_pair","pronunciation"} else "unscripted"
    agg = aggregate_reports(reports, parts, task_kind)
    return {"id": item["id"], "type": q_type, "scores": agg, "chunks": len(parts)}

async def main():
    cfg = get_config()
    items = load_questions(QUESTIONS_PATH)
    test_items = select_for_test(items, cfg)
    if not test_items:
        print("No questions selected by config. Check config/app_config.json -> test.*")
        sys.exit(0)
    print(f"Selected {len(test_items)} item(s): {[i['id'] for i in test_items]}")
    results = []
    for it in test_items:
        try:
            res = await eval_one(it, cfg)
            results.append(res)
            print(f"✓ {res['id']} ({res['type']}): {res['scores']}")
        except Exception as e:
            print(f"✗ {it['id']} ({it['type']}): {e}")
    # basic summary
    passed = 0
    for r in results:
        s = r["scores"]; qtype = r["type"]
        if qtype in {"repeat_sentence","dictation","minimal_pair","pronunciation"}:
            ok = (s.get("relevance", 0) >= 80 if isinstance(s.get("relevance"), (int,float)) else True) and (s.get("pronunciation", 0) >= 70)
        else:
            mean_core = sum([x for x in [s.get("pronunciation"), s.get("fluency"), s.get("grammar"), s.get("vocabulary")] if isinstance(x, (int,float))]) / 4
            rel_ok = (s.get("relevance") == "RELEVANT") or (isinstance(s.get("relevance"), (int,float)) and s.get("relevance") >= 70)
            ok = rel_ok and mean_core >= 70
        passed += int(bool(ok))
    print(f"Summary: {passed}/{len(results)} items met default thresholds")

if __name__ == "__main__":
    asyncio.run(main())

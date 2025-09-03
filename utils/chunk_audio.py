# utils/chunk_audio.py
from pydub import AudioSegment

def chunk_audio(in_path: str, max_sec: int, overlap_ms: int = 0):
    audio = AudioSegment.from_file(in_path)
    max_ms = max_sec * 1000
    chunks = []
    start = 0
    while start < len(audio):
        end = min(start + max_ms, len(audio))
        chunks.append(audio[start:end])
        if end == len(audio): break
        start = end - overlap_ms
    # write temp files
    paths = []
    for i, ch in enumerate(chunks):
        out = f"{in_path}.part{i:02d}.wav"
        ch.set_frame_rate(16000).set_channels(1).export(out, format="wav")
        paths.append(out)
    return paths

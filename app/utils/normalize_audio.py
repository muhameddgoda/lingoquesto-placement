# utils/normalize_audio.py
import os, tempfile, wave
from pydub import AudioSegment

def ensure_ffmpeg():
    # Optional: allow overriding path if ffmpeg is not on PATH
    # from pydub.utils import which
    # if not which("ffmpeg"):
    #     AudioSegment.converter = r"C:\path\to\ffmpeg.exe"
    pass

def normalize_to_wav16k_mono(in_path: str) -> str:
    """
    Load (webm/ogg/wav/…) and export to 16kHz mono 16-bit PCM WAV.
    Returns path to normalized wav.
    """
    ensure_ffmpeg()
    audio = AudioSegment.from_file(in_path)   # auto-detects container/codec
    audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)  # 16-bit
    out = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    audio.export(out.name, format="wav", parameters=[])
    out.close()
    return out.name

def probe_wav(path: str) -> dict:
    with wave.open(path, "rb") as w:
        fr = w.getframerate()
        sw = w.getsampwidth() * 8
        ch = w.getnchannels()
        dur = w.getnframes() / float(fr) if fr else 0.0
    return {"sample_rate": fr, "bit_depth": sw, "channels": ch, "duration_sec": round(dur, 3)}

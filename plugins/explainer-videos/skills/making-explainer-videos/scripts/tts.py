# ABOUTME: Voices each scene's narration (ElevenLabs or macOS `say`), one clip per sentence, and records sentence timings.
# ABOUTME: Scene animation is timed against timings.json, so the voice track is built before any rendering.
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import wave
from pathlib import Path

from spec import load, spoken

RATE = 22050
LEAD_IN = 0.5      # seconds of silence before the first sentence of a scene
GAP = 0.35         # seconds of silence between sentences
TAIL = 1.0         # seconds of silence after the last sentence, so the final visual can settle

# Premade ElevenLabs narrator voices; any other voice id can be passed directly.
ELEVEN_VOICES = {"brian": "nPczCjzI2devNBz1zQrb", "george": "JBFqnCBsd6RMkjVDRZzb"}
ELEVEN_MODEL = "eleven_multilingual_v2"
CACHE = Path.home() / ".cache" / "explainer-tts"   # same text + voice is never billed twice


def eleven_key():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if key:
        return key
    r = subprocess.run(["security", "find-generic-password", "-s", "elevenlabs-api", "-a", os.environ.get("USER", ""),
                        "-w"], capture_output=True, text=True)
    return r.stdout.strip() or None


def eleven_pcm(text, voice, prev_text, next_text, key):
    voice_id = ELEVEN_VOICES.get(voice.lower(), voice)
    body = {"text": text, "model_id": ELEVEN_MODEL}
    # Neighbouring sentences keep intonation continuous across separately generated clips.
    if prev_text:
        body["previous_text"] = prev_text
    if next_text:
        body["next_text"] = next_text
    tag = hashlib.sha256(json.dumps([voice_id, ELEVEN_MODEL, body], sort_keys=True).encode()).hexdigest()[:20]
    cached = CACHE / f"{tag}.pcm"
    if cached.exists():
        return cached.read_bytes(), False
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=pcm_{RATE}",
        data=json.dumps(body).encode(), method="POST",
        headers={"xi-api-key": key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            pcm = resp.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs request failed ({e.code}): {e.read().decode(errors='replace')[:400]}")
    CACHE.mkdir(parents=True, exist_ok=True)
    cached.write_bytes(pcm)
    return pcm, True


KOKORO_DIR = Path.home() / ".cache" / "kokoro"
_kokoro = None


def kokoro_ready():
    return (KOKORO_DIR / "kokoro-v1.0.onnx").exists() and (KOKORO_DIR / "voices-v1.0.bin").exists()


def kokoro_pcm(text, voice, speed):
    # Kokoro-82M (Apache-2.0) runs offline; it outputs 24 kHz float audio, resampled here to the pipeline's rate.
    global _kokoro
    if _kokoro is None:
        from kokoro_onnx import Kokoro
        _kokoro = Kokoro(str(KOKORO_DIR / "kokoro-v1.0.onnx"), str(KOKORO_DIR / "voices-v1.0.bin"))
    samples, sr = _kokoro.create(text, voice=voice, speed=speed, lang="en-gb" if voice.startswith("b") else "en-us")
    raw = (samples.clip(-1, 1) * 32767).astype("<i2").tobytes()
    out = subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "s16le", "-ar", str(sr), "-ac", "1", "-i", "pipe:0",
                          "-f", "s16le", "-ar", str(RATE), "-ac", "1", "pipe:1"], input=raw, capture_output=True, check=True)
    return out.stdout


def say_pcm(text, voice, rate):
    with tempfile.TemporaryDirectory() as tmp:
        aiff, wav_path = Path(tmp) / "s.aiff", Path(tmp) / "s.wav"
        subprocess.run(["say", "-v", voice, "-r", str(rate), "-o", str(aiff), text], check=True)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(aiff),
                        "-ac", "1", "-ar", str(RATE), "-sample_fmt", "s16", str(wav_path)], check=True)
        with wave.open(str(wav_path)) as w:
            return w.readframes(w.getnframes())


def write_wav(path, pcm):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(pcm))


def silence(seconds):
    return b"\x00\x00" * int(round(seconds * RATE))


def build(spec_path, out_dir, engine, voice, rate):
    spec = load(spec_path)
    out = Path(out_dir)
    (out / "audio").mkdir(parents=True, exist_ok=True)
    key = eleven_key() if engine == "elevenlabs" else None
    if engine == "elevenlabs" and not key:
        sys.exit("No ElevenLabs key: set ELEVENLABS_API_KEY or store it in the Keychain as service 'elevenlabs-api'.")
    pronounce = spec.get("pronounce")
    timings, chars = {}, 0
    for scene in spec["scenes"]:
        audio_text = [spoken(s, pronounce) for s in scene["sentences"]]
        pcm = bytearray(silence(LEAD_IN))
        entries = []
        for n, sentence in enumerate(scene["sentences"]):
            if engine == "elevenlabs":
                prev_t = audio_text[n - 1] if n > 0 else None
                next_t = audio_text[n + 1] if n + 1 < len(audio_text) else None
                frames, billed = eleven_pcm(audio_text[n], voice, prev_t, next_t, key)
                chars += len(audio_text[n]) if billed else 0
            elif engine == "kokoro":
                frames = kokoro_pcm(audio_text[n], voice, rate / 175)
            else:
                frames = say_pcm(audio_text[n], voice, rate)
            write_wav(out / "audio" / f"{scene['id']}_{n:02d}.wav", frames)
            start = len(pcm) / 2 / RATE
            pcm += frames
            entries.append({"text": sentence, "start": round(start, 3),
                            "duration": round(len(frames) / 2 / RATE, 3)})
            pcm += silence(GAP if n < len(scene["sentences"]) - 1 else TAIL)
        scene_wav = out / "audio" / f"{scene['id']}.wav"
        write_wav(scene_wav, pcm)
        timings[scene["id"]] = {"audio": str(scene_wav.resolve()), "sentences": entries,
                                "total": round(len(pcm) / 2 / RATE, 3),
                                "equations": [str(e) for e in scene.get("equations") or []]}
        print(f"{scene['id']}: {len(entries)} sentences, {timings[scene['id']]['total']:.2f} s")
    (out / "timings.json").write_text(json.dumps(timings, indent=2))
    if engine == "elevenlabs":
        print(f"ElevenLabs characters billed this run: {chars} (cached clips are free)")
    return timings


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("out_dir")
    ap.add_argument("--engine", choices=["elevenlabs", "kokoro", "say"], default=None,
                    help="default: elevenlabs if a key is available, else kokoro if its model is downloaded, else say")
    ap.add_argument("--voice", default=None,
                    help="elevenlabs: brian | george | <voice_id>; kokoro: am_michael | bm_george | af_heart ...; say: macOS voice")
    ap.add_argument("--rate", type=int, default=175, help="words per minute (say); kokoro speed = rate / 175")
    a = ap.parse_args()
    engine = a.engine or ("elevenlabs" if eleven_key() else "kokoro" if kokoro_ready() else "say")
    if engine == "kokoro" and not kokoro_ready():
        sys.exit(f"Kokoro model files are missing in {KOKORO_DIR}. See SKILL.md for the two download commands.")
    voice = a.voice or {"elevenlabs": "brian", "kokoro": "am_michael", "say": "Samantha"}[engine]
    if engine == "say" and subprocess.run(["which", "say"], capture_output=True).returncode != 0:
        sys.exit("macOS `say` is not available on this machine.")
    print(f"Voice: {engine} / {voice}")
    build(a.spec, a.out_dir, engine, voice, a.rate)

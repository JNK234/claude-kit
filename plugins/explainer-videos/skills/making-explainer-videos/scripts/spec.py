# ABOUTME: Loads and validates the video content spec (video.yaml) shared by every pipeline step.
# ABOUTME: Splits narration into sentences and exposes the text each scene is allowed to put on screen.
import re
import sys
from pathlib import Path

import yaml

REQUIRED_SCENE_KEYS = ("id", "narration", "visual")


def load(spec_path):
    spec = yaml.safe_load(Path(spec_path).read_text())
    errors = []
    for key in ("title", "slug", "scenes"):
        if not spec.get(key):
            errors.append(f"spec is missing '{key}'")
    seen = set()
    for i, scene in enumerate(spec.get("scenes") or []):
        for key in REQUIRED_SCENE_KEYS:
            if not str(scene.get(key) or "").strip():
                errors.append(f"scene {i} is missing '{key}'")
        sid = scene.get("id", "")
        if not re.fullmatch(r"[a-z][a-z0-9_]*", str(sid)):
            errors.append(f"scene id '{sid}' must be lowercase letters, digits and underscores")
        for value, how in (scene.get("derived") or {}).items():
            if not str(how).strip():
                errors.append(f"scene '{sid}': derived value '{value}' needs the formula or source it comes from")
        if sid in seen:
            errors.append(f"scene id '{sid}' is used twice")
        seen.add(sid)
    if errors:
        sys.exit("Spec errors:\n- " + "\n- ".join(errors))
    for scene in spec["scenes"]:
        scene["narration"] = " ".join(str(scene["narration"]).split())
        scene["sentences"] = split_sentences(scene["narration"])
    return spec


ABBREVIATIONS = ("Dr.", "Mr.", "Ms.", "Mrs.", "Prof.", "St.", "vs.", "e.g.", "i.e.", "etc.", "Fig.", "al.", "No.")


def split_sentences(text):
    # Split after . ! ? when the next character starts a new sentence, so "3.5", "e.g." and "Dr. X" stay whole.
    raw = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])", text.strip())
    parts = []
    for piece in (p.strip() for p in raw if p.strip()):
        last_word = parts[-1].split()[-1] if parts else ""
        if last_word in ABBREVIATIONS:              # whole word only, so "total." is not mistaken for "al."
            parts[-1] = parts[-1] + " " + piece
        else:
            parts.append(piece)
    if " ".join(parts) != text.strip():
        sys.exit(f"Sentence split lost text in: {text!r}")
    return parts


def class_name(scene_id):
    return "".join(part.capitalize() for part in scene_id.split("_")) + "Scene"


def number_forms(value):
    # The forms a spec number can legally take on screen: exact, thousands, millions, percent.
    forms = {str(value)}
    try:
        v = float(value)
    except (TypeError, ValueError):
        return forms
    if v == int(v):
        forms.add(str(int(v)))
        forms.add(f"{int(v):,}")
    forms.add(f"{v:g}")
    for div, suffix in ((1e3, "k"), (1e6, "m"), (1e9, "b")):
        if abs(v) >= div:
            forms.add(f"{round(v / div)}{suffix}")
            forms.add(f"{v / div:.1f}{suffix}")
    if 0 < abs(v) <= 1:
        forms.add(f"{round(v * 100)}%")
        forms.add(f"{v * 100:.1f}%")
    return {f.lower() for f in forms}


def allowed_tokens(spec, scene):
    # Words and numbers a scene may show: the title plus everything approved in this scene AND every earlier
    # scene, because a running example legitimately keeps earlier values on screen.
    tokens = set(tokenize(spec["title"]))
    for s in spec["scenes"]:
        texts = [s["narration"], s["visual"]]
        texts += [str(x) for x in s.get("on_screen") or []]
        texts += [str(k) for k in (s.get("derived") or {})]   # computed numbers, each declared with its formula
        for text in texts:
            tokens |= set(tokenize(text))
        for key, value in (s.get("data") or {}).items():
            tokens |= set(tokenize(str(key)))
            tokens |= number_forms(value)
        for value in (s.get("derived") or {}):
            tokens |= number_forms(value)
        if s is scene:
            break
    return tokens


def spoken(text, pronounce):
    # Apply the spec's `pronounce` map to the audio text only; subtitles and on-screen text keep the original.
    for word, sound in (pronounce or {}).items():
        text = re.sub(rf"\b{re.escape(word)}\b", sound, text)
    return text


def tokenize(text):
    return re.findall(r"[a-z0-9][a-z0-9.,%]*[a-z0-9%]|[a-z0-9]", text.lower().replace("’", "'"))

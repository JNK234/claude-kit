# ABOUTME: Checks a built explainer video: audio/video sync, on-screen text traceable to the spec, and layout problems.
# ABOUTME: It also writes a contact sheet of frames taken after each sentence, which must be opened and inspected.
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

from spec import allowed_tokens, load, tokenize

SYNC_TOLERANCE = 0.15
STOPWORDS = {"a", "an", "the", "of", "to", "and", "or", "in", "on", "at", "for", "by", "is", "vs", "x"}


def duration(path, stream="format"):
    if stream == "format":
        args = ["-show_entries", "format=duration"]
    else:
        args = ["-select_streams", stream, "-show_entries", "stream=duration"]
    out = subprocess.run(["ffprobe", "-v", "error", *args, "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True).stdout.strip().splitlines()
    return float(out[0]) if out and out[0] not in ("", "N/A") else None


def frame_at(video, t, out_png):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{max(t, 0):.3f}", "-i", str(video),
                    "-frames:v", "1", "-vf", "scale=640:-1", str(out_png)], check=True)


def contact_sheet(spec, timings, final, out_png):
    shots, offset = [], 0.0
    for scene in spec["scenes"]:
        t = timings[scene["id"]]
        for n, s in enumerate(t["sentences"]):
            shots.append((offset + min(s["start"] + s["duration"], t["total"] - 0.4), f"{scene['id']} #{n + 1}"))
        shots.append((offset + t["total"] - 0.4, f"{scene['id']} end"))
        offset += t["total"]
    tiles = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, (t, caption) in enumerate(shots):
            p = Path(tmp) / f"{i:03d}.png"
            frame_at(final, t, p)
            frame = Image.open(p).convert("RGB")
            img = Image.new("RGB", (frame.width, frame.height + 24), (0, 0, 0))
            img.paste(frame, (0, 24))
            ImageDraw.Draw(img).text((6, 5), f"{caption}  @ {t:.1f}s", fill=(255, 220, 90))
            tiles.append(img)
    cols, per_page = 3, 9          # 3x3 pages stay legible when opened for inspection
    w, h = tiles[0].size
    pages = []
    for start in range(0, len(tiles), per_page):
        chunk = tiles[start:start + per_page]
        rows = -(-len(chunk) // cols)
        sheet = Image.new("RGB", (cols * w, rows * h), (40, 40, 40))
        for i, img in enumerate(chunk):
            sheet.paste(img, ((i % cols) * w, (i // cols) * h))
        page = out_png.with_name(f"{out_png.stem}_{start // per_page + 1:02d}.png")
        sheet.save(page)
        pages.append(page)
    return pages


def main():
    spec_path, work_dir = sys.argv[1], Path(sys.argv[2]).resolve()
    spec = load(spec_path)
    timings = json.loads((work_dir / "timings.json").read_text())
    build = json.loads((work_dir / "build.json").read_text())
    failures, warnings = [], []

    built = [s for s in spec["scenes"] if s["id"] in build["scenes"]]
    for scene in built:
        sid = scene["id"]
        clip = build["scenes"].get(sid)
        if not clip:
            failures.append(f"{sid}: no rendered clip")
            continue
        v, a = duration(clip, "v:0"), duration(clip, "a:0")
        expected = timings[sid]["total"]
        if a is None:
            failures.append(f"{sid}: clip has no audio stream")
        elif abs(a - expected) > SYNC_TOLERANCE or abs(v - expected) > SYNC_TOLERANCE:
            failures.append(f"{sid}: video {v:.2f}s / audio {a:.2f}s, narration is {expected:.2f}s")

        log_path = work_dir / "onscreen" / f"{sid}.json"
        if not log_path.exists():
            failures.append(f"{sid}: no on-screen log (scene did not finish or did not subclass NarratedScene)")
            continue
        log = json.loads(log_path.read_text())
        allowed = allowed_tokens(spec, scene)
        for text in log["text"]:
            unknown = [t for t in tokenize(text) if t not in allowed and t not in STOPWORDS]
            if unknown:
                failures.append(f"{sid}: on-screen text '{text}' has words not in the spec: {unknown}")
        for p in log["layout_problems"]:
            failures.append(f"{sid}: {p}")

    final = Path(build["final"])
    total = sum(timings[s["id"]]["total"] for s in built)
    fd = duration(final)
    if fd is None or abs(fd - total) > 0.3 * len(built):
        failures.append(f"final video is {fd}s, narration total is {total:.2f}s")
    if not Path(build["srt"]).exists():
        failures.append("subtitle file is missing")

    for old_page in work_dir.glob("contact_sheet*.png"):
        old_page.unlink()
    pages = contact_sheet({"scenes": built}, timings, final, work_dir / "contact_sheet.png")

    print(f"Final: {final} ({fd:.2f}s)")
    for w in warnings:
        print(f"WARN  {w}")
    for f in failures:
        print(f"FAIL  {f}")
    print(f"Contact sheets ({len(pages)} pages): {pages[0].parent}/contact_sheet_NN.png"
          "  <- open every page and inspect every tile before delivering")
    if failures:
        sys.exit(1)
    print("Automatic checks passed.")


if __name__ == "__main__":
    main()

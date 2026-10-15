# ABOUTME: Renders every spec scene from scenes.py, joins them into one MP4 with subtitles, and can copy it to a folder.
# ABOUTME: Run tts.py first; scene classes must be named <SceneId>Scene and subclass NarratedScene.
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from spec import class_name, load

SCRIPTS = Path(__file__).resolve().parent
QUALITY = {"low": ("-ql", "480p15"), "medium": ("-qm", "720p30"), "high": ("-qh", "1080p60")}


def render_scene(scenes_py, cls, work, quality):
    flag, res = QUALITY[quality]
    # The scenes file's own folder is on the path so a main scenes.py can import per-chapter scene modules.
    env = dict(os.environ, EXPLAINER_WORK=str(work),
               PYTHONPATH=os.pathsep.join([str(SCRIPTS), str(scenes_py.parent), os.environ.get("PYTHONPATH", "")]))
    cmd = [sys.executable, "-m", "manim", "render", flag, "--disable_caching",
           "--media_dir", str(work / "media"), str(scenes_py), cls]
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"Render failed for {cls}:\n{result.stdout[-3000:]}\n{result.stderr[-3000:]}")
    mp4 = work / "media" / "videos" / scenes_py.stem / res / f"{cls}.mp4"
    if not mp4.exists():
        sys.exit(f"Render reported success but {mp4} is missing.")
    return mp4


def concat(clips, out_mp4):
    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]
    n = len(clips)
    streams = "".join(f"[{i}:v][{i}:a]" for i in range(n))
    cmd = ["ffmpeg", "-loglevel", "error", "-y", *inputs, "-filter_complex",
           f"{streams}concat=n={n}:v=1:a=1[v][a]", "-map", "[v]", "-map", "[a]",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-c:a", "aac", "-b:a", "160k", str(out_mp4)]
    subprocess.run(cmd, check=True)


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(spec, timings, out_srt):
    lines, offset, n = [], 0.0, 1
    for scene in spec["scenes"]:
        t = timings[scene["id"]]
        for s in t["sentences"]:
            lines += [str(n), f"{srt_time(offset + s['start'])} --> {srt_time(offset + s['start'] + s['duration'])}",
                      s["text"], ""]
            n += 1
        offset += t["total"]
    out_srt.write_text("\n".join(lines))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("scenes_py")
    ap.add_argument("work_dir")
    ap.add_argument("--quality", choices=QUALITY, default="low")
    ap.add_argument("--only", help="render a single scene id (for iteration)")
    ap.add_argument("--chapter", help="render only scenes whose `chapter` matches, into <slug>-<chapter>.mp4")
    ap.add_argument("--deliver", help="folder to copy the final MP4 and SRT into")
    a = ap.parse_args()

    spec = load(a.spec)
    work = Path(a.work_dir).resolve()
    timings_path = work / "timings.json"
    if not timings_path.exists():
        sys.exit("timings.json is missing. Run tts.py first.")
    timings = json.loads(timings_path.read_text())
    scenes_py = Path(a.scenes_py).resolve()

    scenes = [s for s in spec["scenes"] if (not a.only or s["id"] == a.only)
              and (not a.chapter or str(s.get("chapter", "")) == a.chapter)]
    if not scenes:
        sys.exit("No scenes match --only/--chapter.")
    clips = []
    for scene in scenes:
        cls = class_name(scene["id"])
        print(f"Rendering {cls} ({a.quality}) ...", flush=True)
        clips.append(render_scene(scenes_py, cls, work, a.quality))
    if a.only:
        print(f"Rendered {clips[0]}")
        return

    stem = spec["slug"] + (f"-{a.chapter}" if a.chapter else "")
    final = work / f"{stem}.mp4"
    concat(clips, final)
    srt = work / f"{stem}.srt"
    write_srt({"scenes": scenes}, timings, srt)
    (work / "build.json").write_text(json.dumps(
        {"final": str(final), "srt": str(srt), "quality": a.quality,
         "scenes": {s["id"]: str(c) for s, c in zip(scenes, clips)}}, indent=2))
    print(f"Final video: {final}\nSubtitles:   {srt}")
    if a.deliver:
        dest = Path(a.deliver).expanduser()
        dest.mkdir(parents=True, exist_ok=True)
        shutil.copy2(final, dest / final.name)
        shutil.copy2(srt, dest / srt.name)
        print(f"Copied to {dest}")


if __name__ == "__main__":
    main()

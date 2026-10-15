# ABOUTME: Base Manim scene that plays a scene's narration and lets animations be timed to its sentences.
# ABOUTME: It also logs every on-screen string and flags text that overlaps or leaves the frame, for verify.py.
import json
import os
from pathlib import Path

from manim import (BLUE_C, GREEN_C, GREY_B, RED_C, TEAL_C, WHITE, YELLOW_C, Scene, Text,
                   config)

BACKGROUND = "#0f0f12"
PALETTE = {
    "primary": BLUE_C,
    "accent": YELLOW_C,
    "good": GREEN_C,
    "bad": RED_C,
    "alt": TEAL_C,
    "muted": GREY_B,
    "text": WHITE,
}
FONT_SIZE = {"title": 44, "body": 34, "small": 26}
SAFE_MARGIN = 0.35     # scene units; text closer to the frame edge than this can be cut off by players and subtitles


class NarratedScene(Scene):
    """Subclass, set `scene_id` to the spec scene id, and put the animation in `narrate()`."""

    scene_id = None

    def setup(self):
        work = Path(os.environ["EXPLAINER_WORK"])
        self.work = work
        timings = json.loads((work / "timings.json").read_text())
        if self.scene_id not in timings:
            raise KeyError(f"scene_id '{self.scene_id}' is not in timings.json")
        self.timing = timings[self.scene_id]
        self.sentences = self.timing["sentences"]
        self.onscreen = []
        self.onscreen_equations = []
        self.allowed_equations = set(self.timing.get("equations", []))
        self.problems = []
        self.camera.background_color = BACKGROUND

    def construct(self):
        self.add_sound(self.timing["audio"])
        self.narrate()
        self._check_layout("end")
        self.wait_until(self.timing["total"])
        self._write_log()

    def narrate(self):
        raise NotImplementedError

    # ---- timing ----
    def now(self):
        return self.renderer.time

    def wait_until(self, t):
        dt = t - self.now()
        if dt > 1e-3:
            self.wait(dt)

    def at(self, i, offset=0.0):
        """Wait until sentence i (0-based) starts, then check the layout of what is on screen."""
        self._check_layout(f"before sentence {i}")
        self.wait_until(self.sentences[i]["start"] + offset)

    def end_of(self, i):
        s = self.sentences[i]
        return s["start"] + s["duration"]

    def fit(self, run_time, until=None):
        """Shorten run_time so an animation ends before `until` (default: the end of the scene audio)."""
        limit = (self.timing["total"] if until is None else until) - self.now()
        return max(0.2, min(run_time, limit))

    # ---- text that is logged for the content check ----
    def label(self, text, size="body", color=None, **kwargs):
        mob = Text(str(text), font_size=FONT_SIZE.get(size, size), color=color or PALETTE["text"], **kwargs)
        mob._explainer_label = True
        self.onscreen.append(str(text))
        return mob

    # ---- layout checks ----
    def _labels_on_screen(self):
        found = []
        for top in self.mobjects:
            for m in top.get_family():
                if getattr(m, "_explainer_label", False) and m.get_fill_opacity() > 0.05:
                    found.append(m)
        return found

    def _check_layout(self, when):
        w, h = config.frame_width / 2, config.frame_height / 2
        labels = self._labels_on_screen()
        for m in labels:
            if (m.get_left()[0] < -w or m.get_right()[0] > w or m.get_bottom()[1] < -h or m.get_top()[1] > h):
                self.problems.append(f"{when}: '{m.text}' is outside the frame")
            elif (m.get_left()[0] < -w + SAFE_MARGIN or m.get_right()[0] > w - SAFE_MARGIN
                  or m.get_bottom()[1] < -h + SAFE_MARGIN or m.get_top()[1] > h - SAFE_MARGIN):
                self.problems.append(f"{when}: '{m.text}' is inside the {SAFE_MARGIN} unit edge margin")
        for i, a in enumerate(labels):
            for b in labels[i + 1:]:
                if _boxes_overlap(a, b):
                    self.problems.append(f"{when}: '{a.text}' overlaps '{b.text}'")

    def _write_log(self):
        log_dir = self.work / "onscreen"
        log_dir.mkdir(exist_ok=True)
        (log_dir / f"{self.scene_id}.json").write_text(json.dumps(
            {"text": self.onscreen, "equations": self.onscreen_equations,
             "layout_problems": sorted(set(self.problems))}, indent=2))


def _boxes_overlap(a, b, pad=0.02):
    return not (a.get_right()[0] + pad < b.get_left()[0] or b.get_right()[0] + pad < a.get_left()[0]
                or a.get_top()[1] + pad < b.get_bottom()[1] or b.get_top()[1] + pad < a.get_bottom()[1])

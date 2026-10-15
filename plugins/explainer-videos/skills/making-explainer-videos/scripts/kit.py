# ABOUTME: Reusable, topic-free visual building blocks for NarratedScene: equations, flows, number lines, tables, timelines, plots.
# ABOUTME: Every block creates its text through the scene's logged helpers, so verify.py can trace all on-screen text to the spec.
import hashlib
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from manim import (DOWN, LEFT, RIGHT, UP, Arrow, Axes, Brace, DashedLine, Dot, Line,  # noqa: E402
                   NumberLine, Rectangle, RoundedRectangle, SVGMobject, VGroup)

from narrated import PALETTE  # noqa: E402

plt.rcParams["svg.fonttype"] = "path"     # glyphs become paths, so Manim can import them without LaTeX
plt.rcParams["mathtext.fontset"] = "cm"   # Computer Modern, the classic math look


def equation(scene, tex, height=0.8, color=None):
    """Render math written in matplotlib mathtext (a LaTeX subset, e.g. r"A_i = \\frac{r_i - \\mu}{\\sigma}").
    The exact tex string must be listed under the scene's `equations` in the spec."""
    if tex not in scene.allowed_equations:
        scene.problems.append(f"equation not listed in spec 'equations': {tex}")
    scene.onscreen_equations.append(tex)
    out_dir = scene.work / "equations"
    out_dir.mkdir(exist_ok=True)
    svg = out_dir / (hashlib.sha1(tex.encode()).hexdigest()[:12] + ".svg")
    if not svg.exists():
        fig = plt.figure(figsize=(0.01, 0.01))
        fig.text(0, 0, f"${tex}$", fontsize=48, color="white")
        fig.savefig(svg, transparent=True, bbox_inches="tight", pad_inches=0.02)
        plt.close(fig)
    mob = SVGMobject(str(svg))
    mob.set_color(color or PALETTE["text"]).scale_to_fit_height(height)
    return mob


def equation_row(scene, parts, height=0.8, buff=0.12, colors=None):
    """An equation assembled from separate mathtext parts, e.g. ["A_i", "=", r"\\frac{r_i - \\mu}{\\sigma}"],
    so each part can be pointed at, colored, or transformed alone. Every part must be in the scene's `equations`."""
    from manim import VGroup as _VGroup
    mobs = [equation(scene, p, height=height, color=(colors or {}).get(p)) for p in parts]
    return _VGroup(*mobs).arrange(RIGHT, buff=buff)


def flow(scene, steps, direction=RIGHT, box_width=2.6, box_height=1.0, gap=0.9, color=None):
    """Boxes joined by arrows. Returns (group, boxes, arrows); reveal box i with arrow i-1 as narration reaches it."""
    color = color or PALETTE["primary"]
    boxes = VGroup()
    for text in steps:
        box = RoundedRectangle(corner_radius=0.15, width=box_width, height=box_height, color=color)
        label = scene.label(text, size="small")
        if label.width > box_width - 0.3:
            label.scale_to_fit_width(box_width - 0.3)
        boxes.add(VGroup(box, label.move_to(box)))
    boxes.arrange(direction, buff=gap)
    arrows = VGroup(*[Arrow(a.get_edge_center(direction), b.get_edge_center(-direction), buff=0.08,
                            color=PALETTE["muted"], stroke_width=4) for a, b in zip(boxes, boxes[1:])])
    return VGroup(boxes, arrows), boxes, arrows


def number_line_points(scene, values, x_range, labels=None, length=10, color=None):
    """Values as dots above a number line, e.g. rewards in one group. Returns (group, line, dots, value_labels)."""
    line = NumberLine(x_range=x_range, length=length, include_numbers=False, color=PALETTE["muted"])
    dots, tags, seen = VGroup(), VGroup(), {}
    for i, v in enumerate(values):
        level = seen.get(v, 0)              # equal values stack upward so each one stays visible
        seen[v] = level + 1
        d = Dot(line.n2p(v) + UP * (0.35 + 0.3 * level), radius=0.12, color=color or PALETTE["primary"])
        dots.add(d)
        if labels:
            tags.add(scene.label(labels[i], size="small").next_to(d, UP, buff=0.15))
    ends = VGroup(scene.label(_fmt(x_range[0]), size="small").next_to(line.n2p(x_range[0]), DOWN),
                  scene.label(_fmt(x_range[1]), size="small").next_to(line.n2p(x_range[1]), DOWN))
    return VGroup(line, ends, dots, tags), line, dots, tags


def marker(scene, line, value, text, color=None, height=1.4):
    """A dashed vertical marker on a number line at `value` with a label (for a mean, threshold, or target)."""
    p = line.n2p(value)
    mark = DashedLine(p + DOWN * 0.2, p + UP * height, color=color or PALETTE["accent"])
    return VGroup(mark, scene.label(text, size="small", color=color or PALETTE["accent"]).next_to(mark, UP, buff=0.1))


def span(scene, mob, text, direction=DOWN, color=None):
    """A brace under/over `mob` with a label: use only for a quantity that equals exactly what the brace covers."""
    brace = Brace(mob, direction, color=color or PALETTE["accent"])
    return VGroup(brace, scene.label(text, size="small", color=color or PALETTE["accent"]).next_to(brace, direction, buff=0.1))


def table(scene, rows, col_width=2.2, row_height=0.7, header=True):
    """A grid of logged text cells for step-by-step state. rows: list of lists of strings.
    Returns (group, cells) where cells[r][c] is a VGroup(rect, text) you can Transform when state changes."""
    cells, group = [], VGroup()
    for r, row in enumerate(rows):
        line = []
        for c, text in enumerate(row):
            rect = Rectangle(width=col_width, height=row_height, color=PALETTE["muted"], stroke_width=2)
            rect.move_to([c * col_width, -r * row_height, 0])
            color = PALETTE["accent"] if header and r == 0 else PALETTE["text"]
            t = scene.label(text, size="small", color=color)
            if t.width > col_width - 0.2:
                t.scale_to_fit_width(col_width - 0.2)
            cell = VGroup(rect, t.move_to(rect))
            line.append(cell)
            group.add(cell)
        cells.append(line)
    return group.move_to([0, 0, 0]), cells


def timeline(scene, events, length=11):
    """Labeled ticks along a horizontal line, left to right in the given order. events: list of strings."""
    line = Line(LEFT * length / 2, RIGHT * length / 2, color=PALETTE["muted"])
    ticks = VGroup()
    for i, text in enumerate(events):
        x = -length / 2 + length * (i + 0.5) / len(events)
        tick = Line([x, -0.15, 0], [x, 0.15, 0], color=PALETTE["accent"])
        lab = scene.label(text, size="small").next_to(tick, UP if i % 2 == 0 else DOWN, buff=0.2)
        ticks.add(VGroup(tick, lab))
    return VGroup(line, ticks), line, ticks


def plot(scene, func, x_range, y_range, x_label, y_label, color=None, length=(9, 4.5)):
    """Axes without LaTeX tick numbers, a curve, and logged axis labels. Returns (group, axes, curve)."""
    axes = Axes(x_range=x_range, y_range=y_range, x_length=length[0], y_length=length[1],
                axis_config={"include_numbers": False, "color": PALETTE["muted"]}, tips=False)
    curve = axes.plot(func, color=color or PALETTE["primary"])
    xl = scene.label(x_label, size="small").next_to(axes.x_axis, DOWN, buff=0.2)
    yl = scene.label(y_label, size="small").rotate(1.5708).next_to(axes.y_axis, LEFT, buff=0.2)
    return VGroup(axes, curve, xl, yl), axes, curve


def _fmt(v):
    return str(int(v)) if float(v) == int(v) else f"{v:g}"

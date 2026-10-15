# ABOUTME: Reference scenes for examples/video.yaml, showing the NarratedScene timing and labeling pattern.
# ABOUTME: Copy this layout for new videos: one class per spec scene, animations placed with self.at(i).
from manim import (DOWN, LEFT, RIGHT, UP, Create, DashedLine, FadeIn, GrowFromEdge, Line,
                   Rectangle, RoundedRectangle, VGroup, Write, Circle, Indicate, SurroundingRectangle)

from narrated import PALETTE, NarratedScene


class TieScene(NarratedScene):
    scene_id = "tie"

    def narrate(self):
        names = ["Agent A", "Agent B", "Agent C"]
        colors = [PALETTE["primary"], PALETTE["alt"], PALETTE["accent"]]
        rows = VGroup()
        for i, (name, color) in enumerate(zip(names, colors)):
            y = 2 - i * 1.6
            label = self.label(name, color=color).move_to([-5, y, 0])
            dot = Circle(radius=0.3, color=color, fill_opacity=1).move_to([-3.4, y, 0])
            flag = Line([3, y - 0.4, 0], [3, y + 0.5, 0], color=PALETTE["bad"])
            rows.add(VGroup(label, dot, flag))
        self.at(0)
        self.play(FadeIn(rows, lag_ratio=0.2), run_time=self.fit(1.2))
        self.at(1)
        self.play(*[r[1].animate.move_to([2.6, r[1].get_y(), 0]) for r in rows], run_time=self.fit(2.0))
        checks = VGroup(*[self.label("pass", color=PALETTE["good"]).next_to(r[2], RIGHT, buff=0.4) for r in rows])
        self.play(FadeIn(checks, lag_ratio=0.3), run_time=self.fit(1.0))
        self.at(2)
        score = self.label("Score: 3 / 3 pass", size="title").to_edge(DOWN, buff=0.6)
        self.play(Write(score), run_time=self.fit(1.5))
        self.play(Indicate(score, color=PALETTE["accent"]), run_time=self.fit(1.0))


class FramesScene(NarratedScene):
    scene_id = "frames"

    def narrate(self):
        data = [("Agent A", 160021, PALETTE["primary"]), ("Agent B", 283474, PALETTE["alt"]),
                ("Agent C", 477140, PALETTE["accent"])]
        x0, scale = -3.5, 8.0 / 500000          # 500k frames spans 8 scene units
        axis = Line([x0, -2.6, 0], [x0 + 8, -2.6, 0], color=PALETTE["muted"])
        self.at(0)
        self.play(Create(axis), run_time=self.fit(0.8))
        bars = []
        for i, (name, value, color) in enumerate(data):
            y = 1.6 - i * 1.4
            name_mob = self.label(name, color=color).next_to([x0, y, 0], LEFT, buff=0.3)
            bar = Rectangle(width=value * scale, height=0.8, color=color, fill_opacity=0.85, stroke_width=0)
            bar.move_to([x0 + value * scale / 2, y, 0])
            num = self.label(f"{round(value / 1000)}k", color=color).next_to(bar, RIGHT, buff=0.25)
            self.at(i + 1)
            self.play(FadeIn(name_mob), GrowFromEdge(bar, LEFT), run_time=self.fit(1.2))
            self.play(FadeIn(num), run_time=self.fit(0.4))
            bars.append(bar)
        self.at(4)
        hx = x0 + 40435 * scale
        human = DashedLine([hx, 2.4, 0], [hx, -2.6, 0], color=PALETTE["text"])
        human_label = self.label("Human 40k", size="small").next_to(human, DOWN, buff=0.2)
        self.play(Create(human), FadeIn(human_label), run_time=self.fit(1.2))
        self.at(5)
        self.play(Create(SurroundingRectangle(VGroup(human, bars[0]), color=PALETTE["accent"], buff=0.15)),
                  run_time=self.fit(1.2))

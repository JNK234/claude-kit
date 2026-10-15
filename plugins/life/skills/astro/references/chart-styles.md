# Chart Styles — North Indian vs South Indian

The user picked "let user pick" — so before drawing any chart, ask them which style they prefer. Here's how each is structured.

## North Indian (Diamond) Style

The North Indian chart is a square divided diagonally into 12 sections by an inner diamond and crossing lines. **The houses (bhavas) are FIXED in position; the signs (rashis) move depending on the Lagna.**

### Layout
```
       1     12     11
      / \    / \    / \
     /   \  /   \  /   \
    /     \/     \/     \
   /  10   ----   2  ----   
   \      /\      /\      /
    \    /  \    /  \    /
     \  /    \  /    \  /
      \/  9   \/  3   \/
      /\      /\      /\
     /  \    /  \    /  \
    /    \  /    \  /    \
   /  8   \/  4   \/  ---
   \      /\      /\      /
    \    /  \    /  \    /
     \  /    \  /    \  /
      \/  7   \/  5   \/
       \     / \     /
        \   /   \   /
         \ /  6  \ /
          V       V
```

Simplified: imagine a square with diagonals drawn corner-to-corner AND vertical/horizontal lines through the center. This creates 12 triangular and diamond regions.

### House positions (fixed)

```
    [12] [ 1] [ 2]
    [11]      [ 3]
    [10]      [ 4]
    [ 9] [ 8] [ 5]
            [ 7] [ 6]    -- approximation; standard layout has:
```

Cleaner mental model — it's an outer square and an inner diamond:

- **Top row:** 12 (top-left), 1 (top-center, the upward triangle of the inner diamond), 2 (top-right)
- **Right side:** 3 (right of inner diamond), 4 (right-center, downward triangle of inner diamond opening right), 5 (right-lower)
- **Bottom:** 6 (bottom-right), 7 (bottom-center, downward triangle), 8 (bottom-left)
- **Left:** 9 (left-lower), 10 (left-center, leftward triangle), 11 (left-upper)

The Lagna (1st house) is always at the **top-center**. The sign-number of the Lagna is written inside that house. Other signs follow in zodiacal order moving counter-clockwise (1 → 2 → 3 ... 12 → back to 1).

### Drawing instructions for SVG

For a 400×400 viewBox:
1. Draw outer square (0,0) to (400,400).
2. Draw two diagonals: (0,0)→(400,400) and (400,0)→(0,400).
3. Draw inner diamond connecting midpoints: (200,0), (400,200), (200,400), (0,200).
4. The 12 regions are now defined. Label houses 1–12 and place rashi number (1=Mesha through 12=Meena) according to the Lagna.
5. Place planet abbreviations inside the appropriate house: Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke (Surya, Chandra, Mangal, Budha, Guru, Shukra, Shani, Rahu, Ketu).

## South Indian (Square) Style

The South Indian chart is a 4×4 grid with the center 2×2 hollow. **The signs (rashis) are FIXED in position; the Lagna and houses move depending on placement.**

### Layout — fixed sign positions

```
+--------+--------+--------+--------+
| Meena  | Mesha  | Vrish. | Mithun |
| (12)   | (1)    | (2)    | (3)    |
+--------+--------+--------+--------+
| Kumbha |                 | Karka  |
| (11)   |    (Empty       | (4)    |
+--------+    Center)      +--------+
| Makara |                 | Simha  |
| (10)   |                 | (5)    |
+--------+--------+--------+--------+
| Dhanu  | Vrishk.| Tula   | Kanya  |
| (9)    | (8)    | (7)    | (6)    |
+--------+--------+--------+--------+
```

Reading order: Mesha (top-left of top row, 2nd cell), then clockwise — Vrishabha, Mithuna, Karka (down the right side), Simha, Kanya, Tula, Vrishchika (across the bottom right-to-left), Dhanu, Makara, Kumbha (up the left side), Meena (top-left corner) — back to Mesha.

### To use:
1. Mark the Lagna sign with "Asc" or "L" symbol — the rest of the houses follow from there.
2. Place planets in their respective sign cells.

### Drawing instructions for SVG

For a 400×400 viewBox:
1. Draw 4×4 grid (each cell 100×100).
2. Hollow out the center 2×2 (cells at positions (1,1), (2,1), (1,2), (2,2) where indexing is 0-based).
3. Label each outer cell with its rashi name (per the layout above).
4. Mark the Lagna cell with "Lg" or with a darker border / "Asc" label.
5. Place planet abbreviations inside the appropriate cell.
6. The center hollow can hold the user's name, DOB, and birth time.

## Planet abbreviations (use these consistently)

| Planet | Sanskrit | Abbreviation |
|---|---|---|
| Sun | Surya / Ravi | Su or Ra* |
| Moon | Chandra | Mo or Ch |
| Mars | Mangal / Kuja | Ma |
| Mercury | Budha | Me or Bu |
| Jupiter | Guru / Brihaspati | Ju or Gu |
| Venus | Shukra | Ve or Sh* |
| Saturn | Shani | Sa or Sh* |
| Rahu | Rahu | Ra* |
| Ketu | Ketu | Ke |

*To avoid Sun-Rahu / Venus-Saturn ambiguity, prefer: **Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke** (Western abbreviations) when in doubt.

If the planet is **retrograde (vakri)**, append `(R)` or `°` after the abbreviation. **Combust (asta)** planets append `(C)` or are sometimes shown faded.

## Rashi (sign) abbreviations

| # | English | Sanskrit | Symbol |
|---|---|---|---|
| 1 | Aries | Mesha | ♈ |
| 2 | Taurus | Vrishabha | ♉ |
| 3 | Gemini | Mithuna | ♊ |
| 4 | Cancer | Karka | ♋ |
| 5 | Leo | Simha | ♌ |
| 6 | Virgo | Kanya | ♍ |
| 7 | Libra | Tula | ♎ |
| 8 | Scorpio | Vrishchika | ♏ |
| 9 | Sagittarius | Dhanu | ♐ |
| 10 | Capricorn | Makara | ♑ |
| 11 | Aquarius | Kumbha | ♒ |
| 12 | Pisces | Meena | ♓ |

In a chart, you can show either the rashi number (1–12) or the symbol — match what the user requests.

## Rendering with the Visualizer tool

When the user wants a chart visual, use the Visualizer tool to generate inline SVG. Suggested approach:

1. Ask the user: "North Indian (diamond) or South Indian (square) style?"
2. Build the SVG following the layout above.
3. Use `var(--text-color)` and other CSS variables from the diagram module so the chart respects the user's theme.
4. Place the user's name and DOB in a corner or center-empty area.
5. Include a small legend below if planet abbreviations are non-obvious.

## Navamsa (D9) chart

The Navamsa is a divisional chart used for marriage, dharma, and the inner strength of planets. It uses the same layout style as the user picked for D1. Each rashi is divided into 9 equal parts of 3°20' each — the exact navamsa lord can be calculated from the planet's longitude, but for our purposes if the user provides their navamsa positions, we plot them in the same format as the rashi chart.

## Other divisional charts (mention if user is curious)

- **D1 (Rashi)** — main chart, gross body and life
- **D9 (Navamsa)** — marriage, dharma, strength of planets
- **D10 (Dasamsa)** — career, profession
- **D7 (Saptamsa)** — children
- **D12 (Dwadasamsa)** — parents, ancestry
- **D60 (Shashtiamsa)** — past karma, the most refined chart

For most readings, D1 + D9 is sufficient. Other vargas are used for specific questions.

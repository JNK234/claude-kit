---
name: astro
description: Provides Indian (Vedic) astrology and numerology guidance grounded in ancestral Jyotish tradition — generates full birth charts (Janma Kundali / Rashi / Navamsa) with NASA-grade precision via the swisseph-wasm npm package (Swiss Ephemeris in WebAssembly), produces both North Indian (diamond) and South Indian (square) chart SVGs, calculates daily Panchang, runs the Vimshottari Dasha 120-year period system to identify the user's current Mahadasha, and computes Indian numerology (Mulank and Bhagyank). Use this skill whenever the user types "/astro", or asks about kundali, janma kundali, rashi chart, navamsa, jyotish, panchang, tithi, nakshatra, yoga, karana, dasha, mahadasha, antardasha, mulank, bhagyank, numerology with Indian context, gemstone or rudraksha advice, mangal dosha, kalasarpa yoga, sade sati, muhurat, or any question framed in terms of Vedic / Indian / Hindu astrology.
---

# Astro — Indian Astrology & Numerology

A skill for providing readings grounded in Jyotish (Vedic astrology) and Indian numerology, in the spirit of how a traditional Indian astrologer would consult.

## What this skill covers

1. **Janma Kundali (birth chart)** — Rashi chart (D1) and Navamsa (D9), in either North Indian (diamond) or South Indian (square) style.
2. **Panchang** — the five limbs of a Vedic day: Tithi, Nakshatra, Yoga, Karana, Vara — plus Paksha, masa, samvat, and key muhurta windows.
3. **Vimshottari Dasha** — the 120-year planetary period system (Mahadasha → Antardasha) used for timing predictions.
4. **Numerology** — Mulank (root number from day of birth), Bhagyank (destiny number from full DOB), and name-number using Chaldean letter values.

## When the skill activates

Trigger on any of:
- The literal command `/astro`
- Questions naming Indian astrology concepts (kundali, jyotish, rashi, nakshatra, dasha, panchang, tithi, mangal dosha, sade sati, etc.)
- Numerology questions framed in Indian terms (mulank, bhagyank, lucky number)
- General "read my chart" or "tell me my future" requests where the user mentions an Indian birth location, an Indian-system context, or has previously indicated preference for Vedic astrology

If a user just asks for a Western "sun sign horoscope" with no Indian framing, this skill is not needed.

## The first thing to do — collect birth data

Before any reading, ask the user for the following in a single, clearly-formatted prompt. Do not proceed without all four for chart work:

1. **Date of birth** (DD/MM/YYYY)
2. **Exact time of birth** (HH:MM, ideally to the minute — explain that the Lagna/Ascendant changes roughly every 2 hours, so even 10 minutes matters)
3. **Place of birth** (city, state, country — needed for latitude, longitude, and timezone)
4. **System preference** — ask the user to pick one:
   - Vedic (Sidereal, Lahiri ayanamsa) — the default, most widely used
   - Vedic + Nadi astrology — for deep predictive readings using Nadi amshas
   - KP (Krishnamurti Paddhati) — sub-lord based system
   - "Not sure / pick the best" — default to Vedic Lahiri

Also ask what they want focused on: **career, marriage, health, finance, education, spiritual path, or general overview**. This narrows the houses (bhavas) and significators you'll emphasize.

For Panchang-only or numerology-only queries, you only need DOB (and place for Panchang location). For numerology, ask for full name as written on official documents if they want a Namank (name number).

## Computing charts — the npm package approach

This skill bundles two scripts in `scripts/` that compute and render full Vedic charts using **`swisseph-wasm`** — a WebAssembly port of the Swiss Ephemeris (the same astronomical engine used by AstroSage, drikpanchang, and most professional Jyotish software). NASA-grade precision, no native compilation needed.

### One-time setup (Claude does this automatically when first asked)

The `scripts/` folder includes a `package.json` declaring `swisseph-wasm` as a dependency. The first time the skill needs to compute a chart, Claude runs `npm install` from inside the scripts folder:

```bash
cd <skill-path>/scripts && npm install
```

The package is small (~3 MB WASM binary) and installs in seconds with no native compilation. After that, all subsequent calls reuse it. `npm install` is idempotent — running it again is a fast no-op if everything's already there.

If `<skill-path>` is not known, Claude can find the skill folder by looking at where this SKILL.md is located. Common locations:
- Claude.ai uploaded skills: usually mounted under `/mnt/skills/user/astro/scripts`
- Manual install: `~/.claude/skills/astro/scripts` or wherever the skill was placed.

If the skill folder is read-only, copy `scripts/` to a writable location first (e.g., `/tmp/astro-scripts/`), run `npm install` there, and run the scripts from that location.

### The two scripts

**`scripts/generate-chart.mjs`** — takes birth data as JSON, outputs full chart JSON with planets, houses, lagna, nakshatras, padas, and the Vimshottari dasha sequence with current period identified.

```bash
node /path/to/skill/scripts/generate-chart.mjs '{"year":1990,"month":8,"day":15,"hour":3,"minute":42,"timezone":5.5,"latitude":18.5204,"longitude":73.8567,"ayanamsa":"lahiri"}' > chart.json
```

Input fields:
- `year, month, day` — birth date (Gregorian)
- `hour, minute` — local birth time (24-hour)
- `timezone` — hours offset from UTC (e.g., India = 5.5, UK = 0 or 1, US East = -5 or -4)
- `latitude, longitude` — decimal degrees, North/East positive
- `ayanamsa` — `lahiri` (default), `raman`, `krishnamurti`, or `fagan-bradley`

Output JSON contains:
- `lagna` — ascendant longitude, rashi, nakshatra, pada
- `houses` — array of 12 houses with their rashis (whole-sign system)
- `planets` — Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu (Mean Node), Ketu — with sidereal longitude, formatted DMS, rashi, house, nakshatra, nakshatra lord, pada, retrograde flag
- `dasha` — starting nakshatra lord, balance years at birth, full 120-year Mahadasha sequence with start/end dates, and the **current** Mahadasha for today's date

**`scripts/render-chart.mjs`** — takes the chart JSON and outputs an SVG (North or South Indian style):

```bash
node /path/to/skill/scripts/render-chart.mjs chart.json south > chart.svg
node /path/to/skill/scripts/render-chart.mjs chart.json north > chart.svg
```

### How to use this in a reading

1. **Ask the user for birth data** (DOB, time, place, system preference, focus area).
2. **Resolve the birth place to lat/lon and timezone.** If you have web tools, look it up. Otherwise, ask the user, or use well-known approximations for major cities (Mumbai 19.07°N 72.88°E IST 5.5; Delhi 28.61°N 77.21°E; etc.).
3. **Install the package** if not already installed (one-time, see above).
4. **Run `generate-chart.mjs`** with the birth data as a JSON argument.
5. **Read the JSON output** — that's the actual chart, computed to professional precision.
6. **Ask the user which chart style** (North Indian or South Indian) they prefer.
7. **Run `render-chart.mjs`** to produce the SVG.
8. **Display the SVG using the Visualizer tool** (use `show_widget` with the SVG content — the chart uses CSS variables so it adapts to the theme).
9. **Interpret the chart** following the structure later in this document.

### Example end-to-end workflow

User: "Read my kundali. DOB: 15 Aug 1990, time: 3:42 AM, place: Pune, India."

Claude:
1. Pune coordinates: 18.5204°N, 73.8567°E, IST = +5.5.
2. Run generate-chart.mjs with that input. Get JSON.
3. From the JSON: Lagna = Mithuna, Moon = Rohini nakshatra, current Mahadasha = Jupiter (since Dec 2021, ends Dec 2037).
4. Ask: "North Indian or South Indian style chart?"
5. After user picks, run render-chart.mjs and show the SVG via show_widget.
6. Read the chart following the framework: salutation → Lagna and lord → Moon and Janma Nakshatra → key yogas → current Mahadasha → houses for the user's focus area → upayas → closing.

### When the package isn't available

If `npm install` fails (no internet, sandboxed environment, etc.), fall back to:
- **Numerology-only** queries — pure arithmetic, works fully without any package.
- **Panchang interpretation** — if the user provides today's tithi/nakshatra/etc., or via the Chrome browser tool reading drikpanchang.com.
- **Chart interpretation when the user pastes their existing chart** — read what they give you.
- **Tell the user honestly** — "I can't compute charts in this environment. Could you share your chart from any free Vedic site (drikpanchang.com, prokerala.com, astrosage.com), or enable my code-execution capability?"

## How to deliver a reading — the tone and structure

A traditional Jyotishi reading is grounded, specific, and ethically careful. Avoid these failure modes:

- **Vague newspaper-horoscope language** ("you are sensitive but strong") — always tie statements to a specific yoga, planet placement, or dasha.
- **Fatalism** — Vedic tradition holds that karma is workable. Frame difficult periods as opportunities for sadhana (spiritual practice), upaya (remedy), or careful timing, not as doom.
- **Medical or legal pronouncements** — never tell someone they will get a specific disease, die at a specific age, or that a marriage will definitely fail. Speak in tendencies and recommended caution.
- **Empty mysticism** — quote the actual classical reasoning when you can ("Mars in the 7th from Lagna, Moon, or Venus is the standard definition of Mangal Dosha per Mansagari and Brihat Parashara Hora Shastra").

### Recommended structure for a full chart reading

1. **Salutation & summary line** — a one-sentence overall character of the chart (e.g., "This is a chart with a strong Lagna lord in a kendra, a Moon in its own sign giving emotional steadiness, but a debilitated Saturn that asks for patience in career matters.")
2. **Lagna and Lagna lord** — the rising sign and where its lord sits.
3. **Chandra Rashi (Moon sign)** and **Janma Nakshatra (birth star)** — these are the most important in Vedic astrology, more than the Sun sign.
4. **Key yogas present** — Raj Yogas, Dhana Yogas, Mahapurusha Yogas, or doshas like Mangal/Kalasarpa/Sade Sati if relevant.
5. **Currently running Mahadasha and Antardasha** — what theme this period is bringing.
6. **Houses relevant to the user's question** (e.g., 7th and 7th lord for marriage; 10th, 10th lord, and Saturn for career).
7. **Upayas / remedies** — gemstone, mantra, or charity suggestion grounded in the chart, not generic advice. Always frame as "traditional recommendation," not as a guaranteed cure.
8. **Closing** — a respectful note that astrology indicates tendencies, and the person's own karma and effort shape outcomes.

For chart visuals, generate the chart as an SVG using the Visualizer tool (the user picked "let user pick" for North vs South style, so ASK before drawing, then render their choice). See `references/chart-styles.md` for the exact layout conventions.

## Numerology — the calculation walkthrough

When the user wants numerology, do these calculations explicitly so they can see the math:

**Mulank (Moolank, root number)** — reduce the day of birth (1–31) to a single digit.
- DOB day 27 → 2+7 = 9 → Mulank = 9
- DOB day 14 → 1+4 = 5 → Mulank = 5

**Bhagyank (destiny / life-path number)** — sum the entire date of birth, reduce to single digit.
- DOB 27/04/1992 → 2+7+0+4+1+9+9+2 = 34 → 3+4 = 7 → Bhagyank = 7

**Namank (name number, Chaldean system)** — used in Indian numerology (not Pythagorean, which is the Western system). The Chaldean letter values are in `references/numerology.md`. Sum the values of all letters of the full name, reduce to single digit. In Chaldean numerology the number 9 is sacred and is omitted from letter assignments (no letter has value 9), though final totals can equal 9.

Then interpret the Mulank, Bhagyank, and (if name given) Namank — including their compatibility. The detailed meanings of each number 1–9 are in `references/numerology.md`.

## Panchang — the five limbs

A Vedic day has five components (the panch-anga). When asked about a day's auspiciousness, walk through:

1. **Tithi** — lunar day (1–30, in two pakshas of 15 each). Some tithis are good for some activities, bad for others.
2. **Nakshatra** — which of 27 lunar mansions the Moon is in.
3. **Yoga** — one of 27 Sun-Moon angle yogas.
4. **Karana** — half of a tithi, one of 11.
5. **Vara** — weekday, ruled by one of 7 planets.

Plus useful supplementary fields: **Rahu Kala** (inauspicious window), **Abhijit Muhurat** (universally auspicious noon-window), **Choghadiya** (8-fold day division), **Paksha** (Shukla = waxing, Krishna = waning), **Masa** (lunar month), and the year in **Vikram Samvat** and **Shaka Samvat**.

Detailed lists (all 30 tithis, 27 nakshatras with ruling deities and planets, 27 yogas, 11 karanas, weekday rulers, masas) are in `references/panchang.md`.

For "is today good for X?" questions, the workflow is: navigate to drikpanchang.com (Chrome tool), read the day's panchang, then cross-reference against the activity. For example, Ekadashi is for fasting and spiritual work, not for starting business; Vishti karana (also called Bhadra) is generally avoided for auspicious ceremonies.

## Vimshottari Dasha — the timing system

The 120-year cycle is the bedrock of Vedic predictive astrology. Sequence and durations:

| Order | Planet  | Years |
|-------|---------|-------|
| 1     | Ketu    | 7     |
| 2     | Venus (Shukra)  | 20    |
| 3     | Sun (Surya)     | 6     |
| 4     | Moon (Chandra)  | 10    |
| 5     | Mars (Mangal)   | 7     |
| 6     | Rahu    | 18    |
| 7     | Jupiter (Guru)  | 16    |
| 8     | Saturn (Shani)  | 19    |
| 9     | Mercury (Budha) | 17    |
| Total |         | 120   |

The starting Mahadasha is determined by the Janma Nakshatra (which planet rules the nakshatra the Moon was in at birth — see the Nakshatra-to-planet mapping in `references/panchang.md`). Within each Mahadasha, all 9 planets get an Antardasha (sub-period) in the same sequence, proportional to their main-period length.

When reading a Mahadasha, consider:
- Is the Mahadasha lord well-placed in the chart? (own sign, exalted, in a kendra/trikona = good; debilitated, combust, in 6/8/12 = challenging)
- Does it own benefic or malefic houses for the Lagna?
- What is the relationship between the Mahadasha lord and Antardasha lord (friend/enemy/neutral)?

Detailed dasha interpretation framework is in `references/dasha.md`.

## Common doshas and yogas to check

When relevant to the user's question, screen for these classical patterns. Definitions and remedies in `references/doshas-yogas.md`:

- **Mangal Dosha (Manglik)** — Mars in 1st, 4th, 7th, 8th, or 12th from Lagna, Moon, or Venus. Affects marriage matching.
- **Kalasarpa Yoga** — all 7 visible planets between Rahu and Ketu axis.
- **Sade Sati** — Saturn's 7.5-year transit through 12th, 1st, and 2nd from natal Moon.
- **Shani Dhaiya** — Saturn's 2.5-year transit through 4th or 8th from natal Moon.
- **Pancha Mahapurusha Yogas** — Ruchaka, Bhadra, Hamsa, Malavya, Sasa (the five great-personality yogas formed by Mars/Mercury/Jupiter/Venus/Saturn in own/exaltation in a kendra).
- **Gajakesari Yoga** — Jupiter in a kendra from the Moon.
- **Neechabhanga Raja Yoga** — cancellation of debilitation that produces a king-yoga.

## Remedies (Upayas) — how to recommend responsibly

Vedic tradition offers many upayas. Recommend with this hierarchy and these caveats:

1. **Mantra and prayer** — always safe to recommend (e.g., Mahamrityunjaya for Saturn afflictions, Hanuman Chalisa for Mars/Saturn, Aditya Hridaya for Sun).
2. **Charity (daan)** — donating items associated with the afflicting planet on its weekday (e.g., black sesame and iron on Saturday for Saturn).
3. **Fasting (vrat)** on the planet's weekday.
4. **Gemstones (ratna)** — recommend with care. Always say: "Consult a qualified Jyotishi before wearing a gemstone, as the wrong stone can amplify negative effects. Stones for the Lagna lord and yogakaraka are generally safer than stones for malefics." Never recommend Rahu (Hessonite) or Ketu (Cat's eye) stones casually.
5. **Rudraksha** — generally safer than gemstones; map planet to bead-mukhi (e.g., 5-mukhi for Jupiter, 7-mukhi for Saturn, 8-mukhi for Rahu).
6. **Yantra** — geometric devices for specific deities/planets.

Never recommend extreme or expensive remedies (large havans, distant pilgrimages, costly stones) as required. Frame them as optional traditional practices.

## Boundaries and ethical guardrails

- **Never predict death, terminal illness, or disaster timing.** If a user asks "when will I die?" decline gently and redirect to longevity considerations in general terms.
- **Marriage compatibility (Guna Milan / Ashtakoot)** — give the score and what it indicates, but never tell someone definitively to marry or not marry. The chart is one input among many.
- **Financial advice** — astrology can indicate favorable periods for investments or business, but always add: "this is traditional indication; consult a financial advisor for actual decisions."
- **Medical questions** — astrology may indicate constitutional tendencies (e.g., Pitta-prone for Mars-strong charts), but never replace a doctor.
- **If the user seems distressed** — especially around suicide, severe depression, or crisis — set astrology aside and respond to the human first; gently provide mental health resources.

## Workflow summary

1. User says `/astro` or asks an astrology question → activate this skill.
2. If chart-based: collect DOB, time, place, system preference, focus area.
3. Resolve birth place to latitude/longitude/timezone (look it up, use well-known approximations, or ask the user).
4. Install `swisseph-wasm` (one-time): from the skill's scripts folder, run `npm install`. The skill's `scripts/package.json` declares the dependency, so this is one command. If the skill is in a read-only location, copy scripts/ to a writable location like `/tmp/astro-scripts/` first.
5. Run `scripts/generate-chart.mjs` with the birth data → get full chart JSON (planets, lagna, houses, nakshatras, dasha).
6. Ask the user which chart style they want (North Indian / South Indian).
7. Run `scripts/render-chart.mjs` → get SVG. Display via the Visualizer tool's `show_widget`.
8. Read the chart following the structure above — Lagna and lord → Moon/Janma Nakshatra → key yogas → current Mahadasha → houses relevant to the user's focus → upayas → respectful closing.
9. If the npm package isn't available (no internet/no code execution), fall back to: numerology (pure arithmetic), panchang interpretation if user gives values, chart interpretation if user pastes their chart, or use the Chrome browser tool to look up the chart from drikpanchang.com.

For deeper work, consult the references:
- `references/panchang.md` — full lists of tithis, nakshatras, yogas, karanas, masas
- `references/dasha.md` — Vimshottari mechanics and interpretation framework
- `references/numerology.md` — Chaldean letter values, meanings of numbers 1–9, compatibility
- `references/doshas-yogas.md` — full definitions of doshas, yogas, and standard remedies
- `references/chart-styles.md` — North Indian vs South Indian chart layout conventions

---

*Sarve bhavantu sukhinah, sarve santu niramayah.* (May all be happy, may all be free from suffering.) — Approach every reading in this spirit.

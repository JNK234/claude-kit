# Astro — Indian Astrology & Numerology Skill for Claude

A skill that gives Claude the ability to act as a traditional Indian astrologer (Jyotishi), grounded in ancestral Vedic tradition. It covers birth chart interpretation, daily Panchang, Vimshottari Dasha periods, and Indian numerology.

---

## What it does

When this skill is active, Claude can:

- **Compute and render your Janma Kundali (birth chart)** — uses the `swisseph-wasm` npm package (Swiss Ephemeris in WebAssembly, NASA-grade precision, the same engine used by AstroSage and drikpanchang). Generates the full chart from your DOB/time/place: planets in sidereal positions (Lahiri ayanamsa by default), Lagna, houses, and renders it as an SVG in either **North Indian (diamond)** or **South Indian (square)** style.
- **Tell you today's Panchang** — Tithi, Nakshatra, Yoga, Karana, Vara, plus auspicious/inauspicious windows like Rahu Kala, Abhijit Muhurat, and Choghadiya.
- **Walk you through your Vimshottari Dasha** — calculates the full 120-year sequence from your Moon's nakshatra, identifies which Mahadasha (major period) and Antardasha (sub-period) you're in right now, and gives the theme of that period.
- **Calculate your numerology** — Mulank (root number), Bhagyank (destiny number), and Namank (name number) using the Chaldean system used in India.
- **Check classical doshas and yogas** — Mangal Dosha (Manglik), Kalasarpa Yoga, Sade Sati, Pancha Mahapurusha Yogas, Gajakesari Yoga, and more.
- **Suggest traditional remedies (upayas)** — mantras, charity, fasting, gemstones, and rudraksha — with appropriate caveats.

The skill is built to feel like a respectful traditional consultation: grounded reasoning, classical references where possible, and ethical care (no fatalism, no medical/marriage decrees, no fear-mongering).

---

## How chart computation works

This skill ships with two scripts in the `scripts/` folder:

- **`generate-chart.mjs`** — takes your birth data and outputs a full chart as JSON (planets with sidereal longitudes, Lagna, houses, nakshatras, padas, retrograde flags, full Vimshottari dasha sequence with current period).
- **`render-chart.mjs`** — takes that JSON and produces a visual chart SVG in either North or South Indian style.

The first time the skill computes a chart, it auto-installs the `swisseph-wasm` package (~3 MB, pure WebAssembly — no native compilation, no system dependencies). Subsequent charts reuse the install.

You don't need to run these scripts manually — Claude does it for you when you ask for a reading. Just provide your DOB, time of birth, and place.



---

## Installation

### Option 1: Install via the Claude UI (recommended)

1. Download the `astro.skill` file (the packaged version of this skill).
2. Open Claude (claude.ai or the desktop/mobile app).
3. Go to **Settings → Capabilities → Skills** (or wherever skills are managed in your version).
4. Click **Add Skill** or **Upload Skill** and select the `astro.skill` file.
5. Make sure the skill is **enabled** (toggle on).

### Option 2: Manual install (for advanced users / Claude Code)

1. Locate your Claude skills directory. Common paths:
   - Claude Code: `~/.claude/skills/` or wherever your CLI config points.
   - Claude.ai (uploaded skills): handled through the UI — you don't manually drop folders.
2. Copy the entire `astro/` folder (including `SKILL.md` and the `references/` subfolder) into the skills directory.
3. Restart Claude or refresh the skill list.

### Optional: Enable the Chrome extension for live data

The skill works fully without the Chrome extension, but **with it**, Claude can look up live Panchang data, planetary positions, and reference charts from sites like drikpanchang.com. To enable:

1. Install the **Claude in Chrome** extension (from the Chrome Web Store).
2. Sign in with your Claude account.
3. When using the skill, Claude will automatically use the browser tool when it would help (e.g., for "is today auspicious?" questions).

---

## How to use it

### Triggering the skill

The skill activates when you do any of the following:

**Explicit trigger:**
```
/astro
```

**Natural-language triggers (no slash needed):**
- "Read my kundali"
- "What's the panchang today?"
- "Am I Manglik?"
- "Calculate my mulank and bhagyank"
- "What does my Saturn Mahadasha mean?"
- "Is tomorrow a good day to start a business?"
- "What rashi is my Moon in?"
- "Tell me about my janma nakshatra"

If you mention any Vedic concept (rashi names, planet names like Surya/Chandra/Mangal, dasha, panchang, etc.), the skill should activate automatically.

### What Claude will ask you

For a full chart reading, Claude will ask for:

1. **Date of birth** (DD/MM/YYYY)
2. **Exact time of birth** (HH:MM — even 10 minutes matters because the Lagna changes every ~2 hours)
3. **Place of birth** (city, state, country)
4. **System preference** — Vedic (Lahiri), Vedic + Nadi, KP, or "pick the best" (defaults to Vedic Lahiri)
5. **Focus area** — career, marriage, health, finance, education, spiritual, or general

For numerology, Claude only needs your DOB (and full name if you want a Namank).

For Panchang questions, Claude needs your location.

### Example queries

**Numerology only (quickest, works offline):**
```
/astro What does my number mean? I was born on 27/04/1992.
```

**Today's Panchang:**
```
/astro Is today a good day to sign a property deal? I'm in Mumbai.
```

**Full chart reading:**
```
/astro Please read my kundali.
DOB: 15 August 1990
Time: 03:42 AM
Place: Pune, Maharashtra, India
Focus: career
```

**Chart interpretation when you already have a chart:**
```
/astro My Lagna is Vrishchika, Moon in Karka in 9th house.
I'm currently running Saturn Mahadasha. What does this period bring?
```

**Specific dosha check:**
```
/astro Am I Manglik? My Mars is in the 7th house from Lagna.
```

**Compatibility:**
```
/astro Compare my numerology with my partner's.
Me: 12/03/1988
Partner: 04/07/1990
```

---

## What this skill will NOT do

By design, the skill avoids:

- **Predicting death, terminal illness, or specific disaster timing** — it will gently decline.
- **Definitive medical, legal, or financial decrees** — it speaks in tendencies and recommends consulting actual professionals.
- **Telling you definitively to marry or not marry someone** — it gives Guna Milan scores and indicates compatibility, but the choice stays yours.
- **Recommending expensive gemstones casually** — it always advises consulting a qualified Jyotishi before wearing one, especially Blue Sapphire (Neelam), Hessonite (Gomed), and Cat's Eye (Lehsunia).
- **Western tropical astrology** — this skill is specifically for Vedic / sidereal / Indian-system astrology. For Western sun-sign horoscopes, ask Claude without invoking this skill.

If you ever feel a reading is too negative or distressing, the skill is designed to reframe difficulties as workable karma with traditional remedies — not as inevitable doom.

---

## What's inside the skill

```
astro/
├── SKILL.md           — Main instructions Claude follows
├── README.md          — This file
├── scripts/
│   ├── generate-chart.mjs  — Computes the full Vedic chart from DOB/time/place using swisseph-wasm
│   └── render-chart.mjs    — Renders the computed chart as SVG (North or South Indian style)
└── references/
    ├── panchang.md    — All 30 tithis, 27 nakshatras with rulers, 27 yogas, 11 karanas, weekday rulers, masas, auspicious windows
    ├── dasha.md       — Vimshottari sequence, how starting dasha is calculated, planet-by-planet themes
    ├── numerology.md  — Chaldean letter values, Mulank/Bhagyank/Namank meanings, compatibility
    ├── doshas-yogas.md — Mangal Dosha, Kalasarpa, Sade Sati, Mahapurusha Yogas, gemstone caveats, remedy hierarchy
    └── chart-styles.md — North Indian vs South Indian chart layouts, SVG drawing instructions
```

Claude reads `SKILL.md` always when the skill triggers, runs the scripts in `scripts/` when chart computation is needed, and pulls from `references/` as needed for deeper interpretation.

### Dependencies

The chart-computation scripts depend on **`swisseph-wasm`** (npm package). The skill installs this automatically on first use. You don't need to install anything by hand.

If you want to install it manually for testing:
```bash
cd ~/.claude/skills/astro/scripts   # or wherever your skill is
npm init -y
npm install swisseph-wasm
```

---

## Troubleshooting

**The skill isn't triggering.**
- Try the explicit `/astro` command.
- Make sure the skill is enabled in your Claude settings.
- If you uploaded the skill, confirm it appears in your skill list.

**Claude says it can't compute my chart.**
- The skill includes the `swisseph-wasm` npm package for chart computation. If installation fails, it usually means the environment doesn't have npm or internet access. In that case:
  - Get your chart from a free site (drikpanchang.com, prokerala.com, astrosage.com) and paste the planet positions to Claude. It will read the chart you provide.
  - Or enable code execution / internet access for Claude in your settings.
- The package is small (~3 MB) and installs automatically the first time Claude needs to compute a chart.

**The Panchang feels off / doesn't match my local almanac.**
- Different traditions use different ayanamsas (Lahiri is most common in India; some communities use Raman or KP). If your family follows a specific tradition, mention it — Claude will adjust the interpretation.
- Tamil and Bengali Panchangam follow Surya Siddhanta calculations, which differ slightly from Drik Ganita. Specify if you need one of these.

**Claude is being too cautious / not specific enough.**
- The skill is designed to lean ethical and grounded, not fortune-telling-y. If you want more direct predictive language, just ask: "Be more specific about timing." Claude will give what the chart indicates while still avoiding the genuinely off-limits things (death prediction, etc.).

---

## Credits & spirit

This skill is built in respect for the ancestral tradition of Jyotish — the "eye of the Vedas" — and for the generations of astrologers who preserved it. It draws from classical texts (Brihat Parashara Hora Shastra, Mansagari, Phaladeepika) for its reasoning, and from authentic contemporary sources like drikpanchang.com for daily data.

Astrology is not a replacement for human judgment, professional advice, or your own dharma. Use this skill as a traditional Jyotishi's chart would be used: as one input among many, illuminating tendencies — not dictating outcomes.

*Sarve bhavantu sukhinah, sarve santu niramayah.*
(May all be happy, may all be free from suffering.)

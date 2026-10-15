#!/usr/bin/env node
/**
 * render-chart.mjs — Render Vedic birth chart as SVG (North or South Indian style)
 *
 * Usage:
 *   node render-chart.mjs <chart.json> <style>
 *   <style> = "north" or "south"
 *
 * Or pipe:
 *   node generate-chart.mjs '{...}' | node render-chart.mjs - north
 *
 * Outputs SVG to stdout.
 */

import { readFileSync } from 'fs';

const PLANET_ABBR = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke'
};

const RASHI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka',
  'Simha', 'Kanya', 'Tula', 'Vrishchika',
  'Dhanu', 'Makara', 'Kumbha', 'Meena'
];

function loadChart() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node render-chart.mjs <chart.json|-> <north|south>');
    process.exit(1);
  }
  const data = arg === '-' ? readFileSync(0, 'utf-8') : readFileSync(arg, 'utf-8');
  return JSON.parse(data);
}

// Group planets by their house (1..12)
function planetsByHouse(chart) {
  const map = {};
  for (let h = 1; h <= 12; h++) map[h] = [];
  for (const [name, p] of Object.entries(chart.planets)) {
    const ab = PLANET_ABBR[name] || name.slice(0, 2);
    const tag = p.retrograde ? `${ab}(R)` : ab;
    map[p.house].push(tag);
  }
  // Add Lagna marker to house 1
  map[1].unshift('Lg');
  return map;
}

function renderNorthIndian(chart) {
  // 400x400 viewBox. Outer square, two diagonals, inner diamond connecting midpoints.
  // Standard North Indian house layout (1 = top-center):
  //   House positions (centroids):
  //     1: top-center inner diamond (200, 100)
  //     2: top-right corner triangle (300, 50)
  //     3: right-top triangle (350, 100)
  //     4: right-center inner diamond (300, 200)
  //     5: right-bottom triangle (350, 300)
  //     6: bottom-right corner triangle (300, 350)
  //     7: bottom-center inner diamond (200, 300)
  //     8: bottom-left corner triangle (100, 350)
  //     9: left-bottom triangle (50, 300)
  //    10: left-center inner diamond (100, 200)
  //    11: left-top triangle (50, 100)
  //    12: top-left corner triangle (100, 50)
  const positions = {
    1:  [200, 100], 2:  [100,  50], 3:  [ 50, 100], 4:  [100, 200],
    5:  [ 50, 300], 6:  [100, 350], 7:  [200, 300], 8:  [300, 350],
    9:  [350, 300], 10: [300, 200], 11: [350, 100], 12: [300,  50]
  };

  // Sign in each house: starts at Lagna sign, increments each house
  const lagnaIdx = chart.lagna.rashiIndex;
  const houseSigns = {};
  for (let h = 1; h <= 12; h++) {
    houseSigns[h] = ((lagnaIdx + h - 1) % 12) + 1; // 1..12 sign number
  }

  const planetMap = planetsByHouse(chart);

  // Build SVG
  let svg = `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style="background: var(--card-color, #fdf6e3);">
  <style>
    .chart-line { stroke: var(--text-color, #073642); stroke-width: 1.5; fill: none; }
    .house-num { font: 10px sans-serif; fill: var(--text-color-secondary, #93a1a1); }
    .sign-num { font: bold 14px sans-serif; fill: var(--accent-color, #b58900); text-anchor: middle; }
    .planet { font: 11px monospace; fill: var(--text-color, #073642); text-anchor: middle; }
    .lagna { font: bold 11px monospace; fill: var(--accent-color-2, #cb4b16); text-anchor: middle; }
    .title { font: 12px sans-serif; fill: var(--text-color, #073642); text-anchor: middle; }
  </style>

  <!-- Outer square -->
  <rect x="0" y="0" width="400" height="400" class="chart-line" />
  <!-- Diagonals -->
  <line x1="0" y1="0" x2="400" y2="400" class="chart-line" />
  <line x1="400" y1="0" x2="0" y2="400" class="chart-line" />
  <!-- Inner diamond -->
  <polygon points="200,0 400,200 200,400 0,200" class="chart-line" />
`;

  for (let h = 1; h <= 12; h++) {
    const [x, y] = positions[h];
    const sign = houseSigns[h];
    const planets = planetMap[h];
    svg += `\n  <!-- House ${h} -->\n`;
    svg += `  <text x="${x}" y="${y - 18}" class="house-num">${h}</text>\n`;
    svg += `  <text x="${x}" y="${y - 4}" class="sign-num">${sign}</text>\n`;
    if (planets.length > 0) {
      // stack planets vertically below sign number
      planets.forEach((pl, i) => {
        const cls = pl === 'Lg' ? 'lagna' : 'planet';
        svg += `  <text x="${x}" y="${y + 12 + i * 12}" class="${cls}">${pl}</text>\n`;
      });
    }
  }

  // Title at bottom
  svg += `  <text x="200" y="392" class="title">North Indian — Lagna: ${chart.lagna.rashi} ${chart.lagna.formatted.split(' ')[0]}</text>\n`;
  svg += `</svg>`;
  return svg;
}

function renderSouthIndian(chart) {
  // 4×4 grid, each cell 100×100, hollow center 2×2.
  // Fixed sign positions (sign index 0=Mesha .. 11=Meena):
  //   Top row:    Meena(11), Mesha(0),  Vrishabha(1), Mithuna(2)
  //   Right col:  Karka(3) row=1, Simha(4) row=2
  //   Bottom row: Kanya(5), Tula(6), Vrishchika(7), Dhanu(8)  -- but ORDER right-to-left
  //   Actually standard layout is:
  //     Row 0 (top):    [Meena, Mesha, Vrishabha, Mithuna]
  //     Row 1:          [Kumbha, ----, ----, Karka]
  //     Row 2:          [Makara, ----, ----, Simha]
  //     Row 3 (bottom): [Dhanu, Vrishchika, Tula, Kanya]
  // Grid coords: each cell top-left at (col*100, row*100), centroid at (col*100+50, row*100+50)
  const cellByRashi = {
    11: [0, 0], 0: [1, 0], 1: [2, 0], 2: [3, 0],   // top row
    10: [0, 1], 3: [3, 1],                          // row 1
    9:  [0, 2], 4: [3, 2],                          // row 2
    8:  [0, 3], 7: [1, 3], 6: [2, 3], 5: [3, 3]    // bottom row
  };

  const lagnaIdx = chart.lagna.rashiIndex;
  // For each rashi cell, what house number does it represent?
  const houseOfRashi = {};
  for (let r = 0; r < 12; r++) {
    houseOfRashi[r] = ((r - lagnaIdx + 12) % 12) + 1;
  }

  // Map planets by rashi index
  const byRashi = {};
  for (let r = 0; r < 12; r++) byRashi[r] = [];
  for (const [name, p] of Object.entries(chart.planets)) {
    byRashi[p.rashiIndex].push((PLANET_ABBR[name] || name.slice(0,2)) + (p.retrograde ? '(R)' : ''));
  }

  let svg = `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style="background: var(--card-color, #fdf6e3);">
  <style>
    .chart-line { stroke: var(--text-color, #073642); stroke-width: 1.5; fill: none; }
    .rashi-name { font: 9px sans-serif; fill: var(--text-color-secondary, #93a1a1); }
    .house-num { font: bold 11px sans-serif; fill: var(--accent-color, #b58900); }
    .planet { font: 11px monospace; fill: var(--text-color, #073642); }
    .lagna-cell { fill: var(--accent-color, #b58900); fill-opacity: 0.12; }
    .lagna-mark { font: bold 10px sans-serif; fill: var(--accent-color-2, #cb4b16); }
    .title { font: 12px sans-serif; fill: var(--text-color, #073642); text-anchor: middle; }
    .center-info { font: 11px sans-serif; fill: var(--text-color, #073642); text-anchor: middle; }
  </style>

  <!-- Outer border -->
  <rect x="0" y="0" width="400" height="400" class="chart-line" />
`;

  // Draw cells (12 outer cells; skip the center 2x2)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const isCenter = (row === 1 || row === 2) && (col === 1 || col === 2);
      if (isCenter) continue;
      svg += `  <rect x="${col*100}" y="${row*100}" width="100" height="100" class="chart-line" />\n`;
    }
  }
  // Center hollow border (the 2x2 inner box)
  svg += `  <rect x="100" y="100" width="200" height="200" class="chart-line" />\n`;

  // Place rashi name + house number + planets in each rashi cell
  for (let r = 0; r < 12; r++) {
    const [col, row] = cellByRashi[r];
    const cx = col * 100;
    const cy = row * 100;
    const houseNum = houseOfRashi[r];
    const isLagna = (r === lagnaIdx);
    if (isLagna) {
      svg += `  <rect x="${cx}" y="${cy}" width="100" height="100" class="lagna-cell" />\n`;
      svg += `  <text x="${cx + 50}" y="${cy + 50}" text-anchor="middle" class="lagna-mark">Lagna</text>\n`;
    }
    svg += `  <text x="${cx + 4}" y="${cy + 12}" class="rashi-name">${RASHI_NAMES[r]}</text>\n`;
    svg += `  <text x="${cx + 88}" y="${cy + 14}" text-anchor="end" class="house-num">${houseNum}</text>\n`;
    // Planets stacked
    byRashi[r].forEach((pl, i) => {
      svg += `  <text x="${cx + 6}" y="${cy + 30 + i * 13}" class="planet">${pl}</text>\n`;
    });
  }

  // Center info
  const dob = `${chart.input.day}/${chart.input.month}/${chart.input.year}`;
  const tob = `${String(chart.input.hour).padStart(2,'0')}:${String(chart.input.minute).padStart(2,'0')}`;
  svg += `  <text x="200" y="180" class="center-info">Janma Kundali</text>\n`;
  svg += `  <text x="200" y="200" class="center-info">${dob}</text>\n`;
  svg += `  <text x="200" y="218" class="center-info">${tob}</text>\n`;
  svg += `  <text x="200" y="240" class="center-info">Lagna: ${chart.lagna.rashi}</text>\n`;
  svg += `  <text x="200" y="392" class="title">South Indian — Ayanamsa: ${chart.ayanamsa.name} ${chart.ayanamsa.value.toFixed(2)}°</text>\n`;
  svg += `</svg>`;
  return svg;
}

const chart = loadChart();
const style = (process.argv[3] || 'north').toLowerCase();

if (style === 'south' || style === 's') {
  console.log(renderSouthIndian(chart));
} else {
  console.log(renderNorthIndian(chart));
}

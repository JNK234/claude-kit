#!/usr/bin/env node
/**
 * generate-chart.mjs — Vedic (Sidereal Lahiri) birth chart calculator
 *
 * Usage:
 *   node generate-chart.mjs '<json-input>'
 *
 * Input JSON shape:
 *   {
 *     "year": 1992, "month": 4, "day": 27,
 *     "hour": 14, "minute": 30,             // local time, 24-hour
 *     "timezone": 5.5,                       // hours offset from UTC (e.g. India = 5.5)
 *     "latitude": 19.0760, "longitude": 72.8777,  // decimal degrees, N/E positive
 *     "ayanamsa": "lahiri"                  // optional: lahiri (default), raman, krishnamurti
 *   }
 *
 * Output: JSON to stdout with planets, houses, lagna, nakshatras, dasha balance.
 *
 * Requires: npm install swisseph-wasm
 */

import SwissEph from 'swisseph-wasm';

// ---------- Constants ----------
const RASHI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka',
  'Simha', 'Kanya', 'Tula', 'Vrishchika',
  'Dhanu', 'Makara', 'Kumbha', 'Meena'
];

const NAKSHATRAS = [
  { name: 'Ashwini',          lord: 'Ketu' },
  { name: 'Bharani',          lord: 'Venus' },
  { name: 'Krittika',         lord: 'Sun' },
  { name: 'Rohini',           lord: 'Moon' },
  { name: 'Mrigashira',       lord: 'Mars' },
  { name: 'Ardra',            lord: 'Rahu' },
  { name: 'Punarvasu',        lord: 'Jupiter' },
  { name: 'Pushya',           lord: 'Saturn' },
  { name: 'Ashlesha',         lord: 'Mercury' },
  { name: 'Magha',            lord: 'Ketu' },
  { name: 'Purva Phalguni',   lord: 'Venus' },
  { name: 'Uttara Phalguni',  lord: 'Sun' },
  { name: 'Hasta',            lord: 'Moon' },
  { name: 'Chitra',           lord: 'Mars' },
  { name: 'Swati',            lord: 'Rahu' },
  { name: 'Vishakha',         lord: 'Jupiter' },
  { name: 'Anuradha',         lord: 'Saturn' },
  { name: 'Jyeshtha',         lord: 'Mercury' },
  { name: 'Mula',             lord: 'Ketu' },
  { name: 'Purva Ashadha',    lord: 'Venus' },
  { name: 'Uttara Ashadha',   lord: 'Sun' },
  { name: 'Shravana',         lord: 'Moon' },
  { name: 'Dhanishtha',       lord: 'Mars' },
  { name: 'Shatabhisha',      lord: 'Rahu' },
  { name: 'Purva Bhadrapada', lord: 'Jupiter' },
  { name: 'Uttara Bhadrapada',lord: 'Saturn' },
  { name: 'Revati',           lord: 'Mercury' }
];

// Vimshottari Mahadasha durations (years), in cyclic order
const VIMSHOTTARI = [
  { lord: 'Ketu',    years: 7  },
  { lord: 'Venus',   years: 20 },
  { lord: 'Sun',     years: 6  },
  { lord: 'Moon',    years: 10 },
  { lord: 'Mars',    years: 7  },
  { lord: 'Rahu',    years: 18 },
  { lord: 'Jupiter', years: 16 },
  { lord: 'Saturn',  years: 19 },
  { lord: 'Mercury', years: 17 }
];

// ---------- Helpers ----------
function rashiOf(lon) {
  const idx = Math.floor(lon / 30) % 12;
  return { index: idx, name: RASHI_NAMES[idx], degInSign: lon - idx * 30 };
}

function nakshatraOf(lon) {
  const span = 360 / 27;            // 13°20'
  const padaSpan = span / 4;
  const idx = Math.floor(lon / span);
  const within = lon - idx * span;
  const pada = Math.floor(within / padaSpan) + 1;
  return { index: idx, ...NAKSHATRAS[idx], pada, withinDeg: within };
}

function formatDMS(deg) {
  const d = Math.floor(deg);
  const mFloat = (deg - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  return `${d}°${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}"`;
}

// House placement in whole-sign system: each rashi = 1 house starting from Lagna
function houseOfPlanet(planetSign, lagnaSign) {
  return ((planetSign - lagnaSign + 12) % 12) + 1;
}

// Vimshottari starting Mahadasha calculation from Moon's longitude
function computeDasha(moonLon, birthDate) {
  const span = 360 / 27;
  const nakIdx = Math.floor(moonLon / span);
  const within = moonLon - nakIdx * span;
  const fractionTraversed = within / span;
  const startingLord = NAKSHATRAS[nakIdx].lord;

  // Find that lord's index in Vimshottari sequence
  const startIdx = VIMSHOTTARI.findIndex(d => d.lord === startingLord);
  const startingDasha = VIMSHOTTARI[startIdx];
  const remainingFraction = 1 - fractionTraversed;
  const remainingYears = startingDasha.years * remainingFraction;

  // Build a 120-year sequence of dasha periods starting from birth
  const periods = [];
  let cursorMs = birthDate.getTime();
  // First period (partial)
  const firstEnd = new Date(cursorMs + remainingYears * 365.2425 * 86400000);
  periods.push({
    lord: startingDasha.lord,
    years: +remainingYears.toFixed(4),
    start: new Date(cursorMs).toISOString().slice(0,10),
    end: firstEnd.toISOString().slice(0,10),
    note: `Partial period — ${(fractionTraversed*100).toFixed(2)}% had elapsed at birth`
  });
  cursorMs = firstEnd.getTime();
  // Subsequent full periods
  for (let i = 1; i < 9; i++) {
    const idx = (startIdx + i) % 9;
    const m = VIMSHOTTARI[idx];
    const end = new Date(cursorMs + m.years * 365.2425 * 86400000);
    periods.push({
      lord: m.lord,
      years: m.years,
      start: new Date(cursorMs).toISOString().slice(0,10),
      end: end.toISOString().slice(0,10)
    });
    cursorMs = end.getTime();
  }

  // Identify CURRENT period (today)
  const now = new Date();
  const currentMaha = periods.find(p => new Date(p.start) <= now && now < new Date(p.end));

  return { startingNakshatraLord: startingLord, balanceYears: +remainingYears.toFixed(4), periods, current: currentMaha };
}

// ---------- Main ----------
async function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error('Usage: node generate-chart.mjs \'<json>\'');
    console.error('See top of file for input shape.');
    process.exit(1);
  }
  const input = JSON.parse(inputArg);
  const { year, month, day, hour, minute, timezone, latitude, longitude } = input;
  const ayanamsaName = (input.ayanamsa || 'lahiri').toLowerCase();

  const swe = new SwissEph();
  await swe.initSwissEph();

  const ayanamsaModes = {
    lahiri:        swe.SE_SIDM_LAHIRI,
    raman:         swe.SE_SIDM_RAMAN,
    krishnamurti:  swe.SE_SIDM_KRISHNAMURTI,
    'fagan-bradley': swe.SE_SIDM_FAGAN_BRADLEY
  };
  const ayMode = ayanamsaModes[ayanamsaName] ?? swe.SE_SIDM_LAHIRI;
  swe.set_sid_mode(ayMode, 0, 0);

  // Convert local time to UTC
  const utcHour = hour + minute / 60 - timezone;
  const jd = swe.julday(year, month, day, utcHour);

  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SIDEREAL | swe.SEFLG_SPEED;

  // --- Planets ---
  const planetDefs = [
    { name: 'Sun',     id: swe.SE_SUN },
    { name: 'Moon',    id: swe.SE_MOON },
    { name: 'Mars',    id: swe.SE_MARS },
    { name: 'Mercury', id: swe.SE_MERCURY },
    { name: 'Jupiter', id: swe.SE_JUPITER },
    { name: 'Venus',   id: swe.SE_VENUS },
    { name: 'Saturn',  id: swe.SE_SATURN },
    { name: 'Rahu',    id: swe.SE_MEAN_NODE }
  ];

  const planets = {};
  let moonLon = null;
  let rahuLon = null;
  for (const p of planetDefs) {
    const r = swe.calc_ut(jd, p.id, flags);
    const lon = r[0];
    const speed = r[3];
    const rashi = rashiOf(lon);
    const nak = nakshatraOf(lon);
    planets[p.name] = {
      longitude: +lon.toFixed(4),
      formatted: formatDMS(rashi.degInSign) + ' ' + rashi.name,
      rashi: rashi.name,
      rashiIndex: rashi.index,
      nakshatra: nak.name,
      nakshatraLord: nak.lord,
      pada: nak.pada,
      retrograde: speed < 0,
      speed: +speed.toFixed(4)
    };
    if (p.name === 'Moon')  moonLon = lon;
    if (p.name === 'Rahu')  rahuLon = lon;
  }
  // Ketu = Rahu + 180°
  const ketuLon = (rahuLon + 180) % 360;
  {
    const rashi = rashiOf(ketuLon);
    const nak = nakshatraOf(ketuLon);
    planets['Ketu'] = {
      longitude: +ketuLon.toFixed(4),
      formatted: formatDMS(rashi.degInSign) + ' ' + rashi.name,
      rashi: rashi.name,
      rashiIndex: rashi.index,
      nakshatra: nak.name,
      nakshatraLord: nak.lord,
      pada: nak.pada,
      retrograde: true, // nodes are always retrograde in mean motion
      speed: +(-planets['Rahu'].speed).toFixed(4)
    };
  }

  // --- Lagna (Ascendant) using Placidus houses, then convert house cusps to sidereal ---
  // swisseph-wasm exposes houses() if available; otherwise compute manually.
  // We'll compute the Ascendant longitude using the standard formula:
  //   ARMC = local sidereal time × 15
  // For sidereal Lagna we subtract ayanamsa from the tropical Ascendant.

  let ascSidereal;
  if (typeof swe.houses === 'function') {
    // houses(jd, lat, lon, hsys) returns { cusps: {1..12}, ascmc: {0=Asc, 1=MC, ...} } in TROPICAL
    try {
      const hres = swe.houses(jd, latitude, longitude, 'P'); // Placidus
      const tropAsc = hres.ascmc[0];
      const ayan = swe.get_ayanamsa(jd);
      ascSidereal = ((tropAsc - ayan) + 360) % 360;
    } catch (e) {
      ascSidereal = null;
    }
  }
  if (ascSidereal === null || ascSidereal === undefined || isNaN(ascSidereal)) {
    // Fallback: approximate ascendant via sidtime
    const sidTimeHours = swe.sidtime(jd);
    const lstHours = (sidTimeHours + longitude / 15 + 24) % 24;
    const ramcDeg = lstHours * 15;
    // Obliquity of ecliptic ~23.4367° at J2000
    const eps = 23.4367 * Math.PI / 180;
    const lat = latitude * Math.PI / 180;
    const ramc = ramcDeg * Math.PI / 180;
    // Tropical ascendant formula
    const ascTropRad = Math.atan2(
      Math.cos(ramc),
      -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps))
    );
    let ascTropDeg = ascTropRad * 180 / Math.PI;
    if (ascTropDeg < 0) ascTropDeg += 360;
    if (ascTropDeg < ramcDeg) ascTropDeg += 180; // disambiguate hemisphere
    ascTropDeg = ascTropDeg % 360;
    const ayan = swe.get_ayanamsa(jd);
    ascSidereal = (ascTropDeg - ayan + 360) % 360;
  }

  const lagnaRashi = rashiOf(ascSidereal);
  const lagnaNak   = nakshatraOf(ascSidereal);

  const lagna = {
    longitude: +ascSidereal.toFixed(4),
    formatted: formatDMS(lagnaRashi.degInSign) + ' ' + lagnaRashi.name,
    rashi: lagnaRashi.name,
    rashiIndex: lagnaRashi.index,
    nakshatra: lagnaNak.name,
    nakshatraLord: lagnaNak.lord,
    pada: lagnaNak.pada
  };

  // --- House placement (whole-sign system) ---
  for (const name of Object.keys(planets)) {
    planets[name].house = houseOfPlanet(planets[name].rashiIndex, lagnaRashi.index);
  }

  // --- Houses (whole-sign): each house = one rashi starting from Lagna rashi ---
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const idx = (lagnaRashi.index + i) % 12;
    houses.push({ house: i + 1, rashi: RASHI_NAMES[idx], rashiIndex: idx });
  }

  // --- Vimshottari Dasha ---
  // Use birth date in UTC (approximate — exact dasha uses birth instant)
  const birthInstantUTC = new Date(Date.UTC(year, month - 1, day, hour - timezone, minute));
  const dasha = computeDasha(moonLon, birthInstantUTC);

  // --- Output ---
  const out = {
    input: { year, month, day, hour, minute, timezone, latitude, longitude, ayanamsa: ayanamsaName },
    julianDay: jd,
    ayanamsa: { name: ayanamsaName, value: +swe.get_ayanamsa(jd).toFixed(6) },
    lagna,
    houses,
    planets,
    dasha
  };

  swe.close();
  console.log(JSON.stringify(out, null, 2));
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});

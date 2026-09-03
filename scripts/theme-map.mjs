// Light-theme colour map for hard-coded hex values in inline SVG diagrams.
//
// Posts embed their diagrams as inline <svg> with presentation attributes
// (fill="#9aa4b2", stroke="#3a4154", …) baked to the dark palette. Rewriting
// ~10k hex literals across 180 posts would be a huge, risky diff, so the
// light skin instead *overrides* them in CSS: attribute selectors such as
// `[fill="#9aa4b2"]` beat presentation attributes, so one rule per colour
// repaints every diagram on the site.
//
// `npm run theme:css` regenerates src/styles/diagram-light.css from this map;
// test/diagram-colors.test.mjs fails if a post introduces an unmapped colour.
//
// Six of the colours are the site tokens themselves — those map to the token
// var so diagrams stay in step with the chrome. The rest are diagram-only
// accents (series hues) and tinted callout backgrounds, darkened / lightened
// by hand for a white page.

export const MAP = {
  // ── site tokens ────────────────────────────────────────────────────────
  '#1f2330': 'var(--color-base)',    // page background
  '#262b3a': 'var(--color-surface)', // box fill
  '#3a4154': 'var(--color-line)',    // hairlines, inactive strokes
  '#9aa4b2': 'var(--color-muted)',   // labels, secondary strokes
  '#e6e6e6': 'var(--color-ink)',     // primary text
  '#4f6df5': 'var(--color-accent)',  // highlight

  // ── neutrals (near-token shades used in a handful of diagrams) ─────────
  '#1f2430': 'var(--color-base)',
  '#232838': '#f4f6fb',
  '#2a2f3d': 'var(--color-surface)',
  '#2a3040': '#e9edf6',
  '#8a92a6': '#6b7385',
  '#8b949e': '#616a75',
  '#b8c0d0': '#4a5260',
  '#b9c2cc': '#4a5260',
  '#c9d1d9': '#333a44',
  '#cfd6e4': '#3d4453',
  '#6b7280': '#5b6472',

  // ── blues ──────────────────────────────────────────────────────────────
  '#8aa0e6': '#4258b8',
  '#1f6feb': '#1a5fd0',
  '#1e90ff': '#1273cc',
  '#26324a': '#e7ecf9', // blue-tinted callout fill
  '#1e2a40': '#e4eaf7',

  // ── greens ─────────────────────────────────────────────────────────────
  '#54b890': '#2c8a64',
  '#6ee7b7': '#1f9c6e',
  '#7fbfa0': '#35825f',
  '#9ccc65': '#5d9130',
  '#223528': '#e2f2e6', // green-tinted callout fills
  '#233528': '#e2f2e6',
  '#28331f': '#e8f2df',
  '#2e4a40': '#d8ece2',

  // ── ambers / golds ─────────────────────────────────────────────────────
  '#d6a45c': '#9c6a15',
  '#d4af37': '#8f7318',
  '#d6b98a': '#8f6a3b',
  '#b08d57': '#7d5f2d',
  '#3a2d1f': '#f6ecdc', // amber-tinted callout fills
  '#33291a': '#f6eddc',
  '#3a3320': '#f5efdc',
  '#3a2e20': '#f6ecdc',
  '#2e2a20': '#f4eee2',
  '#2e2a1a': '#f4eedd',

  // ── oranges ────────────────────────────────────────────────────────────
  '#e0733a': '#b95214',
  '#e08b7c': '#b95746',
  '#e06a5a': '#b94331',
  '#d66b5c': '#b44738',

  // ── reds / pinks ───────────────────────────────────────────────────────
  '#e05a7d': '#bf3058',
  '#dc4c3f': '#b93527',
  '#fca5a5': '#c44a4a',
  '#3a2626': '#fbe6e6', // red-tinted callout fills
  '#331f22': '#fbe4e8',
  '#3a2632': '#fae4ee',

  // ── purples ────────────────────────────────────────────────────────────
  '#9b6ff0': '#7040d0',
  '#a679d6': '#7f4bb8',
  '#2a2340': '#eee8fb', // purple-tinted callout fills
  '#2b2540': '#eee8fb',
  '#2a2440': '#eee8fb',
};

// Colours deliberately left alone: pure white is only ever used for label text
// sitting *on* a saturated accent shape, which keeps its contrast in both skins.
export const KEEP = new Set(['#fff', '#ffffff', '#000', '#000000']);

// Colours that also appear inside inline `style="color:#…"` attributes in post
// bodies. Inline styles outrank stylesheets, so these need `!important`; the
// list is kept explicit so the escape hatch stays narrow.
export const INLINE_STYLE_COLORS = [
  '#9aa4b2', '#54b890', '#4f6df5', '#d6a45c', '#e0733a',
  '#e05a7d', '#9b6ff0', '#e08b7c', '#d66b5c',
];

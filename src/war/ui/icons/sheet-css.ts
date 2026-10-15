/**
 * Styles for the icon contact sheet (sheet.html), kept as a string so a static export can inline
 * it. Materials follow STYLE.md section 5.
 */

/** One alpha-only noise tile as a data URI (the recipe in docs/war/art/lib/textures.js). */
function turb(freq: string, oct: number, seed: number, rgb: readonly [number, number, number], a: number, b: number, size = 220): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<filter id='n' x='0' y='0' width='100%' height='100%'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' seed='${seed}' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 ${rgb[0]} 0 0 0 0 ${rgb[1]} 0 0 0 0 ${rgb[2]} ${a} 0 0 0 ${b}'/>` +
    `</filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const LEATHER = [
  turb('1.1', 3, 4, [0, 0, 0], 1.1, -0.42),
  turb('0.9', 2, 11, [1, 0.86, 0.66], 0.5, -0.26),
  turb('0.03', 2, 9, [0.42, 0.28, 0.16], 0.6, -0.22, 400),
].join(', ');
const FELT = [turb('1.7', 2, 21, [0.75, 0.85, 1], 0.55, -0.27), turb('0.6', 2, 5, [0, 0, 0], 0.6, -0.2)].join(', ');
const LINEN = [
  turb('0.9 0.06', 2, 2, [0.42, 0.36, 0.26], 0.55, -0.2),
  turb('0.06 0.9', 2, 3, [0.42, 0.36, 0.26], 0.5, -0.2),
].join(', ');

export const SHEET_CSS = `
:root {
  --table: #0B0F14; --room-0: #06080B; --room-1: #0F141A; --board: #12161C; --seam: #2A3038;
  --leather-1: #1D150F; --felt-1: #121A24; --linen: #E9E2D2; --type-ink: #2A2520;
  --text: #E8E2D0; --text-2: rgba(232,226,208,.64); --text-3: rgba(232,226,208,.40); --text-4: rgba(232,226,208,.22);
  --brass: #C9A35B; --brass-hi: #F7E0A3; --points: #5FD4F4; --multiplier: #FFB547;
  --font-label: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  --font-num: 'JetBrains Mono', ui-monospace, monospace;
  --font-stencil: 'Saira Stencil One', 'Barlow Condensed', sans-serif;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--table); }
body {
  color: var(--text); font: 500 13px/1.4 var(--font-label);
  -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;
}
svg { display: block; }
.page {
  width: 1440px; padding: 56px 48px 64px;
  background: radial-gradient(120% 60% at 50% 0%, rgba(30,62,92,.18), rgba(0,0,0,0) 60%), var(--table);
}
.masthead { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 36px; }
.masthead h1 { margin: 0; font: 400 34px/1 var(--font-stencil); letter-spacing: .04em; color: var(--linen); }
.masthead p { margin: 10px 0 0; max-width: 760px; color: var(--text-2); font-size: 14px; letter-spacing: .02em; }
.masthead .rules { display: flex; gap: 22px; font: 700 10px/1 var(--font-label); letter-spacing: .22em; text-transform: uppercase; color: var(--text-3); }
.masthead .rules b { color: var(--brass-hi); font-weight: 700; }
section.panel {
  background: linear-gradient(180deg, rgba(255,255,255,.018), rgba(0,0,0,0) 30%), var(--room-1);
  border-radius: 12px; padding: 26px 28px 30px; margin-bottom: 28px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 0 0 1px rgba(0,0,0,.6), 0 10px 30px rgba(0,0,0,.35);
}
.panel h2 {
  margin: 0 0 20px; display: flex; align-items: baseline; gap: 14px;
  font: 700 11px/1 var(--font-label); letter-spacing: .3em; text-transform: uppercase; color: var(--brass);
}
.panel h2 span { font-weight: 600; letter-spacing: .16em; color: var(--text-3); }

/* The rail, exactly as at the table: leather, stitching, rimmed felt seats (STYLE 5.4, 5.5). */
.rails { display: grid; grid-template-columns: repeat(2, 390px); gap: 22px 26px; }
.rail {
  position: relative; width: 390px; height: 64px;
  background: linear-gradient(180deg, rgba(255,220,170,.05), rgba(0,0,0,0) 30%, rgba(0,0,0,.35)), ${LEATHER}, var(--leather-1);
  box-shadow: inset 0 1px 0 rgba(255,210,150,.08), 0 3px 6px rgba(0,0,0,.55);
}
.rail .stitch { position: absolute; left: 6px; right: 6px; height: 0; border-top: 1px dashed rgba(233,214,178,.20); }
.seat {
  position: absolute; top: 3px; width: 64px; height: 58px; border-radius: 7px; padding: 1.5px;
  background: linear-gradient(145deg, var(--rim-hi) 0%, var(--rim) 40%, var(--rim-lo) 100%);
  box-shadow: 0 2px 0 rgba(0,0,0,.55), 0 4px 7px rgba(0,0,0,.5);
}
.seat { --rim-hi: #F7E0A3; --rim: #C9A35B; --rim-lo: #6A4F22; }
.seat .felt {
  position: relative; width: 100%; height: 100%; border-radius: 5.5px; overflow: hidden;
  background: radial-gradient(90% 70% at 35% 25%, rgba(255,255,255,.05), rgba(255,255,255,0) 70%), ${FELT}, var(--felt-1);
  box-shadow: inset 0 2px 4px rgba(0,0,0,.7), inset 0 -1px 0 rgba(255,255,255,.04);
}
.seat .no { position: absolute; left: 4.5px; top: 3.5px; font: 700 7px/7px var(--font-num); color: var(--text-3); }
.seat .obj { position: absolute; left: 50%; top: 5.5px; margin-left: -17px; filter: drop-shadow(1.5px 2px 1.5px rgba(0,0,0,.6)); }
.seat .chip {
  position: absolute; left: 0; right: 0; bottom: 0; height: 15px;
  display: flex; align-items: center; justify-content: center; gap: 1px;
  background: linear-gradient(180deg, #0A0E13, #06080B); border-top: 1px solid rgba(255,255,255,.06);
  font: 800 8px/8px var(--font-num); letter-spacing: -.01em; white-space: nowrap;
}
.chip.p { color: var(--points); } .chip.m { color: var(--multiplier); }
.chip svg { margin: 0 .5px; }

/* One card per icon: 34 on the rail's leather, 96 on linen, 96 on the dark felt. */
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.card {
  border-radius: 9px; padding: 10px; background: rgba(0,0,0,.22);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.035);
}
.tiles { display: grid; grid-template-columns: 72px 1fr 1fr; gap: 6px; height: 112px; }
.tile { display: flex; align-items: center; justify-content: center; border-radius: 6px; position: relative; overflow: hidden; }
.tile.rail-c { background: linear-gradient(180deg, rgba(255,220,170,.05), rgba(0,0,0,0) 30%, rgba(0,0,0,.35)), ${LEATHER}, var(--leather-1); box-shadow: inset 0 1px 0 rgba(255,210,150,.08); }
.tile.linen { background: ${LINEN}, linear-gradient(180deg, #F2ECDF, #E9E2D2 60%, #D8CFBB); box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(0,0,0,.12); }
.tile.dark { background: radial-gradient(90% 70% at 35% 25%, rgba(255,255,255,.05), rgba(255,255,255,0) 70%), ${FELT}, var(--felt-1); box-shadow: inset 0 2px 5px rgba(0,0,0,.6); }
.tile.dark svg, .tile.rail-c svg { filter: drop-shadow(1.5px 2px 1.5px rgba(0,0,0,.6)); }
.tile.dark.big svg { filter: drop-shadow(3px 4px 3px rgba(0,0,0,.55)); }
.tile .px { position: absolute; left: 6px; bottom: 5px; font: 700 8px/1 var(--font-num); color: var(--text-4); }
.tile.linen .px { color: rgba(42,37,32,.38); }
.cap { display: flex; align-items: baseline; gap: 8px; padding: 10px 2px 1px; white-space: nowrap; }
.cap .name { font: 700 13px/1 var(--font-label); letter-spacing: .12em; text-transform: uppercase; color: var(--linen); }
.cap .obj { font: 500 13px/1 var(--font-label); letter-spacing: .02em; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; }
.cap .id { margin-left: auto; font: 700 9px/1 var(--font-num); letter-spacing: .04em; color: var(--text-3); }

/* Silhouette test: every object filled black at 20 px. Name it or redraw it. */
.sil { display: grid; grid-template-columns: repeat(10, 1fr); gap: 18px 6px; padding: 16px 18px; border-radius: 8px; background: linear-gradient(180deg, #F2ECDF, #E9E2D2 60%, #D8CFBB); }
.sil .s { display: flex; flex-direction: column; align-items: center; gap: 7px; }
.sil svg { filter: brightness(0); opacity: .88; }
.sil .s span { font: 700 7.5px/1 var(--font-label); letter-spacing: .14em; color: rgba(42,37,32,.55); text-transform: uppercase; }

/* Glyphs: on the console, on paper, on brass. */
.glyphs { display: grid; grid-template-columns: repeat(9, 1fr); gap: 10px; }
.g { border-radius: 8px; overflow: hidden; background: rgba(0,0,0,.22); box-shadow: inset 0 0 0 1px rgba(255,255,255,.035); }
.g .on { display: grid; grid-template-columns: 1fr 1fr 1fr; height: 58px; }
.g .on > div { display: flex; align-items: center; justify-content: center; gap: 7px; }
.g .c1 { background: var(--board); color: var(--text); }
.g .c2 { background: ${LINEN}, linear-gradient(180deg, #F2ECDF, #E9E2D2 60%, #D8CFBB); color: var(--type-ink); }
.g .c3 { background: linear-gradient(180deg, #F7E0A3 0%, #E3C078 16%, #C9A35B 50%, #A9843F 78%, #9E7B3B 100%); color: #2A1C08; }
.g .c3 svg { filter: drop-shadow(0 1px 0 rgba(255,240,200,.5)); }
.g .lbl { padding: 8px 9px 9px; font: 700 9.5px/1 var(--font-label); letter-spacing: .16em; text-transform: uppercase; color: var(--text-2); display: flex; justify-content: space-between; }
.g .lbl i { font: 700 8.5px/1 var(--font-num); font-style: normal; letter-spacing: 0; color: var(--text-3); text-transform: none; }

/* Glyphs in running type, as the HUD will set them. */
.inline { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 18px; align-items: center; }
.tag {
  display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 12px 0 16px;
  clip-path: polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%);
  background: linear-gradient(180deg, #F7E0A3 0%, #E3C078 16%, #C9A35B 50%, #A9843F 78%, #9E7B3B 100%);
  color: #2A1C08; font: 800 16px/1 var(--font-num);
}
.pill { display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 12px; border-radius: 6px; background: #0A0E13; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); font: 800 14px/1 var(--font-num); }
.pill.p { color: var(--points); } .pill.m { color: var(--multiplier); }
.btn {
  display: inline-flex; align-items: center; gap: 12px; height: 40px; padding: 0 20px; border-radius: 9px;
  border: 1px solid #4A3614;
  background: linear-gradient(180deg, #F7E0A3 0%, #E3C078 16%, #C9A35B 50%, #A9843F 78%, #9E7B3B 100%);
  box-shadow: inset 0 1px 0 rgba(255,250,230,.75), inset 0 -2px 0 rgba(58,42,16,.45), 0 4px 0 #3A2A10, 0 6px 10px rgba(0,0,0,.6);
  color: #2A1C08; font: 700 14px/1 var(--font-label); letter-spacing: .2em; text-shadow: 0 1px 0 rgba(255,240,200,.5);
}
.ghost {
  display: inline-flex; align-items: center; gap: 10px; height: 40px; padding: 0 16px; border-radius: 9px;
  border: 1.5px solid #8A8F98; color: var(--text); font: 700 14px/1 var(--font-label); letter-spacing: .2em;
  background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.2));
}
.blocs { display: inline-flex; gap: 12px; padding: 0 14px; height: 40px; align-items: center; border-radius: 8px; background: #0D1B2A; }
footer { display: flex; justify-content: space-between; color: var(--text-4); font: 700 9px/1 var(--font-label); letter-spacing: .24em; text-transform: uppercase; padding: 4px 4px 0; }
`;

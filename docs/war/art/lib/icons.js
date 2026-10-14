/*
 * War room: staff objects and paper icons as inline SVG.
 * Rules (see ../STYLE.md, Icons): 64 x 64 viewBox, silhouette first, a 2.25 unit ink outline,
 * three flat tones per material (light faces top-left, dark faces bottom-right), one highlight.
 */
(function () {
  'use strict';

  const INK = '#0b0d11';
  const M = {
    brass: ['#f1d28a', '#c9a35b', '#8a6a2e'],
    gun: ['#5b636e', '#363c45', '#1f2329'],
    red: ['#f06a57', '#c93a2e', '#82211b'],
    ivory: ['#f6f0e2', '#e2d8c2', '#b9ac8e'],
    paper: ['#f4eedf', '#ddd2b8', '#b3a585'],
    leather: ['#b97a43', '#8c5630', '#5a3418'],
    steel: ['#dfe5ec', '#a5aeb9', '#66707c'],
    lens: ['#d6ecff', '#9db8d9', '#56708f'],
  };
  const HI = 'rgba(255,252,240,0.85)';
  const O = `stroke="${INK}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"`;

  const svg = (body, extra = '') => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" ${extra}>${body}</svg>`;
  /** A thick rod: ink underlay, then the material on top. */
  const rod = (d, w, c) =>
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 4.5}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

  /* ---------------------------------------------------------------- staff */

  /** Duty Officer: a brass desk lamp, lit. */
  function deskLamp(lit = true) {
    const [bl, bm, bd] = M.brass;
    const [gl, gm, gd] = M.gun;
    return svg(`
      ${lit ? `<defs><radialGradient id="dl-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.85"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></radialGradient></defs>
      <circle cx="47" cy="29" r="13" fill="url(#dl-glow)"/>` : ''}
      <path d="M10 57 Q10 50 17 50 L37 50 Q44 50 44 57 Z" fill="${bm}" ${O}/>
      <path d="M13 53.5 Q14 51.5 17.5 51.5 L36 51.5" fill="none" stroke="${bl}" stroke-width="1.6" stroke-linecap="round"/>
      ${rod('M27 49 L17 31 L32 18', 3.2, bm)}
      <path d="M26 47 L17.6 31.6" fill="none" stroke="${bl}" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="17" cy="31" r="3.6" fill="${bm}" ${O}/>
      <circle cx="27" cy="49" r="3" fill="${bd}" ${O}/>
      <g transform="translate(40 21) rotate(-45)">
        <path d="M-5 -11 Q0 -14 5 -11 L12 7 Q0 11 -12 7 Z" fill="${gm}" ${O}/>
        <path d="M-5 -11 Q-2 -12.6 0 -12.6 L-1.5 8.6 Q-7 8.2 -12 7 Z" fill="${gl}"/>
        <path d="M3 -11.2 Q4.2 -11.6 5 -11 L12 7 Q9.6 7.9 7 8.4 Z" fill="${gd}"/>
        <path d="M-5 -11 Q0 -14 5 -11 L12 7 Q0 11 -12 7 Z" fill="none" ${O}/>
        <ellipse cx="0" cy="7.4" rx="12" ry="3.2" fill="${lit ? '#ffe2a3' : gd}" ${O}/>
        ${lit ? '<ellipse cx="0" cy="7.4" rx="6" ry="1.4" fill="#fff8e6"/>' : ''}
        <path d="M-3.4 -9.4 L-8.6 4.4" stroke="${HI}" stroke-width="1.6" stroke-linecap="round"/>
      </g>
      <circle cx="32" cy="18" r="2.8" fill="${bl}" ${O}/>`);
  }

  /** Hotline Operator: a red rotary telephone. */
  function redPhone() {
    const [rl, rm, rd] = M.red;
    const [il, im, id] = M.ivory;
    let holes = '';
    for (let i = 0; i < 9; i++) {
      const a = (-120 + i * 30) * (Math.PI / 180);
      holes += `<circle cx="${(32 + Math.cos(a) * 6.2).toFixed(2)}" cy="${(43 + Math.sin(a) * 6.2).toFixed(2)}" r="1.45" fill="${id}"/>`;
    }
    return svg(`
      <path d="M11 54 L15.5 36.5 Q17 31 23 31 L41 31 Q47 31 48.5 36.5 L53 54 Q53.4 57 50 57 L14 57 Q10.6 57 11 54 Z" fill="${rm}" ${O}/>
      <path d="M13.6 52 L17.6 37 Q18.8 33.2 23 33.2 L27 33.2 L21 55 L14.2 55 Z" fill="${rl}"/>
      <path d="M44 33.6 Q46.4 34.6 47 37 L51 54 Q51 55 49.6 55 L45 55 Z" fill="${rd}"/>
      <path d="M11 54 L15.5 36.5 Q17 31 23 31 L41 31 Q47 31 48.5 36.5 L53 54 Q53.4 57 50 57 L14 57 Q10.6 57 11 54 Z" fill="none" ${O}/>
      <circle cx="32" cy="43" r="9.6" fill="${im}" ${O}/>
      <path d="M24.6 40 A8 8 0 0 1 35 35.4" fill="none" stroke="${il}" stroke-width="2" stroke-linecap="round"/>
      ${holes}
      <circle cx="32" cy="43" r="2.4" fill="${rm}" stroke="${INK}" stroke-width="1.4"/>
      <path d="M21 27 L21 31.5 M43 27 L43 31.5" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M7 26.6 Q5.4 18.4 13.6 17.4 L50.4 17.4 Q58.6 18.4 57 26.6 Q56.4 29 53.8 29 L49 29 Q47.6 24.4 43 24.6 L21 24.6 Q16.4 24.4 15 29 L10.2 29 Q7.6 29 7 26.6 Z" fill="${rm}" ${O}/>
      <path d="M9.4 25.6 Q8.6 20.6 13.8 19.8 L18 19.8 Q13 21.6 12.6 27 L10.6 27 Z" fill="${rl}"/>
      <path d="M50 19.8 Q55.6 20.6 54.6 25.6 Q54.4 26.8 53.2 27 L50.6 27 Q50.2 22 46 19.8 Z" fill="${rd}"/>
      <path d="M17 20.6 L44 20.6" stroke="${HI}" stroke-width="1.8" stroke-linecap="round"/>`);
  }

  /** Harbourmaster: a brass ship's bell. */
  function shipsBell() {
    const [bl, bm, bd] = M.brass;
    return svg(`
      <path d="M27 8 L37 8 L38.5 14 L25.5 14 Z" fill="${bd}" ${O}/>
      <circle cx="32" cy="6.4" r="2.6" fill="none" stroke="${INK}" stroke-width="2.25"/>
      <path d="M19.5 47 C19.5 30 22 16 32 13.6 C42 16 44.5 30 44.5 47 Z" fill="${bm}" ${O}/>
      <path d="M22 46 C22 31 24.4 18.6 31 15.6 C27.4 21.6 26.4 32 26.6 46 Z" fill="${bl}"/>
      <path d="M38 46 C38.4 32 37.2 21.4 34 15.8 C40.4 18.8 42.2 30.6 42.2 46 Z" fill="${bd}"/>
      <path d="M19.5 47 C19.5 30 22 16 32 13.6 C42 16 44.5 30 44.5 47 Z" fill="none" ${O}/>
      <path d="M21.4 25 Q32 22.6 42.6 25 M20.4 38 Q32 35.6 43.6 38" fill="none" stroke="${bd}" stroke-width="1.4" stroke-linecap="round"/>
      <rect x="14" y="46" width="36" height="7.4" rx="3.7" fill="${bm}" ${O}/>
      <path d="M17.4 48.6 L30 48.6" stroke="${bl}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M40 51.4 L47 51.4" stroke="${bd}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M32 53.4 L32 56" stroke="${INK}" stroke-width="2"/>
      <circle cx="32" cy="58" r="3.2" fill="${bd}" ${O}/>
      <path d="M25 21.6 Q23.6 30 23.8 41" fill="none" stroke="${HI}" stroke-width="2" stroke-linecap="round"/>`);
  }

  /** Strategist: a folded map with a red route. */
  function foldedMap() {
    const [pl, pm, pd] = M.paper;
    return svg(`
      <path d="M7 16 L23.5 10.5 L40.5 16.5 L57 11 L57 51 L40.5 56.5 L23.5 50.5 L7 56 Z" fill="${pl}" ${O}/>
      <path d="M23.5 10.5 L40.5 16.5 L40.5 56.5 L23.5 50.5 Z" fill="${pm}"/>
      <path d="M40.5 16.5 L57 11 L57 51 L40.5 56.5 Z" fill="${pl}"/>
      <path d="M48 52.2 L57 49.2 L57 51 L40.5 56.5 L40.5 54.6 Z" fill="${pd}"/>
      <path d="M9.5 30 Q14 26 19 29 Q21.5 31 23.5 30.5 L23.5 44 Q17 46 13 42 Q10.5 40 9.5 41 Z" fill="#9fd3ff" opacity="0.75"/>
      <path d="M40.5 30 Q46 33 50 29 Q53 26.5 55 27.5 L55 21 Q49 19.5 46 22 Q43 24 40.5 23 Z" fill="#9fd3ff" opacity="0.65"/>
      <path d="M28 22 Q32 20.6 36 24 Q37.6 26 36.6 30 Q34 33 30 32 Q26.4 30.4 28 22 Z" fill="${pd}" opacity="0.55"/>
      <path d="M12 47 L18.5 39 L25.5 41.5 L32 34.5 L39 37.5 L45.5 30 L51.5 32" fill="none" stroke="#e0483c" stroke-width="2.2" stroke-dasharray="3.2 2.4" stroke-linecap="round"/>
      <path d="M49.4 17.4 L54 22 M54 17.4 L49.4 22" stroke="#e0483c" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M23.5 10.5 L23.5 50.5 M40.5 16.5 L40.5 56.5" stroke="${pd}" stroke-width="1.4"/>
      <path d="M7 16 L23.5 10.5 L40.5 16.5 L57 11 L57 51 L40.5 56.5 L23.5 50.5 L7 56 Z" fill="none" ${O}/>
      <path d="M10 18.4 L21 14.8" stroke="${HI}" stroke-width="1.8" stroke-linecap="round"/>`);
  }

  /** Admiral: a brass telescope. */
  function telescope() {
    const [bl, bm, bd] = M.brass;
    const [ll, lm, ld] = M.leather;
    const [gl, gm, gd] = M.lens;
    return svg(`
      <g transform="rotate(-32 32 34)">
        <rect x="3" y="29" width="11" height="9" rx="2" fill="${bm}" ${O}/>
        <rect x="13" y="27.2" width="14" height="12.6" rx="1.6" fill="${bm}" ${O}/>
        <path d="M14.2 29 L25.8 29" stroke="${bl}" stroke-width="2" stroke-linecap="round"/>
        <path d="M14.2 38 L25.8 38" stroke="${bd}" stroke-width="1.6" stroke-linecap="round"/>
        <rect x="26" y="24.6" width="22" height="17.8" rx="1.6" fill="${lm}" ${O}/>
        <path d="M27.4 26.6 L46.6 26.6 L46.6 30 L27.4 30 Z" fill="${ll}"/>
        <path d="M27.4 38.4 L46.6 38.4 L46.6 41 L27.4 41 Z" fill="${ld}"/>
        <rect x="26" y="24.6" width="22" height="17.8" rx="1.6" fill="none" ${O}/>
        <rect x="24.6" y="23.6" width="4.6" height="19.8" rx="1.2" fill="${bm}" ${O}/>
        <rect x="46.6" y="21.6" width="12" height="23.8" rx="2.2" fill="${bm}" ${O}/>
        <path d="M48 24 L57.4 24" stroke="${bl}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M48 42.6 L57.4 42.6" stroke="${bd}" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="59.6" cy="33.5" rx="2.6" ry="10.4" fill="${gm}" ${O}/>
        <path d="M59.2 26.4 Q60.4 30 60 33" stroke="${gl}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <path d="M30 27.8 L44 27.8" stroke="${HI}" stroke-width="1.6" stroke-linecap="round"/>
      </g>`);
  }

  /** Courier: a leather satchel. Envoy: a diplomatic bag. (Exemplars for the sheet.) */
  function satchel() {
    const [ll, lm, ld] = M.leather;
    const [bl, bm, bd] = M.brass;
    return svg(`
      <path d="M18 22 Q18 8 32 8 Q46 8 46 22" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <path d="M18 22 Q18 8 32 8 Q46 8 46 22" fill="none" stroke="${ld}" stroke-width="3" stroke-linecap="round"/>
      <rect x="8" y="20" width="48" height="36" rx="5" fill="${lm}" ${O}/>
      <path d="M10.4 24 Q10.4 22.2 12.6 22.2 L22 22.2 L14 54 L12 54 Q10.4 54 10.4 52 Z" fill="${ll}"/>
      <path d="M54 30 L54 52 Q54 54 52 54 L44 54 Z" fill="${ld}"/>
      <rect x="8" y="20" width="48" height="36" rx="5" fill="none" ${O}/>
      <path d="M8 26 Q8 20 13 20 L51 20 Q56 20 56 26 L56 34 Q32 42 8 34 Z" fill="${lm}" ${O}/>
      <path d="M10.6 24 Q11 22.4 13.4 22.4 L30 22.4 Q22 26 12 33 L10.6 32.6 Z" fill="${ll}"/>
      <rect x="27.6" y="34" width="8.8" height="9" rx="1.6" fill="${bm}" ${O}/>
      <path d="M29.4 36.2 L34.6 36.2" stroke="${bl}" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M14 23.6 L27 23.6" stroke="${HI}" stroke-width="1.6" stroke-linecap="round"/>`);
  }

  /** Signals Officer: a morse key. */
  function morseKey() {
    const [bl, bm, bd] = M.brass;
    const [gl, gm, gd] = M.gun;
    return svg(`
      <rect x="6" y="44" width="52" height="12" rx="3" fill="${gm}" ${O}/>
      <path d="M8.6 47 L30 47" stroke="${gl}" stroke-width="2" stroke-linecap="round"/>
      <path d="M40 53.4 L55 53.4" stroke="${gd}" stroke-width="2" stroke-linecap="round"/>
      <rect x="40" y="36" width="8" height="9" rx="1" fill="${bd}" ${O}/>
      ${rod('M14 33 L50 26', 3.6, bm)}
      <path d="M16 31.6 L46 25.8" stroke="${bl}" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="44" cy="27" r="3" fill="${bm}" ${O}/>
      <rect x="22" y="36" width="5" height="9" rx="1" fill="${bm}" ${O}/>
      <ellipse cx="13" cy="31.6" rx="8" ry="4.6" fill="#2b2f36" ${O}/>
      <ellipse cx="13" cy="30.4" rx="7" ry="2.8" fill="#4a515b"/>
      <path d="M8.6 30 Q11 28.6 14 28.8" stroke="${HI}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`);
  }

  /* ---------------------------------------------------------------- paper */

  /** The rubber-stamp ink filter: procedural speckle so a stamp never looks vector-clean. */
  function stampFilter(id, seed = 3) {
    return `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="${seed}" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.75" result="m"/>
      <feComposite in="SourceGraphic" in2="m" operator="in"/>
    </filter>`;
  }

  /** Order stamps, drawn as ink on linen. */
  function orderStamp(kind, id = 'os') {
    const ink = '#c4372c';
    const f = `${id}-${kind}`;
    const shapes = {
      FORTIFY: `<path d="M12 12 L32 19 L52 12 L45 32 L52 52 L32 45 L12 52 L19 32 Z" fill="none" stroke="${ink}" stroke-width="3.4" stroke-linejoin="round"/>
        <clipPath id="${f}-c"><path d="M12 12 L32 19 L52 12 L45 32 L52 52 L32 45 L12 52 L19 32 Z"/></clipPath>
        <g clip-path="url(#${f}-c)" stroke="${ink}" stroke-width="1.8">${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 6 - 10} 64 L${i * 6 + 30} 0"/>`).join('')}</g>`,
      RELAY: `<circle cx="32" cy="32" r="19" fill="none" stroke="${ink}" stroke-width="3.6"/>
        <circle cx="32" cy="32" r="11.5" fill="none" stroke="${ink}" stroke-width="3.6"/>
        <circle cx="32" cy="32" r="3.6" fill="${ink}"/>`,
      ECHO: `<circle cx="26" cy="32" r="12" fill="none" stroke="${ink}" stroke-width="3.6"/>
        <circle cx="38" cy="32" r="12" fill="${ink}" fill-opacity="0.85"/>
        <circle cx="38" cy="32" r="12" fill="none" stroke="${ink}" stroke-width="3.6"/>`,
      RECRUIT: `<rect x="3" y="21" width="58" height="22" rx="3" fill="none" stroke="${ink}" stroke-width="2.6"/>
        <rect x="6" y="24" width="52" height="16" rx="1.5" fill="none" stroke="${ink}" stroke-width="0.9"/>
        <text x="32" y="36.6" text-anchor="middle" font-family="Saira Stencil One, sans-serif" font-size="11.5" letter-spacing="1.2" fill="${ink}">RECRUIT</text>`,
      CABLE: `<path d="M10 46 Q32 6 54 22" fill="none" stroke="${ink}" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="10" cy="46" r="5" fill="${ink}"/><circle cx="54" cy="22" r="5" fill="${ink}"/>`,
    };
    return svg(`<defs>${stampFilter(f)}</defs><g filter="url(#${f})" transform="rotate(-6 32 32)">${shapes[kind]}</g>`);
  }

  /* ----------------------------------------------------------------- brass */

  /** The Funds coin: a brass disc with a raised diamond. Uses gradients (brass material, not an icon). */
  function coin(id = 'coin') {
    return svg(`
      <defs>
        <linearGradient id="${id}-a" x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" stop-color="#fbe7b0"/><stop offset="0.38" stop-color="#e3c078"/>
          <stop offset="0.72" stop-color="#b58e46"/><stop offset="1" stop-color="#6a4f22"/>
        </linearGradient>
        <linearGradient id="${id}-b" x1="0.85" y1="0.9" x2="0.15" y2="0.1">
          <stop offset="0" stop-color="#f3d699"/><stop offset="0.5" stop-color="#c9a35b"/><stop offset="1" stop-color="#7d5d27"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="34" r="27" fill="#2b1e0b" opacity="0.65"/>
      <circle cx="32" cy="32" r="27" fill="url(#${id}-a)" stroke="#3a2a10" stroke-width="2"/>
      <circle cx="32" cy="32" r="21" fill="url(#${id}-b)" stroke="#7d5d27" stroke-width="1.2"/>
      <circle cx="32" cy="32" r="23.6" fill="none" stroke="#fff2c8" stroke-opacity="0.35" stroke-width="0.8" stroke-dasharray="1.2 2.2"/>
      <path d="M32 18 L44 32 L32 46 L20 32 Z" fill="#7d5d27" transform="translate(1.2 1.6)" opacity="0.7"/>
      <path d="M32 18 L44 32 L32 46 L20 32 Z" fill="url(#${id}-a)" stroke="#5a4219" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M32 18 L44 32 L32 32 Z" fill="#fff4d2" opacity="0.38"/>
      <path d="M20 32 L32 46 L32 32 Z" fill="#3a2a10" opacity="0.25"/>
      <path d="M15 22 Q20 13 30 10.6" fill="none" stroke="#fffaf0" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>`);
  }

  /** A small diamond for prices and Funds in running text (the fonts have no U+25C6). */
  function diamond(color = 'currentColor') {
    return `<svg viewBox="0 0 10 12" class="dia" aria-hidden="true"><path d="M5 0.6 L9.4 6 L5 11.4 L0.6 6 Z" fill="${color}"/></svg>`;
  }
  function anchorGlyph(color = 'currentColor') {
    return `<svg viewBox="0 0 10 12" class="glyph" aria-hidden="true"><g fill="none" stroke="${color}" stroke-width="1.35" stroke-linecap="round"><circle cx="5" cy="2.3" r="1.3"/><path d="M5 3.6 V10.6 M2.6 5.2 H7.4 M1.2 7.6 Q1.8 10.7 5 10.7 Q8.2 10.7 8.8 7.6"/></g></svg>`;
  }
  function starGlyph(color = 'currentColor') {
    return `<svg viewBox="0 0 12 12" class="glyph" aria-hidden="true"><path d="M6 0.6 L7.6 4.3 L11.6 4.6 L8.6 7.2 L9.5 11.2 L6 9.1 L2.5 11.2 L3.4 7.2 L0.4 4.6 L4.4 4.3 Z" fill="${color}"/></svg>`;
  }
  function arrowGlyph(color = 'currentColor') {
    return `<svg viewBox="0 0 14 10" class="glyph" aria-hidden="true"><path d="M1 5 H12 M8.4 1.4 L12.2 5 L8.4 8.6" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  /** Bloc glyphs for chips and legends. */
  function blocGlyph(kind, color) {
    const p = {
      triangle: '<path d="M6 1.2 L11.2 10.4 L0.8 10.4 Z"/>',
      circle: '<circle cx="6" cy="6" r="4.8"/>',
      diamond: '<path d="M6 0.6 L11 6 L6 11.4 L1 6 Z"/>',
      square: '<rect x="1.4" y="1.4" width="9.2" height="9.2"/>',
      hexagon: '<path d="M6 0.8 L10.6 3.4 L10.6 8.6 L6 11.2 L1.4 8.6 L1.4 3.4 Z"/>',
    }[kind];
    return `<svg viewBox="0 0 12 12" class="glyph" aria-hidden="true"><g fill="${color}">${p}</g></svg>`;
  }

  window.WarIcons = {
    deskLamp,
    redPhone,
    shipsBell,
    foldedMap,
    telescope,
    satchel,
    morseKey,
    orderStamp,
    coin,
    diamond,
    anchorGlyph,
    starGlyph,
    arrowGlyph,
    blocGlyph,
    MATERIALS: M,
    INK,
  };
})();

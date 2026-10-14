/*
 * War room: shared builders for the art pages (Big Board, staff rail, OS chrome).
 * Each returns HTML positioned with the spec section 10 rects.
 */
(function () {
  'use strict';
  const I = window.WarIcons;

  function osStatus(time) {
    const ink = 'rgba(233,226,210,0.82)';
    return `<div class="abs os-status">
      <div class="time">${time}</div>
      <div class="icons">
        <svg width="18" height="11" viewBox="0 0 18 11"><g fill="${ink}"><rect x="0" y="7" width="3" height="4" rx="0.8"/><rect x="5" y="5" width="3" height="6" rx="0.8"/><rect x="10" y="2.5" width="3" height="8.5" rx="0.8"/><rect x="15" y="0" width="3" height="11" rx="0.8"/></g></svg>
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3" fill="none" stroke="rgba(233,226,210,0.5)"/><rect x="2" y="2" width="15" height="8" rx="1.6" fill="${ink}"/><rect x="22.6" y="4" width="1.8" height="4" rx="0.8" fill="rgba(233,226,210,0.5)"/></svg>
      </div></div>`;
  }

  /** One split-flap tile. opts.flipFrom shows it mid-flip from that character. */
  function flap(ch, w, h, size, opts = {}) {
    const blank = ch === ' ';
    const face =
      opts.flipFrom != null
        ? `<div class="ch top">${ch}</div><div class="ch bot">${opts.flipFrom}</div><div class="leaf"><div class="ch">${ch}</div></div>`
        : `<div class="ch">${blank ? '' : ch}</div>`;
    return `<div class="flap${blank ? ' blank' : ''}" style="width:${w}px; height:${h}px; font-size:${size}px;">${face}</div>`;
  }

  /** The clock, 17 pt mono on 12 x 20 tiles. */
  function clock(hh, mm) {
    const dot = '<i style="width:2.4px;height:2.4px;border-radius:50%;background:var(--text);opacity:.9"></i>';
    return `<div class="flaps" style="gap:1.5px">${flap(hh[0], 12, 20, 17)}${flap(hh[1], 12, 20, 17)}
      <div class="comma-plate" style="width:6px; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:4px;">${dot}${dot}</div>
      ${flap(mm[0], 12, 20, 17)}${flap(mm[1], 12, 20, 17)}</div>`;
  }

  /** Crisis dots: 'done' (linen), 'live' (alarm red), 'todo' (hollow). */
  function crisisDots(states) {
    const css = {
      done: 'background:rgba(233,226,210,0.7)',
      live: 'background:var(--alarm);box-shadow:0 0 6px rgba(255,90,78,.8)',
      todo: 'box-shadow:inset 0 0 0 1px rgba(233,226,210,0.45)',
    };
    return states.map((s) => `<i style="width:6px;height:6px;border-radius:50%;${css[s]}"></i>`).join('');
  }

  /**
   * The crisis total: 5 tiles of 21.5 x 32 at 28 pt, right-aligned in 112,60,124,32, with a
   * thousands comma set in the gutter between tiles 2 and 3.
   */
  function total(n, opts = {}) {
    const T = { w: 21.5, h: 32, size: 28, gap: 2, comma: 6 };
    const s = String(n).padStart(5, ' ');
    const tile = (i) => flap(s[i], T.w, T.h, T.size, i === 4 && opts.flipFrom != null ? { flipFrom: opts.flipFrom } : {});
    // The comma is a slot cut in a dark plate, lit from behind like the gaps between flaps.
    const comma = `<div class="comma-plate" style="width:${T.comma}px">${n >= 1000 ? '<span>,</span>' : ''}</div>`;
    return `<div class="flaps" style="justify-content:flex-end; gap:${T.gap}px; height:32px;">
      ${tile(0)}${tile(1)}${comma}${tile(2)}${tile(3)}${tile(4)}</div>`;
  }

  /**
   * The Big Board, 0,47,390,60, with everything the spec places on it.
   * b = { hh, mm, crisis, dots, summit, total, flipFrom, target, funds, heat, ruleFill, ruleDone, cleared }
   */
  function bigBoard(b) {
    const target = b.target.toLocaleString('en-GB');
    return `
      <div class="abs board${b.heat ? ' heat' : ''}">
        <div class="backlight"></div>
        <div class="divider" style="left:104px"></div>
        <div class="divider" style="left:299px"></div>
        <i class="rivet" style="left:5px; top:5px"></i><i class="rivet" style="right:5px; top:5px"></i>
        <i class="rivet" style="left:5px; bottom:9px"></i><i class="rivet" style="right:5px; bottom:9px"></i>
      </div>
      <div class="abs backlit soft" style="left:16px; top:51px; width:58px; height:20px;"></div>
      <div class="abs" style="left:16px; top:51px;">${clock(b.hh, b.mm)}</div>
      <div class="abs label" style="left:16px; top:73px; font-size:9px; line-height:9px; letter-spacing:0.16em; color:var(--text-2); display:flex; align-items:center; gap:5px;">
        ${b.crisis} <span style="display:inline-flex; gap:3px; margin-left:1px;">${crisisDots(b.dots)}</span>
      </div>
      ${
        b.summit
          ? `<div class="abs" style="left:16px; top:87px; height:12px; padding:0 4px; border-radius:2px; border:1px solid rgba(255,90,78,0.5); background:rgba(255,90,78,0.1); display:flex; align-items:center;">
        <span class="label" style="color:var(--alarm); letter-spacing:0.12em; line-height:8px;">SUMMIT: ${b.summit}</span></div>`
          : ''
      }
      <div class="abs label" style="left:112px; top:50px;">LEVERAGE</div>
      <div class="abs backlit${b.heat ? ' hot' : ''}" style="left:136px; top:60px; width:100px; height:32px;"></div>
      <div class="abs total${b.heat ? ' hot' : ''}" style="left:112px; top:60px; width:124px; height:32px;">${total(b.total, { flipFrom: b.flipFrom })}</div>
      <div class="abs" style="left:240px; top:73px; display:flex; align-items:baseline; gap:4px; color:rgba(255,90,78,0.92);">
        <span style="font:500 15px/15px var(--font-label); opacity:0.7">/</span>
        <span class="num" style="font:700 14px/14px var(--font-num); letter-spacing:-0.03em;">${target}</span>
      </div>
      ${b.cleared ? `<div class="abs stamp-cleared" style="left:108px; top:59px;">CLEARED</div>` : ''}
      <div class="abs funds" style="left:304px; top:57px; width:70px; height:40px;">
        <div class="coin">${I.coin('fc')}</div>
        <div class="amount num">${b.funds}</div>
      </div>
      <div class="abs rule${b.ruleDone ? ' done' : ''}"><div class="fill" style="width:${Math.round(390 * Math.min(1, b.ruleFill))}px"></div></div>`;
  }

  /** The staff rail, 0,107,390,64; seats of 64 x 58 at x = 17, 90, 163, 236, 309, y = 110. */
  function rail(seats) {
    const xs = [17, 90, 163, 236, 309];
    const body = seats
      .map((s, i) => {
        const x = xs[i];
        if (!s)
          return `<div class="abs seat empty" style="left:${x}px; top:110px;"><div class="felt"><div class="no">${i + 1}</div><div class="vacant">VACANT</div></div></div>`;
        const shadow = s.firing ? `<div class="abs seat-shadow" style="left:${x + 4}px; top:164px;"></div>` : '';
        return `${shadow}<div class="abs seat ${s.rarity}${s.firing ? ' firing' : ''}" style="left:${x}px; top:110px;">
          <div class="felt"><div class="no">${i + 1}</div><div class="obj">${s.icon}</div><div class="chip">${s.chip}</div></div></div>`;
      })
      .join('');
    return `<div class="abs rail"><div class="stitch" style="top:2.5px"></div><div class="stitch" style="top:60.5px"></div></div>${body}`;
  }

  /** The seats used across the frames. */
  const STAFF = {
    duty: { rarity: 'common', icon: () => I.deskLamp(), chip: '<span class="m">+4M</span>' },
    hotline: { rarity: 'common', icon: () => I.redPhone(), chip: '<span class="m">+8M</span><span class="k">&middot;3</span>' },
    harbour: { rarity: 'common', icon: () => I.shipsBell(), chip: () => `<span class="i">+15</span>${I.anchorGlyph('var(--influence)')}` },
    strategist: { rarity: 'uncommon', icon: () => I.foldedMap(), chip: '<span class="m">&times;2</span><span class="k">&middot;4</span>' },
  };
  function seatOf(key, extra = {}) {
    const s = STAFF[key];
    return Object.assign({ rarity: s.rarity, icon: s.icon(), chip: typeof s.chip === 'function' ? s.chip() : s.chip }, extra);
  }

  /** Wait for every face the page uses, so canvas text never falls back. */
  function fontsReady() {
    return Promise.all(
      [
        '400 9px "Barlow Condensed"',
        '500 9px "Barlow Condensed"',
        '600 9px "Barlow Condensed"',
        '700 9px "Barlow Condensed"',
        '400 9px "JetBrains Mono"',
        '700 9px "JetBrains Mono"',
        '800 9px "JetBrains Mono"',
        '400 20px "Saira Stencil One"',
      ].map((f) => document.fonts.load(f)),
    ).then(() => document.fonts.ready);
  }

  window.WarKit = { osStatus, flap, clock, crisisDots, total, bigBoard, rail, seatOf, fontsReady };
})();

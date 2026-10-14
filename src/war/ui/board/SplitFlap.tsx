/**
 * Split-flap tiles (STYLE 5.2). Each tile flips through a few intermediate characters to its new
 * one: the upper leaf falls about the cut, then the lower leaf lands with a small overshoot.
 * Tiles flip right to left in a cascade. Reduced motion swaps characters with a short fade.
 * Separators (',' '.' ':') are narrow plates whose slot glows with the board's backlight.
 */
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

export interface FlapStyle {
  /** Tile width and height in px, glyph size in px. */
  w: number;
  h: number;
  size: number;
  gap: number;
  /** Width of a separator plate. */
  sep: number;
  /** 'steel': steel tiles with a cut and hinges; 'bare': glyphs only (the readout boxes). */
  skin: 'steel' | 'bare';
}

export interface FlapMotion {
  /** Flips per changed tile (the last lands on the new character). */
  flips: number;
  /** One flip, ms. */
  flipMs: number;
  /** Delay between neighbouring tiles, right to left. */
  stagger: number;
  /** No flips: characters swap with a 120 ms fade. */
  instant: boolean;
  reduced: boolean;
}

const SEPARATORS = new Set([',', '.', ':']);
const DIGITS = '0123456789';
const LETTERS = 'ABCDEFGHIKLMNOPRSTUVWY';

/** Splits text into tiles, padding blank tiles on the left up to `minTiles`. */
export function tilesOf(text: string, minTiles: number): string[] {
  const chars = Array.from(text);
  const tiles = chars.filter((c) => !SEPARATORS.has(c)).length;
  return [...Array<string>(Math.max(0, minTiles - tiles)).fill(' '), ...chars];
}

interface RowProps {
  text: string;
  style: FlapStyle;
  motion: FlapMotion;
  minTiles?: number;
  /** Fit the row into this width by narrowing the tiles. */
  maxWidth?: number;
  /** On mount, start from this text and flip to `text` with `fromMotion` (the boxes' base flip). */
  from?: string;
  fromMotion?: FlapMotion;
  class?: string;
}

export function FlapRow({ text, style, motion, minTiles = 0, maxWidth, from, fromMotion, class: cls }: RowProps): JSX.Element {
  // `from` applies to the row's first render only; tiles added later just appear.
  const rowMounted = useRef(false);
  useEffect(() => {
    rowMounted.current = true;
  }, []);
  const chars = tilesOf(text, minTiles);
  const nTiles = chars.filter((c) => !SEPARATORS.has(c)).length;
  const nSeps = chars.length - nTiles;
  let w = style.w;
  if (maxWidth) {
    const need = nTiles * style.w + nSeps * style.sep + (chars.length - 1) * style.gap;
    if (need > maxWidth) w = (maxWidth - nSeps * style.sep - (chars.length - 1) * style.gap) / nTiles;
  }
  const size = style.size * (w / style.w);
  // Keys count from the right so a tile keeps its identity as the number grows leftwards.
  const fromTiles =
    from === undefined || rowMounted.current ? null : tilesOf(from, chars.length).filter((c) => !SEPARATORS.has(c)).reverse();
  let tileFromRight = 0;
  const cells = chars.map((c, i) => ({ c, key: chars.length - 1 - i })).reverse();
  const out = cells.map(({ c, key }) => {
    if (SEPARATORS.has(c)) {
      return <Separator key={`s${key}`} ch={c} w={style.sep} h={style.h} skin={style.skin} />;
    }
    const i = tileFromRight++;
    const initial = fromTiles ? (fromTiles[i] ?? ' ') : undefined;
    const m = initial !== undefined && fromMotion ? fromMotion : motion;
    const delay = m.instant ? 0 : i * m.stagger;
    return (
      <Flap key={`t${key}`} ch={c} initial={initial} w={w} h={style.h} size={size} delay={delay} motion={m} skin={style.skin} />
    );
  });
  out.reverse();
  // The tiles are drawn glyph by glyph; assistive tech (and tests) read the settled text instead.
  return (
    <div class={`flap-row ${cls ?? ''}`} style={{ gap: `${style.gap}px` }} role="img" aria-label={text.trim() || ' '}>
      {out}
    </div>
  );
}

function Separator({ ch, w, h, skin }: { ch: string; w: number; h: number; skin: FlapStyle['skin'] }): JSX.Element {
  if (ch === ':') {
    return (
      <div class={`flap-sep colon ${skin}`} style={{ width: `${w}px`, height: `${h}px` }}>
        <i />
        <i />
      </div>
    );
  }
  return (
    <div class={`flap-sep ${skin}`} style={{ width: `${w}px`, height: `${h}px` }}>
      <span style={{ fontSize: `${Math.round(h * 0.56)}px` }}>{ch}</span>
    </div>
  );
}

interface FlapProps {
  ch: string;
  /** The character on show at mount, if it differs from `ch` (it flips in). */
  initial?: string;
  w: number;
  h: number;
  size: number;
  delay: number;
  motion: FlapMotion;
  skin: FlapStyle['skin'];
}

/** One tile. Animates imperatively: a flip touches four layers and must not re-render the row. */
function Flap({ ch, initial, w, h, size, delay, motion, skin }: FlapProps): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const shownCh = useRef(initial ?? ch);
  const mounted = useRef(false);
  const timers = useRef<number[]>([]);
  const anims = useRef<Animation[]>([]);

  /** Layers: 'fh top' / 'fh bot' are the static halves, 'fl top' / 'fl bot' the moving leaves. */
  const layer = (name: string) => root.current?.querySelector<HTMLElement>(`.${name.replace(' ', '.')}`) ?? null;
  const setText = (name: string, c: string) => {
    const g = layer(name)?.firstElementChild;
    if (g) g.textContent = c === ' ' ? '' : c;
  };
  const settle = (c: string) => {
    shownCh.current = c;
    for (const n of ['fh top', 'fh bot', 'fl top', 'fl bot']) setText(n, c);
    for (const n of ['fl top', 'fl bot']) {
      const el = layer(n);
      if (el) el.style.visibility = 'hidden';
    }
    root.current?.classList.toggle('blank', c === ' ');
  };
  const cancel = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    anims.current.forEach((a) => a.cancel());
    anims.current = [];
  };

  useEffect(() => () => cancel(), []);

  useLayoutEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    // The glyph layers are written here, never by render, so a re-render can't cut a flip short.
    if (first) settle(shownCh.current);
    const flipping = timers.current.length > 0 || anims.current.length > 0;
    if (ch === shownCh.current && !flipping) return;
    cancel();
    const el = root.current;
    if (!el) return;
    if (ch === shownCh.current) {
      // A flip was heading elsewhere and the target came back: stop on this character.
      settle(ch);
      return;
    }
    if ((motion.instant && !first) || motion.reduced || typeof el.animate !== 'function') {
      const from = shownCh.current;
      settle(ch);
      if (motion.reduced && from !== ch && typeof el.animate === 'function') {
        anims.current.push(el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 120, easing: 'ease-out' }));
      }
      return;
    }
    // The flip sequence: a few intermediate digits, then the new character.
    // Letters flip through letters, everything else through digits, like a real drum.
    const pool = /[A-Z]/.test(ch) ? LETTERS : DIGITS;
    const seq: string[] = [];
    for (let i = 0; i < motion.flips - 1; i++) {
      const prev = seq[i - 1] ?? shownCh.current;
      let d = pool[Math.floor(Math.random() * pool.length)];
      if (d === prev) d = pool[(pool.indexOf(d) + 3) % pool.length];
      seq.push(d);
    }
    seq.push(ch);
    const step = (i: number) => {
      if (i >= seq.length) {
        timers.current = [];
        anims.current = [];
        return;
      }
      flipOnce(seq[i], () => step(i + 1));
    };
    timers.current.push(window.setTimeout(() => step(0), delay));
  }, [ch]);

  /** One flip from the character on show to `next`. */
  function flipOnce(next: string, done: () => void): void {
    const from = shownCh.current;
    const top = layer('fl top');
    const bot = layer('fl bot');
    if (!top || !bot) return done();
    // Static halves: the new top is already behind the falling leaf; the old bottom stays until the leaf lands.
    setText('fh top', next);
    setText('fl top', from);
    setText('fl bot', next);
    root.current?.classList.toggle('blank', false);
    top.style.visibility = 'visible';
    bot.style.visibility = 'hidden';
    const fall = motion.flipMs * 0.55;
    const land = motion.flipMs - fall;
    const a = top.animate(
      [
        { transform: 'perspective(70px) rotateX(0deg)', filter: 'brightness(1)' },
        { transform: 'perspective(70px) rotateX(-90deg)', filter: 'brightness(0.55)' },
      ],
      { duration: fall, easing: 'cubic-bezier(0.5, 0, 0.9, 0.4)', fill: 'forwards' },
    );
    anims.current.push(a);
    a.onfinish = () => {
      top.style.visibility = 'hidden';
      bot.style.visibility = 'visible';
      const b = bot.animate(
        [
          { transform: 'perspective(70px) rotateX(90deg)', filter: 'brightness(0.62)' },
          { transform: 'perspective(70px) rotateX(0deg)', filter: 'brightness(1)' },
        ],
        { duration: land, easing: 'cubic-bezier(0.2, 1.35, 0.5, 1)', fill: 'forwards' },
      );
      anims.current.push(b);
      b.onfinish = () => {
        setText('fh bot', next);
        shownCh.current = next;
        bot.style.visibility = 'hidden';
        root.current?.classList.toggle('blank', next === ' ');
        done();
      };
    };
  }

  return (
    <div
      ref={root}
      class={`flap ${skin}${(initial ?? ch) === ' ' ? ' blank' : ''}`}
      style={{ width: `${w}px`, height: `${h}px`, fontSize: `${size}px`, '--fh': `${h}px` } as JSX.CSSProperties}
    >
      <div class="fh top">
        <span class="g" />
      </div>
      <div class="fh bot">
        <span class="g" />
      </div>
      <div class="fl top">
        <span class="g" />
      </div>
      <div class="fl bot">
        <span class="g" />
      </div>
    </div>
  );
}

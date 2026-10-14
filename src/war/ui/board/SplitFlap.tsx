/**
 * Split-flap tiles (STYLE 5.2). Each tile flips to its new character: the upper leaf falls about the
 * cut, then the lower leaf lands with a small overshoot. A tile only ever passes through characters
 * that lie between the old and the new one (a digit counting up, a unit stepping K, M, B, T), so a
 * flip never shows a number that is not on its way. Tiles flip right to left in a cascade. Reduced
 * motion swaps characters with a short fade. Separators (',' '.' ':') are narrow plates whose slot
 * glows with the board's backlight.
 */
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { audio } from '../../../audio';
import { flipPath } from './flip';

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
  /** Play a flap click at this intensity as each leaf lands (the Big Board's clatter). */
  click?: number;
  /**
   * Each new character starts from the last one landed: a flip still under way lands at once.
   * With no stagger, every tile of a counting number moves in step, so the row only ever shows a
   * value it was given (an odometer roll never overshoots while one tile lags).
   */
  atomic?: boolean;
}

const SEPARATORS = new Set([',', '.', ':']);
const DIGIT = /^\d$/;

/** Leaves landing together click 10 ms apart, a quick rattle rather than one lost click. */
const CLICK_GAP_MS = 10;
let nextClickAt = 0;

function flapClick(intensity: number): void {
  const now = performance.now();
  const at = Math.max(now, nextClickAt);
  nextClickAt = at + CLICK_GAP_MS;
  if (at - now < 1) audio.play('flap', { intensity });
  else window.setTimeout(() => audio.play('flap', { intensity }), at - now);
}

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
  /** On mount, start from this text and flip to `text` with `fromMotion`. */
  from?: string;
  fromMotion?: FlapMotion;
  /** Draw the blank padding tiles unpowered (no backlight behind them, darker steel). */
  unlitPadding?: boolean;
  class?: string;
}

export function FlapRow({ text, style, motion, minTiles = 0, maxWidth, from, fromMotion, unlitPadding, class: cls }: RowProps): JSX.Element {
  // `from` applies to the row's first render only; a tile added later (a number gaining a digit)
  // flips in from blank with its neighbours, never appearing already set ahead of them.
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
  const textTiles = nTiles - (chars.length - Array.from(text).length);
  const cells = chars.map((c, i) => ({ c, key: chars.length - 1 - i })).reverse();
  const out = cells.map(({ c, key }) => {
    if (SEPARATORS.has(c)) {
      return <Separator key={`s${key}`} ch={c} w={style.sep} h={style.h} skin={style.skin} />;
    }
    const i = tileFromRight++;
    const initial = fromTiles ? (fromTiles[i] ?? ' ') : rowMounted.current ? ' ' : undefined;
    const m = initial !== undefined && fromMotion ? fromMotion : motion;
    const delay = m.instant ? 0 : i * m.stagger;
    const unlit = !!unlitPadding && i >= textTiles;
    return (
      <Flap
        key={`t${key}`}
        ch={c}
        step={m.atomic ? text : undefined}
        initial={initial}
        w={w}
        h={style.h}
        size={size}
        delay={delay}
        motion={m}
        skin={style.skin}
        unlit={unlit}
      />
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
  /**
   * Atomic rows only: the row's whole text. A new step lands every tile's flip at once, those whose
   * own character does not change included, so no tile is ever a step behind its neighbours.
   */
  step?: string;
  /** The character on show at mount, if it differs from `ch` (it flips in). */
  initial?: string;
  w: number;
  h: number;
  size: number;
  delay: number;
  motion: FlapMotion;
  skin: FlapStyle['skin'];
  /** A padding tile with no power behind it. */
  unlit: boolean;
}

/** One tile. Animates imperatively: a flip touches four layers and must not re-render the row. */
function Flap({ ch, step, initial, w, h, size, delay, motion, skin, unlit }: FlapProps): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const shownCh = useRef(initial ?? ch);
  const mounted = useRef(false);
  const timers = useRef<number[]>([]);
  const anims = useRef<Animation[]>([]);
  /** Reduced motion's swap fade (never a flip). */
  const fade = useRef<Animation | null>(null);

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
    fade.current?.cancel();
    fade.current = null;
  };

  useEffect(() => () => cancel(), []);

  // The latest character asked for, and the latest motion: a flip under way always lands (with its
  // click), then the tile carries on towards whatever is wanted by then. On a slow frame rate the
  // tile skips steps rather than cutting leaves short.
  const want = useRef(ch);
  const motionNow = useRef(motion);
  motionNow.current = motion;
  /** The leaves still to show on the way to `to`. */
  const plan = useRef<{ to: string; seq: string[] }>({ to: ch, seq: [] });

  useLayoutEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    const wanted = want.current;
    want.current = ch;
    // The glyph layers are written here, never by render, so a re-render can't cut a flip short.
    if (first) settle(shownCh.current);
    const el = root.current;
    if (!el) return;
    const m = motionNow.current;
    if (m.instant || m.reduced || typeof el.animate !== 'function') {
      cancel();
      plan.current = { to: ch, seq: [] };
      const from = shownCh.current;
      settle(ch);
      if (m.reduced && from !== ch && typeof el.animate === 'function') {
        // The fade is not a flip, so it is kept apart from the flips: a finished fade must never hold
        // up the flips that come after it (motion can be switched back to full mid-run).
        fade.current?.cancel();
        fade.current = el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 120, easing: 'ease-out' });
      }
      return;
    }
    const busy = timers.current.length > 0 || anims.current.length > 0;
    if (busy && m.atomic) {
      // Land the flip under way on what it was heading for, then flip on from there.
      cancel();
      settle(wanted);
      plan.current = { to: ch, seq: [] };
    } else if (busy) {
      return;
    }
    if (ch === shownCh.current) return;
    // An atomic row starts every tile's flip in this same commit, so they all fall in one frame.
    if (m.atomic && delay === 0) advance();
    else timers.current.push(window.setTimeout(advance, delay));
  }, [ch, step]);

  /** Flip one leaf towards the wanted character, then keep going until it is on show. */
  function advance(): void {
    timers.current = [];
    anims.current = [];
    // A new target replans from the character on show: only characters on the way to it.
    if (plan.current.to !== want.current || !plan.current.seq.length) {
      plan.current = { to: want.current, seq: flipPath(shownCh.current, want.current, motionNow.current.flips) };
    }
    const next = plan.current.seq.shift();
    if (next === undefined) return;
    flipOnce(next, advance);
  }

  /** One flip from the character on show to `next`. */
  function flipOnce(next: string, done: () => void): void {
    // A counting row powers a blank tile up as a 0 first, so no blank sits between lit digits.
    const from = shownCh.current === ' ' && motionNow.current.atomic && DIGIT.test(next) ? '0' : shownCh.current;
    const top = layer('fl top');
    const bot = layer('fl bot');
    if (!top || !bot) return done();
    // Static halves: the new top is already behind the falling leaf; the old bottom stays until the leaf lands.
    setText('fh top', next);
    setText('fh bot', from);
    setText('fl top', from);
    setText('fl bot', next);
    root.current?.classList.toggle('blank', false);
    top.style.visibility = 'visible';
    bot.style.visibility = 'hidden';
    const fall = motionNow.current.flipMs * 0.55;
    const land = motionNow.current.flipMs - fall;
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
        const click = motionNow.current.click;
        if (click) flapClick(click);
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
      class={`flap ${skin}${(initial ?? ch) === ' ' ? ' blank' : ''}${unlit ? ' unlit' : ''}`}
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

/**
 * The paper parts: everything on the desk that is not the map, as Preact components in the art
 * director's look. Each takes its words as props (the screens builder reads them from strings.yaml
 * and the content; nothing here says BRINK or any game word), carries the mock's position as a
 * class the screens may override, and animates only where the look does (the stamp slams, a tape
 * line feeds in), with nothing under reduced motion (paper.css).
 */
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { pencilLine } from './strokes';
import { seedOf } from './rand';

type Children = { children?: ComponentChildren };

/** The whole frame: the room under the lamp. The map, the objects and the lamp go inside. */
export function PaperRoom({ call = false, reduced = false, class: cls, children }: { call?: boolean; reduced?: boolean; class?: string } & Children) {
  return <div class={`pp-room${call ? ' pp-room-call' : ''}${reduced ? ' pp-reduced' : ''}${cls ? ` ${cls}` : ''}`}>{children}</div>;
}

/** The paper grain: two turbulence filters over the frame, rendered once. */
export function Grain({ id = 'ppg' }: { id?: string }) {
  return (
    <svg class="pp-grain" width="390" height="844" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <filter id={`${id}-g`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="2" stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.72  0 0 0 0 0.66  0 0 0 0 0.56  0 0 0 0 1" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.5" intercept="0.5" />
        </feComponentTransfer>
        <feBlend in2="SourceGraphic" mode="multiply" />
      </filter>
      <filter id={`${id}-f`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="5" stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.78  0 0 0 0 0.62  0 0 0 0 1" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.35" intercept="0.65" />
        </feComponentTransfer>
      </filter>
      <rect width="390" height="844" filter={`url(#${id}-f)`} opacity="0.42" />
      <rect width="390" height="844" filter={`url(#${id}-g)`} opacity="0.4" />
    </svg>
  );
}

/** The lamp's pool and the vignette (last in the day frame; right after the map in the call). */
export function Lamp() {
  return (
    <>
      <div class="pp-lamp2" />
      <div class="pp-lamp" />
    </>
  );
}

/** The call's dim over the sheet. */
export function Dim() {
  return <div class="pp-dim" />;
}

/** The neat line round the sheet. */
export function NeatLine() {
  return <div class="pp-neat" />;
}

/** The printed title at the head of the sheet (the brand, passed in). */
export function SheetTitle({ text }: { text: string }) {
  return <div class="pp-title">{text}</div>;
}

export function Paperclip() {
  return (
    <svg class="pp-clip" width="14" height="34" viewBox="0 0 14 34" aria-hidden="true">
      <path d="M3.5 30V6.5a3.5 3.5 0 0 1 7 0V26a2.2 2.2 0 0 1-4.4 0V9" fill="none" stroke="#8c8a84" stroke-width="1.3" />
      <path d="M3.5 30V6.5a3.5 3.5 0 0 1 7 0V26a2.2 2.2 0 0 1-4.4 0V9" fill="none" stroke="#e8e6df" stroke-width="0.5" transform="translate(-0.4 -0.4)" />
    </svg>
  );
}

/** A pencil underline for a typed word (an svg stretched to the word). */
export function PencilUnderline({ seed }: { seed: number | string }) {
  return (
    <svg viewBox="0 0 100 7" preserveAspectRatio="none" aria-hidden="true">
      <path d={pencilLine(1, 3.5, 99, 3.2, seed, 0.9, 7)} fill="none" stroke="#2f2a24" stroke-width="1.6" stroke-opacity=".8" stroke-linecap="round" />
    </svg>
  );
}

// ------------------------------------------------------------------ the day frame

export interface CalendarProps {
  /** The header word (WEEK). */
  head: string;
  /** The big number. */
  n: number;
  /** The small words after it ("of 8"). */
  of?: string;
  /** The scribbled note's word (influence) and value. */
  note: string;
  value: number | string;
}

/** The desk calendar: WEEK n of 8, influence scribbled under it. */
export function Calendar({ head, n, of, note, value }: CalendarProps) {
  return (
    <div class="pp-obj pp-cal">
      <div class="hd">
        <i />
        {head}
        <i />
      </div>
      <div class="num">
        {n}
        {of ? <small>{of}</small> : null}
      </div>
      <div class="nt pp-hand">
        {note} <b>{value}</b>
      </div>
    </div>
  );
}

/** The WAR bar: `max` pencil boxes (eight in SPEC-SMALL v6), the fighting ones hatched red. */
export function WarBoxes({ count, max = 12, id = 'ppc' }: { count: number; max?: number; id?: string }) {
  const step = 115 / max;
  const filled = Math.max(0, Math.min(max, count));
  return (
    <svg class="bar" width="118" height="14" viewBox="0 0 118 14" aria-hidden="true">
      <defs>
        <pattern id={`${id}-hatchcard`} width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
          <path d="M0 0V3.2" stroke="#b5261b" stroke-width="1.1" stroke-opacity=".75" />
        </pattern>
      </defs>
      <path d="M1 11.5H116" stroke="#4e4436" stroke-width="0.8" stroke-opacity=".8" />
      <path d="M1 3.5H116" stroke="#4e4436" stroke-width="0.6" stroke-opacity=".5" />
      {Array.from({ length: max + 1 }, (_, i) => (
        <path key={i} d={`M${(1 + i * step).toFixed(1)} 2.6V12.6`} stroke="#4e4436" stroke-width={i === 0 || i === max ? 0.9 : 0.5} stroke-opacity=".7" />
      ))}
      {Array.from({ length: filled }, (_, i) => {
        const x = 1.4 + i * step;
        return (
          <g key={i}>
            <rect x={x.toFixed(1)} y="3.8" width={(step - 0.4).toFixed(1)} height="7.6" fill={`url(#${id}-hatchcard)`} />
            <path d={`M${x.toFixed(1)} 3.8h${(step - 0.4).toFixed(1)}v7.6h-${(step - 0.4).toFixed(1)}z`} fill="none" stroke="#b5261b" stroke-width="0.8" stroke-opacity=".8" />
          </g>
        );
      })}
    </svg>
  );
}

/** The TREATY bar: a blue pencil-hatched share of the line. */
export function TreatyBar({ value, id = 'ppc' }: { value: number; id?: string }) {
  const w = (Math.max(0, Math.min(100, value)) / 100) * 115;
  return (
    <svg class="bar" width="118" height="14" viewBox="0 0 118 14" aria-hidden="true">
      <defs>
        <pattern id={`${id}-hatchblue`} width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
          <path d="M0 0V3.2" stroke="#2457a3" stroke-width="1.1" stroke-opacity=".7" />
        </pattern>
      </defs>
      <path d="M1 11.5H116" stroke="#4e4436" stroke-width="0.8" stroke-opacity=".8" />
      <path d="M1 3.5H116" stroke="#4e4436" stroke-width="0.6" stroke-opacity=".5" />
      <path d="M1 2.6V12.6M116 2.6V12.6" stroke="#4e4436" stroke-width="0.9" stroke-opacity=".7" />
      {[1, 2, 3].map((i) => (
        <path key={i} d={`M${(1 + (i * 115) / 4).toFixed(1)} 9.4V12.6`} stroke="#4e4436" stroke-width="0.5" stroke-opacity=".6" />
      ))}
      {w > 0.5 ? (
        <>
          <rect x="1.4" y="3.8" width={w.toFixed(1)} height="7.6" fill={`url(#${id}-hatchblue)`} />
          <path d={`M1.4 3.8h${w.toFixed(1)}v7.6h-${w.toFixed(1)}z`} fill="none" stroke="#2457a3" stroke-width="0.8" stroke-opacity=".75" />
        </>
      ) : null}
    </svg>
  );
}

/** The red rubber stamp. A word that changes after the first render slams in (nothing under reduced motion). */
export function Stamp({ word, seed = 4, id = 'pps' }: { word: string; seed?: number; id?: string }) {
  const long = word.length > 7;
  const first = useRef(true);
  const [slam, setSlam] = useState(0);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSlam((k) => k + 1);
  }, [word]);
  return (
    <svg class={`pp-stamp${slam ? ' pp-slamming' : ''}`} viewBox="0 0 122 40" key={slam} aria-hidden="false" role="img" aria-label={word}>
      <filter id={`${id}-f`} x="-10%" y="-20%" width="120%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" seed={seed} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.05" result="m" />
        <feComposite in="SourceGraphic" in2="m" operator="in" />
      </filter>
      <g transform="rotate(-7 61 20)" filter={`url(#${id}-f)`}>
        <rect x="7" y="7" width="108" height="26" fill="none" stroke="#b4231a" stroke-width="2" />
        <rect x="10" y="10" width="102" height="20" fill="none" stroke="#b4231a" stroke-width="0.7" />
        <text x="61" y="26.5" text-anchor="middle" class={long ? 'long' : undefined}>
          {word}
        </text>
      </g>
    </svg>
  );
}

export interface IndexCardProps {
  war: { label: string; count: number; max?: number; sub: string; last: string };
  treaty: { label: string; value: number; sub: string };
  they: { label: string; word: string };
  /** The typed slip at the foot: what the week needs (SEND ORDERS). Omit it to leave the foot bare. */
  slip?: { text: string; onTap?: () => void; disabled?: boolean };
  /** The handwritten line at the foot instead of a slip (the call mock's "next call"). */
  foot?: string;
}

/** The index card paper-clipped to the corner: WAR, TREATY, THEY ARE, and the week's slip. */
export function IndexCard({ war, treaty, they, slip, foot }: IndexCardProps) {
  return (
    <div class="pp-obj pp-card pp-ty">
      <Paperclip />
      <div class="row">
        <div class="lab">{war.label}</div>
        <WarBoxes count={war.count} max={war.max ?? 12} />
        <div class="sub">{war.sub}</div>
        <div class="ww">{war.last}</div>
      </div>
      <div class="row">
        <div class="lab">{treaty.label}</div>
        <TreatyBar value={treaty.value} />
        <div class="val">{Math.round(treaty.value)}%</div>
        <div class="sub">{treaty.sub}</div>
      </div>
      <div class="they">
        <div class="lab">{they.label}</div>
        <Stamp word={they.word} />
      </div>
      {slip ? (
        <button type="button" class="send pp-ty" onClick={slip.onTap} disabled={slip.disabled}>
          {slip.text}
          <PencilUnderline seed={seedOf('send:' + slip.text)} />
        </button>
      ) : foot ? (
        <div class="nc pp-hand">{foot}</div>
      ) : null}
    </div>
  );
}

/** The handwritten situation note on the sheet. */
export function Note({ text, class: cls }: { text: string; class?: string }) {
  return (
    <div class={`pp-note pp-hand${cls ? ` ${cls}` : ''}`}>
      <span>{text}</span>
    </div>
  );
}

/** The intel slip. */
export function IntelSlip({ head, text }: { head: string; text: string }) {
  return (
    <div class="pp-obj pp-intel pp-ty">
      <b>{head}</b>
      {text}
    </div>
  );
}

export interface TapeLine {
  /** The small mark before the line (a time, a week), optional. */
  tag?: string;
  text: string;
  /** A line that is feeding in now (the resolve playback). */
  feed?: boolean;
  key?: string;
}

/** The teleprinter tape: the last lines of headline, newest last. */
export function Tape({ lines }: { lines: TapeLine[] }) {
  return (
    <div class="pp-obj pp-tape pp-ty" aria-live="polite">
      {lines.map((l, i) => (
        <div class={`ln${l.feed ? ' pp-feed' : ''}`} key={l.key ?? `${i}:${l.text}`}>
          {l.tag ? <i>{l.tag}</i> : null}
          {l.text}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ the call

/** The clock on the dark flip tag. */
export function FlipClock({ big, small }: { big: string; small: string }) {
  return (
    <div class="pp-clock pp-ty">
      {big}
      <small>{small}</small>
    </div>
  );
}

const CUP_HOLES = (cx: number) =>
  [0, 1, 2, 3, 4, 5].map((a) => ({ x: cx + 7 * Math.cos((a * Math.PI) / 3), y: 4 + 5 * Math.sin((a * Math.PI) / 3) })).concat([{ x: cx, y: 4 }]);

const CORD = (() => {
  const x0 = 31;
  const y0 = 131;
  const x1 = -4;
  const y1 = 166;
  const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  const loops = 11;
  return Array.from({ length: loops }, (_, i) => {
    const t = i / (loops - 1);
    return { cx: x0 + (x1 - x0) * t, cy: y0 + (y1 - y0) * t, rot: ang + 90 };
  });
})();

/** The bakelite handset off the hook, its cord running off the frame. */
export function Handset({ id = 'pph', label = 'Handset off the hook' }: { id?: string; label?: string }) {
  return (
    <svg class="pp-handset" viewBox="0 0 270 172" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${id}-bk`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#4a4541" />
          <stop offset=".35" stop-color="#1d1a18" />
          <stop offset="1" stop-color="#090807" />
        </linearGradient>
        <radialGradient id={`${id}-cup`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stop-color="#5a544f" />
          <stop offset=".5" stop-color="#1f1c1a" />
          <stop offset="1" stop-color="#070606" />
        </radialGradient>
        <filter id={`${id}-sh`} x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <g transform="translate(150 78) rotate(-24)">
        <g filter={`url(#${id}-sh)`} opacity=".55" transform="translate(-6 14)">
          <rect x="-96" y="-10" width="192" height="22" rx="11" fill="#1a0f04" />
          <ellipse cx="-100" cy="4" rx="30" ry="22" fill="#1a0f04" />
          <ellipse cx="100" cy="4" rx="30" ry="22" fill="#1a0f04" />
        </g>
        <rect x="-98" y="-12" width="196" height="24" rx="12" fill={`url(#${id}-bk)`} />
        <path d="M-80 -6q80-5 160 0" stroke="#6b655f" stroke-width="1.2" fill="none" opacity=".55" />
        <ellipse cx="-104" cy="2" rx="31" ry="23" fill={`url(#${id}-cup)`} />
        <ellipse cx="104" cy="2" rx="31" ry="23" fill={`url(#${id}-cup)`} />
        <ellipse cx="-104" cy="4" rx="17" ry="12" fill="#0b0a09" />
        <ellipse cx="104" cy="4" rx="17" ry="12" fill="#0b0a09" />
        <g fill="#2a2522">
          {CUP_HOLES(-104)
            .concat(CUP_HOLES(104))
            .map((h, i) => (
              <circle key={i} cx={h.x.toFixed(1)} cy={h.y.toFixed(1)} r="1.6" />
            ))}
        </g>
        <path d="M-118 -12q-10-8 -6-20" stroke="#8a847d" stroke-width="1" fill="none" opacity=".5" />
      </g>
      <g>
        {CORD.map((c, i) => (
          <ellipse key={i} cx={c.cx.toFixed(1)} cy={c.cy.toFixed(1)} rx="2.6" ry="5.4" transform={`rotate(${c.rot.toFixed(1)} ${c.cx.toFixed(1)} ${c.cy.toFixed(1)})`} fill="none" stroke="#141110" stroke-width="1.9" />
        ))}
        <path d="M31 131L-4 166" stroke="#141110" stroke-width="1" fill="none" />
      </g>
    </svg>
  );
}

export interface CallerCardProps {
  /** The caller's name, typed in capitals. */
  name: string;
  /** The small word before the role, in the hand ("the"). */
  lead?: string;
  /** The role, in the hand, bold ("Hawk"). */
  role: string;
  /** The message: forty words, never more. */
  text: string;
  /** A small red word at the top right (RINGING), optional. */
  ring?: string;
}

/** The caller card, paper-clipped. */
export function CallerCard({ name, lead, role, text, ring }: CallerCardProps) {
  return (
    <div class="pp-obj pp-caller pp-ty">
      <Paperclip />
      {ring ? <div class="ring">{ring}</div> : null}
      <div class="who">{name}</div>
      <div class="role pp-hand">
        {lead ? `${lead} ` : ''}
        <b>{role}</b>
      </div>
      <div class="msg">{text}</div>
    </div>
  );
}

/** A torn adviser slip: who (small capitals) and the line. `n` picks one of the three tears and positions. */
export function TornSlip({ who, text, n }: { who: string; text: string; n: 1 | 2 | 3 }) {
  return (
    <div class={`pp-obj pp-slip pp-s${n} pp-ty`}>
      <span class="who">{who}</span>
      <div class="q">{text}</div>
    </div>
  );
}

export interface TypedFormProps {
  /** The typed word (BACK IT). */
  word: string;
  /** Its cost in plain words. */
  cost: string;
  /** The pencilled number at the right and the slot (1..3). */
  n: 1 | 2 | 3;
  onTap?: () => void;
  disabled?: boolean;
}

/** A typed form with a pencil underline: one of the three choices. A button. */
export function TypedForm({ word, cost, n, onTap, disabled }: TypedFormProps) {
  return (
    <button type="button" class={`pp-obj pp-ch pp-c${n} pp-ty`} onClick={onTap} disabled={disabled}>
      <div class="w">
        {word}
        <PencilUnderline seed={30 + n} />
      </div>
      <div class="n pp-hand">{n}</div>
      <div class="c">{cost}</div>
    </button>
  );
}

// ------------------------------------------------------------------ endings and the debrief

export interface TypedCardProps {
  /** The small typed heading (THE ENDING), optional. */
  head?: string;
  /** The title (TREATY / WORLD WAR / FROZEN). */
  title: string;
  /** Red for war, blue for the treaty. */
  tone?: 'red' | 'blue' | 'plain';
  lines: string[];
  /** The score line: a label and the value. */
  score?: { label: string; value: number | string };
  /** A handwritten line at the foot, optional. */
  hand?: string;
  children?: ComponentChildren;
  style?: JSX.CSSProperties | string;
}

/** A typed card: the ending's two lines and the score. */
export function TypedCard({ head, title, tone = 'plain', lines, score, hand, children, style }: TypedCardProps) {
  return (
    <div class="pp-obj pp-typed pp-ty" style={style}>
      <Paperclip />
      {head ? <div class="hd">{head}</div> : null}
      <div class={`ti${tone === 'plain' ? '' : ` ${tone}`}`}>{title}</div>
      {lines.map((l, i) => (
        <div class="ln" key={i}>
          {l}
        </div>
      ))}
      {score ? (
        <div class="sc">
          {score.label}
          <b>{score.value}</b>
        </div>
      ) : null}
      {hand ? <div class="hand pp-hand">{hand}</div> : null}
      {children}
    </div>
  );
}

export interface DebriefPageProps {
  /** The week heading (WEEK 3) and a small tag after it, optional. */
  week: string;
  tag?: string;
  /** The label over what the player did, and the lines. */
  whatLabel: string;
  what: string[];
  /** The label over the Federation's hidden thoughts, and the lines (typed in red). */
  thoughtLabel: string;
  thoughts: string[];
  /** The page number scribbled at the foot ("3 / 8"), optional. */
  page?: string;
  children?: ComponentChildren;
}

/** One page of the debrief's typed notes: the week, what you did, what they thought. */
export function DebriefPage({ week, tag, whatLabel, what, thoughtLabel, thoughts, page, children }: DebriefPageProps) {
  return (
    <div class="pp-obj pp-debrief pp-ty">
      <div class="wk">
        {week}
        {tag ? <small>{tag}</small> : null}
      </div>
      <div class="lab">{whatLabel}</div>
      {what.map((l, i) => (
        <div class="what" key={i}>
          {l}
        </div>
      ))}
      <div class="lab">{thoughtLabel}</div>
      {thoughts.map((l, i) => (
        <div class="thought" key={i}>
          {l}
        </div>
      ))}
      {page ? <div class="pg pp-hand">{page}</div> : null}
      {children}
    </div>
  );
}

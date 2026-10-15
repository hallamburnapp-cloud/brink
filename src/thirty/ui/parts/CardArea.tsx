/**
 * The card (SPEC "The screen", 4) and everything that takes its place: the adviser's message with
 * two buttons (the action and a hint line that says plainly what will happen); on a map day, the
 * message and a line that says to tap the map; while the night plays, its one line in place of the
 * buttons; the team offer after days 5, 10, 15, 20 and 25; the explanation's two screens; and the
 * ending. One rect, one thing at a time, and it slides up when a new one comes.
 */
import type { JSX } from 'preact';
import { chooseSide, explainDoneLabel, explainNext, explainSkip, home, pickPiece, playAgain, replaySeed } from '../app/actions';
import { content, preview, regionName, todayCard, type ChoiceCard, type Ending, type GameState, type MapCard } from '../app/engine';
import { R, rectStyle } from '../app/layout';
import { busy, cardKey, chosen, explain, night, reduced, shown } from '../app/store';
import { Silhouette } from '../portraits';
import { endingLines } from './endings';
import { deltaText } from './gauge';
import { targetsOf } from './MapPane';

export function CardArea(): JSX.Element | null {
  const s = shown.value;
  const ex = explain.value;
  const key = cardKey.value;
  const cls = `card abs${reduced.value ? '' : ' slide'}`;
  if (ex !== null) {
    return (
      <div key={`x${ex}`} class={cls} style={rectStyle(R.card)}>
        <ExplainCard step={ex} />
      </div>
    );
  }
  if (!s) return null;
  return (
    <div key={key} class={cls} style={rectStyle(R.card)}>
      {s.phase === 'over' && s.ending ? <EndCard s={s} ending={s.ending} /> : s.phase === 'offer' ? <OfferCard s={s} /> : <DayCard s={s} />}
    </div>
  );
}

// ---------------------------------------------------------------- the day

function Adviser({ id }: { id: string }): JSX.Element {
  const a = content.advisers[id];
  return (
    <div class="adviser">
      <Silhouette portrait={a?.portrait ?? id} size={34} />
      <div class="adviser-name">
        <span class="who">{a?.name ?? id}</span>
        <span class="role">{a?.role ?? ''}</span>
      </div>
    </div>
  );
}

/** Long messages step down a size so the whole card always fits its rect. */
export function messageSize(text: string): 'long' | 'normal' {
  return text.length > 170 ? 'long' : 'normal';
}

function DayCard({ s }: { s: GameState }): JSX.Element | null {
  const card = todayCard(content, s);
  if (!card) return null;
  const n = night.value;
  return (
    <>
      <Adviser id={card.adviser} />
      <p class={`message ${messageSize(card.text)}${card.map ? ' map-day' : ''}`}>{card.text}</p>
      {n ? <NightLine text={n.text} delta={n.delta} /> : card.map ? <MapDayButtons s={s} card={card} /> : <ChoiceButtons s={s} card={card} />}
    </>
  );
}

/** The night's one line, in place of the buttons while the map recolours: what happened and what DANGER did. */
function NightLine({ text, delta }: { text: string; delta: number }): JSX.Element {
  return (
    <div class="buttons night" role="status" aria-live="polite">
      <div class="night-line">
        <span class="night-label">Overnight</span>
        <span class="night-text">{text}</span>
        {delta !== 0 && <span class={`night-delta num ${delta < 0 ? 'down' : 'up'}`}>DANGER {deltaText(delta)}</span>}
      </div>
    </div>
  );
}

function ChoiceButtons({ s, card }: { s: GameState; card: ChoiceCard }): JSX.Element {
  const c = chosen.value;
  return (
    <div class="buttons">
      {(['left', 'right'] as const).map((side) => {
        const p = preview(content, s, side);
        const pressed = c?.option === side;
        const other = !!c && !pressed;
        const hint = pressed && c?.roll ? c.roll : (p?.hint ?? card[side].hint);
        return (
          <button
            key={side}
            class={`choice${pressed ? ' pressed' : ''}${other ? ' other' : ''}${pressed && c?.roll ? ' rolled' : ''}`}
            disabled={busy.value}
            onClick={() => void chooseSide(side)}
            aria-label={`${card[side].text}. ${hint}`}
          >
            <span class="action">{card[side].text}</span>
            <span class="hint">{hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/** On a map day the glowing regions are the buttons: the card says so, and repeats the tapped place's label. */
function MapDayButtons({ s, card }: { s: GameState; card: MapCard }): JSX.Element {
  const c = chosen.value;
  const targets = targetsOf(s, card);
  const picked = c ? regionName(c.option) : null;
  const pickedHint = c ? (c.roll ?? preview(content, s, c.option)?.hint ?? targets.find((t) => t.region === c.option)?.hint ?? '') : '';
  return (
    <div class="buttons map-day">
      <div class={`tap-line${picked ? ' picked' : ''}`}>
        {picked ? (
          <>
            <span class="action">{picked}</span>
            <span class="hint">{pickedHint}</span>
          </>
        ) : (
          <>
            <span class="action">Tap one of the glowing places on the map</span>
            <span class="hint">{targets.map((t) => regionName(t.region)).join(' · ')}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the team offer

function OfferCard({ s }: { s: GameState }): JSX.Element {
  const offer = s.offer ?? [];
  return (
    <>
      <div class="offer-title">YOUR TEAM</div>
      <p class="message offer-line">Three offers for your team. Each one changes what your decisions do. Take one, or none.</p>
      <div class="buttons offer">
        {offer.map((id, i) => {
          const p = content.pieces[id];
          return (
            <button key={id} class="choice piece" disabled={busy.value} onClick={() => pickPiece(i)} aria-label={`${p?.name ?? id}. ${p?.rule ?? ''}`}>
              <span class="action">{p?.name ?? id}</span>
              <span class="hint">{p?.rule ?? ''}</span>
            </button>
          );
        })}
        <button class="quiet-btn none" disabled={busy.value} onClick={() => pickPiece(null)}>
          No one this time
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- the explanation

export const LINES = {
  one: 'The world is sliding towards war. You lead the Republic, the flag on the map. Each day, one decision.',
  two: 'Keep DANGER below 100 for thirty days. Calm the whole map and the crisis ends early.',
  colours: 'On the map: blue is calm, amber is tense, orange is a crisis, red is war. The Federation is the other great power.',
  three: 'Your advisers make your decisions count for more. Choose them well.',
  slots: 'After every five days come three offers for your team, people and policies. Take one, or none.',
};

function ExplainCard({ step }: { step: 1 | 2 }): JSX.Element {
  return (
    <>
      <div class="offer-title">{step === 1 ? 'HOW TO PLAY' : 'YOUR TEAM'}</div>
      {step === 1 ? (
        <>
          <p class="message explain">{LINES.one}</p>
          <p class="message explain">{LINES.two}</p>
          <p class="message explain quiet">{LINES.colours}</p>
        </>
      ) : (
        <>
          <p class="message explain">{LINES.three}</p>
          <p class="message explain quiet">{LINES.slots}</p>
        </>
      )}
      <div class="buttons row">
        {step === 1 && (
          <button class="quiet-btn" onClick={explainSkip}>
            SKIP
          </button>
        )}
        <button class="main-btn" onClick={explainNext}>
          {step === 1 ? 'NEXT' : explainDoneLabel()}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- the ending

function EndCard({ s, ending }: { s: GameState; ending: Ending }): JSX.Element {
  const { title, lines } = endingLines(ending, s);
  return (
    <>
      <div class="end-story">
        <div class={`end-title ${ending.kind === 'WAR' ? 'war' : 'held'}`}>{title}</div>
        <p class="message end-line">{lines[0]}</p>
        <p class="message end-line">{lines[1]}</p>
      </div>
      <div class="buttons end">
        <div class="pair">
          <button class="main-btn" onClick={playAgain}>
            PLAY AGAIN
          </button>
          <button class="quiet-btn" onClick={replaySeed} aria-label={`Same world again, ${s.seed}`}>
            SAME WORLD AGAIN
          </button>
        </div>
        <button class="quiet-btn home-btn" onClick={home}>
          HOME
        </button>
      </div>
    </>
  );
}

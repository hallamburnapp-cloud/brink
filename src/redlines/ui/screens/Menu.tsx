/**
 * The papers over the room: the menu (RESUME, HOW TO PLAY, SOUND, QUIT TO TITLE), the quit question,
 * HOW TO PLAY, and the way-out form (SPEC-SMALL "Act": one of three named terms, each with its price).
 * A tap on the dim around a card puts it away.
 */
import type { JSX } from 'preact';
import { Paperclip, PencilUnderline } from '../paper';
import { seedOf } from '../paper/rand';
import { closeSheet, howToPlay, offer, quitToTitle, toggleSound } from '../app/actions';
import { content, regionName, RULES, type PieceKind, type WayOutTerm } from '../app/engine';
import { prefs, run, sheet, shown, wayOutTerm } from '../app/store';
import { termLine } from '../app/words';
import { HowToPlay } from './HowToPlay';
import { Choice } from './Title';

function stop(e: Event): void {
  e.stopPropagation();
}

export function Sheets(): JSX.Element | null {
  const which = sheet.value;
  if (!which) return null;
  const close = (e: MouseEvent) => {
    if (e.target === e.currentTarget) closeSheet();
  };
  return (
    <div class="rl-layer rl-scrim" onPointerDown={stop} onClick={close}>
      {which === 'menu' ? <Menu /> : which === 'quit' ? <QuitConfirm /> : which === 'how' ? <HowToPlay /> : <WayOutForm />}
    </div>
  );
}

function Row({ word, value, onTap, seed, leave }: { word: string; value?: string; onTap: () => void; seed: string; leave?: boolean }): JSX.Element {
  return (
    <button type="button" class={`rl-menu-row${leave ? ' rl-leave' : ''}`} onClick={onTap}>
      <span class="w">
        {word}
        <PencilUnderline seed={seedOf('rl:row:' + seed)} />
      </span>
      {value !== undefined ? <span class="v">{value}</span> : null}
    </button>
  );
}

function Menu(): JSX.Element {
  const S = content.strings;
  const inGame = run.value !== null;
  const sound = prefs.value.sound;
  return (
    <div class="rl-card rl-menu pp-obj pp-ty" role="dialog" aria-label={S.menu.menu}>
      <Paperclip />
      <div class="rl-head">{S.menu.menu}</div>
      {inGame && <Row word={S.menu.resume} onTap={closeSheet} seed="resume" />}
      <Row word={S.menu.howToPlay} onTap={howToPlay} seed="how" />
      <Row word={S.menu.sound} value={sound ? S.menu.on : S.menu.off} onTap={() => void toggleSound()} seed="sound" />
      {inGame && <Row word={S.menu.quit} onTap={() => (sheet.value = 'quit')} seed="quit" leave />}
    </div>
  );
}

function QuitConfirm(): JSX.Element {
  const S = content.strings;
  return (
    <div class="rl-card rl-menu pp-obj pp-ty" role="alertdialog" aria-label={S.menu.quit}>
      <Paperclip />
      <div class="rl-head">{S.menu.quit}</div>
      <div class="ln">{S.menu.quitSure}</div>
      <div class="rl-row">
        <Choice word={S.menu.yes} onTap={quitToTitle} seed="yes" />
        <Choice word={S.menu.no} onTap={() => (sheet.value = 'menu')} seed="no" small />
      </div>
    </div>
  );
}

const TERMS: WayOutTerm[] = ['drop-promise', 'pull-back', 'summit'];
const PIECES: PieceKind[] = ['fleet', 'brigade'];

/** A WAY OUT: the three terms, each with its price; a dropped promise or a pulled-back piece is picked by name. */
function WayOutForm(): JSX.Element | null {
  const S = content.strings;
  const s = shown.value;
  if (!s) return null;
  const open = wayOutTerm.value;
  return (
    <div class="rl-card rl-form pp-obj pp-ty" role="dialog" aria-label={S.words.wayOut}>
      <Paperclip />
      <div class="rl-head">{S.words.wayOut}</div>
      <div class="ln">{S.act.wayOutIntro}</div>
      {TERMS.map((term) => {
        const price = RULES.wayOutPrice[term];
        const line = termLine(S, term, price, null);
        const expandable = term !== 'summit';
        const isOpen = open === term;
        const onTap = () => {
          if (term === 'summit') offer('summit');
          else wayOutTerm.value = isOpen ? null : term;
        };
        const disabled = term === 'drop-promise' && s.promises.length === 0;
        return (
          <div class={`rl-term${isOpen ? ' rl-open' : ''}`} key={term}>
            <Choice word={S.act.termLabels[term]} sub={line} onTap={onTap} seed={term} disabled={disabled || s.influence < price} />
            {isOpen && expandable && (
              <div class="rl-sub">
                {term === 'drop-promise'
                  ? s.promises.map((p) => (
                      <Choice key={p.region} word={regionName(p.region).toUpperCase()} onTap={() => offer('drop-promise', p.region)} seed={'drop' + p.region} small />
                    ))
                  : PIECES.map((k) => (
                      <Choice key={k} word={S.pieces[k].toUpperCase()} sub={termLine(S, 'pull-back', price, k)} onTap={() => offer('pull-back', k)} seed={'pull' + k} small />
                    ))}
              </div>
            )}
          </div>
        );
      })}
      <div class="rl-row">
        <Choice word={S.act.cancel} onTap={closeSheet} seed="wocancel" small />
      </div>
    </div>
  );
}

/**
 * The papers over the room: the menu (RESUME, HOW TO PLAY, SOUND, QUIT TO TITLE), the quit question,
 * HOW TO PLAY, and the way-out form (SPEC-SMALL "Act": one of three named terms, each with its price).
 * A tap on the dim around a card puts it away.
 */
import type { JSX } from 'preact';
import { Paperclip, PencilUnderline } from '../paper';
import { seedOf } from '../paper/rand';
import { closeSheet, howToPlay, newGameNow, offer, quitToTitle, toggleSound } from '../app/actions';
import { content, regionName, RULES, type WayOutTerm } from '../app/engine';
import { pullable, wayOutBlock } from '../app/orders';
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
      {which === 'menu' ? <Menu /> : which === 'quit' ? <QuitConfirm /> : which === 'newgame' ? <NewGameConfirm /> : which === 'how' ? <HowToPlay /> : <WayOutForm />}
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

/** PLAY on the title with a game in progress saved: asked once, as QUIT TO TITLE is (the second review). */
function NewGameConfirm(): JSX.Element {
  const S = content.strings;
  const yes = () => {
    sheet.value = null;
    newGameNow();
  };
  return (
    <div class="rl-card rl-menu pp-obj pp-ty" role="alertdialog" aria-label={S.title.play}>
      <Paperclip />
      <div class="rl-head">{S.title.play}</div>
      <div class="ln">{S.title.newGameSure}</div>
      <div class="rl-row">
        <Choice word={S.menu.yes} onTap={yes} seed="new-yes" />
        <Choice word={S.menu.no} onTap={closeSheet} seed="new-no" small />
      </div>
    </div>
  );
}

const TERMS: WayOutTerm[] = ['drop-promise', 'pull-back', 'summit'];

/**
 * A WAY OUT: the three terms, each with its price; a dropped promise or a pulled-back piece is picked by name. A
 * term that cannot be offered now is dimmed with its reason in its own typed line (SPEC-SMALL "A form that will fail
 * says so before you pay"); PULL A PIECE BACK lists only the pieces the engine would take back (a piece already at
 * home is not offered).
 */
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
        // Each promise or piece the term can name, with why not when it cannot be offered (the engine's canOfferWayOut).
        const promises = s.promises.map((p) => ({ region: p.region, block: wayOutBlock(s, 'drop-promise', p.region) }));
        const pieces = pullable(s).map((k) => ({ kind: k, block: wayOutBlock(s, 'pull-back', k) }));
        const block = wayOutBlock(s, term);
        const onTap = () => {
          if (term === 'summit') offer('summit');
          else wayOutTerm.value = isOpen ? null : term;
        };
        return (
          <div class={`rl-term${isOpen ? ' rl-open' : ''}`} key={term}>
            <Choice word={S.act.termLabels[term]} sub={block ? `${line} · ${block}` : line} onTap={onTap} seed={term} disabled={block !== null} />
            {isOpen && expandable && block === null && (
              <div class="rl-sub">
                {term === 'drop-promise'
                  ? promises.map((p) => (
                      <Choice
                        key={p.region}
                        word={regionName(p.region).toUpperCase()}
                        sub={p.block ?? undefined}
                        onTap={() => offer('drop-promise', p.region)}
                        seed={'drop' + p.region}
                        small
                        disabled={p.block !== null}
                      />
                    ))
                  : pieces.map((p) => (
                      <Choice
                        key={p.kind}
                        word={S.pieces[p.kind].toUpperCase()}
                        sub={p.block ? `${termLine(S, 'pull-back', price, p.kind)} · ${p.block}` : termLine(S, 'pull-back', price, p.kind)}
                        onTap={() => offer('pull-back', p.kind)}
                        seed={'pull' + p.kind}
                        small
                        disabled={p.block !== null}
                      />
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

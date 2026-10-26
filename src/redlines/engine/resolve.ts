/**
 * The week resolves in two halves around the phone (SPEC-SMALL "A week", 3 and 4):
 *   beginWeek: the clocks tick, lines crossed, a carried test falls or waits, their pushes land, a test
 *              or an event rings (phase 'phone') or the week finishes at once;
 *   applyAnswer: what BACK IT / BACK DOWN / WAIT (or the event's verbs) do;
 *   finishWeek: places fall or spread, the way out is answered, the ladder moves, the bars move, the
 *              endings, next week's headings, the new week's influence.
 * Every hidden decision writes one line for the debrief as it is made; every mover of the bar and the
 * ladder prints its own line on the tape (SPEC-SMALL "Rulings after the first build's review").
 */
import { Rng } from '../../engine/rng.ts';
import { acceptWayOut, blockedLastWeek, crossesLine, crossingThing, planHeadings, targetWhy } from './agent.ts';
import { believe, currentLog, fall, fellIn, fightingRegions, holdInfo, isAnswered, isSpared, netActs, note, pieceAt, pieceOf, press, pressedRegions, promiseAt, recover, removePromise, say, stepDown, stepUp, tally, think, unansweredRegions, willing } from './board.ts';
import type { RedlinesContent } from './content.ts';
import { closingLines, endingOf } from './debrief.ts';
import { answerCost, makePhone, pickEvent, stepAtWeekStart, type PhoneContext } from './phone.ts';
import { RULES, fallWeeksAt, isScared, spreadAt } from './rules.ts';
import type { Act, EndingKind, GameState, Line, PieceKind, RegionId } from './types.ts';
import { fill, numberWord, placesPhrase } from './words.ts';
import { NEAR_CAP, NEIGHBOURS, isCap, mapOrder, regionName } from './world.ts';

/** SPEC-SMALL ruling: the fleet starts at Tern Isle (the Scatter), within reach of the war; the brigade at Edda Vale. */
export const FLEET_START: RegionId = 'TRN';
export const BRIGADE_START: RegionId = 'EDV';
export function homeOf(kind: PieceKind): RegionId {
  return kind === 'fleet' ? FLEET_START : BRIGADE_START;
}

/** "Saltwhite", "Saltwhite and Hearth", "Saltwhite, Hearth and Iceward" (names, so the slot filler leaves them as they are). */
export function listNames(ids: readonly RegionId[]): string {
  const names = ids.map(regionName);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** One place's name, or "two places": the {n} slot of a tape line about several places. */
function placesSlot(c: RedlinesContent, ids: readonly RegionId[]): string {
  return ids.length === 1 ? regionName(ids[0]) : placesPhrase(c, ids.length);
}

function actLine(c: RedlinesContent, a: Act): string | null {
  const A = c.strings.acts;
  switch (a.kind) {
    case 'promise':
      return fill(A.promise, { region: regionName(a.region) });
    case 'withdraw':
      return fill(A.withdraw, { region: regionName(a.region) });
    case 'move':
      return fill(A.move, { piece: c.strings.pieces[a.piece], region: regionName(a.to) });
    case 'way-out':
      return fill(A.wayOut, { term: c.strings.terms[a.term] });
    case 'answer':
      return null;
  }
}

function ring(c: RedlinesContent, s: GameState, rng: Rng, ctx: PhoneContext): boolean {
  const phone = makePhone(c, s, rng, ctx);
  if (!phone) return false;
  s.phone = phone;
  s.phase = 'phone';
  s.phonesUsed = [...s.phonesUsed, phone.template].slice(-8);
  return true;
}

/** Is the test at this place a feint? Only a first-round test can be (a feint lapses when you wait). */
export function isFeintTest(s: GameState, region: RegionId, round: number): boolean {
  return round === 1 && s.fed.headings.some((h) => h.to === region && !h.real);
}

/** Why they chose a place, with the {piece} slot filled (the thought "they wanted to see whether the brigade would fight"). */
function whyFor(c: RedlinesContent, s: GameState, region: RegionId): string {
  const piece = pieceAt(s, region)?.kind ?? holdInfo(s, region).piece?.kind ?? 'brigade';
  return fill(c.strings.why[targetWhy(s, region)], { piece: c.strings.pieces[piece] });
}

/** The first half of the resolve. `s` is a draft. */
export function beginWeek(c: RedlinesContent, s: GameState): GameState {
  const rng = new Rng(`${s.seed}:w${s.week}:a`);
  const log = currentLog(s);
  // The step the week started at (the log entry was opened with it): the fall clocks read this, not a step climbed inside the week.
  const stepWas = log.danger.step;
  const T = tally(s);
  // The orders, with a promise and its same-week withdrawal cancelled out (the debrief's "what you did" reads the net).
  for (const a of netActs(s.acts)) {
    const line = actLine(c, a);
    if (line) note(s, line);
    if (a.kind === 'move') T.moves++;
  }
  if (!log.acts.length) {
    note(s, c.strings.acts.none);
    T.idleWeeks++;
  }

  // 1. The clocks: a pressed place unanswered counts another week towards its fall; an answered one
  //    (a piece in it, or a solid promise not under test) counts a quiet week towards calm.
  for (const r of pressedRegions(s)) {
    const rec = s.regions[r];
    if (isAnswered(s, r)) rec.quietWeeks++;
    else {
      rec.pressedWeeks++;
      rec.quietWeeks = 0;
    }
  }

  // 2. Their lines. The tape names what crossed it and where, then Wintermast's word and the step.
  let bluff: { line: Line; region: RegionId } | null = null;
  for (const line of s.fed.lines) {
    if (s.crossed[line.id] !== undefined) continue;
    const def = c.lines.find((l) => l.id === line.id);
    if (!def) continue;
    const at = crossesLine(s, def);
    if (!at) continue;
    s.crossed[line.id] = s.week;
    const thing = crossingThing(s, def, at);
    const piece = c.strings.pieces[thing];
    if (line.real) {
      say(c, s, 'lineCrossedAt', { piece, region: at });
      stepUp(s);
      say(c, s, 'lineCrossed', { line: line.text });
      think(c, s, 'lineReal', { line: line.text, piece, region: at });
    } else {
      believe(s, RULES.bluffBelief);
      think(c, s, 'lineBluff', { line: line.text, piece, region: at });
      bluff = { line, region: at };
    }
  }

  // 3. WAIT bought information: the column you waited on last week was for show, and it has gone home.
  if (s.feintGone) {
    say(c, s, 'feintGone', { region: s.feintGone });
    s.feintGone = null;
  }

  // A carried test: they take the place while you wait, or the phone rings again below.
  let carried: RegionId | null = null;
  if (s.pendingTest) {
    const r = s.pendingTest;
    const rec = s.regions[r];
    if (rec.state === 'pressed' && rec.pressedWeeks >= fallWeeksAt(stepWas)) {
      believe(s, -RULES.failedBelief);
      fall(s, r, 'waited');
      say(c, s, 'waitedFell', { region: r });
      think(c, s, 'waitedFell', { region: r });
    } else carried = r;
  }

  // 4. Their pushes land. The debrief gets at most one "they went for X" line a week, and only when it
  //    changed something: a test, or a new front (a calm place pressed; the pressure kept on says nothing new).
  const real = s.fed.headings.filter((h) => h.real).map((h) => h.to);
  let newTest: RegionId | null = null;
  let headingSaid = false;
  const sayHeading = (to: RegionId) => {
    if (headingSaid) return;
    headingSaid = true;
    think(c, s, 'heading', { region: to, why: whyFor(c, s, to) });
  };
  const actedOn = (r: RegionId) => s.acts.some((a) => (a.kind === 'promise' && a.region === r) || (a.kind === 'move' && a.to === r));
  for (const h of s.fed.headings) {
    const pm = promiseAt(s, h.to);
    if (pm && !carried && !newTest && s.regions[h.to].state !== 'fighting') {
      newTest = h.to;
      say(c, s, 'tested', { region: h.to });
      if (h.real) sayHeading(h.to);
      if (holdInfo(s, h.to).ok) T.testsSolid++;
      else T.testsDashed++;
    } else if (h.real) {
      if (s.regions[h.to].state === 'calm') sayHeading(h.to);
      if (s.regions[h.to].state !== 'fighting') {
        say(c, s, s.regions[h.to].state === 'pressed' ? 'pushedAgain' : 'pushed', { region: h.to });
        const atOnce = RULES.outOfReachFallWeeks === 0 && s.regions[h.to].state === 'calm' && !holdInfo(s, h.to).ok;
        press(s, h.to);
        if (atOnce) {
          fall(s, h.to, 'unanswered');
          say(c, s, 'fell', { region: h.to });
          say(c, s, 'fellOutOfReach', { region: h.to });
          think(c, s, 'fallOutOfReach', { region: h.to });
          T.outOfReach++;
          if (!T.outOfReachFirst) T.outOfReachFirst = h.to;
        }
      }
    } else {
      say(c, s, 'stoppedShort', { region: h.to });
      if (actedOn(h.to)) think(c, s, 'feint', { region: h.to, from: real[0] ?? h.to });
    }
  }
  if (s.fed.headings.length === 2 && s.fed.headings.every((h) => h.real)) think(c, s, 'bothReal');

  // 5. The phone: the carried test first, then a new test, then an event.
  if (carried) {
    if (ring(c, s, rng, { kind: 'test', region: carried, round: s.pendingRound })) return s;
    s.pendingTest = null;
  }
  if (newTest) {
    s.pendingTest = newTest;
    s.pendingRound = 1;
    if (ring(c, s, rng, { kind: 'test', region: newTest, round: 1 })) return s;
    s.pendingTest = null;
  }
  const ev = pickEvent(c, s, rng, bluff);
  if (ev) {
    s.events++;
    if (ring(c, s, rng, { kind: ev.kind, region: ev.region, round: 1, line: ev.line })) return s;
  }
  return finishWeek(c, s);
}

/** Apply BACK IT / BACK DOWN / WAIT to the call on the line. `s` is a draft in phase 'phone'. */
export function applyAnswer(c: RedlinesContent, s: GameState, key: 'back' | 'down' | 'wait'): void {
  const p = s.phone;
  if (!p) return;
  const rng = new Rng(`${s.seed}:w${s.week}:c`);
  const region = p.region;
  const T = tally(s);
  s.acts.push({ kind: 'answer', key, region, phone: p.kind });
  const cost = answerCost(s, key);
  s.influence = Math.max(0, s.influence - cost);
  const option = p.options.find((o) => o.key === key);
  if (option) note(s, option.label + (option.cost ? ` · ${option.cost}` : ''));

  if (p.kind === 'test' || p.kind === 'test-inherited' || p.kind === 'feint') {
    if (!region) return;
    const feint = isFeintTest(s, region, p.round);
    const inherited = !!promiseAt(s, region)?.inherited;
    const k = key === 'wait' && p.round >= 3 ? 'down' : key;
    if (k === 'back') {
      const hold = holdInfo(s, region);
      // A column that was never coming cannot beat a far garrison: a backed feint always "holds".
      const held = feint || hold.ok || rng.next() >= RULES.farFail;
      if (held) {
        if (feint) {
          // SPEC-SMALL ruling: backing a feint earns nothing. They were not coming; the debrief says so.
          believe(s, RULES.backedFeintBelief);
          T.feintsBacked++;
          if (!T.feintBackedFirst) T.feintBackedFirst = region;
        } else {
          believe(s, hold.ok ? RULES.backedBelief : RULES.backedFarBelief);
          const quiet = stepDown(s);
          if (quiet) say(c, s, 'recovered', { region: quiet });
          if (hold.ok) {
            s.turnedAway[region] = s.week;
            T.backed++;
          }
          s.lastBacked = region;
        }
        s.pendingTest = null;
        say(c, s, hold.ok ? 'backed' : 'backedFar', { region });
        think(c, s, feint ? 'feintBacked' : 'realBacked', { region, cost });
      } else {
        believe(s, -RULES.failedBelief);
        removePromise(s, region);
        s.pendingTest = null;
        press(s, region);
        s.regions[region].fellBy = 'failed';
        say(c, s, 'backFailed', { region });
        think(c, s, 'realBackFailed', { region, cost });
      }
    } else if (k === 'down') {
      believe(s, -RULES.backDownBelief);
      removePromise(s, region);
      s.pendingTest = null;
      T.backedDown++;
      if (!T.backedDownFirst) T.backedDownFirst = region;
      if (!feint) {
        press(s, region);
        s.regions[region].fellBy = inherited ? 'back-down-inherited' : 'back-down';
      }
      // SPEC-SMALL ruling: BACK DOWN near a scared Federation is a step down (they wanted the fight no more than you did).
      const eased = !feint && RULES.backDownEasesWhenScared && isScared(s.fed.jumpiness);
      T.jumpinessSeen = true;
      if (eased) {
        const quiet = stepDown(s);
        if (quiet) say(c, s, 'recovered', { region: quiet });
        say(c, s, 'backedDownEased', { region });
        think(c, s, 'realBackedDownEased', { region });
      } else {
        stepUp(s);
        say(c, s, 'backedDown', { region });
        think(c, s, feint ? 'feintBackedDown' : 'realBackedDown', { region });
      }
    } else {
      believe(s, -RULES.waitBelief);
      say(c, s, 'waited', { region });
      if (feint) {
        s.pendingTest = null;
        s.feintGone = region;
        think(c, s, 'feintWaited', { region });
      } else {
        press(s, region);
        s.pendingTest = region;
        s.pendingRound = (p.round + 1) as 2 | 3;
        think(c, s, 'realWaited', { region });
      }
    }
    return;
  }

  switch (p.kind) {
    case 'false-alarm': {
      if (key === 'back') {
        believe(s, RULES.alertBelief);
        T.jumpinessSeen = true;
        say(c, s, 'alertOn', { region });
        if (rng.next() < s.fed.jumpiness * RULES.jumpyScale) {
          stepUp(s);
          say(c, s, 'jumpy', { region });
          think(c, s, 'jumpy', { piece: c.strings.pieces.alert, region });
        }
      } else say(c, s, key === 'down' ? 'alertOff' : 'alertWaited', { region });
      think(c, s, 'falseAlarm', { region });
      return;
    }
    case 'trawler': {
      // The trawler moves belief, never the bar (SPEC-SMALL: the bar has five movers and this is not one).
      if (key === 'back') {
        believe(s, RULES.allyBelief);
        // Backing the island answers it this week: its clock restarts, so it is not "taken, nobody came" the week after.
        if (region && s.regions[region].state === 'pressed') s.regions[region].pressedWeeks = 0;
        say(c, s, 'trawlerBacked', { region });
      } else if (key === 'down') {
        believe(s, -RULES.disownBelief);
        say(c, s, 'trawlerDisowned', { region });
      } else say(c, s, 'trawlerLeaned', { region });
      think(c, s, 'trawler', { region, why: c.strings.why.curious });
      return;
    }
    case 'bluff-crossed': {
      if (key === 'down') {
        believe(s, -RULES.events.bluffPullBelief);
        uncross(s, region);
        say(c, s, 'bluffPulled', { region });
      } else say(c, s, key === 'back' ? 'bluffHeld' : 'bluffWaited', { region });
      think(c, s, 'bluffPhone', { region });
      return;
    }
    case 'summit': {
      const why = c.strings.why[s.fed.step >= 3 ? 'afraid' : 'wantedToStop'];
      if (key === 'back') {
        const quiet = stepDown(s);
        if (quiet) say(c, s, 'recovered', { region: quiet });
        willing(s, RULES.willWayOut);
        s.waysOut++;
        if (blockedLastWeek(s)) T.stoppedThenTalked++;
        say(c, s, 'summitAccepted');
      } else if (key === 'down') {
        // Their public offer refused in public: the one humiliation in the first build (spec: −10).
        willing(s, -RULES.willHumiliated);
        say(c, s, 'summitRefused');
      } else say(c, s, 'summitWaited');
      think(c, s, 'summit', { why });
      return;
    }
    case 'fall-unpromised': {
      if (!region) return;
      if (key === 'back') {
        const hold = holdInfo(s, region);
        if (hold.ok && hold.piece) {
          hold.piece.at = region;
          s.regions[region].pressedWeeks = 0;
          s.regions[region].quietWeeks = 0;
          believe(s, RULES.unpromisedBelief);
          say(c, s, 'unpromisedHeld', { region });
        } else say(c, s, 'unpromisedFailed', { region });
      } else say(c, s, 'unpromisedLet', { region });
      think(c, s, 'unpromised', { region });
      return;
    }
  }
}

/** Pulling back from a bluff you crossed: the promise there is withdrawn, or the piece there goes home. */
function uncross(s: GameState, region: RegionId | null): void {
  if (!region) return;
  const piece = pieceAt(s, region);
  if (piece) piece.at = homeOf(piece.kind);
  else if (promiseAt(s, region)) removePromise(s, region);
}

/** The second half of the resolve. `s` is a draft with no phone on the line. */
export function finishWeek(c: RedlinesContent, s: GameState): GameState {
  const rng = new Rng(`${s.seed}:w${s.week}:b`);
  const week = s.week;
  const stepWas = stepAtWeekStart(s);
  const T = tally(s);
  s.phone = null;
  s.phase = 'act';

  // 7. Places fall: pressed, unanswered, the clock (read at the step the week started at) run down. A place
  //    nothing of yours could have reached falls without a step, and the tape says so.
  for (const r of pressedRegions(s)) {
    const rec = s.regions[r];
    const clock = RULES.outOfReachFallWeeks !== null && !holdInfo(s, r).ok ? RULES.outOfReachFallWeeks : fallWeeksAt(stepWas);
    if (!isAnswered(s, r) && rec.pressedWeeks >= clock && s.pendingTest !== r) {
      const toldAlready = rec.fellBy === 'failed' || rec.fellBy === 'back-down' || rec.fellBy === 'back-down-inherited';
      fall(s, r, 'unanswered');
      say(c, s, 'fell', { region: r });
      if (rec.fellReach) {
        // A place you backed down from, or backed from too far, was explained when it happened; the fall needs no second thought.
        if (!toldAlready) think(c, s, 'fall', { region: r });
      } else {
        say(c, s, 'fellOutOfReach', { region: r });
        think(c, s, 'fallOutOfReach', { region: r });
        T.outOfReach++;
        if (!T.outOfReachFirst) T.outOfReachFirst = r;
      }
    }
  }
  // At FIGHTING and ALL-OUT the fighting spreads on its own, one or two places a week; a piece or a solid promise spares a place.
  const n = spreadAt(s.fed.step);
  if (n > 0) {
    const pool: Array<{ region: RegionId; from: RegionId }> = [];
    for (const f of fightingRegions(s))
      for (const r of NEIGHBOURS[f]) if (!isCap(r) && s.regions[r].state !== 'fighting' && !isSpared(s, r) && !pool.some((p) => p.region === r)) pool.push({ region: r, from: f });
    const ordered = mapOrder(pool.map((p) => p.region)).map((r) => pool.find((p) => p.region === r)!);
    rng.shuffle(ordered);
    const spread = ordered.slice(0, n);
    for (const { region, from } of spread) {
      fall(s, region, 'spread');
      say(c, s, 'spread', { region, from });
    }
    // One thought for the week names every place it spread to (two lines saying the same thing read badly).
    if (spread.length) think(c, s, 'spread', { region: listNames(spread.map((p) => p.region)), from: listNames([...new Set(spread.map((p) => p.from))]) });
  }
  const gained = fellIn(s, week);

  // 8. The way out. Accepted: +15, a step down, the term kept. Refused: nothing on the bar; the tape prints their reason.
  if (s.offer) {
    const offer = s.offer;
    const term = c.strings.terms[offer.term];
    const answer = acceptWayOut(s, offer, gained.length, rng, c.lines);
    const pieceWord = offer.term === 'pull-back' ? c.strings.pieces[offer.detail as PieceKind] : '';
    const whyRegion = offer.term === 'drop-promise' ? (offer.detail as RegionId) : offer.term === 'pull-back' ? pieceOf(s, offer.detail as PieceKind)?.at ?? null : null;
    const whySlots = { region: whyRegion ? regionName(whyRegion) : '', piece: pieceWord };
    const why = fill(c.strings.why[answer.why], whySlots);
    if (offer.term === 'pull-back') T.jumpinessSeen = true;
    if (answer.accept) {
      let named: RegionId | null = null;
      if (offer.term === 'drop-promise') {
        named = offer.detail as RegionId;
        removePromise(s, named);
        if (s.pendingTest === named) s.pendingTest = null;
      } else if (offer.term === 'pull-back') {
        const piece = pieceOf(s, offer.detail as PieceKind);
        if (piece) {
          named = piece.at;
          piece.at = homeOf(piece.kind);
        }
      }
      const quiet = stepDown(s);
      if (quiet) say(c, s, 'recovered', { region: quiet });
      if (named && s.regions[named].state === 'fighting') {
        recover(s, named);
        say(c, s, 'recovered', { region: named });
      }
      willing(s, RULES.willWayOut);
      s.waysOut++;
      if (gained.length === 0 && blockedLastWeek(s)) T.stoppedThenTalked++;
      say(c, s, 'wayOutAccepted', { term });
      think(c, s, 'wayOutAccepted', { why });
    } else {
      say(c, s, 'wayOutRefused', { term });
      const words = c.strings.wintermast[answer.why as keyof typeof c.strings.wintermast];
      if (words) say(c, s, 'wayOutRefusedWhy', { why: fill(words, whySlots) });
      if (answer.why === 'indifferent' && whyRegion) {
        T.farDrops++;
        if (!T.farDropFirst) T.farDropFirst = whyRegion;
      }
      think(c, s, 'wayOutRefused', { why });
    }
    s.offer = null;
  }

  // 9. The ladder: at most one step a week for the places taken unanswered that something of yours could
  //    have reached; a jumpy neighbour; an accident.
  const unansweredFalls = gained.filter((r) => s.regions[r].fellReach && s.regions[r].fellBy !== 'spread' && s.regions[r].fellBy !== 'failed');
  if (unansweredFalls.length && stepUp(s)) say(c, s, 'takenStepUp', { n: placesSlot(c, unansweredFalls) });
  const near = s.pieces.find((p) => NEAR_CAP.includes(p.at));
  if (near) {
    T.jumpinessSeen = true;
    if (rng.next() < s.fed.jumpiness * RULES.jumpyScale) {
      stepUp(s);
      say(c, s, 'jumpy', { region: near.at });
      think(c, s, 'jumpy', { piece: c.strings.pieces[near.kind], region: near.at });
    } else think(c, s, 'jumpyQuiet', { piece: c.strings.pieces[near.kind], region: near.at });
  }
  if (s.fed.step >= RULES.accidentFrom && rng.next() < RULES.accidentChance) {
    stepUp(s);
    const where = s.fed.headings.find((h) => h.real)?.to ?? pressedRegions(s)[0] ?? NEAR_CAP[0];
    say(c, s, 'accident', { region: where });
    think(c, s, 'accident', { region: where });
  }

  // 10. Recoveries: two quiet weeks and a pressed place is calm again.
  for (const r of pressedRegions(s)) {
    const rec = s.regions[r];
    if (rec.quietWeeks >= RULES.quietToCalm) {
      rec.state = 'calm';
      rec.pressedWeeks = 0;
      rec.quietWeeks = 0;
      rec.recoveredWeek = week;
      delete rec.fellBy;
      say(c, s, 'calmed', { region: r });
    }
  }

  // 11. The bars. −5 a place taken; +5 only when nothing was taken AND no place stands pressed and
  //     unanswered (SPEC-SMALL ruling: sitting still does not win); a bloc may sign in such a week.
  s.war = fightingRegions(s).length;
  const unanswered = unansweredRegions(s);
  if (gained.length) {
    willing(s, -RULES.willPerGain * gained.length);
    say(c, s, 'gainedWeek', { n: gained.length === 1 ? c.strings.counts.placesOne : fill(c.strings.counts.placesMany, { n: numberWord(c, gained.length) }) });
  } else if (unanswered.length) {
    say(c, s, 'heldWeek', { n: placesSlot(c, unanswered) });
  } else {
    willing(s, RULES.willQuiet);
    say(c, s, 'quietWeek');
    if (week >= RULES.blocSignFrom && s.signed < RULES.maxBlocs && rng.next() < RULES.blocSignChance) {
      s.signed++;
      willing(s, RULES.willBloc);
      say(c, s, 'blocSigned', { bloc: c.strings.blocs[s.signed === 1 ? 'SCT' : 'FRS'] });
    }
  }
  if (s.fed.belief >= RULES.believedLine && s.beliefWas < RULES.believedLine) think(c, s, 'believed');
  else if (s.fed.belief < RULES.doubtedLine && s.beliefWas >= RULES.doubtedLine) think(c, s, 'doubted');

  // 12. The endings.
  let ending: EndingKind | null = null;
  if (s.war >= RULES.warLimit) ending = 'war';
  else if (s.fed.will >= RULES.willSign && !gained.length) ending = 'treaty';
  else if (week >= RULES.weeks) ending = 'frozen';
  const log = currentLog(s);
  log.danger = { war: s.war, treaty: s.treaty, step: s.fed.step };
  if (ending) {
    say(c, s, ending === 'war' ? 'worldWar' : ending === 'treaty' ? 'treatySigned' : 'frozen');
    s.ending = endingOf(c, s, ending);
    // The closing card's lessons, then the dials, end the debrief's last page.
    for (const line of closingLines(c, s)) log.hidden.push(line);
    s.phase = 'ended';
    s.pendingTest = null;
    s.offer = null;
    return s;
  }

  // 13. Next week.
  const plan = planHeadings(s, rng);
  if (plan.notTested) {
    // Once a game per place: the thought is the same every week they leave it alone.
    const text = fill(c.debrief.notTested[0] ?? '', { region: regionName(plan.notTested) });
    if (!s.log.some((w) => w.hidden.includes(text))) think(c, s, 'notTested', { region: plan.notTested });
  }
  s.fed.headings = plan.headings;
  s.week = week + 1;
  s.influence = Math.max(0, s.influence + RULES.income - RULES.upkeep * s.promises.length);
  s.moved = [];
  s.acts = [];
  s.offer = null;
  s.beliefWas = s.fed.belief;
  return s;
}

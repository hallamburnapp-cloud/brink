/**
 * The week resolves in two halves around the phone (SPEC-SMALL "A week", 3 and 4):
 *   beginWeek: the clocks tick, lines crossed, a carried test falls or waits, their pushes land, a test
 *              or an event rings (phase 'phone') or the week finishes at once;
 *   applyAnswer: what BACK IT / BACK DOWN / WAIT (or the event's verbs) do;
 *   finishWeek: places fall or spread, the way out is answered, the ladder moves, the bars move, the
 *              endings, next week's headings, the new week's influence.
 * Every hidden decision writes one line for the debrief as it is made; every mover of the bar and the
 * ladder prints its own line on the tape (SPEC-SMALL "Rulings after the first build's review").
 *
 * SPEC-SMALL "Rulings after the recheck": cause before effect. Every path prints what you or they did before what
 * it caused ("Backed down at Shoal · they stand down", then "Shoal has fallen"; "Wintermast accepts: a summit",
 * then "Guns quiet at X"), and each line is said right after the change it reports, so its beat (WeekLog.beats)
 * is the sheet it describes. A place that falls stays fallen that week: a step down eases the ladder word at once,
 * but only a place that fell in an earlier week comes back (board.ts recoverOne).
 */
import { Rng } from '../../engine/rng.ts';
import { acceptWayOut, blockedLastWeek, crossesLine, crossingThing, planHeadings, summitWhy, targetWhy } from './agent.ts';
import { believe, canRecover, provocationBelieved, currentLog, fall, fellIn, fightingRegions, holdDistance, holdInfo, isAnswered, isSpared, nearestPiece, netActs, note, pieceAt, pieceOf, press, pressedRegions, promiseAt, recover, recoverOne, removePromise, say, stepAtWeekStart, stepDown, stepUp, tally, think, unansweredRegions, willing } from './board.ts';
import type { RedlinesContent, WhyKind } from './content.ts';
import { endingOf } from './debrief.ts';
import { answerCost, makePhone, pickEvent, type PhoneContext } from './phone.ts';
import { RULES, fallWeeksAt, isScared, spreadAt } from './rules.ts';
import type { Act, EndingKind, GameState, Heading, Line, PieceKind, RegionId } from './types.ts';
import { actLine, fill, listNames, numberWord, placesPhrase } from './words.ts';
import { NEAR_CAP, NEIGHBOURS, isCap, mapOrder, regionName } from './world.ts';

/** SPEC-SMALL ruling: the fleet starts at Tern Isle (the Scatter), within reach of the war; the brigade at Edda Vale. */
export const FLEET_START: RegionId = 'TRN';
export const BRIGADE_START: RegionId = 'EDV';
export function homeOf(kind: PieceKind): RegionId {
  return kind === 'fleet' ? FLEET_START : BRIGADE_START;
}

export { listNames };

/** One place's name, or "two places": the {n} slot of a tape line about several places. */
function placesSlot(c: RedlinesContent, ids: readonly RegionId[]): string {
  return ids.length === 1 ? regionName(ids[0]) : placesPhrase(c, ids.length);
}

/** A step down quiets one place that fell in an earlier week; the tape says which, after the step's own line. */
function quietOne(c: RedlinesContent, s: GameState): void {
  const quiet = recoverOne(s);
  if (quiet) say(c, s, 'recovered', { region: quiet });
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

/**
 * Why they chose a place, with the {piece} slot filled (the thought "they wanted to see whether the brigade would
 * fight"). SPEC-SMALL "The debrief reads motives when they were formed": the reason recorded when the heading was
 * planned; a heading from an old save without one is read now.
 */
function whyFor(c: RedlinesContent, s: GameState, h: Heading): string {
  const code = (h.why && h.why in c.strings.why ? h.why : targetWhy(s, h.to)) as WhyKind;
  const piece = h.whyPiece ?? pieceAt(s, h.to)?.kind ?? holdInfo(s, h.to).piece?.kind ?? nearestPiece(s, h.to).kind;
  return fill(c.strings.why[code], { piece: c.strings.pieces[piece] });
}

/**
 * The other columns land: a real push presses its place ("Federation forces push into X", or "More Federation forces
 * into X"), a feint stops short. The debrief's "they went for X" for a new front, and a feint's thought only when you
 * acted on it. SPEC-SMALL "The feint keeps its mystery": in a week with a test call these land after the answer.
 */
function landPushes(c: RedlinesContent, s: GameState, hs: readonly Heading[], sayHeading: (h: Heading) => void): void {
  const real = s.fed.headings.filter((h) => h.real).map((h) => h.to);
  const actedOn = (r: RegionId) => s.acts.some((a) => (a.kind === 'promise' && a.region === r) || (a.kind === 'move' && a.to === r));
  for (const h of hs) {
    if (h.real) {
      const was = s.regions[h.to].state;
      if (was === 'calm') sayHeading(h);
      if (was !== 'fighting') {
        press(s, h.to);
        say(c, s, was === 'pressed' ? 'pushedAgain' : 'pushed', { region: h.to });
      }
    } else {
      say(c, s, 'stoppedShort', { region: h.to });
      if (actedOn(h.to)) think(c, s, 'feint', { region: h.to, from: real.find((r) => r !== h.to) ?? h.to });
    }
  }
}

/** The debrief's one "they went for X" a week (a test, or a new front), with the reason recorded when it was planned. */
function headingThought(c: RedlinesContent, s: GameState): (h: Heading) => void {
  return (h) => {
    if (s.headingSaid === s.week) return;
    s.headingSaid = s.week;
    think(c, s, 'heading', { region: h.to, why: whyFor(c, s, h) });
  };
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
    if (a.kind === 'answer') continue;
    note(s, actLine(c, a));
    if (a.kind === 'move') T.moves++;
  }
  // A believed ring their plan for this week left alone (chosen when the week was planned): said once a game per place,
  // and only if the ring still stands, solid, with no arrow of this week's at it.
  const quiet = s.quietRing;
  s.quietRing = null;
  if (quiet && promiseAt(s, quiet) && holdInfo(s, quiet).ok && !s.fed.headings.some((h) => h.to === quiet)) {
    // Any of the thought's wordings counts (the pack has two, and think() may say either).
    const said = (c.debrief.notTested ?? []).some((t) => s.log.some((w) => w.hidden.includes(fill(t, { region: regionName(quiet) }))));
    if (!said) think(c, s, 'notTested', { region: quiet });
  }
  if (!log.acts.length) {
    note(s, c.strings.acts.none);
    T.idleWeeks++;
    // An idle week the closing card may count: a hatched, unanswered place a piece could have held with one move.
    if (pressedRegions(s).some((r) => !isAnswered(s, r) && s.pieces.some((p) => holdDistance(s, p, r) <= 1))) T.idleAnswerable = (T.idleAnswerable ?? 0) + 1;
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

  // 2. Their lines. The tape names what crossed it and where, then Wintermast's word and the step. SPEC-SMALL "The bluff
  //    is not a free read": a real line crossed rings the same call as the bluff (below), so the call is no tell.
  let crossed: { line: Line; region: RegionId } | null = null;
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
      const stepped = stepUp(s);
      say(c, s, stepped ? 'lineCrossed' : 'lineCrossedSame', { line: line.text });
      think(c, s, 'lineReal', { line: line.text, piece, region: at });
    } else {
      believe(s, RULES.bluffBelief);
      think(c, s, 'lineBluff', { line: line.text, piece, region: at });
    }
    if (!crossed || (!line.real && crossed.line.real)) crossed = { line, region: at };
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

  // 4. Their pushes land. The debrief gets at most one "they went for X" line a week, and only when it changed
  //    something: a test, or a new front (a calm place pressed; the pressure kept on says nothing new), with the reason
  //    recorded when the heading was planned. SPEC-SMALL "The feint keeps its mystery": when a test call rings, it rings
  //    before the other column's line prints; that column lands after the answer (finishWeek).
  const sayHeading = headingThought(c, s);
  let newTest: RegionId | null = null;
  const others: Heading[] = [];
  for (const h of s.fed.headings) {
    if (promiseAt(s, h.to) && !carried && !newTest && s.regions[h.to].state !== 'fighting') {
      newTest = h.to;
      say(c, s, 'tested', { region: h.to });
      if (h.real) sayHeading(h);
      if (holdInfo(s, h.to).ok) T.testsSolid++;
      else T.testsDashed++;
    } else others.push(h);
  }
  if (s.fed.headings.length === 2 && s.fed.headings.every((h) => h.real)) think(c, s, s.fed.headings.some((h) => h.timetable) ? 'bothRealTimetable' : 'bothReal');

  // 5. The phone: the carried test first, then a new test, then an event.
  const testCall = (region: RegionId, round: 1 | 2 | 3): boolean => {
    s.afterCall = others;
    if (ring(c, s, rng, { kind: 'test', region, round })) return true;
    s.afterCall = null;
    return false;
  };
  if (carried) {
    // The carried test is still on: the tape says so before the call rings again (its other columns land after the answer).
    say(c, s, 'tested', { region: carried });
    if (testCall(carried, s.pendingRound)) return s;
    s.pendingTest = null;
  }
  if (newTest) {
    s.pendingTest = newTest;
    s.pendingRound = 1;
    if (testCall(newTest, 1)) return s;
    s.pendingTest = null;
  }
  landPushes(c, s, others, sayHeading);
  const ev = pickEvent(c, s, rng, crossed);
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
  const act: Act = { kind: 'answer', key, region, phone: p.kind, round: p.round };
  s.acts.push(act);
  const cost = answerCost(s, key);
  s.influence = Math.max(0, s.influence - cost);
  // SPEC-SMALL ruling: what you did is printed as what you did ("You protested at Vessary"), never the form's forecast.
  note(s, actLine(c, act));

  if (p.kind === 'test' || p.kind === 'test-inherited' || p.kind === 'feint') {
    if (!region) return;
    const feint = isFeintTest(s, region, p.round);
    const inherited = !!promiseAt(s, region)?.inherited;
    const k = key === 'wait' && p.round >= 3 ? 'down' : key;
    const hold = holdInfo(s, region);
    if (k === 'back') {
      // A column that was never coming cannot beat a far garrison: a backed feint always "holds".
      const held = feint || hold.ok || rng.next() >= RULES.farFail;
      if (held) {
        let stepped = false;
        if (feint) {
          // SPEC-SMALL ruling: backing a feint earns nothing. They were not coming; the debrief says so.
          believe(s, RULES.backedFeintBelief);
          T.feintsBacked++;
          if (!T.feintBackedFirst) T.feintBackedFirst = region;
        } else {
          believe(s, hold.ok ? RULES.backedBelief : RULES.backedFarBelief);
          stepped = stepDown(s);
          if (hold.ok) {
            s.turnedAway[region] = s.week;
            T.backed++;
          }
          s.lastBacked = region;
        }
        s.pendingTest = null;
        // A provocation backed on its call is answered from now on (it cost a call, as the ruling says).
        const pm = promiseAt(s, region);
        if (pm?.provocation) delete pm.provocation;
        // It held: the place is answered this week, so a clock already running there starts again ("it held", then never "has fallen").
        if (s.regions[region].state === 'pressed') s.regions[region].pressedWeeks = 0;
        // Cause, then effect: the backing, then the place the step down quiets.
        say(c, s, hold.ok ? 'backed' : 'backedFar', { region });
        if (stepped) quietOne(c, s);
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
      if (s.lastBacked === region) s.lastBacked = null;
      T.backedDown++;
      if (!T.backedDownFirst) T.backedDownFirst = region;
      const cause = inherited ? 'back-down-inherited' : 'back-down';
      if (!feint) {
        press(s, region);
        s.regions[region].fellBy = cause;
      }
      // SPEC-SMALL ruling: BACK DOWN near a scared Federation is a step down (they wanted the fight no more than you did);
      // "Backing down is never the best answer": at most once a game, it returns no place, and it needs a step to come down.
      const eased = !feint && RULES.backDownEasesWhenScared && isScared(s.fed.jumpiness) && (T.eased ?? 0) < RULES.easedPerGame && s.fed.step > 1;
      T.jumpinessSeen = true;
      let climbed = false;
      if (eased) {
        stepDown(s);
        T.eased = (T.eased ?? 0) + 1;
        say(c, s, 'backedDownEased', { region });
        think(c, s, 'realBackedDownEased', { region });
      } else {
        climbed = stepUp(s);
        say(c, s, climbed ? 'backedDown' : 'backedDownSame', { region });
        think(c, s, feint ? 'feintBackedDown' : 'realBackedDown', { region });
      }
      // A back-down at the top of the ladder climbed nothing: the closing card never says it did (`top`).
      (T.backDowns ??= []).push({ region, week: s.week, feint, eased, ...(eased || climbed ? {} : { top: true }) });
      // Round 14: a promise nothing of yours could hold, backed down from, loses the place at once. Cause before
      // effect: the back-down's line first, then "X has fallen" (and no second step for it: the back-down's step was its step).
      if (!feint && RULES.backDownFarTakes && !hold.ok && s.regions[region].state !== 'fighting') {
        fall(s, region, cause);
        say(c, s, 'fell', { region });
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
      // Their excuse, as it was: a promised island tests your word; an island nobody promised was simply unguarded.
      think(c, s, 'trawler', { region, why: c.strings.why[region && promiseAt(s, region) ? 'curious' : 'unguarded'] });
      return;
    }
    case 'bluff-crossed': {
      if (key === 'down') {
        believe(s, -RULES.events.bluffPullBelief);
        uncross(s, region);
        say(c, s, 'bluffPulled', { region });
      } else say(c, s, key === 'back' ? 'bluffHeld' : 'bluffWaited', { region });
      // The call rings for a real line too (no tell); its silence is a bluff's only when the line crossed was the bluff.
      if (s.fed.lines.some((l) => !l.real && s.crossed[l.id] === s.week)) think(c, s, 'bluffPhone', { region });
      return;
    }
    case 'summit': {
      const why = c.strings.why[summitWhy(s)];
      if (key === 'back') {
        const stepped = stepDown(s);
        willing(s, RULES.willWayOut);
        s.waysOut++;
        s.wayOutWeek = s.week;
        if (blockedLastWeek(s)) T.stoppedThenTalked++;
        say(c, s, stepped ? 'summitAccepted' : 'summitAcceptedSame');
        if (stepped) quietOne(c, s);
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
      } else say(c, s, key === 'down' ? 'unpromisedLet' : 'unpromisedProtested', { region });
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

  // 6b. SPEC-SMALL "The feint keeps its mystery": the other columns of a week with a test call land after the answer.
  if (s.afterCall) {
    const hs = s.afterCall;
    s.afterCall = null;
    landPushes(c, s, hs, headingThought(c, s));
  }

  // 7. Places fall: pressed, unanswered, the clock (read at the step the week started at) run down. A place
  //    nothing of yours could have reached falls without a step, and the tape says so.
  for (const r of pressedRegions(s)) {
    const rec = s.regions[r];
    const clock = fallWeeksAt(stepWas);
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
  // At FIGHTING and ALL-OUT the fighting spreads on its own, one or two places a week; a piece or a solid promise spares a place,
  // and so does a place that came back this week (no place falls and recovers inside one week, in either order).
  const n = spreadAt(s.fed.step);
  if (n > 0) {
    // A promise backed this week that held is answered this week ("it held" is never followed by its fall, spread or not).
    const heldNow = (r: RegionId) => !!promiseAt(s, r) && s.acts.some((a) => a.kind === 'answer' && a.key === 'back' && a.region === r && (a.phone === 'test' || a.phone === 'test-inherited' || a.phone === 'feint'));
    const pool: Array<{ region: RegionId; from: RegionId }> = [];
    for (const f of fightingRegions(s))
      for (const r of NEIGHBOURS[f]) if (!isCap(r) && s.regions[r].state !== 'fighting' && s.regions[r].recoveredWeek !== week && !isSpared(s, r) && !heldNow(r) && !pool.some((p) => p.region === r)) pool.push({ region: r, from: f });
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
      const stepped = stepDown(s);
      willing(s, RULES.willWayOut);
      s.waysOut++;
      s.wayOutWeek = week;
      if (gained.length === 0 && blockedLastWeek(s)) T.stoppedThenTalked++;
      // Cause, then effect: their acceptance, then any place it returns (only a place that fell in an earlier week).
      say(c, s, 'wayOutAccepted', { term });
      if (stepped) quietOne(c, s);
      if (named && canRecover(s, named) && recover(s, named)) say(c, s, 'recovered', { region: named });
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
  // A place lost by an answer this week (backed down from, a failed back, the third WAIT) was answered, badly: its
  // step was the back-down's, so it is not also "taken unanswered" (the WAIT-then-BACK DOWN path printed both).
  const answeredThisWeek = (r: RegionId) => s.acts.some((a) => a.kind === 'answer' && a.region === r && (a.phone === 'test' || a.phone === 'test-inherited' || a.phone === 'feint'));
  const unansweredFalls = gained.filter((r) => s.regions[r].fellReach && s.regions[r].fellBy !== 'spread' && s.regions[r].fellBy !== 'failed' && !answeredThisWeek(r));
  if (unansweredFalls.length && stepUp(s)) say(c, s, 'takenStepUp', { n: placesSlot(c, unansweredFalls) });
  // SPEC-SMALL "Backing down is never the best answer": jumpiness shows on the sheet in the main loop. A piece of yours
  // next to their door slows a scared Federation (one push held back next week, its arrow stopping short) and provokes
  // a bold one (a step up).
  const near = s.pieces.find((p) => NEAR_CAP.includes(p.at));
  let slow = false;
  if (near) {
    T.jumpinessSeen = true;
    const piece = c.strings.pieces[near.kind];
    if (isScared(s.fed.jumpiness)) {
      if (rng.next() < s.fed.jumpiness * RULES.jumpyScale) {
        slow = true;
        say(c, s, 'wary', { region: near.at });
        think(c, s, 'jumpyWary', { piece, region: near.at });
      } else think(c, s, 'jumpyQuiet', { piece, region: near.at });
    } else if (rng.next() < (1 - s.fed.jumpiness) * RULES.jumpyScale && stepUp(s)) {
      // At the top of the ladder a provocation has nowhere to climb: the tape says nothing it cannot show.
      say(c, s, 'jumpy', { region: near.at });
      think(c, s, 'jumpy', { piece, region: near.at });
      T.jumpySteps = (T.jumpySteps ?? 0) + 1;
      if (!T.jumpyFirst) T.jumpyFirst = { piece: near.kind, region: near.at };
    } else think(c, s, 'jumpyQuiet', { piece, region: near.at });
  }
  if (s.fed.step >= RULES.accidentFrom && rng.next() < RULES.accidentChance && stepUp(s)) {
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

  // 11. The bars. −5 a place taken; +5 whenever nothing was taken (SPEC-SMALL ruling "Ten weeks, not eight": the
  //     plain spec rule); a bloc may sign in such a week. A place that fell this week is still fighting (nothing
  //     recovers the week it fell), so a week with a fall is never a quiet week.
  if (gained.length) {
    willing(s, -RULES.willPerGain * gained.length);
    say(c, s, 'gainedWeek', { n: gained.length === 1 ? c.strings.counts.placesOne : fill(c.strings.counts.placesMany, { n: numberWord(c, gained.length) }) });
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
  // SPEC-SMALL "The treaty is signed over a quiet map": at 100 they sign if nothing fell this week and no hatched place
  // stands unanswered; when the bar is at 100 and they do not sign, the tape says why.
  let ending: EndingKind | null = null;
  const open = unansweredRegions(s);
  if (s.war >= RULES.warLimit) ending = 'war';
  else if (s.fed.will >= RULES.willSign && !gained.length && (!open.length || !RULES.treatyNeedsQuietMap)) ending = 'treaty';
  else {
    if (s.fed.will >= RULES.willSign) say(c, s, gained.length ? 'noSignTaken' : 'noSignPressed', { n: placesSlot(c, open) });
    if (week >= RULES.weeks) ending = 'frozen';
  }
  const log = currentLog(s);
  log.danger = { war: s.war, treaty: s.treaty, step: s.fed.step };
  if (ending) {
    say(c, s, ending === 'war' ? 'worldWar' : ending === 'treaty' ? 'treatySigned' : 'frozen', { n: numberWord(c, s.war) });
    s.ending = endingOf(c, s, ending);
    // SPEC-SMALL "The debrief reads motives when they were formed": the lessons print once, on the closing card (the
    // ending carries them and the dials); the last week's page keeps only that week's thoughts. No week follows, so no
    // heading is planned: the sheet under the card shows no pins for a week that never comes.
    s.fed.headings = [];
    s.afterCall = null;
    s.phase = 'ended';
    s.pendingTest = null;
    s.offer = null;
    return s;
  }

  // 13. Next week.
  // A provocation ring they believe now is an ordinary ring: it pauses its clock from here on.
  for (const p of s.promises) if (p.provocation && provocationBelieved(s, p.region)) delete p.provocation;
  const plan = planHeadings(s, rng, null, week + 1, slow);
  // The believed ring this plan leaves alone is said on the page of the week it is left alone (beginWeek), not this one's.
  s.quietRing = plan.notTested;
  s.fed.headings = plan.headings;
  s.week = week + 1;
  s.influence = Math.max(0, s.influence + RULES.income - RULES.upkeep * s.promises.length);
  s.moved = [];
  s.acts = [];
  s.offer = null;
  s.beliefWas = s.fed.belief;
  return s;
}

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
 * it caused ("Backed down at Shoal · they ease off", then "Shoal has fallen"; "Wintermast accepts: a summit",
 * then "Guns quiet at X"), and each line is said right after the change it reports, so its beat (WeekLog.beats)
 * is the sheet it describes. A place that falls stays fallen that week: a step down eases the ladder word at once,
 * but only a place that fell in an earlier week comes back (board.ts recoverOne).
 */
import { Rng } from '../../engine/rng.ts';
import { acceptWayOut, blockedLastWeek, crossesLine, crossingThing, planHeadings, summitWhy, targetWhy } from './agent.ts';
import { believe, canRecover, clockOf, provocationBelieved, currentLog, fall, fellIn, fightingRegions, holdDistance, holdInfo, isAnswered, isSpared, nearestPiece, netActs, note, pieceAt, pieceOf, press, pressedRegions, promiseAt, recover, recoverOne, removePromise, restartClock, say, stepDown, stepUp, tally, think, unansweredRegions, willing } from './board.ts';
import type { RedlinesContent, WhyKind } from './content.ts';
import { endingOf } from './debrief.ts';
import { answerCost, makePhone, pickEvent, type PhoneContext } from './phone.ts';
import { markNoteReach } from './forecast.ts';
import { RULES, isScared, spreadAt } from './rules.ts';
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

/**
 * The places a bar at 100 did not sign over, named when the tape line still fits the teleprinter ("No treaty · Tern Isle
 * and Shoal unanswered"), else counted ("three places").
 */
function unansweredSlot(c: RedlinesContent, ids: readonly RegionId[]): string {
  if (ids.length > 1) {
    const named = listNames(ids);
    if (fill(c.strings.headlines.noSignPressed, { n: named }).length <= TAPE_CHARS) return named;
  }
  return placesSlot(c, ids);
}
/** The teleprinter's width, in characters once a line is filled (CONTENT.md "The tape"). */
const TAPE_CHARS = 46;

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

/**
 * The debrief's one "they went for X" a week (a test, or a new front), with the reason recorded when it was planned.
 * SPEC-SMALL "the heading reason reads as of the moment they chose": when the place is no longer as it was then (you
 * promised it after their orders were given, a piece left it), the thought says "when they chose it", never a present
 * reason the page's own WHAT YOU DID contradicts.
 */
function headingThought(c: RedlinesContent, s: GameState): (h: Heading) => void {
  return (h) => {
    if (s.headingSaid === s.week) return;
    s.headingSaid = s.week;
    const then = !!h.why && h.why !== targetWhy(s, h.to);
    think(c, s, then ? 'headingThen' : 'heading', { region: h.to, why: whyFor(c, s, h) });
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

  // 3. WAIT bought information: the column you waited on last week was for show, and it has gone home. When this week's
  //    arrow points at the same place, the tape says a new column has come (the two lines never contradict each other).
  if (s.feintGone) {
    say(c, s, s.fed.headings.some((h) => h.to === s.feintGone) ? 'feintGoneNew' : 'feintGone', { region: s.feintGone });
    s.feintGone = null;
  }

  // A carried test: they take the place while you wait, or the phone rings again below.
  let carried: RegionId | null = null;
  if (s.pendingTest) {
    const r = s.pendingTest;
    const rec = s.regions[r];
    if (rec.state === 'pressed' && rec.pressedWeeks >= clockOf(s, r)) {
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
  // SPEC-SMALL "The debrief teaches": said only when it changed something; the timetable's two arrows once a game, the first week it takes over.
  if (s.fed.headings.length === 2 && s.fed.headings.every((h) => h.real)) {
    if (!s.fed.headings.some((h) => h.timetable)) {
      if (!T.bothRealSaid) {
        T.bothRealSaid = true;
        think(c, s, 'bothReal');
      }
    } else if (!T.timetableSaid) {
      T.timetableSaid = true;
      think(c, s, 'bothRealTimetable');
    }
  }
  // SPEC-SMALL "Too late is said before you pay": a promised place at its last tick that nothing of yours answers (a ring
  // drawn into their siege they do not yet believe, or a dashed one) is not taken in silence. When no other test has the
  // week, they come to take it, and the call rings.
  if (RULES.lastTickRingCalls && !carried && !newTest) {
    const due = s.promises.find((p) => s.regions[p.region].state === 'pressed' && !isAnswered(s, p.region) && s.regions[p.region].pressedWeeks >= clockOf(s, p.region));
    if (due) {
      newTest = due.region;
      say(c, s, 'tested', { region: due.region });
      think(c, s, 'lastTick', { region: due.region });
      if (holdInfo(s, due.region).ok) T.testsSolid++;
      else T.testsDashed++;
    }
  }

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
        let eases = false;
        // SPEC-SMALL "A provocation costs what it claims": a ring drawn into their siege, backed, buys the pause only.
        const pm = promiseAt(s, region);
        // Solid or dashed alike (the third recheck: a dashed provocation backed took the real test's step down and turn-away).
        const pauseOnly = !feint && !!pm?.provocation && RULES.provocationPauseOnly;
        if (feint) {
          // SPEC-SMALL ruling: backing a feint earns nothing. They were not coming; the debrief says so.
          believe(s, RULES.backedFeintBelief);
          T.feintsBacked++;
          if (!T.feintBackedFirst) T.feintBackedFirst = region;
        } else if (pauseOnly) {
          // No belief, no step down, no turn-away: the ring stands, and from now on it pauses the place's clock.
          T.backed++;
          s.lastBacked = region;
        } else {
          believe(s, hold.ok ? RULES.backedBelief : RULES.backedFarBelief);
          eases = true;
          if (hold.ok) {
            s.turnedAway[region] = s.week;
            T.backed++;
          }
          s.lastBacked = region;
        }
        s.pendingTest = null;
        // A provocation backed on its call is answered from now on (it cost a call, as the ruling says).
        if (pm?.provocation) delete pm.provocation;
        // It held: the place is answered this week, so a clock already running there starts again ("it held", then never "has
        // fallen"). A provocation's pause only stops the clock where it stands (RULES.provocationRestart false).
        if (!pauseOnly || RULES.provocationRestart) restartClock(s, region);
        else if (!hold.ok) {
          // A dashed ring answers nothing from week to week, so its pause is this week's: the tick this week counted is taken
          // back (the clock stands as the sheet showed it at SEND ORDERS), and "it held" is never followed by its fall.
          const rec = s.regions[region];
          if (rec.state === 'pressed') rec.pressedWeeks = Math.max(0, rec.pressedWeeks - 1);
        }
        // Cause, then effect: the backing, then the place the step down quiets. SPEC-SMALL "'They turn away' only when they
        // do": a feint backed is "You backed X" alone, and so is a provocation's pause.
        say(c, s, feint || (pauseOnly && hold.ok) ? 'backedOnly' : hold.ok ? 'backed' : 'backedFar', { region });
        // The step down on its own line, after its cause (the cold recheck: the stamp eased in silence on the backing's
        // beat), then the place it quiets.
        if (eases && stepDown(s)) {
          say(c, s, 'easedStep');
          quietOne(c, s);
        }
        think(c, s, feint ? 'feintBacked' : pauseOnly ? 'provokedBacked' : 'realBacked', { region, cost });
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
        // At the top of the ladder a back-down climbs nothing ("· still ALL-OUT"): the page never says it did.
        think(c, s, feint ? 'feintBackedDown' : climbed ? 'realBackedDown' : 'realBackedDownTop', { region });
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
        if (region) restartClock(s, region);
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
          restartClock(s, region);
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
    if (!isAnswered(s, r) && rec.pressedWeeks >= clockOf(s, r) && s.pendingTest !== r) {
      const toldAlready = rec.fellBy === 'failed' || rec.fellBy === 'back-down' || rec.fellBy === 'back-down-inherited';
      // A ring still standing on it (another test had the week): it came too late, and the page never says "unanswered" of it.
      const ringed = !!promiseAt(s, r);
      fall(s, r, 'unanswered');
      say(c, s, 'fell', { region: r });
      if (rec.fellReach) {
        // A place you backed down from, or backed from too far, was explained when it happened; the fall needs no second thought.
        if (!toldAlready) think(c, s, ringed ? 'fallTooLate' : 'fall', { region: r });
      } else {
        say(c, s, 'fellOutOfReach', { region: r });
        think(c, s, 'fallOutOfReach', { region: r });
        T.outOfReach++;
        if (!T.outOfReachFirst) T.outOfReachFirst = r;
        if (!T.outOfReachRinged && (T.ringed ?? []).includes(r)) T.outOfReachRinged = r;
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
      willing(s, RULES.willWayOut);
      s.waysOut++;
      s.wayOutWeek = week;
      if (gained.length === 0 && blockedLastWeek(s)) T.stoppedThenTalked++;
      // Cause, then effect: their acceptance, then the step down on its own line, then any place it returns (only a place
      // that fell in an earlier week).
      say(c, s, 'wayOutAccepted', { term });
      if (stepDown(s)) {
        say(c, s, 'easedStep');
        quietOne(c, s);
      }
      if (named && canRecover(s, named) && recover(s, named)) say(c, s, 'recovered', { region: named });
      think(c, s, 'wayOutAccepted', { why });
    } else {
      say(c, s, 'wayOutRefused', { term });
      const words = c.strings.wintermast[answer.why as keyof typeof c.strings.wintermast];
      if (words) say(c, s, 'wayOutRefusedWhy', { why: fill(words, whySlots) });
      if (answer.why === 'indifferent' && whyRegion) {
        T.farDrops++;
        if (!T.farDropFirst) T.farDropFirst = whyRegion;
        // A standing promise they called a small thing: the form dims it from now on, with the tape's own words.
        if (answer.small && !(T.smallThings ?? []).includes(whyRegion)) T.smallThings = [...(T.smallThings ?? []), whyRegion];
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
      // SPEC-SMALL "Reading their nerve pays": a piece at a scared Federation's door holds back a push every week it stands there.
      if (RULES.scaredDoorHolds || rng.next() < s.fed.jumpiness * RULES.jumpyScale) {
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
    // SPEC-SMALL "An out-of-reach fall is war, not a failure": a place the tape called out of reach costs nothing on the bar.
    const charged = RULES.outOfReachFree ? gained.filter((r) => !(s.regions[r].fellBy === 'unanswered' && s.regions[r].fellReach === false)) : gained;
    willing(s, -RULES.willPerGain * charged.length);
    say(c, s, 'gainedWeek', { n: gained.length === 1 ? c.strings.counts.placesOne : fill(c.strings.counts.placesMany, { n: numberWord(c, gained.length) }) });
  } else {
    willing(s, RULES.willQuiet);
    say(c, s, 'quietWeek');
    // A bloc signs only while the bar can still move (a signing over a full bar moved nothing and said it did).
    if (week >= RULES.blocSignFrom && s.signed < RULES.maxBlocs && s.fed.will < RULES.willSign && rng.next() < RULES.blocSignChance) {
      s.signed++;
      willing(s, RULES.willBloc);
      say(c, s, 'blocSigned', { bloc: c.strings.blocs[s.signed === 1 ? 'SCT' : 'FRS'] });
    }
  }
  if (s.fed.belief >= RULES.believedLine && s.beliefWas < RULES.believedLine) think(c, s, 'believed');
  else if (s.fed.belief < RULES.doubtedLine && s.beliefWas >= RULES.doubtedLine) think(c, s, 'doubted');
  // A believed ring their plan for this week left alone (chosen when the week was planned): said at the week's end, on
  // its own week's page, only if the ring still stands, solid and believed (a provocation at RULES.provocationBelief),
  // with no arrow of this week's at it; once a game per place, whichever of its wordings was said.
  const quiet = s.quietRing;
  s.quietRing = null;
  if (quiet && promiseAt(s, quiet) && holdInfo(s, quiet).ok && s.fed.belief >= RULES.beliefTest && (!promiseAt(s, quiet)?.provocation || s.beliefWas >= RULES.provocationBelief) && !s.fed.headings.some((h) => h.to === quiet)) {
    const said = (c.debrief.notTested ?? []).some((t) => s.log.some((w) => w.hidden.includes(fill(t, { region: regionName(quiet) }))));
    if (!said) think(c, s, 'notTested', { region: quiet });
  }

  // 12. The endings.
  // SPEC-SMALL "The treaty is signed over a quiet map": at 100 they sign if nothing fell this week and no hatched place
  // stands unanswered; when the bar is at 100 and they do not sign, the tape says why.
  let ending: EndingKind | null = null;
  const open = unansweredRegions(s);
  if (s.war >= RULES.warLimit) ending = 'war';
  else if (s.fed.will >= RULES.willSign && !gained.length && (!open.length || !RULES.treatyNeedsQuietMap)) ending = 'treaty';
  else {
    // The bar at 100 without the signing says why; so does a bar that touched 100 this week and came down again (a way
    // out accepted before the week's place taken), so a full bar is never left unexplained.
    const touched = s.fed.will >= RULES.willSign || (currentLog(s).beats ?? []).some((b) => b.treaty >= RULES.willSign);
    if (touched) {
      if (gained.length) say(c, s, 'noSignTaken');
      else say(c, s, 'noSignPressed', { n: unansweredSlot(c, open) });
      // The first week the bar stood at 100 without the signing is the lesson's (the third recheck: a later week's out-of-reach
      // fall replaced the week the unanswered places decided).
      if (!T.noSign) T.noSign = { week, taken: gained.length > 0, regions: gained.length ? [] : [...open] };
    }
    if (week >= RULES.weeks) ending = 'frozen';
  }
  const log = currentLog(s);
  log.danger = { war: s.war, treaty: s.treaty, step: s.fed.step };
  if (ending) {
    // A feint waited on this week goes home before the ending (no next week would say so): the tape accounts for the
    // place it hatched, and the debrief's "the column went home" is on the tape (the shoulder recheck).
    if (s.feintGone) {
      say(c, s, 'feintGone', { region: s.feintGone });
      s.feintGone = null;
    }
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
  markNoteReach(s);
  return s;
}

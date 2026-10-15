/**
 * The simulator's cross-check (SPEC section 15): replay every case in
 * docs/war/v2/reference/fixtures.json (written by the reference's own fixtures.py) through the
 * TypeScript engine and list every difference. Any difference fails CI (gates.test.ts) and the
 * CLI's --strict run. Node only.
 */
import { STAFF_DEF, STAFF_IDS } from '../content/staff';
import {
  bestScore,
  bestSeating,
  crisisPool,
  dealFeatures,
  dealState,
  deadDeal,
  goldCount,
  pushPool,
  readoutView,
  reduceFeatures,
  decodeOwners,
  encodeOwners,
  groups,
  IDS,
  legal,
  lift,
  must,
  newGame,
  nextMark,
  nextTurn,
  pinAll,
  position,
  regionsWon,
  RULES,
  scorePins,
  send,
  sendLabel,
  tapOrder,
  target,
  warSpreadTarget,
  winOrder,
  type RegionId,
} from '../engine';
import { loadFixtures, toReference, type Fixtures } from '../engine/testdata';

export interface CrosscheckSection {
  name: string;
  /** Cases replayed. */
  cases: number;
  /** One line per difference ('score #12: score expected 63, got 64'). */
  differences: string[];
}

export interface CrosscheckResult {
  ok: boolean;
  cases: number;
  sections: CrosscheckSection[];
}

const show = (x: unknown) => JSON.stringify(x, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));

/** Collects differences for one section. */
class Section {
  readonly differences: string[] = [];
  cases = 0;
  constructor(readonly name: string) {}

  /** Compare one value of case `label` (deep, by JSON). */
  same(label: string, what: string, expected: unknown, got: unknown): void {
    const e = show(expected);
    const g = show(got);
    if (e !== g) this.differences.push(`${label}: ${what} expected ${e}, got ${g}`);
  }

  result(): CrosscheckSection {
    return { name: this.name, cases: this.cases, differences: this.differences };
  }
}

function owners(text: string) {
  const o = decodeOwners(text);
  if (!o) throw new Error(`fixtures: unreadable owner string '${text}'`);
  return o;
}

function checkSetup(fx: Fixtures): Section {
  const sec = new Section('map and tunables');
  sec.cases = 2;
  sec.same('ids', 'region ids', fx.ids, [...IDS]);
  sec.same('params', 'tunables', fx.params, {
    HOME: RULES.home,
    START_WAR: RULES.startWar,
    WAR_MIN_DIST: RULES.warMinDist,
    START_COINS: RULES.startCoins,
    COIN_PER_REGION: RULES.coinPerRegion,
    LOSE_AT: RULES.loseAt,
    LIT: RULES.lit,
    NEAR: RULES.near,
    MAXPINS: RULES.maxPins,
    SWAPS: RULES.swaps,
    T0: Number(RULES.target0),
    TR: [Number(RULES.targetRatio.num), Number(RULES.targetRatio.den)],
    LADDER: RULES.ladder.map(Number),
    LADDER_THEN: Number(RULES.ladderThen),
    WAR_EVERY: RULES.warEvery,
    SHOP_FIRST: RULES.shopFirst,
    SHOP_EVERY: RULES.shopEvery,
    OFFERS: RULES.offers,
    SEATS: RULES.seats,
    REROLL: RULES.reroll,
    PUSH_MISSES: RULES.pushMisses,
  });
  return sec;
}

function checkStaff(fx: Fixtures): Section {
  const sec = new Section('staff');
  sec.same('staff', 'ids in shop order', Object.keys(fx.staff), [...STAFF_IDS]);
  for (const [id, ref] of Object.entries(fx.staff)) {
    sec.cases++;
    const def = STAFF_DEF[id as keyof typeof STAFF_DEF];
    if (!def) {
      sec.differences.push(`staff ${id}: missing from content/staff.ts`);
      continue;
    }
    sec.same(`staff ${id}`, 'card', ref, { name: def.name, icon: def.object, price: def.price, rule: def.rule, chip: def.chip });
  }
  return sec;
}

function checkTargets(fx: Fixtures): Section {
  const sec = new Section('targets');
  fx.targets.forEach((t, i) => {
    sec.cases++;
    sec.same(`T(${i + 1})`, 'target', String(t), target(i + 1).toString());
  });
  return sec;
}

function checkScores(fx: Fixtures): Section {
  const sec = new Section('score');
  fx.score.forEach((c, i) => {
    sec.cases++;
    const res = scorePins(c.pins, c.seats, owners(c.owner), c.crisis, c.oldhandM10, { trace: !!c.trace });
    const label = `score #${i}`;
    sec.same(label, 'score', c.score, res.score.toString());
    sec.same(label, 'points', c.points, Number(res.points));
    sec.same(label, 'm10', c.m10, res.m10.toString());
    if (c.trace) sec.same(label, 'trace', c.trace, toReference(res.trace!));
  });
  return sec;
}

function checkLadder(fx: Fixtures): Section {
  const sec = new Section('ladder');
  fx.ladder.forEach((c, i) => {
    sec.cases++;
    const T = BigInt(c.target);
    const s = BigInt(c.score);
    sec.same(`ladder #${i}`, 'regions', c.regions, regionsWon(s, T));
    sec.same(`ladder #${i}`, 'next mark', c.next, nextMark(s, T).toString());
  });
  return sec;
}

function checkGroups(fx: Fixtures): Section {
  const sec = new Section('legal, groups and lift');
  fx.legal.forEach((c, i) => {
    sec.cases++;
    sec.same(`legal #${i}`, 'legal', c.legal, legal(c.pins, c.lit, c.crisis));
  });
  fx.groups.forEach((c, i) => {
    sec.cases++;
    sec.same(`groups #${i}`, 'count', c.count, groups(c.lit, c.crisis).length);
  });
  fx.lift.forEach((c, i) => {
    sec.cases++;
    sec.same(`lift #${i}`, 'pins left', c.left, lift(c.pinsInTapOrder, c.lift));
  });
  return sec;
}

function checkOwnership(fx: Fixtures): Section {
  const sec = new Section('win order and war spread');
  fx.winOrder.forEach((c, i) => {
    sec.cases++;
    sec.same(`winOrder #${i}`, 'order', c.order, winOrder(c.crisis, owners(c.owner), c.k, c.pins));
  });
  fx.warSpread.forEach((c, i) => {
    sec.cases++;
    sec.same(`warSpread #${i}`, 'spreads to', c.spreadsTo, warSpreadTarget(owners(c.owner)));
  });
  return sec;
}

/**
 * Dead deals: the best legal send as seated and under the best seating, and what the game says before
 * any pin (dealState, the readout's line, the SEND label).
 */
function checkDead(fx: Fixtures): Section {
  const sec = new Section('dead deals');
  const base = newGame('FIXTURES-DEAD');
  fx.dead.forEach((c, i) => {
    sec.cases++;
    const owner = owners(c.owner);
    const label = `dead #${i}`;
    sec.same(label, 'best', c.best, bestScore(c.lit, c.crisis, owner, c.seats, c.oldhandM10).toString());
    const fs = reduceFeatures(dealFeatures(c.lit, c.crisis, owner));
    const seating = bestSeating(fs, c.seats, goldCount(owner), c.oldhandM10);
    sec.same(label, 'best under any seating', c.bestAnyOrder, seating.score.toString());
    sec.same(label, 'best seating', c.seating, seating.seats);
    const s = position(base, {
      owner,
      seats: c.seats,
      oldHandM10: c.oldhandM10,
      deal: { crisis: c.crisis, lit: c.lit, target: BigInt(c.target), finalPush: c.finalPush, pile: c.pile, swapsLeft: c.swap ? 1 : 0 },
    });
    sec.same(label, 'state', c.state, dealState(s));
    sec.same(label, 'dead', c.dead, deadDeal(s));
    sec.same(label, 'SEND label', c.label, sendLabel(s).text);
    sec.same(label, 'readout line', c.line ?? 'NEED', c.line === null ? readoutView(s).line.split(' ')[0] : readoutView(s).line);
  });
  return sec;
}

/** The final push's crisis draw (A2): the red regions some fresh deal can win, else all of them. */
function checkPushDraw(fx: Fixtures): Section {
  const sec = new Section('push draw');
  fx.pushDraw.forEach((c, i) => {
    sec.cases++;
    const owner = owners(c.owner);
    const label = `push draw #${i}`;
    const { pool, finalPush } = crisisPool(owner);
    sec.same(label, 'red touching gold', c.red, finalPush ? pool : []);
    const drawn = pushPool(owner, c.red, c.seats, c.oldhandM10, target(c.turn));
    sec.same(label, 'pool', c.pool, drawn.pool);
    sec.same(label, 'draw', c.draw, drawn.draw);
  });
  return sec;
}

/** The forgiving final push: one send each, played through the actions (pin, send). */
function checkPush(fx: Fixtures): Section {
  const sec = new Section('final push');
  const base = newGame('FIXTURES-PUSH');
  fx.push.forEach((c, i) => {
    sec.cases++;
    const label = `push #${i}`;
    try {
      const at = position(base, {
        owner: owners(c.owner),
        seats: c.seats,
        oldHandM10: c.oldhandM10,
        turn: c.turn,
        pushMisses: c.pushMissesBefore,
        deal: { crisis: c.crisis, lit: c.lit, target: BigInt(c.target), finalPush: true },
      });
      const pinned = pinAll(at, tapOrder(c.pins));
      sec.same(label, 'SEND label', c.label, sendLabel(pinned).text);
      const s = must(send(pinned));
      const r = s.lastSend!;
      sec.same(label, 'score', c.score, r.score.toString());
      sec.same(label, 'result', c.result, r.result);
      sec.same(label, 'won', c.won, r.won.map((w) => w.id));
      sec.same(label, 'push misses after', c.pushMissesAfter, s.pushMisses);
      sec.same(label, 'ending', c.ending, s.ending);
      sec.same(label, 'map', c.ownerAfter, encodeOwners(s.owner));
    } catch (e) {
      sec.differences.push(`${label}: ${(e as Error).message}`);
    }
  });
  return sec;
}

/** FIRST-WORLD turns 1-2 played through the actions (newGame, pin, send, nextTurn). */
function checkFirstWorld(fx: Fixtures): Section {
  const sec = new Section('FIRST-WORLD game');
  let s = newGame('FIRST-WORLD');
  for (const [i, c] of fx.firstWorld.entries()) {
    sec.cases++;
    const label = `firstWorld turn ${c.turn}`;
    try {
      if (i > 0) s = must(nextTurn(s));
      sec.same(label, 'turn', c.turn, s.turn);
      sec.same(label, 'crisis', c.crisis, s.deal.crisis);
      sec.same(label, 'target', String(c.target), s.deal.target.toString());
      sec.same(label, 'lit', c.lit, s.deal.lit);
      s = must(send(pinAll(s, c.pins as RegionId[])));
      const r = s.lastSend!;
      sec.same(label, 'score', c.score, r.score.toString());
      sec.same(label, 'won', c.won, r.won.map((w) => w.id));
      sec.same(label, 'gold', c.gold, r.gold);
      sec.same(label, 'red', c.red, r.red);
      sec.same(label, 'coins', c.coins, s.coins);
      sec.same(label, 'map', c.owner, encodeOwners(s.owner));
    } catch (e) {
      sec.differences.push(`${label}: ${(e as Error).message}`);
      break;
    }
  }
  return sec;
}

export function crosscheckFixtures(fx: Fixtures = loadFixtures()): CrosscheckResult {
  const sections = [
    checkSetup(fx),
    checkStaff(fx),
    checkTargets(fx),
    checkScores(fx),
    checkLadder(fx),
    checkGroups(fx),
    checkOwnership(fx),
    checkDead(fx),
    checkPushDraw(fx),
    checkPush(fx),
    checkFirstWorld(fx),
  ].map((s) => s.result());
  return {
    ok: sections.every((s) => s.differences.length === 0),
    cases: sections.reduce((n, s) => n + s.cases, 0),
    sections,
  };
}

/** A few lines for the CLI: one per section, then the first differences. */
export function crosscheckText(r: CrosscheckResult, maxLines = 12): string {
  const out = [
    `${r.ok ? 'OK' : 'DIFFERENCES'}: ${r.cases.toLocaleString('en-GB')} reference cases replayed through the engine`,
    ...r.sections.map((s) => `  ${s.differences.length ? 'DIFF' : 'ok  '}  ${s.name.padEnd(26)} ${String(s.cases).padStart(4)} cases${s.differences.length ? `, ${s.differences.length} differ` : ''}`),
  ];
  const diffs = r.sections.flatMap((s) => s.differences);
  for (const d of diffs.slice(0, maxLines)) out.push(`    ${d}`);
  if (diffs.length > maxLines) out.push(`    ... and ${diffs.length - maxLines} more`);
  return out.join('\n');
}

/**
 * A fake engine and pack for the store's tests (vi.mock replaces ./engine with this module). The
 * shapes are the real ones (the engine's types); the rules are a tiny script: a promise costs 2,
 * SEND ORDERS in week 1 rings the phone, the answer finishes the week with two tape lines, week 3
 * ends in a treaty. Nothing here is imported by the game.
 */
import type { GameState, HoldInfo, Phone, PieceKind, RefusalCode, RegionId, Result, WayOutTerm } from '../../engine';

export const SAVE_KEY = 'brink.redlines.v1.save';
export const RULES = { warLimit: 8, wayOutPrice: { 'drop-promise': 10, 'pull-back': 15, summit: 20 } as Record<WayOutTerm, number>, maxPromises: 3 } as const;
export const STEP_WORDS = ['', 'TESTING', 'PUSHING', 'MASSING', 'FIGHTING', 'ALL-OUT'] as const;

export const REGION_IDS: RegionId[] = ['WMS', 'KLM', 'EDV', 'VSY', 'ASK', 'LTL', 'KLP', 'SHL'];
const NAMES: Record<string, string> = { WMS: 'Wintermast', KLM: 'Kellmark', EDV: 'Edda Vale', VSY: 'Vessary', ASK: 'Ashkettle', LTL: 'Lintel', KLP: 'Kelpmouth', SHL: 'Shoal' };
const CAP = new Set(['WMS', 'KLM']);
/** Land joins for the brigade, lanes for the fleet. */
const NEAR: Record<string, string[]> = { EDV: ['VSY', 'ASK'], VSY: ['EDV'], ASK: ['EDV', 'SHL'], SHL: ['ASK', 'LTL'], LTL: ['SHL', 'KLP'], KLP: ['LTL'], WMS: [], KLM: [] };

export const regionName = (id: RegionId): string => NAMES[id] ?? id;
export const isCap = (id: RegionId): boolean => CAP.has(id);
const BLOCS: Record<string, 'CAP' | 'HMR' | 'SCT' | 'SND' | 'FRS'> = { WMS: 'CAP', KLM: 'CAP', EDV: 'HMR', VSY: 'HMR', ASK: 'HMR', LTL: 'SND', KLP: 'SND', SHL: 'SCT' };
export const blocOf = (id: RegionId): 'CAP' | 'HMR' | 'SCT' | 'SND' | 'FRS' => BLOCS[id] ?? 'FRS';
export const BLOC_TITLES = { CAP: 'THE CAP', HMR: 'HIGHMARCH', SCT: 'THE SCATTER', SND: 'THE SOUND', FRS: 'FARSOUTH' } as const;

export const content = {
  advisers: {
    hawk: { id: 'hawk', name: 'Ruun Halder', role: 'General', tag: 'the Hawk', voice: '' },
    dove: { id: 'dove', name: 'Mara Teshen', role: 'Foreign Minister', tag: 'the Dove', voice: '' },
    intel: { id: 'intel', name: 'Dagny Fell', role: 'Intel Director', tag: 'the Director', voice: '' },
    ambassador: { id: 'ambassador', name: 'Aurelio Stane', role: 'Old Ambassador', tag: 'the Ambassador', voice: '' },
  },
  lines: [],
  phones: [],
  debrief: {},
  strings: {
    words: {
      defend: 'WE DEFEND',
      tested: 'TESTED',
      fighting: 'FIGHTING',
      back: 'BACK IT',
      down: 'BACK DOWN',
      wait: 'WAIT',
      steps: ['TESTING', 'PUSHING', 'MASSING', 'FIGHTING', 'ALL-OUT'],
      waitIsBackDown: 'no more time',
      sendOrders: 'SEND ORDERS',
      wayOut: 'A WAY OUT',
      theyAre: 'THEY ARE',
      war: 'WAR',
      treaty: 'TREATY',
      worldWar: 'WORLD WAR',
      frozen: 'FROZEN',
      week: 'WEEK',
      influence: 'influence',
    },
    explanation: ['One.', 'Two.', 'Three.'],
    blocs: { CAP: 'the Cap', HMR: 'Highmarch', SCT: 'the Scatter', SND: 'the Sound', FRS: 'Farsouth' },
    pieces: { fleet: 'the fleet', brigade: 'the brigade', alert: 'your alert', promise: 'your promise' },
    terms: { 'drop-promise': 'a dropped promise', 'pull-back': 'a pullback', summit: 'a summit' },
    numbers: ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'],
    counts: { none: 'no place fighting', one: 'one place still fighting', many: '{n} places still fighting', sentenceNone: 'No place is fighting.', sentenceOne: 'One place is still fighting.', sentenceMany: '{n} places are still fighting.', placesOne: 'one place', placesMany: '{n} places' },
    headlines: {
      pushed: 'Federation forces push into {region}',
      tested: 'They are testing your promise at {region}',
      backed: 'You backed {region} · they turn away',
      backedDown: 'You backed down at {region}',
      fell: '{region} has fallen',
      waitedFell: 'You waited too long · {region} has fallen',
      quietWeek: 'A quiet week · they gained nothing',
      gainedWeek: 'They took {n} this week',
      treatySigned: 'TREATY SIGNED',
      declared: '{line}',
      takenStepUp: 'A place taken, nobody came · now {step}',
      wayOutAccepted: 'Wintermast accepts: {term}',
      recovered: 'Guns quiet at {region}',
    },
    acts: { promise: 'You promised to defend {region}.', withdraw: 'You withdrew your promise to {region}.', move: 'You moved {piece} to {region}.', wayOut: 'You offered a way out: {term}.', none: 'You gave no orders.' },
    refusals: {
      'not-this-phase': 'not now',
      'inside-the-cap': "that is the Federation's own ground",
      'already-fighting': 'it is already fighting',
      'already-promised': 'we already defend it',
      'three-promises': 'three promises is the most we can keep',
      'no-influence': 'not enough influence',
      'not-promised': 'we made no promise there',
      'under-test': 'they are testing it now · answer the phone',
      'moved-already': 'one move a week for each piece',
      'not-adjacent': 'it cannot get there in a week',
      'no-such-piece': 'we have no such piece',
      'offered-already': 'one way out a week',
      'bad-term': 'that is not one of the three ways out',
      'no-such-phone': 'the phone is not ringing',
    },
    hold: { 'piece-there': '{piece} is there', 'piece-near': '{piece} is at {at}, within reach', 'inside-the-cap': "that is the Federation's own ground", 'out-of-reach': 'nothing of ours is within reach' },
    title: { subtitle: 'Red Lines', play: 'PLAY', continue: 'CONTINUE', howToPlay: 'HOW TO PLAY', blurb: 'Eight weeks.' },
    screen: { pressed: 'PRESSED', weekOf: 'of 8', warNone: 'nothing fighting · world war at 8', warOne: '1 region fighting · world war at 8', warMany: '{n} regions fighting · world war at 8', treatySub: 'the Federation\'s willingness to sign', ordersSent: 'ORDERS SENT', heading: 'heading here', inherited: 'inherited', skip: 'SKIP', next: 'NEXT', begin: 'BEGIN' },
    act: {
      promise: 'PROMISE TO DEFEND',
      withdraw: 'WITHDRAW',
      moveHere: 'MOVE HERE',
      move: 'MOVE',
      cancel: 'CANCEL',
      promiseCost: 'costs 1 influence a week',
      promiseSolid: 'solid · {hold}',
      promiseDashed: 'dashed · {hold} · a dashed ring invites a test',
      moveCost: 'costs 3 influence · one move a week',
      withdrawCost: "quietly · they'll believe us a little less",
      wayOutIntro: 'Give them a way to stop.',
      wayOutOffered: 'offered',
      termLabels: { 'drop-promise': 'DROP A PROMISE', 'pull-back': 'PULL A PIECE BACK', summit: 'A SUMMIT' },
      termCosts: { 'drop-promise': 'costs {cost} influence', 'pull-back': '{piece} goes home · costs {cost} influence', summit: 'no preconditions · costs {cost} influence' },
    },
    note: { pushing: 'They are pushing {bloc}.', pushingTwo: 'They are pushing {a} and {b}.', taken: 'They have taken {region}.', takenMany: 'They have taken {n} places.', tested: 'Your promise at {region} is being tested now.', heading: 'Their forces are heading for {region}.' },
    phone: { ringing: 'INCOMING', round2: 'the second week of this', round3: 'the third week of this', answered: 'ANSWERED' },
    menu: { menu: 'MENU', resume: 'RESUME', howToPlay: 'HOW TO PLAY', sound: 'SOUND', off: 'OFF', on: 'ON', quit: 'QUIT TO TITLE', quitSure: 'Quit?', yes: 'YES', no: 'NO' },
    debrief: { title: 'THE DEBRIEF', intro: 'again', week: 'Week {week}', youDid: 'what you did', theyThought: 'what they were thinking', nothingHidden: 'Nothing hidden.', next: 'NEXT', back: 'BACK', done: 'DONE', score: 'SCORE', again: 'PLAY AGAIN', toTitle: 'TITLE' },
    howToPlay: { title: 'HOW TO PLAY', lines: ['a', 'b'] },
    flavour: [],
  },
};
export const contentIssues: unknown[] = [];
export const onRedlinesContentChange = (): (() => void) => () => {};

const ok = (state: GameState): Result => ({ ok: true, state });
const no = (reason: RefusalCode): Result => ({ ok: false, reason });

function regions(): GameState['regions'] {
  return Object.fromEntries(REGION_IDS.map((r) => [r, { state: 'calm' as const, pressedWeeks: 0, quietWeeks: 0 }]));
}

export function newGame(_c: unknown, seed: string): GameState {
  return {
    seed,
    week: 1,
    phase: 'act',
    influence: 30,
    regions: regions(),
    promises: [{ region: 'LTL', since: 0, inherited: true }],
    pieces: [
      { kind: 'fleet', at: 'ASK' },
      { kind: 'brigade', at: 'EDV' },
    ],
    fed: { appetite: 0.5, jumpiness: 0.5, step: 1, belief: 50, will: 50, lines: [], headings: [{ from: 'KLM', to: 'KLP', real: true }, { from: 'WMS', to: 'LTL', real: false }] },
    war: 0,
    treaty: 50,
    phone: null,
    pendingTest: null,
    log: [],
    ending: null,
    collision: 'You inherited a promise to Lintel.',
    headline: ["Wintermast: 'no Republic forces in the Sound'", 'Inherited: a promise to defend Lintel'],
    offer: null,
    moved: [],
    acts: [],
    signed: 0,
    waysOut: 0,
    crossed: {},
    pendingRound: 1,
    turnedAway: {},
    events: 0,
    phonesUsed: [],
    lastBacked: null,
    beliefWas: 50,
  };
}

const copy = (s: GameState): GameState => JSON.parse(JSON.stringify(s)) as GameState;

export function promiseAt(s: GameState, region: RegionId) {
  return s.promises.find((p) => p.region === region);
}
export function pieceAt(s: GameState, region: RegionId) {
  return s.pieces.find((p) => p.at === region);
}
export function pieceOf(s: GameState, kind: PieceKind) {
  return s.pieces.find((p) => p.kind === kind);
}

export function holdable(s: GameState, region: RegionId): HoldInfo {
  if (isCap(region)) return { ok: false, why: 'inside-the-cap' };
  const there = pieceAt(s, region);
  if (there) return { ok: true, why: 'piece-there', piece: there };
  for (const p of s.pieces) if ((NEAR[p.at] ?? []).includes(region)) return { ok: true, why: 'piece-near', piece: p };
  return { ok: false, why: 'out-of-reach' };
}

export function canPromise(s: GameState, region: RegionId): { ok: boolean; reason?: RefusalCode } {
  if (s.phase !== 'act') return { ok: false, reason: 'not-this-phase' };
  if (isCap(region)) return { ok: false, reason: 'inside-the-cap' };
  if (promiseAt(s, region)) return { ok: false, reason: 'already-promised' };
  if (s.promises.length >= 3) return { ok: false, reason: 'three-promises' };
  return { ok: true };
}

export function promise(s: GameState, region: RegionId): Result {
  const can = canPromise(s, region);
  if (!can.ok) return no(can.reason!);
  const n = copy(s);
  n.promises.push({ region, since: n.week, inherited: false });
  n.influence -= 2;
  n.acts.push({ kind: 'promise', region });
  return ok(n);
}

export function withdraw(s: GameState, region: RegionId): Result {
  if (!promiseAt(s, region)) return no('not-promised');
  if (s.pendingTest === region) return no('under-test');
  const n = copy(s);
  n.promises = n.promises.filter((p) => p.region !== region);
  n.acts.push({ kind: 'withdraw', region });
  return ok(n);
}

export function movesFor(s: GameState, kind: PieceKind): RegionId[] {
  const p = pieceOf(s, kind);
  return p && !s.moved.includes(kind) ? NEAR[p.at] ?? [] : [];
}

export function movePiece(s: GameState, kind: PieceKind, region: RegionId): Result {
  if (s.moved.includes(kind)) return no('moved-already');
  if (!movesFor(s, kind).includes(region)) return no('not-adjacent');
  const n = copy(s);
  pieceOf(n, kind)!.at = region;
  n.influence -= 3;
  n.moved.push(kind);
  n.acts.push({ kind: 'move', piece: kind, to: region });
  return ok(n);
}

export function offerWayOut(s: GameState, term: WayOutTerm, detail?: RegionId | PieceKind): Result {
  if (s.offer) return no('offered-already');
  const n = copy(s);
  n.influence -= RULES.wayOutPrice[term];
  n.offer = { term, detail: detail ?? null, price: RULES.wayOutPrice[term] };
  n.acts.push({ kind: 'way-out', term, detail: detail ?? null });
  return ok(n);
}

const PHONE: Phone = {
  template: 'test-inherited-armour',
  kind: 'test-inherited',
  caller: { name: 'Ruun Halder', role: 'General', tag: 'the Hawk' },
  text: 'Federation armour is at Lintel.',
  advisers: { hawk: 'Move now.', dove: 'Think.', intel: 'Two brigades.' },
  region: 'LTL',
  round: 1,
  options: [
    { key: 'back', label: 'BACK IT', cost: 'costs 12 influence' },
    { key: 'down', label: 'BACK DOWN', cost: 'they will believe us less' },
    { key: 'wait', label: 'WAIT', cost: 'a week' },
  ],
};

/** Week 1: a push at Kelpmouth and a test at Lintel (the phone rings). Later weeks: a quiet week; week 3 signs. */
export function endWeek(_c: unknown, s: GameState): GameState {
  if (s.phase !== 'act') return s;
  const n = copy(s);
  const log = { week: n.week, visible: [] as string[], hidden: [] as string[], acts: [] as string[], danger: { war: n.war, treaty: n.treaty, step: n.fed.step } };
  log.acts.push(n.acts.length ? 'You gave orders.' : content.strings.acts.none);
  n.log.push(log);
  const say = (t: string) => {
    log.visible.push(t);
    n.headline = [...n.headline, t].slice(-6);
  };
  if (n.week === 1) {
    say('Federation forces push into Kelpmouth');
    n.regions.KLP.state = 'pressed';
    say('They are testing your promise at Lintel');
    n.pendingTest = 'LTL';
    n.phone = { ...PHONE };
    n.phase = 'phone';
    return n;
  }
  return finish(n, say);
}

function finish(n: GameState, say: (t: string) => void): GameState {
  const log = n.log[n.log.length - 1];
  n.phone = null;
  n.phase = 'act';
  say('A quiet week · they gained nothing');
  n.fed.will = Math.min(100, n.fed.will + (n.week === 3 ? 50 : 5));
  n.treaty = n.fed.will;
  log.hidden.push('They went for Kelpmouth because nobody had promised it.');
  if (n.treaty >= 100) {
    say('TREATY SIGNED');
    n.phase = 'ended';
    n.ending = { kind: 'treaty', week: n.week, fighting: n.war, score: 100 - 10 * n.week, lines: [`Signed in week ${n.week}.`, 'They stopped.'], because: 'They stopped.', dials: 'They were patient and watchful.' };
    return n;
  }
  n.week++;
  n.acts = [];
  n.moved = [];
  n.offer = null;
  n.influence += 8;
  return n;
}

export function canAnswer(s: GameState, key: 'back' | 'down' | 'wait'): { ok: boolean; reason?: RefusalCode } {
  if (s.phase !== 'phone' || !s.phone) return { ok: false, reason: 'no-such-phone' };
  if (key === 'back' && s.influence < 12) return { ok: false, reason: 'no-influence' };
  return { ok: true };
}

export const answerCost = (s: GameState, key: 'back' | 'down' | 'wait'): number => (key === 'back' && s.phone ? 12 : 0);
export const backCost = (): number => 12;

export function answerPhone(_c: unknown, s: GameState, key: 'back' | 'down' | 'wait'): GameState {
  if (!canAnswer(s, key).ok) return s;
  const n = copy(s);
  const log = n.log[n.log.length - 1];
  const say = (t: string) => {
    log.visible.push(t);
    n.headline = [...n.headline, t].slice(-6);
  };
  n.acts.push({ kind: 'answer', key, region: 'LTL', phone: 'test-inherited' });
  log.acts.push(key === 'back' ? 'BACK IT · costs 12 influence' : key === 'down' ? 'BACK DOWN' : 'WAIT');
  if (key === 'back') {
    n.influence -= 12;
    n.pendingTest = null;
    say('You backed Lintel · they turn away');
    log.hidden.push('They meant it at Lintel. You backed it and they turned away.');
  } else if (key === 'down') {
    n.promises = n.promises.filter((p) => p.region !== 'LTL');
    n.regions.LTL.state = 'fighting';
    n.regions.LTL.fellWeek = n.week;
    n.pendingTest = null;
    n.war = 1;
    n.fed.step = 2;
    say('You backed down at Lintel');
  } else {
    n.pendingRound = 2;
    say('You asked for time at Lintel');
  }
  return finish(n, say);
}

export function debrief(s: GameState) {
  return s.log.flatMap((w) => w.hidden.map((thought) => ({ week: w.week, what: w.acts.join(' '), thought })));
}
export const scoreOf = (e: { kind: string; week: number; fighting: number }): number => (e.kind === 'treaty' ? 100 - 10 * e.week - 5 * e.fighting : e.kind === 'frozen' ? 9 - e.fighting : 0);

export function saveGame(s: GameState): string {
  return JSON.stringify({ format: 'fake', state: s });
}
export function loadGame(text: string | null | undefined): GameState | null {
  if (!text) return null;
  try {
    const d = JSON.parse(text) as { format?: string; state?: GameState };
    return d.format === 'fake' && d.state ? d.state : null;
  } catch {
    return null;
  }
}
export const isGameState = (x: unknown): x is GameState => !!x && typeof x === 'object' && 'seed' in (x as object);

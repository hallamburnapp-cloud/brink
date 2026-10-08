/**
 * The UI store: wraps the pure engine with signals, timers, effects sequencing,
 * persistence of the run in progress, meta-progression hooks and analytics.
 */
import { computed, signal } from '@preact/signals';
import { content as liveContent, onContentChange } from '../content';
import {
  buryCard,
  buyOrder,
  buyPiece,
  choose,
  continueRun,
  createRun,
  ctxFor,
  leaveShop,
  removeTag,
  rerollCost,
  rerollShop,
  sellPiece,
  sellPrice,
  template,
  useOrder,
  view,
} from '../engine/run';
import { randomSeed } from '../engine/rng';
import type { AccidentResult, Content, EndingDef, LeverageBreakdown, Mode, RollResult, RunEvent, RunState, Seat } from '../engine/types';
import { nightClock, shiftClock } from '../engine/night';
import { audio } from '../audio';
import { snd } from './sound';
import { load, save, remove } from '../meta/storage';
import { dailyNumber, dailyPlayed, dailyRecordFromRun, dailySeat, dailySeed, getDailyRecord, saveDailyRecord, type DailyRecord } from '../meta/daily';
import { evaluateUnlocks, isUnlocked, unlockedIds } from '../meta/unlocks';
import { getStats, recordOffer, recordRun } from '../meta/stats';
import { countRun, daysSinceFirstRun, track } from '../meta/analytics';
import { recordScore } from '../meta/score';
import { FEATURES } from '../config';

export type Screen = 'home' | 'seat' | 'run' | 'ending' | 'compendium' | 'stats' | 'privacy' | 'unlocked' | 'settings' | 'paywall' | 'about';

export interface RunMeta {
  mode: Mode;
  dailyNumber?: number;
  offered: string[];
  startedAt: number;
  unlockedNow: string[];
  runsThisSession: number;
  newBest: boolean;
}

const RUN_KEY = 'brink.run.current';
const SETTINGS_KEY = 'brink.settings';

export interface Settings {
  motion: 'auto' | 'reduce';
  muted: boolean;
  seenIntro: boolean;
}

export const content = signal<Content>(liveContent);
export const screen = signal<Screen>('home');
export const run = signal<RunState | null>(null);
export const runMeta = signal<RunMeta | null>(null);
export const busy = signal(false);
export const rollOverlay = signal<{ result: RollResult; slow: boolean } | null>(null);
export const accidentOverlay = signal<{ result: AccidentResult; phase: 'breath' | 'result' } | null>(null);
export const tally = signal<{ breakdown: LeverageBreakdown; key: number; actLeverage: number; actTarget: number } | null>(null);
export const banner = signal<{ title: string; sub?: string; kind: 'act' | 'flashpoint' | 'ante_met' | 'ante_smashed' | 'ante_missed' | 'deadman' } | null>(null);
export const toasts = signal<{ id: number; text: string; kind?: 'info' | 'warn' | 'good' }[]>([]);
export const shake = signal<{ n: number; strength: number }>({ n: 0, strength: 1 });
export const lastApplied = signal<Partial<Record<string, number>>>({});
export const settings = signal<Settings>(load<Settings>(SETTINGS_KEY, { motion: 'auto', muted: false, seenIntro: false }));
export const hasSavedRun = signal(false);
/** The hotel: the world's one-line answer to the last choice, shown until the next decision. */
export const reply = signal<{ text: string; speaker: string; outcome?: 'success' | 'failure' } | null>(null);
/** The hotel pack is loaded (the night desk screens instead of the crisis ones). */
export const hotel = computed(() => content.value.voice === 'hotel');
export const endlessAvailable = signal(!FEATURES.paywall || FEATURES.allUnlocked);

export const cardView = computed(() => (run.value && run.value.phase === 'card' ? view(content.value, run.value) : null));
export const danger = computed(() => (run.value ? run.value.meters.escalation / 100 : 0));
export const currentEnding = computed<EndingDef | null>(() => {
  const s = run.value;
  if (!s || !s.ending) return null;
  return content.value.endings[s.ending] ?? null;
});

let toastId = 0;
export function toast(text: string, kind: 'info' | 'warn' | 'good' = 'info', ms = 2600): void {
  const id = ++toastId;
  toasts.value = [...toasts.value, { id, text, kind }];
  setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), ms);
}

/** The mode of the run saved on this device (so Home can offer to pick it back up instead of starting another). */
export const savedRunMode = signal<Mode | null>(null);

/**
 * Change screen. Every change is a history entry, so the phone's back button and the browser's
 * back arrow walk back through the app and never out of it by surprise; a run in progress is
 * kept (it is saved on every card) and Home offers to pick it back up.
 */
export function goto(s: Screen, opts: { replace?: boolean; fromHistory?: boolean } = {}): void {
  screen.value = s;
  if (typeof history !== 'undefined' && !opts.fromHistory) {
    const path = s === 'privacy' ? '/privacy' : s === 'unlocked' ? '/unlocked' : '/';
    const state = { screen: s };
    if (opts.replace || history.state === null) history.replaceState(state, '', path);
    else history.pushState(state, '', path);
  }
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
}

/** Leave the run screen for Home without ending the run: it stays saved and resumable. */
export function leaveToHome(): void {
  if (run.value && run.value.phase !== 'ended') {
    persist();
    hasSavedRun.value = true;
    savedRunMode.value = runMeta.value?.mode ?? null;
    toast('Saved. Pick the phone back up whenever you like.', 'good');
  }
  snd.heartbeat(null);
  snd.pulse(null);
  snd.drone(false);
  goto('home');
}

function onPopState(e: PopStateEvent): void {
  const target = (e.state && (e.state as { screen?: Screen }).screen) || 'home';
  // Going back out of a run keeps it; going back onto a run screen with no run goes home instead.
  if (target === 'run' || target === 'ending') {
    if (!run.value) return goto('home', { fromHistory: true });
    if (run.value.phase === 'ended' && target === 'run') return goto('ending', { fromHistory: true });
  }
  if (screen.value === 'run' && run.value && run.value.phase !== 'ended') {
    persist();
    hasSavedRun.value = true;
    savedRunMode.value = runMeta.value?.mode ?? null;
    snd.heartbeat(null);
    snd.pulse(null);
    snd.drone(false);
  }
  goto(target, { fromHistory: true });
}

export function updateSettings(patch: Partial<Settings>): void {
  settings.value = { ...settings.value, ...patch };
  save(SETTINGS_KEY, settings.value);
  applySettings();
}

function applySettings(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.motion = settings.value.motion;
  audio.setMuted(settings.value.muted);
}

export function reducedMotion(): boolean {
  if (settings.value.motion === 'reduce') return true;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function doShake(strength: number): void {
  shake.value = { n: shake.value.n + 1, strength };
}

// ------------------------------------------------------------------ boot

export function boot(): void {
  applySettings();
  onContentChange((c) => {
    content.value = c;
    if (run.value) run.value = { ...run.value };
    toast('Content reloaded', 'good');
  });
  const saved = load<{ state: RunState; meta: RunMeta } | null>(RUN_KEY, null);
  hasSavedRun.value = !!saved && saved.state.v === 2 && saved.state.phase !== 'ended';
  savedRunMode.value = hasSavedRun.value && saved ? saved.meta.mode : null;
  if (typeof location !== 'undefined') {
    if (location.pathname === '/privacy') screen.value = 'privacy';
    else if (location.pathname === '/unlocked') screen.value = 'unlocked';
  }
  if (typeof window !== 'undefined') {
    // The first entry carries its screen. Without a state on it, the first screen change would replace
    // it and the phone's back button from the very first night would leave the app instead of coming
    // home. The query string stays (the unlock page reads its session id from it).
    if (history.state === null) history.replaceState({ screen: screen.value }, '', location.pathname + location.search);
    window.addEventListener('popstate', onPopState);
  }
  if (typeof document !== 'undefined') {
    const unlock = () => audio.unlock();
    document.addEventListener('pointerdown', unlock, { once: true, passive: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        snd.heartbeat(null);
        snd.pulse(null);
      }
    });
  }
  danger.subscribe((d) => {
    if (typeof document !== 'undefined') document.documentElement.style.setProperty('--danger', d.toFixed(3));
    snd.intensity(d);
    snd.pulse(run.value && screen.value === 'run' && d >= 0.8 && run.value.phase === 'card' ? Math.round(70 + (d - 0.8) * 400) : null);
  });
}

// ------------------------------------------------------------------ run lifecycle

function persist(): void {
  if (run.value && runMeta.value && run.value.phase !== 'ended') {
    save(RUN_KEY, { state: run.value, meta: runMeta.value });
    hasSavedRun.value = true;
  } else {
    remove(RUN_KEY);
    hasSavedRun.value = false;
  }
}

export function startRun(opts: { mode: Mode; seat: Seat; seed?: string; difficulty?: 1 | 2 | 3 | 4 | 5; booking?: string; flags?: string[] }): void {
  const c = content.value;
  const seed = opts.seed ?? (opts.mode === 'daily' ? dailySeed() : randomSeed());
  const unlocked = FEATURES.allUnlocked ? ('all' as const) : unlockedIds();
  const state = createRun(c, { seed, seat: opts.seat, mode: opts.mode, difficulty: opts.difficulty ?? 5, unlocked, booking: opts.booking, flags: opts.flags });
  reply.value = null;
  run.value = state;
  runMeta.value = {
    mode: opts.mode,
    dailyNumber: opts.mode === 'daily' ? dailyNumber() : undefined,
    offered: [],
    startedAt: Date.now(),
    unlockedNow: [],
    runsThisSession: countRun(),
    newBest: false,
  };
  rollOverlay.value = null;
  accidentOverlay.value = null;
  tally.value = null;
  banner.value = null;
  lastApplied.value = {};
  persist();
  goto('run');
  const cohortDay = daysSinceFirstRun();
  track('run_start', { seat: opts.seat, mode: opts.mode, difficulty: opts.difficulty ?? 5, runs_this_session: runMeta.value.runsThisSession, days_since_first_run: cohortDay });
  if (opts.mode === 'daily') track('daily_played', { number: dailyNumber(), days_since_first_run: cohortDay });
  snd.play('ring');
  if (hotel.value) return;
  if (state.ruleset === 'simple') showBanner({ title: '3:00 AM', sub: 'the phone is ringing', kind: 'act' }, 1400);
  else showBanner({ title: c.acts[0].name, sub: `${c.seats[opts.seat].name} · target ${state.actTarget}`, kind: 'act' });
}

// ------------------------------------------------------------------ the hotel's shifts

const MEMORY_KEY = 'brink.memory';
/** What the regulars remember from last night (up to eight `memory:` flags). */
export function loadMemory(): string[] {
  const m = load<unknown>(MEMORY_KEY, []);
  return Array.isArray(m) ? m.filter((f): f is string => typeof f === 'string' && f.startsWith('memory:')).slice(-8) : [];
}
function saveMemory(state: RunState): void {
  const fresh = state.flags.filter((f) => f.startsWith('memory:'));
  const merged = [...loadMemory().filter((f) => !fresh.includes(f)), ...fresh].slice(-8);
  save(MEMORY_KEY, merged);
}

/** The one seat of a one-seat pack, or the daily seat of a pack with several. */
export function hotelSeat(): Seat {
  const seats = Object.keys(content.value.seats) as Seat[];
  return seats.length === 1 ? seats[0] : dailySeat();
}

/** A player's very first night is a gentler practice night on The Swan. */
export function isFirstNight(): boolean {
  return getStats().nights === 0 && !hasSavedRun.value;
}

/**
 * The hotel's three ways in. `practice`: any night, free, instant, never recorded (the first
 * one is The Swan at the first-night scale). `tonight`: the shared night, one recorded
 * attempt, picked back up if left. `again`: the last night's seed, as practice.
 */
export function startShift(kind: 'practice' | 'tonight' | 'again'): void {
  const c = content.value;
  const seat = hotelSeat();
  const flags = loadMemory();
  if (kind === 'tonight') {
    if (dailyPlayed()) {
      toast('Tonight is already in the book. The next night starts at midnight UTC.', 'warn');
      return;
    }
    if (hasSavedRun.value && savedRunMode.value === 'daily' && resumeRun()) return;
    startRun({ mode: 'daily', seat, seed: dailySeed(), difficulty: 5, flags });
    return;
  }
  if (kind === 'again') {
    const last = run.value;
    if (last) {
      startRun({ mode: 'night', seat: last.seat, seed: last.seed, difficulty: last.difficulty as 1 | 2 | 3 | 4 | 5, booking: last.booking, flags });
      return;
    }
  }
  if (isFirstNight()) {
    const swan = c.bookings.swan ? 'swan' : undefined;
    startRun({ mode: 'night', seat, seed: 'first-night', difficulty: 1, booking: swan, flags });
    return;
  }
  startRun({ mode: 'night', seat, difficulty: 5, flags });
}

/** The booking of the saved or current run, for Home's "Pick the phone back up · THE SWAN". */
export function savedBookingName(): string | null {
  const saved = load<{ state: RunState } | null>(RUN_KEY, null);
  const id = saved?.state?.booking;
  return id ? content.value.bookings[id]?.name ?? null : null;
}

/** Today's review from the record, for Home and the reopenable Review. */
export function todaysReview() {
  return getDailyRecord();
}

/** What the saved run is, for Home: the Booking's name and the clock it was left at. */
export function savedRunSummary(): { booking: string | null; clock: string | null } {
  const saved = load<{ state: RunState } | null>(RUN_KEY, null);
  const st = saved?.state;
  if (!st) return { booking: null, clock: null };
  const c = content.value;
  return { booking: st.booking ? c.bookings[st.booking]?.name ?? null : null, clock: shiftClock(c, st) };
}

/** The plate: a chosen Booking as a practice night, with a seed to send along or a fresh one. */
export function startBooking(id: string, seed?: string): void {
  if (!endlessAvailable.value) return goto('paywall');
  if (!content.value.bookings[id]) return;
  startRun({ mode: 'night', seat: hotelSeat(), seed, difficulty: 5, booking: id, flags: loadMemory() });
}

/** A past Tonight from the record, worked again as practice (the same seed gives the same night). */
export function startArchived(rec: DailyRecord): void {
  const seat = content.value.seats[rec.seat] ? rec.seat : hotelSeat();
  startRun({ mode: 'night', seat, seed: rec.seed, difficulty: 5, booking: rec.booking, flags: loadMemory() });
}

/** Any night, any seat: the unlock's mode (free where there is no paywall). */
export function startNight(seat?: Seat, seed?: string): void {
  if (!endlessAvailable.value) return goto('paywall');
  const c = content.value;
  const seats = Object.keys(c.seats) as Seat[];
  const pick = seat ?? seats[Math.floor(Math.random() * seats.length)];
  startRun({ mode: 'night', seat: pick, seed, difficulty: 5 });
}

export function startDaily(): void {
  if (dailyPlayed()) {
    toast('Tonight is already on record. Come back after midnight UTC.', 'warn');
    return;
  }
  // Tonight is one attempt: a night left half-played is picked back up, never restarted.
  if (hasSavedRun.value && savedRunMode.value === 'daily' && resumeRun()) return;
  startRun({ mode: 'daily', seat: dailySeat(), seed: dailySeed(), difficulty: 5 });
}

export function resumeRun(): boolean {
  const saved = load<{ state: RunState; meta: RunMeta } | null>(RUN_KEY, null);
  if (!saved || saved.state.v !== 2 || saved.state.phase === 'ended') return false;
  const s = saved.state;
  // Content may have changed since the save: never resume onto a card that no longer exists.
  if (s.phase === 'card' && (!s.current || !content.value.cards[s.current])) {
    remove(RUN_KEY);
    hasSavedRun.value = false;
    toast('The saved run referred to cards that no longer exist. Starting fresh.', 'warn');
    return false;
  }
  run.value = s;
  runMeta.value = { ...saved.meta, newBest: saved.meta.newBest ?? false };
  savedRunMode.value = null;
  hasSavedRun.value = false;
  goto('run');
  return true;
}

export function abandonRun(): void {
  run.value = null;
  runMeta.value = null;
  remove(RUN_KEY);
  hasSavedRun.value = false;
  savedRunMode.value = null;
  snd.heartbeat(null);
  snd.pulse(null);
  snd.drone(false);
  goto('home');
}

export function runAgain(): void {
  const s = run.value;
  const m = runMeta.value;
  if (!s || !m) return goto('home');
  if (!endlessAvailable.value) return goto('paywall');
  if (s.ruleset === 'simple') return startNight(s.seat);
  startRun({ mode: m.mode === 'daily' ? 'endless' : m.mode, seat: s.seat, difficulty: s.difficulty });
}

export function replaySeed(): void {
  const s = run.value;
  const m = runMeta.value;
  if (!s || !m) return goto('home');
  if (!endlessAvailable.value) return goto('paywall');
  if (s.ruleset === 'simple') return startNight(s.seat, s.seed);
  startRun({ mode: m.mode === 'daily' ? 'endless' : m.mode, seat: s.seat, seed: s.seed, difficulty: s.difficulty });
}

function showBanner(b: NonNullable<typeof banner.value>, ms = 1800): void {
  banner.value = b;
  setTimeout(() => {
    if (banner.value === b) banner.value = null;
  }, ms);
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function tallyDuration(total: number): number {
  if (reducedMotion()) return 500;
  if (total < 60) return 800;
  if (total < 400) return 1100;
  if (total < 3000) return 1500;
  return 2000;
}

/** Commit a decision for the card it was issued for. The card component has already animated out. */
export async function decide(side: 'left' | 'right' | 'timeout', forCard: string): Promise<void> {
  const s = run.value;
  if (!s || busy.value || s.phase !== 'card' || s.current !== forCard) return;
  busy.value = true;
  snd.heartbeat(null);
  const wasFlashpoint = !!s.flashpoint;
  if (side !== 'timeout') snd.play('commit');
  const { events } = choose(content.value, s, side);
  run.value = { ...s };
  persist();
  await processEvents(events, wasFlashpoint);
  persist();
  busy.value = false;
}

export async function bury(): Promise<void> {
  const s = run.value;
  if (!s || busy.value || s.phase !== 'card' || s.charges.removal <= 0) return;
  busy.value = true;
  snd.play('slide');
  const { events } = buryCard(content.value, s);
  run.value = { ...s };
  toast('Buried. You will not hear about it again.', 'good');
  await processEvents(events, false);
  persist();
  busy.value = false;
}

export async function useOrderAt(index: number): Promise<void> {
  const s = run.value;
  if (!s || busy.value || s.phase !== 'card') return;
  busy.value = true;
  const before = s.orders[index];
  const { events } = useOrder(content.value, s, index);
  run.value = { ...s };
  if (events.some((e) => e.type === 'order_used')) {
    snd.play('reveal');
    toast(`${content.value.orders[before]?.name ?? 'Order'}: done.`, 'good');
  } else toast('That order has nothing to act on right now.', 'warn');
  await processEvents(events, false);
  persist();
  busy.value = false;
}

// ---- shop

export function shopBuy(index: number): void {
  const s = run.value;
  if (!s || s.phase !== 'shop') return;
  const offer = s.shop?.offers[index];
  const { events } = buyPiece(content.value, s, index);
  run.value = { ...s };
  if (events.some((e) => e.type === 'capital')) {
    snd.play('capital');
    if (offer) {
      recordOffer([offer.piece]);
      if (runMeta.value) runMeta.value = { ...runMeta.value, offered: [...runMeta.value.offered, offer.piece] };
    }
    for (const e of events) if (e.type === 'reveal') toast('A hidden value is now readable.', 'good');
  } else toast(s.capital < (offer?.price ?? 0) ? 'Not enough political capital.' : 'No room in the cabinet. Sell something first.', 'warn');
  persist();
}

export function shopSell(pieceId: string): void {
  const s = run.value;
  if (!s || s.phase !== 'shop') return;
  sellPiece(content.value, s, pieceId);
  run.value = { ...s };
  snd.play('capital');
  persist();
}

export function shopReroll(): void {
  const s = run.value;
  if (!s || s.phase !== 'shop') return;
  const cost = rerollCost(s, ctxFor(content.value, s));
  if (s.capital < cost) return toast('Not enough political capital to reroll.', 'warn');
  rerollShop(content.value, s);
  run.value = { ...s };
  snd.play('slide');
  persist();
}

export function shopBuyOrder(index: number): void {
  const s = run.value;
  if (!s || s.phase !== 'shop') return;
  const { events } = buyOrder(content.value, s, index);
  run.value = { ...s };
  if (events.length) snd.play('capital');
  else toast(s.orders.length >= 2 ? 'You can only carry two orders.' : 'Not enough political capital.', 'warn');
  persist();
}

export function shopRemoveTag(tag: string): void {
  const s = run.value;
  if (!s || s.phase !== 'shop') return;
  const { events } = removeTag(content.value, s, tag);
  run.value = { ...s };
  if (events.length) {
    snd.play('commit');
    toast(`No more ${tag} cards this run.`, 'good');
  } else toast('Cannot remove that (one per visit, 4 capital).', 'warn');
  persist();
}

export async function shopLeave(): Promise<void> {
  const s = run.value;
  if (!s || busy.value || s.phase !== 'shop') return;
  busy.value = true;
  const { events } = leaveShop(content.value, s);
  run.value = { ...s };
  persist();
  await processEvents(events, false);
  persist();
  busy.value = false;
}

export function shopSellPrice(pieceId: string): number {
  const s = run.value;
  return s ? sellPrice(content.value, s, pieceId) : 0;
}

export function shopRerollCost(): number {
  const s = run.value;
  return s ? rerollCost(s, ctxFor(content.value, s)) : 0;
}

export async function continueEndless(): Promise<void> {
  const s = run.value;
  if (!s || busy.value || s.phase !== 'ended' || !s.canContinue) return;
  busy.value = true;
  const { events } = continueRun(content.value, s);
  run.value = { ...s };
  goto('run');
  snd.play('act');
  await processEvents(events, false);
  persist();
  busy.value = false;
}

// ------------------------------------------------------------------ events → feel

async function processEvents(events: RunEvent[], wasFlashpoint: boolean): Promise<void> {
  const c = content.value;
  const simple = run.value?.ruleset === 'simple';
  const applied: Record<string, number> = {};
  for (const e of events) {
    switch (e.type) {
      case 'effects':
        for (const [k, v] of Object.entries(e.applied)) applied[k] = (applied[k] ?? 0) + (v ?? 0);
        break;
      case 'timeout':
        toast('Time ran out. The default happened.', 'warn');
        break;
      case 'charge_used':
        toast('Hotline Protocol: no price at home for that one.', 'good');
        break;
      case 'reply':
        if (simple) {
          reply.value = { text: e.text, speaker: e.speaker, outcome: e.outcome };
          await wait(reducedMotion() ? 400 : 1100);
        }
        break;
      case 'full':
        if (simple) snd.play('capital');
        break;
      case 'reveal':
        snd.play('reveal');
        toast(e.key === 'intel' ? 'Intel reliability is now readable.' : e.key === 'commitment' ? 'You can now see how boxed in you are.' : 'Their trust in you is now readable.', 'good');
        break;
      case 'capital':
        if (!simple && e.delta > 0 && e.reason !== 'ante') {
          snd.play('capital');
          toast(`+${e.delta} political capital`, 'good', 1600);
        }
        break;
      case 'scale': {
        const p = c.pieces[e.piece];
        toast(`${p?.name ?? e.piece} grows: ${e.mult ? `+${e.mult} mult` : ''}${e.base ? ` +${e.base} base` : ''}`, 'good', 1800);
        snd.play('retrigger');
        break;
      }
      case 'order_used':
        break;
      default:
        break;
    }
  }
  if (Object.keys(applied).length) {
    lastApplied.value = applied;
    const up = Object.entries(applied).some(([k, v]) => (k === 'escalation' ? v < 0 : v > 0));
    const down = Object.entries(applied).some(([k, v]) => (k === 'escalation' ? v > 0 : v < 0));
    if (down) snd.play('meter_down', { intensity: Math.min(1, Math.max(...Object.values(applied).map((v) => Math.abs(v))) / 20) });
    if (up) setTimeout(() => snd.play('meter_up'), 140);
  }

  // The tally: base counts up, mult counts up, they slam together (Expert only; the night shows no numbers).
  const lev = simple ? undefined : events.find((e) => e.type === 'leverage');
  if (lev && lev.type === 'leverage') {
    const ms = tallyDuration(lev.breakdown.total);
    tally.value = { breakdown: lev.breakdown, key: Date.now(), actLeverage: lev.actLeverage, actTarget: lev.actTarget };
    await wait(ms);
    const big = Math.min(1, Math.log10(Math.max(1, lev.breakdown.total)) / 5);
    snd.play('tally_slam', { intensity: big });
    if (lev.breakdown.total >= 400) doShake(0.4 + big);
    await wait(reducedMotion() ? 200 : 450);
    tally.value = null;
  }

  const roll = events.find((e) => e.type === 'roll');
  if (roll && roll.type === 'roll') {
    const slow = wasFlashpoint || !!run.value?.flashpoint;
    rollOverlay.value = { result: roll.result, slow };
    snd.play('roll');
    await wait(slow ? 2600 : 1500);
    snd.play(roll.result.nearMiss ? 'near_miss' : roll.result.success ? 'roll_success' : 'roll_fail');
    await wait(slow ? 1400 : 900);
    rollOverlay.value = null;
  }

  const acc = events.find((e) => e.type === 'accident');
  if (acc && acc.type === 'accident') {
    accidentOverlay.value = { result: acc.result, phase: 'breath' };
    const breath = reducedMotion() ? 500 : 1300;
    snd.breath(breath);
    await wait(breath);
    accidentOverlay.value = { result: acc.result, phase: 'result' };
    if (acc.result.fired) {
      snd.play('accident', { intensity: Math.min(1, acc.result.p * 2) });
      doShake(0.8);
    } else snd.play('accident_clear');
    await wait(reducedMotion() ? 700 : 1500);
    accidentOverlay.value = null;
  }

  for (const e of events) {
    if (e.type === 'ante') {
      if (e.met) {
        showBanner({ title: e.smashed ? 'TARGET SMASHED' : 'TARGET MET', sub: `${e.leverage.toLocaleString()} / ${e.target.toLocaleString()} · +${e.capital} capital`, kind: e.smashed ? 'ante_smashed' : 'ante_met' }, 2200);
        snd.play(e.smashed ? 'ante_smash' : 'capital', { intensity: 1 });
        if (e.smashed) doShake(1.4);
      } else {
        showBanner({ title: 'BLUFF CALLED', sub: `${e.leverage.toLocaleString()} / ${e.target.toLocaleString()}`, kind: 'ante_missed' }, 2400);
        snd.play('ante_miss');
        doShake(0.7);
      }
      await wait(reducedMotion() ? 600 : 1600);
    }
    if (e.type === 'deadman') {
      showBanner({ title: 'DEADMAN SWITCH', sub: 'The order arrived at a bunker told to wait.', kind: 'deadman' }, 2600);
      snd.play('flashpoint_hit', { intensity: 1 });
      doShake(1.2);
      await wait(reducedMotion() ? 600 : 1800);
    }
    if (e.type === 'flashpoint_start') {
      doShake(1);
      snd.play('flashpoint_hit');
      snd.drone(true, 0.6 + (0.4 * (run.value?.meters.escalation ?? 0)) / 100);
      if (simple) showBanner({ title: 'THE CRISIS', sub: `${run.value ? nightClock(run.value) : ''} AM · ${e.name}`, kind: 'flashpoint' }, 2200);
      else showBanner({ title: 'FLASHPOINT', sub: e.name, kind: 'flashpoint' }, 2200);
      await wait(600);
    }
    if (e.type === 'flashpoint_end') snd.drone(false);
    if (e.type === 'act_start') {
      if (simple) {
        // The clock turns over quietly; no banner, no target.
        snd.play('tick');
      } else {
        showBanner({ title: e.name, sub: `target ${e.target.toLocaleString()}`, kind: 'act' });
        snd.play('act');
      }
    }
    if (e.type === 'shop') {
      snd.play('offer');
      snd.heartbeat(null);
      snd.pulse(null);
      if (run.value?.shop) {
        const ids = run.value.shop.offers.map((o) => o.piece);
        if (runMeta.value) runMeta.value = { ...runMeta.value, offered: [...runMeta.value.offered, ...ids] };
      }
    }
    if (e.type === 'ending') await finishRun(e.kind);
  }
  if (run.value?.phase === 'card' && run.value.current) snd.play('slide');
}

async function finishRun(kind: string): Promise<void> {
  const s = run.value;
  const m = runMeta.value;
  const c = content.value;
  if (!s || !m) return;
  snd.heartbeat(null);
  snd.pulse(null);
  snd.drone(false);
  const ending = s.ending ? c.endings[s.ending] : null;
  const stats = recordRun(s, c, []);
  if (hotel.value && s.ruleset === 'simple') saveMemory(s);
  const unlockedNow = evaluateUnlocks({ state: s, content: c, ending: ending ?? null, stats });
  const newBest = recordScore(s);
  runMeta.value = { ...m, unlockedNow, newBest };
  if (m.mode === 'daily' && !s.endless) {
    try {
      // Filed under the seed's day, not the finish day; saveDailyRecord refuses to overwrite (one attempt per day).
      saveDailyRecord(dailyRecordFromRun(s, c));
    } catch {
      /* never block the ending */
    }
  }
  track('run_end', {
    ending: s.ending ?? '',
    kind,
    days: Math.floor(s.day),
    act: s.act,
    seat: s.seat,
    pieces: s.pieces.join(','),
    runs_this_session: m.runsThisSession,
    mode: m.mode,
    score: s.score,
    endless: s.endless,
  });
  remove(RUN_KEY);
  hasSavedRun.value = false;
  if (kind === 'nuclear') {
    doShake(1.5);
    await wait(900);
    snd.play('nuclear');
    await wait(1500);
  } else {
    snd.play('ending');
    await wait(500);
  }
  goto('ending');
}

export function endingText(e: EndingDef): string {
  const s = run.value;
  return s ? template(content.value, s, e.text) : e.text;
}

export function momentCard(): { id: string; text: string; advisor: string } | null {
  const s = run.value;
  if (!s || !s.moment) return null;
  const card = content.value.cards[s.moment];
  if (!card) return null;
  return { id: card.id, text: template(content.value, s, card.text), advisor: card.advisor };
}

export function seatUnlocked(seat: Seat): boolean {
  const def = content.value.seats[seat];
  if (!def.unlock) return true;
  return FEATURES.allUnlocked || isUnlocked(def.unlock.id);
}

export function difficultyUnlocked(level: number): boolean {
  const d = content.value.difficulties.find((x) => x.level === level);
  if (!d || !d.unlock) return true;
  return FEATURES.allUnlocked || isUnlocked(d.unlock);
}

export function statsSnapshot() {
  return getStats();
}

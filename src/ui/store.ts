/**
 * The UI store: wraps the pure engine with signals, timers, effects sequencing,
 * persistence of the run in progress, meta-progression hooks and analytics.
 */
import { computed, signal } from '@preact/signals';
import { content as liveContent, onContentChange } from '../content';
import { buryCard, choose, createRun, pickPiece, view, template } from '../engine/run';
import { randomSeed } from '../engine/rng';
import type { Content, EndingDef, RollResult, RunEvent, RunState, Seat } from '../engine/types';
import { audio } from '../audio';
import { load, save, remove } from '../meta/storage';
import { dailyNumber, dailyPlayed, dailySeat, dailySeed, saveDailyRecord } from '../meta/daily';
import { evaluateUnlocks, isUnlocked, unlockedIds } from '../meta/unlocks';
import { getStats, recordOffer, recordRun } from '../meta/stats';
import { countRun, track } from '../meta/analytics';
import { FEATURES } from '../config';

export type Screen = 'home' | 'seat' | 'run' | 'ending' | 'compendium' | 'stats' | 'privacy' | 'unlocked' | 'settings' | 'paywall' | 'about';

export interface RunMeta {
  mode: 'daily' | 'endless' | 'challenge';
  dailyNumber?: number;
  offered: string[];
  startedAt: number;
  unlockedNow: string[];
  runsThisSession: number;
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
export const banner = signal<{ title: string; sub?: string; kind: 'act' | 'flashpoint' } | null>(null);
export const toasts = signal<{ id: number; text: string; kind?: 'info' | 'warn' | 'good' }[]>([]);
export const shake = signal(0);
export const lastApplied = signal<Partial<Record<string, number>>>({});
export const settings = signal<Settings>(load<Settings>(SETTINGS_KEY, { motion: 'auto', muted: false, seenIntro: false }));
export const hasSavedRun = signal(false);
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

export function goto(s: Screen): void {
  screen.value = s;
  if (typeof history !== 'undefined') {
    const path = s === 'privacy' ? '/privacy' : s === 'unlocked' ? '/unlocked' : '/';
    if (location.pathname !== path) history.replaceState(null, '', path);
  }
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
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

// ------------------------------------------------------------------ boot

export function boot(): void {
  applySettings();
  onContentChange((c) => {
    content.value = c;
    if (run.value) run.value = { ...run.value };
    toast('Content reloaded', 'good');
  });
  const saved = load<{ state: RunState; meta: RunMeta } | null>(RUN_KEY, null);
  hasSavedRun.value = !!saved && saved.state.phase !== 'ended';
  if (typeof location !== 'undefined') {
    if (location.pathname === '/privacy') screen.value = 'privacy';
    else if (location.pathname === '/unlocked') screen.value = 'unlocked';
  }
  if (typeof document !== 'undefined') {
    const unlock = () => {
      audio.unlock();
    };
    document.addEventListener('pointerdown', unlock, { once: true, passive: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) audio.heartbeat(null);
    });
  }
  // Danger drives the CSS
  danger.subscribe((d) => {
    if (typeof document !== 'undefined') document.documentElement.style.setProperty('--danger', d.toFixed(3));
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

export function startRun(opts: { mode: 'daily' | 'endless' | 'challenge'; seat: Seat; seed?: string; difficulty?: 1 | 2 | 3 | 4 | 5 }): void {
  const c = content.value;
  const seed = opts.seed ?? (opts.mode === 'daily' ? dailySeed() : randomSeed());
  const unlocked = FEATURES.allUnlocked ? ('all' as const) : unlockedIds();
  const state = createRun(c, { seed, seat: opts.seat, mode: opts.mode, difficulty: opts.difficulty ?? 5, unlocked });
  run.value = state;
  runMeta.value = {
    mode: opts.mode,
    dailyNumber: opts.mode === 'daily' ? dailyNumber() : undefined,
    offered: [],
    startedAt: Date.now(),
    unlockedNow: [],
    runsThisSession: countRun(),
  };
  rollOverlay.value = null;
  banner.value = null;
  lastApplied.value = {};
  persist();
  goto('run');
  track('run_start', { seat: opts.seat, mode: opts.mode, difficulty: opts.difficulty ?? 5 });
  if (opts.mode === 'daily') track('daily_played', { number: dailyNumber() });
  audio.play('ring');
  showBanner({ title: c.acts[0].name, sub: c.seats[opts.seat].name, kind: 'act' });
}

export function startDaily(): void {
  if (dailyPlayed()) {
    toast('Today’s crisis is already on record. Come back after midnight UTC.', 'warn');
    return;
  }
  startRun({ mode: 'daily', seat: dailySeat(), seed: dailySeed(), difficulty: 5 });
}

export function resumeRun(): boolean {
  const saved = load<{ state: RunState; meta: RunMeta } | null>(RUN_KEY, null);
  if (!saved || saved.state.phase === 'ended') return false;
  run.value = saved.state;
  runMeta.value = saved.meta;
  goto('run');
  return true;
}

export function abandonRun(): void {
  run.value = null;
  runMeta.value = null;
  remove(RUN_KEY);
  hasSavedRun.value = false;
  audio.heartbeat(null);
  audio.drone(false);
  goto('home');
}

export function runAgain(): void {
  const s = run.value;
  const m = runMeta.value;
  if (!s || !m) return goto('home');
  if (!endlessAvailable.value) return goto('paywall');
  startRun({ mode: m.mode === 'daily' ? 'endless' : m.mode, seat: s.seat, difficulty: s.difficulty });
}

export function replaySeed(): void {
  const s = run.value;
  const m = runMeta.value;
  if (!s || !m) return goto('home');
  if (!endlessAvailable.value) return goto('paywall');
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

/** Commit a decision. The card component has already animated out. */
export async function decide(side: 'left' | 'right' | 'timeout'): Promise<void> {
  const s = run.value;
  if (!s || busy.value || s.phase !== 'card') return;
  busy.value = true;
  audio.heartbeat(null);
  const wasFlashpoint = !!s.flashpoint;
  if (side !== 'timeout') audio.play('commit');
  const { events } = choose(content.value, s, side);
  run.value = { ...s };
  await processEvents(events, wasFlashpoint);
  persist();
  busy.value = false;
}

export async function bury(): Promise<void> {
  const s = run.value;
  if (!s || busy.value || s.phase !== 'card' || s.charges.removal <= 0) return;
  busy.value = true;
  audio.play('slide');
  const { events } = buryCard(content.value, s);
  run.value = { ...s };
  toast('Buried. You will not hear about it again.', 'good');
  await processEvents(events, false);
  persist();
  busy.value = false;
}

export async function takePiece(id: string): Promise<void> {
  const s = run.value;
  if (!s || busy.value || s.phase !== 'offer') return;
  busy.value = true;
  const { events } = pickPiece(content.value, s, id);
  run.value = { ...s };
  audio.play('act');
  await processEvents(events, false);
  persist();
  busy.value = false;
}

async function processEvents(events: RunEvent[], wasFlashpoint: boolean): Promise<void> {
  const c = content.value;
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
      case 'reveal':
        audio.play('reveal');
        toast(e.key === 'intel' ? 'Signals: intel reliability is now readable.' : e.key === 'commitment' ? 'You can now see how boxed in you are.' : 'Signals: their trust in you is now readable.', 'good');
        break;
      default:
        break;
    }
  }
  if (Object.keys(applied).length) {
    lastApplied.value = applied;
    const up = Object.entries(applied).some(([k, v]) => (k === 'escalation' ? v < 0 : v > 0));
    const down = Object.entries(applied).some(([k, v]) => (k === 'escalation' ? v > 0 : v < 0));
    if (down) audio.play('meter_down', { intensity: Math.min(1, Math.max(...Object.values(applied).map((v) => Math.abs(v))) / 20) });
    if (up) setTimeout(() => audio.play('meter_up'), 140);
  }

  const roll = events.find((e) => e.type === 'roll');
  if (roll && roll.type === 'roll') {
    const slow = wasFlashpoint || !!run.value?.flashpoint;
    rollOverlay.value = { result: roll.result, slow };
    audio.play('roll');
    await wait(slow ? 2600 : 1500);
    audio.play(roll.result.nearMiss ? 'near_miss' : roll.result.success ? 'roll_success' : 'roll_fail');
    await wait(slow ? 1400 : 900);
    rollOverlay.value = null;
  }

  for (const e of events) {
    if (e.type === 'flashpoint_start') {
      shake.value++;
      audio.play('flashpoint_hit');
      audio.drone(true, 0.6 + 0.4 * (run.value?.meters.escalation ?? 0) / 100);
      showBanner({ title: 'FLASHPOINT', sub: e.name, kind: 'flashpoint' }, 2200);
      await wait(600);
    }
    if (e.type === 'flashpoint_end') {
      audio.drone(false);
    }
    if (e.type === 'act_start') {
      showBanner({ title: e.name, kind: 'act' });
      audio.play('act');
    }
    if (e.type === 'offer') {
      audio.play('offer');
      if (runMeta.value) runMeta.value = { ...runMeta.value, offered: [...runMeta.value.offered, ...e.pieces] };
      recordOffer(e.pieces);
    }
    if (e.type === 'ending') {
      await finishRun(e.kind);
    }
  }
  if (run.value?.phase === 'card' && run.value.current) audio.play('slide');
}

async function finishRun(kind: string): Promise<void> {
  const s = run.value;
  const m = runMeta.value;
  const c = content.value;
  if (!s || !m) return;
  audio.heartbeat(null);
  audio.drone(false);
  const ending = s.ending ? c.endings[s.ending] : null;
  const stats = recordRun(s, c, m.offered); // also records the ending in the compendium
  const unlockedNow = evaluateUnlocks({ state: s, content: c, ending: ending ?? null, stats });
  runMeta.value = { ...m, unlockedNow };
  if (m.mode === 'daily') {
    saveDailyRecord({
      dateKey: dailySeed().replace('daily-', ''),
      number: m.dailyNumber ?? dailyNumber(),
      seed: s.seed,
      seat: s.seat,
      ending: s.ending ?? 'unknown',
      kind: ending?.kind ?? kind,
      days: Math.floor(s.day),
      act: s.act,
      playedAt: Date.now(),
    });
  }
  track('run_end', { ending: s.ending ?? '', kind, days: Math.floor(s.day), act: s.act, seat: s.seat, pieces: s.pieces.join(','), runs_this_session: m.runsThisSession, mode: m.mode });
  remove(RUN_KEY);
  hasSavedRun.value = false;
  if (kind === 'nuclear') {
    shake.value++;
    await wait(900);
    audio.play('nuclear');
    await wait(1500);
  } else {
    audio.play('ending');
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

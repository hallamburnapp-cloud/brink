/**
 * The store and the actions with a fake engine (fakeEngine.ts stands in for the seam): a game
 * starts and is saved, the finger's orders go to the engine and refusals come back in the content's
 * words, SEND ORDERS plays the week's beats and lands on the phone, the answer finishes the week,
 * the ending comes with its debrief, CONTINUE picks the save up, the title lifts and the back
 * button behaves.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./engine', async () => await import('./fakeEngine'));

import * as act from './actions';
import { HOLD_MS, HoldGesture } from './gesture';
import { TIMES, beatsFor } from './playback';
import { clearSave, readSave } from './storage';
import { armed, busy, debriefPage, explain, held, lifted, play, prefs, refusal, run, saved, screen, sheet, shown, titleWorld } from './store';
import { mapView } from './view';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  get length() {
    return this.m.size;
  }
}

beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = new MemoryStorage() as unknown as Storage;
  vi.useFakeTimers();
  clearSave();
  act.quitToTitle();
  titleWorld.value = null;
  prefs.value = { explained: false, sound: false, debriefPage: null };
});

afterEach(() => {
  vi.useRealTimers();
});

async function finishPlayback(): Promise<void> {
  await vi.runAllTimersAsync();
}

describe('starting and saving', () => {
  it('PLAY puts a new game on the desk, saves it, and opens the explanation on its first line', () => {
    act.play();
    const s = run.value!;
    expect(s.week).toBe(1);
    expect(shown.value).toBe(s);
    expect(screen.value).toBe('game');
    expect(saved.value).toBe(true);
    expect(readSave()?.seed).toBe(s.seed);
    expect(explain.value).toBe(1);
  });

  it('once explained, a new game starts at the collision slip; the hook starts with none', () => {
    act.play();
    act.explainSkip();
    expect(prefs.value.explained).toBe(true);
    act.play();
    expect(explain.value).toBe(4);
    act.startGame('X', { explain: false });
    expect(explain.value).toBeNull();
    expect(run.value?.seed).toBe('X');
  });

  it('NEXT turns the slips 1..4 and BEGIN closes them', () => {
    act.play();
    act.explainNext();
    act.explainNext();
    act.explainNext();
    expect(explain.value).toBe(4);
    act.explainNext();
    expect(explain.value).toBeNull();
  });

  it('CONTINUE picks the save up; without one it starts a new game', () => {
    act.startGame('SAVED', { explain: false });
    act.quitToTitle();
    expect(screen.value).toBe('title');
    expect(run.value).toBeNull();
    expect(saved.value).toBe(true);
    expect(titleWorld.value?.seed).toBe('SAVED');
    act.continueGame();
    expect(run.value?.seed).toBe('SAVED');
    expect(screen.value).toBe('game');
    act.home();
    expect(saved.value).toBe(false);
    act.continueGame();
    expect(run.value).not.toBeNull();
    expect(run.value?.seed).not.toBe('SAVED');
  });

  it('the title shows a sample world when nothing is saved', () => {
    act.ensureTitleWorld();
    expect(titleWorld.value?.seed).toBe(act.SAMPLE_SEED);
    expect(readSave()).toBeNull();
    expect(mapView.value.promises.length).toBe(1);
  });
});

describe('orders on the sheet', () => {
  beforeEach(() => act.startGame('ORDERS', { explain: false }));

  it('a held place arms PROMISE TO DEFEND, and the promise goes to the engine and the save', () => {
    act.holdStart('VSY');
    expect(held.value).toBe('VSY');
    expect(mapView.value.pressed).toBe('VSY');
    act.holdEnd();
    act.armRegion('VSY');
    expect(armed.value).toEqual({ region: 'VSY', act: 'promise' });
    expect(act.doPromise('VSY')).toBe(true);
    expect(run.value?.promises.map((p) => p.region)).toEqual(['LTL', 'VSY']);
    expect(run.value?.influence).toBe(28);
    expect(readSave()?.promises.length).toBe(2);
    expect(armed.value).toBeNull();
    // Solid: the brigade at Edda Vale is within reach.
    expect(mapView.value.promises.find((p) => p.region === 'VSY')?.solid).toBe(true);
  });

  it('a held promised place arms WITHDRAW; the Cap arms a refusal in the content\'s words', () => {
    act.armRegion('LTL');
    expect(armed.value?.act).toBe('withdraw');
    act.armRegion('WMS');
    expect(armed.value).toEqual({ region: 'WMS', act: 'refused', reason: "that is the Federation's own ground" });
    act.cancelAct();
    expect(armed.value).toBeNull();
  });

  it('a refused move shows the refusal for a moment and keeps the counter lifted', () => {
    act.tapSheet(null, 'brigade');
    expect(lifted.value).toBe('brigade');
    act.tapSheet('SHL', null);
    expect(refusal.value?.text).toBe('it cannot get there in a week');
    expect(lifted.value).toBe('brigade');
    vi.advanceTimersByTime(act.REFUSAL_MS + 1);
    expect(refusal.value).toBeNull();
    act.tapSheet('VSY', null);
    expect(lifted.value).toBeNull();
    expect(run.value?.pieces.find((p) => p.kind === 'brigade')?.at).toBe('VSY');
    expect(run.value?.acts.map((a) => a.kind)).toEqual(['move']);
  });

  it('a tap with a slip up only puts the slip away; a tap on the counter again puts it down', () => {
    act.armRegion('VSY');
    act.tapSheet('VSY', null);
    expect(armed.value).toBeNull();
    expect(run.value?.promises.length).toBe(1);
    act.tapSheet(null, 'fleet');
    act.tapSheet(null, 'fleet');
    expect(lifted.value).toBeNull();
  });

  it('a way out is offered once a week and the form closes', () => {
    act.openWayOut();
    expect(sheet.value).toBe('wayout');
    expect(act.offer('summit')).toBe(true);
    expect(sheet.value).toBeNull();
    expect(run.value?.offer?.term).toBe('summit');
    expect(run.value?.influence).toBe(10);
    expect(act.offer('summit')).toBe(false);
    expect(refusal.value?.text).toBe('one way out a week');
  });

  it('nothing is accepted while the explanation is up or a sheet is open', () => {
    explain.value = 1;
    expect(act.canAct()).toBeNull();
    expect(act.doPromise('VSY')).toBe(false);
    explain.value = null;
    expect(act.canAct()).not.toBeNull();
  });
});

describe('the week resolves', () => {
  beforeEach(() => act.startGame('WEEK', { explain: false }));

  it('SEND ORDERS plays a beat per tape line, with the sheet changing under it, and lands on the phone', async () => {
    const before = run.value!;
    const done = act.sendOrders();
    expect(busy.value).toBe(true);
    expect(run.value?.phase).toBe('phone');
    // The screen still shows the week while the first beat waits.
    expect(shown.value).toBe(before);
    await vi.advanceTimersByTimeAsync(TIMES.first + 1);
    expect(play.value?.note).toBe('Federation forces push into Kelpmouth');
    expect(play.value?.view.states.KLP).toBe('pressed');
    expect(play.value?.view.tested).toBeNull();
    expect(play.value?.tape.at(-1)?.text).toBe('Federation forces push into Kelpmouth');
    expect(play.value?.tape.at(-1)?.feed).toBe(true);
    await vi.advanceTimersByTimeAsync(TIMES.beat + 1);
    expect(play.value?.note).toBe('They are testing your promise at Lintel');
    expect(play.value?.view.tested).toBe('LTL');
    await finishPlayback();
    await done;
    expect(play.value).toBeNull();
    expect(busy.value).toBe(false);
    expect(shown.value).toBe(run.value);
    expect(shown.value?.phase).toBe('phone');
    expect(readSave()?.phase).toBe('phone');
  });

  it('a tap skips the playback to its end', async () => {
    const done = act.sendOrders();
    await vi.advanceTimersByTimeAsync(TIMES.first + 1);
    act.skipPlayback();
    expect(play.value).toBeNull();
    expect(shown.value?.phase).toBe('phone');
    // The skip releases the waiting beat: SEND ORDERS resolves without another timer.
    await done;
    expect(busy.value).toBe(false);
  });

  it('the answer finishes the week with its own beats; week 3 ends in a treaty with a debrief', async () => {
    act.sendOrders();
    await finishPlayback();
    expect(act.canAct()).toBeNull();
    const done = act.answer('back');
    expect(run.value?.phase).toBe('act');
    expect(run.value?.week).toBe(2);
    await vi.advanceTimersByTimeAsync(TIMES.first + 1);
    expect(play.value?.note).toBe('You backed Lintel · they turn away');
    expect(play.value?.view.tested).toBeNull();
    await finishPlayback();
    await done;
    expect(shown.value?.week).toBe(2);
    expect(shown.value?.influence).toBe(26);

    act.sendOrders();
    await finishPlayback();
    expect(run.value?.week).toBe(3);
    act.sendOrders();
    await finishPlayback();
    const s = run.value!;
    expect(s.phase).toBe('ended');
    expect(s.ending?.kind).toBe('treaty');
    expect(shown.value).toBe(s);
    expect(debriefPage.value).toBeNull();
    act.debriefGo(0);
    expect(debriefPage.value).toBe(0);
    expect(s.log.length).toBe(3);
    expect(s.log[0].hidden.length).toBe(2);
  });

  it('BACK IT with no influence is refused in words and the phone stays', async () => {
    run.value = { ...run.value!, influence: 5 };
    shown.value = run.value;
    act.sendOrders();
    await finishPlayback();
    await act.answer('back');
    expect(refusal.value?.text).toBe('not enough influence');
    expect(run.value?.phase).toBe('phone');
  });

  it('the beats of a back-down count the step up and the fall, then settle on the engine', async () => {
    act.sendOrders();
    await finishPlayback();
    const before = run.value!;
    const after = (await import('./fakeEngine')).answerPhone(null, before, 'down');
    const beats = beatsFor(before, after);
    expect(beats.map((b) => b.kind)).toEqual(['backedDown', 'fell', 'quietWeek']);
    // The ring goes and the place is pressed at the back-down; the fall's own line does the wash and the WAR box.
    expect(beats[0].step).toBe(2);
    expect(beats[0].view.states.LTL).toBe('pressed');
    expect(beats[0].view.promises.some((p) => p.region === 'LTL')).toBe(false);
    expect(beats[0].war).toBe(0);
    expect(beats[1].view.states.LTL).toBe('fighting');
    expect(beats[1].war).toBe(1);
    expect(beats[2].treaty).toBe(after.treaty);
    expect(beats[2].view.headings).toEqual(after.fed.headings.map((h) => ({ from: h.from, to: h.to })));
  });

  it('quitting mid-playback cancels it and nothing comes back on screen', async () => {
    act.sendOrders();
    await vi.advanceTimersByTimeAsync(TIMES.first + 1);
    act.quitToTitle();
    expect(play.value).toBeNull();
    expect(busy.value).toBe(false);
    await finishPlayback();
    expect(screen.value).toBe('title');
    expect(shown.value).toBeNull();
  });
});

describe('the hold gesture', () => {
  it('holds for 450 ms to arm, taps under that, and lets go when the finger drifts', () => {
    const calls: string[] = [];
    const g = new HoldGesture<string, string>({
      hit: (x) => (x > 100 ? 'LTL' : null),
      counterAt: (x) => (x < 0 ? 'fleet' : null),
      onHoldStart: (r) => calls.push('start:' + r),
      onHoldEnd: () => calls.push('end'),
      onHold: (r) => calls.push('hold:' + r),
      onTap: (r, c) => calls.push(`tap:${r}:${c}`),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
    });
    g.down(200, 200);
    vi.advanceTimersByTime(HOLD_MS - 1);
    g.up();
    expect(calls).toEqual(['start:LTL', 'end', 'tap:LTL:null']);
    calls.length = 0;
    g.down(200, 200);
    vi.advanceTimersByTime(HOLD_MS);
    expect(calls).toEqual(['start:LTL', 'end', 'hold:LTL']);
    g.up();
    expect(calls.length).toBe(3);
    calls.length = 0;
    g.down(200, 200);
    g.move(230, 200);
    vi.advanceTimersByTime(HOLD_MS);
    g.up();
    expect(calls).toEqual(['start:LTL', 'end']);
    calls.length = 0;
    g.down(-5, 200);
    g.up();
    expect(calls).toEqual(['tap:null:fleet']);
  });
});

/**
 * One-crisis positions for the calibration bots: a fresh run's first deal with the target,
 * staff and Summit twist of a calibration row. Nothing carries over (no traffic, stamps,
 * Playbooks or brass), as in the reference calibration.
 */
import { newRun, type Colour, type RunState, type StaffId, type TwistKind } from '../engine';

export interface TwistSpec {
  kind: TwistKind;
  /** BLACKOUT: the colour that goes dark. */
  colour?: Colour | null;
}

export interface CrisisSetup {
  /** Seeds the run, and so the deal and its reshuffles (the run's 'deal' stream). */
  seed: string;
  target: bigint;
  /** Seated staff, left to right. */
  staff?: readonly StaffId[];
  /** A Summit twist in force for this crisis (null: a plain crisis). */
  twist?: TwistSpec | null;
  /** Hand the bot one AIRLIFT paper (the reference bot's `use_air`). */
  airlift?: boolean;
}

/** A RunState in phase 'crisis' set up for one calibration crisis. */
export function crisisState(setup: CrisisSetup): RunState {
  const base = newRun(setup.seed);
  const staff = (setup.staff ?? []).map((id, i) => ({ uid: i + 1, id, count: 0 }));
  let nextUid = staff.length + 1;
  const tray = setup.airlift ? [{ uid: nextUid++, id: 'AIRLIFT' as const }] : [];
  const twist = setup.twist ? { kind: setup.twist.kind, colour: setup.twist.colour ?? null } : null;
  // A twist is in force only in a Summit (crisis index 2), so a twisted row plays as one.
  return {
    ...base,
    staff,
    tray,
    nextUid,
    hour: twist ? { ...base.hour, twist } : base.hour,
    crisis: {
      ...base.crisis,
      target: setup.target,
      index: twist ? 2 : 0,
      kind: twist ? 'SUMMIT' : 'FLARE_UP',
    },
  };
}

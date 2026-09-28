/**
 * The whole data model of BRINK. Content (YAML) compiles to these types;
 * the engine is a pure function over them and a serialisable RunState.
 */

export type Seat = 'republic' | 'federation' | 'coalition';
export const SEATS: readonly Seat[] = ['republic', 'federation', 'coalition'] as const;

export type Mode = 'daily' | 'endless' | 'challenge';

export type MeterKey = 'public' | 'military' | 'allies' | 'economy' | 'escalation';
export const METERS: readonly MeterKey[] = ['public', 'military', 'allies', 'economy', 'escalation'] as const;

/** Hidden values: never shown as numbers unless an asset reveals them. */
export type HiddenKey = 'trust_primary' | 'trust_secondary' | 'intel' | 'commitment';
export const HIDDEN: readonly HiddenKey[] = ['trust_primary', 'trust_secondary', 'intel', 'commitment'] as const;

export type EffectKey = MeterKey | HiddenKey;
export const EFFECT_KEYS: readonly EffectKey[] = [...METERS, ...HIDDEN];

export type Effects = Partial<Record<EffectKey, number>>;

export type Side = 'left' | 'right';

export interface FollowDef {
  /** Card id to queue. */
  card: string;
  /** Number of cards to wait before it surfaces (0 = next card). */
  in: number;
  /** Optional chance (0..1) that the follow-up is queued at all. */
  chance?: number;
}

export interface OutcomeDef {
  text?: string;
  effects?: Effects;
  follow?: FollowDef[];
  set?: string[];
  clear?: string[];
  ending?: string;
}

export interface OddsDef {
  /** Shown to the player before the choice, e.g. "Intercept". */
  label: string;
  /** Base probability of success, 0..1. */
  base: number;
  /** Tags that odds modifiers match on. */
  tags: string[];
  success: OutcomeDef;
  failure: OutcomeDef;
}

export interface ChoiceDef {
  text: string;
  effects: Effects;
  /** Tags that effect modifiers match on (e.g. military, deescalate, public_commitment). */
  tags: string[];
  odds?: OddsDef;
  follow?: FollowDef[];
  set?: string[];
  clear?: string[];
  /** Force an ending immediately after this choice. */
  ending?: string;
  /** Reveal a hidden value on the HUD for the rest of the run. */
  reveal?: HiddenKey;
  /** Spend a free de-escalation charge (Hotline Protocol) if available. */
  spend_charge?: 'deescalation';
}

export interface RangeCond { min?: number; max?: number }

export interface ConditionDef {
  flags_all?: string[];
  flags_any?: string[];
  flags_none?: string[];
  /** Ranges on meters or hidden values. */
  values?: Partial<Record<EffectKey, RangeCond>>;
  pieces_any?: string[];
  pieces_all?: string[];
  pieces_none?: string[];
  day?: RangeCond;
  seen?: string[];
  unseen?: string[];
  /** Only when this many cards or more have been played this act. */
  act_card_min?: number;
}

export interface WarningDef {
  /** Card queued if the warning is TRUE (roll < intel reliability). */
  true_follow: string;
  /** Card queued if the warning is FALSE (a false alarm). */
  false_follow: string;
  in: number;
  /** Bias added to the truth probability (e.g. Hardened NC3 reduces false alarms). */
  bias?: number;
}

export interface CardDef {
  id: string;
  arc?: string;
  /** Speaker id (see speakers manifest). */
  advisor: string;
  /** Inclusive act range 1..5. */
  acts: [number, number];
  seats?: Seat[];
  text: string;
  left: ChoiceDef;
  right: ChoiceDef;
  /** Seconds on the visible countdown, if any. */
  timer?: number;
  /** Which choice fires when the timer expires (default: right). */
  timeout?: Side;
  conditions?: ConditionDef;
  tags: string[];
  weight: number;
  modes?: Mode[];
  /** Shown at most once per run (default true). */
  once: boolean;
  /** Intel-governed warning: queues a true or false follow-up. */
  warning?: WarningDef;
  /** Belongs to this flashpoint sequence (drawn only inside it). */
  flashpoint?: string;
  /** Only reachable through a follow-up queue (never drawn randomly). */
  chained: boolean;
  /** Authoring notes; ignored by the engine. */
  note?: string;
}

export type Pool = 'advisor' | 'doctrine' | 'asset';
export const POOLS: readonly Pool[] = ['advisor', 'doctrine', 'asset'] as const;

export type Sign = 'pos' | 'neg';

/**
 * Composable modifiers. See ENGINE.md for the resolution order.
 * - effect: changes deltas applied to meters/hidden values by choice tag & key.
 * - odds: changes odds-roll probabilities by roll tag.
 * - intel: changes intel reliability.
 * - timer: changes countdown lengths.
 * - weight: changes card draw weights by tag or id.
 * - drift: passive per-card change to a value.
 * - floor / ceiling: clamps on escalation.
 * - rule: named engine rule (see RuleId).
 */
export type ModifierDef =
  | { kind: 'effect'; key?: EffectKey | 'meters' | 'hidden' | 'trust'; tags?: string[]; sign?: Sign; add?: number; mult?: number }
  | { kind: 'odds'; tags?: string[]; add?: number; mult?: number }
  | { kind: 'intel'; add?: number; mult?: number }
  | { kind: 'timer'; add?: number; mult?: number }
  | { kind: 'weight'; tags?: string[]; ids?: string[]; mult: number }
  | { kind: 'drift'; key: EffectKey; per_card: number; when?: ConditionDef }
  | { kind: 'floor'; value: number }
  | { kind: 'ceiling'; value: number }
  | { kind: 'rule'; rule: RuleId; value?: number };

export type RuleId =
  /** Escalation costs of choices are hidden in previews (Hawk General). */
  | 'hide_escalation_cost'
  /** N free de-escalations per act: a choice tagged deescalate with spend_charge costs nothing on public/military. */
  | 'free_deescalation_per_act'
  /** Player may remove N drawn cards per act (Fixer). */
  | 'remove_card_per_act'
  /** Hidden value revealed on HUD (value = key index in HIDDEN). */
  | 'reveal_intel'
  | 'reveal_trust'
  | 'reveal_commitment'
  /** Trust deltas get ± noise (Strategic Ambiguity). value = amplitude. */
  | 'trust_variance'
  /** Walking back a commitment costs extra public (Spin Doctor / Red Lines). value = multiplier. */
  | 'commitment_lock'
  /** Warning truth roll uses max(intel, value) (Hardened NC3). */
  | 'warning_floor'
  /** Warning cards are more frequent (Paranoid Intel Director / EW constellation). value = extra weight mult. */
  | 'warning_frequency'
  /** A false alarm surviving to a flashpoint triggers the launch-on-warning branch. */
  | 'launch_on_warning'
  /** Escalation deltas above 0 are amplified in late acts (twitchy). */
  | 'escalation_twitch'
  /** Allies meter drifts toward 50 each card (Alliance First). value = rate. */
  | 'allies_anchor'
  /** Military meter cannot fall below value while doctrine held (Pre-delegation). */
  | 'military_floor'
  /** No First Use: flashpoints tagged first_use get +odds (handled via odds mod) and military drifts (handled via drift). Marker only. */
  | 'nfu'
  /** Adversary reads your moves as more aggressive: escalation from military tags +value. */
  | 'security_dilemma'
  /** Deterrence marker: adversary less likely to probe (proxy cards weight down) but trust down. */
  | 'deterrence'
  /** Reassurance marker: trust recovers each card by value. */
  | 'reassurance'
  /** Public commitment tags raise commitment by extra value. */
  | 'red_lines'
  /** Economy meter cannot fall below value while held (Strategic Reserve). */
  | 'economy_floor'
  /** Limited-strike choices cost less escalation (value = mult) but floor rises 5 per use. */
  | 'escalate_to_deescalate'
  /** Timer expiry defaults to the military-preferred choice. */
  | 'predelegation';

export interface PieceDef {
  id: string;
  pool: Pool;
  /** In-world name (e.g. "General Oren Vasska"). */
  name: string;
  /** Archetype title (e.g. "the Hawk General"). */
  title: string;
  /** One or two sentences, in-world, about what this piece does — mechanics felt, not explained. */
  blurb: string;
  /** Plain mechanical summary shown in the compendium. */
  mechanics: string;
  /** Accent colour for the portrait/card frame. */
  accent: string;
  /** Portrait id in the art manifest (advisors) or icon id. */
  art: string;
  modifiers: ModifierDef[];
  /** Flags granted while held (cards can condition on them). */
  grants: string[];
  tags: string[];
  /** Weight when offered between acts (default 1). */
  offer_weight: number;
  /** Only offered to these seats. */
  seats?: Seat[];
  /** Not offered before this act. */
  min_act?: number;
  /** Meta unlock (undefined = available from the start). */
  unlock?: { id: string; label: string; hint: string };
}

export type EndingKind = 'nuclear' | 'removed' | 'standdown' | 'survival' | 'special';

export type EndingTrigger =
  | { type: 'meter'; key: MeterKey; at: 0 | 100 }
  | { type: 'run_end' }
  | { type: 'forced' };

export interface EndingDef {
  id: string;
  name: string;
  kind: EndingKind;
  trigger: EndingTrigger;
  conditions?: ConditionDef;
  seats?: Seat[];
  /** Higher wins when several endings match. */
  priority: number;
  /** Story-quality text shown on the ending screen (2–5 short paragraphs). */
  text: string;
  /** Label for the "moment it went wrong / held" line. */
  moment_label: string;
  /** One line for the compendium. */
  compendium: string;
  /** Emoji used on the share card. */
  emoji: string;
  /** Achievement ids granted when reached. */
  achievements?: string[];
}

export interface SeatDef {
  id: Seat;
  name: string;
  /** "the Republic" */
  the: string;
  adjective: string;
  leader_title: string;
  capital: string;
  rivals: [Seat, Seat];
  meters: Record<MeterKey, number>;
  hidden: Record<HiddenKey, number>;
  blurb: string;
  strengths: string;
  vulnerabilities: string;
  accent: string;
  starting_pieces: string[];
  unlock?: { id: string; label: string; hint: string };
}

export interface FlashpointDef {
  id: string;
  name: string;
  acts: [number, number];
  conditions?: ConditionDef;
  /** Entry card id; the sequence chains via follow-ups. */
  entry: string;
  weight: number;
  /** Alternative entry when a false alarm is live (flag false_alarm_live). */
  false_alarm_entry?: string;
  blurb: string;
}

export interface SpeakerDef {
  id: string;
  name: string;
  role: string;
  accent: string;
  art: string;
  /** Voice notes for authors (CONTENT.md). */
  voice?: string;
}

export interface ActDef {
  index: number;
  name: string;
  /** Cards before the flashpoint. */
  cards: number;
  /** Effect scale for meter deltas. */
  effect_scale: number;
  /** Intel reliability adjustment. */
  intel_shift: number;
  /** Timer length multiplier. */
  timer_scale: number;
  /** Days advanced per card. */
  day_per_card: number;
}

export interface DifficultyDef {
  /** DEFCON level 5 (easiest) .. 1 (hardest). */
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  effect_scale: number;
  intel_shift: number;
  timer_scale: number;
  start_escalation: number;
  unlock?: string;
}

export interface Content {
  cards: Record<string, CardDef>;
  pieces: Record<string, PieceDef>;
  endings: Record<string, EndingDef>;
  seats: Record<Seat, SeatDef>;
  flashpoints: Record<string, FlashpointDef>;
  speakers: Record<string, SpeakerDef>;
  acts: ActDef[];
  difficulties: DifficultyDef[];
  /** Ordered ids for stable iteration. */
  cardOrder: string[];
  pieceOrder: string[];
  endingOrder: string[];
}

// ------------------------------------------------------------------ run state

export type Phase = 'card' | 'offer' | 'ended';

export interface RollResult {
  label: string;
  p: number;
  roll: number;
  success: boolean;
  /** Distance to the threshold in percentage points (0 = exactly on it). */
  margin: number;
  nearMiss: boolean;
}

export interface HistoryEntry {
  card: string;
  side: Side | 'timeout';
  act: number;
  day: number;
  /** Deltas actually applied to visible meters and hidden values. */
  applied: Effects;
  roll?: RollResult;
  truth?: boolean;
}

export interface QueuedCard {
  card: string;
  in: number;
}

export interface RunState {
  v: 1;
  seed: string;
  rng: [number, number, number, number];
  seat: Seat;
  mode: Mode;
  difficulty: 1 | 2 | 3 | 4 | 5;
  act: number;
  /** Cards played this act (excluding flashpoint cards). */
  actCards: number;
  cardsPlayed: number;
  day: number;
  meters: Record<MeterKey, number>;
  hidden: Record<HiddenKey, number>;
  flags: string[];
  pieces: string[];
  seen: string[];
  queue: QueuedCard[];
  phase: Phase;
  current: string | null;
  /** For a warning card: whether it is true (decided on draw, resolved on choice). */
  truth: boolean | null;
  /** Piece ids currently offered between acts. */
  offer: string[] | null;
  /** Flashpoint id while inside a flashpoint sequence. */
  flashpoint: string | null;
  /** Flashpoints already used this run. */
  flashpointsUsed: string[];
  ending: string | null;
  /** The card id of "the moment it went wrong / held". */
  moment: string | null;
  history: HistoryEntry[];
  /** Meter snapshot after each card, for the share strip. */
  trail: [number, number, number, number, number][];
  charges: { deescalation: number; removal: number };
  /** Escalation floor raised by Escalate-to-De-escalate uses. */
  escalationFloor: number;
  revealed: HiddenKey[];
  stats: { rolls: number; nearMisses: number; timeouts: number; falseAlarms: number; trueWarnings: number };
}

export interface ChoiceView {
  side: Side;
  text: string;
  /** Previewed deltas (after modifiers). Keys with hidden costs are omitted. */
  preview: Effects;
  /** Keys whose cost is hidden by a rule (shown as "?"). */
  hiddenCosts: EffectKey[];
  odds?: { label: string; p: number };
  tags: string[];
  usesCharge: boolean;
}

export interface CardView {
  id: string;
  advisor: SpeakerDef;
  text: string;
  left: ChoiceView;
  right: ChoiceView;
  /** Seconds, after modifiers, or null. */
  timer: number | null;
  timeout: Side;
  act: number;
  actName: string;
  day: number;
  isFlashpoint: boolean;
  flashpointName: string | null;
  tags: string[];
}

export type RunEvent =
  | { type: 'effects'; applied: Effects }
  | { type: 'roll'; result: RollResult }
  | { type: 'flag'; set: string[]; clear: string[] }
  | { type: 'warning'; truth: boolean }
  | { type: 'act_start'; act: number; name: string }
  | { type: 'flashpoint_start'; id: string; name: string }
  | { type: 'flashpoint_end'; id: string }
  | { type: 'offer'; pieces: string[] }
  | { type: 'ending'; id: string; kind: EndingKind }
  | { type: 'timeout' }
  | { type: 'reveal'; key: HiddenKey }
  | { type: 'charge_used'; charge: 'deescalation' };

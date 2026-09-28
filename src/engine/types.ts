/**
 * The whole data model of BRINK. Content (YAML) compiles to these types;
 * the engine is a pure function over them and a serialisable RunState.
 *
 * The core loop is brinkmanship scaling: every choice scores LEVERAGE =
 * BASE × MULT × ESCALATION-MULTIPLIER (× retriggers). Each act sets a leverage
 * TARGET (an ante) that must be met before its Flashpoint; political capital
 * buys posture pieces and one-shot orders in the shop between acts.
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
  /** Political capital delta. */
  capital?: number;
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
  /** Tags that modifiers match on (e.g. military, deescalate, public_commitment). */
  tags: string[];
  /** Printed base leverage. Compiled from effects/tags when the author omits it. */
  base: number;
  /** Political capital delta. */
  capital?: number;
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
  /** Act range (inclusive), for modifiers that switch on late. */
  act?: RangeCond;
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
  /** A "bluff called" card: may surface inside any flashpoint. */
  bluff: boolean;
  /** Only reachable through a follow-up queue (never drawn randomly). */
  chained: boolean;
  /** Opens the shop after this card is played (mid-act shop). */
  shop: boolean;
  /** Authoring notes; ignored by the engine. */
  note?: string;
}

export type Pool = 'advisor' | 'doctrine' | 'asset';
export const POOLS: readonly Pool[] = ['advisor', 'doctrine', 'asset'] as const;

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'legendary'] as const;

export type Sign = 'pos' | 'neg';

/** What a scaling piece grows on. */
export type ScaleTrigger = 'accident_survived' | 'accident_avoided' | 'flashpoint_cleared' | 'ante_met' | 'ante_smashed' | 'choice' | 'act_start' | 'roll_success' | 'roll_failure' | 'near_miss';

/**
 * Composable modifiers. See ENGINE.md for the resolution order.
 * - effect: changes deltas applied to meters/hidden values by choice tag & key.
 * - odds: changes odds-roll probabilities by roll tag.
 * - intel: changes intel reliability.
 * - timer: changes countdown lengths.
 * - weight: changes card draw weights by tag or id.
 * - drift: passive per-card change to a value.
 * - floor / ceiling: clamps on escalation.
 * - leverage: base additions, mult additions and mult multipliers by choice tag / condition.
 * - retrigger: scores matching choices again.
 * - scale: grows the piece's own permanent bonus during the run.
 * - accident: multiplies accident probability (or severity).
 * - rule: named engine rule (see RuleId).
 */
export type ModifierDef =
  | {
      kind: 'effect';
      key?: EffectKey | 'meters' | 'hidden' | 'trust';
      tags?: string[];
      sign?: Sign;
      add?: number;
      mult?: number;
      /** With `always`, the `add` applies to every matching choice even if it has no effect on that key (injects a new effect). */
      always?: boolean;
    }
  | { kind: 'odds'; tags?: string[]; add?: number; mult?: number }
  | { kind: 'intel'; add?: number; mult?: number }
  | { kind: 'timer'; add?: number; mult?: number }
  | { kind: 'weight'; tags?: string[]; ids?: string[]; mult: number }
  | { kind: 'drift'; key: EffectKey; per_card: number; when?: ConditionDef }
  | { kind: 'floor'; value: number }
  | { kind: 'ceiling'; value: number }
  | { kind: 'leverage'; tags?: string[]; when?: ConditionDef; base_add?: number; mult_add?: number; mult_mult?: number; /** Per 10 points of a value above `per_above` (e.g. escalation above 50): scales mult_add. */ per?: EffectKey; per_above?: number; per_step?: number }
  | { kind: 'retrigger'; tags?: string[]; when?: ConditionDef; times?: number }
  | { kind: 'scale'; on: ScaleTrigger; tags?: string[]; mult_add?: number; base_add?: number; max?: number }
  | { kind: 'accident'; mult?: number; severity_mult?: number }
  | { kind: 'rule'; rule: RuleId; value?: number };

export type RuleId =
  /** Escalation costs of choices are hidden in previews (Hawk General). */
  | 'hide_escalation_cost'
  /** N free de-escalations per act: a choice tagged deescalate with spend_charge costs nothing on public/military. */
  | 'free_deescalation_per_act'
  /** Player may remove N drawn cards per act (Fixer). */
  | 'remove_card_per_act'
  /** Hidden value revealed on HUD. */
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
  /** No First Use marker. */
  | 'nfu'
  /** Adversary reads your moves as more aggressive: escalation from military tags +value. */
  | 'security_dilemma'
  /** Deterrence marker. */
  | 'deterrence'
  /** Reassurance marker. */
  | 'reassurance'
  /** Public commitment tags raise commitment by extra value. */
  | 'red_lines'
  /** Economy meter cannot fall below value while held (Strategic Reserve). */
  | 'economy_floor'
  /** Limited-strike choices cost less escalation (value = mult) but floor rises 5 per use. */
  | 'escalate_to_deescalate'
  /** Timer expiry defaults to the military-preferred choice. */
  | 'predelegation'
  /** Accidents roll twice; fires if either roll fires (Madman Theory). */
  | 'accidents_twice'
  /** Once per run, a nuclear ending instead sets escalation to 70 (Deadman Switch). */
  | 'deadman_switch'
  /** Accidents are resolved on draw and shown before the choice (Perfect Intel). */
  | 'perfect_intel'
  /** Extra piece offers in the shop. */
  | 'extra_offer'
  /** Shop prices multiplied by value (e.g. 0.75). */
  | 'shop_discount'
  /** Political capital gained at the start of each act. */
  | 'capital_per_act'
  /** Sell price fraction (default 0.5) replaced by value. */
  | 'sell_bonus'
  /** Free rerolls per shop visit. */
  | 'free_rerolls'
  /** Extra order slots. */
  | 'extra_order_slot'
  /** Extra piece slots. */
  | 'extra_piece_slot';

export interface PieceDef {
  id: string;
  pool: Pool;
  rarity: Rarity;
  /** Shop price; defaults by rarity (common 3, uncommon 5, rare 8, legendary 12). */
  price: number;
  /** In-world name (e.g. "General Oren Vasska"). */
  name: string;
  /** Archetype title (e.g. "the Hawk General"). */
  title: string;
  /** One or two sentences, in-world, about what this piece does — mechanics felt, not explained. */
  blurb: string;
  /** Plain mechanical summary shown in the shop and compendium. */
  mechanics: string;
  /** Accent colour for the portrait/card frame. */
  accent: string;
  /** Portrait id in the art manifest (advisors) or icon id. */
  art: string;
  modifiers: ModifierDef[];
  /** Flags granted while held (cards can condition on them). */
  grants: string[];
  tags: string[];
  /** Weight when offered (default 1). */
  offer_weight: number;
  /** Only offered to these seats. */
  seats?: Seat[];
  /** Not offered before this act. */
  min_act?: number;
  /** Never offered while any of these pieces is held (contradictory postures). */
  excludes?: string[];
  /** Meta unlock (undefined = available from the start). */
  unlock?: { id: string; label: string; hint: string };
}

export type OrderEffect =
  | { type: 'meter'; key: EffectKey; delta: number }
  | { type: 'retrigger_next'; times?: number }
  | { type: 'reveal'; key: HiddenKey }
  | { type: 'skip_accident' }
  | { type: 'bury' }
  | { type: 'capital'; delta: number }
  | { type: 'charge'; charge: 'deescalation' | 'removal'; count: number }
  | { type: 'leverage'; amount: number }
  | { type: 'mult_next'; mult: number };

export interface OrderDef {
  id: string;
  name: string;
  blurb: string;
  mechanics: string;
  price: number;
  rarity: Rarity;
  effect: OrderEffect;
  /** Icon id. */
  art: string;
  accent: string;
}

export interface ArchetypeDef {
  id: string;
  name: string;
  blurb: string;
  /** Holding two of these counts as playing the archetype. */
  core: string[];
  support: string[];
  style: 'brink' | 'standdown' | 'hybrid';
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
  /** Starting political capital (default 4). */
  starting_capital?: number;
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
  /** Card played first when the act's leverage target was missed (the bluff is called). */
  bluff_entry?: string;
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
  /**
   * Expected escalation lost per ordinary card while escalation is above the
   * cooling floor: the crisis cools when nobody feeds it (fractional parts are
   * rolled). Flashpoint and bluff cards never cool.
   */
  cooling?: number;
  /**
   * Expected points each office meter (public, military, allies, economy) drifts
   * back toward 50 per ordinary card: opinion regresses, markets recover,
   * alliances persist. Fractional parts are rolled.
   */
  recovery?: number;
  /** Leverage that must be accumulated during the act (the ante). */
  target: number;
}

export interface DifficultyDef {
  /** DEFCON level 5 (easiest) .. 1 (hardest). */
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  effect_scale: number;
  intel_shift: number;
  timer_scale: number;
  start_escalation: number;
  /** Multiplier on leverage targets (default 1). */
  target_scale?: number;
  unlock?: string;
}

export interface Content {
  cards: Record<string, CardDef>;
  pieces: Record<string, PieceDef>;
  orders: Record<string, OrderDef>;
  archetypes: Record<string, ArchetypeDef>;
  endings: Record<string, EndingDef>;
  seats: Record<Seat, SeatDef>;
  flashpoints: Record<string, FlashpointDef>;
  speakers: Record<string, SpeakerDef>;
  acts: ActDef[];
  difficulties: DifficultyDef[];
  /** Ordered ids for stable iteration. */
  cardOrder: string[];
  pieceOrder: string[];
  orderOrder: string[];
  endingOrder: string[];
}

// ------------------------------------------------------------------ run state

export type Phase = 'card' | 'shop' | 'ended';

export interface RollResult {
  label: string;
  p: number;
  roll: number;
  success: boolean;
  /** Distance to the threshold in percentage points (0 = exactly on it). */
  margin: number;
  nearMiss: boolean;
}

export type AccidentType = 'false_alarm' | 'misread' | 'rogue_commander' | 'attribution_error';

export interface AccidentState {
  type: AccidentType;
  /** Probability shown before the choice. */
  p: number;
  /** Resolved in advance (Perfect Intel) or null until the choice. */
  known: boolean | null;
}

export interface AccidentResult {
  type: AccidentType;
  p: number;
  roll: number;
  fired: boolean;
  applied: Effects;
}

export interface LeverageTerm {
  source: string;
  value: number;
}

export interface LeverageBreakdown {
  /** Printed base of the choice plus additions. */
  base: number;
  baseTerms: LeverageTerm[];
  /** Additive mult total (starting at 1). */
  multAdd: number;
  multAddTerms: LeverageTerm[];
  /** Product of multiplicative mults. */
  multMult: number;
  multMultTerms: LeverageTerm[];
  /** Final mult before escalation. */
  mult: number;
  /** Escalation multiplier from the curve. */
  escMult: number;
  escalation: number;
  /** Extra scorings of this choice. */
  retriggers: number;
  retriggerTerms: LeverageTerm[];
  /** base × mult × escMult × (1 + retriggers), rounded. */
  total: number;
}

export interface HistoryEntry {
  card: string;
  /** The side actually played (a timeout records the side it resolved to, with timedOut set). */
  side: Side | 'timeout';
  timedOut?: boolean;
  act: number;
  day: number;
  /** Deltas actually applied to visible meters and hidden values. */
  applied: Effects;
  roll?: RollResult;
  truth?: boolean;
  leverage: number;
  accident?: AccidentResult;
}

export interface QueuedCard {
  card: string;
  in: number;
}

export interface ShopOffer {
  piece: string;
  price: number;
  sold: boolean;
}

export interface ShopOrderOffer {
  order: string;
  price: number;
  sold: boolean;
}

export interface ShopState {
  offers: ShopOffer[];
  orders: ShopOrderOffer[];
  rerolls: number;
  /** Mid-act shop returns to the cards; end-of-act shop begins the next act. */
  mid: boolean;
  /** Tags removed from the deck this visit (limit 1 per visit). */
  removed: string[];
}

export interface PieceRunState {
  /** Permanent mult bonus grown during the run. */
  mult: number;
  /** Permanent base bonus grown during the run. */
  base: number;
  /** Trigger count. */
  count: number;
}

export interface RunState {
  v: 2;
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
  pieceState: Record<string, PieceRunState>;
  orders: string[];
  /** Tags removed from the deck by the shop. */
  removedTags: string[];
  seen: string[];
  queue: QueuedCard[];
  phase: Phase;
  current: string | null;
  /** For a warning card: whether it is true (decided on draw, resolved on choice). */
  truth: boolean | null;
  /** Accident attached to the current card, if any. */
  accident: AccidentState | null;
  shop: ShopState | null;
  /** Shops opened this act (mid-act shop once). */
  midShopDone: boolean;
  /** The act's ante has been settled (so a standalone bluff card cannot settle it twice). */
  anteSettled: boolean;
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
  /** Political capital. */
  capital: number;
  /** Leverage accumulated this act. */
  actLeverage: number;
  /** Leverage target for this act. */
  actTarget: number;
  /** Total leverage: the score. */
  score: number;
  /** Extra scorings queued by orders for the next choice. */
  nextRetrigger: number;
  /** Extra mult queued by orders for the next choice. */
  nextMult: number;
  /** Deadman Switch used. */
  deadmanUsed: boolean;
  /** Playing on past the Endgame. */
  endless: boolean;
  /** Set when a win ending fired and the player may continue. */
  canContinue: boolean;
  /** Last leverage breakdown (for the tally animation). */
  lastLeverage: LeverageBreakdown | null;
  stats: {
    rolls: number;
    nearMisses: number;
    timeouts: number;
    falseAlarms: number;
    trueWarnings: number;
    accidents: number;
    accidentsSurvived: number;
    antesMet: number;
    antesSmashed: number;
    antesMissed: number;
    bestChoice: number;
    peakEscalation: number;
  };
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
  leverage: LeverageBreakdown;
  capital: number;
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
  accident: (AccidentState & { label: string }) | null;
}

export type RunEvent =
  | { type: 'effects'; applied: Effects }
  | { type: 'roll'; result: RollResult }
  | { type: 'flag'; set: string[]; clear: string[] }
  | { type: 'warning'; truth: boolean }
  | { type: 'act_start'; act: number; name: string; target: number }
  | { type: 'flashpoint_start'; id: string; name: string }
  | { type: 'flashpoint_end'; id: string }
  | { type: 'shop'; mid: boolean }
  | { type: 'ending'; id: string; kind: EndingKind; canContinue: boolean }
  | { type: 'timeout' }
  | { type: 'reveal'; key: HiddenKey }
  | { type: 'charge_used'; charge: 'deescalation' }
  | { type: 'leverage'; breakdown: LeverageBreakdown; actLeverage: number; actTarget: number }
  | { type: 'accident'; result: AccidentResult }
  | { type: 'ante'; met: boolean; smashed: boolean; leverage: number; target: number; capital: number }
  | { type: 'capital'; delta: number; reason: string }
  | { type: 'scale'; piece: string; mult: number; base: number }
  | { type: 'deadman' }
  | { type: 'order_used'; order: string };

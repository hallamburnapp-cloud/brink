/**
 * BRINK: THIRTY DAYS — the compiled content types (docs/thirty-days/SPEC.md "The content",
 * docs/thirty-days/CONTENT.md for the authored YAML). Everything the engine and the UI read
 * about cards, advisers and pieces comes through `ThirtyContent`. Pure types: no runtime code.
 */

/** One of the 30 region ids in src/war/content/map.json (SHL, WMS, VSY ...). */
export type RegionId = string;
/** The five blocs: the Cap (the Federation), Highmarch (home), the Scatter, Sundry, Farsouth. */
export type Bloc = 'CAP' | 'HMR' | 'SCT' | 'SND' | 'FRS';
/** A region's heat: 0 CALM, 1 TENSE, 2 CRISIS, 3 WAR. */
export type Heat = 0 | 1 | 2 | 3;
/**
 * A set of regions a map target may be chosen from on the live map (regions.ts REGION_SETS): the sea
 * regions (the fleet), home, abroad, anywhere, our allies by treaty (the call), our postings abroad
 * (the front that comes home).
 */
export type RegionSet = 'sea' | 'home' | 'abroad' | 'any' | 'allies' | 'posts';

export type CardId = string;
export type ArcId = string;
/** The six advisers in content-thirty/advisers.yaml: foreign, general, intel, admiral, chief, ambassador. */
export type AdviserId = string;
/** The twelve pieces in content-thirty/pieces.yaml (old-ambassador, back-channel ...). */
export type PieceId = string;

/**
 * What a choice does to the map, by tag (SPEC "Choices"):
 * CALM cools today's region by 1; FORCE cools it by 2 and heats one neighbour by 1;
 * RISKY rolls `odds`: success cools by 2, failure heats by 1; HOME leaves the map alone
 * but holds off the next domestic card.
 */
export type ChoiceTag = 'CALM' | 'FORCE' | 'RISKY' | 'HOME';
/** What a piece amplifies: a choice tag, or `any`, the `arcs` (warnings and alarms), or the `map` taps. */
export type PieceTag = ChoiceTag | 'any' | 'arcs' | 'map';

/**
 * A lasting mark a choice or a map tap leaves on a region. The engine keeps marks in the run state:
 * - `red-line`: the Red Lines piece's named region (calms twice as fast; war there is DANGER +15).
 * - `warned`: a region you have warned (Launch on Warning: war never spreads from it; a false alarm there is +20).
 * - `guarded`: pressure cannot heat this region for the next seven days (the fleet or the brigade is there).
 */
export type Mark = 'red-line' | 'warned' | 'guarded';

/** The next card of an arc, due `in` [min, max] days after this one (inclusive; the engine picks within). */
export interface Follow {
  card: CardId;
  in: [number, number];
}

/**
 * Effects beyond the tag's own, each naming one region. Every one of these is spelled out in the
 * choice's hint ("heats Lintel", "Orrinth goes to crisis"), so nothing happens that the player was not told.
 */
export interface Consequence {
  /** This region heats one step. On a FORCE choice it is the neighbour that takes the force's heat. */
  heats?: RegionId;
  /** This region rises to CRISIS if it is CALM or TENSE (a WAR region stays at war). */
  crisis?: RegionId;
  /** This region, if at CRISIS, falls to TENSE. */
  relieve?: RegionId;
  /** The region acted on (the card's region, or the tapped target) takes this mark. */
  mark?: Mark;
  follow?: Follow;
}

/** One of the two buttons on a card. */
export interface Choice extends Consequence {
  /** The action, 3 to 5 words. */
  text: string;
  tag: ChoiceTag;
  /** The hint line under the action: plainly what will happen. */
  hint: string;
  /** RISKY only: the chance it holds, 5–95 (per cent). */
  odds?: number;
  /** RISKY only: what else happens when the roll misses (the +1 heat on the region is implied). */
  fail?: Consequence;
}

/**
 * A place the player may tap on a map day. With `from`, the place is chosen when the card is dealt:
 * the hottest region of that set not already offered (`region` is then the authored fallback), and
 * `{region}` in the hint is filled in. The engine writes every target's label itself (hint.ts), so
 * the glowing places compare like for like; the authored hint documents the intent.
 */
export interface MapTarget extends Consequence {
  region: RegionId;
  from?: RegionSet;
  /** The one-line label on the glowing region. */
  hint: string;
  /** How the tap acts on the tapped region (CALM by default). */
  tag: ChoiceTag;
  /** RISKY only. */
  odds?: number;
  fail?: Consequence;
}

/** When a card may be drawn (beyond its day range). */
export interface Condition {
  /** The card's region must be within this heat range, inclusive. */
  heat: [Heat, Heat];
  /** Pieces that must all be held. */
  pieces: PieceId[];
  /** Pieces none of which may be held. */
  without: PieceId[];
}

export type DomesticTopic = 'public' | 'economy';

interface CardBase {
  id: CardId;
  adviser: AdviserId;
  /** The arc this card belongs to, or null for a single-day card. */
  arc: ArcId | null;
  /** Days this card may be drawn, inclusive, within 1–30. Advisory for a chained card (it comes when its follow-up is due). */
  day: [number, number];
  /** The message, 40 words or fewer. */
  text: string;
  when: Condition;
  /** Set on the Chief of Staff's domestic cards; a HOME choice the day before holds one off. */
  domestic: DomesticTopic | null;
  /**
   * A warning card (`alarm: true`): its RISKY "wait" holds exactly when the alarm is false, the Cautious Intel
   * Director marks it before the choice, and Launch on Warning's +20 applies to it.
   */
  alarm: boolean;
  /** True when some follow-up names this card: it is reached through its arc, never drawn on its own. */
  chained: boolean;
  /** The pack file it came from (for messages and tooling). */
  file: string;
}

/** The usual day: a message and two buttons. */
export interface ChoiceCard extends CardBase {
  map: false;
  /** Today's region, ringed on the map. */
  region: RegionId;
  left: Choice;
  right: Choice;
}

/** A map day: the card says what to do and the targets glow in place of the buttons. */
export interface MapCard extends CardBase {
  map: true;
  /** A ringed region if the card is about one; otherwise null and only the targets glow. */
  region: RegionId | null;
  /** Two or three places to tap. */
  targets: MapTarget[];
}

export type Card = ChoiceCard | MapCard;

export interface Adviser {
  id: AdviserId;
  /** A fictional person's name, shown with the role in small caps on the card. */
  name: string;
  role: string;
  /** One line on how they speak; for the content writer, never shown. */
  voice: string;
  /** The silhouette portrait key the UI draws. */
  portrait: string;
}

export interface Piece {
  id: PieceId;
  name: string;
  /** The one-word name on the team chip. */
  chip: string;
  /** The chip icon key the UI draws. */
  icon: string;
  /** The rule exactly as printed when the chip is tapped. */
  rule: string;
  tags: PieceTag[];
  /** An adviser you appoint or a policy you adopt (the chip's look). */
  kind: 'adviser' | 'policy';
  /** Pieces that cannot be held alongside this one. */
  excludes: PieceId[];
}

/** The whole pack, as `virtual:thirty-content` exports it and `loadThirtyContent` returns it. */
export interface ThirtyContent {
  advisers: Record<AdviserId, Adviser>;
  adviserOrder: AdviserId[];
  pieces: Record<PieceId, Piece>;
  pieceOrder: PieceId[];
  cards: Record<CardId, Card>;
  /** Every card id in pack order (file by file, then by position). */
  cardOrder: CardId[];
  /** Card ids per arc, in pack order. */
  arcs: Record<ArcId, CardId[]>;
}

export interface ContentIssue {
  level: 'error' | 'warning';
  /** Where it was found: `arcs/blockade.yaml › strait-01` or `pieces.yaml › hotline`. */
  where: string;
  message: string;
}

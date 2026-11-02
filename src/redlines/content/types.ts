/**
 * BRINK: Red Lines — the compiled content types. The contract is the engine's
 * src/redlines/engine/content.ts (`RedlinesContent`, `Strings`, the kind lists); this file re-exports
 * it and adds the pack's few extras, which the screens read and the engine may ignore:
 * `tape` on a line (the headline form of the declaration), `again` on a test call (the message on
 * the second and third week after WAIT), and the screen-only sections of strings.yaml (`title`,
 * `screen`, `act`, `phone`, `menu`, `debrief`, `howToPlay`, `flavour`). A `RedlinesPack` is a
 * `RedlinesContent`: the virtual module exports one and the engine takes it as it is.
 * Pure types: no runtime code (the imports are type-only).
 */
import type {
  ActKind,
  Adviser,
  AdviserId,
  Bloc,
  FallCause,
  HeadlineKind,
  HiddenKind,
  HoldCode,
  LineDef,
  LineKind,
  PhoneKind,
  PhoneOptionDef,
  PhoneTemplate,
  RedlinesContent,
  RefusalCode,
  Strings,
  WayOutTerm,
  WhyKind,
} from '../engine/content.ts';
import type { PieceKind, RegionId } from '../engine/types.ts';

export type {
  ActKind,
  Adviser,
  AdviserId,
  Bloc,
  FallCause,
  HeadlineKind,
  HiddenKind,
  HoldCode,
  LineDef,
  LineKind,
  PhoneKind,
  PhoneOptionDef,
  PhoneTemplate,
  PieceKind,
  RedlinesContent,
  RefusalCode,
  RegionId,
  Strings,
  WayOutTerm,
  WhyKind,
};

export type LineId = string;
export type PhoneId = string;

/** A declared line as the pack writes it: the engine's `LineDef` with the tape's short form always present (the engine prints it). */
export interface PackLine extends LineDef {
  /** The headline form for the teleprinter ("Wintermast: no Republic forces in the Sound"), 46 characters or fewer. */
  tape: string;
}

/** A call as the pack writes it: the engine's `PhoneTemplate` plus the words for a carried test. */
export interface PackPhone extends PhoneTemplate {
  /** Test kinds: the message on the second and third week of the same call (after WAIT). Absent on events. */
  again?: string;
}

/** The screen-only words (the screens builder's); the engine's `Strings` sections are the rest. */
export interface ScreenStrings {
  title: {
    subtitle: string;
    play: string;
    continue: string;
    howToPlay: string;
    blurb: string;
    /** PLAY with a game in progress saved asks once (as QUIT TO TITLE does): YES and NO are the menu's. */
    newGameSure: string;
  };
  screen: {
    pressed: string;
    /** After the week's number on the calendar: slot {weeks} (RULES.weeks). */
    weekOf: string;
    /** The small line under WAR: slot {limit} (RULES.warLimit), and {n} in warMany. */
    warNone: string;
    warOne: string;
    warMany: string;
    treatySub: string;
    ordersSent: string;
    heading: string;
    inherited: string;
    skip: string;
    next: string;
    begin: string;
    /** The notice over a phone held sideways. */
    upright: string;
    /** The compass letter on the sheet. */
    north: string;
  };
  act: {
    promise: string;
    withdraw: string;
    moveHere: string;
    move: string;
    cancel: string;
    promiseCost: string;
    promiseSolid: string;
    promiseDashed: string;
    moveCost: string;
    withdrawCost: string;
    wayOutIntro: string;
    wayOutOffered: string;
    termLabels: Record<WayOutTerm, string>;
    termCosts: Record<WayOutTerm, string>;
    /** The MOVE slip's hint while a counter is lifted. */
    moveHint: string;
    /** SPEC-SMALL "The three lines stay on the sheet": a MOVE or PROMISE slip names a declared line the order would cross, in the line's tape words (slot {line}). */
    crosses: string;
    /** SPEC-SMALL "A form that will fail says so": a move that leaves a ring dashed names it (slot {region}). */
    leavesDashed: string;
    /** A ring on an arrow's target will be a call (the PROMISE slip). */
    promiseCall: string;
    /** A ring on a hatched place is a provocation (the engine's `isProvocation`): they may test it first (the PROMISE slip). */
    promiseProvokes: string;
  };
  /** The handwritten note when no orders have been given this week: the world in a sentence. Slots {bloc} {a} {b} {region} {n}. */
  note: {
    pushing: string;
    pushingTwo: string;
    taken: string;
    takenMany: string;
    tested: string;
    heading: string;
    /** The eve of a fall (the engine's `fallsThisWeek`): one place (slot {region}) or several (slot {places}, a listed phrase). */
    fallsOne: string;
    fallsMany: string;
    /** After fallsOne / fallsMany when those falls would make the eighth place fighting (the engine's `fallsEndTheGame`). */
    worldWarEve: string;
    /** After a move that left a ring dashed (slot {region}). */
    movedDashed: string;
  };
  /**
   * The call's words. `inHand` is the influence in hand beside the three forms (slot {influence}); `needs` is what a
   * form you cannot afford adds to its own typed line (slots {cost}, {influence}: "needs 12 · you have 5").
   */
  phone: { ringing: string; round2: string; round3: string; answered: string; inHand: string; needs: string };
  menu: { menu: string; resume: string; howToPlay: string; sound: string; off: string; on: string; quit: string; quitSure: string; yes: string; no: string };
  debrief: { title: string; intro: string; week: string; youDid: string; theyThought: string; nothingHidden: string; next: string; back: string; done: string; score: string; again: string; toTitle: string };
  howToPlay: { title: string; lines: string[] };
  /** In-world headlines with no mechanics, for a thin week on the tape. */
  flavour: string[];
}

export type PackStrings = Strings & ScreenStrings;

/** The whole pack, as `virtual:redlines-content` exports it and `loadRedlinesContent` returns it. */
export interface RedlinesPack extends RedlinesContent {
  lines: PackLine[];
  phones: PackPhone[];
  strings: PackStrings;
  /** Adviser ids in pack order (hawk, dove, intel, ambassador). */
  adviserOrder: AdviserId[];
}

export interface ContentIssue {
  level: 'error' | 'warning';
  /** Where it was found: `phones.yaml › test-column` or `strings.yaml › headlines.fell`. */
  where: string;
  message: string;
}

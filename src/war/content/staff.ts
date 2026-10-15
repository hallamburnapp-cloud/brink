/**
 * The ten staff of WIN THE WORLD (docs/war/v2/SPEC.md section 7). Each is drawn as the object
 * they keep; at most one of each can be seated. Every staff fires once a send, seat 1 to 5; a
 * per-region staff (Governor, Harbourmaster, Sovereign) fires once per matching pin.
 */

export type StaffId =
  | 'DUTY'
  | 'QM'
  | 'SURVEYOR'
  | 'OLDHAND'
  | 'SOVEREIGN'
  | 'STRATEGIST'
  | 'GOVERNOR'
  | 'HARBOUR'
  | 'HERALD'
  | 'DEPUTY';

/** What a staff adds, which is also its chip colour: cyan for points, amber for multiplier. */
export type StaffTone = 'points' | 'multiplier';

/** Where a staff acts on the map (the long-press highlight): your gold, ports or capitals. */
export type StaffActsOn = 'gold' | 'port' | 'capital' | null;

export interface StaffDef {
  id: StaffId;
  name: string;
  /** The object that stands for them on the rail and the shop card (no faces, no portraits). */
  object: string;
  /** Shop price in coins. */
  price: number;
  /** What selling returns: half the price, rounded down. */
  sell: number;
  /** The rule as printed on the card and in the seat balloon (8 words or fewer). */
  rule: string;
  /**
   * The seat chip. '{n}' (Surveyor) and '{x}' (Old Hand) are live values: use seatChip().
   */
  chip: string;
  tone: StaffTone;
  actsOn: StaffActsOn;
}

type Row = [StaffId, string, string, number, string, string, StaffTone, StaffActsOn];

// Order matters: the shop shuffles this list (spec section 7; reference rules.py STAFF).
const ROWS: readonly Row[] = [
  ['DUTY', 'Duty Officer', 'desk lamp', 3, '+4 multiplier.', '+4', 'multiplier', null],
  ['QM', 'Quartermaster', 'supply crate', 3, '+20 points.', '+20', 'points', null],
  ['SURVEYOR', 'Surveyor', 'theodolite', 4, '+1 multiplier for every 3 regions you hold.', '+{n}', 'multiplier', 'gold'],
  ['OLDHAND', 'Old Hand', 'tin mug', 4, '×1 multiplier. Grows by 0.2 every turn.', '×{x}', 'multiplier', null],
  ['SOVEREIGN', 'Sovereign', 'signet ring', 5, '×2 multiplier for each capital pinned.', '×2 CAPITAL', 'multiplier', 'capital'],
  ['STRATEGIST', 'Strategist', 'folded map', 5, '×3 multiplier if you pin 4 or 5.', '×3 IF 4+', 'multiplier', null],
  ['GOVERNOR', 'Governor', 'wax seal', 6, '×1.5 multiplier for each gold region pinned.', '×1.5 GOLD', 'multiplier', 'gold'],
  ['HARBOUR', 'Harbourmaster', "ship's bell", 6, '×1.5 multiplier for each port pinned.', '×1.5 PORT', 'multiplier', 'port'],
  ['HERALD', 'Herald', 'paper crown', 6, 'Every pin counts as a capital and port.', 'ALL PINS ★ ⚓', 'multiplier', null],
  ['DEPUTY', 'Deputy', 'carbon paper', 7, 'Copies the staff to its right.', 'COPY', 'multiplier', null],
];

export const STAFF: readonly StaffDef[] = ROWS.map(([id, name, object, price, rule, chip, tone, actsOn]) => ({
  id,
  name,
  object,
  price,
  sell: Math.floor(price / 2),
  rule,
  chip,
  tone,
  actsOn,
}));

export const STAFF_DEF: Readonly<Record<StaffId, StaffDef>> = Object.fromEntries(STAFF.map((s) => [s.id, s])) as Record<
  StaffId,
  StaffDef
>;

/** All ten ids in shop order. */
export const STAFF_IDS: readonly StaffId[] = STAFF.map((s) => s.id);

export function isStaffId(x: unknown): x is StaffId {
  return typeof x === 'string' && (STAFF_IDS as readonly string[]).includes(x);
}

/** A multiplier held in tenths, always with one decimal: 10 -> '1.0', 14 -> '1.4'. */
/** A multiplier from tenths, printed as the board prints one: whole when whole ('2'), else one decimal ('1.4'). */
function tenths(m10: number): string {
  return m10 % 10 === 0 ? String(m10 / 10) : `${Math.floor(m10 / 10)}.${m10 % 10}`;
}

/**
 * The seat chip with live values filled in: the Surveyor's '+n' (gold held ÷ 3, rounded down)
 * and the Old Hand's '×n.n' (whole when whole: '×2'). The Deputy's chip is 'COPY' (the seat view adds what it copies).
 */
export function seatChip(id: StaffId, live: { gold?: number; oldHandM10?: number } = {}): string {
  const chip = STAFF_DEF[id].chip;
  if (id === 'SURVEYOR') return chip.replace('{n}', String(Math.floor((live.gold ?? 0) / 3)));
  if (id === 'OLDHAND') return chip.replace('{x}', tenths(live.oldHandM10 ?? 10));
  return chip;
}

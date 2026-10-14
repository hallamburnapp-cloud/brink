/**
 * The 20 staff of the slice (spec section 5). Each is drawn as the object they keep.
 * Timing decides when a staff fires during a sweep:
 * - 'pin': at each scoring pin, after its weight, threads and stamp;
 * - 'again': makes some pins score again;
 * - 'standby': for lit regions you left unpinned;
 * - 'desk': once per sweep, after the pins, in seat order;
 * - 'rule': changes the rules while seated (it never fires);
 * - 'copy': the Deputy, a copy of the nearest non-Deputy staff to its right;
 * - 'clear': when a crisis clears.
 */

export type StaffId =
  | 'DUTY'
  | 'QM'
  | 'HARBOUR'
  | 'SURVEYOR'
  | 'HOTLINE'
  | 'GOVERNOR'
  | 'TREASURER'
  | 'OLDHAND'
  | 'RAILCLERK'
  | 'MEDIATOR'
  | 'STRATEGIST'
  | 'ENVOY'
  | 'COURIER'
  | 'FERRY'
  | 'SIGNALS'
  | 'ADMIRAL'
  | 'CHIEF'
  | 'DEPUTY'
  | 'HERALD'
  | 'SOVEREIGN';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type StaffTiming = 'pin' | 'desk' | 'again' | 'standby' | 'rule' | 'copy' | 'clear';

export interface StaffDef {
  id: StaffId;
  name: string;
  /** The object that stands for them on the rail (no faces, no portraits). */
  object: string;
  rarity: Rarity;
  /** Shop price in Funds. */
  price: number;
  /** What selling returns: floor(price / 2), minimum 1 (the Sovereign: 10). */
  sell: number;
  timing: StaffTiming;
  /** One plain line, as shown in the rule balloon and on shop cards. */
  rule: string;
  /** The seat chip. The Old Hand's chip shows its live count: use seatChip(). */
  chip: string;
  /** Offered in the Briefing (the Sovereign is not: Late Shift only). */
  inShop: boolean;
}

export const RARITY_RIM: Readonly<Record<Rarity, string>> = {
  common: '#8A8F98',
  uncommon: '#C9A35B',
  rare: '#9DB8D9',
  legendary: '#F2C94C',
};

export const RARITY_NAME: Readonly<Record<Rarity, string>> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
};

type Row = [StaffId, string, string, Rarity, number, StaffTiming, string, string];

const ROWS: Row[] = [
  ['DUTY', 'Duty Officer', 'desk lamp', 'common', 3, 'desk', '+4 Momentum.', '+4M'],
  ['QM', 'Quartermaster', 'supply crate', 'common', 3, 'desk', '+30 Influence.', '+30I'],
  ['HARBOUR', 'Harbourmaster', "ship's bell", 'common', 4, 'pin', 'Each Port that scores: +15 Influence.', '+15⚓'],
  [
    'SURVEYOR',
    'Surveyor',
    'theodolite',
    'common',
    4,
    'pin',
    'Each scoring region numbered 4 or less: +15 Influence.',
    '+15≤4',
  ],
  [
    'HOTLINE',
    'Hotline Operator',
    'red telephone',
    'common',
    4,
    'desk',
    '+8 Momentum if 3 or more scoring pins are joined.',
    '+8M·3',
  ],
  ['GOVERNOR', 'Governor', 'wax seal', 'common', 5, 'pin', 'Each Capital that scores: +5 Momentum.', '+5M★'],
  ['TREASURER', 'Treasurer', 'cash box', 'common', 4, 'clear', '+4 Funds when a crisis clears.', '+4◆'],
  [
    'OLDHAND',
    'Old Hand',
    'tin mug',
    'common',
    5,
    'desk',
    '+Influence equal to its count. The count grows by 5 after every sweep.',
    '+nI',
  ],
  ['RAILCLERK', 'Rail Clerk', 'timetable', 'uncommon', 6, 'rule', 'Threads add triple their traffic as Influence.', 'thr×3'],
  [
    'MEDIATOR',
    'Mediator',
    'teacup',
    'uncommon',
    6,
    'desk',
    'x3 Momentum if you pinned 3 regions or fewer.',
    '×3≤3',
  ],
  [
    'STRATEGIST',
    'Strategist',
    'folded map',
    'uncommon',
    7,
    'desk',
    'x2 Momentum if 4 or more scoring pins are joined.',
    '×2·4',
  ],
  [
    'ENVOY',
    'Envoy',
    'diplomatic bag',
    'uncommon',
    7,
    'desk',
    'x2 Momentum if the scoring pins cover 4 or more colours.',
    '×2·4c',
  ],
  ['COURIER', 'Courier', 'leather satchel', 'uncommon', 6, 'again', 'The first pin in the sweep scores twice.', '1st×2'],
  ['FERRY', 'Ferry Master', 'ferry timetable', 'uncommon', 7, 'rule', 'All Ports count as joined to each other.', '⚓=⚓'],
  ['SIGNALS', 'Signals Officer', 'morse key', 'rare', 8, 'again', 'Capitals score twice.', '★×2'],
  ['ADMIRAL', 'Admiral', 'brass telescope', 'rare', 8, 'pin', 'Each Port that scores: x1.5 Momentum.', '×1.5⚓'],
  [
    'CHIEF',
    'Chief of Staff',
    'clipboard',
    'rare',
    9,
    'standby',
    'Each lit Capital you did not pin: x1.5 Momentum.',
    '×1.5★sb',
  ],
  ['DEPUTY', 'Deputy', 'carbon paper', 'rare', 10, 'copy', 'Copies the staff to its right.', 'COPY'],
  ['HERALD', 'Herald', 'paper crown', 'rare', 8, 'rule', 'Every region counts as a Capital.', 'all★'],
  ['SOVEREIGN', 'The Sovereign', 'signet ring', 'legendary', 20, 'pin', 'Each Capital that scores: x2 Momentum.', '★×2M'],
];

/** The Sovereign is never sold in the shop; its sale value is fixed by the spec. */
const FIXED_SELL: Partial<Record<StaffId, number>> = { SOVEREIGN: 10 };

export const STAFF: readonly StaffDef[] = ROWS.map(([id, name, object, rarity, price, timing, rule, chip]) => ({
  id,
  name,
  object,
  rarity,
  price,
  sell: FIXED_SELL[id] ?? Math.max(1, Math.floor(price / 2)),
  timing,
  rule,
  chip,
  inShop: rarity !== 'legendary',
}));

export const STAFF_DEF: Readonly<Record<StaffId, StaffDef>> = Object.fromEntries(STAFF.map((s) => [s.id, s])) as Record<
  StaffId,
  StaffDef
>;

export const STAFF_IDS: readonly StaffId[] = STAFF.map((s) => s.id);

/** Staff the Briefing can offer (spec: staff 1-19). */
export const SHOP_STAFF: readonly StaffId[] = STAFF.filter((s) => s.inShop).map((s) => s.id);

/** The seat chip for a staff, with the Old Hand's live count filled in. */
export function seatChip(id: StaffId, count = 0): string {
  return id === 'OLDHAND' ? `+${count}I` : STAFF_DEF[id].chip;
}

/**
 * Papers (spec section 6): the 8 Orders, which sit in the in-tray until used, and Playbooks,
 * which apply the moment they are bought. Every Order's effect is permanent and drawn on the map.
 */
import { PATTERN, type PatternId } from './patterns';

export type OrderId = 'FORTIFY' | 'RELAY' | 'ECHO' | 'CABLE' | 'DEFECT' | 'PROMOTE' | 'RETIRE' | 'AIRLIFT';

/**
 * How an Order picks its regions:
 * - 'regions': tap min..max regions (FORTIFY, RELAY, ECHO, PROMOTE, RETIRE);
 * - 'drag': drag from one region to another (LAY CABLE: exactly 2);
 * - 'source': tap a source, then 1..2 regions that take its colour (DEFECT);
 * - 'unlit': tap one region that is still in the pile (AIRLIFT).
 */
export type TargetKind = 'regions' | 'drag' | 'source' | 'unlit';

export interface OrderDef {
  id: OrderId;
  name: string;
  rule: string;
  /** How the effect is drawn on the map, for the renderer and the long-press preview. */
  mark: string;
  targeting: { kind: TargetKind; min: number; max: number };
  /** AIRLIFT: only during a crisis (it pins a region for the next sweep). */
  crisisOnly: boolean;
  price: number;
  sell: number;
}

export const ORDER_PRICE = 3;
export const ORDER_SELL = 1;

type Row = [OrderId, string, string, string, TargetKind, number, number, boolean];

const ROWS: Row[] = [
  [
    'FORTIFY',
    'FORTIFY',
    'Up to 2 regions: +20 Influence each time they score.',
    'hatched borders',
    'regions',
    1,
    2,
    false,
  ],
  ['RELAY', 'RELAY', '1 region: x1.5 Momentum each time it scores.', 'a double ring', 'regions', 1, 1, false],
  ['ECHO', 'ECHO', '1 region scores twice.', 'a doubled pin head', 'regions', 1, 1, false],
  [
    'CABLE',
    'LAY CABLE',
    'Join two regions for good. Both become Ports.',
    'a brass line',
    'drag',
    2,
    2,
    false,
  ],
  [
    'DEFECT',
    'DEFECT',
    'Pick a region, then up to 2 more. They take its colour.',
    'an ink spread',
    'source',
    2,
    3,
    false,
  ],
  ['PROMOTE', 'PROMOTE', '1 region becomes a Capital.', 'a star', 'regions', 1, 1, false],
  [
    'RETIRE',
    'RETIRE',
    'Up to 2 regions leave the map for the run.',
    'shuttered dark',
    'regions',
    1,
    2,
    false,
  ],
  [
    'AIRLIFT',
    'AIRLIFT',
    'During a crisis, pin 1 unlit region. It counts towards your 5.',
    'a white pin',
    'unlit',
    1,
    1,
    true,
  ],
];

export const ORDERS: readonly OrderDef[] = ROWS.map(([id, name, rule, mark, kind, min, max, crisisOnly]) => ({
  id,
  name,
  rule,
  mark,
  targeting: { kind, min, max },
  crisisOnly,
  price: ORDER_PRICE,
  sell: ORDER_SELL,
}));

export const ORDER: Readonly<Record<OrderId, OrderDef>> = Object.fromEntries(ORDERS.map((o) => [o.id, o])) as Record<
  OrderId,
  OrderDef
>;

export const ORDER_IDS: readonly OrderId[] = ORDERS.map((o) => o.id);

/** Playbooks: one per pattern, +1 level each, applied at once and never held in the tray. */
export const PLAYBOOK_PRICE = 3;

export interface PlaybookDef {
  pattern: PatternId;
  name: string;
  rule: string;
  price: number;
}

export function playbook(pattern: PatternId): PlaybookDef {
  const p = PATTERN[pattern];
  return {
    pattern,
    name: `${p.name} PLAYBOOK`,
    rule: `${p.name}: +${p.influencePerLevel} Influence, +${p.momentumPerLevel} Momentum.`,
    price: PLAYBOOK_PRICE,
  };
}

/** Folders hold 3 choices (pick 1, or skip). */
export type FolderKind = 'recruit' | 'orders';
export const FOLDER_PRICE = 4;
export const FOLDER_SIZE = 3;
export const FOLDER_NAME: Readonly<Record<FolderKind, string>> = {
  recruit: 'RECRUIT FOLDER',
  orders: 'ORDERS FOLDER',
};
export const FOLDER_RULE: Readonly<Record<FolderKind, string>> = {
  recruit: 'Choose 1 of 3 staff, or skip.',
  orders: 'Choose 1 of 3 Orders, or skip.',
};

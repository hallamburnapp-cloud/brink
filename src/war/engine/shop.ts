/**
 * The Briefing (spec section 8): two offer slots (staff 70 / Order 15 / Playbook 15 by rng
 * 'shop'), one folder (Recruit or Orders, 50/50; the first Briefing always Recruit), rerolls at
 * 4, 5, 6 ... Funds resetting each Briefing. Secret Playbooks appear only once made this run.
 */
import { Rng } from '../../engine/rng';
import { FOLDER_PRICE, FOLDER_SIZE, ORDER_IDS, ORDER_PRICE, PLAYBOOK_PRICE, type OrderId } from '../content/orders';
import { PUBLIC_PATTERNS, SECRET_PATTERNS, type PatternId } from '../content/patterns';
import { SHOP_STAFF, STAFF_DEF, type Rarity, type StaffId } from '../content/staff';
import { OFFER_WEIGHTS, RARITY_WEIGHTS, RULES } from './rules';
import type { Folder, Offer, RunState, Shop } from './types';

const SHOP_RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare'];

/** Staff by rarity, uniformly among those allowed; an empty rarity falls back downwards, then up. */
export function rollStaff(rng: Rng, exclude: ReadonlySet<StaffId>): StaffId | null {
  const r = rng.weightedIndex(SHOP_RARITIES.map((x) => RARITY_WEIGHTS[x as keyof typeof RARITY_WEIGHTS]));
  const tryOrder = [
    ...SHOP_RARITIES.slice(0, r + 1).reverse(), // the rolled rarity, then each rarity down
    ...SHOP_RARITIES.slice(r + 1), // then up, should the lower ones be exhausted
  ];
  for (const rarity of tryOrder) {
    const pool = SHOP_STAFF.filter((id) => STAFF_DEF[id].rarity === rarity && !exclude.has(id));
    if (pool.length) return rng.pick(pool);
  }
  return null;
}

/** Playbooks the shop may offer: every public pattern, plus secrets made this run. */
export function playbookPool(s: RunState): PatternId[] {
  return [...PUBLIC_PATTERNS, ...SECRET_PATTERNS.filter((p) => s.made[p] > 0)];
}

function staffOffer(id: StaffId): Offer {
  return { kind: 'staff', id, price: STAFF_DEF[id].price };
}

/** What the shop must not offer again: seated staff and everything already on the table. */
function onTable(s: RunState, shop: Partial<Shop> | null, extra: readonly (Offer | null)[] = []) {
  const staff = new Set<StaffId>(s.staff.map((x) => x.id));
  const orders = new Set<OrderId>();
  const books = new Set<PatternId>();
  const offers = [...(shop?.offers ?? []), ...extra];
  for (const o of offers) {
    if (!o) continue;
    if (o.kind === 'staff') staff.add(o.id);
    else if (o.kind === 'order') orders.add(o.id);
    else books.add(o.pattern);
  }
  const folder = shop?.folder;
  if (folder && folder.status !== 'used') {
    if (folder.kind === 'recruit') folder.contents.forEach((id) => staff.add(id));
    else folder.contents.forEach((id) => orders.add(id));
  }
  return { staff, orders, books };
}

function rollOffer(s: RunState, rng: Rng, shop: Partial<Shop> | null, extra: readonly (Offer | null)[]): Offer {
  const taken = onTable(s, shop, extra);
  const kind = rng.weightedIndex([OFFER_WEIGHTS.staff, OFFER_WEIGHTS.order, OFFER_WEIGHTS.playbook]);
  if (kind === 0) {
    const id = rollStaff(rng, taken.staff);
    if (id) return staffOffer(id);
  }
  if (kind === 2) {
    const books = playbookPool(s).filter((p) => !taken.books.has(p));
    if (books.length) return { kind: 'playbook', pattern: rng.pick(books), price: PLAYBOOK_PRICE };
  }
  const orders = ORDER_IDS.filter((o) => !taken.orders.has(o));
  return { kind: 'order', id: rng.pick(orders.length ? orders : ORDER_IDS), price: ORDER_PRICE };
}

/** Roll both offer slots (on opening and on reroll). */
export function rollOffers(s: RunState, rng: Rng, shop: Partial<Shop> | null): Offer[] {
  const first = rollOffer(s, rng, { ...shop, offers: [] }, []);
  const second = rollOffer(s, rng, { ...shop, offers: [] }, [first]);
  return [first, second];
}

function rollFolder(s: RunState, rng: Rng, offers: readonly Offer[], forceRecruit: boolean): Folder {
  const recruit = forceRecruit || rng.next() < 0.5;
  const taken = onTable(s, { offers: [...offers] });
  if (recruit) {
    const contents: StaffId[] = [];
    for (let i = 0; i < FOLDER_SIZE; i++) {
      const id = rollStaff(rng, new Set([...taken.staff, ...contents]));
      if (id) contents.push(id);
    }
    return { kind: 'recruit', price: FOLDER_PRICE, contents, status: 'sealed' };
  }
  const contents = rng.shuffle([...ORDER_IDS]).slice(0, FOLDER_SIZE);
  return { kind: 'orders', price: FOLDER_PRICE, contents, status: 'sealed' };
}

/** The first night's first Briefing (spec section 11). */
function firstNightShop(): Shop {
  return {
    briefing: 1,
    offers: [staffOffer('DUTY'), staffOffer('HARBOUR')],
    folder: { kind: 'recruit', price: FOLDER_PRICE, contents: ['HOTLINE', 'QM', 'COURIER'], status: 'sealed' },
    rerollCost: RULES.rerollBase,
  };
}

/** Open a Briefing on a drafted state. */
export function openBriefing(s: RunState): void {
  s.briefings += 1;
  if (s.firstNight && s.briefings === 1) {
    s.shop = firstNightShop();
    return;
  }
  const rng = new Rng(s.rng.shop);
  const offers = rollOffers(s, rng, null);
  const folder = rollFolder(s, rng, offers, s.briefings === 1);
  s.rng.shop = rng.snapshot();
  s.shop = { briefing: s.briefings, offers, folder, rerollCost: RULES.rerollBase };
}

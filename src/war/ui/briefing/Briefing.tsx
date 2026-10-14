/**
 * The Briefing (spec 8 and 10): a tray that rises over the lower map after a clear. Two offers
 * (staff on felt in their rarity rim, Orders as typed linen, Playbooks), the folder, REROLL and
 * NEXT CRISIS; the in-tray and the clear's receipt along the bottom. Long-press an offer to see
 * where it acts on the map. While an Order is being placed, the tray drops away.
 */
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { actsOn, armedView, formatShort, patternExample, shopView, type CardView, type OfferView, type RunState, type ShopView } from '../../engine';
import { PATTERN, patternValues, type PatternId } from '../../content/patterns';
import { STAFF_DEF, seatChip, type StaffId, type StaffTiming } from '../../content/staff';
import type { OrderId } from '../../content/orders';
import { Glyph, OrderIcon, PaperIcon, StaffIcon } from '../art';
import { BRIEFING_TOAST, buyOffer, nextCrisis, openFolder, pickCard, rerollOffers, skipFolder } from '../app/actions';
import { busy, pressHighlight, pressNote, receiptOpen, reduced, showToast, speed } from '../app/store';
import { trayLeaving } from '../fx/anim';
import { FOLDER_CARD_X, R, type Rect } from '../common/layout';
import { Chip, Funds, RuleText } from '../common/text';
import { FitText, useFitBox } from '../common/FitText';
import { TraySlots } from '../controls/Controls';
import { buzz } from '../fx/shake';
import { ReceiptPaper } from '../readout/ReceiptPaper';
import { Coach } from '../sheets/Coach';

/** When a staff fires, in words a newcomer reads (the card's top-left tag). */
const TIMING_LABEL: Record<StaffTiming, string> = {
  pin: 'EACH PIN',
  desk: 'EACH SWEEP',
  again: 'AGAIN',
  standby: 'UNPINNED',
  rule: 'ALWAYS',
  copy: 'COPY',
  clear: 'ON CLEAR',
};

/** What a taken offer's empty well is stamped with. */
const TAKEN_STAMP: Record<CardView['kind'], string> = { staff: 'HIRED', order: 'FILED', playbook: 'APPLIED' };

const LONG_PRESS_MS = 300;
/**
 * NEXT CRISIS sits where the readout's sum was a moment ago: a tap meant for the sum (or a second
 * tap that skipped the clear) must not throw the Briefing away. It listens once the tray has
 * risen and settled.
 */
const NEXT_GUARD_MS = 400;

export function Briefing({ s }: { s: RunState }): JSX.Element | null {
  const shop = shopView(s);
  const armed = armedView(s);
  // A long-press lowers the tray: far enough to show the map, or the readout too for a note.
  const peek = pressNote.value ? ' peek deep' : pressHighlight.value !== null ? ' peek' : '';
  // What each offer slot last held (it outlives an open folder), so a taken slot is stamped for it.
  const held = useRef<Array<CardView['kind'] | null>>([null, null]);
  // The rise is a CSS animation, so the first frame painted is already off-screen (no flash).
  const rise = reduced.value ? undefined : { animationDuration: `${300 / speed.value}ms` };
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), (reduced.value ? 0 : 300 / speed.value) + NEXT_GUARD_MS);
    return () => clearTimeout(t);
  }, []);

  if (!shop) return null;
  const folderOpen = shop.folder.status === 'open';
  return (
    <>
      <div
        class={`layer tray-layer${reduced.value ? '' : ' rising'}${armed ? ' away' : ''}${peek}${trayLeaving.value ? ' leaving' : ''}`}
        style={rise}
      >
        <Coach at="tray" />
        <div class="tray" />
        <i class="grab abs" />
        <Header shop={shop} />
        {folderOpen ? <OpenFolder s={s} shop={shop} /> : <Offers s={s} shop={shop} held={held.current} />}
        <FolderCard shop={shop} />
        <Reroll shop={shop} folderOpen={folderOpen} />
        <button class="brass next abs" style={rect(R.next)} aria-disabled={ready ? undefined : 'true'} onClick={() => ready && nextCrisis()}>
          <span class="btn-title">NEXT CRISIS</span>
          <span class="arrow">
            <Glyph name="arrow" size={11} />
          </span>
        </button>
        <div class="intray-label abs">
          <span>IN-TRAY</span>
          <span class="num">
            {s.tray.length} / {s.traySlots}
          </span>
        </div>
        <TraySlots s={s} briefing />
        <Payout s={s} />
      </div>
      {armed && (
        <div class="layer place-layer">
          <div class="place-bar" />
          <div class="intray-label abs">
            <span>IN-TRAY</span>
            <span class="num">
              {s.tray.length} / {s.traySlots}
            </span>
          </div>
          <TraySlots s={s} />
        </div>
      )}
    </>
  );
}

function rect(r: Rect): JSX.CSSProperties {
  return { left: `${r[0]}px`, top: `${r[1]}px`, width: `${r[2]}px`, height: `${r[3]}px` };
}

function Header({ shop }: { shop: ShopView }): JSX.Element {
  const n = shop.next;
  return (
    <div class="tray-head abs">
      <span class="t">BRIEFING</span>
      <span class="sep">·</span>
      <span class="n">next:</span>
      {n.newHour && <span class="h num">{n.hour}</span>}
      <span class="c">{n.crisis}</span>
      <span class="v num">{formatShort(n.target, 7)}</span>
    </div>
  );
}

function Offers({ s, shop, held }: { s: RunState; shop: ShopView; held: Array<CardView['kind'] | null> }): JSX.Element {
  return (
    <>
      {shop.offers.map((o, slot) => {
        const r = slot === 0 ? R.offer0 : R.offer1;
        if (!o) {
          return (
            <div key={`taken${slot}`} class="offer-taken abs" style={rect(r)} aria-label="Taken">
              <span class="taken-stamp">{TAKEN_STAMP[held[slot] ?? 'staff']}</span>
            </div>
          );
        }
        held[slot] = o.kind;
        return <OfferCard key={`${slot}-${o.kind}-${o.id}`} s={s} o={o} r={r} />;
      })}
    </>
  );
}

/** A refusal lands on the thing tapped: its price tag shakes and flushes red. */
function useRefusal(): [number, () => void] {
  const [n, setN] = useState(0);
  return [
    n,
    () => {
      buzz(20);
      setN((k) => k + 1);
    },
  ];
}

/** Long-press shows where a card acts; a short tap buys it. */
function usePress(onTap: () => void, onLong: () => void, onLongEnd: () => void) {
  const state = useRef<{ timer: number; long: boolean } | null>(null);
  const end = () => {
    const p = state.current;
    state.current = null;
    if (p) clearTimeout(p.timer);
    return p;
  };
  return {
    onPointerDown: (e: PointerEvent) => {
      if (busy.value) return;
      e.stopPropagation();
      // Captured, so the press survives the tray slipping down under the finger.
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const p = { timer: 0, long: false };
      p.timer = window.setTimeout(() => {
        p.long = true;
        buzz(8);
        onLong();
      }, LONG_PRESS_MS);
      state.current = p;
    },
    onPointerUp: (e: PointerEvent) => {
      e.stopPropagation();
      const p = end();
      if (!p) return;
      if (p.long) onLongEnd();
      else onTap();
    },
    onPointerCancel: () => {
      const p = end();
      if (p?.long) onLongEnd();
    },
  };
}

/** When a staff fires, as the head of its long-press line over the readout. */
const TIMING_HEAD: Record<StaffTiming, string> = {
  pin: 'EACH SCORING PIN',
  desk: 'EVERY SWEEP, AFTER THE PINS',
  again: 'AGAIN',
  standby: 'EVERY SWEEP',
  rule: 'ALWAYS, WHILE SEATED',
  copy: 'COPY',
  clear: 'ON A CLEAR',
};

/**
 * A long-press shows where a card acts: its regions lit on the map; or, for a card with no place
 * on the map (a desk staff, a rule), its line over the readout beside the box it feeds; or, for a
 * Playbook, its shape outlined on the map with its line.
 */
function peek(s: RunState, c: { kind: CardView['kind']; id: string }): void {
  if (c.kind === 'playbook') {
    const p = PATTERN[c.id as PatternId];
    pressHighlight.value = patternExample(s, p.id);
    pressNote.value = { head: p.name, text: `${p.shape}, like these.`, box: null };
    return;
  }
  if (c.kind === 'order') {
    pressHighlight.value = actsOn(s, { kind: 'order', id: c.id as OrderId, price: 0 });
    return;
  }
  const id = c.id as StaffId;
  const regions = actsOn(s, { kind: 'staff', id });
  if (regions.length) {
    pressHighlight.value = regions;
    return;
  }
  const def = STAFF_DEF[id];
  const box = /Momentum/.test(def.rule) ? 'mom' : /Influence|scores twice/.test(def.rule) ? 'inf' : null;
  pressNote.value = { head: TIMING_HEAD[def.timing], text: def.rule, box };
}

function endPeek(): void {
  pressHighlight.value = null;
  pressNote.value = null;
}

function OfferCard({ s, o, r }: { s: RunState; o: OfferView; r: Rect }): JSX.Element {
  const [refused, refuse] = useRefusal();
  const press = usePress(
    () => buyOffer(o.slot) || refuse(),
    () => peek(s, o),
    endPeek,
  );
  const poor = o.reason === 'Not enough Funds.';
  const blocked = !!o.reason && !poor;
  const cls = `offer abs ${o.kind}${o.rarity ? ` ${o.rarity}` : ''}${poor ? ' poor' : ''}${blocked ? ' blocked' : ''}`;
  return (
    <div class={cls} style={rect(r)} role="button" aria-label={`${o.name}, ${o.price} Funds. ${o.rule}${o.reason ? ` ${o.reason}` : ''}`} {...press}>
      <CardFace c={o} price={o.price} poor={poor} refused={refused} size="large" level={o.kind === 'playbook' ? s.world.levels[o.id as PatternId] : 0} />
    </div>
  );
}

/** The face of a card: staff on felt, an Order on linen, a Playbook. */
function CardFace({
  c,
  price,
  poor,
  refused = 0,
  size,
  level,
}: {
  c: CardView;
  price: number | null;
  poor: boolean;
  refused?: number;
  size: 'large' | 'small';
  level: number;
}): JSX.Element {
  const icon = size === 'large' ? 48 : 40;
  const tag = price !== null ? <Price n={price} poor={poor} refused={refused} /> : <TakeTag />;
  if (c.kind === 'staff') {
    const def = STAFF_DEF[c.id as StaffId];
    return (
      <div class="body">
        <div class="felt">
          <span class="obj">
            <StaffIcon id={c.id as StaffId} size={icon} />
          </span>
        </div>
        <span class="tag">
          {(c.rarity ?? 'common').toUpperCase()} · {TIMING_LABEL[def.timing]}
        </span>
        {size === 'large' && (
          <span class="seatchip">
            <Chip id={c.id as StaffId} chip={seatChip(c.id as StaffId)} />
          </span>
        )}
        <span class="name">
          <FitText text={c.name} max={size === 'large' ? 14 : 12} min={9} />
        </span>
        <RuleBox size={size} fit={c.id}>
          <RuleText rule={c.rule} />
        </RuleBox>
        {tag}
      </div>
    );
  }
  if (c.kind === 'order') {
    return (
      <div class="body">
        {size === 'large' && <i class="clip" />}
        <span class="tag">ORDER</span>
        <span class="obj">
          <OrderIcon id={c.id as OrderId} variant="stamp" size={icon} />
        </span>
        <i class="typed-line" />
        <span class="name">
          <FitText text={c.name} max={size === 'large' ? 14 : 12} min={9} />
        </span>
        <RuleBox size={size} fit={c.id}>
          <RuleText rule={c.rule} />
        </RuleBox>
        {tag}
      </div>
    );
  }
  const p = PATTERN[c.id as PatternId];
  const now = patternValues(p.id, level);
  const next = patternValues(p.id, level + 1);
  return (
    <div class="body">
      <span class="tag">PLAYBOOK · Lv {level + 1}</span>
      <span class="obj">
        <PaperIcon kind="PLAYBOOK" pattern={c.id as PatternId} size={icon} />
      </span>
      <i class="typed-line" />
      <span class="name">
        <FitText text={p.name} max={size === 'large' ? 14 : 12} min={9} />
      </span>
      <RuleBox size={size} fit={c.id}>
        <span class="pb-shape">{p.shape}.</span>
        <br />
        <span class="lv num">
          <b class="c-inf">{now.influence}</b>×<b class="c-mom">{now.momentum}</b> <Glyph name="arrow" size={7} /> <b class="c-inf">{next.influence}</b>×
          <b class="c-mom">{next.momentum}</b>
        </span>
      </RuleBox>
      {price !== null && tag}
    </div>
  );
}

/** A card's rule: it wraps round the price tag in the corner, and steps its size down rather than clip. */
function RuleBox({ size, fit, children }: { size: 'large' | 'small'; fit: string; children: ComponentChildren }): JSX.Element {
  const box = useFitBox(size === 'large' ? 9 : 8.5, fit);
  return (
    <span ref={box} class="rule-text">
      <i class="price-room" />
      {children}
    </span>
  );
}

/** On an open folder's cards: they are already paid for. */
function TakeTag(): JSX.Element {
  return <span class="price take">TAKE</span>;
}

function Price({ n, poor, refused = 0 }: { n: number; poor: boolean; refused?: number }): JSX.Element {
  return (
    <span key={refused} class={`price${poor ? ' poor' : ''}${refused ? ' refused' : ''}`}>
      {poor && (
        <span class="lock">
          <Glyph name="lock" size={9} />
        </span>
      )}
      <Funds n={n} size={9} />
    </span>
  );
}

function FolderCard({ shop }: { shop: ShopView }): JSX.Element {
  const f = shop.folder;
  const [refused, refuse] = useRefusal();
  if (f.status === 'open') {
    return (
      <button class="btn-outline skip abs" style={rect([16, 651, 171, 40])} onClick={skipFolder}>
        <span class="btn-title">SKIP</span>
      </button>
    );
  }
  const used = f.status === 'used';
  const poor = f.reason === 'Not enough Funds.';
  const blocked = !used && !!f.reason && !poor;
  return (
    <div
      class={`folder abs${used ? ' used' : ''}${poor ? ' poor' : ''}${blocked ? ' blocked' : ''}`}
      style={rect(R.folder)}
      role="button"
      aria-label={`${f.name}, ${f.price} Funds. ${f.rule}${f.reason && !used ? ` ${f.reason}` : ''}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => !used && (openFolder() || refuse())}
    >
      <i class="peek p1" />
      <i class="peek p2" />
      <i class="peek p3" />
      <i class="back" />
      <div class="front">
        <span class="label">{f.name}</span>
        <span class="sub">{f.kind === 'recruit' ? 'Pick 1 of 3 staff' : 'Pick 1 of 3 Orders'}</span>
        <span class="folder-stamp" aria-hidden="true">
          {f.kind === 'recruit' ? 'RECRUIT' : 'ORDERS'}
        </span>
        {used ? <span class="filed">FILED</span> : <Price n={f.price} poor={poor} refused={refused} />}
      </div>
    </div>
  );
}

function OpenFolder({ s, shop }: { s: RunState; shop: ShopView }): JSX.Element {
  return (
    <>
      {shop.folder.cards.map((c, i) => (
        <FolderPick key={`${c.kind}-${c.id}`} s={s} c={c} r={[FOLDER_CARD_X[i], 489, 110, 150]} delay={i * 70} />
      ))}
    </>
  );
}

/** One of an open folder's cards: a tap takes it (a refusal shakes the card); a hold shows where it acts. */
function FolderPick({ s, c, r, delay }: { s: RunState; c: ShopView['folder']['cards'][number]; r: Rect; delay: number }): JSX.Element {
  const [refused, refuse] = useRefusal();
  const press = usePress(
    () => pickCard(c.index) || refuse(),
    () => peek(s, c),
    endPeek,
  );
  return (
    <div
      key={refused}
      class={`offer small abs ${c.kind}${c.rarity ? ` ${c.rarity}` : ''}${c.reason ? ' blocked' : ''}${refused ? ' refused' : ''}`}
      style={{ ...rect(r), animationDelay: refused ? '0ms' : `${delay}ms` }}
      role="button"
      aria-label={`${c.name}. ${c.rule}${c.reason ? ` ${c.reason}` : ''}`}
      {...press}
    >
      <CardFace c={c} price={null} poor={false} size="small" level={0} />
    </div>
  );
}

/** REROLL ◆n. While a folder is open its cards are the choice on the table, so REROLL waits. */
function Reroll({ shop, folderOpen }: { shop: ShopView; folderOpen: boolean }): JSX.Element {
  const [refused, refuse] = useRefusal();
  const off = folderOpen || !shop.canReroll;
  const onClick = () => {
    if (folderOpen) {
      refuse();
      showToast('Take a card or SKIP first.', BRIEFING_TOAST);
      return;
    }
    if (!rerollOffers()) refuse();
  };
  return (
    <button key={refused} class={`btn-outline reroll abs${off ? ' poor' : ''}${refused ? ' refused' : ''}`} style={rect(R.reroll)} onClick={onClick}>
      <span class="btn-title">REROLL</span>
      <span class={`cost${shop.canReroll ? '' : ' short'}`}>
        <Funds n={shop.rerollCost} size={9} />
      </span>
    </button>
  );
}

/**
 * The clear's payout, typed on a torn linen ticket. Its first line is the sweep that cleared: a
 * tap unfolds that sweep's LAST SWEEP receipt above the tray (where its points came from).
 */
function Payout({ s }: { s: RunState }): JSX.Element | null {
  const c = s.lastClear;
  if (!c) return null;
  const rec = s.lastSweep;
  const crisis = s.crisis.kind === 'FLARE_UP' ? 'FLARE-UP' : s.crisis.kind;
  const rows: Array<[string, number]> = [[`${crisis} CLEARED`, c.reward]];
  if (c.unusedSweeps) rows.push([`${c.unusedSweeps} SWEEP${c.unusedSweeps > 1 ? 'S' : ''} LEFT`, c.unusedSweeps]);
  if (c.interest) rows.push(['INTEREST', c.interest]);
  if (c.overwhelm) rows.push([`${[0, 2, 4, 8][c.overwhelm]}× THE TARGET`, c.overwhelm]);
  if (c.treasurer) rows.push(['TREASURER', c.treasurer]);
  const open = receiptOpen.value === 'briefing';
  return (
    <>
      <div class="payout abs" style={rect([238, 745, 136, 56])}>
        {rec && (
          <button
            class="row sweep-row"
            aria-expanded={open}
            aria-label="The sweep that cleared: where the points came from"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => (receiptOpen.value = open ? null : 'briefing')}
          >
            <span>LAST SWEEP</span>
            <span>
              {formatShort(rec.leverage, 7)} <Glyph name="arrow" size={6} />
            </span>
          </button>
        )}
        {rows.map(([k, v]) => (
          <div key={k} class="row">
            <span>{k}</span>
            <span>+{v}</span>
          </div>
        ))}
      </div>
      {open && rec && <ReceiptPaper rec={rec} bottom={844 - R.tray[1] + 10} />}
    </>
  );
}

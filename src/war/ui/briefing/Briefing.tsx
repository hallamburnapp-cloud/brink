/**
 * The Briefing (spec 8 and 10): a tray that rises over the lower map after a clear. Two offers
 * (staff on felt in their rarity rim, Orders as typed linen, Playbooks), the folder, REROLL and
 * NEXT CRISIS; the in-tray and the clear's receipt along the bottom. Long-press an offer to see
 * where it acts on the map. While an Order is being placed, the tray drops away.
 */
import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { actsOn, armedView, formatShort, shopView, type CardView, type OfferView, type RunState, type ShopView } from '../../engine';
import { PATTERN, type PatternId } from '../../content/patterns';
import { STAFF_DEF, type StaffId } from '../../content/staff';
import type { OrderId } from '../../content/orders';
import { Glyph, OrderIcon, PaperIcon, StaffIcon } from '../art';
import { buyOffer, nextCrisis, openFolder, pickCard, rerollOffers, skipFolder } from '../app/actions';
import { busy, highlight, reduced, speed } from '../app/store';
import { FOLDER_CARD_X, R, type Rect } from '../common/layout';
import { Chip, Funds, RuleText } from '../common/text';
import { FitText } from '../common/FitText';
import { TraySlots } from '../controls/Controls';
import { buzz } from '../fx/shake';

const TIMING_LABEL: Record<string, string> = {
  pin: 'PIN',
  desk: 'DESK',
  again: 'AGAIN',
  standby: 'STANDBY',
  rule: 'RULE',
  copy: 'COPY',
  clear: 'ON CLEAR',
};

const LONG_PRESS_MS = 300;

export function Briefing({ s }: { s: RunState }): JSX.Element | null {
  const shop = shopView(s);
  const tray = useRef<HTMLDivElement>(null);
  const armed = armedView(s);
  const peek = highlight.value !== null;

  useEffect(() => {
    const el = tray.current;
    if (!el || reduced.value || typeof el.animate !== 'function') return;
    el.animate([{ transform: 'translateY(393px)' }, { transform: 'translateY(0)' }], {
      duration: 300 / speed.value,
      easing: 'cubic-bezier(.22,1,.36,1)',
    });
  }, []);

  if (!shop) return null;
  return (
    <>
      <div ref={tray} class={`layer tray-layer${armed ? ' away' : ''}${peek ? ' peek' : ''}`}>
        <div class="tray" />
        <i class="grab abs" />
        <Header shop={shop} />
        {shop.folder.status === 'open' ? <OpenFolder shop={shop} /> : <Offers s={s} shop={shop} />}
        <FolderCard shop={shop} />
        <button class={`btn-outline reroll abs${shop.canReroll ? '' : ' poor'}`} style={rect(R.reroll)} onClick={rerollOffers}>
          <span class="btn-title">REROLL</span>
          <span class={`cost${shop.canReroll ? '' : ' short'}`}>
            <Funds n={shop.rerollCost} size={9} />
          </span>
        </button>
        <button class="brass next abs" style={rect(R.next)} onClick={nextCrisis}>
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
        <Receipt s={s} />
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

function Offers({ s, shop }: { s: RunState; shop: ShopView }): JSX.Element {
  return (
    <>
      {shop.offers.map((o, slot) => {
        const r = slot === 0 ? R.offer0 : R.offer1;
        if (!o) {
          return (
            <div key={`taken${slot}`} class="offer-taken abs" style={rect(r)}>
              <span>TAKEN</span>
            </div>
          );
        }
        return <OfferCard key={`${slot}-${o.kind}-${o.id}`} s={s} o={o} r={r} />;
      })}
    </>
  );
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

function OfferCard({ s, o, r }: { s: RunState; o: OfferView; r: Rect }): JSX.Element {
  const press = usePress(
    () => buyOffer(o.slot, r),
    () => {
      const offer = s.shop?.offers[o.slot];
      if (offer) highlight.value = actsOn(s, offer);
    },
    () => (highlight.value = null),
  );
  const poor = o.reason === 'Not enough Funds.';
  const blocked = !!o.reason && !poor;
  const cls = `offer abs ${o.kind}${o.rarity ? ` ${o.rarity}` : ''}${poor ? ' poor' : ''}${blocked ? ' blocked' : ''}`;
  return (
    <div class={cls} style={rect(r)} role="button" aria-label={`${o.name}, ${o.price} Funds. ${o.rule}`} {...press}>
      <CardFace c={o} price={o.price} poor={poor} size="large" level={o.kind === 'playbook' ? s.world.levels[o.id as PatternId] : 0} />
    </div>
  );
}

/** The face of a card: staff on felt, an Order on linen, a Playbook. */
function CardFace({ c, price, poor, size, level }: { c: CardView; price: number | null; poor: boolean; size: 'large' | 'small'; level: number }): JSX.Element {
  const icon = size === 'large' ? 48 : 40;
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
            <Chip id={c.id as StaffId} chip={def.chip} />
          </span>
        )}
        <span class="name">
          <FitText text={c.name} max={size === 'large' ? 14 : 12} min={9} />
        </span>
        <span class="rule-text">
          {size === 'large' && <i class="price-room" />}
          <RuleText rule={c.rule} />
        </span>
        {price !== null ? <Price n={price} poor={poor} /> : <TakeTag />}
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
        <span class="rule-text">
          {size === 'large' && <i class="price-room" />}
          <RuleText rule={c.rule} />
        </span>
        {price !== null ? <Price n={price} poor={poor} /> : <TakeTag />}
      </div>
    );
  }
  const p = PATTERN[c.id as PatternId];
  return (
    <div class="body">
      <span class="tag">PLAYBOOK</span>
      <span class="obj">
        <PaperIcon kind="PLAYBOOK" pattern={c.id as PatternId} size={icon} />
      </span>
      <i class="typed-line" />
      <span class="name">
        <FitText text={p.name} max={size === 'large' ? 14 : 12} min={9} />
      </span>
      <span class="rule-text">
        {size === 'large' && <i class="price-room" />}
        <span class="lv num">
          Lv {level} <Glyph name="arrow" size={7} /> {level + 1}
        </span>
        <br />
        <b class="c-inf">+{p.influencePerLevel} Influence</b>, <b class="c-mom">+{p.momentumPerLevel} Momentum</b>
      </span>
      {price !== null && <Price n={price} poor={poor} />}
    </div>
  );
}

/** On an open folder's cards: they are already paid for. */
function TakeTag(): JSX.Element {
  return <span class="price take">TAKE</span>;
}

function Price({ n, poor }: { n: number; poor: boolean }): JSX.Element {
  return (
    <span class={`price${poor ? ' poor' : ''}`}>
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
  if (f.status === 'open') {
    return (
      <button class="btn-outline skip abs" style={rect([16, 651, 171, 40])} onClick={skipFolder}>
        <span class="btn-title">SKIP</span>
      </button>
    );
  }
  const used = f.status === 'used';
  const poor = f.reason === 'Not enough Funds.';
  return (
    <div
      class={`folder abs${used ? ' used' : ''}${poor ? ' poor' : ''}`}
      style={rect(R.folder)}
      role="button"
      aria-label={`${f.name}, ${f.price} Funds. ${f.rule}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => !used && openFolder()}
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
        {used ? <span class="filed">FILED</span> : <Price n={f.price} poor={poor} />}
      </div>
    </div>
  );
}

function OpenFolder({ shop }: { shop: ShopView }): JSX.Element {
  return (
    <>
      {shop.folder.cards.map((c, i) => {
        const r: Rect = [FOLDER_CARD_X[i], 489, 110, 150];
        return (
          <div
            key={`${c.kind}-${c.id}`}
            class={`offer small abs ${c.kind}${c.rarity ? ` ${c.rarity}` : ''}${c.reason ? ' blocked' : ''}`}
            style={{ ...rect(r), animationDelay: `${i * 70}ms` }}
            role="button"
            aria-label={`${c.name}. ${c.rule}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => pickCard(c.index, r)}
          >
            <CardFace c={c} price={null} poor={false} size="small" level={0} />
          </div>
        );
      })}
    </>
  );
}

/** The clear's payout, typed on a torn linen ticket. */
function Receipt({ s }: { s: RunState }): JSX.Element | null {
  const c = s.lastClear;
  if (!c) return null;
  const crisis = s.crisis.kind === 'FLARE_UP' ? 'FLARE-UP' : s.crisis.kind;
  const rows: Array<[string, number]> = [[`${crisis} CLEARED`, c.reward]];
  if (c.unusedSweeps) rows.push([`${c.unusedSweeps} SWEEP${c.unusedSweeps > 1 ? 'S' : ''} LEFT`, c.unusedSweeps]);
  if (c.interest) rows.push(['INTEREST', c.interest]);
  if (c.overwhelm) rows.push([`OVERWHELM ${[0, 2, 4, 8][c.overwhelm]}×`, c.overwhelm]);
  if (c.treasurer) rows.push(['TREASURER', c.treasurer]);
  return (
    <div class="receipt abs" style={rect([238, 745, 136, 56])}>
      {rows.slice(0, 5).map(([k, v]) => (
        <div key={k} class="row">
          <span>{k}</span>
          <span>+{v}</span>
        </div>
      ))}
    </div>
  );
}

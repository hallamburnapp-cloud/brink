/**
 * The shop (SPEC 7 and 9), in the Briefing tray that rises over the lower map after turns 2, 4,
 * 6 ...: 'SHOP · NEXT TARGET 1,600' (or, when the line-up's best last turn would miss it, 'YOUR BEST
 * 2,926 · NEXT TARGET 5,500' in red) and the coins in hand, three staff cards (object, name, rule,
 * price and the preview line 'BEST LAST TURN 390 → 2,343'), REROLL, NEXT TURN and last turn's
 * receipt. Tap a card to hire; with five seats taken the seats show what replacing each would make
 * and a tap on a seat hires into it. Long-press a card to light where it acts on the map.
 */
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { actsOn, formatInt, formatShort, shopView, type GameState, type OfferView, type ShopView } from '../../engine';
import { Coin, Glyph, StaffIcon } from '../art';
import { buyOffer, nextTurnNow, rerollOffers, TRAY_TOAST } from '../app/actions';
import { busy, pressHighlight, reduced, replacing, showToast, speed, trayLeaving } from '../app/store';
import { FitText } from '../common/FitText';
import { OFFER_RECTS, R, rectStyle } from '../common/layout';
import { formatPair } from '../common/numbers';
import { Funds, RuleText } from '../common/text';
import { buzz } from '../fx/shake';
import { ReceiptPaper } from '../readout/ReceiptPaper';

const LONG_PRESS_MS = 300;
/** NEXT TURN listens once the tray has risen and settled, so a tap meant for the cascade can't skip the shop. */
const NEXT_GUARD_MS = 400;

export function Briefing({ s }: { s: GameState }): JSX.Element | null {
  const shop = shopView(s);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), (reduced.value ? 0 : 300 / speed.value) + NEXT_GUARD_MS);
    return () => clearTimeout(t);
  }, []);
  if (!shop) return null;
  const rise = reduced.value ? undefined : { animationDuration: `${300 / speed.value}ms` };
  const peek = pressHighlight.value !== null ? ' peek' : '';
  return (
    <div class={`layer tray-layer${reduced.value ? '' : ' rising'}${peek}${trayLeaving.value ? ' leaving' : ''}`} style={rise}>
      <div class="tray" />
      <i class="grab abs" />
      <Header shop={shop} coins={s.coins} />
      {shop.offers.map((o, i) => (o.id ? <OfferCard key={`${i}-${o.id}`} s={s} o={o} shop={shop} /> : <Taken key={`taken${i}`} slot={i} />))}
      <Reroll shop={shop} />
      <button
        class={`brass next abs${shop.nothingAffordable ? ' beckon' : ''}`}
        style={rectStyle(R.next)}
        aria-disabled={ready ? undefined : 'true'}
        onClick={() => ready && nextTurnNow()}
      >
        <span class="btn-title">NEXT TURN</span>
        <span class="arrow">
          <Glyph name="arrow" size={11} />
        </span>
      </button>
      {shop.receipt && <ReceiptPaper receipt={shop.receipt} />}
    </div>
  );
}

function Header({ shop, coins }: { shop: ShopView; coins: number }): JSX.Element {
  // Behind: the line-up's best last turn (the cards' left number) cannot beat the next target.
  const behind = shop.behind;
  return (
    <>
      {behind ? (
        <div class="tray-head behind abs" aria-label={`Your best last turn, ${formatInt(behind.best)}, would miss the next target, ${formatInt(shop.nextTarget)}`}>
          <span class="n">YOUR BEST</span>
          <span class="v num short">{formatShort(behind.best, 7)}</span>
          <span class="sep">·</span>
          <span class="n">NEXT TARGET</span>
          <span class="v num">{formatShort(shop.nextTarget, 7)}</span>
        </div>
      ) : (
        <div class="tray-head abs">
          <span class="t">SHOP</span>
          <span class="sep">·</span>
          <span class="n">NEXT TARGET</span>
          <span class="v num">{formatInt(shop.nextTarget)}</span>
        </div>
      )}
      <div class="tray-coins abs" aria-label={`${coins} coins`}>
        <Coin size={18} class="coin" />
        <span class="amount num">{coins}</span>
      </div>
    </>
  );
}

/** A hired card's slot: an empty well stamped for what happened. */
function Taken({ slot }: { slot: number }): JSX.Element {
  return (
    <div class="offer-taken abs" style={rectStyle(OFFER_RECTS[slot])} aria-label="Hired">
      <span class="taken-stamp">HIRED</span>
    </div>
  );
}

/** A refusal lands on the thing tapped: it shakes, its price tag flushes red. */
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

function OfferCard({ s, o, shop }: { s: GameState; o: OfferView; shop: ShopView }): JSX.Element {
  const [refused, refuse] = useRefusal();
  const press = useRef<{ timer: number; long: boolean } | null>(null);
  const selected = replacing.value === o.slot;
  const poor = shop.fullTable ? !o.affordableWithSale : !o.affordable;
  const id = o.id!;

  const tap = () => {
    if (shop.fullTable) {
      if (!o.affordableWithSale) {
        refuse();
        showToast('Not enough coins, even after a sale.', TRAY_TOAST);
        return;
      }
      replacing.value = selected ? null : o.slot;
      return;
    }
    if (!buyOffer(o.slot)) refuse();
  };

  const end = () => {
    const p = press.current;
    press.current = null;
    if (p) clearTimeout(p.timer);
    return p;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (busy.value) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const p = { timer: 0, long: false };
    p.timer = window.setTimeout(() => {
      p.long = true;
      buzz(8);
      const where = actsOn(s, id);
      if (where.length) pressHighlight.value = where;
      else showToast(`${o.name}: every send, wherever you pin.`, TRAY_TOAST);
    }, LONG_PRESS_MS);
    press.current = p;
  };
  const onPointerUp = (e: PointerEvent) => {
    e.stopPropagation();
    const p = end();
    if (!p) return;
    if (p.long) pressHighlight.value = null;
    else tap();
  };
  const onPointerCancel = () => {
    if (end()?.long) pressHighlight.value = null;
  };

  const cls = `offer abs ${o.price >= 6 ? 'dear' : ''}${poor ? ' poor' : ''}${selected ? ' selected' : ''}`;
  return (
    <div
      key={refused}
      class={`${cls}${refused ? ' refused' : ''}`}
      style={rectStyle(OFFER_RECTS[o.slot])}
      role="button"
      aria-label={`${o.name}, ${o.price} coins. ${o.rule}${o.preview ? ` Best last turn ${o.preview.text}.` : ''}${o.reason && poor ? ` ${o.reason}` : ''}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div class="felt">
        <span class="obj">
          <StaffIcon id={id} size={40} />
        </span>
        <span class={`price${poor ? ' poor' : ''}`}>
          {poor && (
            <span class="lock">
              <Glyph name="lock" size={8} />
            </span>
          )}
          <Funds n={o.price} size={8.5} />
        </span>
      </div>
      <span class="name">
        <FitText text={o.name} max={12.5} min={9.5} />
      </span>
      <span class="rule-text">
        <RuleText rule={o.rule} size={9} />
      </span>
      {o.preview && <PreviewLine before={o.preview.before} after={o.preview.after} head={selected ? 'TAP A SEAT TO REPLACE' : 'BEST LAST TURN'} />}
    </div>
  );
}

/** 'BEST LAST TURN' over '390 → 2,343': both numbers in one form, never '3,931 → 13.3K'. */
function PreviewLine({ before, after, head }: { before: bigint; after: bigint; head: string }): JSX.Element {
  const [a, b] = formatPair(before, after, 5);
  return (
    <span class="preview">
      <span class="pv-head">{head}</span>
      <span class="pv-line num">
        <span class="pv-before">{a}</span>
        <span class="pv-arrow">→</span>
        <span class="pv-after">{b}</span>
      </span>
    </span>
  );
}

/** REROLL ◆n: three new offers. */
function Reroll({ shop }: { shop: ShopView }): JSX.Element {
  const [refused, refuse] = useRefusal();
  const off = !shop.reroll.enabled;
  return (
    <button
      key={refused}
      class={`btn-outline reroll abs${off ? ' off' : ''}${refused ? ' refused' : ''}`}
      style={rectStyle(R.reroll)}
      onClick={() => {
        if (!rerollOffers()) refuse();
      }}
      aria-label={`Reroll the offers for ${shop.reroll.cost} coins`}
    >
      <span class="btn-title">REROLL</span>
      <span class={`cost${off ? ' short' : ''}`}>
        <Funds n={shop.reroll.cost} size={9} />
      </span>
    </button>
  );
}

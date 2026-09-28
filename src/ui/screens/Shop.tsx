import { useState } from 'preact/hooks';
import { REMOVABLE_TAGS, REMOVE_TAG_PRICE } from '../../engine/leverage';
import { ctxFor, maxOrders, maxPieces } from '../../engine/run';
import { PieceCard } from '../components/PieceCard';
import { PieceIcon } from '../art/Portrait';
import { busy, content, run, shopBuy, shopBuyOrder, shopLeave, shopRemoveTag, shopReroll, shopRerollCost, shopSell, shopSellPrice } from '../store';
import { formatScore } from '../../meta/score';

export function Shop() {
  const s = run.value;
  const c = content.value;
  const [tag, setTag] = useState(REMOVABLE_TAGS[0]);
  const [confirmSell, setConfirmSell] = useState<string | null>(null);
  if (!s || !s.shop) return null;
  const shop = s.shop;
  const ctx = ctxFor(c, s);
  const nextAct = c.acts[Math.min(s.act, c.acts.length - 1)];
  const capPieces = maxPieces(ctx);
  const capOrders = maxOrders(ctx);
  const reroll = shopRerollCost();
  return (
    <div class="flex flex-1 flex-col gap-4 rise">
      <header class="pt-2">
        <div class="mono flex items-center justify-between text-[10px] tracking-[0.3em] text-mute">
          <span>{shop.mid ? 'MID-WEEK' : `END OF ${c.acts[Math.min(s.act, c.acts.length) - 1]?.name.toUpperCase() ?? 'THE ACT'}`}</span>
          <span>SCORE {formatScore(s.score)}</span>
        </div>
        <div class="mt-1 flex items-end justify-between">
          <h2 class="serif text-2xl font-semibold">The back room</h2>
          <div class="text-right">
            <div class="mono text-[9px] tracking-[0.24em] text-mute">POLITICAL CAPITAL</div>
            <div class="serif text-3xl font-bold tabular-nums text-amber">{s.capital}</div>
          </div>
        </div>
        <p class="serif mt-1 text-[13px] text-paper/70">
          {shop.mid ? 'A quiet hour between cards. ' : `Before ${s.act >= c.acts.length ? 'the next act' : nextAct.name}. `}
          Pieces {s.pieces.length}/{capPieces} · Orders {s.orders.length}/{capOrders}
        </p>
      </header>

      <section>
        <div class="mono mb-2 flex items-center justify-between text-[10px] tracking-[0.24em] text-mute">
          <span>ON OFFER</span>
          <button class="link text-paper/80 disabled:opacity-40" disabled={s.capital < reroll} onClick={shopReroll}>
            REROLL {reroll === 0 ? 'FREE' : `·${reroll}`}
          </button>
        </div>
        <div class="flex flex-col gap-2">
          {shop.offers.map((o, i) => {
            const p = c.pieces[o.piece];
            if (!p) return null;
            const afford = s.capital >= o.price && s.pieces.length < capPieces;
            return (
              <div key={`${o.piece}-${shop.rerolls}`} class={`relative ${o.sold ? 'opacity-40' : ''}`}>
                <PieceCard piece={p} onPick={!o.sold && afford ? () => shopBuy(i) : undefined} />
                <div class={`absolute right-3 top-3 mono rounded-sm px-2 py-0.5 text-[11px] font-bold ${o.sold ? 'bg-paper/20 text-paper' : afford ? 'bg-amber text-ink' : 'bg-paper/10 text-mute'}`}>
                  {o.sold ? 'BOUGHT' : `${o.price} PC`}
                </div>
                <div class="mono absolute left-3 bottom-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: p.accent }}>
                  {p.rarity}
                </div>
              </div>
            );
          })}
          {shop.offers.length === 0 && <div class="serif text-sm text-paper/60">Nothing left to buy this week.</div>}
        </div>
      </section>

      <section>
        <div class="mono mb-2 text-[10px] tracking-[0.24em] text-mute">ORDERS · one-shot</div>
        <div class="grid grid-cols-2 gap-2">
          {shop.orders.map((o, i) => {
            const d = c.orders[o.order];
            if (!d) return null;
            const afford = s.capital >= o.price && s.orders.length < capOrders;
            return (
              <button key={`${o.order}-${shop.rerolls}`} class={`paper-dark flex flex-col gap-1 rounded-md p-3 text-left ${o.sold ? 'opacity-40' : afford ? 'hover:border-paper/40' : 'opacity-70'}`} disabled={o.sold || !afford} onClick={() => shopBuyOrder(i)}>
                <div class="flex items-center justify-between">
                  <span class="h-6 w-6" style={{ color: d.accent }}>
                    <PieceIcon art={d.art} accent={d.accent} size={24} />
                  </span>
                  <span class="mono text-[11px] font-bold text-amber">{o.sold ? 'BOUGHT' : `${o.price} PC`}</span>
                </div>
                <div class="serif text-[14px] font-semibold leading-tight">{d.name}</div>
                <div class="mono text-[10px] leading-snug text-mute">{d.mechanics}</div>
              </button>
            );
          })}
        </div>
      </section>

      {s.pieces.length > 0 && (
        <section>
          <div class="mono mb-2 text-[10px] tracking-[0.24em] text-mute">IN THE ROOM · tap to sell</div>
          <ul class="flex flex-wrap gap-1.5">
            {s.pieces.map((id) => {
              const p = c.pieces[id];
              if (!p) return null;
              const price = shopSellPrice(id);
              const grown = s.pieceState[id];
              return (
                <li key={id}>
                  <button
                    class={`mono rounded-sm border px-2 py-1 text-[10px] tracking-wide ${confirmSell === id ? 'bg-red text-white' : ''}`}
                    style={{ borderColor: p.accent, color: confirmSell === id ? undefined : p.accent }}
                    title={p.mechanics}
                    onClick={() => {
                      if (confirmSell === id) {
                        shopSell(id);
                        setConfirmSell(null);
                      } else setConfirmSell(id);
                    }}
                  >
                    {confirmSell === id ? `SELL FOR ${price}?` : p.name}
                    {grown && (grown.mult || grown.base) ? ` (+${grown.mult || ''}${grown.mult && grown.base ? '/' : ''}${grown.base ? `${grown.base}b` : ''})` : ''}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section class="paper-dark rounded-md p-3">
        <div class="mono mb-2 text-[10px] tracking-[0.24em] text-mute">REMOVE FROM THE DECK · {REMOVE_TAG_PRICE} PC · once per visit</div>
        <div class="flex gap-2">
          <select class="mono flex-1 rounded-sm border border-paper/20 bg-navy px-2 py-2 text-xs text-paper" value={tag} onChange={(e) => setTag((e.target as HTMLSelectElement).value)}>
            {REMOVABLE_TAGS.filter((t) => !s.removedTags.includes(t)).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button class="btn" disabled={s.capital < REMOVE_TAG_PRICE || shop.removed.length >= 1} onClick={() => shopRemoveTag(tag)}>
            Remove
          </button>
        </div>
        {s.removedTags.length > 0 && <div class="mono mt-2 text-[10px] text-mute">GONE: {s.removedTags.join(' · ')}</div>}
      </section>

      <button class="btn btn-primary mt-auto" disabled={busy.value} onClick={shopLeave}>
        {shop.mid ? 'Back to the desk' : s.act >= c.acts.length ? 'Into the endless night' : `Begin ${nextAct.name}`}
      </button>
    </div>
  );
}

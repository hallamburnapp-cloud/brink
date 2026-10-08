/**
 * Booking economics: for each Booking, the spine's cards and what each side costs the four bars
 * in total (the "net"), so a night that is much harder or kinder than the others can be seen
 * before it is played. Pool cards are summarised at the end. Numbers are as authored (unscaled).
 *
 *   BRINK_CONTENT_DIR=content-hotel npx tsx tools/booking-nets.ts
 */
import type { CardDef, ChoiceDef, Content } from '../src/engine/types';
import { loadContent } from './load';

const BARS = ['public', 'military', 'allies', 'economy'] as const;

function net(ch: ChoiceDef): number {
  let n = 0;
  for (const k of BARS) n += ch.effects[k] ?? 0;
  if (ch.odds) {
    const p = ch.odds.base;
    let s = 0;
    let f = 0;
    for (const k of BARS) {
      s += ch.odds.success.effects?.[k] ?? 0;
      f += ch.odds.failure.effects?.[k] ?? 0;
    }
    n += p * s + (1 - p) * f;
  }
  return n;
}

function cardNets(c: CardDef): { left: number; right: number; best: number; mean: number } {
  const l = net(c.left);
  const r = net(c.right);
  return { left: l, right: r, best: Math.max(l, r), mean: (l + r) / 2 };
}

function fmt(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1);
}

function main(): void {
  const { content } = loadContent() as { content: Content };
  console.log('| Booking | Spine cards | Mean of best sides | Mean of both sides | Worst card (best side) | Tied cards | Tied mean (both sides) |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const id of content.bookingOrder) {
    const b = content.bookings[id];
    const spine = [b.opener, ...b.beats.map((x) => x.card), b.head.card].map((cid) => content.cards[cid]).filter(Boolean);
    const nets = spine.map(cardNets);
    const best = nets.reduce((s, n) => s + n.best, 0) / nets.length;
    const mean = nets.reduce((s, n) => s + n.mean, 0) / nets.length;
    let worst = spine[0];
    let worstBest = Infinity;
    spine.forEach((c, i) => {
      if (nets[i].best < worstBest) {
        worstBest = nets[i].best;
        worst = c;
      }
    });
    const tied = content.cardOrder.map((cid) => content.cards[cid]).filter((c) => !spine.includes(c) && (c.conditions?.flags_all ?? []).includes(`booking:${id}`));
    const tiedMean = tied.length ? tied.map(cardNets).reduce((s, n) => s + n.mean, 0) / tied.length : 0;
    console.log(`| ${id} | ${spine.length} | ${fmt(best)} | ${fmt(mean)} | ${worst?.id} ${fmt(worstBest)} | ${tied.length} | ${fmt(tiedMean)} |`);
  }
  const pool = content.cardOrder.map((cid) => content.cards[cid]).filter((c) => c.weight > 0 && !(c.conditions?.flags_all ?? []).some((f) => f.startsWith('booking:')));
  const pn = pool.map(cardNets);
  console.log('');
  console.log(`Pool: ${pool.length} cards; mean of best sides ${fmt(pn.reduce((s, n) => s + n.best, 0) / pn.length)}, mean of both sides ${fmt(pn.reduce((s, n) => s + n.mean, 0) / pn.length)}`);
  console.log('');
  console.log('Spine cards by best side, hardest first:');
  const rows: { id: string; booking: string; left: number; right: number }[] = [];
  for (const id of content.bookingOrder) {
    const b = content.bookings[id];
    for (const cid of [b.opener, ...b.beats.map((x) => x.card), b.head.card]) {
      const c = content.cards[cid];
      if (!c) continue;
      const n = cardNets(c);
      rows.push({ id: cid, booking: id, left: n.left, right: n.right });
    }
  }
  rows.sort((a, b) => Math.max(a.left, a.right) - Math.max(b.left, b.right));
  for (const r of rows.slice(0, 14)) console.log(`  ${r.id.padEnd(32)} left ${fmt(r.left).padStart(6)}  right ${fmt(r.right).padStart(6)}`);
}

main();

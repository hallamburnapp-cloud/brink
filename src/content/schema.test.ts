import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { compileContent, cardSchema, type RawContent } from './schema';
import { loadRaw } from '../../tools/load';
import { validateContent } from './validate';

const minimalRaw = (cards: unknown[]): RawContent => ({
  cards: [{ file: 'cards/test.yaml', items: cards }],
  pieces: [],
  endings: [],
  seats: [],
  flashpoints: [],
  speakers: { file: 'speakers.yaml', items: [{ id: 'aide', name: 'A', role: 'Aide', accent: '#ffffff', art: 'aide' }] },
  rules: {
    file: 'rules.yaml',
    item: {
      acts: [1, 2, 3, 4, 5].map((i) => ({ index: i, name: `Act ${i}`, cards: 10, effect_scale: 1, intel_shift: 0, timer_scale: 1, day_per_card: 0.5 })),
      difficulties: [{ level: 5, name: 'DEFCON 5', effect_scale: 1, intel_shift: 0, timer_scale: 1, start_escalation: 0 }],
    },
  },
});

describe('card schema', () => {
  it('accepts partial effects maps and fills defaults', () => {
    const r = cardSchema.safeParse({
      id: 'a_01_test',
      advisor: 'aide',
      text: 'A card with enough text to satisfy the minimum length rule.',
      left: { text: 'Left', effects: { public: -5, escalation: 3 } },
      right: { text: 'Right' },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.acts).toEqual([1, 5]);
      expect(r.data.right.effects).toEqual({});
      expect(r.data.once).toBe(true);
    }
  });
  it('rejects unknown keys, bad ids and out-of-range values', () => {
    expect(cardSchema.safeParse({ id: 'Bad-Id', advisor: 'aide', text: 'x'.repeat(30), left: { text: 'L' }, right: { text: 'R' } }).success).toBe(false);
    expect(cardSchema.safeParse({ id: 'ok_id', advisor: 'aide', text: 'x'.repeat(30), left: { text: 'L', effects: { public: 99 } }, right: { text: 'R' } }).success).toBe(false);
    expect(cardSchema.safeParse({ id: 'ok_id', advisor: 'aide', text: 'x'.repeat(30), left: { text: 'L' }, right: { text: 'R' }, bogus: 1 }).success).toBe(false);
  });
  it('marks follow-up targets as chained by default', () => {
    const { content, issues } = compileContent(
      minimalRaw([
        { id: 'a_01', advisor: 'aide', text: 'x'.repeat(30), left: { text: 'Left', follow: [{ card: 'a_02', in: 1 }] }, right: { text: 'Right' } },
        { id: 'a_02', advisor: 'aide', text: 'y'.repeat(30), left: { text: 'Left' }, right: { text: 'Right' } },
      ]),
    );
    expect(issues.filter((i) => i.where.startsWith('card')).length).toBe(0);
    expect(content.cards.a_01.chained).toBe(false);
    expect(content.cards.a_02.chained).toBe(true);
  });
});

/** The two shipped packs, wherever they currently live: the hotel is `content/` once the packs have swapped. */
function packDir(...candidates: string[]): string {
  for (const c of candidates) if (existsSync(join(process.cwd(), c))) return join(process.cwd(), c);
  return join(process.cwd(), candidates[candidates.length - 1]);
}

describe('shipped packs compile without schema errors', () => {
  it('the crisis pack: pieces, three seats, five acts', () => {
    const { raw, issues } = loadRaw(packDir('content-crisis', 'content'));
    expect(issues).toEqual([]);
    const compiled = compileContent(raw);
    const nonCard = compiled.issues.filter((i) => !i.where.startsWith('card') && !i.where.startsWith('cards/'));
    expect(nonCard).toEqual([]);
    expect(compiled.content.pieceOrder.length).toBeGreaterThanOrEqual(36);
    expect(Object.keys(compiled.content.seats)).toHaveLength(3);
    expect(compiled.content.acts).toHaveLength(5);
    expect(compiled.content.voice).toBe('crisis');
  });
  it('the hotel pack: one seat, twelve Bookings, one-sided bars, reviews with stars', () => {
    const dir = packDir('content-hotel', 'content');
    const { raw, issues } = loadRaw(dir);
    expect(issues).toEqual([]);
    const compiled = compileContent(raw);
    if (compiled.content.voice !== 'hotel') return; // before the packs swapped and without content-hotel: nothing to check
    expect(compiled.issues).toEqual([]);
    expect(Object.keys(compiled.content.seats)).toHaveLength(1);
    expect(compiled.content.bookingOrder.length).toBeGreaterThanOrEqual(12);
    expect(compiled.content.night.oneSided).toBe(true);
    expect(compiled.content.night.useEscalation).toBe(false);
    expect(compiled.content.night.cards).toBe(18);
    for (const id of compiled.content.bookingOrder) {
      const b = compiled.content.bookings[id];
      for (const cid of [b.opener, ...b.beats.map((x) => x.card), b.head.card]) expect(compiled.content.cards[cid], `${id}: ${cid}`).toBeDefined();
      const reviews = Object.values(compiled.content.endings).filter((e) => e.conditions?.flags_all?.includes(`booking:${id}`) && e.trigger.type === 'run_end');
      expect(reviews.length, `${id} reviews`).toBeGreaterThanOrEqual(3);
      for (const r of reviews) {
        expect(r.stars, `${r.id} stars`).toBeGreaterThanOrEqual(1);
        expect(r.quote, `${r.id} quote`).toBeTruthy();
        expect(r.byline && compiled.content.speakers[r.byline], `${r.id} byline`).toBeTruthy();
      }
    }
  });
  it('validator flags a dangling follow-up, an unsettable flag and a forbidden word', () => {
    const { content } = compileContent(
      minimalRaw([
        {
          id: 'a_01',
          advisor: 'aide',
          text: 'The Kremlin called again with a message about the border.',
          conditions: { flags_all: ['never:set'] },
          left: { text: 'Left', follow: [{ card: 'missing', in: 1 }] },
          right: { text: 'Right' },
        },
      ]),
    );
    const issues = validateContent(content);
    const msgs = issues.map((i) => i.message).join('\n');
    expect(msgs).toMatch(/unknown card "missing"/);
    expect(msgs).toMatch(/never:set/);
    expect(msgs).toMatch(/forbidden real-world/);
  });
  it('validator flags unknown template variables but accepts known ones', () => {
    const { content } = compileContent(
      minimalRaw([
        {
          id: 'a_01',
          advisor: 'aide',
          text: '{Rival} has answered {us} through {rival_capital}; {Rival_leader} is annoyed at {enemy}.',
          left: { text: 'Left' },
          right: { text: 'Right' },
        },
      ]),
    );
    const msgs = validateContent(content).map((i) => i.message).join('\n');
    expect(msgs).toMatch(/unknown template variable \{enemy\}/);
    expect(msgs).not.toMatch(/\{Rival\}|\{us\}|\{rival_capital\}|\{Rival_leader\}/);
  });
});

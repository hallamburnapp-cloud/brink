import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadThirtyContent, loadThirtyRaw } from './load';
import { REGION_IDS } from './regions';

const PACK = join(process.cwd(), 'content-thirty');

describe('the shipped pack', () => {
  const { content, issues } = loadThirtyContent(PACK);

  it('loads with no errors', () => {
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('has the six advisers and the twelve pieces of the spec', () => {
    expect(content.adviserOrder).toEqual(['foreign', 'general', 'intel', 'admiral', 'chief', 'ambassador']);
    expect(content.pieceOrder).toHaveLength(12);
    expect(content.pieces['old-ambassador'].rule).toBe('Every calming choice cools one step more.');
    expect(content.pieces['peace-movement'].tags).toEqual(['CALM', 'FORCE']);
    expect(content.pieces['cautious-intel'].excludes).toEqual(['paranoid-intel']);
  });

  it('has the spec example cards and every card names a known region and adviser', () => {
    expect(content.cards['strait-01'].arc).toBe('blockade');
    expect(content.cards['alarm-02'].map).toBe(false);
    expect(content.cards['fleet-map'].map).toBe(true);
    expect(Object.keys(content.arcs).length).toBeGreaterThanOrEqual(10);
    for (const id of content.cardOrder) {
      const c = content.cards[id];
      expect(content.advisers[c.adviser]).toBeDefined();
      if (c.region) expect(REGION_IDS).toContain(c.region);
    }
  });

  it('chains the blockade through follow-ups', () => {
    expect(content.cards['strait-01'].chained).toBe(false);
    expect(content.cards['strait-02'].chained).toBe(true);
    expect(content.cards['strait-03'].chained).toBe(true);
  });
});

describe('loadThirtyRaw', () => {
  const dir = mkdtempSync(join(tmpdir(), 'thirty-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('reports missing files and YAML parse errors by file', () => {
    writeFileSync(join(dir, 'advisers.yaml'), '- id: foreign\n  name: [unclosed\n');
    const { raw, issues } = loadThirtyRaw(dir);
    expect(raw.cards.map((f) => f.file)).toEqual(['regions.yaml', 'domestic.yaml', 'map.yaml']);
    expect(issues.find((i) => i.where === 'advisers.yaml')?.message).toMatch(/YAML parse error/);
    expect(issues.find((i) => i.where === 'pieces.yaml')?.message).toBe('file is missing');
    const { issues: all } = loadThirtyContent(dir);
    expect(all.filter((i) => i.level === 'error').length).toBeGreaterThanOrEqual(2);
  });
});

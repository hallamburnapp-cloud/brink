import { Fragment, type VNode } from 'preact';
import { describe, expect, it } from 'vitest';
import { STAFF_IDS } from '../../content/staff';
import { drawCoin } from './coin';
import { GLYPH_NAMES, drawGlyph } from './glyphs';
import { HI, INK, LAMP_LIGHT, MAT, THREAD } from './kit';
import { STAFF_DRAWINGS } from './staff';

interface Element {
  tag: string;
  props: Record<string, unknown>;
}

/** Flattens a drawing into its SVG elements. Drawings may only use intrinsic elements and fragments. */
function elements(node: unknown, out: Element[] = []): Element[] {
  if (node == null || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') return out;
  if (Array.isArray(node)) {
    for (const child of node) elements(child, out);
    return out;
  }
  const v = node as VNode<Record<string, unknown>>;
  if (v.type === Fragment) return elements(v.props.children, out);
  if (typeof v.type !== 'string') throw new Error('drawings must use intrinsic SVG elements only');
  out.push({ tag: v.type, props: v.props });
  return elements(v.props.children, out);
}

/** Ids a drawing defines, and the ids it references through url(#...). */
function idUse(els: Element[]): { defined: string[]; referenced: string[] } {
  const defined = els.map((e) => e.props.id).filter((id): id is string => typeof id === 'string');
  const referenced: string[] = [];
  for (const e of els) {
    for (const value of Object.values(e.props)) {
      const m = typeof value === 'string' ? value.match(/url\(#([^)]+)\)/) : null;
      if (m) referenced.push(m[1]);
    }
  }
  return { defined, referenced };
}

const ALL: Array<[string, (uid: string) => unknown]> = [
  ...STAFF_IDS.map((id) => [`staff ${id}`, STAFF_DRAWINGS[id]] as [string, (uid: string) => unknown]),
  ['coin', drawCoin],
  ...GLYPH_NAMES.map((n) => [`glyph ${n}`, () => drawGlyph(n)] as [string, (uid: string) => unknown]),
];

describe('icon coverage', () => {
  it('draws every staff id and nothing else', () => {
    expect(STAFF_IDS).toHaveLength(10);
    expect(Object.keys(STAFF_DRAWINGS).sort()).toEqual([...STAFF_IDS].sort());
  });
});

describe.each(ALL)('%s', (_name, draw) => {
  const els = elements(draw('uidA'));

  it('has no text inside the icon', () => {
    expect(els.some((e) => e.tag === 'text' || e.tag === 'tspan')).toBe(false);
  });

  it('scopes every id to the instance and resolves every reference', () => {
    const { defined, referenced } = idUse(els);
    for (const id of defined) expect(id.startsWith('uidA-')).toBe(true);
    for (const ref of referenced) expect(defined).toContain(ref);
    expect(new Set(defined).size).toBe(defined.length);
  });

  it('gives a second instance different ids', () => {
    const a = idUse(els).defined;
    const b = idUse(elements(draw('uidB'))).defined;
    for (const id of a) expect(b).not.toContain(id);
  });
});

describe('palette discipline (STYLE.md section 6)', () => {
  /** The light from the lamp and the map's printed water are the only extras. */
  const EXTRAS = ['#FFD27A', '#FFE2A3', '#FFF8E6', '#9FD3FF'];
  const allowed = new Set(
    [...Object.values(MAT).flat(), INK, HI, LAMP_LIGHT, THREAD, ...EXTRAS].map((c) => c.toUpperCase()),
  );

  it.each(STAFF_IDS)('%s uses only the icon palette', (id) => {
    const els = elements(STAFF_DRAWINGS[id]('u'));
    for (const e of els) {
      for (const key of ['fill', 'stroke', 'stop-color']) {
        const c = e.props[key];
        if (typeof c !== 'string' || c === 'none' || c.startsWith('url(')) continue;
        expect(allowed.has(c.toUpperCase()), `${id} ${e.tag} ${key}=${c}`).toBe(true);
      }
    }
  });

  it.each(STAFF_IDS)('%s keeps the 2.25 unit ink outline', (id) => {
    const els = elements(STAFF_DRAWINGS[id]('u'));
    const outlined = els.filter((e) => e.props.stroke === INK && Number(e.props['stroke-width']) === 2.25);
    expect(outlined.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { getIcon, getPortrait, iconIds, icons, portraitIds, portraits, type ArtEntry } from './manifest';

const REQUIRED_PORTRAITS = [
  'aide', 'hawk_general', 'dove_fm', 'intel_director', 'spin_doctor', 'ambassador', 'cyber_director', 'treasury',
  'admiral', 'peace_leader', 'contractor', 'fixer', 'hotline', 'watch_officer', 'press', 'ally_leader', 'rival_leader',
  'other_leader', 'opposition', 'family', 'scientist', 'envoy', 'legal',
];

const REQUIRED_ICONS = [
  'hawk_general', 'dove_fm', 'intel_director', 'spin_doctor', 'ambassador', 'cyber_director', 'treasury', 'admiral',
  'peace_leader', 'contractor', 'fixer',
  'doctrine_low', 'doctrine_denial', 'doctrine_ambiguity', 'doctrine_nfu', 'doctrine_e2d', 'doctrine_alliance',
  'doctrine_fortress', 'doctrine_transparency', 'doctrine_red_lines', 'doctrine_hotline', 'doctrine_predelegation',
  'doctrine_minimal',
  'asset_ew', 'asset_back_channel', 'asset_cyber', 'asset_md', 'asset_fleet', 'asset_nc3', 'asset_comsat',
  'asset_basing', 'asset_reserve', 'asset_rrb', 'asset_sigint', 'asset_civil',
  'generic',
];

const ALLOWED_TAGS = new Set(['g', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon']);

/**
 * Minimal, DOM-free well-formedness check for an SVG fragment: every tag is one we
 * expect, every non-self-closing tag is closed in order, quotes are balanced, and
 * there is no stray text or broken number.
 */
function checkWellFormed(body: string): void {
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  expect(wrapped.split('<').length).toBe(wrapped.split('>').length);
  expect(wrapped.split('"').length % 2).toBe(1); // even number of quotes
  expect(body).not.toMatch(/NaN|undefined|null|Infinity/);
  expect(body).not.toMatch(/\$\{/); // no unexpanded template placeholders

  const stack: string[] = [];
  const tagRe = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"<>]*")*)\s*(\/?)>/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(body)) !== null) {
    expect(body.slice(lastIndex, m.index).trim(), 'stray text between tags').toBe('');
    lastIndex = tagRe.lastIndex;
    const [, closing, name, , selfClosing] = m;
    expect(ALLOWED_TAGS.has(name), `unexpected tag <${name}>`).toBe(true);
    if (closing) {
      expect(stack.pop(), `closing </${name}> without an opener`).toBe(name);
    } else if (!selfClosing) {
      stack.push(name);
    }
  }
  expect(body.slice(lastIndex).trim(), 'stray trailing text').toBe('');
  expect(stack, 'unclosed tags').toEqual([]);
}

function svgBody(entry: ArtEntry): string {
  expect(entry.kind).toBe('svg');
  return entry.kind === 'svg' ? entry.body : '';
}

describe('portraits', () => {
  it('has every required id', () => {
    for (const id of REQUIRED_PORTRAITS) expect(portraits[id], `portrait ${id}`).toBeDefined();
    expect(portraitIds).toEqual(expect.arrayContaining(REQUIRED_PORTRAITS));
  });

  it.each(Object.keys(portraits))('%s is a well-formed SVG fragment', (id) => {
    const body = svgBody(portraits[id]);
    checkWellFormed(body);
    // Uses the shared colour conventions so the accent and theme variables take effect.
    expect(body).toContain('currentColor');
    expect(body).toContain('var(--art-ink');
    expect(body).toContain('var(--art-paper');
    // Roughly the intended shape budget once the shared dossier frame is counted.
    const shapes = (body.match(/<(path|circle|rect|ellipse)\b/g) ?? []).length;
    expect(shapes).toBeGreaterThanOrEqual(8);
    expect(shapes).toBeLessThanOrEqual(30);
  });

  it('are all visually distinct', () => {
    const bodies = Object.values(portraits).map(svgBody);
    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it('falls back to the aide for unknown ids', () => {
    expect(getPortrait('nobody')).toBe(portraits.aide);
    expect(getPortrait('hotline')).toBe(portraits.hotline);
  });
});

describe('icons', () => {
  it('has every required id', () => {
    for (const id of REQUIRED_ICONS) expect(icons[id], `icon ${id}`).toBeDefined();
    expect(iconIds).toEqual(expect.arrayContaining(REQUIRED_ICONS));
  });

  it.each(Object.keys(icons))('%s is a well-formed monoline SVG fragment', (id) => {
    const body = svgBody(icons[id]);
    checkWellFormed(body);
    expect(body).toMatch(/^<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">/);
    // The only fills allowed are the small dots.
    const fills = body.match(/<(\w+)[^>]*\sfill="currentColor"/g) ?? [];
    for (const f of fills) expect(f.startsWith('<circle')).toBe(true);
  });

  it('are all visually distinct', () => {
    const bodies = Object.values(icons).map(svgBody);
    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it('falls back to the generic glyph for unknown ids', () => {
    expect(getIcon('nothing')).toBe(icons.generic);
    expect(getIcon('asset_fleet')).toBe(icons.asset_fleet);
  });
});

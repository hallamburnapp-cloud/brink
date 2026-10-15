import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { INTRO_COPY, RULES_COPY } from './copy';

const spec = readFileSync(new URL('../../../../docs/war/v2/SPEC.md', import.meta.url), 'utf8');
/** The spec's quoted lines ('> ...'). */
const quoted = spec
  .split('\n')
  .filter((l) => l.startsWith('> '))
  .map((l) => l.slice(2).trim());

describe('the teaching copy', () => {
  it('is the spec\'s How to play, word for word, in order', () => {
    const at = quoted.indexOf(RULES_COPY[0]);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(quoted.slice(at, at + RULES_COPY.length)).toEqual([...RULES_COPY]);
    expect(RULES_COPY.join(' ').split(/\s+/)).toHaveLength(120);
  });

  it('is the spec\'s three intro screens, word for word', () => {
    for (const text of Object.values(INTRO_COPY)) expect(quoted).toContain(text);
    expect(Object.values(INTRO_COPY).map((t) => t.split(/\s+/).length)).toEqual([23, 25, 22]);
  });
});

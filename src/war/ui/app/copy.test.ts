import { describe, expect, it } from 'vitest';
import { WAR_META } from '../../meta';
import { INTRO_COPY, MARKS_COPY, RULES_COPY } from './copy';

/**
 * The coach strip is 362 pt wide at 16 pt Barlow Condensed (about 6.9 pt a glyph after its tacks
 * and padding): 72 characters set in two lines with room to spare. The browser check measures it.
 */
const STRIP_CHARS = 72;

describe('the teaching copy', () => {
  it('sets every intro beat in at most two lines of the coach strip', () => {
    for (const beats of Object.values(INTRO_COPY)) {
      expect(beats.length).toBeGreaterThanOrEqual(2);
      for (const b of beats) expect(b.length, b).toBeLessThanOrEqual(STRIP_CHARS);
    }
  });

  it('says the goal first, the same way everywhere', () => {
    const goal = 'before war holds 10';
    expect(INTRO_COPY[1][0]).toContain(goal);
    expect(RULES_COPY[0]).toContain(goal);
    expect(WAR_META.tagline).toContain(goal);
  });

  it('teaches the touch rule, the crisis x2, a miss, war spreading, staff and the pins-first win order', () => {
    const all = [...INTRO_COPY[2], ...INTRO_COPY[3]].join(' ');
    for (const words of ['touch each other', 'doubles it', 'Miss: war takes', 'into the red tag', 'Staff boost', 'Beat it by more: your pins too']) {
      expect(all).toContain(words);
    }
    expect(RULES_COPY.join(' ')).toContain('your pins first');
  });

  it('keeps How to play short, and says what the marks mean', () => {
    expect(RULES_COPY.join(' ').split(/\s+/).length).toBeLessThanOrEqual(140);
    expect(MARKS_COPY).toMatch(/★ capital · ⚓ port/);
  });
});

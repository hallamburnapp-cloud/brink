import { afterEach, describe, expect, it, vi } from 'vitest';
import { BRAND } from '../config';
import { emojiStrip, renderShareCard, share, shareFilename, shareText, summariseMoment, type ShareCardData } from './share';

const snap = (p: number, m: number, a: number, e: number, esc: number): number[] => [p, m, a, e, esc];

/** Ten snapshots, one per column, so the sampled strip is easy to read. */
const TRAIL: number[][] = [
  snap(70, 50, 80, 30, 20),
  snap(72, 55, 82, 34, 24),
  snap(60, 58, 84, 40, 30),
  snap(55, 62, 70, 48, 44),
  snap(38, 66, 60, 52, 52),
  snap(45, 70, 62, 58, 61),
  snap(64, 74, 66, 64, 70),
  snap(68, 78, 70, 68, 82),
  snap(75, 80, 74, 76, 90),
  snap(80, 84, 78, 84, 100),
];

const base: ShareCardData = {
  brand: BRAND.name,
  url: 'https://brink.example',
  seatName: 'The Republic',
  seatAccent: '#3b82f6',
  days: 31,
  endingName: 'The Communiqué',
  endingEmoji: '🕊️',
  endingKind: 'standdown',
  momentLabel: 'The moment it held',
  moment: 'The private session',
  trail: TRAIL,
  seed: 'ABC-123',
  mode: 'daily',
  dailyNumber: 12,
  streak: 3,
  pieces: ['General Oren Vasska', 'Hotline Protocol'],
};

const cells = (row: string): string[] => Array.from(row);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('emojiStrip', () => {
  it('returns five rows of ⬛ for an empty trail', () => {
    const rows = emojiStrip([]);
    expect(rows).toHaveLength(5);
    for (const row of rows) expect(row).toBe('⬛'.repeat(10));
  });

  it('produces exactly `columns` cells per row (default 10)', () => {
    for (const row of emojiStrip(TRAIL)) expect(cells(row)).toHaveLength(10);
    for (const row of emojiStrip(TRAIL, 6)) expect(cells(row)).toHaveLength(6);
    for (const row of emojiStrip(TRAIL, 1)) expect(cells(row)).toHaveLength(1);
  });

  it('bands office meters low→high as 🟥🟧🟨🟩🟦 (inclusive upper bounds)', () => {
    const trail = [0, 20, 21, 40, 41, 60, 61, 80, 81, 100].map((v) => snap(v, v, v, v, 50));
    const [pub, mil, allies, econ] = emojiStrip(trail);
    const expected = '🟥🟥🟧🟧🟨🟨🟩🟩🟦🟦';
    expect(pub).toBe(expected);
    expect(mil).toBe(expected);
    expect(allies).toBe(expected);
    expect(econ).toBe(expected);
  });

  it('inverts the bands for escalation, where low is good', () => {
    const trail = [0, 20, 21, 40, 41, 60, 61, 80, 81, 100].map((v) => snap(50, 50, 50, 50, v));
    expect(emojiStrip(trail)[4]).toBe('🟦🟦🟩🟩🟨🟨🟧🟧🟥🟥');
  });

  it('clamps out-of-range values instead of dropping them', () => {
    const rows = emojiStrip([snap(-10, 150, 50, 50, 250)], 1);
    expect(rows[0]).toBe('🟥');
    expect(rows[1]).toBe('🟦');
    expect(rows[4]).toBe('🟥');
  });

  it('samples evenly across a long trail, keeping the first and last snapshots', () => {
    // Public rises 0 → 100 over 50 cards; escalation falls 100 → 0.
    const trail = Array.from({ length: 50 }, (_, i) => snap((i * 100) / 49, 50, 50, 50, 100 - (i * 100) / 49));
    const rows = emojiStrip(trail);
    const pub = cells(rows[0]);
    expect(pub[0]).toBe('🟥');
    expect(pub[9]).toBe('🟦');
    // Monotone climb: bands never go backwards.
    const order = ['🟥', '🟧', '🟨', '🟩', '🟦'];
    for (let i = 1; i < pub.length; i++) expect(order.indexOf(pub[i])).toBeGreaterThanOrEqual(order.indexOf(pub[i - 1]));
    const esc = cells(rows[4]);
    expect(esc[0]).toBe('🟥'); // escalation 100 is bad
    expect(esc[9]).toBe('🟦'); // escalation 0 is good
  });

  it('stretches a short trail across all columns', () => {
    const rows = emojiStrip([snap(10, 50, 90, 50, 10), snap(90, 50, 10, 50, 90)]);
    expect(rows[0]).toBe('🟥🟥🟥🟥🟥🟦🟦🟦🟦🟦');
    expect(rows[2]).toBe('🟦🟦🟦🟦🟦🟥🟥🟥🟥🟥');
    expect(rows[4]).toBe('🟦🟦🟦🟦🟦🟥🟥🟥🟥🟥');
    expect(emojiStrip([snap(50, 50, 50, 50, 50)])[0]).toBe('🟨'.repeat(10));
  });

  it('is an identity mapping when the trail length equals the column count', () => {
    const rows = emojiStrip(TRAIL);
    expect(rows[0]).toBe('🟩🟩🟨🟨🟧🟨🟩🟩🟩🟩');
    expect(rows[4]).toBe('🟦🟩🟩🟨🟨🟧🟧🟥🟥🟥');
  });

  it('renders ⬛ for a missing or non-finite cell', () => {
    const rows = emojiStrip([[50, 50], [50, NaN, 50, 50, 50]], 2);
    expect(rows[2]).toBe('⬛🟨');
    expect(rows[1]).toBe('🟨⬛');
  });
});

describe('shareText', () => {
  it('formats the daily variant with #number, streak, ending, moment, five rows and footer', () => {
    const lines = shareText(base).split('\n');
    expect(lines).toHaveLength(9);
    expect(lines[0]).toBe('BRINK #12 · The Republic · 31 days · 3-day streak');
    expect(lines[1]).toBe('🕊️ The Communiqué — Stand-Down');
    expect(lines[2]).toBe('The moment it held: The private session');
    expect(lines.slice(3, 8)).toEqual(emojiStrip(TRAIL));
    expect(lines[8]).toBe('Seed ABC-123 · https://brink.example');
  });

  it('uses the brand from the data (fed by config), never a hardcoded name', () => {
    expect(shareText(base).startsWith(`${BRAND.name} `)).toBe(true);
    expect(shareText({ ...base, brand: 'BRINK²' }).startsWith('BRINK² #12')).toBe(true);
  });

  it('formats the endless variant without a daily number or streak', () => {
    const lines = shareText({ ...base, mode: 'endless', dailyNumber: undefined, streak: 9, endingKind: 'nuclear', endingName: 'Midnight', endingEmoji: '☢️', momentLabel: 'The moment it went wrong', moment: 'The false alarm', days: 44 }).split('\n');
    expect(lines[0]).toBe('BRINK Endless · The Republic · 44 days');
    expect(lines[0]).not.toContain('#');
    expect(lines[0]).not.toContain('streak');
    expect(lines[1]).toBe('☢️ Midnight — Nuclear');
    expect(lines[2]).toBe('The moment it went wrong: The false alarm');
    expect(lines).toHaveLength(9);
  });

  it('labels challenge mode and daily without a number', () => {
    expect(shareText({ ...base, mode: 'challenge' }).split('\n')[0]).toBe('BRINK Challenge · The Republic · 31 days');
    expect(shareText({ ...base, dailyNumber: undefined, streak: undefined }).split('\n')[0]).toBe('BRINK Daily · The Republic · 31 days');
  });

  it('omits the streak when it is 1 or lower and the moment line when moment is null', () => {
    const lines = shareText({ ...base, streak: 1, moment: null }).split('\n');
    expect(lines[0]).toBe('BRINK #12 · The Republic · 31 days');
    expect(lines).toHaveLength(8);
    expect(lines[2]).toBe(emojiStrip(TRAIL)[0]);
  });

  it('pluralises days correctly', () => {
    expect(shareText({ ...base, days: 1 }).split('\n')[0]).toContain('· 1 day ·');
    expect(shareText({ ...base, days: 0 }).split('\n')[0]).toContain('· 0 days ·');
  });

  it('maps every ending kind to a label', () => {
    const kinds: ShareCardData['endingKind'][] = ['nuclear', 'removed', 'standdown', 'survival', 'special'];
    const labels = kinds.map((k) => shareText({ ...base, endingKind: k }).split('\n')[1].split(' — ')[1]);
    expect(labels).toEqual(['Nuclear', 'Removed', 'Stand-Down', 'Survived', 'Special']);
  });

  it('shows ⬛ rows for a run with no trail', () => {
    const lines = shareText({ ...base, trail: [] }).split('\n');
    expect(lines.slice(3, 8).every((l) => l === '⬛'.repeat(10))).toBe(true);
  });
});

describe('summariseMoment', () => {
  it('returns short single sentences untouched', () => {
    expect(summariseMoment('The private session.')).toBe('The private session.');
    expect(summariseMoment('The private session')).toBe('The private session');
  });

  it('keeps only the first sentence', () => {
    expect(summariseMoment('The general calls. He wants an answer now. You have ninety seconds.')).toBe('The general calls.');
    expect(summariseMoment('Is that a launch? Nobody can say.')).toBe('Is that a launch?');
    expect(summariseMoment('"Sir, they\'ve launched." The room goes quiet.')).toBe('"Sir, they\'ve launched."');
  });

  it('does not split on common abbreviations or initialisms', () => {
    expect(summariseMoment('At 3 a.m. the phone rings. You answer.')).toBe('At 3 a.m. the phone rings.');
    expect(summariseMoment('Gen. Vasska wants the codes. You hesitate.')).toBe('Gen. Vasska wants the codes.');
    expect(summariseMoment('The U.S. envoy walks out. Silence.')).toBe('The U.S. envoy walks out.');
  });

  it('collapses whitespace and line breaks from YAML text', () => {
    expect(summariseMoment('  The   line\n  goes dead.\n\nThen a voice.  ')).toBe('The line goes dead.');
  });

  it('ellipsises long sentences to at most 90 chars with a single …', () => {
    const long = 'The intercept shows twelve bombers crossing the northern line while your allies refuse every call you place to them and the markets open in an hour.';
    const out = summariseMoment(long);
    expect(out.length).toBeLessThanOrEqual(90);
    expect(out.endsWith('…')).toBe(true);
    expect(out.match(/…/g)).toHaveLength(1);
    expect(out).not.toMatch(/[\s,;:.]…$/);
    // Cuts at a word boundary, so the text before the ellipsis is a prefix of the source.
    expect(long.startsWith(out.slice(0, -1))).toBe(true);
  });

  it('normalises "..." and never produces a double ellipsis', () => {
    expect(summariseMoment('The line goes dead...')).toBe('The line goes dead…');
    const out = summariseMoment(`${'Wait'.repeat(40)}...`);
    expect(out.length).toBeLessThanOrEqual(90);
    expect(out.match(/…/g)).toHaveLength(1);
  });

  it('handles empty and non-string input', () => {
    expect(summariseMoment('')).toBe('');
    expect(summariseMoment('   \n ')).toBe('');
    expect(summariseMoment(undefined as unknown as string)).toBe('');
  });

  it('returns exactly 90 chars when the sentence is exactly 90 chars', () => {
    const exact = `${'a'.repeat(89)}.`;
    expect(exact).toHaveLength(90);
    expect(summariseMoment(exact)).toBe(exact);
  });
});

describe('shareFilename', () => {
  it('builds brink-<mode>-<seed>.png with a filename-safe seed', () => {
    expect(shareFilename(base)).toBe('brink-daily-ABC-123.png');
    expect(shareFilename({ ...base, mode: 'endless', seed: 'a b/c?' })).toBe('brink-endless-a-b-c.png');
  });
});

describe('renderShareCard', () => {
  it('rejects cleanly when there is no document', async () => {
    expect(typeof document).toBe('undefined');
    await expect(renderShareCard(base)).rejects.toThrow(/document/i);
  });

  it('rejects cleanly when the canvas has no 2D context', async () => {
    vi.stubGlobal('document', {
      createElement: () => ({ getContext: () => null, width: 0, height: 0 }),
    });
    await expect(renderShareCard(base)).rejects.toThrow(/2D canvas/i);
  });
});

describe('share', () => {
  it('returns failed without throwing when no sharing surface exists', async () => {
    vi.stubGlobal('navigator', undefined);
    await expect(share(base)).resolves.toBe('failed');
    await expect(share(base, new Blob(['png'], { type: 'image/png' }))).resolves.toBe('failed');
  });

  it('shares text through navigator.share when available', async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share: shareFn });
    await expect(share(base)).resolves.toBe('shared');
    expect(shareFn).toHaveBeenCalledTimes(1);
    const payload = shareFn.mock.calls[0][0] as { text: string; files?: unknown };
    expect(payload.text).toBe(shareText(base));
    expect(payload.files).toBeUndefined();
  });

  it('attaches the PNG as a file when canShare allows it', async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share: shareFn, canShare: () => true });
    const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    await expect(share(base, blob)).resolves.toBe('shared');
    const payload = shareFn.mock.calls[0][0] as { files: File[]; text: string };
    expect(payload.files).toHaveLength(1);
    expect(payload.files[0].name).toBe('brink-daily-ABC-123.png');
    expect(payload.files[0].type).toBe('image/png');
    expect(payload.text).toBe(shareText(base));
  });

  it('falls back to text share when files are not shareable', async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share: shareFn, canShare: () => false });
    await expect(share(base, new Blob(['x'], { type: 'image/png' }))).resolves.toBe('shared');
    expect(shareFn).toHaveBeenCalledTimes(1);
    expect((shareFn.mock.calls[0][0] as { files?: unknown }).files).toBeUndefined();
  });

  it('copies to the clipboard when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(share(base)).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith(shareText(base));
  });

  it('falls through to the clipboard when share throws a non-abort error', async () => {
    const shareFn = vi.fn().mockRejectedValue(new TypeError('not supported'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share: shareFn, clipboard: { writeText } });
    await expect(share(base)).resolves.toBe('copied');
  });

  it('respects a cancelled share sheet: reports failed and does not fall through', async () => {
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    const shareFn = vi.fn().mockRejectedValue(abort);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share: shareFn, clipboard: { writeText } });
    await expect(share(base)).resolves.toBe('failed');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('reports failed rather than throwing when the clipboard rejects and there is no blob', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    await expect(share(base)).resolves.toBe('failed');
  });
});

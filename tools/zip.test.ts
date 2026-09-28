import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, dosDateTime, SIG_CENTRAL, SIG_EOCD, SIG_LOCAL, zipDirectory } from './zip';

describe('crc32', () => {
  it('matches the reference vectors', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
    expect(crc32(Buffer.from('123456789', 'ascii'))).toBe(0xcbf43926);
    expect(crc32(Buffer.from('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339);
  });
  it('can be continued with a seed', () => {
    const whole = Buffer.from('123456789');
    const part = crc32(whole.subarray(0, 4));
    expect(crc32(whole.subarray(4), part)).toBe(crc32(whole));
  });
});

describe('dosDateTime', () => {
  it('encodes 2-second resolution and a 1980 epoch', () => {
    const { time, date } = dosDateTime(new Date(2026, 8, 28, 3, 0, 7));
    expect(time).toBe((3 << 11) | (0 << 5) | 3);
    expect(date).toBe(((2026 - 1980) << 9) | (9 << 5) | 28);
  });
});

describe('zipDirectory', () => {
  async function withTemp<T>(fn: (dir: string) => Promise<T>): Promise<T> {
    const dir = await mkdtemp(join(tmpdir(), 'brink-zip-'));
    try {
      return await fn(dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  it('writes a valid store-method archive with local, central and EOCD records', async () => {
    await withTemp(async (dir) => {
      const src = join(dir, 'site');
      await mkdir(join(src, 'assets'), { recursive: true });
      const html = '<!doctype html><title>BRINK</title>';
      const js = 'console.log("héllo — ünïcode")';
      await writeFile(join(src, 'index.html'), html);
      await writeFile(join(src, 'assets', 'app-ünï.js'), js);
      await writeFile(join(src, 'empty.txt'), '');

      const out = join(dir, 'out', 'brink.zip');
      const count = await zipDirectory(src, out, { mtime: new Date(2026, 8, 28, 3, 0, 0) });
      expect(count).toBe(3);

      const zip = await readFile(out);

      // Local file header at the very start.
      expect(zip.readUInt32LE(0)).toBe(SIG_LOCAL);
      expect(zip.readUInt16LE(8)).toBe(0); // store
      expect(zip.readUInt16LE(6) & 0x0800).toBe(0x0800); // UTF-8 names

      // End of central directory: last 22 bytes (no comment).
      const eocd = zip.length - 22;
      expect(zip.readUInt32LE(eocd)).toBe(SIG_EOCD);
      expect(zip.readUInt16LE(eocd + 8)).toBe(3);
      expect(zip.readUInt16LE(eocd + 10)).toBe(3);
      const cdSize = zip.readUInt32LE(eocd + 12);
      const cdOffset = zip.readUInt32LE(eocd + 16);
      expect(cdOffset + cdSize).toBe(eocd);

      // Walk the central directory and cross-check every entry against its local header.
      let p = cdOffset;
      const names: string[] = [];
      for (let i = 0; i < 3; i++) {
        expect(zip.readUInt32LE(p)).toBe(SIG_CENTRAL);
        const crc = zip.readUInt32LE(p + 16);
        const size = zip.readUInt32LE(p + 24);
        const nameLen = zip.readUInt16LE(p + 28);
        const extraLen = zip.readUInt16LE(p + 30);
        const commentLen = zip.readUInt16LE(p + 32);
        const localOff = zip.readUInt32LE(p + 42);
        const name = zip.subarray(p + 46, p + 46 + nameLen).toString('utf8');
        names.push(name);

        expect(zip.readUInt32LE(localOff)).toBe(SIG_LOCAL);
        expect(zip.readUInt32LE(localOff + 14)).toBe(crc);
        const localNameLen = zip.readUInt16LE(localOff + 26);
        const localExtra = zip.readUInt16LE(localOff + 28);
        expect(zip.subarray(localOff + 30, localOff + 30 + localNameLen).toString('utf8')).toBe(name);
        const dataStart = localOff + 30 + localNameLen + localExtra;
        const data = zip.subarray(dataStart, dataStart + size);
        expect(crc32(data)).toBe(crc);

        p += 46 + nameLen + extraLen + commentLen;
      }
      expect(p).toBe(eocd);
      expect(names.sort()).toEqual(['assets/app-ünï.js', 'empty.txt', 'index.html']);

      // Payload round-trips byte for byte.
      const idx = names.indexOf('index.html');
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(zip.includes(Buffer.from(html))).toBe(true);
      expect(zip.includes(Buffer.from(js))).toBe(true);
    });
  });

  it('never includes the output file when it lives inside the zipped directory', async () => {
    await withTemp(async (dir) => {
      await writeFile(join(dir, 'a.txt'), 'a');
      const out = join(dir, 'self.zip');
      await writeFile(out, 'stale');
      const count = await zipDirectory(dir, out);
      expect(count).toBe(1);
      const zip = await readFile(out);
      expect(zip.includes(Buffer.from('self.zip'))).toBe(false);
    });
  });

  it('rejects a path that is not a directory', async () => {
    await withTemp(async (dir) => {
      const f = join(dir, 'file.txt');
      await writeFile(f, 'x');
      await expect(zipDirectory(f, join(dir, 'out.zip'))).rejects.toThrow(/not a directory/);
    });
  });
});

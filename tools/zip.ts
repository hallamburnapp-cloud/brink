/**
 * Minimal, dependency-free ZIP writer (store method, no compression).
 *
 * Writes local file headers, a central directory and the end-of-central-directory
 * record with correct CRC-32s and UTF-8 file names (general purpose bit 11).
 * Good enough for itch.io uploads and release archives; not Zip64 (per-file and
 * total sizes must stay under 4 GiB, which a web build always will).
 *
 * CLI: npx tsx tools/zip.ts <dir> <out.zip>
 */
import { createWriteStream, promises as fs } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ CRC-32 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** Standard CRC-32 (IEEE 802.3, as used by ZIP and PNG). Pass `seed` to continue a running CRC. */
export function crc32(data: Uint8Array, seed = 0): number {
  let c = (seed ^ 0xffffffff) >>> 0;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ ZIP */

export const SIG_LOCAL = 0x04034b50;
export const SIG_CENTRAL = 0x02014b50;
export const SIG_EOCD = 0x06054b50;

const MAX_U32 = 0xffffffff;
const MAX_U16 = 0xffff;

/** MS-DOS time/date pair (2-second resolution, 1980 epoch) for a Date. */
export function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.min(Math.max(d.getFullYear(), 1980), 2107);
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

interface Entry {
  name: Uint8Array; // UTF-8
  crc: number;
  size: number;
  time: number;
  date: number;
  offset: number;
  mode: number; // unix permission bits
}

export interface ZipOptions {
  /** Absolute or dir-relative paths to leave out (the output file inside `dir` is always skipped). */
  exclude?: string[];
  /** Fixed timestamp for reproducible archives (defaults to each file's mtime). */
  mtime?: Date;
}

async function walk(root: string, dir: string, out: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(root, p, out);
    else if (e.isFile()) out.push(p);
  }
}

function le16(buf: Buffer, off: number, v: number) {
  buf.writeUInt16LE(v & MAX_U16, off);
}
function le32(buf: Buffer, off: number, v: number) {
  buf.writeUInt32LE(v >>> 0, off);
}

function localHeader(e: Entry): Buffer {
  const b = Buffer.alloc(30 + e.name.length);
  le32(b, 0, SIG_LOCAL);
  le16(b, 4, 20); // version needed to extract (2.0)
  le16(b, 6, 0x0800); // flags: UTF-8 names
  le16(b, 8, 0); // method: store
  le16(b, 10, e.time);
  le16(b, 12, e.date);
  le32(b, 14, e.crc);
  le32(b, 18, e.size); // compressed size (== uncompressed for store)
  le32(b, 22, e.size);
  le16(b, 26, e.name.length);
  le16(b, 28, 0); // extra length
  b.set(e.name, 30);
  return b;
}

function centralHeader(e: Entry): Buffer {
  const b = Buffer.alloc(46 + e.name.length);
  le32(b, 0, SIG_CENTRAL);
  le16(b, 4, 0x031e); // version made by: Unix (3), spec 3.0
  le16(b, 6, 20); // version needed
  le16(b, 8, 0x0800); // flags: UTF-8 names
  le16(b, 10, 0); // method: store
  le16(b, 12, e.time);
  le16(b, 14, e.date);
  le32(b, 16, e.crc);
  le32(b, 20, e.size);
  le32(b, 24, e.size);
  le16(b, 28, e.name.length);
  le16(b, 30, 0); // extra length
  le16(b, 32, 0); // comment length
  le16(b, 34, 0); // disk number start
  le16(b, 36, 0); // internal attributes
  le32(b, 38, ((e.mode & 0xffff) << 16) >>> 0); // external attributes: unix mode in high word
  le32(b, 42, e.offset);
  b.set(e.name, 46);
  return b;
}

function eocd(count: number, cdSize: number, cdOffset: number): Buffer {
  const b = Buffer.alloc(22);
  le32(b, 0, SIG_EOCD);
  le16(b, 4, 0); // this disk
  le16(b, 6, 0); // disk with central directory
  le16(b, 8, count);
  le16(b, 10, count);
  le32(b, 12, cdSize);
  le32(b, 16, cdOffset);
  le16(b, 20, 0); // comment length
  return b;
}

/**
 * Zips every file under `dir` (recursively, paths relative to `dir`, forward slashes)
 * into `outFile`. Resolves to the number of files written.
 */
export async function zipDirectory(dir: string, outFile: string, opts: ZipOptions = {}): Promise<number> {
  const root = resolve(dir);
  const out = resolve(outFile);
  const st = await fs.stat(root).catch(() => null);
  if (!st || !st.isDirectory()) throw new Error(`zipDirectory: not a directory: ${root}`);

  const excluded = new Set<string>([out, ...(opts.exclude ?? []).map((p) => resolve(root, p))]);
  const files: string[] = [];
  await walk(root, root, files);

  await fs.mkdir(resolve(out, '..'), { recursive: true });
  const stream = createWriteStream(out);
  const write = (chunk: Buffer) =>
    new Promise<void>((ok, fail) => {
      stream.write(chunk, (err) => (err ? fail(err) : ok()));
    });

  const entries: Entry[] = [];
  let offset = 0;
  let count = 0;
  const fixed = opts.mtime ? dosDateTime(opts.mtime) : null;

  try {
    for (const file of files) {
      if (excluded.has(file)) continue;
      const rel = relative(root, file).split(sep).join('/');
      const name = Buffer.from(rel, 'utf8');
      if (name.length > MAX_U16) throw new Error(`zipDirectory: file name too long: ${rel}`);
      const data = await fs.readFile(file);
      if (data.length > MAX_U32) throw new Error(`zipDirectory: file too large for a non-Zip64 archive: ${rel}`);
      const info = await fs.stat(file);
      const { time, date } = fixed ?? dosDateTime(info.mtime);
      const e: Entry = { name, crc: crc32(data), size: data.length, time, date, offset, mode: info.mode & 0o777 || 0o644 };
      const header = localHeader(e);
      await write(header);
      await write(data);
      offset += header.length + data.length;
      if (offset > MAX_U32) throw new Error('zipDirectory: archive exceeds 4 GiB (Zip64 not supported)');
      entries.push(e);
      count++;
    }
    if (count > MAX_U16) throw new Error('zipDirectory: more than 65535 entries (Zip64 not supported)');

    const cdOffset = offset;
    let cdSize = 0;
    for (const e of entries) {
      const h = centralHeader(e);
      await write(h);
      cdSize += h.length;
    }
    await write(eocd(count, cdSize, cdOffset));
  } finally {
    await new Promise<void>((ok, fail) => stream.end((err?: Error | null) => (err ? fail(err) : ok())));
  }
  return count;
}

/* ------------------------------------------------------------------ CLI */

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [dir, outFile] = process.argv.slice(2);
  if (!dir || !outFile) {
    console.error('usage: tsx tools/zip.ts <dir> <out.zip>');
    process.exit(2);
  }
  zipDirectory(dir, outFile)
    .then(async (n) => {
      const { size } = await fs.stat(outFile);
      console.log(`${outFile}: ${n} files, ${(size / 1024).toFixed(1)} KB`);
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    });
}

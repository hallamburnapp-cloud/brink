/**
 * Flying numbers (STYLE 5.13, 7). Every number first pops where it was made (the '+w' rising out of
 * its pin, a staff number just under its seat), big enough to read, then flies to the top edge of
 * its box and fades as it arrives, so it never covers the digits it is about to change. Staff
 * flings carry a tapering trail and sparks; a multiplier flies bigger, in amber with a hot rim.
 * Drawn on one canvas over the whole frame; the loop runs only while something is in flight.
 */

export type Tone = 'inf' | 'mom' | 'lev';

export interface Flight {
  text: string;
  tone: Tone;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Start time (performance.now()). */
  start: number;
  /** The pop at the source, ms (part of `ms`). */
  pop: number;
  /** How far the number rises during the pop, pt. */
  rise: number;
  /** Total duration in ms, pop included. */
  ms: number;
  /** Type size in pt at rest. */
  size: number;
  /** A trail and sparks behind the fling (staff numbers and the product). */
  trail: boolean;
  /** A multiplier: amber with a hot rim. */
  hot: boolean;
  /** 'in' accelerates away (readable as it leaves); 'inOut' for the short hop from a pin. */
  ease: 'in' | 'inOut';
  seed: number;
}

const TONES: Record<Tone, { hi: string; glow: string; deep: string; trail: string }> = {
  inf: { hi: '#D4F6FF', glow: 'rgba(95,212,244,0.95)', deep: 'rgba(4,18,26,0.92)', trail: '95,212,244' },
  mom: { hi: '#FFE7BD', glow: 'rgba(255,181,71,0.95)', deep: 'rgba(36,22,6,0.92)', trail: '255,181,71' },
  lev: { hi: '#FFFAF0', glow: 'rgba(255,220,160,0.95)', deep: 'rgba(30,22,10,0.92)', trail: '255,236,200' },
};

const FONT = '"JetBrains Mono", ui-monospace, monospace';
const W = 390;
const H = 844;
/** How close (pt) the middle of a flying number may come to the frame's side edges. */
const EDGE = 26;
/** The last part of the flight in which the number shrinks and fades into its box. */
const ARRIVE = 0.28;

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeIn(t: number): number {
  return t * t;
}
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function easeBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Where the fling starts: the source, raised by the pop's rise. */
function launchPoint(f: Flight): [number, number] {
  return [f.x0, f.y0 - f.rise];
}

/** Point on the flight's arc at progress p (0..1 of the fling, after the pop). */
export function arcPoint(f: Flight, p: number): [number, number] {
  const [sx, sy] = launchPoint(f);
  const mx = (sx + f.x1) / 2;
  const my = (sy + f.y1) / 2;
  const dist = Math.hypot(f.x1 - sx, f.y1 - sy);
  // Bow towards the nearer screen edge, away from the scoring cluster, but never so far that the
  // number's middle comes within EDGE pt of the frame (the phone's rounded corner).
  const side = sx < W / 2 ? -1 : 1;
  const limit = (edge: number) => (edge - 0.25 * (sx + f.x1)) / 0.5;
  const cx = Math.max(limit(EDGE), Math.min(limit(W - EDGE), mx + side * Math.min(70, dist * 0.22)));
  const cy = my - Math.min(60, dist * 0.12);
  const u = 1 - p;
  return [u * u * sx + 2 * u * p * cx + p * p * f.x1, u * u * sy + 2 * u * p * cy + p * p * f.y1];
}

/** The number's scale and opacity at fling progress p: steady, then shrinking into the box. */
export function arrival(p: number): { scale: number; alpha: number } {
  if (p <= 1 - ARRIVE) return { scale: 1, alpha: 1 };
  const q = (p - (1 - ARRIVE)) / ARRIVE;
  return { scale: 1 - 0.4 * q, alpha: 1 - q };
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class FlyerLayer {
  private flights: Flight[] = [];
  private raf = 0;
  private ctx: CanvasRenderingContext2D | null;
  private k = 1;
  private seed = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
  }

  /** Device pixels per frame px; call when the frame scale changes. */
  resize(scale: number): void {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.k = Math.max(1, Math.min(4, dpr * scale));
    this.canvas.width = Math.round(W * this.k);
    this.canvas.height = Math.round(H * this.k);
  }

  launch(f: Omit<Flight, 'start' | 'seed'>): void {
    this.flights.push({ ...f, start: performance.now(), seed: this.seed++ });
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  clear(): void {
    this.flights = [];
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy(): void {
    this.clear();
  }

  private frame = (): void => {
    this.raf = 0;
    const ctx = this.ctx;
    if (!ctx) return;
    const now = performance.now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
    this.flights = this.flights.filter((f) => now < f.start + f.ms);
    for (const f of this.flights) this.draw(ctx, f, now);
    if (this.flights.length) this.raf = requestAnimationFrame(this.frame);
  };

  private draw(ctx: CanvasRenderingContext2D, f: Flight, now: number): void {
    const el = now - f.start;
    const tone = TONES[f.tone];
    let x: number;
    let y: number;
    let scale: number;
    let alpha = 1;
    let p = 0;
    if (el < f.pop) {
      // The pop: stamped in at 1.35x, settling as it rises off its source.
      const q = el / f.pop;
      x = f.x0;
      y = f.y0 - f.rise * easeOut(q);
      scale = 1.35 - 0.35 * easeBack(Math.min(1, q));
      alpha = Math.min(1, q * 3);
    } else {
      const flyMs = Math.max(1, f.ms - f.pop);
      const q = Math.min(1, (el - f.pop) / flyMs);
      p = f.ease === 'in' ? easeIn(q) : easeInOut(q);
      [x, y] = arcPoint(f, p);
      ({ scale, alpha } = arrival(q));
    }
    if (f.trail && el >= f.pop && p > 0.02) this.trail(ctx, f, p, tone.trail, alpha);

    const size = f.size * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${size.toFixed(2)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if (f.hot) {
      // A multiplier's hot rim: a white-amber halo outside the dark edge.
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(255,220,150,0.55)';
      ctx.strokeText(f.text, x, y);
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = tone.deep;
    ctx.strokeText(f.text, x, y);
    ctx.shadowColor = tone.glow;
    ctx.shadowBlur = (f.hot ? 14 : 10) * this.k;
    ctx.fillStyle = tone.hi;
    ctx.fillText(f.text, x, y);
    ctx.shadowBlur = 0;
    ctx.fillText(f.text, x, y);
    ctx.restore();
  }

  /** A tapering trail over the last 17% of the path, drawn blurred then sharp, with sparks. */
  private trail(ctx: CanvasRenderingContext2D, f: Flight, p: number, rgb: string, alpha: number): void {
    const steps = 9;
    const from = Math.max(0, p - 0.17);
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= steps; i++) pts.push(arcPoint(f, from + ((p - from) * i) / steps));
    for (const pass of [0, 1]) {
      ctx.save();
      ctx.globalAlpha = alpha;
      if (pass === 0) {
        ctx.shadowColor = `rgba(${rgb},0.9)`;
        ctx.shadowBlur = 2.4 * this.k * 3;
      }
      ctx.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        const k = i / steps;
        ctx.strokeStyle = `rgba(${rgb},${(k * k * (pass === 0 ? 0.55 : 0.9)).toFixed(3)})`;
        ctx.lineWidth = 0.8 + 4.2 * k;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
        ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      }
      ctx.restore();
    }
    const rnd = mulberry(f.seed * 7919);
    ctx.save();
    ctx.fillStyle = `rgba(${rgb},0.85)`;
    for (let i = 0; i < 5; i++) {
      const q = Math.max(0, p - 0.03 - rnd() * 0.16);
      const [sx, sy] = arcPoint(f, q);
      const r = 0.6 + rnd() * 0.9;
      ctx.globalAlpha = alpha * (0.4 + 0.6 * (1 - (p - q) / 0.2));
      ctx.beginPath();
      ctx.arc(sx + (rnd() - 0.5) * 7, sy + (rnd() - 0.5) * 7, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

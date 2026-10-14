/**
 * Procedural material grain (STYLE 5.4-5.6): SVG turbulence tiles as data URIs, published as CSS
 * custom properties on the root. No image files; each tile is alpha over its material's base.
 */

interface Turb {
  freq: number | string;
  oct?: number;
  seed?: number;
  rgb?: [number, number, number];
  a?: number;
  b?: number;
  size?: number;
}

/** One noise tile: alpha = a * R + b, where R is the turbulence's red channel. */
function turb({ freq, oct = 2, seed = 1, rgb = [0, 0, 0], a = 1, b = 0, size = 220 }: Turb): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<filter id='n' x='0' y='0' width='100%' height='100%'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' seed='${seed}' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 ${rgb[0]} 0 0 0 0 ${rgb[1]} 0 0 0 0 ${rgb[2]} ${a} 0 0 0 ${b}'/>` +
    `</filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const TEXTURES: Record<string, string> = {
  '--leather-grain': [
    turb({ freq: 1.1, oct: 3, seed: 4, rgb: [0, 0, 0], a: 1.1, b: -0.42 }),
    turb({ freq: 0.9, oct: 2, seed: 11, rgb: [1, 0.86, 0.66], a: 0.5, b: -0.26 }),
    turb({ freq: 0.03, oct: 2, seed: 9, rgb: [0.42, 0.28, 0.16], a: 0.6, b: -0.22, size: 400 }),
  ].join(', '),
  '--felt-grain': [
    turb({ freq: 1.7, oct: 2, seed: 21, rgb: [0.75, 0.85, 1], a: 0.55, b: -0.27 }),
    turb({ freq: 0.6, oct: 2, seed: 5, rgb: [0, 0, 0], a: 0.6, b: -0.2 }),
  ].join(', '),
  '--linen-grain': [
    turb({ freq: '0.9 0.06', oct: 2, seed: 2, rgb: [0.42, 0.36, 0.26], a: 0.55, b: -0.2 }),
    turb({ freq: '0.06 0.9', oct: 2, seed: 3, rgb: [0.42, 0.36, 0.26], a: 0.5, b: -0.2 }),
  ].join(', '),
  '--tray-grain': [
    turb({ freq: '0.85 0.05', oct: 2, seed: 7, rgb: [0.91, 0.89, 0.82], a: 0.13, b: -0.055 }),
    turb({ freq: '0.05 0.85', oct: 2, seed: 8, rgb: [0.91, 0.89, 0.82], a: 0.1, b: -0.045 }),
  ].join(', '),
  '--stamp-speck': turb({ freq: 1.25, oct: 2, seed: 13, rgb: [0.04, 0.11, 0.07], a: 2.6, b: -1.42, size: 160 }),
  '--ink-speck': turb({ freq: 1.1, oct: 2, seed: 17, rgb: [0.91, 0.89, 0.82], a: 2.4, b: -1.5, size: 160 }),
  '--steel-grain': turb({ freq: '0.02 1.4', oct: 2, seed: 31, rgb: [1, 1, 1], a: 0.07, b: -0.03 }),
};

export function installTextures(root: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(TEXTURES)) root.style.setProperty(k, v);
}

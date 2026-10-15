/**
 * The live map controller, for the director, the intro and the hit-testing of drags that start off
 * the map. Set by the Table component while it is mounted.
 */
import type { MapController } from '../art';
import { MAP_X, MAP_Y } from '../common/layout';

let current: MapController | null = null;
let canvasEl: HTMLCanvasElement | null = null;

export function setMap(map: MapController | null, canvas: HTMLCanvasElement | null): void {
  current = map;
  canvasEl = canvas;
}

export function getMap(): MapController | null {
  return current;
}

/** Client (window) coordinates to map points, or null when outside the map. */
export function clientToMap(clientX: number, clientY: number): { x: number; y: number } | null {
  if (!canvasEl) return null;
  const r = canvasEl.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  const x = ((clientX - r.left) / r.width) * 390;
  const y = ((clientY - r.top) / r.height) * 520;
  if (x < 0 || y < 0 || x > 390 || y > 520) return null;
  return { x, y };
}

/** A region's pin in frame px. */
export function pinOnFrame(id: string): { x: number; y: number } {
  const p = current?.pinPos(id) ?? { x: 195, y: 260 };
  return { x: MAP_X + p.x, y: MAP_Y + p.y };
}

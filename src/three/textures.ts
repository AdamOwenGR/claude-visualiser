// Procedural, cached PBR-ish textures drawn on canvas. One tile = 1m × 1m so that
// geometry with metre-based UVs (extruded walls) needs repeat (1, 1); box geometry
// sets repeat to its physical size.
import * as THREE from 'three';
import type { CladdingSpec, DeckSpec, FloorSpec } from '../data/catalogue';

const SIZE = 768;
const cache = new Map<string, { map: THREE.Texture; bump: THREE.Texture }>();

interface BoardOpts {
  key: string;
  base: string;
  variance: number;
  grain: number;
  boardWidth: number; // metres
  gap: number; // metres of dark gap between boards
  gapColor?: string;
  orientation: 'vertical' | 'horizontal';
  bevel?: boolean; // tongue & groove shading
  seam?: boolean; // standing seam ridge instead of groove
  noise?: number; // speckle amount
  plankLength?: number; // metres, for staggered planks (flooring/decking); 0 = continuous
}

// Deterministic PRNG so textures are stable between renders.
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgb = (c: number[], k = 1, add = 0) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v * k + add)))).join(',')})`;

function makeBoardTexture(o: BoardOpts) {
  const hit = cache.get(o.key);
  if (hit) return hit;
  const rand = rng(o.key.split('').reduce((a, c) => a + c.charCodeAt(0) * 31, 7));
  const base = hexToRgb(o.base);
  const px = (m: number) => m * SIZE;

  const map = document.createElement('canvas');
  map.width = map.height = SIZE;
  const bump = document.createElement('canvas');
  bump.width = bump.height = SIZE;
  const c = map.getContext('2d')!;
  const b = bump.getContext('2d')!;
  c.fillStyle = rgb(base);
  c.fillRect(0, 0, SIZE, SIZE);
  b.fillStyle = 'rgb(128,128,128)';
  b.fillRect(0, 0, SIZE, SIZE);

  // Draw in "vertical" space then rotate for horizontal.
  const draw = (ctx: CanvasRenderingContext2D, isBump: boolean) => {
    ctx.save();
    if (o.orientation === 'horizontal') {
      ctx.translate(SIZE, 0);
      ctx.rotate(Math.PI / 2);
    }
    const bw = px(o.boardWidth);
    const gw = px(o.gap);
    const pitch = bw + gw;
    const n = Math.ceil(SIZE / pitch) + 1;
    const r2 = rng(42);
    for (let i = 0; i < n; i++) {
      const x = i * pitch;
      const k = 1 + (r2() - 0.5) * 2 * o.variance;
      // board body
      if (!isBump) ctx.fillStyle = rgb(base, k);
      else ctx.fillStyle = `rgb(${130 + Math.round((k - 1) * 20)},${130},${130})`;
      ctx.fillRect(x, 0, bw, SIZE);
      // plank end joints (staggered)
      if (o.plankLength) {
        const pl = px(o.plankLength);
        const off = r2() * pl;
        for (let y = -pl + off; y < SIZE; y += pl) {
          ctx.fillStyle = isBump ? 'rgb(60,60,60)' : rgb(base, k * 0.55);
          ctx.fillRect(x, y, bw, Math.max(1.5, px(0.003)));
        }
      }
      // grain streaks
      const streaks = Math.round(o.grain * 70);
      for (let s = 0; s < streaks; s++) {
        const gx = x + r2() * bw;
        const amp = r2() * 2.5;
        const alpha = (0.05 + r2() * 0.18) * o.grain;
        ctx.strokeStyle = isBump ? `rgba(${r2() > 0.5 ? 170 : 90},128,128,${alpha * 1.5})` : `rgba(${r2() > 0.5 ? 255 : 0},${r2() > 0.5 ? 240 : 10},${r2() > 0.5 ? 220 : 0},${alpha})`;
        ctx.lineWidth = 0.6 + r2() * 1.6;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        for (let y = 0; y <= SIZE; y += 32) ctx.lineTo(gx + Math.sin(y / 97 + s) * amp, y);
        ctx.stroke();
      }
      // bevel / shading at board edges
      if (o.bevel) {
        const g = ctx.createLinearGradient(x, 0, x + bw, 0);
        if (!isBump) {
          g.addColorStop(0, 'rgba(0,0,0,0.22)');
          g.addColorStop(0.08, 'rgba(0,0,0,0)');
          g.addColorStop(0.92, 'rgba(255,255,255,0)');
          g.addColorStop(1, 'rgba(255,255,255,0.10)');
        } else {
          g.addColorStop(0, 'rgba(0,0,0,0.6)');
          g.addColorStop(0.06, 'rgba(0,0,0,0)');
          g.addColorStop(0.94, 'rgba(255,255,255,0)');
          g.addColorStop(1, 'rgba(255,255,255,0.5)');
        }
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, bw, SIZE);
      }
      // gap / seam
      if (gw > 0) {
        if (o.seam) {
          ctx.fillStyle = isBump ? 'rgb(235,235,235)' : rgb(base, 1.25, 10);
          ctx.fillRect(x + bw, 0, gw, SIZE);
          ctx.fillStyle = isBump ? 'rgb(40,40,40)' : 'rgba(0,0,0,0.35)';
          ctx.fillRect(x + bw + gw, 0, Math.max(1, gw * 0.5), SIZE);
          ctx.fillStyle = isBump ? 'rgb(90,90,90)' : 'rgba(0,0,0,0.18)';
          ctx.fillRect(x + bw - gw * 0.5, 0, gw * 0.5, SIZE);
        } else {
          ctx.fillStyle = isBump ? 'rgb(5,5,5)' : (o.gapColor ?? 'rgb(22,18,15)');
          ctx.fillRect(x + bw, 0, gw, SIZE);
        }
      }
    }
    // speckle noise
    if (o.noise) {
      const img = ctx.getImageData(0, 0, SIZE, SIZE);
      const d = img.data;
      const amt = o.noise * 255;
      for (let i = 0; i < d.length; i += 4) {
        const nz = (rand() - 0.5) * amt;
        d[i] += nz;
        d[i + 1] += nz;
        d[i + 2] += nz;
      }
      ctx.putImageData(img, 0, 0);
    }
    ctx.restore();
  };
  draw(c, false);
  draw(b, true);

  const mk = (cv: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  const out = { map: mk(map, true), bump: mk(bump, false) };
  cache.set(o.key, out);
  return out;
}

export function claddingTexture(spec: CladdingSpec) {
  switch (spec.pattern) {
    case 'vertical':
      return makeBoardTexture({ key: 'clad:' + spec.id, base: spec.base, variance: spec.variance, grain: spec.grain, boardWidth: spec.boardWidth, gap: 0.006, orientation: 'vertical', bevel: true });
    case 'horizontal':
      return makeBoardTexture({ key: 'clad:' + spec.id, base: spec.base, variance: spec.variance, grain: spec.grain, boardWidth: spec.boardWidth, gap: 0.008, orientation: 'horizontal', bevel: true, gapColor: 'rgba(0,0,0,0.55)' });
    case 'slatted':
      return makeBoardTexture({ key: 'clad:' + spec.id, base: spec.base, variance: spec.variance, grain: spec.grain, boardWidth: spec.boardWidth, gap: 0.025, orientation: 'vertical', bevel: true, gapColor: 'rgb(16,14,12)' });
    case 'seam':
      return makeBoardTexture({ key: 'clad:' + spec.id, base: spec.base, variance: spec.variance, grain: 0.08, boardWidth: spec.boardWidth, gap: 0.012, orientation: 'vertical', seam: true, noise: 0.025 });
    case 'metal':
      return makeBoardTexture({ key: 'clad:' + spec.id, base: spec.base, variance: 0.0, grain: 0.05, boardWidth: 0.5, gap: 0.004, orientation: 'vertical', noise: 0.08, gapColor: 'rgba(0,0,0,0.3)' });
  }
}

export function deckTexture(spec: DeckSpec) {
  return makeBoardTexture({ key: 'deck:' + spec.id, base: spec.base, variance: spec.variance, grain: spec.grain, boardWidth: spec.boardWidth, gap: 0.006, orientation: 'horizontal', bevel: true, gapColor: 'rgb(30,26,22)' });
}

export function floorTexture(spec: FloorSpec) {
  if (spec.pattern === 'tile')
    return makeBoardTexture({ key: 'floor:' + spec.id, base: spec.hex, variance: 0.06, grain: 0.15, boardWidth: 0.5, gap: 0.003, orientation: 'horizontal', noise: 0.06, plankLength: 0.5, gapColor: 'rgba(0,0,0,0.25)' });
  if (spec.pattern === 'bare')
    return makeBoardTexture({ key: 'floor:' + spec.id, base: spec.hex, variance: 0.05, grain: 0.35, boardWidth: 1.2, gap: 0.004, orientation: 'horizontal', noise: 0.08, gapColor: 'rgba(0,0,0,0.3)' });
  return makeBoardTexture({ key: 'floor:' + spec.id, base: spec.hex, variance: 0.1, grain: 0.5, boardWidth: 0.19, gap: 0.002, orientation: 'horizontal', plankLength: 1.2, gapColor: 'rgba(0,0,0,0.35)' });
}

export function sedumTexture() {
  const key = 'sedum';
  const hit = cache.get(key);
  if (hit) return hit;
  const r = rng(99);
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#5c6b3a';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const cols = ['#6f8a3f', '#8ea14a', '#4f6b32', '#a8b25a', '#7b5f3a', '#9c7a52', '#c2b26a', '#6d7f45'];
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = cols[Math.floor(r() * cols.length)];
    ctx.globalAlpha = 0.5 + r() * 0.5;
    ctx.beginPath();
    ctx.ellipse(r() * SIZE, r() * SIZE, 4 + r() * 16, 3 + r() * 10, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  const out = { map: t, bump: t };
  cache.set(key, out);
  return out;
}

/** A copy of a texture with a specific repeat (metres). */
export function repeated(t: THREE.Texture, rx: number, ry: number) {
  const c = t.clone();
  c.repeat.set(rx, ry);
  c.needsUpdate = true;
  return c;
}

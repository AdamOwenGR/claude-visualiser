// Shared building geometry. Both the 3D scene and the 2D CAD plan derive from this
// so the two views can never disagree.
//
// Coordinate system (metres): origin at the centre of the internal floor plan.
// +x = right (viewed from the front), +z = towards the front, +y = up. Ground y = 0.

import { DOORS, WINDOWS, modelById, type ModelSpec, type WallSide, type Orientation } from '../data/catalogue';
import { PRICE_GRIDS, type SizeGrid } from '../data/priceGrids';

export interface WindowPlacement {
  id: string;
  type: string;
  wall: WallSide;
  at: number; // 0..1 centre position along the wall (from left, viewed from outside)
}

export interface DesignConfig {
  modelId: string;
  orientation: Orientation;
  width: number; // internal metres
  depth: number; // internal metres
  cladding: string;
  frontCladding: string | null; // optional accent on the front elevation only
  stylePack: string | null;
  fascia: string;
  frame: string;
  door: { type: string; at: number };
  windows: WindowPlacement[];
  deckSize: string;
  deckFinish: string;
  wallFinish: string;
  floor: string;
  features: string[];
  partitionAt: number; // 0..1 of internal width
  sideScreenSide: 'left' | 'right';
}

export interface Opening {
  id: string;
  kind: 'door' | 'window';
  wall: WallSide;
  type: string;
  /** centre distance along the wall's external face from the left (viewed from outside) */
  s: number;
  w: number;
  h: number;
  sill: number; // above internal floor
  corner?: boolean;
  leaves: number;
  doorKind?: 'french' | 'sliding' | 'bifold' | 'single' | 'combi';
  opening?: boolean;
}

export interface BuildingGeometry {
  model: ModelSpec;
  intW: number;
  intD: number;
  extW: number;
  extD: number;
  wallT: number;
  floorH: number; // top of internal floor above ground
  wallH: number; // wall height above the floor at the front wall (highest point of a pent)
  /** world y of the wall top / roof underside at world z (pent roofs slope front to back) */
  wallTopAt: (z: number) => number;
  /** slope of the ceiling about the x axis (radians, front higher); 0 for flat */
  ceilingTilt: number;
  extHeight: number;
  roofT: number;
  roof:
    | {
        type: 'pent';
        fall: number;
        sloped: boolean; // visible slope (all-sides hood) vs hidden fall behind a parapet
        overhang: { front: number; back: number; left: number; right: number };
        /** roof slab centre and angle (only meaningful when sloped) */
        slab: { yc: number; zc: number; len: number; ang: number };
      }
    | { type: 'apex'; pitch: number; ridgeAxis: 'x' | 'z'; eavesH: number; ridgeH: number; overhang: number; wallTop: number; halfSpan: number };
  hood: { style: ModelSpec['hood']; depth: number; cheeks: 'none' | 'both' | 'right'; frameT: number };
  deck: { depth: number; width: number; top: number; boards: number } | null;
  openings: Opening[];
  /** pipe centre (x,z) 60mm off the wall; (nx,nz) outward normal; reach = horizontal swan-neck run to the gutter */
  downpipes: { x: number; z: number; nx: number; nz: number; reach: number }[];
  /** gutter centre line: y, and distance of its centre outside the wall face */
  gutters: { wall: WallSide; y: number; off: number }[];
  partition: { x: number } | null;
  sideScreen: { side: 'left' | 'right'; depth: number } | null;
  floorArea: number;
  wallLength: (wall: WallSide) => number;
  /** convert wall-local coordinate s (from left viewed outside) to world x/z on the external face */
  wallPoint: (wall: WallSide, s: number) => { x: number; z: number; nx: number; nz: number };
}

export const gridFor = (model: ModelSpec, orientation: Orientation): SizeGrid => {
  const g = PRICE_GRIDS[model.priceKey];
  if ('gable' in g) return orientation === 'eaves' ? g.eaves : g.gable;
  return g;
};

export const extFromGrid = (grid: SizeGrid, w: number, d: number) => {
  const ww = grid.widths.find((x) => Math.abs(x[0] - w) < 1e-6);
  const dd = grid.depths.find((x) => Math.abs(x[0] - d) < 1e-6);
  return { extW: ww ? ww[1] : w + 0.2, extD: dd ? dd[1] : d + 0.3 };
};

export const isSizeAvailable = (grid: SizeGrid, w: number, d: number) =>
  grid.prices.some((p) => Math.abs(p[0] - w) < 1e-6 && Math.abs(p[1] - d) < 1e-6);

/** Snap a requested internal size to the nearest size that exists in the grid. */
export const snapSize = (grid: SizeGrid, w: number, d: number): { width: number; depth: number } => {
  if (isSizeAvailable(grid, w, d)) return { width: w, depth: d };
  let best = grid.prices[0];
  let bestScore = Infinity;
  for (const p of grid.prices) {
    const score = Math.abs(p[0] - w) * 1.0 + Math.abs(p[1] - d) * 1.0;
    if (score < bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return { width: best[0], depth: best[1] };
};

export const basePrice = (grid: SizeGrid, w: number, d: number): number | null => {
  const p = grid.prices.find((x) => Math.abs(x[0] - w) < 1e-6 && Math.abs(x[1] - d) < 1e-6);
  return p ? p[2] : null;
};

const BOARD = 0.145;
const GAP = 0.006;

export function computeGeometry(cfg: DesignConfig): BuildingGeometry {
  const model = modelById(cfg.modelId);
  const grid = gridFor(model, cfg.orientation);
  const { extW, extD } = extFromGrid(grid, cfg.width, cfg.depth);
  const intW = cfg.width;
  const intD = cfg.depth;
  const wallT = Math.max(0.09, (extW - intW) / 2);
  const extended = cfg.features.includes('extendedHeight') && !!model.extendedHeight;
  const extHeight = extended ? model.extendedHeight! : model.standardHeight;
  const floorH = 0.16;
  const roofT = model.roof === 'apex' ? 0.12 : 0.16;

  // Hood: how far the external (quoted) depth projects beyond the walls at the front.
  const extraDepth = Math.max(0, +(extD - intD - 2 * wallT).toFixed(3));
  const hoodDepth = model.roof === 'apex' ? 0 : extraDepth;
  let cheeks: 'none' | 'both' | 'right' = 'none';
  if (model.hood === 'frontFrame') cheeks = model.range === 'b' ? 'right' : 'both';
  if (model.hood === 'leanFrame') cheeks = 'both';
  if (model.hood === 'curvedCorner') cheeks = 'right';
  const frameT = model.range === 'x1' ? 0.18 : 0.14;

  // Roof
  const hx0 = intW / 2 + wallT;
  const hz0 = intD / 2 + wallT;
  let roof: BuildingGeometry['roof'];
  let wallTopAt: (z: number) => number;
  let ceilingTilt = 0;
  if (model.roof === 'pent') {
    const fall = Math.min(0.22, 0.045 * (intD + 2 * wallT));
    const sloped = model.hood === 'allSides';
    const ov = sloped
      ? { front: hoodDepth, back: 0.18, left: 0.22, right: 0.22 }
      : model.hood === 'none'
        ? { front: hoodDepth, back: 0.04, left: 0.04, right: 0.04 }
        : { front: hoodDepth, back: 0.05, left: 0.05, right: 0.05 };
    const zF = hz0 + ov.front;
    const zB = -hz0 - ov.back;
    const len = zF - zB;
    const ang = sloped ? Math.atan2(fall, len) : 0;
    const slab = { yc: extHeight - roofT / 2 - (sloped ? fall / 2 : 0), zc: (zF + zB) / 2, len: Math.hypot(len, sloped ? fall : 0), ang };
    if (sloped) {
      // Underside of the rotated slab: centre line minus half the thickness measured vertically.
      const k = Math.tan(ang);
      const half = roofT / 2 / Math.cos(ang);
      wallTopAt = (z) => slab.yc + k * (z - slab.zc) - half;
      ceilingTilt = ang;
    } else {
      wallTopAt = () => extHeight - roofT;
    }
    roof = { type: 'pent', fall, sloped, overhang: ov, slab };
  } else {
    const pitch = model.apexPitch ?? 25;
    const ridgeAxis: 'x' | 'z' = cfg.orientation === 'gable' ? 'z' : 'x';
    const halfSpan = ridgeAxis === 'z' ? hx0 : hz0;
    const k = Math.tan((pitch * Math.PI) / 180);
    const wallTop = extHeight - 0.05;
    const eavesH = extHeight;
    // The roof slabs rest on the eaves walls; their underside meets the gable tops exactly.
    const ridgeH = wallTop + halfSpan * k + roofT / Math.cos((pitch * Math.PI) / 180);
    wallTopAt = () => wallTop;
    roof = { type: 'apex', pitch, ridgeAxis, eavesH, ridgeH, overhang: Math.max(0.2, Math.min(0.35, extraDepth / 2)), wallTop, halfSpan };
  }
  const wallH = wallTopAt(hz0 - wallT) - floorH;
  /** usable height above floor for an opening on a wall, at its lowest point */
  const heightFor = (wall: WallSide, s: number, w: number) => {
    if (wall === 'front') return wallTopAt(hz0 - wallT) - floorH;
    if (wall === 'back') return wallTopAt(-hz0) - floorH;
    const zA = wall === 'right' ? hz0 - (s - w / 2) : -hz0 + (s - w / 2);
    const zB2 = wall === 'right' ? hz0 - (s + w / 2) : -hz0 + (s + w / 2);
    return Math.min(wallTopAt(zA), wallTopAt(zB2)) - floorH;
  };

  // Deck
  let deck: BuildingGeometry['deck'] = null;
  const deckBoards = model.deckBoards;
  if (cfg.deckSize !== 'none') {
    let depth = 0;
    let boards = 0;
    if (cfg.deckSize === 'standard') {
      boards = deckBoards;
      depth = boards * (BOARD + GAP);
    } else if (cfg.deckSize === 'extended') {
      depth = 1.2;
      boards = Math.round(depth / (BOARD + GAP));
    } else if (cfg.deckSize === 'large') {
      depth = 2.4;
      boards = Math.round(depth / (BOARD + GAP));
    }
    if (depth > 0) deck = { depth, width: extW, top: floorH - 0.04, boards };
  }

  const wallLength = (wall: WallSide) => (wall === 'front' || wall === 'back' ? extW : intD + 2 * wallT);

  const wallPoint = (wall: WallSide, s: number) => {
    const hx = intW / 2 + wallT;
    const hz = intD / 2 + wallT;
    switch (wall) {
      case 'front':
        return { x: -hx + s, z: hz, nx: 0, nz: 1 };
      case 'back':
        return { x: hx - s, z: -hz, nx: 0, nz: -1 };
      case 'right':
        return { x: hx, z: hz - s, nx: 1, nz: 0 };
      case 'left':
        return { x: -hx, z: -hz + s, nx: -1, nz: 0 };
    }
  };

  // Openings
  const openings: Opening[] = [];
  const door = DOORS[cfg.door.type] ?? DOORS[model.standardDoor];
  const frontL = wallLength('front');
  const margin = 0.2;
  const dw = Math.min(door.width, frontL - 2 * margin);
  const doorS = clamp(cfg.door.at * frontL, margin + dw / 2, frontL - margin - dw / 2);
  openings.push({ id: 'door', kind: 'door', wall: 'front', type: door.id, s: doorS, w: dw, h: Math.min(door.height, heightFor('front', doorS, dw) - 0.08), sill: 0, leaves: door.leaves, doorKind: door.kind });

  const placed: Opening[] = [openings[0]];
  const overlaps = (a: { wall: WallSide; s: number; w: number }, b: { wall: WallSide; s: number; w: number }) =>
    a.wall === b.wall && Math.abs(a.s - b.s) < a.w / 2 + b.w / 2 + 0.1;
  // Fixed-position windows (corner) are placed first so movable ones nudge around them.
  const allWindows: WindowPlacement[] = [
    ...model.standardWindows.map((w, i) => ({ id: `std${i}`, ...w })),
    ...cfg.windows,
  ].sort((a, b) => Number(!!WINDOWS[b.type]?.corner) - Number(!!WINDOWS[a.type]?.corner));
  for (const wp of allWindows) {
    const spec = WINDOWS[wp.type];
    if (!spec) continue;
    if (spec.corner) {
      // Corner window wraps the front-right corner: a pane on the front and one on the right wall.
      const h = Math.min(spec.height, heightFor('right', wallT, spec.width) - spec.sill - 0.08);
      const f: Opening = { id: wp.id + 'f', kind: 'window', wall: 'front', type: spec.id, s: frontL - wallT - spec.width / 2, w: spec.width, h, sill: spec.sill, corner: true, leaves: 1 };
      const r: Opening = { id: wp.id + 'r', kind: 'window', wall: 'right', type: spec.id, s: wallT + spec.width / 2, w: spec.width, h, sill: spec.sill, corner: true, leaves: 1 };
      if (placed.some((o) => overlaps(o, f) || overlaps(o, r))) continue; // no room next to the door
      openings.push(f, r);
      placed.push(f, r);
      continue;
    }
    const L = wallLength(wp.wall);
    const w = Math.min(spec.width, L - 2 * margin);
    if (w < 0.3) continue;
    let s = clamp(wp.at * L, margin + w / 2, L - margin - w / 2);
    // Keep clear of the door and other windows on the same wall (nudge, then give up if no room).
    for (let iter = 0; iter < 6; iter++) {
      const hit = placed.find((o) => overlaps(o, { wall: wp.wall, s, w }));
      if (!hit) break;
      s = hit.s < s ? hit.s + hit.w / 2 + w / 2 + 0.12 : hit.s - hit.w / 2 - w / 2 - 0.12;
      s = clamp(s, margin + w / 2, L - margin - w / 2);
    }
    if (placed.some((o) => overlaps(o, { wall: wp.wall, s, w }))) continue;
    const o: Opening = { id: wp.id, kind: 'window', wall: wp.wall, type: spec.id, s, w, h: Math.min(spec.height, heightFor(wp.wall, s, w) - spec.sill - 0.08), sill: spec.sill, leaves: 1, opening: spec.opening };
    openings.push(o);
    placed.push(o);
  }

  // Rainwater: pent roofs fall to the back; apex roofs drain at both eaves.
  // The gutter hangs just inside the drip edge; the downpipe hugs the wall and a swan neck joins them.
  const hx = intW / 2 + wallT;
  const hz = intD / 2 + wallT;
  const PIPE_OFF = 0.06;
  const downpipes: BuildingGeometry['downpipes'] = [];
  const gutters: BuildingGeometry['gutters'] = [];
  if (roof.type === 'pent') {
    const off = Math.max(roof.overhang.back - 0.03, 0.08);
    const y = (roof.sloped ? wallTopAt(-hz - off) : extHeight - roofT) - 0.05;
    gutters.push({ wall: 'back', y, off });
    downpipes.push({ x: -hx + 0.12, z: -hz - PIPE_OFF, nx: 0, nz: -1, reach: off - PIPE_OFF });
    if (extW > 6) downpipes.push({ x: hx - 0.12, z: -hz - PIPE_OFF, nx: 0, nz: -1, reach: off - PIPE_OFF });
  } else {
    const off = Math.max(roof.overhang - 0.04, 0.08);
    const y = roof.wallTop - off * Math.tan((roof.pitch * Math.PI) / 180) - 0.06;
    if (roof.ridgeAxis === 'z') {
      gutters.push({ wall: 'left', y, off }, { wall: 'right', y, off });
      downpipes.push({ x: -hx - PIPE_OFF, z: -hz + 0.12, nx: -1, nz: 0, reach: off - PIPE_OFF }, { x: hx + PIPE_OFF, z: -hz + 0.12, nx: 1, nz: 0, reach: off - PIPE_OFF });
    } else {
      gutters.push({ wall: 'front', y, off }, { wall: 'back', y, off });
      downpipes.push({ x: -hx + 0.12, z: -hz - PIPE_OFF, nx: 0, nz: -1, reach: off - PIPE_OFF }, { x: -hx + 0.12, z: hz + PIPE_OFF, nx: 0, nz: 1, reach: off - PIPE_OFF });
    }
  }

  const partition = cfg.features.includes('partition') ? { x: -intW / 2 + clamp(cfg.partitionAt, 0.15, 0.85) * intW } : null;
  const hasScreen = cfg.features.includes('sideScreenFixed') || cfg.features.includes('sideScreenSliding');
  const sideScreen = hasScreen && model.sideScreen ? { side: cfg.sideScreenSide, depth: Math.max(1.0, deck ? deck.depth : 0, hoodDepth) } : null;

  return {
    model, intW, intD, extW, extD, wallT, floorH, wallH, wallTopAt, ceilingTilt, extHeight, roofT, roof,
    hood: { style: model.hood, depth: hoodDepth, cheeks, frameT },
    deck, openings, downpipes, gutters, partition, sideScreen,
    floorArea: +(intW * intD).toFixed(2),
    wallLength, wallPoint,
  };
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const defaultConfig = (modelId: string): DesignConfig => {
  const model = modelById(modelId);
  const orientation: Orientation = model.orientations ? model.orientations[0] : 'eaves';
  const grid = gridFor(model, orientation);
  // Pick a pleasing mid-size default that exists in the grid.
  const prefer = grid.prices.find((p) => p[0] >= 4 && p[1] >= 3) ?? grid.prices[0];
  const pack = model.stylePacks ? model.stylePacks[0] : null;
  return {
    modelId,
    orientation,
    width: prefer[0],
    depth: prefer[1],
    cladding: model.standardCladding,
    frontCladding: null,
    stylePack: pack,
    fascia: model.range === 'x1' ? 'black' : pack ?? 'graphite',
    frame: model.range === 'x1' ? 'black' : 'graphite',
    door: { type: model.standardDoor, at: 0.36 },
    windows: [],
    deckSize: model.deckBoards > 0 ? 'standard' : 'none',
    deckFinish: model.decks[0],
    wallFinish: model.interiorWalls[0],
    floor: model.floors[0],
    features: [
      ...(model.features.includes('extLightUpDown') ? ['extLightUpDown'] : []),
      ...(model.features.includes('ledPanel') && model.range !== 'b' ? ['ledPanel'] : []),
      ...(model.features.includes('radiator') && model.range !== 'b' ? ['radiator'] : []),
      ...(model.range === 'x1' ? ['aircon', 'recessedSpots'] : []),
    ],
    partitionAt: 0.6,
    sideScreenSide: 'left',
  };
};

import { create } from 'zustand';
import { FEATURES, STYLE_PACKS, modelById, type Orientation, type RangeId, type WallSide } from '../data/catalogue';
import { defaultConfig, gridFor, isSizeAvailable, snapSize, type DesignConfig, type WindowPlacement } from './geometry';

export type Step = 'range' | 'model' | 'design';
export type ViewMode = '3d' | 'plan';
export type Category = 'size' | 'exterior' | 'openings' | 'interior' | 'electrics' | 'summary';

interface State {
  step: Step;
  range: RangeId | null;
  config: DesignConfig | null;
  view: ViewMode;
  category: Category;
  cameraPreset: number;
  selectRange: (r: RangeId) => void;
  selectModel: (id: string) => void;
  goto: (s: Step) => void;
  setView: (v: ViewMode) => void;
  setCategory: (c: Category) => void;
  setCameraPreset: (n: number) => void;
  patch: (p: Partial<DesignConfig>) => void;
  setSize: (w: number, d: number) => void;
  setOrientation: (o: Orientation) => void;
  setStylePack: (id: string) => void;
  toggleFeature: (id: string) => void;
  addWindow: (type: string, wall: WallSide) => void;
  updateWindow: (id: string, p: Partial<WindowPlacement>) => void;
  removeWindow: (id: string) => void;
  loadConfig: (c: DesignConfig) => void;
  reset: () => void;
}

let windowSeq = 1;

export const useStore = create<State>((set, get) => ({
  step: 'range',
  range: null,
  config: null,
  view: '3d',
  category: 'size',
  cameraPreset: 0,

  selectRange: (r) => set({ range: r, step: 'model' }),
  selectModel: (id) => set({ config: defaultConfig(id), step: 'design', category: 'size', view: '3d', cameraPreset: 0 }),
  goto: (s) => set({ step: s }),
  setView: (v) => set({ view: v }),
  setCategory: (c) => set({ category: c }),
  setCameraPreset: (n) => set({ cameraPreset: n }),
  patch: (p) => {
    const c = get().config;
    if (c) set({ config: { ...c, ...p } });
  },
  setSize: (w, d) => {
    const c = get().config;
    if (!c) return;
    const model = modelById(c.modelId);
    const grid = gridFor(model, c.orientation);
    if (!isSizeAvailable(grid, w, d)) {
      // Snap depth to the nearest available for this width, else width for this depth.
      const forW = grid.prices.filter((p) => Math.abs(p[0] - w) < 1e-6).map((p) => p[1]);
      if (forW.length) d = forW.reduce((a, b) => (Math.abs(b - d) < Math.abs(a - d) ? b : a));
      else {
        const forD = grid.prices.filter((p) => Math.abs(p[1] - d) < 1e-6).map((p) => p[0]);
        if (forD.length) w = forD.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
      }
    }
    set({ config: { ...c, width: w, depth: d } });
  },
  setOrientation: (o) => {
    const c = get().config;
    if (!c) return;
    const model = modelById(c.modelId);
    const grid = gridFor(model, o);
    let { width, depth } = c;
    if (!isSizeAvailable(grid, width, depth)) {
      // Swap axes when flipping orientation so the footprint stays the same where possible.
      if (isSizeAvailable(grid, depth, width)) [width, depth] = [depth, width];
      else {
        const p = grid.prices[Math.floor(grid.prices.length / 2)];
        width = p[0];
        depth = p[1];
      }
    }
    set({ config: { ...c, orientation: o, width, depth } });
  },
  setStylePack: (id) => {
    const c = get().config;
    const pack = STYLE_PACKS[id];
    if (c && pack) set({ config: { ...c, stylePack: id, fascia: pack.fascia, frame: pack.frame } });
  },
  toggleFeature: (id) => {
    const c = get().config;
    if (!c) return;
    const spec = FEATURES[id];
    let features = c.features.slice();
    if (features.includes(id)) features = features.filter((f) => f !== id);
    else {
      if (spec?.exclusive) features = features.filter((f) => FEATURES[f]?.exclusive !== spec.exclusive);
      features.push(id);
    }
    set({ config: { ...c, features } });
  },
  addWindow: (type, wall) => {
    const c = get().config;
    if (!c) return;
    const onWall = c.windows.filter((w) => w.wall === wall).length;
    const at = wall === 'front' ? 0.15 : 0.3 + onWall * 0.25;
    set({ config: { ...c, windows: [...c.windows, { id: 'w' + windowSeq++, type, wall, at: Math.min(0.85, at) }] } });
  },
  updateWindow: (id, p) => {
    const c = get().config;
    if (!c) return;
    set({ config: { ...c, windows: c.windows.map((w) => (w.id === id ? { ...w, ...p } : w)) } });
  },
  removeWindow: (id) => {
    const c = get().config;
    if (!c) return;
    set({ config: { ...c, windows: c.windows.filter((w) => w.id !== id) } });
  },
  loadConfig: (c) => {
    windowSeq = c.windows.length + 1;
    set({ config: c, range: modelById(c.modelId).range, step: 'design', category: 'size' });
  },
  reset: () => set({ step: 'range', range: null, config: null, view: '3d', category: 'size' }),
}));

// ---------------------------------------------------------------------------
// Share links: the whole design is encoded in the URL hash.
// ---------------------------------------------------------------------------

export const encodeConfig = (c: DesignConfig) => {
  const json = JSON.stringify(c);
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const decodeConfig = (hash: string): DesignConfig | null => {
  try {
    const b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const c = JSON.parse(json) as DesignConfig;
    const model = modelById(c.modelId);
    const merged = { ...defaultConfig(c.modelId), ...c };
    if (!model.orientations?.includes(merged.orientation)) merged.orientation = model.orientations ? model.orientations[0] : 'eaves';
    const snapped = snapSize(gridFor(model, merged.orientation), merged.width, merged.depth);
    return { ...merged, ...snapped };
  } catch {
    return null;
  }
};

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { CLADDINGS, DECKS, FASCIA_COLOURS, FLOORS, FRAME_COLOURS, WALL_FINISHES, WINDOWS, type WallSide } from '../data/catalogue';
import type { BuildingGeometry, DesignConfig, Opening } from '../model/geometry';
import { claddingTexture, deckTexture, floorTexture, repeated, sedumTexture } from './textures';


const colourOf = (list: { id: string; hex: string }[], id: string, fallback = '#3b3e42') => list.find((c) => c.id === id)?.hex ?? fallback;

function useMaterials(geo: BuildingGeometry, cfg: DesignConfig) {
  const mats = useMemo(() => {
    const clad = CLADDINGS[cfg.cladding] ?? CLADDINGS.redwood;
    const fclad = cfg.frontCladding ? CLADDINGS[cfg.frontCladding] : null;
    const mkClad = (spec: typeof clad) => {
      const t = claddingTexture(spec);
      return new THREE.MeshStandardMaterial({
        map: repeated(t.map, 1, 1),
        bumpMap: repeated(t.bump, 1, 1),
        bumpScale: spec.group === 'metal' ? 0.6 : 1.4,
        roughness: spec.roughness,
        metalness: spec.metalness,
        envMapIntensity: spec.group === 'metal' ? 1.1 : 0.7,
      });
    };
    const cladding = mkClad(clad);
    const frontCladding = fclad ? mkClad(fclad) : cladding;

    const wallSpec = WALL_FINISHES[cfg.wallFinish] ?? WALL_FINISHES.melamine;
    let interior: THREE.MeshStandardMaterial;
    if (wallSpec.id === 'osb') {
      const t = floorTexture({ id: 'osb', name: '', hex: wallSpec.hex, pattern: 'bare', price: 0 });
      interior = new THREE.MeshStandardMaterial({ map: repeated(t.map, 1, 1), bumpMap: repeated(t.bump, 1, 1), bumpScale: 0.8, roughness: 0.9 });
    } else {
      interior = new THREE.MeshStandardMaterial({ color: wallSpec.hex, roughness: wallSpec.id.startsWith('plaster') ? 0.92 : 0.45, metalness: 0 });
    }
    const frameHex = colourOf(FRAME_COLOURS, cfg.frame, '#141516');
    const fasciaId = cfg.fascia;
    const fasciaHex = colourOf(FASCIA_COLOURS, fasciaId);
    const reveal = new THREE.MeshStandardMaterial({ color: frameHex, roughness: 0.6, metalness: 0.1 });
    const frame = new THREE.MeshStandardMaterial({ color: frameHex, roughness: 0.42, metalness: 0.25, envMapIntensity: 0.9 });
    let fascia: THREE.MeshStandardMaterial;
    if (fasciaId === 'natural') {
      const t = claddingTexture(CLADDINGS.redwood);
      fascia = new THREE.MeshStandardMaterial({ map: repeated(t.map, 1, 1), bumpMap: repeated(t.bump, 1, 1), bumpScale: 1, roughness: 0.75 });
    } else {
      fascia = new THREE.MeshStandardMaterial({ color: fasciaHex, roughness: 0.5, metalness: 0.2, envMapIntensity: 0.8 });
    }
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#dfe9ec',
      roughness: 0.04,
      metalness: 0,
      transparent: true,
      opacity: 0.28,
      envMapIntensity: 1.6,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sedum = cfg.features.includes('sedumRoof');
    const seamT = claddingTexture(CLADDINGS.standingSeam);
    const roofTop = sedum
      ? new THREE.MeshStandardMaterial({ map: repeated(sedumTexture().map, 1, 1), roughness: 1 })
      : new THREE.MeshStandardMaterial({ color: '#3a3d41', map: repeated(seamT.map, 1, 1), bumpMap: repeated(seamT.bump, 1, 1), bumpScale: 0.5, roughness: 0.48, metalness: 0.55, envMapIntensity: 1 });
    const soffit = fasciaId === 'natural' ? fascia : new THREE.MeshStandardMaterial({ color: fasciaHex, roughness: 0.6 });
    const deckSpec = DECKS[cfg.deckFinish] ?? DECKS.redwood;
    const dt = deckTexture(deckSpec);
    const deck = new THREE.MeshStandardMaterial({ map: dt.map, bumpMap: dt.bump, bumpScale: 1.2, roughness: 0.8 });
    const floorSpec = FLOORS[cfg.floor] ?? FLOORS.whiteOak;
    const ft = floorTexture(floorSpec);
    const floor = new THREE.MeshStandardMaterial({ map: ft.map, bumpMap: ft.bump, bumpScale: 0.6, roughness: floorSpec.pattern === 'tile' ? 0.95 : 0.35, envMapIntensity: 0.5 });
    const white = new THREE.MeshStandardMaterial({ color: '#f6f6f3', roughness: 0.7 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1d1e20', roughness: 0.7 });
    const plinth = new THREE.MeshStandardMaterial({ color: '#2a2b2d', roughness: 0.9 });
    const emissive = new THREE.MeshStandardMaterial({ color: '#fff7e6', emissive: '#ffe9bf', emissiveIntensity: 2.2, roughness: 0.4 });
    const solar = new THREE.MeshPhysicalMaterial({ color: '#0f1b36', roughness: 0.12, metalness: 0.4, clearcoat: 1, envMapIntensity: 1.5 });
    const screen = new THREE.MeshStandardMaterial({ color: clad.group === 'timber' ? clad.base : fasciaHex, roughness: 0.7 });
    return { cladding, frontCladding, interior, reveal, frame, fascia, glass, roofTop, soffit, deck, floor, white, dark, plinth, emissive, solar, screen, sedum };
  }, [cfg.cladding, cfg.frontCladding, cfg.wallFinish, cfg.frame, cfg.fascia, cfg.deckFinish, cfg.floor, cfg.features.includes('sedumRoof')]);
  useEffect(() => () => Object.values(mats).forEach((m) => m instanceof THREE.Material && m.dispose()), [mats]);
  void geo;
  return mats;
}

// ---------------------------------------------------------------------------
// Wall panel with openings cut out (extruded shape; metre-based UVs)
// ---------------------------------------------------------------------------

interface Hole { x: number; y: number; w: number; h: number }

/** Split the extrude lid group so the inner face (z=0) and outer face (z=T) get separate materials. */
function splitGroups(g: THREE.ExtrudeGeometry) {
  const lid = g.groups[0];
  const side = g.groups[1];
  g.clearGroups();
  g.addGroup(lid.start, lid.count / 2, 1);
  g.addGroup(lid.start + lid.count / 2, lid.count / 2, 0);
  if (side) g.addGroup(side.start, side.count, 2);
  return g;
}

/**
 * Wall panel of length L whose top runs from h0 (x=0) to h1 (x=L), with openings.
 * Openings that touch the bottom or a side edge become notches in the outline instead of
 * holes, so the triangulation never produces degenerate faces at the floor line.
 */
function wallGeometry(L: number, h0: number, h1: number, T: number, holes: Hole[]) {
  const topAt = (x: number) => h0 + ((h1 - h0) * x) / L;
  const eps = 0.015;
  const bottom = holes.filter((h) => h.y <= 0.001).sort((a, b) => a.x - b.x);
  const notchR = holes.find((h) => h.y > 0.001 && h.x + h.w / 2 >= L - eps);
  const notchL = holes.find((h) => h.y > 0.001 && h.x - h.w / 2 <= eps);
  const pts: [number, number][] = [[0, 0]];
  for (const h of bottom) {
    const x0 = Math.max(0.001, h.x - h.w / 2);
    const x1 = Math.min(L - 0.001, h.x + h.w / 2);
    const top = Math.min(h.h, Math.min(topAt(x0), topAt(x1)) - 0.04);
    pts.push([x0, 0], [x0, top], [x1, top], [x1, 0]);
  }
  pts.push([L, 0]);
  if (notchR) pts.push([L, notchR.y], [notchR.x - notchR.w / 2, notchR.y], [notchR.x - notchR.w / 2, notchR.y + notchR.h], [L, notchR.y + notchR.h]);
  pts.push([L, h1], [0, h0]);
  if (notchL) pts.push([0, notchL.y + notchL.h], [notchL.x + notchL.w / 2, notchL.y + notchL.h], [notchL.x + notchL.w / 2, notchL.y], [0, notchL.y]);
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  for (const h of holes) {
    if (h === notchR || h === notchL || bottom.includes(h)) continue;
    const x0 = h.x - h.w / 2;
    const x1 = h.x + h.w / 2;
    const y1 = Math.min(h.y + h.h, Math.min(topAt(x0), topAt(x1)) - 0.04);
    const p = new THREE.Path();
    p.moveTo(x0, h.y);
    p.lineTo(x0, y1);
    p.lineTo(x1, y1);
    p.lineTo(x1, h.y);
    p.closePath();
    shape.holes.push(p);
  }
  return splitGroups(new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false }));
}

/** Gable infill above a wall: rises from edgeRise at both ends to peakRise at the centre. */
function gableGeometry(L: number, H0: number, edgeRise: number, peakRise: number, T: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, H0);
  shape.lineTo(L, H0);
  if (edgeRise > 0.001) shape.lineTo(L, H0 + edgeRise);
  shape.lineTo(L / 2, H0 + peakRise);
  if (edgeRise > 0.001) shape.lineTo(0, H0 + edgeRise);
  shape.closePath();
  return splitGroups(new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false }));
}

/** Clone a material with its maps tiled at real-world scale (sx × sy metres), optionally rotated 90°. */
function tiledMaterial(base: THREE.MeshStandardMaterial, sx: number, sy: number, rotate = false) {
  const m = base.clone();
  for (const key of ['map', 'bumpMap'] as const) {
    const t = base[key];
    if (!t) continue;
    const c = t.clone();
    c.center.set(0.5, 0.5);
    c.rotation = rotate ? Math.PI / 2 : 0;
    c.repeat.set(rotate ? sy : sx, rotate ? sx : sy);
    c.needsUpdate = true;
    m[key] = c;
  }
  return m;
}

const disposeMaterial = (m: THREE.Material) => {
  const sm = m as THREE.MeshStandardMaterial;
  sm.map?.dispose();
  sm.bumpMap?.dispose();
  m.dispose();
};

interface WallFrame {
  position: [number, number, number];
  rotationY: number;
  length: number;
  sOffset: number; // subtract from external s to get local x
  h0: number; // wall height above floor at local x = 0
  h1: number; // wall height above floor at local x = length
}

function wallFrames(geo: BuildingGeometry): Record<WallSide, WallFrame> {
  const hx = geo.intW / 2 + geo.wallT;
  const hz = geo.intD / 2 + geo.wallT;
  const t = geo.wallT;
  const h = (z: number) => geo.wallTopAt(z) - geo.floorH;
  // Front and back walls take the lower of their two faces so they never poke through a sloped roof.
  const hf = h(hz - t);
  const hb = h(-hz);
  return {
    front: { position: [-hx, geo.floorH, hz - t], rotationY: 0, length: geo.extW, sOffset: 0, h0: hf, h1: hf },
    right: { position: [hx - t, geo.floorH, hz - t], rotationY: Math.PI / 2, length: geo.intD, sOffset: t, h0: h(hz - t), h1: h(-(hz - t)) },
    left: { position: [-(hx - t), geo.floorH, -(hz - t)], rotationY: -Math.PI / 2, length: geo.intD, sOffset: t, h0: h(-(hz - t)), h1: h(hz - t) },
    back: { position: [hx, geo.floorH, -(hz - t)], rotationY: Math.PI, length: geo.extW, sOffset: 0, h0: hb, h1: hb },
  };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Box({ size, position, material, rotation, castShadow = true, receiveShadow = true }: { size: [number, number, number]; position: [number, number, number]; material: THREE.Material | THREE.Material[]; rotation?: [number, number, number]; castShadow?: boolean; receiveShadow?: boolean }) {
  return (
    <mesh position={position} rotation={rotation} material={material} castShadow={castShadow} receiveShadow={receiveShadow}>
      <boxGeometry args={size} />
    </mesh>
  );
}

/** Frame ring (4 bars) in local XY, centred at origin, depth along z */
function FrameRing({ w, h, t, d, material, z = 0 }: { w: number; h: number; t: number; d: number; material: THREE.Material; z?: number }) {
  return (
    <group position={[0, 0, z]}>
      <Box size={[w, t, d]} position={[0, h / 2 - t / 2, 0]} material={material} />
      <Box size={[w, t * 1.3, d]} position={[0, -h / 2 + (t * 1.3) / 2, 0]} material={material} />
      <Box size={[t, h, d]} position={[-w / 2 + t / 2, 0, 0]} material={material} />
      <Box size={[t, h, d]} position={[w / 2 - t / 2, 0, 0]} material={material} />
    </group>
  );
}

function Glazing({ w, h, material, z }: { w: number; h: number; material: THREE.Material; z: number }) {
  return (
    <mesh position={[0, 0, z]} material={material} castShadow={false}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

function Handle({ x, y, z, material, vertical = true }: { x: number; y: number; z: number; material: THREE.Material; vertical?: boolean }) {
  return (
    <mesh position={[x, y, z]} rotation={vertical ? [0, 0, 0] : [0, 0, Math.PI / 2]} material={material} castShadow={false}>
      <cylinderGeometry args={[0.012, 0.012, 0.22, 10]} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Doors & windows (local to wall group; x = local along wall, y above floor, z through wall)
// ---------------------------------------------------------------------------

function DoorSet({ o, T, mats }: { o: Opening; T: number; mats: ReturnType<typeof useMaterials> }) {
  const ft = 0.07;
  const cx = o.s;
  const cy = o.h / 2;
  const kind = o.doorKind ?? 'french';
  const leaves = Math.max(1, o.leaves);
  const innerW = o.w - 2 * ft;
  const innerH = o.h - ft * 2.3;
  const leafW = innerW / leaves;
  const stile = 0.075;
  const leafNodes = [];
  for (let i = 0; i < leaves; i++) {
    const lx = -innerW / 2 + leafW * (i + 0.5);
    let lz = T * 0.5;
    if (kind === 'sliding') lz = i % 2 === 0 ? T * 0.42 : T * 0.62;
    const solid = kind === 'single' || (kind === 'combi' && leaves === 3 && i === 0);
    const glassMat = mats.glass;
    leafNodes.push(
      <group key={i} position={[lx, 0, lz]}>
        <FrameRing w={leafW} h={innerH} t={stile} d={0.06} material={mats.frame} />
        {solid ? (
          <>
            <Box size={[leafW - 2 * stile, innerH - 2 * stile, 0.05]} position={[0, 0, 0]} material={mats.frame} />
            <Box size={[0.18, innerH * 0.55, 0.012]} position={[leafW * 0.12, innerH * 0.1, 0.03]} material={glassMat} castShadow={false} />
          </>
        ) : (
          <Glazing w={leafW - 2 * stile} h={innerH - 2 * stile} material={glassMat} z={0.0} />
        )}
        {kind !== 'bifold' && (i === 0 || i === leaves - 1) && leaves > 1 && (
          <Handle x={i === 0 ? leafW / 2 - stile - 0.04 : -leafW / 2 + stile + 0.04} y={-0.05} z={0.045} material={mats.frame} />
        )}
        {(kind === 'single' || leaves === 1) && <Handle x={leafW / 2 - stile - 0.05} y={-0.05} z={0.045} material={mats.frame} />}
        {kind === 'bifold' && i === 0 && <Handle x={leafW / 2 - stile - 0.04} y={-0.05} z={0.045} material={mats.frame} />}
      </group>,
    );
  }
  return (
    <group position={[cx, cy, 0]}>
      <FrameRing w={o.w} h={o.h} t={ft} d={T * 0.9} material={mats.frame} z={T * 0.5} />
      {/* threshold */}
      <Box size={[o.w, 0.03, T]} position={[0, -o.h / 2 + 0.015, T / 2]} material={mats.frame} />
      {leafNodes}
    </group>
  );
}

function WindowUnit({ o, T, mats }: { o: Opening; T: number; mats: ReturnType<typeof useMaterials> }) {
  const ft = 0.055;
  const cy = o.sill + o.h / 2;
  const spec = WINDOWS[o.type];
  return (
    <group position={[o.s, cy, 0]}>
      <FrameRing w={o.w} h={o.h} t={ft} d={T * 0.8} material={mats.frame} z={T * 0.55} />
      {spec?.opening && <FrameRing w={o.w - 2 * ft} h={o.h - 2.3 * ft} t={0.045} d={0.05} material={mats.frame} z={T * 0.62} />}
      <Glazing w={o.w - 2 * ft} h={o.h - 2 * ft} material={mats.glass} z={T * 0.55} />
      {/* internal sill */}
      {o.sill > 0.2 && <Box size={[o.w + 0.08, 0.025, 0.09]} position={[0, -o.h / 2 - 0.012, 0.02]} material={mats.white} />}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Main building
// ---------------------------------------------------------------------------

export function Building({ geo, cfg }: { geo: BuildingGeometry; cfg: DesignConfig }) {
  const mats = useMaterials(geo, cfg);
  const frames = useMemo(() => wallFrames(geo), [geo]);
  const hx = geo.intW / 2 + geo.wallT;
  const hz = geo.intD / 2 + geo.wallT;
  const T = geo.wallT;
  const H = geo.extHeight;
  const hd = geo.hood.depth;
  const has = (f: string) => cfg.features.includes(f);

  // Wall geometries
  const walls = useMemo(() => {
    const out: Partial<Record<WallSide, THREE.BufferGeometry>> = {};
    (['front', 'back', 'left', 'right'] as WallSide[]).forEach((side) => {
      const f = frames[side];
      const holes = geo.openings
        .filter((o) => o.wall === side)
        .map((o) => ({ x: o.s - f.sOffset, y: o.sill, w: o.w, h: o.h }));
      out[side] = wallGeometry(f.length, f.h0, f.h1, T, holes);
    });
    return out as Record<WallSide, THREE.BufferGeometry>;
  }, [geo, frames, T]);
  useEffect(() => () => Object.values(walls).forEach((g) => g.dispose()), [walls]);

  const gables = useMemo(() => {
    if (geo.roof.type !== 'apex') return null;
    const r = geo.roof;
    const k = Math.tan((r.pitch * Math.PI) / 180);
    const sides: WallSide[] = r.ridgeAxis === 'z' ? ['front', 'back'] : ['left', 'right'];
    return sides.map((side) => {
      const f = frames[side];
      // Gable top follows the roof underside exactly: zero rise where the wall meets the eaves.
      const edgeRise = (r.halfSpan - f.length / 2) * k;
      return { side, g: gableGeometry(f.length, f.h0, edgeRise, r.halfSpan * k, T) };
    });
  }, [geo, frames, T]);
  useEffect(() => () => gables?.forEach((x) => x.g.dispose()), [gables]);

  // Floor and deck materials tiled to their real size (memoised so textures are not re-cloned every render).
  const floorMat = useMemo(() => tiledMaterial(mats.floor, geo.intW, geo.intD), [mats.floor, geo.intW, geo.intD]);
  useEffect(() => () => disposeMaterial(floorMat), [floorMat]);
  const deckMat = useMemo(() => (geo.deck ? tiledMaterial(mats.deck, geo.deck.width, geo.deck.depth) : null), [mats.deck, geo.deck?.width, geo.deck?.depth]);
  useEffect(() => () => { if (deckMat) disposeMaterial(deckMat); }, [deckMat]);

  // Partition: built like a side wall so its top follows the ceiling, with a door notch near the front.
  const partitionGeo = useMemo(() => {
    if (!geo.partition) return null;
    const L = geo.intD;
    const zFront = hz - T;
    const door = [{ x: 0.575, y: 0, w: 0.85, h: 2.05 }];
    if (geo.roof.type === 'apex') {
      const r = geo.roof;
      const k = Math.tan((r.pitch * Math.PI) / 180);
      if (r.ridgeAxis === 'z') {
        const h = r.wallTop + (r.halfSpan - Math.abs(geo.partition.x)) * k - geo.floorH - 0.01;
        return { wall: wallGeometry(L, h, h, 0.09, door), gable: null };
      }
      const h = r.wallTop + T * k - geo.floorH - 0.01;
      return { wall: wallGeometry(L, h, h, 0.09, door), gable: gableGeometry(L, h, 0, (r.halfSpan - T) * k, 0.09) };
    }
    const h0 = geo.wallTopAt(zFront) - geo.floorH - 0.008;
    const h1 = geo.wallTopAt(-zFront) - geo.floorH - 0.008;
    return { wall: wallGeometry(L, h0, h1, 0.09, door), gable: null };
  }, [geo, hz, T]);
  useEffect(() => () => { partitionGeo?.wall.dispose(); partitionGeo?.gable?.dispose(); }, [partitionGeo]);

  const wallMats = (side: WallSide) => [side === 'front' ? mats.frontCladding : mats.cladding, mats.interior, mats.reveal];

  // Roof top material tiled to the real roof size so standing seams keep a 300mm pitch.
  const roofTop = useMemo(() => {
    const base = mats.roofTop;
    if (geo.roof.type === 'pent') {
      const ov = geo.roof.overhang;
      return tiledMaterial(base, geo.extW + ov.left + ov.right, geo.roof.slab.len);
    }
    const r = geo.roof;
    const slope = (r.halfSpan + r.overhang) / Math.cos((r.pitch * Math.PI) / 180);
    const length = (r.ridgeAxis === 'z' ? hz : hx) * 2 + 2 * r.overhang;
    // Seams run down the slope: along x for a ridge on z, so rotate the pattern.
    return r.ridgeAxis === 'z' ? tiledMaterial(base, slope, length, true) : tiledMaterial(base, length, slope);
  }, [mats.roofTop, geo, hx, hz]);
  useEffect(() => () => disposeMaterial(roofTop), [roofTop]);

  // Roof
  let roofNode: JSX.Element | null = null;
  if (geo.roof.type === 'pent') {
    const r = geo.roof;
    const ov = r.overhang;
    const w = geo.extW + ov.left + ov.right;
    const cx = (ov.right - ov.left) / 2;
    const topMats = [mats.fascia, mats.fascia, roofTop, mats.soffit, mats.fascia, mats.fascia];
    const ang = r.slab.ang;
    roofNode = (
      <group>
        <mesh position={[cx, r.slab.yc, r.slab.zc]} rotation={[-ang, 0, 0]} material={topMats} castShadow receiveShadow>
          <boxGeometry args={[w, geo.roofT, r.slab.len]} />
        </mesh>
        {mats.sedum && (
          // Sedum sits on the slab; its base is 5mm into the roof so the faces never coincide.
          <group position={[cx, r.slab.yc, r.slab.zc]} rotation={[-ang, 0, 0]}>
            <mesh position={[0, geo.roofT / 2 + 0.03, 0]} material={roofTop} castShadow>
              <boxGeometry args={[w - 0.12, 0.07, r.slab.len - 0.12]} />
            </mesh>
          </group>
        )}
      </group>
    );
  } else {
    const r = geo.roof;
    const ov = r.overhang;
    const cos = Math.cos((r.pitch * Math.PI) / 180);
    const k = Math.tan((r.pitch * Math.PI) / 180);
    const ang = (r.pitch * Math.PI) / 180;
    const run = r.halfSpan + ov; // horizontal run from ridge to eave edge
    const slope = run / cos;
    const length = (r.ridgeAxis === 'z' ? hz : hx) * 2 + 2 * ov;
    const topMats = [mats.fascia, mats.fascia, roofTop, mats.soffit, mats.fascia, mats.fascia];
    // Underside line: y = wallTop + (halfSpan - d) * k. Slab centre sits half a thickness above it.
    const dc = run / 2;
    const cy = r.wallTop + (r.halfSpan - dc) * k + geo.roofT / 2 / cos;
    const slab = (sign: number) => {
      const pos: [number, number, number] = r.ridgeAxis === 'z' ? [sign * dc, cy, 0] : [0, cy, sign * dc];
      const rot: [number, number, number] = r.ridgeAxis === 'z' ? [0, 0, -sign * ang] : [sign * ang, 0, 0];
      const size: [number, number, number] = r.ridgeAxis === 'z' ? [slope, geo.roofT, length] : [length, geo.roofT, slope];
      return (
        <mesh key={sign} position={pos} rotation={rot} material={topMats} castShadow receiveShadow>
          <boxGeometry args={size} />
        </mesh>
      );
    };
    // White vaulted ceiling just under each slab, inside the walls.
    const inner = (r.ridgeAxis === 'z' ? geo.intD : geo.intW) + 0.002;
    const vRun = r.halfSpan;
    const vault = (sign: number) => {
      const dcv = vRun / 2;
      const y = r.wallTop + (r.halfSpan - dcv) * k - 0.006;
      const pos: [number, number, number] = r.ridgeAxis === 'z' ? [sign * dcv, y, 0] : [0, y, sign * dcv];
      const rot: [number, number, number] = r.ridgeAxis === 'z' ? [Math.PI / 2, -sign * ang, 0] : [Math.PI / 2 + sign * ang, 0, 0];
      const size: [number, number] = r.ridgeAxis === 'z' ? [vRun / cos, inner] : [inner, vRun / cos];
      return (
        <mesh key={'v' + sign} position={pos} rotation={rot} material={mats.white}>
          <planeGeometry args={size} />
        </mesh>
      );
    };
    const ridge: [number, number, number] = r.ridgeAxis === 'z' ? [0.2, 0.07, length] : [length, 0.07, 0.2];
    roofNode = (
      <group>
        {slab(1)}
        {slab(-1)}
        {vault(1)}
        {vault(-1)}
        <Box size={ridge} position={[0, r.ridgeH - 0.005, 0]} material={mats.fascia} />
      </group>
    );
  }

  // Hood / front frame pieces
  const hoodNodes: JSX.Element[] = [];
  const y0 = 0.03;
  const ft = geo.hood.frameT;
  if (hd > 0.03) {
    const cheekH = H - geo.roofT - y0;
    const cheek = (sign: number) => {
      const x = sign * (hx - ft / 2);
      if (geo.hood.style === 'leanFrame') {
        const shape = new THREE.Shape();
        shape.moveTo(0, y0);
        shape.lineTo(0.14, y0);
        shape.lineTo(hd, H - geo.roofT);
        shape.lineTo(0, H - geo.roofT);
        shape.closePath();
        return (
          <mesh key={'cheek' + sign} position={[x + ft / 2, 0, hz]} rotation={[0, -Math.PI / 2, 0]} material={mats.fascia} castShadow receiveShadow>
            <extrudeGeometry args={[shape, { depth: ft, bevelEnabled: false }]} />
          </mesh>
        );
      }
      if (geo.hood.style === 'curvedCorner') {
        const R = Math.min(hd, 0.9) * 0.98;
        const top = H - geo.roofT + 0.001;
        const shape = new THREE.Shape();
        shape.moveTo(0, y0);
        shape.lineTo(hd, y0);
        shape.lineTo(hd, top - R);
        shape.absarc(hd - R, top - R, R, 0, Math.PI / 2, false);
        shape.lineTo(0, top);
        shape.closePath();
        return (
          <mesh key={'cheek' + sign} position={[x + ft / 2, 0, hz]} rotation={[0, -Math.PI / 2, 0]} material={mats.fascia} castShadow receiveShadow>
            <extrudeGeometry args={[shape, { depth: ft, bevelEnabled: false, curveSegments: 24 }]} />
          </mesh>
        );
      }
      return <Box key={'cheek' + sign} size={[ft, cheekH, hd]} position={[x, y0 + cheekH / 2, hz + hd / 2]} material={mats.fascia} />;
    };
    if (geo.hood.cheeks === 'both') hoodNodes.push(cheek(1), cheek(-1));
    if (geo.hood.cheeks === 'right') hoodNodes.push(cheek(1));
    if (geo.hood.style === 'none' && hd > 0.05) {
      // shallow picture frame around the front elevation (G2/B2)
      hoodNodes.push(
        <Box key="fl" size={[0.1, cheekH, hd]} position={[-(hx - 0.05), y0 + cheekH / 2, hz + hd / 2]} material={mats.fascia} />,
        <Box key="fr" size={[0.1, cheekH, hd]} position={[hx - 0.05, y0 + cheekH / 2, hz + hd / 2]} material={mats.fascia} />,
      );
    }
    if (geo.hood.style === 'curvedCorner') {
      // rounded front edge on the hood slab for the full width
      const R = Math.min(geo.roofT, hd) * 0.5;
      hoodNodes.push(
        <mesh key="hoodround" position={[0, H - geo.roofT / 2, hz + hd - R]} rotation={[0, 0, Math.PI / 2]} material={mats.fascia}>
          <cylinderGeometry args={[geo.roofT / 2, geo.roofT / 2, geo.extW, 16]} />
        </mesh>,
      );
    }
    if (geo.hood.style === 'frontFrame' && geo.model.range === 'x1') {
      // X1 sculpted frame: a bottom return under the doors
      hoodNodes.push(<Box key="x1b" size={[geo.extW, 0.12, hd]} position={[0, y0 + 0.06, hz + hd / 2]} material={mats.fascia} />);
    }
  }

  // Deck
  const deckNode = geo.deck ? (
    <group>
      <mesh position={[0, geo.deck.top - 0.015, hz + geo.deck.depth / 2]} material={deckMat ?? mats.deck} castShadow receiveShadow>
        <boxGeometry args={[geo.deck.width, 0.03, geo.deck.depth]} />
      </mesh>
      <Box size={[geo.deck.width, Math.max(0.02, geo.deck.top - 0.03 - 0.02), geo.deck.depth - 0.03]} position={[0, (geo.deck.top - 0.03) / 2 + 0.01, hz + geo.deck.depth / 2]} material={mats.plinth} />
      {has('deckLights') &&
        Array.from({ length: Math.max(2, Math.floor(geo.deck.width / 0.9)) }).map((_, i, arr) => (
          <mesh key={i} position={[-geo.deck!.width / 2 + ((i + 0.5) * geo.deck!.width) / arr.length, geo.deck!.top + 0.002, hz + geo.deck!.depth - 0.12]} rotation={[-Math.PI / 2, 0, 0]} material={mats.emissive}>
            <circleGeometry args={[0.03, 16]} />
          </mesh>
        ))}
    </group>
  ) : null;

  // Rainwater goods
  const rwp: JSX.Element[] = [];
  const pipeR = 0.034;
  const gutterLen = (wall: WallSide) => (wall === 'front' || wall === 'back' ? geo.extW + 0.4 : geo.intD + 2 * T + 0.4);
  for (const g of geo.gutters) {
    const len = gutterLen(g.wall);
    const pos: [number, number, number] =
      g.wall === 'back' ? [0, g.y, -hz - g.off] : g.wall === 'front' ? [0, g.y, hz + g.off] : g.wall === 'left' ? [-hx - g.off, g.y, 0] : [hx + g.off, g.y, 0];
    const rot: [number, number, number] = g.wall === 'back' || g.wall === 'front' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
    rwp.push(
      <mesh key={'g' + g.wall} position={pos} rotation={rot} material={mats.dark} castShadow>
        <cylinderGeometry args={[0.05, 0.05, len, 16]} />
      </mesh>,
    );
  }
  const up = new THREE.Vector3(0, 1, 0);
  geo.downpipes.forEach((p, i) => {
    const gy = geo.gutters[0].y;
    const neckRise = Math.max(0.12, p.reach * 0.9);
    const topY = gy - 0.05 - neckRise;
    const a = new THREE.Vector3(p.x, topY, p.z);
    const b = new THREE.Vector3(p.x + p.nx * p.reach, gy - 0.04, p.z + p.nz * p.reach);
    const dir = b.clone().sub(a);
    const neckLen = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    const mid = a.clone().add(b).multiplyScalar(0.5);
    rwp.push(
      <group key={'dp' + i}>
        <mesh position={[p.x, topY / 2 + 0.03, p.z]} material={mats.dark} castShadow>
          <cylinderGeometry args={[pipeR, pipeR, topY - 0.06, 14]} />
        </mesh>
        {/* shoe at the base */}
        <mesh position={[p.x + p.nx * 0.03, 0.06, p.z + p.nz * 0.03]} rotation={p.nx ? [0, 0, -p.nx * 0.6] : [p.nz * 0.6, 0, 0]} material={mats.dark}>
          <cylinderGeometry args={[pipeR, pipeR * 1.1, 0.1, 14]} />
        </mesh>
        {neckLen > 0.02 && (
          <mesh position={mid.toArray() as [number, number, number]} quaternion={q} material={mats.dark} castShadow>
            <cylinderGeometry args={[pipeR, pipeR, neckLen + 0.03, 14]} />
          </mesh>
        )}
        <mesh position={[p.x, topY, p.z]} material={mats.dark}>
          <sphereGeometry args={[pipeR, 14, 10]} />
        </mesh>
        {[0.55, Math.max(0.9, topY - 0.35)].map((y) => (
          <Box key={y} size={[p.nx ? 0.07 : 0.1, 0.035, p.nz ? 0.07 : 0.1]} position={[p.x - p.nx * 0.025, y, p.z - p.nz * 0.025]} material={mats.dark} />
        ))}
      </group>,
    );
  });

  // Side screen
  let screenNode: JSX.Element | null = null;
  if (geo.sideScreen) {
    const sx = geo.sideScreen.side === 'left' ? -hx - 0.035 : hx + 0.035;
    const depth = geo.sideScreen.depth;
    const n = Math.floor(depth / 0.09);
    const sh = H - geo.roofT - 0.08;
    screenNode = (
      <group>
        {Array.from({ length: n }).map((_, i) => (
          <Box key={i} size={[0.03, sh, 0.045]} position={[sx, y0 + sh / 2, hz + 0.05 + i * 0.09]} material={mats.screen} />
        ))}
        <Box size={[0.05, 0.05, depth]} position={[sx, y0 + sh + 0.025, hz + depth / 2]} material={mats.frame} />
        <Box size={[0.05, 0.05, depth]} position={[sx, y0 + 0.025, hz + depth / 2]} material={mats.frame} />
      </group>
    );
  }

  // Exterior fittings
  const door = geo.openings.find((o) => o.kind === 'door')!;
  const extLightS = Math.min(geo.extW - 0.25, door.s + door.w / 2 + 0.28);
  const extLightX = -hx + extLightS;
  const fittings: JSX.Element[] = [];
  if (has('extLightUpDown')) fittings.push(<Box key="ul" size={[0.08, 0.22, 0.08]} position={[extLightX, geo.floorH + 2.0, hz + 0.04]} material={mats.dark} />);
  if (has('extLightTorch'))
    fittings.push(
      <group key="tl" position={[extLightX, geo.floorH + 2.0, hz + 0.06]}>
        <Box size={[0.06, 0.12, 0.08]} position={[0, 0.06, -0.03]} material={mats.dark} />
        <mesh position={[0, -0.03, 0.03]} rotation={[Math.PI / 2, 0, 0]} material={mats.dark}>
          <cylinderGeometry args={[0.045, 0.03, 0.09, 12]} />
        </mesh>
      </group>,
    );
  if (geo.model.range === 'x1') fittings.push(<Box key="x1l" size={[0.5, 0.03, 0.03]} position={[door.s - hx, H - geo.roofT - 0.04, hz + hd - 0.05]} material={mats.emissive} />);
  if (has('outsideSocket')) fittings.push(<Box key="os" size={[0.09, 0.14, 0.05]} position={[Math.min(hx - 0.3, extLightX + 0.15), geo.floorH + 0.45, hz + 0.025]} material={mats.white} />);
  if (has('extractor')) fittings.push(<Box key="ef" size={[0.16, 0.16, 0.04]} position={[hx - 0.5, geo.floorH + geo.wallH - 0.35, -hz - 0.02]} material={mats.white} />);
  if (has('aircon'))
    fittings.push(
      <group key="ac">
        <Box size={[0.8, 0.55, 0.3]} position={[hx - 0.9, 0.42, -hz - 0.2]} material={mats.white} />
        <mesh position={[hx - 0.9, 0.42, -hz - 0.36]} rotation={[Math.PI / 2, 0, 0]} material={mats.dark}>
          <cylinderGeometry args={[0.2, 0.2, 0.01, 24]} />
        </mesh>
        <Box size={[0.9, 0.3, 0.2]} position={[0, geo.floorH + geo.wallH - 0.4, -hz + T + 0.1]} material={mats.white} />
      </group>,
    );
  if (has('hoodLights') && hd > 0.1)
    fittings.push(
      <group key="hl">
        {Array.from({ length: Math.max(2, Math.floor(geo.extW / 0.9)) }).map((_, i, arr) => (
          <mesh key={i} position={[-geo.extW / 2 + ((i + 0.5) * geo.extW) / arr.length, geo.wallTopAt(hz + hd / 2) - 0.003, hz + hd / 2]} rotation={[Math.PI / 2, 0, 0]} material={mats.emissive}>
            <circleGeometry args={[0.035, 16]} />
          </mesh>
        ))}
      </group>,
    );
  if (has('solar')) {
    const panels: JSX.Element[] = [];
    if (geo.roof.type === 'apex') {
      const r = geo.roof;
      const a = (r.pitch * Math.PI) / 180;
      const k = Math.tan(a);
      const along = (r.ridgeAxis === 'z' ? hz : hx) * 2;
      const n = Math.max(1, Math.min(4, Math.floor((along - 0.4) / 1.1)));
      const d = (r.halfSpan + r.overhang) * 0.5;
      const y = r.wallTop + (r.halfSpan - d) * k + geo.roofT / Math.cos(a) + 0.04 / Math.cos(a);
      for (let i = 0; i < n; i++) {
        const t = -((n - 1) * 1.1) / 2 + i * 1.1;
        panels.push(
          r.ridgeAxis === 'z' ? (
            <Box key={i} size={[1.7, 0.04, 1.0]} position={[d, y, t]} rotation={[0, 0, -a]} material={mats.solar} />
          ) : (
            <Box key={i} size={[1.0, 0.04, 1.7]} position={[t, y, d]} rotation={[a, 0, 0]} material={mats.solar} />
          ),
        );
      }
    } else {
      const r = geo.roof;
      const n = Math.max(1, Math.min(4, Math.floor((geo.extW - 0.6) / 1.1)));
      const lift = geo.roofT / 2 + (mats.sedum ? 0.12 : 0.06);
      for (let i = 0; i < n; i++) {
        const x = -((n - 1) * 1.1) / 2 + i * 1.1;
        panels.push(<Box key={i} size={[1.0, 0.04, 1.7]} position={[x, lift, 0]} material={mats.solar} />);
      }
      fittings.push(
        <group key="solar" position={[0, r.slab.yc, r.slab.zc]} rotation={[-r.slab.ang, 0, 0]}>
          {panels}
        </group>,
      );
    }
    if (geo.roof.type === 'apex') fittings.push(<group key="solar">{panels}</group>);
  }

  // Interior
  const interior: JSX.Element[] = [];
  const isApex = geo.roof.type === 'apex';
  let ceilY: number;
  let ceilRotY = 0;
  let alongX = geo.intW; // span of ceiling fittings along the group's local x
  let acrossZ = geo.intD; // span along local z (0 = fittings sit on a single line, e.g. a ridge)
  let ridgeLift = 0; // apex only: how far above the fitting plane the ridge underside sits
  if (geo.roof.type === 'apex') {
    const r = geo.roof;
    const k = Math.tan((r.pitch * Math.PI) / 180);
    // Fittings hang at the height of the vault 350mm out from the ridge so a 600mm panel clears both slopes.
    ceilY = r.wallTop + (r.halfSpan - 0.35) * k - 0.02;
    ridgeLift = 0.35 * k + 0.016;
    ceilRotY = r.ridgeAxis === 'z' ? Math.PI / 2 : 0;
    alongX = r.ridgeAxis === 'z' ? geo.intD : geo.intW;
    acrossZ = 0;
  } else {
    ceilY = geo.wallTopAt(0) - 0.006;
  }
  const tilt = geo.ceilingTilt;
  const ceiling: JSX.Element[] = [];
  if (!isApex)
    ceiling.push(
      <mesh key="ceil" rotation={[Math.PI / 2, 0, 0]} material={mats.white}>
        <planeGeometry args={[geo.intW + 0.002, geo.intD / Math.cos(tilt) + 0.002]} />
      </mesh>,
    );
  ceiling.push(<pointLight key="pl" position={[0, -0.35, 0]} intensity={geo.intW * 1.2} distance={12} decay={2} color="#fff1dc" />);
  if (has('ledPanel')) ceiling.push(<Box key="led" size={[0.6, 0.012, 0.6]} position={[0, -0.009, 0]} material={mats.emissive} castShadow={false} />);
  if (has('halo')) {
    if (!isApex) ceiling.push(<Box key="halobox" size={[geo.intW - 0.5, 0.12, geo.intD - 0.5]} position={[0, -0.062, 0]} material={mats.white} castShadow={false} />);
    ceiling.push(
      <mesh key="ring" position={[0, isApex ? -0.12 : -0.127, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.emissive}>
        <torusGeometry args={[isApex ? 0.3 : Math.min(geo.intW, geo.intD) * 0.22, 0.02, 10, 48]} />
      </mesh>,
    );
  }
  if (has('recessedSpots') || has('halo')) {
    // Spots sit flush with the ceiling; on an apex they run along the ridge.
    const y = has('halo') && !isApex ? -0.127 : ridgeLift - 0.004;
    const pts: [number, number][] = acrossZ > 0 ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : [[-1.2, 0], [-0.4, 0], [0.4, 0], [1.2, 0]];
    ceiling.push(
      <group key="spots">
        {pts.map(([a, b]) => (
          <mesh key={a + ':' + b} position={[a * alongX * 0.3, y, b * acrossZ * 0.3]} rotation={[Math.PI / 2, 0, 0]} material={mats.emissive}>
            <circleGeometry args={[0.04, 16]} />
          </mesh>
        ))}
      </group>,
    );
  }
  if (has('trackLights')) {
    const tl = Math.min(1.6, alongX - 0.6);
    ceiling.push(
      <group key="track">
        <Box size={[tl, 0.03, 0.04]} position={[0, -0.02, 0]} material={mats.dark} castShadow={false} />
        {[-0.6, -0.2, 0.2, 0.6].map((x) => (
          <mesh key={x} position={[x * tl * 0.6, -0.09, 0]} material={mats.dark}>
            <cylinderGeometry args={[0.035, 0.03, 0.1, 12]} />
          </mesh>
        ))}
      </group>,
    );
  }
  if (has('circularLight'))
    ceiling.push(
      <mesh key="circ" position={[0, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.dark}>
        <torusGeometry args={[0.3, 0.025, 10, 40]} />
      </mesh>,
    );
  interior.push(
    <mesh key="floor" position={[0, geo.floorH - 0.01, 0]} material={floorMat} receiveShadow>
      <boxGeometry args={[geo.intW, 0.02, geo.intD]} />
    </mesh>,
    <group key="ceiling" position={[0, ceilY, 0]} rotation={[-tilt, ceilRotY, 0]}>
      {ceiling}
    </group>,
  );
  if (has('upDownLights'))
    [-1, 1].forEach((s) => interior.push(<Box key={'ud' + s} size={[0.08, 0.2, 0.08]} position={[s * (geo.intW / 2 - 0.5), geo.floorH + 1.9, -hz + T + 0.045]} material={mats.dark} castShadow={false} />));
  if (has('radiator') || has('radiator2kw')) interior.push(<Box key="rad" size={[0.9, 0.55, 0.07]} position={[-geo.intW * 0.25, geo.floorH + 0.42, -hz + T + 0.04]} material={mats.white} castShadow={false} />);
  if (partitionGeo && geo.partition) {
    const px = geo.partition.x;
    interior.push(
      <group key="part" position={[px - 0.045, geo.floorH, hz - T]} rotation={[0, Math.PI / 2, 0]}>
        <mesh geometry={partitionGeo.wall} material={[mats.interior, mats.interior, mats.interior]} castShadow receiveShadow />
        {partitionGeo.gable && <mesh geometry={partitionGeo.gable} material={[mats.interior, mats.interior, mats.interior]} castShadow receiveShadow />}
        {/* internal door leaf, set within the partition thickness */}
        <Box size={[0.78, 2.0, 0.04]} position={[0.575, 1.002, 0.045]} material={mats.white} castShadow={false} />
      </group>,
    );
  }

  return (
    <group>
      {/* plinth / base */}
      {/* plinth / base: stops 30mm below the floor so their top faces never coincide */}
      <Box size={[geo.extW - 0.12, geo.floorH - 0.03, geo.intD + 2 * T - 0.12]} position={[0, (geo.floorH - 0.03) / 2, 0]} material={mats.plinth} />
      {/* walls and openings */}
      {(['front', 'back', 'left', 'right'] as WallSide[]).map((side) => {
        const f = frames[side];
        return (
          <group key={side} position={f.position} rotation={[0, f.rotationY, 0]}>
            <mesh geometry={walls[side]} material={wallMats(side)} castShadow receiveShadow />
            {gables?.filter((g) => g.side === side).map((g) => <mesh key="gable" geometry={g.g} material={wallMats(side)} castShadow receiveShadow />)}
            {geo.openings
              .filter((o) => o.wall === side)
              .map((o) => {
                const lo = { ...o, s: o.s - f.sOffset };
                return o.kind === 'door' ? <DoorSet key={o.id} o={lo} T={T} mats={mats} /> : <WindowUnit key={o.id} o={lo} T={T} mats={mats} />;
              })}
          </group>
        );
      })}
      {roofNode}
      {hoodNodes}
      {deckNode}
      {rwp}
      {screenNode}
      {fittings}
      {interior}
    </group>
  );
}

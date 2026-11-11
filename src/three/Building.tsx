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

function wallGeometry(L: number, H: number, T: number, holes: { x: number; y: number; w: number; h: number }[]) {
  const shape = new THREE.Shape();
  // Openings touching the right or left edge become notches (corner windows).
  const notchR = holes.find((h) => h.x + h.w / 2 >= L - 0.015);
  const notchL = holes.find((h) => h.x - h.w / 2 <= 0.015);
  const pts: [number, number][] = [[0, 0], [L, 0]];
  if (notchR) pts.push([L, notchR.y], [notchR.x - notchR.w / 2, notchR.y], [notchR.x - notchR.w / 2, notchR.y + notchR.h], [L, notchR.y + notchR.h]);
  pts.push([L, H], [0, H]);
  if (notchL) pts.push([0, notchL.y + notchL.h], [notchL.x + notchL.w / 2, notchL.y + notchL.h], [notchL.x + notchL.w / 2, notchL.y], [0, notchL.y]);
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  for (const h of holes) {
    if (h === notchR || h === notchL) continue;
    const p = new THREE.Path();
    const x0 = h.x - h.w / 2, y0 = h.y, x1 = h.x + h.w / 2, y1 = Math.min(h.y + h.h, H - 0.04);
    p.moveTo(x0, y0);
    p.lineTo(x0, y1);
    p.lineTo(x1, y1);
    p.lineTo(x1, y0);
    p.closePath();
    shape.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false });
  // Lid faces: z=0 (interior) first, then z=T (exterior). Split so each gets its own material.
  const lid = g.groups[0];
  const side = g.groups[1];
  g.clearGroups();
  g.addGroup(lid.start, lid.count / 2, 1);
  g.addGroup(lid.start + lid.count / 2, lid.count / 2, 0);
  if (side) g.addGroup(side.start, side.count, 2);
  return g;
}

function gableGeometry(L: number, H0: number, rise: number, T: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, H0 - 0.001);
  shape.lineTo(L, H0 - 0.001);
  shape.lineTo(L / 2, H0 + rise);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false });
  const lid = g.groups[0];
  const side = g.groups[1];
  g.clearGroups();
  g.addGroup(lid.start, lid.count / 2, 1);
  g.addGroup(lid.start + lid.count / 2, lid.count / 2, 0);
  if (side) g.addGroup(side.start, side.count, 2);
  return g;
}

interface WallFrame {
  position: [number, number, number];
  rotationY: number;
  length: number;
  sOffset: number; // subtract from external s to get local x
}

function wallFrames(geo: BuildingGeometry): Record<WallSide, WallFrame> {
  const hx = geo.intW / 2 + geo.wallT;
  const hz = geo.intD / 2 + geo.wallT;
  const t = geo.wallT;
  return {
    front: { position: [-hx, geo.floorH, hz - t], rotationY: 0, length: geo.extW, sOffset: 0 },
    right: { position: [hx - t, geo.floorH, hz - t], rotationY: Math.PI / 2, length: geo.intD, sOffset: t },
    left: { position: [-(hx - t), geo.floorH, -(hz - t)], rotationY: -Math.PI / 2, length: geo.intD, sOffset: t },
    back: { position: [hx, geo.floorH, -(hz - t)], rotationY: Math.PI, length: geo.extW, sOffset: 0 },
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
      out[side] = wallGeometry(f.length, geo.wallH, T, holes);
    });
    return out as Record<WallSide, THREE.BufferGeometry>;
  }, [geo, frames, T]);
  useEffect(() => () => Object.values(walls).forEach((g) => g.dispose()), [walls]);

  const gables = useMemo(() => {
    if (geo.roof.type !== 'apex') return null;
    const rise = geo.roof.ridgeH - geo.roof.eavesH + 0.05;
    const sides: WallSide[] = geo.roof.ridgeAxis === 'z' ? ['front', 'back'] : ['left', 'right'];
    return sides.map((side) => ({ side, g: gableGeometry(frames[side].length, geo.wallH, rise, T) }));
  }, [geo, frames, T]);
  useEffect(() => () => gables?.forEach((x) => x.g.dispose()), [gables]);

  const wallMats = (side: WallSide) => [side === 'front' ? mats.frontCladding : mats.cladding, mats.interior, mats.reveal];

  // Roof
  let roofNode: JSX.Element | null = null;
  let gutterY = H - geo.roofT - 0.03;
  if (geo.roof.type === 'pent') {
    const ov = geo.roof.overhang;
    const zF = hz + ov.front;
    const zB = -hz - ov.back;
    const w = geo.extW + ov.left + ov.right;
    const len = zF - zB;
    const topMats = [mats.fascia, mats.fascia, mats.roofTop, mats.soffit, mats.fascia, mats.fascia];
    if (geo.hood.style === 'allSides') {
      const fall = geo.roof.fall;
      const ang = Math.atan2(fall, len);
      const slabLen = Math.hypot(len, fall);
      gutterY = H - fall - geo.roofT - 0.02;
      roofNode = (
        <group>
          <mesh position={[(ov.right - ov.left) / 2, H - geo.roofT / 2 - fall / 2, (zF + zB) / 2]} rotation={[-ang, 0, 0]} material={topMats} castShadow receiveShadow>
            <boxGeometry args={[w, geo.roofT, slabLen]} />
          </mesh>
          {mats.sedum && (
            <mesh position={[(ov.right - ov.left) / 2, H - fall / 2 + 0.035, (zF + zB) / 2]} rotation={[-ang, 0, 0]} material={mats.roofTop} castShadow>
              <boxGeometry args={[w - 0.1, 0.07, slabLen - 0.1]} />
            </mesh>
          )}
        </group>
      );
    } else {
      roofNode = (
        <group>
          <mesh position={[(ov.right - ov.left) / 2, H - geo.roofT / 2, (zF + zB) / 2]} material={topMats} castShadow receiveShadow>
            <boxGeometry args={[w, geo.roofT, len]} />
          </mesh>
          {/* hidden pent fall: inner steel deck visible from above */}
          <mesh position={[0, H - geo.roofT - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.dark}>
            <planeGeometry args={[geo.extW - 0.2, geo.extD - 0.2]} />
          </mesh>
          {mats.sedum && (
            <mesh position={[(ov.right - ov.left) / 2, H + 0.035, (zF + zB) / 2]} material={mats.roofTop} castShadow>
              <boxGeometry args={[w - 0.12, 0.07, len - 0.12]} />
            </mesh>
          )}
        </group>
      );
    }
  } else {
    const r = geo.roof;
    const ov = r.overhang;
    const rise = r.ridgeH - r.eavesH;
    const halfSpan = (r.ridgeAxis === 'z' ? hx : hz) + ov;
    const slope = Math.hypot(halfSpan, rise);
    const ang = Math.atan2(rise, halfSpan);
    const length = (r.ridgeAxis === 'z' ? hz : hx) * 2 + 2 * ov;
    const topMats = [mats.fascia, mats.fascia, mats.roofTop, mats.soffit, mats.fascia, mats.fascia];
    const slab = (sign: number) => {
      const cx = (sign * halfSpan) / 2;
      const cy = r.eavesH + rise / 2 - 0.02;
      const pos: [number, number, number] = r.ridgeAxis === 'z' ? [cx, cy, 0] : [0, cy, cx];
      const rot: [number, number, number] = r.ridgeAxis === 'z' ? [0, 0, -sign * ang] : [sign * ang, 0, 0];
      const size: [number, number, number] = r.ridgeAxis === 'z' ? [slope, geo.roofT, length] : [length, geo.roofT, slope];
      return (
        <mesh key={sign} position={pos} rotation={rot} material={topMats} castShadow receiveShadow>
          <boxGeometry args={size} />
        </mesh>
      );
    };
    const ridge: [number, number, number] = r.ridgeAxis === 'z' ? [0.16, 0.06, length] : [length, 0.06, 0.16];
    roofNode = (
      <group>
        {slab(1)}
        {slab(-1)}
        <Box size={ridge} position={[0, r.ridgeH + 0.02, 0]} material={mats.fascia} />
      </group>
    );
    gutterY = r.eavesH - 0.06;
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
      <mesh position={[0, geo.deck.top - 0.015, hz + geo.deck.depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[geo.deck.width, 0.03, geo.deck.depth]} />
        <meshStandardMaterial map={repeated(mats.deck.map!, geo.deck.width, geo.deck.depth)} bumpMap={repeated(mats.deck.bumpMap!, geo.deck.width, geo.deck.depth)} bumpScale={1.2} roughness={0.8} />
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
  const gutterLen = (wall: WallSide) => (wall === 'front' || wall === 'back' ? geo.extW + 0.5 : geo.intD + 2 * T + 0.5);
  for (const g of geo.gutters) {
    const len = gutterLen(g.wall);
    const off = geo.roof.type === 'apex' ? geo.roof.overhang + 0.05 : 0.08;
    const pos: [number, number, number] =
      g.wall === 'back' ? [0, gutterY, -hz - off] : g.wall === 'front' ? [0, gutterY, hz + off] : g.wall === 'left' ? [-hx - off, gutterY, 0] : [hx + off, gutterY, 0];
    const rot: [number, number, number] = g.wall === 'back' || g.wall === 'front' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
    rwp.push(
      <mesh key={'g' + g.wall} position={pos} rotation={rot} material={mats.dark} castShadow>
        <cylinderGeometry args={[0.05, 0.05, len, 14]} />
      </mesh>,
    );
  }
  geo.downpipes.forEach((p, i) => {
    rwp.push(
      <group key={'dp' + i}>
        <mesh position={[p.x, (gutterY - 0.1) / 2 + 0.05, p.z]} material={mats.dark} castShadow>
          <cylinderGeometry args={[pipeR, pipeR, gutterY - 0.1, 12]} />
        </mesh>
        <mesh position={[p.x, gutterY - 0.07, p.z]} material={mats.dark}>
          <sphereGeometry args={[pipeR * 1.15, 12, 12]} />
        </mesh>
        <Box size={[0.09, 0.03, 0.09]} position={[p.x, 0.5, p.z]} material={mats.dark} />
        <Box size={[0.09, 0.03, 0.09]} position={[p.x, gutterY - 0.6, p.z]} material={mats.dark} />
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
          <mesh key={i} position={[-geo.extW / 2 + ((i + 0.5) * geo.extW) / arr.length, H - geo.roofT - 0.003, hz + hd / 2]} rotation={[Math.PI / 2, 0, 0]} material={mats.emissive}>
            <circleGeometry args={[0.035, 16]} />
          </mesh>
        ))}
      </group>,
    );
  if (has('solar')) {
    const n = Math.max(1, Math.min(4, Math.floor((geo.extW - 0.6) / 1.1)));
    const isPent = geo.roof.type === 'pent';
    const sloped = isPent && geo.hood.style === 'allSides';
    const fall = geo.roof.type === 'pent' ? geo.roof.fall : 0;
    const ang = sloped ? Math.atan2(fall, geo.extD + 0.3) : 0;
    fittings.push(
      <group key="solar">
        {Array.from({ length: n }).map((_, i) => {
          const x = -((n - 1) * 1.1) / 2 + i * 1.1;
          if (geo.roof.type === 'apex') {
            const r = geo.roof;
            const rise = r.ridgeH - r.eavesH;
            const half = (r.ridgeAxis === 'z' ? hx : hz) + r.overhang;
            const a = Math.atan2(rise, half);
            const d = half * 0.5;
            const yy = r.eavesH + rise * 0.5 + 0.1;
            const pos: [number, number, number] = r.ridgeAxis === 'z' ? [-d, yy, x] : [x, yy, d];
            const rot: [number, number, number] = r.ridgeAxis === 'z' ? [0, 0, -a] : [a, 0, 0];
            return <Box key={i} size={r.ridgeAxis === 'z' ? [1.7, 0.04, 1.0] : [1.0, 0.04, 1.7]} position={pos} rotation={rot} material={mats.solar} />;
          }
          return <Box key={i} size={[1.0, 0.04, 1.7]} position={[x, H + 0.03 + 0.12 - (sloped ? fall * 0.5 : 0), 0]} rotation={[-ang, 0, 0]} material={mats.solar} />;
        })}
      </group>,
    );
  }

  // Interior
  const interior: JSX.Element[] = [];
  const ceilY = geo.floorH + geo.wallH - 0.005;
  interior.push(
    <mesh key="floor" position={[0, geo.floorH - 0.01, 0]} receiveShadow>
      <boxGeometry args={[geo.intW, 0.02, geo.intD]} />
      <meshStandardMaterial map={repeated(mats.floor.map!, geo.intW, geo.intD)} bumpMap={repeated(mats.floor.bumpMap!, geo.intW, geo.intD)} bumpScale={0.5} roughness={mats.floor.roughness} />
    </mesh>,
    <mesh key="ceil" position={[0, ceilY, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.white}>
      <planeGeometry args={[geo.intW, geo.intD]} />
    </mesh>,
    <pointLight key="pl" position={[0, ceilY - 0.3, 0]} intensity={geo.intW * 1.2} distance={12} decay={2} color="#fff1dc" />,
  );
  if (has('ledPanel')) interior.push(<Box key="led" size={[0.6, 0.012, 0.6]} position={[0, ceilY - 0.006, 0]} material={mats.emissive} castShadow={false} />);
  if (has('halo'))
    interior.push(
      <group key="halo">
        <Box size={[geo.intW - 0.5, 0.12, geo.intD - 0.5]} position={[0, ceilY - 0.06, 0]} material={mats.white} castShadow={false} />
        <mesh position={[0, ceilY - 0.125, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.emissive}>
          <torusGeometry args={[Math.min(geo.intW, geo.intD) * 0.22, 0.02, 10, 48]} />
        </mesh>
      </group>,
    );
  if (has('recessedSpots') || has('halo'))
    interior.push(
      <group key="spots">
        {[-1, 1].flatMap((a) =>
          [-1, 1].map((b) => (
            <mesh key={a + ':' + b} position={[a * geo.intW * 0.3, ceilY - (has('halo') ? 0.125 : 0.003), b * geo.intD * 0.3]} rotation={[Math.PI / 2, 0, 0]} material={mats.emissive}>
              <circleGeometry args={[0.04, 16]} />
            </mesh>
          )),
        )}
      </group>,
    );
  if (has('trackLights'))
    interior.push(
      <group key="track">
        <Box size={[Math.min(1.6, geo.intW - 0.6), 0.03, 0.04]} position={[0, ceilY - 0.02, 0]} material={mats.dark} castShadow={false} />
        {[-0.6, -0.2, 0.2, 0.6].map((x) => (
          <mesh key={x} position={[x * Math.min(1.6, geo.intW - 0.6) * 0.6, ceilY - 0.09, 0]} material={mats.dark}>
            <cylinderGeometry args={[0.035, 0.03, 0.1, 12]} />
          </mesh>
        ))}
      </group>,
    );
  if (has('upDownLights'))
    [-1, 1].forEach((s) => interior.push(<Box key={'ud' + s} size={[0.08, 0.2, 0.08]} position={[s * (geo.intW / 2 - 0.5), geo.floorH + 1.9, -hz + T + 0.04]} material={mats.dark} castShadow={false} />));
  if (has('circularLight'))
    interior.push(
      <mesh key="circ" position={[0, ceilY - 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.dark}>
        <torusGeometry args={[0.3, 0.025, 10, 40]} />
      </mesh>,
    );
  if (has('radiator') || has('radiator2kw')) interior.push(<Box key="rad" size={[0.9, 0.55, 0.07]} position={[-geo.intW * 0.25, geo.floorH + 0.42, -hz + T + 0.04]} material={mats.white} castShadow={false} />);
  if (geo.partition) {
    const px = geo.partition.x;
    const gapZ0 = hz - T - 0.15 - 0.85;
    const len0 = gapZ0 - (-hz + T);
    interior.push(
      <group key="part">
        <Box size={[0.09, geo.wallH, len0]} position={[px, geo.floorH + geo.wallH / 2, -hz + T + len0 / 2]} material={mats.interior} />
        <Box size={[0.09, geo.wallH, 0.15]} position={[px, geo.floorH + geo.wallH / 2, hz - T - 0.075]} material={mats.interior} />
        <Box size={[0.09, geo.wallH - 2.05, 0.85]} position={[px, geo.floorH + 2.05 + (geo.wallH - 2.05) / 2, gapZ0 + 0.425]} material={mats.interior} />
        <Box size={[0.04, 2.0, 0.78]} position={[px + 0.045, geo.floorH + 1.0, gapZ0 + 0.425]} material={mats.white} />
      </group>,
    );
  }

  return (
    <group>
      {/* plinth / base */}
      <Box size={[geo.extW - 0.12, geo.floorH, geo.intD + 2 * T - 0.12]} position={[0, geo.floorH / 2, 0]} material={mats.plinth} />
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

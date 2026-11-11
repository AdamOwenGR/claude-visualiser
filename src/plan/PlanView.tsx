// 2D CAD-style top-down floor plan, drawn from the same geometry as the 3D view.
import { DOORS, type WallSide } from '../data/catalogue';
import type { BuildingGeometry, DesignConfig, Opening } from '../model/geometry';

const INK = '#1f2328';
const DIM = '#2b5a9e';
const HATCH = '#9aa3ad';
const LIGHT = '#8a9099';

const fmt = (m: number) => `${Math.round(m * 1000)}`;
const fmtM = (m: number) => `${(Math.round(m * 100) / 100).toFixed(2)}m`;
const MONO = "'IBM Plex Mono', 'SFMono-Regular', Menlo, monospace";
const SANS = 'Inter, system-ui, sans-serif';

/** Convert a wall-local s (viewed from outside) into plan coordinates. Plan: x right, y down = towards the front (south). */
function wallToPlan(geo: BuildingGeometry, wall: WallSide, s: number) {
  const p = geo.wallPoint(wall, s);
  return { x: p.x, y: p.z, nx: p.nx, ny: p.nz };
}

function DoorSymbol({ geo, o }: { geo: BuildingGeometry; o: Opening }) {
  const T = geo.wallT;
  const p = wallToPlan(geo, o.wall, o.s);
  // door lies along the wall; local u along the wall (left->right from outside), v outward.
  const ang = o.wall === 'front' ? 0 : o.wall === 'back' ? 180 : o.wall === 'right' ? -90 : 90;
  const spec = DOORS[o.type];
  const kind = spec?.kind ?? 'french';
  const w = o.w;
  const leaves = Math.max(1, o.leaves);
  const items: JSX.Element[] = [];
  const lw = 0.014;
  if (kind === 'french' || kind === 'single' || kind === 'combi') {
    const swing = kind === 'single' ? 1 : kind === 'combi' ? 2 : 2;
    const fixed = kind === 'combi' ? (leaves - swing) / 2 : 0;
    const leafW = kind === 'combi' ? (w - fixed * 2 * (w / leaves)) / swing : w / Math.max(1, swing);
    // fixed side panes for combi
    if (fixed > 0) {
      const pw = w / leaves;
      for (let i = 0; i < fixed; i++) {
        items.push(<rect key={'fl' + i} x={-w / 2 + i * pw} y={-T * 0.55} width={pw} height={T * 0.3} fill="#fff" stroke={INK} strokeWidth={lw} />);
        items.push(<rect key={'fr' + i} x={w / 2 - (i + 1) * pw} y={-T * 0.55} width={pw} height={T * 0.3} fill="#fff" stroke={INK} strokeWidth={lw} />);
      }
    }
    const start = -w / 2 + fixed * (w / leaves);
    for (let i = 0; i < swing; i++) {
      const hinge = i === 0 ? start : start + swing * leafW;
      const dir = i === 0 ? 1 : -1;
      // leaf opened 90° outwards (+v), arc from hinge
      items.push(<line key={'leaf' + i} x1={hinge} y1={-T * 0.4} x2={hinge} y2={-T * 0.4 + leafW * 1} stroke={INK} strokeWidth={0.03} />);
      items.push(
        <path key={'arc' + i} d={`M ${hinge} ${-T * 0.4 + leafW} A ${leafW} ${leafW} 0 0 ${dir === 1 ? 0 : 1} ${hinge + dir * leafW} ${-T * 0.4}`} fill="none" stroke={INK} strokeWidth={0.008} strokeDasharray="0.04 0.03" />,
      );
    }
  } else if (kind === 'sliding') {
    const n = leaves;
    const pw = w / n + 0.05;
    for (let i = 0; i < n; i++) {
      const y = i % 2 === 0 ? -T * 0.62 : -T * 0.38;
      items.push(<rect key={'s' + i} x={-w / 2 + (i * w) / n - (i > 0 ? 0.05 : 0)} y={y - T * 0.12} width={pw} height={T * 0.24} fill="#fff" stroke={INK} strokeWidth={lw} />);
    }
    items.push(<path key="arrow" d={`M ${-w * 0.25} ${T * 0.6} l ${w * 0.5} 0 m -0.12 -0.08 l 0.12 0.08 l -0.12 0.08`} fill="none" stroke={LIGHT} strokeWidth={0.012} />);
  } else {
    // bi-fold: zig-zag of leaves folded outward
    const n = leaves;
    const pw = w / n;
    let d = `M ${-w / 2} ${-T * 0.4}`;
    for (let i = 0; i < n; i++) d += ` L ${-w / 2 + (i + 0.5) * pw} ${-T * 0.4 + pw * 0.6} L ${-w / 2 + (i + 1) * pw} ${-T * 0.4}`;
    items.push(<path key="bf" d={d} fill="none" stroke={INK} strokeWidth={0.03} strokeLinejoin="round" />);
  }
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${ang})`}>
      {/* opening in wall */}
      <rect x={-w / 2} y={-T} width={w} height={T} fill="#fff" stroke="none" />
      <line x1={-w / 2} y1={-T} x2={-w / 2} y2={0} stroke={INK} strokeWidth={lw} />
      <line x1={w / 2} y1={-T} x2={w / 2} y2={0} stroke={INK} strokeWidth={lw} />
      {/* threshold */}
      <line x1={-w / 2} y1={-T * 0.15} x2={w / 2} y2={-T * 0.15} stroke={LIGHT} strokeWidth={0.008} />
      {items}
    </g>
  );
}

function WindowSymbol({ geo, o }: { geo: BuildingGeometry; o: Opening }) {
  const T = geo.wallT;
  const p = wallToPlan(geo, o.wall, o.s);
  const ang = o.wall === 'front' ? 0 : o.wall === 'back' ? 180 : o.wall === 'right' ? -90 : 90;
  const w = o.w;
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${ang})`}>
      <rect x={-w / 2} y={-T} width={w} height={T} fill="#fff" stroke="none" />
      <line x1={-w / 2} y1={-T} x2={-w / 2} y2={0} stroke={INK} strokeWidth={0.014} />
      <line x1={w / 2} y1={-T} x2={w / 2} y2={0} stroke={INK} strokeWidth={0.014} />
      <line x1={-w / 2} y1={-T * 0.62} x2={w / 2} y2={-T * 0.62} stroke={INK} strokeWidth={0.012} />
      <line x1={-w / 2} y1={-T * 0.42} x2={w / 2} y2={-T * 0.42} stroke={INK} strokeWidth={0.012} />
      {o.opening && <path d={`M ${-w / 2} ${-T * 0.42} L 0 ${-T * 0.42 + w * 0.22} L ${w / 2} ${-T * 0.42}`} fill="none" stroke={LIGHT} strokeWidth={0.008} strokeDasharray="0.03 0.02" />}
    </g>
  );
}

/** How far a door's leaves or symbol project outside the front face, so dimensions can clear it. */
function doorReach(o: Opening, T: number) {
  const kind = DOORS[o.type]?.kind ?? 'french';
  const leaves = Math.max(1, o.leaves);
  if (kind === 'sliding') return T * 0.6 + 0.1;
  if (kind === 'bifold') return (o.w / leaves) * 0.6;
  const swing = kind === 'single' ? 1 : 2;
  const fixed = kind === 'combi' ? (leaves - swing) / 2 : 0;
  const leafW = kind === 'combi' ? (o.w - fixed * 2 * (o.w / leaves)) / swing : o.w / swing;
  return leafW;
}

interface ChainProps {
  axis: 'x' | 'y'; // 'x' = horizontal string (points are x values), 'y' = vertical string
  points: number[];
  at: number; // position of the dimension line on the other axis
  base: number; // where witness lines start (just clear of the drawing)
  colour?: string;
  label?: (len: number, i: number) => string;
  k?: number; // drawing scale factor: text, ticks and offsets grow with the building
}

/**
 * A CAD dimension chain: one line, a tick at every point, a value per segment.
 * Values that do not fit inside their segment are staggered onto the far side of the line.
 */
function Chain({ axis, points, at, base, colour = DIM, label, k = 1 }: ChainProps) {
  const fs = 0.115 * k;
  const pts = [...new Set(points.map((p) => Math.round(p * 1000) / 1000))].sort((a, b) => a - b);
  if (pts.length < 2) return null;
  const dir = Math.sign(at - base) || 1;
  const tick = 0.06 * k;
  const out: JSX.Element[] = [];
  const P = (along: number, across: number) => (axis === 'x' ? { x: along, y: across } : { x: across, y: along });
  const a0 = P(pts[0], at);
  const a1 = P(pts[pts.length - 1], at);
  out.push(<line key="l" x1={a0.x} y1={a0.y} x2={a1.x} y2={a1.y} stroke={colour} strokeWidth={0.01 * k} />);
  pts.forEach((v, i) => {
    const w0 = P(v, base);
    const w1 = P(v, at + dir * 0.05 * k);
    const c = P(v, at);
    out.push(<line key={'w' + i} x1={w0.x} y1={w0.y} x2={w1.x} y2={w1.y} stroke={colour} strokeWidth={0.006 * k} />);
    out.push(<line key={'t' + i} x1={c.x - tick / 2} y1={c.y + tick / 2} x2={c.x + tick / 2} y2={c.y - tick / 2} stroke={colour} strokeWidth={0.016 * k} />);
  });
  let stagger = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = pts[i + 1] - pts[i];
    if (len < 0.005) continue;
    const text = label ? label(len, i) : fmt(len);
    const tw = text.length * fs * 0.62;
    const fits = tw + 0.06 * k < len;
    // Level 0 sits on the usual side of the line; 1 and 2 drop to the far side, alternating.
    const level = fits ? 0 : 1 + (stagger++ % 2);
    if (fits) stagger = 0;
    const mid = (pts[i] + pts[i + 1]) / 2;
    const off = level === 0 ? -0.045 * k : 0.045 * k + fs * 0.8 + (level - 1) * (fs + 0.02 * k);
    if (axis === 'x') {
      out.push(
        <text key={'v' + i} x={mid} y={at + off} textAnchor="middle" fontSize={fs} fill={colour} fontFamily={MONO}>
          {text}
        </text>,
      );
    } else {
      // Vertical strings read bottom-to-top; "above" the line is to its left.
      out.push(
        <text key={'v' + i} transform={`translate(${at + off} ${mid}) rotate(-90)`} textAnchor="middle" fontSize={fs} fill={colour} fontFamily={MONO}>
          {text}
        </text>,
      );
    }
  }
  return <g>{out}</g>;
}

export function PlanView({ geo, cfg }: { geo: BuildingGeometry; cfg: DesignConfig }) {
  const hx = geo.intW / 2 + geo.wallT;
  const hz = geo.intD / 2 + geo.wallT;
  const T = geo.wallT;
  const hd = geo.hood.depth;
  const iw = geo.intW / 2;
  const id = geo.intD / 2;

  // Roof outline
  const ov =
    geo.roof.type === 'pent'
      ? geo.roof.overhang
      : { front: geo.roof.overhang, back: geo.roof.overhang, left: geo.roof.overhang, right: geo.roof.overhang };
  const roofRect = { x: -hx - ov.left, y: -hz - ov.back, w: geo.extW + ov.left + ov.right, h: 2 * hz + ov.back + ov.front };
  // Text and spacing scale with the building so large annexes stay as readable as small rooms.
  const k = Math.max(1, Math.max(roofRect.w, roofRect.h) / 6.5);
  const barM = k < 1.6 ? 1 : 2; // scale bar length in metres

  const door = geo.openings.find((o) => o.kind === 'door')!;
  const windows = geo.openings.filter((o) => o.kind === 'window');
  const onWall = (w: WallSide) => geo.openings.filter((o) => o.wall === w);

  // Extents of everything drawn around the building, so dimension strings start clear of it.
  const screenD = geo.sideScreen?.depth ?? 0;
  const frontLimit = hz + Math.max(hd, geo.deck?.depth ?? 0, screenD, doorReach(door, T) - T * 0.4, ov.front) + 0.06;
  const backLimit = Math.min(roofRect.y, ...geo.downpipes.map((p) => p.z - 0.05)) - 0.04;
  const leftLimit = Math.min(roofRect.x, geo.sideScreen?.side === 'left' ? -hx - 0.07 : 0, ...geo.downpipes.map((p) => p.x - 0.05)) - 0.04;
  const rightLimit = Math.max(roofRect.x + roofRect.w, geo.sideScreen?.side === 'right' ? hx + 0.07 : 0, ...geo.downpipes.map((p) => p.x + 0.05)) + 0.04;
  const GAP = 0.36 * k; // first string distance from the drawing
  const STEP = 0.42 * k; // distance between strings

  // Chains along each wall: corners plus opening edges.
  const edgesX = (wall: 'front' | 'back') => onWall(wall).flatMap((o) => [wallToPlan(geo, wall, o.s - o.w / 2).x, wallToPlan(geo, wall, o.s + o.w / 2).x]);
  const edgesY = (wall: 'left' | 'right') => onWall(wall).flatMap((o) => [wallToPlan(geo, wall, o.s - o.w / 2).y, wallToPlan(geo, wall, o.s + o.w / 2).y]);
  const backHasOpenings = onWall('back').length > 0;
  const leftHasOpenings = onWall('left').length > 0;
  const roofWider = roofRect.w - geo.extW > 0.03;
  const nTop = (backHasOpenings ? 1 : 0) + (roofWider ? 1 : 0);
  const rightPts = [-hz, hz, ...edgesY('right')];
  if (hd > 0.03) rightPts.push(hz + hd);
  // Deck depth only gets its own tick when it clearly differs from the hood line.
  if (geo.deck && Math.abs(geo.deck.depth - hd) > 0.15) rightPts.push(hz + geo.deck.depth);
  // Overall external depth as quoted: pent = walls + front hood; apex = roof including both gable overhangs.
  const depthSpan: [number, number] = geo.roof.type === 'apex' ? [-hz - ov.back, hz + ov.front] : [-hz, hz + hd];

  // Rooms (split by the partition) for labels and areas.
  const rooms = geo.partition
    ? [
        { x0: -iw, x1: geo.partition.x - 0.045 },
        { x0: geo.partition.x + 0.045, x1: iw },
      ]
    : [{ x0: -iw, x1: iw }];
  const big = rooms.reduce((a, b) => (b.x1 - b.x0 > a.x1 - a.x0 ? b : a));
  // Internal depth string goes along the wall of the larger room.
  const depthOnLeft = big.x0 === -iw && rooms.length > 1;
  const depthX = depthOnLeft ? -iw + 0.3 * k : iw - 0.3 * k;

  // ViewBox with a reserved band at the bottom for the scale bar.
  const minX = leftLimit - (leftHasOpenings ? GAP + 0.35 * k : 0.3 * k);
  const maxX = rightLimit + GAP + STEP + 0.35 * k;
  const minY = backLimit - (nTop ? GAP + (nTop - 1) * STEP + 0.35 * k : 0.3 * k);
  const maxY = frontLimit + GAP + STEP + 0.75 * k;
  const W = maxX - minX;
  const Hh = maxY - minY;

  const gridLines: JSX.Element[] = [];
  for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) gridLines.push(<line key={'gx' + x} x1={x} y1={minY} x2={x} y2={maxY} stroke="#eceef0" strokeWidth={0.006} />);
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) gridLines.push(<line key={'gy' + y} x1={minX} y1={y} x2={maxX} y2={y} stroke="#eceef0" strokeWidth={0.006} />);

  const rangeLabel = geo.model.range === 'annex' ? 'The Annex' : geo.model.range === 'x1' ? 'X1' : `${geo.model.range.toUpperCase()}-Range`;
  const orientLabel = geo.model.orientations && geo.model.orientations.length > 1 ? ` · ${cfg.orientation === 'gable' ? 'Gable end' : 'Eaves side'}` : '';
  const height = geo.roof.type === 'apex' ? geo.roof.ridgeH : geo.extHeight;

  return (
    <div className="plan-wrap">
      <svg viewBox={`${minX} ${minY} ${W} ${Hh}`} className="plan-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="hatch" width="0.08" height="0.08" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="0.08" stroke={HATCH} strokeWidth="0.012" />
          </pattern>
          <pattern id="deckboards" width="1" height={0.151} patternUnits="userSpaceOnUse">
            <rect width="1" height={0.151} fill="#f3efe8" />
            <line x1="0" y1={0.145} x2="1" y2={0.145} stroke="#b8ad9c" strokeWidth="0.01" />
          </pattern>
        </defs>
        <rect x={minX} y={minY} width={W} height={Hh} fill="#fbfbfa" />
        {gridLines}

        {/* roof outline (dashed) and ridge */}
        <rect x={roofRect.x} y={roofRect.y} width={roofRect.w} height={roofRect.h} fill="none" stroke={LIGHT} strokeWidth={0.012} strokeDasharray="0.18 0.08 0.03 0.08" />

        {/* deck */}
        {geo.deck && <rect x={-geo.deck.width / 2} y={hz} width={geo.deck.width} height={geo.deck.depth} fill="url(#deckboards)" stroke={INK} strokeWidth={0.014} />}

        {/* hood / cheeks */}
        {hd > 0.03 && (
          <g>
            {(geo.hood.cheeks === 'both' || geo.hood.cheeks === 'right') && <rect x={hx - geo.hood.frameT} y={hz} width={geo.hood.frameT} height={hd} fill="url(#hatch)" stroke={INK} strokeWidth={0.014} />}
            {geo.hood.cheeks === 'both' && <rect x={-hx} y={hz} width={geo.hood.frameT} height={hd} fill="url(#hatch)" stroke={INK} strokeWidth={0.014} />}
          </g>
        )}

        {/* walls: outer minus inner */}
        <path d={`M ${-hx} ${-hz} h ${geo.extW} v ${2 * hz} h ${-geo.extW} Z M ${-iw} ${-id} v ${geo.intD} h ${geo.intW} v ${-geo.intD} Z`} fillRule="evenodd" fill="url(#hatch)" stroke={INK} strokeWidth={0.022} />
        <rect x={-iw} y={-id} width={geo.intW} height={geo.intD} fill="#ffffff" stroke={INK} strokeWidth={0.016} />

        {/* partition with its door near the front */}
        {geo.partition && (
          <g>
            <rect x={geo.partition.x - 0.045} y={-id} width={0.09} height={geo.intD - 1.0} fill="url(#hatch)" stroke={INK} strokeWidth={0.014} />
            <rect x={geo.partition.x - 0.045} y={id - 0.15} width={0.09} height={0.15} fill="url(#hatch)" stroke={INK} strokeWidth={0.014} />
            <line x1={geo.partition.x + 0.045} y1={id - 0.15} x2={geo.partition.x + 0.045 + 0.78} y2={id - 0.15} stroke={INK} strokeWidth={0.025} />
            <path d={`M ${geo.partition.x + 0.045 + 0.78} ${id - 0.15} A 0.78 0.78 0 0 0 ${geo.partition.x + 0.045} ${id - 0.15 - 0.78}`} fill="none" stroke={INK} strokeWidth={0.008} strokeDasharray="0.04 0.03" />
          </g>
        )}

        {/* ridge line, drawn over the room so the roof direction is clear */}
        {geo.roof.type === 'apex' &&
          (geo.roof.ridgeAxis === 'z' ? (
            <line x1={0} y1={roofRect.y} x2={0} y2={roofRect.y + roofRect.h} stroke="#b4b9bf" strokeWidth={0.01} strokeDasharray="0.25 0.08 0.04 0.08" />
          ) : (
            <line x1={roofRect.x} y1={0} x2={roofRect.x + roofRect.w} y2={0} stroke="#b4b9bf" strokeWidth={0.01} strokeDasharray="0.25 0.08 0.04 0.08" />
          ))}

        {/* side screen */}
        {geo.sideScreen && <rect x={geo.sideScreen.side === 'left' ? -hx - 0.06 : hx} y={hz} width={0.06} height={geo.sideScreen.depth} fill="url(#hatch)" stroke={INK} strokeWidth={0.012} />}

        {/* openings */}
        {windows.map((o) => (
          <WindowSymbol key={o.id} geo={geo} o={o} />
        ))}
        <DoorSymbol geo={geo} o={door} />

        {/* rainwater pipes (see legend) */}
        {geo.downpipes.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.z} r={0.04} fill="#fff" stroke={INK} strokeWidth={0.014} />
            <circle cx={p.x} cy={p.z} r={0.012} fill={INK} />
          </g>
        ))}

        {/* room labels */}
        {rooms.map((r, i) => {
          let cx = (r.x0 + r.x1) / 2;
          // keep clear of the internal depth string when it runs through this room
          const nearDepth = depthX > r.x0 && depthX < r.x1;
          if (nearDepth) cx = depthOnLeft ? (depthX + 0.18 * k + r.x1) / 2 : (r.x0 + depthX - 0.18 * k) / 2;
          const ly = geo.roof.type === 'apex' && geo.roof.ridgeAxis === 'x' ? 0.45 * k : 0;
          const area = (r.x1 - r.x0) * geo.intD;
          const isBig = r === big;
          return (
            <g key={i} fontFamily={SANS} textAnchor="middle">
              {isBig && (
                <text x={cx} y={ly - 0.08 * k} fontSize={0.2 * k} fontWeight={600} fill={INK} stroke="#fff" strokeWidth={0.04 * k} paintOrder="stroke">
                  {geo.model.name.toUpperCase()}
                </text>
              )}
              <text x={cx} y={ly + (isBig ? 0.14 : 0.03) * k} fontSize={0.13 * k} fill={LIGHT} stroke="#fff" strokeWidth={0.04 * k} paintOrder="stroke">
                {area.toFixed(1)} m²
              </text>
            </g>
          );
        })}

        {/* ---- dimension strings ---- */}
        {/* internal, inside the room */}
        <Chain k={k} axis="x" points={[-iw, iw]} at={-id + 0.3 * k} base={-id + 0.02} />
        {geo.partition && <Chain k={k} axis="x" points={[-iw, geo.partition.x, iw]} at={-id + 0.62 * k} base={-id + 0.02} />}
        <Chain k={k} axis="y" points={[-id, id]} at={depthX} base={depthOnLeft ? -iw + 0.02 : iw - 0.02} />

        {/* front: wall chain, then overall external width */}
        <Chain k={k} axis="x" points={[-hx, hx, ...edgesX('front')]} at={frontLimit + GAP} base={frontLimit} />
        <Chain k={k} axis="x" points={[-hx, hx]} at={frontLimit + GAP + STEP} base={frontLimit} />

        {/* back: wall chain (if openings), roof width */}
        {backHasOpenings && <Chain k={k} axis="x" points={[-hx, hx, ...edgesX('back')]} at={backLimit - GAP} base={backLimit} />}
        {roofWider && <Chain k={k} axis="x" points={[roofRect.x, roofRect.x + roofRect.w]} at={backLimit - GAP - (backHasOpenings ? STEP : 0)} base={backLimit} colour={LIGHT} />}

        {/* right: wall chain incl. hood and deck, then overall external depth */}
        <Chain k={k} axis="y" points={rightPts} at={rightLimit + GAP} base={rightLimit} />
        <Chain k={k} axis="y" points={depthSpan} at={rightLimit + GAP + STEP} base={rightLimit} label={() => fmt(geo.extD)} />

        {/* left: wall chain only when it has openings */}
        {leftHasOpenings && <Chain k={k} axis="y" points={[-hz, hz, ...edgesY('left')]} at={leftLimit - GAP} base={leftLimit} />}

        {/* orientation label and scale bar in the reserved band */}
        <text x={0} y={maxY - 0.3 * k} textAnchor="middle" fontSize={0.11 * k} letterSpacing={0.03 * k} fill={LIGHT} fontFamily={SANS}>
          ▲ FRONT ELEVATION
        </text>
        <g transform={`translate(${maxX - 0.35 * k - barM} ${maxY - 0.42 * k})`} fontFamily={SANS}>
          <line x1={0} y1={0} x2={barM} y2={0} stroke={INK} strokeWidth={0.02 * k} />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={t * barM} y1={-0.035 * k} x2={t * barM} y2={0.035 * k} stroke={INK} strokeWidth={0.012 * k} />
          ))}
          <text x={0} y={0.18 * k} fontSize={0.09 * k} fill={INK} textAnchor="middle">0</text>
          <text x={barM} y={0.18 * k} fontSize={0.09 * k} fill={INK} textAnchor="middle">{barM}m</text>
        </g>
      </svg>
      <footer className="plan-foot">
        <div className="plan-legend">
          <span><i className="lg lg-wall" /> Wall</span>
          <span><i className="lg lg-roof" /> Roof line</span>
          {geo.deck && <span><i className="lg lg-deck" /> Decking</span>}
          <span><i className="lg lg-rwp" /> Downpipe</span>
          {geo.sideScreen && <span><i className="lg lg-wall" /> Slatted screen</span>}
        </div>
        <div className="plan-title">
          <strong>{geo.model.name}</strong>
          <span>{rangeLabel}{orientLabel}</span>
          <span>Ext {fmtM(geo.extW)} × {fmtM(geo.extD)}</span>
          <span>Int {fmtM(geo.intW)} × {fmtM(geo.intD)}</span>
          <span>Height {fmtM(height)}{geo.roof.type === 'apex' ? ' ridge' : ''}</span>
          <span>All dimensions in mm</span>
        </div>
      </footer>
    </div>
  );
}

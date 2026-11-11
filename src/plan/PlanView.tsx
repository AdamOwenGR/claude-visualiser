// 2D CAD-style top-down floor plan, drawn from the same geometry as the 3D view.
import { useMemo } from 'react';
import { DOORS, WINDOWS, type WallSide } from '../data/catalogue';
import type { BuildingGeometry, DesignConfig, Opening } from '../model/geometry';

const INK = '#1f2328';
const DIM = '#2b5a9e';
const HATCH = '#9aa3ad';
const LIGHT = '#8a9099';

const fmt = (m: number) => `${Math.round(m * 1000)}`;
const fmtM = (m: number) => `${(Math.round(m * 100) / 100).toFixed(2)}m`;

interface DimProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  offset: number; // perpendicular offset (plan units)
  label?: string;
  colour?: string;
  small?: boolean;
}

function Dim({ x1, y1, x2, y2, offset, label, colour = DIM, small }: DimProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ox = nx * offset;
  const oy = ny * offset;
  const ax = x1 + ox, ay = y1 + oy, bx = x2 + ox, by = y2 + oy;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const text = label ?? fmt(len);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const tick = 0.07;
  const fs = small ? 0.11 : 0.14;
  return (
    <g stroke={colour} fill="none" strokeWidth={0.012}>
      <line x1={x1} y1={y1} x2={ax + nx * 0.08} y2={ay + ny * 0.08} strokeWidth={0.008} />
      <line x1={x2} y1={y2} x2={bx + nx * 0.08} y2={by + ny * 0.08} strokeWidth={0.008} />
      <line x1={ax} y1={ay} x2={bx} y2={by} />
      <g transform={`translate(${ax} ${ay}) rotate(${angle})`}>
        <line x1={-tick / 2} y1={tick / 2} x2={tick / 2} y2={-tick / 2} strokeWidth={0.018} />
      </g>
      <g transform={`translate(${bx} ${by}) rotate(${angle})`}>
        <line x1={-tick / 2} y1={tick / 2} x2={tick / 2} y2={-tick / 2} strokeWidth={0.018} />
      </g>
      <g transform={`translate(${mx} ${my}) rotate(${angle > 90 || angle < -90 ? angle + 180 : angle})`}>
        <text x={0} y={-0.05} textAnchor="middle" fill={colour} stroke="none" fontSize={fs} fontFamily="'IBM Plex Mono', 'SFMono-Regular', Menlo, monospace">
          {text}
        </text>
      </g>
    </g>
  );
}

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

export function PlanView({ geo, cfg }: { geo: BuildingGeometry; cfg: DesignConfig }) {
  const hx = geo.intW / 2 + geo.wallT;
  const hz = geo.intD / 2 + geo.wallT;
  const T = geo.wallT;
  const hd = geo.hood.depth;
  const deckD = geo.deck?.depth ?? 0;
  const frontExtra = Math.max(hd, deckD, geo.sideScreen?.depth ?? 0);

  // Roof outline
  const roofRect = useMemo(() => {
    if (geo.roof.type === 'pent') {
      const ov = geo.roof.overhang;
      return { x: -hx - ov.left, y: -hz - ov.back, w: geo.extW + ov.left + ov.right, h: geo.intD + 2 * T + ov.back + ov.front };
    }
    const ov = geo.roof.overhang;
    return { x: -hx - ov, y: -hz - ov, w: geo.extW + 2 * ov, h: geo.intD + 2 * T + 2 * ov };
  }, [geo, hx, hz, T]);

  // Drawing bounds (plan units = metres; y down = front)
  const padL = 1.5, padR = 1.3, padT = 1.0, padB = 1.4;
  const minX = Math.min(-hx, roofRect.x) - padL;
  const maxX = Math.max(hx, roofRect.x + roofRect.w) + padR;
  const minY = Math.min(-hz, roofRect.y) - padT;
  const maxY = hz + frontExtra + padB;
  const W = maxX - minX;
  const Hh = maxY - minY;

  const door = geo.openings.find((o) => o.kind === 'door')!;
  const doorP = wallToPlan(geo, 'front', door.s);
  const title = `${geo.model.name} · ${cfg.orientation === 'gable' && geo.model.orientations ? 'Gable-end' : geo.model.orientations ? 'Eaves-side' : geo.model.range.toUpperCase() === 'ANNEX' ? 'The Annex' : geo.model.range.toUpperCase() + '-Range'}`;

  const gridLines: JSX.Element[] = [];
  for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) gridLines.push(<line key={'gx' + x} x1={x} y1={minY} x2={x} y2={maxY} stroke="#e4e7ea" strokeWidth={0.006} />);
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) gridLines.push(<line key={'gy' + y} x1={minX} y1={y} x2={maxX} y2={y} stroke="#e4e7ea" strokeWidth={0.006} />);

  const windows = geo.openings.filter((o) => o.kind === 'window');
  const frontWindows = windows.filter((o) => o.wall === 'front' && !o.corner);

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

        {/* roof outline (dashed) */}
        <rect x={roofRect.x} y={roofRect.y} width={roofRect.w} height={roofRect.h} fill="none" stroke={LIGHT} strokeWidth={0.012} strokeDasharray="0.18 0.08 0.03 0.08" />
        {geo.roof.type === 'apex' && (
          geo.roof.ridgeAxis === 'z' ? (
            <line x1={0} y1={roofRect.y} x2={0} y2={roofRect.y + roofRect.h} stroke={LIGHT} strokeWidth={0.012} strokeDasharray="0.25 0.1" />
          ) : (
            <line x1={roofRect.x} y1={0} x2={roofRect.x + roofRect.w} y2={0} stroke={LIGHT} strokeWidth={0.012} strokeDasharray="0.25 0.1" />
          )
        )}

        {/* deck */}
        {geo.deck && (
          <g>
            <rect x={-geo.deck.width / 2} y={hz} width={geo.deck.width} height={geo.deck.depth} fill="url(#deckboards)" stroke={INK} strokeWidth={0.014} />
          </g>
        )}

        {/* hood / cheeks */}
        {hd > 0.03 && (
          <g>
            <rect x={-hx} y={hz} width={geo.extW} height={hd} fill="none" stroke={LIGHT} strokeWidth={0.01} strokeDasharray="0.1 0.05" />
            {(geo.hood.cheeks === 'both' || geo.hood.cheeks === 'right') && <rect x={hx - geo.hood.frameT} y={hz} width={geo.hood.frameT} height={hd} fill="url(#hatch)" stroke={INK} strokeWidth={0.014} />}
            {geo.hood.cheeks === 'both' && <rect x={-hx} y={hz} width={geo.hood.frameT} height={hd} fill="url(#hatch)" stroke={INK} strokeWidth={0.014} />}
          </g>
        )}

        {/* walls: outer minus inner */}
        <path d={`M ${-hx} ${-hz} h ${geo.extW} v ${geo.intD + 2 * T} h ${-geo.extW} Z M ${-geo.intW / 2} ${-geo.intD / 2} v ${geo.intD} h ${geo.intW} v ${-geo.intD} Z`} fillRule="evenodd" fill="url(#hatch)" stroke={INK} strokeWidth={0.022} />
        <rect x={-geo.intW / 2} y={-geo.intD / 2} width={geo.intW} height={geo.intD} fill="#ffffff" stroke={INK} strokeWidth={0.016} />

        {/* partition */}
        {geo.partition && (
          <g>
            <rect x={geo.partition.x - 0.045} y={-geo.intD / 2} width={0.09} height={geo.intD - 1.0} fill="url(#hatch)" stroke={INK} strokeWidth={0.014} />
            <rect x={geo.partition.x - 0.045} y={geo.intD / 2 - 0.15} width={0.09} height={0.15} fill="url(#hatch)" stroke={INK} strokeWidth={0.014} />
            <line x1={geo.partition.x + 0.045} y1={geo.intD / 2 - 0.15} x2={geo.partition.x + 0.045 + 0.78} y2={geo.intD / 2 - 0.15} stroke={INK} strokeWidth={0.025} />
            <path d={`M ${geo.partition.x + 0.045 + 0.78} ${geo.intD / 2 - 0.15} A 0.78 0.78 0 0 0 ${geo.partition.x + 0.045} ${geo.intD / 2 - 0.15 - 0.78}`} fill="none" stroke={INK} strokeWidth={0.008} strokeDasharray="0.04 0.03" />
            <Dim x1={-geo.intW / 2} y1={-geo.intD / 2} x2={geo.partition.x} y2={-geo.intD / 2} offset={0.3} small />
          </g>
        )}

        {/* side screen */}
        {geo.sideScreen && (
          <g>
            <rect x={geo.sideScreen.side === 'left' ? -hx - 0.06 : hx} y={hz} width={0.06} height={geo.sideScreen.depth} fill="url(#hatch)" stroke={INK} strokeWidth={0.012} />
            <text x={geo.sideScreen.side === 'left' ? -hx - 0.12 : hx + 0.12} y={hz + geo.sideScreen.depth / 2} fontSize={0.1} fill={INK} textAnchor={geo.sideScreen.side === 'left' ? 'end' : 'start'} fontFamily="Inter, system-ui, sans-serif">
              SLATTED SCREEN
            </text>
          </g>
        )}

        {/* openings */}
        {windows.map((o) => <WindowSymbol key={o.id} geo={geo} o={o} />)}
        <DoorSymbol geo={geo} o={door} />

        {/* rainwater pipes */}
        {geo.downpipes.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.z} r={0.04} fill="#fff" stroke={INK} strokeWidth={0.014} />
            <circle cx={p.x} cy={p.z} r={0.012} fill={INK} />
            <text x={p.x + (p.x < 0 ? -0.08 : 0.08)} y={p.z + 0.04} fontSize={0.1} fill={INK} textAnchor={p.x < 0 ? 'end' : 'start'} fontFamily="Inter, system-ui, sans-serif">
              RWP
            </text>
          </g>
        ))}

        {/* labels */}
        <text x={0} y={-geo.intD * 0.1} textAnchor="middle" fontSize={0.2} fontWeight={600} fill={INK} fontFamily="Inter, system-ui, sans-serif">
          {geo.model.name.toUpperCase()}
        </text>
        <text x={0} y={-geo.intD * 0.1 + 0.26} textAnchor="middle" fontSize={0.13} fill={LIGHT} fontFamily="Inter, system-ui, sans-serif">
          {fmtM(geo.intW)} × {fmtM(geo.intD)} internal · {geo.floorArea.toFixed(1)} m²
        </text>
        <text x={0} y={hz + frontExtra + 0.95} textAnchor="middle" fontSize={0.1} fill={LIGHT} fontFamily="Inter, system-ui, sans-serif" letterSpacing={0.02}>
          FRONT ELEVATION
        </text>

        {/* dimensions */}
        <Dim x1={-hx} y1={-hz} x2={hx} y2={-hz} offset={-0.45} label={`${fmt(geo.extW)} ext`} />
        <Dim x1={-geo.intW / 2} y1={-hz} x2={geo.intW / 2} y2={-hz} offset={-0.22} label={`${fmt(geo.intW)} int`} small />
        {roofRect.y < -hz - 0.03 && <Dim x1={roofRect.x} y1={roofRect.y} x2={roofRect.x + roofRect.w} y2={roofRect.y} offset={-0.72} label={`${fmt(roofRect.w)} roof`} colour={LIGHT} small />}
        <Dim x1={hx} y1={-hz} x2={hx} y2={hz + hd} offset={-0.5} label={`${fmt(geo.extD)} ext`} />
        <Dim x1={hx} y1={-geo.intD / 2} x2={hx} y2={geo.intD / 2} offset={-0.25} label={`${fmt(geo.intD)} int`} small />
        {hd > 0.03 && <Dim x1={hx} y1={hz} x2={hx} y2={hz + hd} offset={-0.25} label={`${fmt(hd)} hood`} colour={LIGHT} small />}
        {geo.deck && <Dim x1={-hx} y1={hz} x2={-hx} y2={hz + geo.deck.depth} offset={0.22} label={`${fmt(geo.deck.depth)} deck`} small />}
        {/* door position & width (front) */}
        <Dim x1={doorP.x - door.w / 2} y1={hz + frontExtra} x2={doorP.x + door.w / 2} y2={hz + frontExtra} offset={0.3} label={`${fmt(door.w)} door`} />
        <Dim x1={-hx} y1={hz + frontExtra} x2={doorP.x - door.w / 2} y2={hz + frontExtra} offset={0.3} small />
        {frontWindows.map((o) => {
          const p = wallToPlan(geo, 'front', o.s);
          return <Dim key={o.id} x1={p.x - o.w / 2} y1={hz + frontExtra} x2={p.x + o.w / 2} y2={hz + frontExtra} offset={0.55} label={`${fmt(o.w)} win`} small />;
        })}
        {windows
          .filter((o) => (o.wall === 'left' || o.wall === 'right') && !o.corner)
          .map((o) => {
            const p = wallToPlan(geo, o.wall, o.s);
            const sx = o.wall === 'left' ? -hx : hx;
            const off = o.wall === 'left' ? 0.3 : -0.68;
            return <Dim key={o.id} x1={sx} y1={p.y - o.w / 2} x2={sx} y2={p.y + o.w / 2} offset={off} label={`${fmt(o.w)} win`} small />;
          })}
        {/* corner window */}
        {windows.some((o) => o.corner) && (
          <text x={hx + 0.1} y={hz - 0.75} fontSize={0.1} fill={INK} fontFamily="Inter, system-ui, sans-serif" transform={`rotate(-90 ${hx + 0.1} ${hz - 0.75})`}>
            CORNER WINDOW
          </text>
        )}

        {/* north / orientation & scale bar */}
        <g transform={`translate(${minX + 0.45} ${maxY - 0.55})`}>
          <line x1={0} y1={0} x2={1} y2={0} stroke={INK} strokeWidth={0.02} />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={t} y1={-0.04} x2={t} y2={0.04} stroke={INK} strokeWidth={0.014} />
          ))}
          <text x={0} y={0.2} fontSize={0.1} fill={INK} fontFamily="Inter, system-ui, sans-serif">0</text>
          <text x={1} y={0.2} fontSize={0.1} fill={INK} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">1m</text>
        </g>

        {/* title block */}
        <g transform={`translate(${maxX - 0.2} ${maxY - 0.2})`}>
          <rect x={-3.0} y={-0.92} width={2.9} height={0.82} fill="#fff" stroke={INK} strokeWidth={0.014} />
          <line x1={-3.0} y1={-0.66} x2={-0.1} y2={-0.66} stroke={INK} strokeWidth={0.01} />
          <text x={-2.9} y={-0.73} fontSize={0.13} fontWeight={600} fill={INK} fontFamily="Inter, system-ui, sans-serif">
            GREEN RETREATS · FLOOR PLAN
          </text>
          <text x={-2.9} y={-0.5} fontSize={0.1} fill={INK} fontFamily="Inter, system-ui, sans-serif">
            {title}
          </text>
          <text x={-2.9} y={-0.34} fontSize={0.1} fill={INK} fontFamily="Inter, system-ui, sans-serif">
            External {fmtM(geo.extW)} × {fmtM(geo.extD)} · Internal {fmtM(geo.intW)} × {fmtM(geo.intD)}
          </text>
          <text x={-2.9} y={-0.18} fontSize={0.1} fill={INK} fontFamily="Inter, system-ui, sans-serif">
            Height {fmtM(geo.roof.type === 'apex' ? geo.roof.ridgeH : geo.extHeight)} {geo.roof.type === 'apex' ? 'ridge' : 'ext'} · Dimensions in mm · Not to scale
          </text>
        </g>
      </svg>
      <div className="plan-legend">
        <span><i className="lg lg-wall" /> External wall</span>
        <span><i className="lg lg-roof" /> Roof line</span>
        <span><i className="lg lg-deck" /> Decking</span>
        <span><i className="lg lg-rwp" /> Rainwater pipe</span>
        <span>{WINDOWS[geo.openings.find((o) => o.kind === 'window')?.type ?? '']?.name ? 'Windows shown with sill lines' : ''}</span>
      </div>
    </div>
  );
}

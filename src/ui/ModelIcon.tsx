// Stylised front-elevation icons for each building design.
import type { ModelSpec } from '../data/catalogue';

export function ModelIcon({ model, size = 120 }: { model: ModelSpec; size?: number }) {
  const W = 120, H = 80;
  const clad = model.range === 'x1' ? '#2b2c2e' : model.range === 'b' || model.id === 'a1' ? '#d9d4c7' : '#c89a62';
  const frame = '#2f3236';
  const body: JSX.Element[] = [];
  const x0 = 16, x1 = 104, yTop = 24, yBot = 70;
  if (model.roof === 'apex') {
    const ridge = 6;
    body.push(<polygon key="g" points={`${x0},${yTop} ${(x0 + x1) / 2},${ridge} ${x1},${yTop}`} fill={clad} stroke={frame} strokeWidth="1.5" strokeLinejoin="round" />);
    body.push(<polyline key="r" points={`${x0 - 6},${yTop + 2} ${(x0 + x1) / 2},${ridge - 3} ${x1 + 6},${yTop + 2}`} fill="none" stroke={frame} strokeWidth="4" strokeLinejoin="round" />);
  }
  body.push(<rect key="w" x={x0} y={yTop} width={x1 - x0} height={yBot - yTop} fill={clad} stroke={frame} strokeWidth="1.5" />);
  // vertical cladding lines
  for (let x = x0 + 6; x < x1; x += 6) body.push(<line key={'c' + x} x1={x} y1={yTop + 1} x2={x} y2={yBot - 1} stroke="rgba(0,0,0,0.12)" strokeWidth="1" />);
  if (model.roof === 'pent') {
    switch (model.hood) {
      case 'allSides':
        body.push(<rect key="h" x={x0 - 8} y={yTop - 7} width={x1 - x0 + 16} height={7} fill={frame} />);
        break;
      case 'none':
        body.push(<rect key="h" x={x0 - 2} y={yTop - 5} width={x1 - x0 + 4} height={5} fill={frame} />);
        break;
      case 'frontFrame':
        body.push(<rect key="h" x={x0 - 4} y={yTop - 6} width={x1 - x0 + 8} height={6} fill={frame} />);
        body.push(<rect key="cl" x={x0 - 4} y={yTop - 6} width={5} height={yBot - yTop + 6} fill={frame} />);
        body.push(<rect key="cr" x={x1 - 1} y={yTop - 6} width={5} height={yBot - yTop + 6} fill={frame} />);
        break;
      case 'leanFrame':
        body.push(<polygon key="h" points={`${x0 - 6},${yTop - 7} ${x1 + 6},${yTop - 7} ${x1 + 6},${yTop} ${x0 - 6},${yTop}`} fill={frame} />);
        body.push(<polygon key="cl" points={`${x0 - 6},${yTop - 7} ${x0},${yTop - 7} ${x0},${yBot} ${x0 - 2},${yBot}`} fill={frame} />);
        body.push(<polygon key="cr" points={`${x1},${yTop - 7} ${x1 + 6},${yTop - 7} ${x1 + 2},${yBot} ${x1},${yBot}`} fill={frame} />);
        break;
      case 'curvedCorner':
        body.push(<path key="h" d={`M ${x0 - 3} ${yTop - 6} H ${x1 - 6} a 12 12 0 0 1 12 12 V ${yBot} h -6 V ${yTop + 6} a 6 6 0 0 0 -6 -6 H ${x0 - 3} Z`} fill={frame} />);
        break;
    }
  }
  // door + window
  const doorW = model.range === 'x1' ? 40 : 30;
  body.push(<rect key="d" x={x0 + 14} y={yTop + 10} width={doorW} height={yBot - yTop - 10} fill="#dfe9ec" stroke={frame} strokeWidth="2" />);
  body.push(<line key="dl" x1={x0 + 14 + doorW / 2} y1={yTop + 10} x2={x0 + 14 + doorW / 2} y2={yBot} stroke={frame} strokeWidth="1.5" />);
  body.push(<rect key="win" x={x1 - 24} y={yTop + 12} width={14} height={7} fill="#dfe9ec" stroke={frame} strokeWidth="1.5" />);
  if (model.deckBoards > 0) body.push(<rect key="deck" x={x0 - 2} y={yBot} width={x1 - x0 + 4} height={3} fill="#7b6a55" />);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W} className="micon">
      {body}
    </svg>
  );
}

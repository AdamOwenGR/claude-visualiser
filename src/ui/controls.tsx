import type { ReactNode } from 'react';
import { gbp } from '../model/pricing';

export function Section({ title, hint, children, right }: { title: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="sec">
      <header className="sec-h">
        <div>
          <h3>{title}</h3>
          {hint && <p className="hint">{hint}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

export function PriceTag({ price, included }: { price: number; included?: boolean }) {
  if (included) return <span className="tag tag-inc">Included</span>;
  if (!price) return <span className="tag tag-inc">Included</span>;
  return <span className="tag">+{gbp(price)}</span>;
}

export interface ChipOption {
  id: string;
  label: string;
  sub?: string;
  price?: number;
  included?: boolean;
  disabled?: boolean;
}

export function Chips({ options, value, onChange, columns = 2 }: { options: ChipOption[]; value: string | null; onChange: (id: string) => void; columns?: number }) {
  return (
    <div className={`chips cols-${columns}`}>
      {options.map((o) => (
        <button key={o.id} type="button" className={`chip ${value === o.id ? 'on' : ''}`} onClick={() => onChange(o.id)} disabled={o.disabled} title={o.sub}>
          <span className="chip-l">
            {o.label}
            {o.sub && <small>{o.sub}</small>}
          </span>
          {(o.price !== undefined || o.included) && <PriceTag price={o.price ?? 0} included={o.included} />}
        </button>
      ))}
    </div>
  );
}

export interface SwatchOption {
  id: string;
  label: string;
  style: React.CSSProperties;
  price?: number;
  included?: boolean;
  group?: string;
}

export function Swatches({ options, value, onChange, compact }: { options: SwatchOption[]; value: string | null; onChange: (id: string) => void; compact?: boolean }) {
  return (
    <div className={`swatches ${compact ? 'compact' : ''}`}>
      {options.map((o) => (
        <button key={o.id} type="button" className={`swatch ${value === o.id ? 'on' : ''}`} onClick={() => onChange(o.id)} title={o.label}>
          <span className="sw" style={o.style} />
          <span className="sw-l">{o.label}</span>
          {/* Only flag the standard option and paid upgrades; free alternatives stay quiet. */}
          <span className="sw-t">{o.included ? <span className="tag tag-inc">Standard</span> : o.price && o.price > 0 ? <PriceTag price={o.price} /> : null}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, sub, on, onChange, price, included }: { label: string; sub?: string; on: boolean; onChange: (v: boolean) => void; price?: number; included?: boolean }) {
  return (
    <button type="button" className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span className="tg-box">
        <span className="tg-knob" />
      </span>
      <span className="tg-l">
        {label}
        {sub && <small>{sub}</small>}
      </span>
      {(price !== undefined || included) && <PriceTag price={price ?? 0} included={included} />}
    </button>
  );
}

export function Slider({ label, value, min, max, step, onChange, format, marks }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string; marks?: number[] }) {
  return (
    <label className="slider">
      <span className="sl-h">
        <span>{label}</span>
        <strong>{format ? format(value) : value}</strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} list={marks ? label + '-marks' : undefined} />
      {marks && (
        <datalist id={label + '-marks'}>
          {marks.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      )}
    </label>
  );
}

/** CSS preview for cladding boards */
export const claddingStyle = (base: string, pattern: string): React.CSSProperties => {
  const dark = 'rgba(0,0,0,0.35)';
  const light = 'rgba(255,255,255,0.12)';
  switch (pattern) {
    case 'horizontal':
      return { background: `repeating-linear-gradient(180deg, ${light} 0 2px, transparent 2px 9px, ${dark} 9px 10px), ${base}` };
    case 'slatted':
      return { background: `repeating-linear-gradient(90deg, ${base} 0 5px, #141210 5px 8px)` };
    case 'seam':
      return { background: `repeating-linear-gradient(90deg, transparent 0 14px, ${light} 14px 16px, ${dark} 16px 17px), ${base}` };
    case 'metal':
      return { background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.14), transparent 50%), ${base}` };
    default:
      return { background: `repeating-linear-gradient(90deg, ${light} 0 1px, transparent 1px 7px, ${dark} 7px 8px), ${base}` };
  }
};

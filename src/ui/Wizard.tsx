import { RANGES, modelsForRange, type RangeId } from '../data/catalogue';
import { gbp } from '../model/pricing';
import { useStore } from '../model/store';
import { ModelIcon } from './ModelIcon';

export function RangeStep() {
  const selectRange = useStore((s) => s.selectRange);
  return (
    <div className="step">
      <div className="step-intro">
        <span className="eyebrow">Step 1 of 3</span>
        <h2>Choose your range</h2>
        <p>Every Green Retreats building is designed, manufactured and installed by us. Pick a range to see its designs.</p>
      </div>
      <div className="range-grid">
        {RANGES.map((r) => (
          <button key={r.id} type="button" className="range-card" onClick={() => selectRange(r.id)}>
            <span className="rc-top">
              <strong>{r.name}</strong>
              <span className="rc-from">from {gbp(r.from)}</span>
            </span>
            <span className="rc-strap">{r.strap}</span>
            <span className="rc-blurb">{r.blurb}</span>
            <span className="rc-cta">Explore {r.name} →</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ModelStep({ range }: { range: RangeId }) {
  const selectModel = useStore((s) => s.selectModel);
  const goto = useStore((s) => s.goto);
  const r = RANGES.find((x) => x.id === range)!;
  const models = modelsForRange(range);
  return (
    <div className="step">
      <div className="step-intro">
        <button type="button" className="linkbtn" onClick={() => goto('range')}>
          ← All ranges
        </button>
        <span className="eyebrow">Step 2 of 3 · {r.name}</span>
        <h2>Choose your design</h2>
        <p>{r.blurb}</p>
      </div>
      <div className="model-grid">
        {models.map((m) => (
          <button key={m.id} type="button" className="model-card" onClick={() => selectModel(m.id)}>
            <ModelIcon model={m} size={150} />
            <span className="mc-name">
              {m.name}
              <small>{m.tagline}</small>
            </span>
            <span className="mc-desc">{m.description}</span>
            <span className="mc-from">from {gbp(m.from)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

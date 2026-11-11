import { useEffect, useMemo, useState } from 'react';
import { RANGES, modelById } from './data/catalogue';
import { computeGeometry } from './model/geometry';
import { computePrice, gbp } from './model/pricing';
import { decodeConfig, encodeConfig, useStore } from './model/store';
import { PlanView } from './plan/PlanView';
import { CAMERA_PRESETS, Scene } from './three/Scene';
import { Designer } from './ui/Designer';
import { ModelStep, RangeStep } from './ui/Wizard';

function Logo() {
  return (
    <div className="logo">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path d="M12 2 4 14h4l-3 8 7-6 7 6-3-8h4z" fill="currentColor" />
      </svg>
      <span>
        Green Retreats <em>3D Designer</em>
      </span>
    </div>
  );
}

export default function App() {
  const { step, range, config, view, cameraPreset } = useStore();
  const goto = useStore((s) => s.goto);
  const setView = useStore((s) => s.setView);
  const setCameraPreset = useStore((s) => s.setCameraPreset);
  const setCategory = useStore((s) => s.setCategory);
  const loadConfig = useStore((s) => s.loadConfig);
  const reset = useStore((s) => s.reset);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 900);

  // Restore a shared design from the URL.
  useEffect(() => {
    const read = () => {
      const m = location.hash.match(/#d=([A-Za-z0-9_-]+)/);
      if (!m) return;
      const c = decodeConfig(m[1]);
      if (c && encodeConfig(c) !== (useStore.getState().config ? encodeConfig(useStore.getState().config!) : '')) loadConfig(c);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [loadConfig]);
  useEffect(() => {
    if (!config) return;
    const t = setTimeout(() => history.replaceState(null, '', `#d=${encodeConfig(config)}`), 400);
    return () => clearTimeout(t);
  }, [config]);

  const geo = useMemo(() => (config ? computeGeometry(config) : null), [config]);
  const price = useMemo(() => (config ? computePrice(config) : null), [config]);
  const model = config ? modelById(config.modelId) : null;
  const rangeName = range ? RANGES.find((r) => r.id === range)?.name : null;

  return (
    <div className={`app step-${step} ${panelOpen ? '' : 'panel-closed'}`}>
      <header className="topbar">
        <Logo />
        <nav className="crumbs" aria-label="Progress">
          <button type="button" className={step === 'range' ? 'on' : 'done'} onClick={() => goto('range')}>
            <i>1</i>
            <span className="cr-l">Range</span>
            {rangeName && step !== 'range' && <span className="cr-x">: {rangeName}</span>}
          </button>
          <span className="sep" />
          <button type="button" className={step === 'model' ? 'on' : step === 'design' ? 'done' : ''} disabled={!range} onClick={() => range && goto('model')}>
            <i>2</i>
            <span className="cr-l">Design</span>
            {model && step === 'design' && <span className="cr-x">: {model.name}</span>}
          </button>
          <span className="sep" />
          <button type="button" className={step === 'design' ? 'on' : ''} disabled={!config} onClick={() => config && goto('design')}>
            <i>3</i>
            <span className="cr-l">Configure</span>
          </button>
        </nav>
        <div className="top-actions">
          {step === 'design' && (
            <div className="seg" role="tablist">
              <button type="button" className={view === '3d' ? 'on' : ''} onClick={() => setView('3d')}>
                3D view
              </button>
              <button type="button" className={view === 'plan' ? 'on' : ''} onClick={() => setView('plan')}>
                Floor plan
              </button>
            </div>
          )}
          <button type="button" className="btn ghost" onClick={reset}>
            Start over
          </button>
        </div>
      </header>

      <main className="main">
        {step === 'range' && (
          <div className="wizard-stage">
            <RangeStep />
          </div>
        )}
        {step === 'model' && range && (
          <div className="wizard-stage">
            <ModelStep range={range} />
          </div>
        )}
        {step === 'design' && config && geo && model && price && (
          <>
            <aside className={`panel ${panelOpen ? '' : 'closed'}`}>
              <div className="panel-head">
                <button type="button" className="linkbtn" onClick={() => goto('model')}>
                  ← {rangeName} designs
                </button>
                <h2>
                  {model.name} <small>{model.tagline}</small>
                </h2>
              </div>
              <div className="panel-scroll">
                <Designer cfg={config} geo={geo} />
              </div>
              <footer className="pricebar">
                <div className="pb-main" onClick={() => setPanelOpen((v) => !v)} role="button" tabIndex={0}>
                  <span className="pb-l">
                    Your price <em className="pb-tap">· tap to {panelOpen ? 'view in 3D' : 'customise'}</em>
                  </span>
                  <strong>{price.total != null ? gbp(price.total) : 'POA'}</strong>
                  <span className="pb-sub">
                    {price.floorArea.toFixed(1)} m² · {config.width} × {config.depth}m internal
                  </span>
                  {price.options > 0 && <span className="pb-sub">incl. {gbp(price.options)} options</span>}
                </div>
                <button type="button" className="btn primary" onClick={() => { setCategory('summary'); setPanelOpen(true); }}>
                  Summary
                </button>
              </footer>
            </aside>
            <button type="button" className="panel-tab" onClick={() => setPanelOpen((v) => !v)} aria-label="Toggle options panel">
              {panelOpen ? '‹' : '›'}
              <span>{panelOpen ? 'Hide options' : 'Options'}</span>
            </button>
            <section className="viewport">
              {view === '3d' ? (
                <>
                  <Scene geo={geo} cfg={config} preset={cameraPreset} />
                  <div className="view-tools">
                    {CAMERA_PRESETS.map((p) => (
                      <button key={p.id} type="button" className={cameraPreset === p.id ? 'on' : ''} onClick={() => setCameraPreset(p.id)}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <p className="view-note">Drag to orbit · scroll to zoom</p>
                </>
              ) : (
                <PlanView geo={geo} cfg={config} />
              )}
            </section>
          </>
        )}
      </main>
      <footer className="legal">Prices shown are fully inclusive of VAT, installation and delivery (within 100 miles of our factory, postcode HP18 0XB). Option prices are indicative and confirmed at your free design consultation.</footer>
    </div>
  );
}

import { useMemo } from 'react';
import {
  CLADDINGS, DECKS, DECK_SIZES, DOORS, FASCIA_COLOURS, FEATURES, FLOORS, FRAME_COLOURS, STYLE_PACKS, WALL_FINISHES, WINDOWS, modelById,
  type FeatureSpec, type WallSide,
} from '../data/catalogue';
import { gridFor, isSizeAvailable, type BuildingGeometry, type DesignConfig } from '../model/geometry';
import { computePrice, gbp } from '../model/pricing';
import { encodeConfig, useStore, type Category } from '../model/store';
import { Chips, Section, Slider, Swatches, Toggle, claddingStyle } from './controls';

const CATS: { id: Category; label: string }[] = [
  { id: 'size', label: 'Size' },
  { id: 'exterior', label: 'Exterior' },
  { id: 'openings', label: 'Doors & windows' },
  { id: 'interior', label: 'Interior' },
  { id: 'electrics', label: 'Electrics & packs' },
  { id: 'summary', label: 'Summary' },
];

export function Designer({ cfg, geo }: { cfg: DesignConfig; geo: BuildingGeometry }) {
  const category = useStore((s) => s.category);
  const setCategory = useStore((s) => s.setCategory);
  const model = modelById(cfg.modelId);
  return (
    <div className="designer">
      <nav className="cats">
        {CATS.map((c) => (
          <button key={c.id} type="button" className={category === c.id ? 'on' : ''} onClick={() => setCategory(c.id)}>
            {c.label}
          </button>
        ))}
      </nav>
      <div className="cat-body">
        {category === 'size' && <SizePanel cfg={cfg} geo={geo} />}
        {category === 'exterior' && <ExteriorPanel cfg={cfg} geo={geo} />}
        {category === 'openings' && <OpeningsPanel cfg={cfg} geo={geo} />}
        {category === 'interior' && <InteriorPanel cfg={cfg} />}
        {category === 'electrics' && <ElectricsPanel cfg={cfg} />}
        {category === 'summary' && <SummaryPanel cfg={cfg} geo={geo} />}
        {model.sizeNote && category === 'size' && <p className="hint">{model.sizeNote}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Size
function SizePanel({ cfg, geo }: { cfg: DesignConfig; geo: BuildingGeometry }) {
  const model = modelById(cfg.modelId);
  const setSize = useStore((s) => s.setSize);
  const setOrientation = useStore((s) => s.setOrientation);
  const toggleFeature = useStore((s) => s.toggleFeature);
  const grid = gridFor(model, cfg.orientation);
  const widths = grid.widths.map((w) => w[0]);
  const depths = grid.depths.map((d) => d[0]);
  const wi = Math.max(0, widths.findIndex((w) => Math.abs(w - cfg.width) < 1e-6));
  const di = Math.max(0, depths.findIndex((d) => Math.abs(d - cfg.depth) < 1e-6));
  const ext = (list: [number, number][], v: number) => list.find((x) => Math.abs(x[0] - v) < 1e-6)?.[1] ?? v;
  return (
    <>
      {model.orientations && model.orientations.length > 1 && (
        <Section title="Front elevation" hint="Where the entrance and glazing sit on an apex building.">
          <Chips
            options={[
              { id: 'gable', label: 'Gable end', sub: 'Classic front-facing apex' },
              { id: 'eaves', label: 'Eaves side', sub: 'Wide, side-facing layout' },
            ]}
            value={cfg.orientation}
            onChange={(o) => setOrientation(o as 'gable' | 'eaves')}
          />
        </Section>
      )}
      <Section title="Footprint" hint={`${grid.prices.length} sizes available. Internal sizes shown; external in brackets.`}>
        <Slider label="Width" value={wi} min={0} max={widths.length - 1} step={1} onChange={(i) => setSize(widths[i], cfg.depth)} format={(i) => `${widths[i].toFixed(2)}m  (${ext(grid.widths, widths[i]).toFixed(2)}m ext)`} />
        <Slider label="Depth" value={di} min={0} max={depths.length - 1} step={1} onChange={(i) => setSize(cfg.width, depths[i])} format={(i) => `${depths[i].toFixed(2)}m  (${ext(grid.depths, depths[i]).toFixed(2)}m ext)`} />
        <div className="size-grid" style={{ gridTemplateColumns: `auto repeat(${widths.length}, 1fr)` }}>
          <span />
          {widths.map((w) => (
            <span key={w} className="sg-h">{w.toFixed(1)}</span>
          ))}
          {depths.map((d) => (
            <div key={d} className="sg-row" style={{ display: 'contents' }}>
              <span className="sg-h">{d.toFixed(1)}</span>
              {widths.map((w) => {
                const ok = isSizeAvailable(grid, w, d);
                const on = Math.abs(w - cfg.width) < 1e-6 && Math.abs(d - cfg.depth) < 1e-6;
                return <button key={w} type="button" className={`sg ${ok ? '' : 'na'} ${on ? 'on' : ''}`} disabled={!ok} onClick={() => setSize(w, d)} title={ok ? `${w}m × ${d}m` : 'Not available'} />;
              })}
            </div>
          ))}
        </div>
        <div className="kv">
          <span>Floor area</span>
          <strong>{geo.floorArea.toFixed(1)} m²</strong>
          <span>External footprint</span>
          <strong>{geo.extW.toFixed(2)}m × {geo.extD.toFixed(2)}m</strong>
          <span>External height</span>
          <strong>{(geo.roof.type === 'apex' ? geo.roof.ridgeH : geo.extHeight).toFixed(2)}m {geo.roof.type === 'apex' ? 'to ridge' : ''}</strong>
        </div>
      </Section>
      {model.extendedHeight && (
        <Section title="Height">
          <Toggle label={`Extended height ${model.extendedHeight}m`} sub="Extra headroom; usually still permitted development" on={cfg.features.includes('extendedHeight')} onChange={() => toggleFeature('extendedHeight')} price={FEATURES.extendedHeight.price} />
        </Section>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Exterior
function ExteriorPanel({ cfg, geo }: { cfg: DesignConfig; geo: BuildingGeometry }) {
  const model = modelById(cfg.modelId);
  const patch = useStore((s) => s.patch);
  const setStylePack = useStore((s) => s.setStylePack);
  const toggleFeature = useStore((s) => s.toggleFeature);
  const has = (f: string) => cfg.features.includes(f);
  const feat = (id: string) => FEATURES[id];
  const avail = (id: string) => model.features.includes(id);
  const cladOpts = model.claddings.map((id) => {
    const c = CLADDINGS[id];
    return { id, label: c.name, style: claddingStyle(c.base, c.pattern), price: c.pricePerM ? Math.round(c.pricePerM * (2 * geo.extW + 2 * geo.extD)) : 0, included: id === model.standardCladding, group: c.group };
  });
  return (
    <>
      {model.stylePacks && (
        <Section title="Style pack" hint="Sets the fascia, hood, doors and windows together. All packs are included in the price.">
          <Chips options={model.stylePacks.map((id) => ({ id, label: STYLE_PACKS[id].name, sub: STYLE_PACKS[id].description, included: true }))} value={cfg.stylePack} onChange={setStylePack} columns={1} />
        </Section>
      )}
      <Section title="Cladding" hint={model.range === 'b' || model.id === 'a1' ? 'Primed cladding must be painted within 6 months. Choose a paint colour to preview it.' : 'Prices shown for the whole building.'}>
        <Swatches options={cladOpts} value={cfg.cladding} onChange={(id) => patch({ cladding: id, frontCladding: cfg.frontCladding === id ? null : cfg.frontCladding })} />
        {model.claddings.length > 2 && model.range !== 'x1' && (
          <>
            <p className="hint" style={{ marginTop: 12 }}>Accent cladding on the front elevation only</p>
            <Swatches
              options={[{ id: '', label: 'Same as building', style: { background: '#eee' } }, ...cladOpts.filter((c) => c.id !== cfg.cladding).map((c) => ({ ...c, included: undefined, price: Math.round((CLADDINGS[c.id].pricePerM || 0) * geo.extW) }))]}
              value={cfg.frontCladding ?? ''}
              onChange={(id) => patch({ frontCladding: id || null })}
            />
          </>
        )}
      </Section>
      <Section title="Trim colours" hint="Fascia & hood, plus door and window frames.">
        <div className="two">
          <div>
            <p className="lbl">Fascia & hood</p>
            <Swatches
              options={FASCIA_COLOURS.filter((c) => (model.range === 'x1' ? c.id !== 'natural' : c.id !== 'copper')).map((c) => ({ id: c.id, label: c.name, style: c.id === 'natural' ? claddingStyle(c.hex, 'vertical') : { background: c.hex } }))}
              value={cfg.fascia}
              onChange={(id) => patch({ fascia: id, stylePack: null })}
            />
          </div>
          <div>
            <p className="lbl">Doors & windows</p>
            <Swatches options={FRAME_COLOURS.map((c) => ({ id: c.id, label: c.name, style: { background: c.hex } }))} value={cfg.frame} onChange={(id) => patch({ frame: id, stylePack: null })} />
          </div>
        </div>
      </Section>
      <Section title="Decking">
        <Chips
          options={DECK_SIZES.filter((d) => d.id !== 'standard' || model.deckBoards > 0).map((d) => ({ id: d.id, label: d.name, sub: d.id === 'standard' ? `${model.deckBoards} board step` : undefined, price: d.price, included: d.price === 0 }))}
          value={cfg.deckSize}
          onChange={(id) => patch({ deckSize: id })}
        />
        {cfg.deckSize !== 'none' && (
          <Swatches
            options={model.decks.map((id) => ({ id, label: DECKS[id].name, style: claddingStyle(DECKS[id].base, 'horizontal'), price: Math.round(DECKS[id].pricePerM * geo.extW), included: id === model.decks[0] }))}
            value={cfg.deckFinish}
            onChange={(id) => patch({ deckFinish: id })}
          />
        )}
      </Section>
      <Section title="Roof & screens">
        {avail('sedumRoof') && <Toggle label={feat('sedumRoof').name} sub="Living sedum roof" on={has('sedumRoof')} onChange={() => toggleFeature('sedumRoof')} price={feat('sedumRoof').price} />}
        {avail('solar') && <Toggle label={feat('solar').name} sub="Roof-mounted panels" on={has('solar')} onChange={() => toggleFeature('solar')} price={feat('solar').price} />}
        {model.sideScreen && avail('sideScreenFixed') && <Toggle label="Slatted side screen (fixed)" sub="Shade and privacy on the front corner" on={has('sideScreenFixed')} onChange={() => toggleFeature('sideScreenFixed')} price={feat('sideScreenFixed').price} />}
        {model.sideScreen && avail('sideScreenSliding') && <Toggle label="Slatted side screen (sliding)" on={has('sideScreenSliding')} onChange={() => toggleFeature('sideScreenSliding')} price={feat('sideScreenSliding').price} />}
        {geo.sideScreen && (
          <Chips options={[{ id: 'left', label: 'Left corner' }, { id: 'right', label: 'Right corner' }]} value={cfg.sideScreenSide} onChange={(id) => patch({ sideScreenSide: id as 'left' | 'right' })} />
        )}
      </Section>
      <Section title="External lighting" hint="One external light is included on fully inclusive ranges. Rainwater guttering and downpipe are always included.">
        {avail('extLightUpDown') && <Toggle label="Up/down light" on={has('extLightUpDown')} onChange={() => toggleFeature('extLightUpDown')} included={model.range !== 'b'} price={model.range === 'b' ? 145 : 0} />}
        {avail('extLightTorch') && <Toggle label="Torch light" sub="PIR sensor available free" on={has('extLightTorch')} onChange={() => toggleFeature('extLightTorch')} included={model.range !== 'b'} price={model.range === 'b' ? 145 : 0} />}
        {avail('hoodLights') && <Toggle label={feat('hoodLights').name} on={has('hoodLights')} onChange={() => toggleFeature('hoodLights')} price={feat('hoodLights').price} />}
        {avail('deckLights') && <Toggle label={feat('deckLights').name} on={has('deckLights')} onChange={() => toggleFeature('deckLights')} price={feat('deckLights').price} />}
        {avail('outsideSocket') && <Toggle label={feat('outsideSocket').name} on={has('outsideSocket')} onChange={() => toggleFeature('outsideSocket')} price={feat('outsideSocket').price} />}
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- Doors & windows
const WALL_LABEL: Record<WallSide, string> = { front: 'Front', left: 'Left side', right: 'Right side', back: 'Back' };

function OpeningsPanel({ cfg, geo }: { cfg: DesignConfig; geo: BuildingGeometry }) {
  const model = modelById(cfg.modelId);
  const patch = useStore((s) => s.patch);
  const addWindow = useStore((s) => s.addWindow);
  const updateWindow = useStore((s) => s.updateWindow);
  const removeWindow = useStore((s) => s.removeWindow);
  const extended = cfg.features.includes('extendedHeight');
  const doorGroups = useMemo(() => {
    const kinds: Record<string, string> = { french: 'French', sliding: 'Sliding', bifold: 'Bi-fold', single: 'Single', combi: 'Combination' };
    const groups: Record<string, string[]> = {};
    model.doors.forEach((id) => {
      const k = DOORS[id].kind;
      (groups[k] ??= []).push(id);
    });
    return Object.entries(groups).map(([k, ids]) => ({ label: kinds[k], ids }));
  }, [model]);
  const windowCount = cfg.windows.length;
  return (
    <>
      <Section title="Main door" hint={`${DOORS[model.standardDoor].name} is included. Maximum width is limited by the front elevation (${geo.extW.toFixed(2)}m).`}>
        {doorGroups.map((g) => (
          <div key={g.label} className="grp">
            <p className="lbl">{g.label}</p>
            <Chips
              options={g.ids.map((id) => ({ id, label: DOORS[id].name, sub: DOORS[id].note, price: DOORS[id].price, included: id === model.standardDoor, disabled: DOORS[id].width > geo.extW - 0.4 || (id === 'bifold48' && !extended) }))}
              value={cfg.door.type}
              onChange={(id) => patch({ door: { ...cfg.door, type: id } })}
            />
          </div>
        ))}
        <Slider label="Door position" value={Math.round(cfg.door.at * 100)} min={0} max={100} step={1} onChange={(v) => patch({ door: { ...cfg.door, at: v / 100 } })} format={(v) => `${v}% from left`} />
      </Section>
      <Section title="Windows" hint={`Included: ${model.standardWindows.map((w) => WINDOWS[w.type].name.split(' ').slice(0, 2).join(' ')).join(', ')}. Add extra windows to any wall.`}>
        {cfg.windows.map((w, i) => (
          <div key={w.id} className={`win-row ${geo.openings.some((o) => o.id === w.id) ? '' : 'nofit'}`}>
            <div className="win-h">
              <strong>
                {i + 1}. {WINDOWS[w.type].name}
              </strong>
              <button type="button" className="linkbtn danger" onClick={() => removeWindow(w.id)}>
                Remove
              </button>
            </div>
            {!geo.openings.some((o) => o.id === w.id) && <p className="warn">No room at this position next to the door or other windows. Move it along the wall or choose another wall.</p>}
            <Chips options={(['front', 'left', 'right', 'back'] as WallSide[]).map((s) => ({ id: s, label: WALL_LABEL[s] }))} value={w.wall} onChange={(s) => updateWindow(w.id, { wall: s as WallSide })} columns={4} />
            <Slider label="Position" value={Math.round(w.at * 100)} min={0} max={100} step={1} onChange={(v) => updateWindow(w.id, { at: v / 100 })} format={(v) => `${v}%`} />
          </div>
        ))}
        {windowCount >= 8 ? (
          <p className="hint">Maximum of 8 additional windows in the designer. Speak to our design team for more.</p>
        ) : (
          <>
            <p className="lbl">Add a window</p>
            <div className="chips cols-1">
              {model.windows.map((id) => (
                <button key={id} type="button" className="chip" onClick={() => addWindow(id, 'front')}>
                  <span className="chip-l">{WINDOWS[id].name}</span>
                  <span className="tag">+{gbp(WINDOWS[id].price)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- Interior
function FeatureToggles({ cfg, ids, hint }: { cfg: DesignConfig; ids: string[]; hint?: (f: FeatureSpec) => string | undefined }) {
  const model = modelById(cfg.modelId);
  const toggleFeature = useStore((s) => s.toggleFeature);
  return (
    <>
      {ids
        .filter((id) => model.features.includes(id))
        .map((id) => {
          const f = FEATURES[id];
          return <Toggle key={id} label={f.name} sub={hint?.(f) ?? f.description} on={cfg.features.includes(id)} onChange={() => toggleFeature(id)} price={f.price} />;
        })}
    </>
  );
}

function InteriorPanel({ cfg }: { cfg: DesignConfig }) {
  const model = modelById(cfg.modelId);
  const patch = useStore((s) => s.patch);
  return (
    <>
      <Section title="Wall finish">
        <Chips options={model.interiorWalls.map((id) => ({ id, label: WALL_FINISHES[id].name, price: WALL_FINISHES[id].price, included: id === model.interiorWalls[0] }))} value={cfg.wallFinish} onChange={(id) => patch({ wallFinish: id })} columns={1} />
      </Section>
      <Section title="Flooring">
        <Swatches options={model.floors.map((id) => ({ id, label: FLOORS[id].name, style: FLOORS[id].pattern === 'bare' ? { background: FLOORS[id].hex } : claddingStyle(FLOORS[id].hex, 'horizontal'), price: FLOORS[id].price, included: id === model.floors[0] }))} value={cfg.floor} onChange={(id) => patch({ floor: id })} />
      </Section>
      <Section title="Internal lighting" hint="Choose one lighting style. Included styles are free on fully inclusive ranges.">
        <FeatureToggles cfg={cfg} ids={['upDownLights', 'ledPanel', 'trackLights', 'recessedSpots', 'halo', 'circularLight']} />
      </Section>
      <Section title="Heating & comfort">
        <FeatureToggles cfg={cfg} ids={['radiator', 'radiator2kw', 'underfloor', 'aircon', 'mvhr']} />
      </Section>
      <Section title="Layout & finishing touches">
        <FeatureToggles cfg={cfg} ids={['partition']} />
        {cfg.features.includes('partition') && <Slider label="Partition position" value={Math.round(cfg.partitionAt * 100)} min={15} max={85} step={1} onChange={(v) => patch({ partitionAt: v / 100 })} format={(v) => `${v}% from left`} />}
        <FeatureToggles cfg={cfg} ids={['blinds', 'oakSkirting', 'acousticPack']} />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- Electrics
function ElectricsPanel({ cfg }: { cfg: DesignConfig }) {
  const model = modelById(cfg.modelId);
  return (
    <>
      {model.range === 'b' || model.id === 'a1' ? (
        <Section title="Building packs" hint="Add packs to bring the building up to a fully inclusive specification, or leave them off for a DIY approach.">
          <FeatureToggles cfg={cfg} ids={['foundationsPack', 'electricsPack', 'paintPack']} />
        </Section>
      ) : (
        <Section title="Included electrics" hint="Internal electrics are fitted by our Part-P certified electricians: 3 × 13amp double sockets, consumer unit and lighting.">
          <p className="hint">Six double sockets on the X1. Add more below.</p>
        </Section>
      )}
      <Section title="Sockets & switches">
        <FeatureToggles cfg={cfg} ids={['extraSocket', 'usbSockets', 'isolator', 'fusedSpur', 'extractor', 'outsideSocket']} />
      </Section>
      <Section title="Connectivity & connection">
        <FeatureToggles cfg={cfg} ids={['homeplug', 'cat6', 'electricalConnection']} />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- Summary
function SummaryPanel({ cfg, geo }: { cfg: DesignConfig; geo: BuildingGeometry }) {
  const model = modelById(cfg.modelId);
  const price = computePrice(cfg);
  const share = () => {
    const url = `${location.origin}${location.pathname}#d=${encodeConfig(cfg)}`;
    navigator.clipboard?.writeText(url).catch(() => undefined);
    history.replaceState(null, '', `#d=${encodeConfig(cfg)}`);
    alert('A link to this design has been copied to your clipboard.');
  };
  const email = () => {
    const lines = [
      `${model.name} (${model.range.toUpperCase()}) · ${cfg.width}m x ${cfg.depth}m internal`,
      `Base price: ${price.base != null ? gbp(price.base) : 'POA'}`,
      ...price.lines.map((l) => `${l.label}: ${gbp(l.amount)}`),
      `Total (indicative): ${price.total != null ? gbp(price.total) : 'POA'}`,
      '',
      `Design link: ${location.origin}${location.pathname}#d=${encodeConfig(cfg)}`,
    ];
    location.href = `mailto:hello@greenretreats.co.uk?subject=${encodeURIComponent('My ' + model.name + ' design')}&body=${encodeURIComponent(lines.join('\n'))}`;
  };
  return (
    <>
      <Section title="Your design" right={<span className="tag tag-inc">{model.name}</span>}>
        <div className="kv">
          <span>Size</span>
          <strong>{cfg.width.toFixed(2)}m × {cfg.depth.toFixed(2)}m internal ({geo.floorArea.toFixed(1)} m²)</strong>
          <span>External</span>
          <strong>{geo.extW.toFixed(2)}m × {geo.extD.toFixed(2)}m × {(geo.roof.type === 'apex' ? geo.roof.ridgeH : geo.extHeight).toFixed(2)}m</strong>
          <span>Cladding</span>
          <strong>{CLADDINGS[cfg.cladding].name}{cfg.frontCladding ? ` · ${CLADDINGS[cfg.frontCladding].name} front` : ''}</strong>
          <span>Door</span>
          <strong>{DOORS[cfg.door.type].name}</strong>
          <span>Windows</span>
          <strong>{geo.openings.filter((o) => o.kind === 'window' && !o.id.endsWith('r')).map((o) => WINDOWS[o.type].name).join(', ') || 'None'}</strong>
          <span>Decking</span>
          <strong>{DECK_SIZES.find((d) => d.id === cfg.deckSize)?.name}{cfg.deckSize !== 'none' ? ` · ${DECKS[cfg.deckFinish].name}` : ''}</strong>
          <span>Interior</span>
          <strong>{WALL_FINISHES[cfg.wallFinish].name} · {FLOORS[cfg.floor].name}</strong>
        </div>
      </Section>
      <Section title="Price breakdown" hint="Base prices are the published list prices. Option prices are indicative until confirmed by our design team.">
        <table className="price-table">
          <tbody>
            <tr>
              <td>{model.name} {cfg.width}m × {cfg.depth}m</td>
              <td>{price.base != null ? gbp(price.base) : 'POA'}</td>
            </tr>
            {price.lines.map((l, i) => (
              <tr key={i}>
                <td>{l.label}</td>
                <td>{gbp(l.amount)}</td>
              </tr>
            ))}
            <tr className="total">
              <td>Total inc. VAT</td>
              <td>{price.total != null ? gbp(price.total) : 'POA'}</td>
            </tr>
          </tbody>
        </table>
      </Section>
      <Section title="Included in the price">
        <ul className="inc">
          {model.included.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </Section>
      <div className="actions">
        <button type="button" className="btn primary" onClick={email}>
          Email my design
        </button>
        <button type="button" className="btn" onClick={share}>
          Copy share link
        </button>
        <button type="button" className="btn" onClick={() => window.print()}>
          Print
        </button>
      </div>
    </>
  );
}

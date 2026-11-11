import { CLADDINGS, DECKS, DECK_SIZES, DOORS, FEATURES, FLOORS, WALL_FINISHES, WINDOWS, modelById } from '../data/catalogue';
import { basePrice, computeGeometry, gridFor, type DesignConfig } from './geometry';

export interface PriceLine {
  label: string;
  amount: number;
  indicative?: boolean;
}

export interface PriceBreakdown {
  base: number | null;
  lines: PriceLine[];
  options: number;
  total: number | null;
  floorArea: number;
}

export const gbp = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');

export function computePrice(cfg: DesignConfig): PriceBreakdown {
  const model = modelById(cfg.modelId);
  const grid = gridFor(model, cfg.orientation);
  const base = basePrice(grid, cfg.width, cfg.depth);
  const geo = computeGeometry(cfg);
  const lines: PriceLine[] = [];
  const add = (label: string, amount: number) => {
    if (amount > 0) lines.push({ label, amount, indicative: true });
  };

  // Door upgrade
  const door = DOORS[cfg.door.type];
  if (door && door.id !== model.standardDoor) add(door.name, door.price);

  // Extra windows (only those that actually fit on the building)
  for (const w of cfg.windows) {
    const spec = WINDOWS[w.type];
    if (spec && geo.openings.some((o) => o.id === w.id)) add(spec.name, spec.price);
  }

  // Cladding, priced per linear metre of elevation (mirrors the existing configurator)
  const perimeter = 2 * geo.extW + 2 * (geo.intD + 2 * geo.wallT);
  const clad = CLADDINGS[cfg.cladding];
  if (clad && clad.id !== model.standardCladding) {
    const metres = cfg.frontCladding ? perimeter - geo.extW : perimeter;
    add(`${clad.name} cladding (${metres.toFixed(1)}m)`, clad.pricePerM * metres);
  }
  if (cfg.frontCladding) {
    const fc = CLADDINGS[cfg.frontCladding];
    if (fc && fc.id !== model.standardCladding) add(`${fc.name} front elevation (${geo.extW.toFixed(1)}m)`, fc.pricePerM * geo.extW);
  }

  // Decking
  const size = DECK_SIZES.find((d) => d.id === cfg.deckSize);
  const finish = DECKS[cfg.deckFinish];
  if (size && size.id !== 'none' && size.id !== 'standard') add(size.name, size.price);
  if (geo.deck && finish && finish.id !== model.decks[0]) add(`${finish.name} (${geo.extW.toFixed(1)}m)`, finish.pricePerM * geo.extW);

  // Interior
  const wall = WALL_FINISHES[cfg.wallFinish];
  if (wall && wall.id !== model.interiorWalls[0]) add(wall.name, wall.price + (wall.perM2 ?? 0) * geo.floorArea);
  const floor = FLOORS[cfg.floor];
  if (floor && floor.id !== model.floors[0]) add(floor.name, floor.price);

  // Features
  for (const f of cfg.features) {
    const spec = FEATURES[f];
    if (spec) add(spec.name, spec.price);
  }

  const options = lines.reduce((a, l) => a + l.amount, 0);
  return { base, lines, options, total: base == null ? null : base + options, floorArea: geo.floorArea };
}

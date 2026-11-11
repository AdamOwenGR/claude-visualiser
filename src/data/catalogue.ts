// Product catalogue for the Green Retreats 3D designer.
// Model facts (roof style, hood, deck boards, standard inclusions, sizes) are taken
// from greenretreats.co.uk range/model pages. Option prices are NOT published on the
// public site, so every option price below is an INDICATIVE placeholder, clearly
// marked with `indicative: true`, and should be replaced by the live pricing feed.

export type RangeId = 'b' | 'g' | 'a' | 'x1' | 'annex';
export type RoofType = 'pent' | 'apex';
export type HoodStyle =
  | 'none' // flat front, flush roof (G2, B2, Den)
  | 'allSides' // overhanging hooded roof on all sides, visible slope (G1, B1, Hide)
  | 'frontFrame' // extended square front frame / surround (G3, B3)
  | 'leanFrame' // forward-leaning front frame (G4)
  | 'curvedCorner'; // sheltered hood + enclosed side cheek with curved corner (G5, B5)
export type Orientation = 'gable' | 'eaves';
export type WallSide = 'front' | 'back' | 'left' | 'right';

export interface RangeSpec {
  id: RangeId;
  name: string;
  strap: string;
  blurb: string;
  from: number;
  roofWord: string;
}

export const RANGES: RangeSpec[] = [
  {
    id: 'b',
    name: 'B-Range',
    strap: 'Affordable garden rooms',
    blurb: 'Our most cost-effective range. A stripped-back base building with optional packs to bring it up to a full specification.',
    from: 9485,
    roofWord: 'Pent roof',
  },
  {
    id: 'g',
    name: 'G-Range',
    strap: 'The original garden room',
    blurb: 'Our signature, feature-rich pent roof garden rooms. Fully inclusive turnkey service with foundations, electrics and installation.',
    from: 23790,
    roofWord: 'Pent roof',
  },
  {
    id: 'a',
    name: 'A-Range',
    strap: 'Apex roof. Extra height.',
    blurb: 'Pitched roof garden rooms with extended height as standard. Choose a gable-end or eaves-side front elevation.',
    from: 16695,
    roofWord: 'Apex roof',
  },
  {
    id: 'x1',
    name: 'X1',
    strap: 'Luxury, in every detail',
    blurb: 'Our most opulent design. Metal cladding, aluminium doors, plastered interior and air conditioning as standard.',
    from: 49950,
    roofWord: 'Pent roof',
  },
  {
    id: 'annex',
    name: 'The Annex',
    strap: 'Garden houses for full-time living',
    blurb: 'Turnkey garden annexes with kitchen, bathroom and bedrooms. Caravan Act or Building Control compliant designs.',
    from: 63090,
    roofWord: 'Annex',
  },
];

export interface ModelSpec {
  id: string;
  range: RangeId;
  name: string;
  tagline: string;
  description: string;
  from: number;
  roof: RoofType;
  hood: HoodStyle;
  apexPitch?: number; // degrees
  deckBoards: number; // standard front deck step boards (0 = none)
  standardHeight: number; // external height metres
  extendedHeight?: number;
  orientations?: Orientation[];
  priceKey: string; // key into PRICE_GRIDS
  standardDoor: string; // door option id
  doors: string[];
  windows: string[]; // optional extra window types
  standardWindows: StandardWindow[];
  claddings: string[];
  standardCladding: string;
  stylePacks?: string[];
  decks: string[]; // deck finish ids ('' allowed means none)
  interiorWalls: string[];
  floors: string[];
  features: string[]; // feature ids from FEATURES available
  included: string[]; // human list of what's in the listed price
  sideScreen: boolean;
  sizeNote?: string;
}

export interface StandardWindow {
  type: string;
  wall: WallSide;
  /** 0..1 position along wall from left when viewed from outside */
  at: number;
}

// ---------------------------------------------------------------------------
// Option definitions
// ---------------------------------------------------------------------------

export interface DoorSpec {
  id: string;
  name: string;
  kind: 'french' | 'sliding' | 'bifold' | 'single' | 'combi';
  width: number; // metres (clear opening incl. frame)
  height: number;
  leaves: number;
  price: number; // upgrade price over the standard door (indicative)
  note?: string;
}

export const DOORS: Record<string, DoorSpec> = {
  single: { id: 'single', name: 'Single door', kind: 'single', width: 0.805, height: 2.1, leaves: 1, price: 0 },
  french15: { id: 'french15', name: 'French doors 1.45m', kind: 'french', width: 1.45, height: 2.1, leaves: 2, price: 0 },
  french18: { id: 'french18', name: 'French doors 1.8m', kind: 'french', width: 1.8, height: 2.1, leaves: 2, price: 0 },
  french23: { id: 'french23', name: 'French doors 2.3m', kind: 'french', width: 2.3, height: 2.1, leaves: 2, price: 0 },
  french28: { id: 'french28', name: 'French doors 2.8m', kind: 'french', width: 2.8, height: 2.1, leaves: 2, price: 450 },
  french38: { id: 'french38', name: 'French doors 3.8m', kind: 'french', width: 3.8, height: 2.1, leaves: 2, price: 1250 },
  sliding18: { id: 'sliding18', name: 'Sliding doors 1.8m', kind: 'sliding', width: 1.8, height: 2.1, leaves: 2, price: 0 },
  sliding23: { id: 'sliding23', name: 'Sliding doors 2.3m', kind: 'sliding', width: 2.3, height: 2.1, leaves: 2, price: 0 },
  sliding28: { id: 'sliding28', name: 'Sliding doors 2.8m', kind: 'sliding', width: 2.8, height: 2.1, leaves: 2, price: 450 },
  sliding30: { id: 'sliding30', name: 'Large sliding doors 3.0m', kind: 'sliding', width: 3.0, height: 2.1, leaves: 2, price: 1150 },
  sliding38: { id: 'sliding38', name: 'Sliding doors 3.8m', kind: 'sliding', width: 3.8, height: 2.1, leaves: 3, price: 1250 },
  bifold28: { id: 'bifold28', name: 'Bi-fold doors 2.8m', kind: 'bifold', width: 2.8, height: 2.1, leaves: 3, price: 1450 },
  bifold38: { id: 'bifold38', name: 'Bi-fold doors 3.8m', kind: 'bifold', width: 3.8, height: 2.1, leaves: 4, price: 2250 },
  bifold48: { id: 'bifold48', name: 'Bi-fold doors 4.8m', kind: 'bifold', width: 4.8, height: 2.3, leaves: 5, price: 3450, note: 'Extended height buildings only' },
  x1bifold38: { id: 'x1bifold38', name: 'Aluminium bi-fold 3.8m', kind: 'bifold', width: 3.8, height: 2.2, leaves: 4, price: 0 },
  x1sliding38: { id: 'x1sliding38', name: 'Aluminium sliding 3.8m', kind: 'sliding', width: 3.8, height: 2.2, leaves: 3, price: 0 },
  x1combi38: { id: 'x1combi38', name: 'Aluminium French combi 3.8m', kind: 'combi', width: 3.8, height: 2.2, leaves: 4, price: 0 },
  annexEntrance: { id: 'annexEntrance', name: 'Entrance door 2.3m combi', kind: 'combi', width: 2.3, height: 2.1, leaves: 3, price: 0 },
};

export interface WindowSpec {
  id: string;
  name: string;
  width: number;
  height: number;
  sill: number; // metres above floor
  opening: boolean;
  price: number;
  corner?: boolean;
}

export const WINDOWS: Record<string, WindowSpec> = {
  lozengeH: { id: 'lozengeH', name: 'Horizontal lozenge 905 × 440', width: 0.905, height: 0.44, sill: 1.45, opening: true, price: 395 },
  lozengeV: { id: 'lozengeV', name: 'Vertical lozenge 405 × 905', width: 0.405, height: 0.905, sill: 1.0, opening: true, price: 395 },
  panoramic: { id: 'panoramic', name: 'Panoramic lozenge 1800 × 440', width: 1.8, height: 0.44, sill: 1.45, opening: true, price: 650 },
  square: { id: 'square', name: 'Opening square 905 × 905', width: 0.905, height: 0.905, sill: 1.0, opening: true, price: 595 },
  fullHeightS: { id: 'fullHeightS', name: 'Full height 500 × 2070', width: 0.5, height: 2.07, sill: 0.03, opening: false, price: 695 },
  fullHeightL: { id: 'fullHeightL', name: 'Full height 1000 × 2070', width: 1.0, height: 2.07, sill: 0.03, opening: false, price: 950 },
  picture: { id: 'picture', name: 'Picture window 905 × 1650', width: 0.905, height: 1.65, sill: 0.45, opening: false, price: 850 },
  xlPicture: { id: 'xlPicture', name: 'XL picture window 1800 × 1650', width: 1.8, height: 1.65, sill: 0.45, opening: false, price: 1450 },
  corner: { id: 'corner', name: 'Corner window', width: 0.6, height: 2.07, sill: 0.03, opening: false, price: 0, corner: true },
  fireEscape: { id: 'fireEscape', name: 'Fire safety opening window 905 × 905', width: 0.905, height: 0.905, sill: 1.0, opening: true, price: 0 },
};

export type CladdingPattern = 'vertical' | 'horizontal' | 'slatted' | 'seam' | 'metal';

export interface CladdingSpec {
  id: string;
  name: string;
  group: 'timber' | 'composite' | 'metal' | 'painted' | 'vinyl';
  pattern: CladdingPattern;
  base: string; // hex colour
  variance: number; // 0..1 colour variance between boards
  grain: number; // 0..1 grain strength
  boardWidth: number; // metres
  roughness: number;
  metalness: number;
  pricePerM: number; // indicative upgrade per linear metre of wall
  swatch?: string;
}

export const CLADDINGS: Record<string, CladdingSpec> = {
  redwood: { id: 'redwood', name: 'Scandinavian redwood', group: 'timber', pattern: 'vertical', base: '#c89a62', variance: 0.18, grain: 0.6, boardWidth: 0.12, roughness: 0.78, metalness: 0, pricePerM: 0 },
  honey: { id: 'honey', name: 'Honey redwood', group: 'timber', pattern: 'vertical', base: '#b8793d', variance: 0.16, grain: 0.6, boardWidth: 0.12, roughness: 0.72, metalness: 0, pricePerM: 38 },
  cedar: { id: 'cedar', name: 'Western red cedar', group: 'timber', pattern: 'vertical', base: '#a86a44', variance: 0.3, grain: 0.5, boardWidth: 0.095, roughness: 0.7, metalness: 0, pricePerM: 95 },
  cedarPremium: { id: 'cedarPremium', name: 'Premium cedar (clear grade)', group: 'timber', pattern: 'vertical', base: '#b57a4c', variance: 0.12, grain: 0.45, boardWidth: 0.095, roughness: 0.68, metalness: 0, pricePerM: 135 },
  redwoodSlatted: { id: 'redwoodSlatted', name: 'Slatted redwood', group: 'timber', pattern: 'slatted', base: '#c89a62', variance: 0.16, grain: 0.6, boardWidth: 0.045, roughness: 0.78, metalness: 0, pricePerM: 85 },
  honeySlatted: { id: 'honeySlatted', name: 'Slatted honey redwood', group: 'timber', pattern: 'slatted', base: '#b8793d', variance: 0.16, grain: 0.6, boardWidth: 0.045, roughness: 0.72, metalness: 0, pricePerM: 110 },
  cedarSlatted: { id: 'cedarSlatted', name: 'Slatted cedar', group: 'timber', pattern: 'slatted', base: '#a86a44', variance: 0.28, grain: 0.5, boardWidth: 0.045, roughness: 0.7, metalness: 0, pricePerM: 150 },
  compositeBlack: { id: 'compositeBlack', name: 'Composite black', group: 'composite', pattern: 'horizontal', base: '#2b2b2b', variance: 0.05, grain: 0.35, boardWidth: 0.15, roughness: 0.6, metalness: 0, pricePerM: 120 },
  compositeGrey: { id: 'compositeGrey', name: 'Composite grey', group: 'composite', pattern: 'horizontal', base: '#7d7f7e', variance: 0.05, grain: 0.35, boardWidth: 0.15, roughness: 0.6, metalness: 0, pricePerM: 120 },
  compositeOak: { id: 'compositeOak', name: 'Composite oak', group: 'composite', pattern: 'horizontal', base: '#a57b50', variance: 0.06, grain: 0.4, boardWidth: 0.15, roughness: 0.6, metalness: 0, pricePerM: 120 },
  compositeCedar: { id: 'compositeCedar', name: 'Composite cedar', group: 'composite', pattern: 'horizontal', base: '#8e5a3a', variance: 0.06, grain: 0.4, boardWidth: 0.15, roughness: 0.6, metalness: 0, pricePerM: 120 },
  standingSeam: { id: 'standingSeam', name: 'Standing seam graphite', group: 'metal', pattern: 'seam', base: '#3a3d41', variance: 0.02, grain: 0.1, boardWidth: 0.3, roughness: 0.45, metalness: 0.6, pricePerM: 160 },
  metalBlack: { id: 'metalBlack', name: 'Textured black metal', group: 'metal', pattern: 'metal', base: '#232426', variance: 0.03, grain: 0.3, boardWidth: 0.3, roughness: 0.55, metalness: 0.5, pricePerM: 0 },
  metalCopper: { id: 'metalCopper', name: 'Deep copper metal', group: 'metal', pattern: 'metal', base: '#8a4a28', variance: 0.04, grain: 0.3, boardWidth: 0.3, roughness: 0.3, metalness: 0.8, pricePerM: 0 },
  primed: { id: 'primed', name: 'Primed wood-effect (paint required)', group: 'painted', pattern: 'horizontal', base: '#d9d4c7', variance: 0.03, grain: 0.3, boardWidth: 0.2, roughness: 0.8, metalness: 0, pricePerM: 0 },
  paintBlack: { id: 'paintBlack', name: 'Painted modern black', group: 'painted', pattern: 'horizontal', base: '#26272a', variance: 0.02, grain: 0.25, boardWidth: 0.2, roughness: 0.75, metalness: 0, pricePerM: 0 },
  paintGrey: { id: 'paintGrey', name: 'Painted smokey grey', group: 'painted', pattern: 'horizontal', base: '#6f7275', variance: 0.02, grain: 0.25, boardWidth: 0.2, roughness: 0.75, metalness: 0, pricePerM: 0 },
  paintSage: { id: 'paintSage', name: 'Painted chic sage green', group: 'painted', pattern: 'horizontal', base: '#8a9a82', variance: 0.02, grain: 0.25, boardWidth: 0.2, roughness: 0.75, metalness: 0, pricePerM: 0 },
  vinylOak: { id: 'vinylOak', name: 'uPVC wood-effect vinyl (maintenance free)', group: 'vinyl', pattern: 'horizontal', base: '#b48a5c', variance: 0.04, grain: 0.45, boardWidth: 0.17, roughness: 0.55, metalness: 0, pricePerM: 55 },
  vinylAnthracite: { id: 'vinylAnthracite', name: 'uPVC anthracite vinyl (maintenance free)', group: 'vinyl', pattern: 'horizontal', base: '#3b3e42', variance: 0.03, grain: 0.3, boardWidth: 0.17, roughness: 0.55, metalness: 0, pricePerM: 55 },
};

export interface ColourSpec {
  id: string;
  name: string;
  hex: string;
  price?: number;
}

export const FRAME_COLOURS: ColourSpec[] = [
  { id: 'graphite', name: 'Graphite', hex: '#3b3e42' },
  { id: 'black', name: 'Black', hex: '#141516' },
];

export const FASCIA_COLOURS: ColourSpec[] = [
  { id: 'graphite', name: 'Graphite', hex: '#3b3e42' },
  { id: 'black', name: 'Black', hex: '#141516' },
  { id: 'natural', name: 'Natural timber', hex: '#c89a62' },
  { id: 'copper', name: 'Copper', hex: '#7a4a2e' },
];

export interface StylePack {
  id: string;
  name: string;
  fascia: string;
  frame: string;
  description: string;
}

export const STYLE_PACKS: Record<string, StylePack> = {
  graphite: { id: 'graphite', name: 'Graphite Pack', fascia: 'graphite', frame: 'graphite', description: 'Graphite fascia, hood, doors and windows' },
  black: { id: 'black', name: 'Black Pack', fascia: 'black', frame: 'black', description: 'Black fascia, hood, doors and windows' },
  natural: { id: 'natural', name: 'Natural Pack', fascia: 'natural', frame: 'black', description: 'Natural timber hood and fascia with black joinery' },
};

export interface DeckSpec {
  id: string;
  name: string;
  base: string;
  variance: number;
  grain: number;
  boardWidth: number;
  pricePerM: number; // indicative, per metre of deck width, for the extended size
}

export const DECKS: Record<string, DeckSpec> = {
  redwood: { id: 'redwood', name: 'Redwood decking', base: '#b98d5a', variance: 0.15, grain: 0.6, boardWidth: 0.145, pricePerM: 0 },
  honey: { id: 'honey', name: 'Honey redwood decking', base: '#a66f38', variance: 0.14, grain: 0.6, boardWidth: 0.145, pricePerM: 25 },
  cedar: { id: 'cedar', name: 'Cedar decking', base: '#9c6240', variance: 0.25, grain: 0.5, boardWidth: 0.145, pricePerM: 70 },
  compositeGrey: { id: 'compositeGrey', name: 'Composite grey decking', base: '#767977', variance: 0.04, grain: 0.3, boardWidth: 0.145, pricePerM: 95 },
  compositeBlack: { id: 'compositeBlack', name: 'Composite black decking', base: '#2d2d2d', variance: 0.04, grain: 0.3, boardWidth: 0.145, pricePerM: 95 },
};

export interface DeckSize {
  id: string;
  name: string;
  depth: number | 'standard'; // metres, or model's standard board step
  price: number; // indicative base price; plus deck finish per metre
}

export const DECK_SIZES: DeckSize[] = [
  { id: 'none', name: 'No decking', depth: 0, price: 0 },
  { id: 'standard', name: 'Standard step', depth: 'standard', price: 0 },
  { id: 'extended', name: 'Extended 1.2m deck', depth: 1.2, price: 950 },
  { id: 'large', name: 'Large 2.4m deck', depth: 2.4, price: 1950 },
];

export interface FloorSpec {
  id: string;
  name: string;
  hex: string;
  pattern: 'plank' | 'tile' | 'bare';
  price: number;
}

export const FLOORS: Record<string, FloorSpec> = {
  whiteOak: { id: 'whiteOak', name: 'White oak laminate', hex: '#d8cbb3', pattern: 'plank', price: 0 },
  greyOak: { id: 'greyOak', name: 'Grey oak laminate', hex: '#a9a39b', pattern: 'plank', price: 0 },
  naturalOak: { id: 'naturalOak', name: 'Natural oak laminate', hex: '#c4a071', pattern: 'plank', price: 0 },
  darkOak: { id: 'darkOak', name: 'Dark oak laminate', hex: '#6e4f36', pattern: 'plank', price: 0 },
  lightOak: { id: 'lightOak', name: 'Light oak laminate', hex: '#d2b88f', pattern: 'plank', price: 0 },
  carpetGrey: { id: 'carpetGrey', name: 'Grey carpet tile', hex: '#8a8c8f', pattern: 'tile', price: 0 },
  hardwood: { id: 'hardwood', name: 'Engineered hardwood', hex: '#b08658', pattern: 'plank', price: 0 },
  bare: { id: 'bare', name: 'No flooring (sub-floor only)', hex: '#c9c2b2', pattern: 'bare', price: 0 },
  floorPack: { id: 'floorPack', name: 'Floor pack (fitted laminate)', hex: '#c4a071', pattern: 'plank', price: 795 },
};

export interface WallFinish {
  id: string;
  name: string;
  hex: string;
  price: number;
  perM2?: number;
}

export const WALL_FINISHES: Record<string, WallFinish> = {
  melamine: { id: 'melamine', name: 'White melamine (soft sheen)', hex: '#f4f4f1', price: 0 },
  osb: { id: 'osb', name: 'Textured OSB3 timber', hex: '#c7a66b', price: 0 },
  plaster: { id: 'plaster', name: 'Plaster pack (skimmed & painted white)', hex: '#f7f6f2', price: 1450, perM2: 95 },
  plasterSage: { id: 'plasterSage', name: 'Plaster pack painted sage', hex: '#b9c3b2', price: 1950, perM2: 95 },
  plasterNavy: { id: 'plasterNavy', name: 'Plaster pack painted navy feature', hex: '#f7f6f2', price: 1950, perM2: 95 },
  plasteredStd: { id: 'plasteredStd', name: 'Plastered & painted (standard)', hex: '#f7f6f2', price: 0 },
};

export type FeatureCategory = 'exterior' | 'interior' | 'electrics' | 'comfort';

export interface FeatureSpec {
  id: string;
  name: string;
  category: FeatureCategory;
  price: number; // indicative
  description?: string;
  visual?: boolean; // shown in 3D/plan
  exclusive?: string; // radio group id
  standardFor?: RangeId[];
}

export const FEATURES: Record<string, FeatureSpec> = {
  // Exterior
  sedumRoof: { id: 'sedumRoof', name: 'Sedum green roof', category: 'exterior', price: 2450, visual: true, description: 'Living roof planted with hardy sedum' },
  sideScreenFixed: { id: 'sideScreenFixed', name: 'Exterior slatted side screen (fixed)', category: 'exterior', price: 1250, visual: true, exclusive: 'sideScreen' },
  sideScreenSliding: { id: 'sideScreenSliding', name: 'Exterior slatted side screen (sliding)', category: 'exterior', price: 1850, visual: true, exclusive: 'sideScreen' },
  deckLights: { id: 'deckLights', name: 'Deck lights (inset LED spots)', category: 'exterior', price: 395, visual: true },
  hoodLights: { id: 'hoodLights', name: 'Hood lights (inset LED spots)', category: 'exterior', price: 395, visual: true },
  extLightUpDown: { id: 'extLightUpDown', name: 'External up/down light', category: 'exterior', price: 0, visual: true, exclusive: 'extLight' },
  extLightTorch: { id: 'extLightTorch', name: 'External torch light (PIR available)', category: 'exterior', price: 0, visual: true, exclusive: 'extLight' },
  solar: { id: 'solar', name: 'Solar panel upgrade', category: 'exterior', price: 4950, visual: true },
  outsideSocket: { id: 'outsideSocket', name: 'Outside socket', category: 'electrics', price: 145, visual: true },
  // Interior
  partition: { id: 'partition', name: 'Partition wall with internal door', category: 'interior', price: 1250, visual: true },
  oakSkirting: { id: 'oakSkirting', name: 'Oak veneer skirting boards', category: 'interior', price: 295 },
  blinds: { id: 'blinds', name: 'Fitted blinds', category: 'interior', price: 650 },
  acousticPack: { id: 'acousticPack', name: 'Acoustic pack (45dB, incl. plaster pack)', category: 'interior', price: 3950 },
  recessedSpots: { id: 'recessedSpots', name: 'Recessed spot lights', category: 'electrics', price: 495, visual: true, exclusive: 'intLight' },
  halo: { id: 'halo', name: 'Halo ceiling light (plastered ceiling)', category: 'electrics', price: 1650, visual: true, exclusive: 'intLight' },
  upDownLights: { id: 'upDownLights', name: '2 side-mounted up/down lights', category: 'electrics', price: 0, visual: true, exclusive: 'intLight' },
  ledPanel: { id: 'ledPanel', name: 'LED panel light 600 × 600', category: 'electrics', price: 0, visual: true, exclusive: 'intLight' },
  trackLights: { id: 'trackLights', name: 'Track light with 4 LED spots', category: 'electrics', price: 0, visual: true, exclusive: 'intLight' },
  circularLight: { id: 'circularLight', name: 'Black & wood circular ceiling light', category: 'electrics', price: 195, visual: true, exclusive: 'intLight' },
  // Electrics
  electricsPack: { id: 'electricsPack', name: 'Electrics pack (2 sockets, panel light, consumer unit, radiator)', category: 'electrics', price: 1650 },
  extraSocket: { id: 'extraSocket', name: 'Additional double socket', category: 'electrics', price: 85 },
  usbSockets: { id: 'usbSockets', name: 'USB sockets (brushed aluminium, black or white)', category: 'electrics', price: 120 },
  isolator: { id: 'isolator', name: 'Isolator switch', category: 'electrics', price: 95 },
  fusedSpur: { id: 'fusedSpur', name: 'Fused spur', category: 'electrics', price: 75 },
  extractor: { id: 'extractor', name: 'Extractor fan', category: 'electrics', price: 245, visual: true },
  homeplug: { id: 'homeplug', name: 'HomePlug internet adapter', category: 'electrics', price: 95, exclusive: 'internet' },
  cat6: { id: 'cat6', name: 'Cat6 armoured ethernet cable', category: 'electrics', price: 395, exclusive: 'internet' },
  electricalConnection: { id: 'electricalConnection', name: 'Professional electrical connection (Homepower, quoted at survey)', category: 'electrics', price: 0 },
  // Comfort
  radiator: { id: 'radiator', name: 'Wall-mounted radiator', category: 'comfort', price: 0, visual: true, exclusive: 'heating' },
  radiator2kw: { id: 'radiator2kw', name: 'Wall-mounted radiator 2kW', category: 'comfort', price: 95, visual: true, exclusive: 'heating' },
  underfloor: { id: 'underfloor', name: 'Carbon film underfloor heating', category: 'comfort', price: 950, exclusive: 'heating' },
  aircon: { id: 'aircon', name: 'Air conditioning (hot & cold)', category: 'comfort', price: 2290, visual: true, exclusive: 'heating' },
  mvhr: { id: 'mvhr', name: 'Clean air MVHR system (Auren 160)', category: 'comfort', price: 2950 },
  foundationsPack: { id: 'foundationsPack', name: 'Foundations pack (ground screws)', category: 'exterior', price: 1450 },
  extendedHeight: { id: 'extendedHeight', name: 'Extended height 2.7m', category: 'exterior', price: 1650, visual: true },
  paintPack: { id: 'paintPack', name: 'DIY paint pack', category: 'exterior', price: 295 },
};

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

const G_DOORS = ['french15', 'french23', 'french28', 'french38', 'sliding23', 'sliding28', 'sliding38', 'bifold28', 'bifold38', 'bifold48', 'single'];
const G_WINDOWS = ['lozengeH', 'lozengeV', 'square', 'fullHeightS', 'fullHeightL', 'picture', 'xlPicture'];
const G_CLADDING = ['redwood', 'honey', 'cedar', 'cedarPremium', 'redwoodSlatted', 'honeySlatted', 'cedarSlatted', 'compositeBlack', 'compositeGrey', 'compositeOak', 'compositeCedar', 'standingSeam'];
const G_DECKS = ['redwood', 'honey', 'cedar', 'compositeGrey', 'compositeBlack'];
const G_FLOORS = ['whiteOak', 'greyOak', 'naturalOak', 'carpetGrey'];
const G_WALLS = ['melamine', 'plaster', 'plasterSage'];
const G_FEATURES = [
  'sedumRoof', 'sideScreenFixed', 'sideScreenSliding', 'deckLights', 'hoodLights', 'extLightUpDown', 'extLightTorch', 'solar', 'outsideSocket',
  'partition', 'oakSkirting', 'blinds', 'acousticPack', 'recessedSpots', 'halo', 'upDownLights', 'ledPanel', 'trackLights', 'circularLight',
  'extraSocket', 'usbSockets', 'isolator', 'fusedSpur', 'extractor', 'homeplug', 'cat6', 'electricalConnection',
  'radiator', 'radiator2kw', 'underfloor', 'aircon', 'mvhr', 'extendedHeight',
];
const G_INCLUDED = [
  'Full professional installation', 'Base / foundations', 'Internal electrics (3 double sockets, consumer unit, lighting)', 'Delivery within 100 miles of HP18',
  'Redwood cladding', 'White melamine interior walls', '2.3m high-security uPVC French or sliding door', 'Insurance-grade locks', 'Opening lozenge window', 'Corner window',
  'Premium double-glazing', 'Wall-mounted radiator', 'Oak laminate flooring', 'Internal & external lighting', 'High-performance insulation', 'Coated steel roof', '12 year guarantee',
];

const B_DOORS = ['single', 'french15', 'french18', 'sliding18', 'sliding30'];
const B_WINDOWS = ['lozengeH', 'fullHeightS', 'fullHeightL'];
const B_CLADDING = ['primed', 'paintBlack', 'paintGrey', 'paintSage', 'vinylOak', 'vinylAnthracite'];
const B_DECKS = ['compositeGrey', 'compositeBlack', 'redwood'];
const B_FLOORS = ['bare', 'lightOak', 'greyOak', 'darkOak'];
const B_WALLS = ['melamine'];
const B_FEATURES = [
  'foundationsPack', 'electricsPack', 'paintPack', 'sideScreenFixed', 'extLightUpDown', 'extLightTorch', 'partition', 'blinds', 'ledPanel', 'upDownLights',
  'extraSocket', 'usbSockets', 'outsideSocket', 'homeplug', 'cat6', 'electricalConnection', 'aircon', 'radiator',
];
const B_INCLUDED = [
  'Full building and installation', 'Delivery within 50 miles of HP18', 'Full measurements and site survey', '1.8m high-security uPVC French or sliding door',
  'Opening lozenge window', 'Premium double-glazing', 'Insurance-grade locks', 'Eco-foam insulation', 'Coated steel roof', 'Pre-primed wood-effect cladding (painting required within 6 months)',
  'White melamine interior walls', 'Composite deck step', '12 year guarantee',
];

const ANNEX_DOORS = ['french23', 'sliding23', 'annexEntrance', 'sliding28', 'bifold28', 'bifold38'];
const ANNEX_WINDOWS = ['fireEscape', 'square', 'lozengeH', 'lozengeV', 'fullHeightL', 'picture', 'xlPicture'];
const ANNEX_FEATURES = [
  'sedumRoof', 'deckLights', 'extLightUpDown', 'extLightTorch', 'solar', 'outsideSocket', 'blinds', 'recessedSpots', 'halo',
  'extraSocket', 'usbSockets', 'extractor', 'cat6', 'aircon', 'underfloor', 'mvhr',
];
const ANNEX_INCLUDED = [
  'Full measurements and site survey', 'Full building installation', 'Ground screw foundations', '12 year guarantee', '2.3m high-security uPVC French, sliding or entrance door',
  'Fire safety opening window', 'Premium double-glazing throughout', '10m of plumbing & 20m of electrical connection', 'Standard fitted kitchen and bathroom',
];

export const MODELS: ModelSpec[] = [
  // --------------------------------------------------------------- B-Range
  {
    id: 'b1-lite', range: 'b', name: 'B1 Lite', tagline: 'The entry point', from: 9485,
    description: 'The B1 design with scaled back features and options, with a distinctive OSB wood interior.',
    roof: 'pent', hood: 'allSides', deckBoards: 0, standardHeight: 2.5, priceKey: 'b1-lite',
    standardDoor: 'sliding18', doors: ['single', 'french15', 'french18', 'sliding18'], windows: ['lozengeH'],
    standardWindows: [{ type: 'lozengeH', wall: 'front', at: 0.78 }],
    claddings: ['primed', 'paintBlack', 'paintGrey', 'paintSage'], standardCladding: 'primed',
    decks: ['compositeGrey'], interiorWalls: ['osb'], floors: ['bare', 'lightOak', 'greyOak', 'darkOak'],
    features: ['foundationsPack', 'electricsPack', 'paintPack', 'extLightUpDown', 'extraSocket', 'homeplug', 'radiator'],
    included: ['Full building and installation', 'Delivery within 50 miles of HP18', '1.8m uPVC French or sliding door', 'Opening lozenge window', 'Eco-foam insulation', 'Pre-primed wood-effect cladding', 'OSB3 timber interior'],
    sideScreen: false,
  },
  {
    id: 'b1', range: 'b', name: 'B1', tagline: 'Modern cabin style', from: 12485,
    description: 'A modern cabin style building with a visibly sloping roof and front hood for a sheltered, traditional feel.',
    roof: 'pent', hood: 'allSides', deckBoards: 1, standardHeight: 2.5, priceKey: 'b1',
    standardDoor: 'sliding18', doors: B_DOORS, windows: B_WINDOWS,
    standardWindows: [{ type: 'lozengeH', wall: 'front', at: 0.78 }],
    claddings: B_CLADDING, standardCladding: 'primed', decks: B_DECKS, interiorWalls: B_WALLS, floors: B_FLOORS,
    features: B_FEATURES, included: B_INCLUDED, sideScreen: true,
  },
  {
    id: 'b2', range: 'b', name: 'B2', tagline: 'Compact pod style', from: 12485,
    description: 'The simplest and most compact design in the range, featuring squared lines and a flat front for a pod style profile.',
    roof: 'pent', hood: 'none', deckBoards: 1, standardHeight: 2.5, priceKey: 'b2',
    standardDoor: 'sliding18', doors: B_DOORS, windows: B_WINDOWS,
    standardWindows: [{ type: 'lozengeH', wall: 'front', at: 0.78 }],
    claddings: B_CLADDING, standardCladding: 'primed', decks: B_DECKS, interiorWalls: B_WALLS, floors: B_FLOORS,
    features: B_FEATURES, included: B_INCLUDED, sideScreen: false,
  },
  {
    id: 'b3', range: 'b', name: 'B3', tagline: 'Sharp architectural frame', from: 13485,
    description: 'A sharp, squared design with a protruding front frame and integrated side cheek that adds depth and creates a strong architectural feature.',
    roof: 'pent', hood: 'frontFrame', deckBoards: 2, standardHeight: 2.5, priceKey: 'b3',
    standardDoor: 'sliding18', doors: B_DOORS, windows: B_WINDOWS,
    standardWindows: [{ type: 'lozengeH', wall: 'front', at: 0.78 }],
    claddings: B_CLADDING, standardCladding: 'primed', decks: B_DECKS, interiorWalls: B_WALLS, floors: B_FLOORS,
    features: B_FEATURES, included: B_INCLUDED, sideScreen: true,
  },
  {
    id: 'b5', range: 'b', name: 'B5', tagline: 'Signature curved corner', from: 13485,
    description: 'A modern, squared form distinguished by a signature curved corner, blending a sheltered hood with an integrated side cheek.',
    roof: 'pent', hood: 'curvedCorner', deckBoards: 2, standardHeight: 2.5, priceKey: 'b5',
    standardDoor: 'sliding18', doors: B_DOORS, windows: B_WINDOWS,
    standardWindows: [{ type: 'lozengeH', wall: 'front', at: 0.78 }],
    claddings: B_CLADDING, standardCladding: 'primed', decks: B_DECKS, interiorWalls: B_WALLS, floors: B_FLOORS,
    features: B_FEATURES, included: B_INCLUDED, sideScreen: true,
  },
  // --------------------------------------------------------------- G-Range
  {
    id: 'g1', range: 'g', name: 'G1', tagline: 'Hooded roof on all sides', from: 23790,
    description: 'Traditional cabin style in a modern design with a grand hood that extends from all sides and a three board deck step.',
    roof: 'pent', hood: 'allSides', deckBoards: 3, standardHeight: 2.5, extendedHeight: 2.7, priceKey: 'g1',
    standardDoor: 'sliding23', doors: G_DOORS, windows: G_WINDOWS,
    standardWindows: [{ type: 'lozengeH', wall: 'front', at: 0.8 }, { type: 'corner', wall: 'right', at: 1 }],
    claddings: G_CLADDING, standardCladding: 'redwood', stylePacks: ['graphite', 'black', 'natural'], decks: G_DECKS,
    interiorWalls: G_WALLS, floors: G_FLOORS, features: G_FEATURES, included: G_INCLUDED, sideScreen: true,
  },
  {
    id: 'g2', range: 'g', name: 'G2', tagline: 'Compact and contemporary', from: 23790,
    description: 'Compact and contemporary with squared edges and a shallow front frame that gives a pod-style appearance.',
    roof: 'pent', hood: 'none', deckBoards: 2, standardHeight: 2.5, extendedHeight: 2.7, priceKey: 'g2',
    standardDoor: 'sliding23', doors: G_DOORS, windows: G_WINDOWS,
    standardWindows: [{ type: 'lozengeH', wall: 'front', at: 0.8 }, { type: 'corner', wall: 'right', at: 1 }],
    claddings: G_CLADDING, standardCladding: 'redwood', stylePacks: ['graphite', 'black', 'natural'], decks: G_DECKS,
    interiorWalls: G_WALLS, floors: G_FLOORS, features: G_FEATURES, included: G_INCLUDED, sideScreen: false,
  },
  {
    id: 'g3', range: 'g', name: 'G3', tagline: 'Sheltered square surround', from: 23790,
    description: 'Stylish square-edge design with an extended front frame that creates a striking sheltered surround.',
    roof: 'pent', hood: 'frontFrame', deckBoards: 3, standardHeight: 2.5, extendedHeight: 2.7, priceKey: 'g3',
    standardDoor: 'sliding23', doors: G_DOORS, windows: G_WINDOWS,
    standardWindows: [{ type: 'lozengeH', wall: 'front', at: 0.8 }, { type: 'corner', wall: 'right', at: 1 }],
    claddings: G_CLADDING, standardCladding: 'redwood', stylePacks: ['graphite', 'black', 'natural'], decks: G_DECKS,
    interiorWalls: G_WALLS, floors: G_FLOORS, features: G_FEATURES, included: G_INCLUDED, sideScreen: true,
  },
  {
    id: 'g4', range: 'g', name: 'G4', tagline: 'Forward-leaning statement', from: 24955,
    description: 'Sharp and architectural with a forward-leaning front frame that creates a dynamic statement design.',
    roof: 'pent', hood: 'leanFrame', deckBoards: 3, standardHeight: 2.5, extendedHeight: 2.7, priceKey: 'g4',
    standardDoor: 'sliding23', doors: G_DOORS, windows: G_WINDOWS,
    standardWindows: [{ type: 'lozengeH', wall: 'front', at: 0.8 }, { type: 'corner', wall: 'right', at: 1 }],
    claddings: G_CLADDING, standardCladding: 'redwood', stylePacks: ['graphite', 'black', 'natural'], decks: G_DECKS,
    interiorWalls: G_WALLS, floors: G_FLOORS, features: G_FEATURES, included: G_INCLUDED, sideScreen: true,
  },
  {
    id: 'g5', range: 'g', name: 'G5', tagline: 'Curved corner detail', from: 24955,
    description: 'Curved corner detail that joins a sheltered hood and enclosed side to create a distinctively different design.',
    roof: 'pent', hood: 'curvedCorner', deckBoards: 3, standardHeight: 2.5, extendedHeight: 2.7, priceKey: 'g5',
    standardDoor: 'sliding23', doors: G_DOORS, windows: G_WINDOWS,
    standardWindows: [{ type: 'lozengeH', wall: 'front', at: 0.8 }, { type: 'corner', wall: 'right', at: 1 }],
    claddings: G_CLADDING, standardCladding: 'redwood', stylePacks: ['graphite', 'black', 'natural'], decks: G_DECKS,
    interiorWalls: G_WALLS, floors: G_FLOORS, features: G_FEATURES, included: G_INCLUDED, sideScreen: true,
  },
  // --------------------------------------------------------------- A-Range
  {
    id: 'a1', range: 'a', name: 'A1', tagline: 'Simple & cost-effective apex', from: 16695,
    description: 'A simplified apex roof garden room with a 22-degree pitch, built with B-Range materials. Building and installation only, add the packs you want.',
    roof: 'apex', hood: 'none', apexPitch: 22, deckBoards: 1, standardHeight: 2.3, orientations: ['gable', 'eaves'], priceKey: 'a1',
    standardDoor: 'sliding18', doors: ['single', 'french15', 'french18', 'sliding18'], windows: ['lozengeH', 'lozengeV', 'fullHeightS', 'fullHeightL'],
    standardWindows: [{ type: 'lozengeH', wall: 'front', at: 0.78 }],
    claddings: ['primed', 'paintBlack', 'paintGrey', 'paintSage', 'vinylOak', 'standingSeam'], standardCladding: 'primed',
    decks: B_DECKS, interiorWalls: ['melamine'], floors: B_FLOORS,
    features: ['foundationsPack', 'electricsPack', 'paintPack', 'extLightUpDown', 'extLightTorch', 'ledPanel', 'upDownLights', 'extraSocket', 'usbSockets', 'homeplug', 'cat6', 'electricalConnection', 'aircon', 'radiator', 'blinds'],
    included: ['Full building and installation', 'Delivery within 100 miles of HP18', 'Full measurements and site survey', 'Wood-effect LP Strongcore cladding (painting required)', 'White melamine interior', '1.8m sliding or French door', 'Lozenge window', 'Eco-foam insulation', '12 year guarantee'],
    sideScreen: false, sizeNote: 'Gable-end: W is the gable width, D runs along the ridge.',
  },
  {
    id: 'a2', range: 'a', name: 'A2', tagline: 'Feature-rich apex', from: 30995,
    description: 'Our feature-rich apex roof garden room. A 30-degree pitch gives the tallest ceiling in the range, perfect for golf simulators and gyms.',
    roof: 'apex', hood: 'none', apexPitch: 30, deckBoards: 2, standardHeight: 2.3, orientations: ['gable', 'eaves'], priceKey: 'a2',
    standardDoor: 'sliding23', doors: G_DOORS, windows: G_WINDOWS,
    standardWindows: [{ type: 'lozengeH', wall: 'front', at: 0.8 }, { type: 'corner', wall: 'right', at: 1 }],
    claddings: G_CLADDING, standardCladding: 'redwood', decks: G_DECKS, interiorWalls: G_WALLS, floors: G_FLOORS,
    features: G_FEATURES.filter((f) => f !== 'extendedHeight'),
    included: ['Full professional installation', 'Base / foundations', 'Internal electrics', 'Delivery within 100 miles of HP18', 'Scandinavian redwood cladding', 'White melamine interior', '2.3m sliding or French door', 'Lozenge window and corner window', 'Rockwool insulation', 'Oak laminate flooring', 'Wall-mounted radiator', '12 year guarantee'],
    sideScreen: false, sizeNote: 'Gable-end: W is the gable width, D runs along the ridge.',
  },
  // --------------------------------------------------------------- X1
  {
    id: 'x1', range: 'x1', name: 'X1', tagline: 'Luxury, sculpted', from: 49950,
    description: 'Sharp, straight lines sculpt this building with a choice of two contemporary metal cladding finishes; a textured black or a deep copper.',
    roof: 'pent', hood: 'frontFrame', deckBoards: 0, standardHeight: 2.5, extendedHeight: 2.7, priceKey: 'x1',
    standardDoor: 'x1bifold38', doors: ['x1bifold38', 'x1sliding38', 'x1combi38'], windows: ['panoramic', 'square', 'fullHeightS', 'fullHeightL', 'picture', 'xlPicture'],
    standardWindows: [{ type: 'panoramic', wall: 'front', at: 0.82 }, { type: 'corner', wall: 'right', at: 1 }],
    claddings: ['metalBlack', 'metalCopper'], standardCladding: 'metalBlack', decks: G_DECKS,
    interiorWalls: ['plasteredStd'], floors: ['hardwood'],
    features: ['sedumRoof', 'deckLights', 'hoodLights', 'solar', 'outsideSocket', 'partition', 'blinds', 'recessedSpots', 'halo', 'extraSocket', 'usbSockets', 'extractor', 'cat6', 'aircon', 'underfloor', 'mvhr', 'extendedHeight'],
    included: ['Full professional installation', 'Base / foundations', 'Internal luxury lighting', 'Delivery within 100 miles of HP18', 'Metal cladding', 'Plastered and painted interior walls', '3.8m aluminium bi-fold, sliding or French combi door', 'Panoramic lozenge window and corner window', 'Air conditioning or underfloor heating', 'Six internal double sockets', 'Engineered hardwood flooring', 'External frame light', 'Double thickness insulation', '20 year guarantee'],
    sideScreen: false,
  },
  // --------------------------------------------------------------- The Annex
  {
    id: 'the-den', range: 'annex', name: 'The Den', tagline: 'Caravan Act compliant', from: 75900,
    description: 'A sleek and compact annex with a flat front and straight lines. Studio or one bedroom. 10 size options.',
    roof: 'pent', hood: 'none', deckBoards: 0, standardHeight: 2.9, priceKey: 'the-den',
    standardDoor: 'annexEntrance', doors: ANNEX_DOORS, windows: ANNEX_WINDOWS,
    standardWindows: [{ type: 'fireEscape', wall: 'front', at: 0.2 }, { type: 'square', wall: 'front', at: 0.85 }],
    claddings: G_CLADDING, standardCladding: 'redwood', decks: G_DECKS, interiorWalls: ['melamine', 'plaster'], floors: ['whiteOak', 'greyOak', 'naturalOak', 'hardwood'],
    features: ANNEX_FEATURES, included: ANNEX_INCLUDED, sideScreen: false,
  },
  {
    id: 'the-nest', range: 'annex', name: 'The Nest', tagline: 'Tall apex, standing seam', from: 63765,
    description: 'A Caravan Act compliant garden house with a traditional pitched roof clad in standing seam for maximum internal height. One or two bedrooms.',
    roof: 'apex', hood: 'none', apexPitch: 35, deckBoards: 0, standardHeight: 2.4, orientations: ['eaves'], priceKey: 'the-nest',
    standardDoor: 'annexEntrance', doors: ANNEX_DOORS, windows: ANNEX_WINDOWS,
    standardWindows: [{ type: 'fireEscape', wall: 'front', at: 0.2 }, { type: 'square', wall: 'front', at: 0.85 }],
    claddings: G_CLADDING, standardCladding: 'redwood', decks: G_DECKS, interiorWalls: ['melamine', 'plaster'], floors: ['whiteOak', 'greyOak', 'naturalOak', 'hardwood'],
    features: ANNEX_FEATURES, included: ANNEX_INCLUDED, sideScreen: false,
  },
  {
    id: 'the-hide', range: 'annex', name: 'The Hide', tagline: 'Building Control compliant', from: 63090,
    description: 'Our flagship annex. Grand lodge style with a hood that extends from all sides. Up to two bedrooms, planning application included.',
    roof: 'pent', hood: 'allSides', deckBoards: 3, standardHeight: 2.9, priceKey: 'the-hide',
    standardDoor: 'annexEntrance', doors: ANNEX_DOORS, windows: ANNEX_WINDOWS,
    standardWindows: [{ type: 'fireEscape', wall: 'front', at: 0.2 }, { type: 'square', wall: 'front', at: 0.85 }],
    claddings: G_CLADDING, standardCladding: 'redwood', decks: G_DECKS, interiorWalls: ['plasteredStd'], floors: ['whiteOak', 'greyOak', 'naturalOak', 'hardwood'],
    features: ANNEX_FEATURES, included: [...ANNEX_INCLUDED, 'Planning permission application', 'Full building control sign off', 'Painted plaster interior walls'], sideScreen: false,
  },
];

export const modelById = (id: string): ModelSpec => {
  const m = MODELS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown model ${id}`);
  return m;
};

export const modelsForRange = (range: RangeId) => MODELS.filter((m) => m.range === range);

// src/data/items.ts
// Comprehensive item database for Satisfactory production simulation

export type ItemCategory =
  | 'ore'
  | 'ingot'
  | 'component'
  | 'fluid'
  | 'fuel'
  | 'ammunition'
  | 'biomass'
  | 'building_material'
  | 'project_part'
  | 'radioactive'
  | 'equipment_material'
  | 'special';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  stackSize: number;
  isFluid: boolean;
  description?: string;
  sinkPoints?: number; // AWESOME Sink points
  tier?: number; // Unlock tier
}

// Comprehensive item database with ~150 items
export const ITEMS: Record<string, Item> = {
  // ============================================
  // ORES (Raw Resources)
  // ============================================
  iron_ore: {
    id: 'iron_ore',
    name: 'Iron Ore',
    category: 'ore',
    stackSize: 100,
    isFluid: false,
    description: 'Unprocessed iron ore extracted from ore nodes.',
    sinkPoints: 1,
    tier: 0
  },
  copper_ore: {
    id: 'copper_ore',
    name: 'Copper Ore',
    category: 'ore',
    stackSize: 100,
    isFluid: false,
    description: 'Unprocessed copper ore extracted from ore nodes.',
    sinkPoints: 3,
    tier: 0
  },
  limestone: {
    id: 'limestone',
    name: 'Limestone',
    category: 'ore',
    stackSize: 100,
    isFluid: false,
    description: 'Calcium-rich rock used to produce Concrete.',
    sinkPoints: 2,
    tier: 0
  },
  coal: {
    id: 'coal',
    name: 'Coal',
    category: 'ore',
    stackSize: 100,
    isFluid: false,
    description: 'A hydrocarbon with many uses, including power generation and steel production.',
    sinkPoints: 3,
    tier: 3
  },
  caterium_ore: {
    id: 'caterium_ore',
    name: 'Caterium Ore',
    category: 'ore',
    stackSize: 100,
    isFluid: false,
    description: 'A rare ore with unique properties useful for advanced electronics.',
    sinkPoints: 7,
    tier: 2
  },
  raw_quartz: {
    id: 'raw_quartz',
    name: 'Raw Quartz',
    category: 'ore',
    stackSize: 100,
    isFluid: false,
    description: 'Crystalline mineral used in electronics and structural applications.',
    sinkPoints: 15,
    tier: 3
  },
  sulfur: {
    id: 'sulfur',
    name: 'Sulfur',
    category: 'ore',
    stackSize: 100,
    isFluid: false,
    description: 'A yellow mineral used in explosives and chemical processes.',
    sinkPoints: 11,
    tier: 5
  },
  bauxite: {
    id: 'bauxite',
    name: 'Bauxite',
    category: 'ore',
    stackSize: 100,
    isFluid: false,
    description: 'Raw ore used to produce Aluminum.',
    sinkPoints: 8,
    tier: 7
  },
  uranium: {
    id: 'uranium',
    name: 'Uranium',
    category: 'radioactive',
    stackSize: 100,
    isFluid: false,
    description: 'Radioactive ore used in nuclear power generation.',
    sinkPoints: 35,
    tier: 8
  },
  sam: {
    id: 'sam',
    name: 'SAM',
    category: 'ore',
    stackSize: 100,
    isFluid: false,
    description: 'Strange Alien Matter with unique properties.',
    sinkPoints: 0,
    tier: 7
  },

  // ============================================
  // INGOTS (Processed Ores)
  // ============================================
  iron_ingot: {
    id: 'iron_ingot',
    name: 'Iron Ingot',
    category: 'ingot',
    stackSize: 100,
    isFluid: false,
    description: 'Smelted iron ready for manufacturing.',
    sinkPoints: 1,
    tier: 0
  },
  copper_ingot: {
    id: 'copper_ingot',
    name: 'Copper Ingot',
    category: 'ingot',
    stackSize: 100,
    isFluid: false,
    description: 'Smelted copper used in electrical components.',
    sinkPoints: 6,
    tier: 0
  },
  caterium_ingot: {
    id: 'caterium_ingot',
    name: 'Caterium Ingot',
    category: 'ingot',
    stackSize: 100,
    isFluid: false,
    description: 'Processed caterium for advanced electronics.',
    sinkPoints: 42,
    tier: 2
  },
  steel_ingot: {
    id: 'steel_ingot',
    name: 'Steel Ingot',
    category: 'ingot',
    stackSize: 100,
    isFluid: false,
    description: 'Iron-carbon alloy for structural applications.',
    sinkPoints: 8,
    tier: 3
  },
  aluminum_ingot: {
    id: 'aluminum_ingot',
    name: 'Aluminum Ingot',
    category: 'ingot',
    stackSize: 100,
    isFluid: false,
    description: 'Lightweight metal for aerospace and construction.',
    sinkPoints: 131,
    tier: 7
  },
  ficsite_ingot: {
    id: 'ficsite_ingot',
    name: 'Ficsite Ingot',
    category: 'ingot',
    stackSize: 100,
    isFluid: false,
    description: 'Advanced alien-tech alloy.',
    sinkPoints: 1936,
    tier: 9
  },

  // ============================================
  // BASIC COMPONENTS
  // ============================================
  iron_plate: {
    id: 'iron_plate',
    name: 'Iron Plate',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Flat metal sheet used in various constructions.',
    sinkPoints: 6,
    tier: 0
  },
  iron_rod: {
    id: 'iron_rod',
    name: 'Iron Rod',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Metal rod used in reinforcement and machinery.',
    sinkPoints: 4,
    tier: 0
  },
  screw: {
    id: 'screw',
    name: 'Screw',
    category: 'component',
    stackSize: 500,
    isFluid: false,
    description: 'Fastener used in assembly operations.',
    sinkPoints: 2,
    tier: 0
  },
  wire: {
    id: 'wire',
    name: 'Wire',
    category: 'component',
    stackSize: 500,
    isFluid: false,
    description: 'Thin metal strand for electrical connections.',
    sinkPoints: 6,
    tier: 0
  },
  cable: {
    id: 'cable',
    name: 'Cable',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Insulated wire bundle for power transmission.',
    sinkPoints: 24,
    tier: 0
  },
  concrete: {
    id: 'concrete',
    name: 'Concrete',
    category: 'building_material',
    stackSize: 100,
    isFluid: false,
    description: 'Building material made from limestone.',
    sinkPoints: 12,
    tier: 0
  },
  copper_sheet: {
    id: 'copper_sheet',
    name: 'Copper Sheet',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Thin copper plate for heat dissipation and electronics.',
    sinkPoints: 24,
    tier: 2
  },
  copper_powder: {
    id: 'copper_powder',
    name: 'Copper Powder',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Finely ground copper for specialized applications.',
    sinkPoints: 72,
    tier: 8
  },
  steel_beam: {
    id: 'steel_beam',
    name: 'Steel Beam',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Structural steel for heavy construction.',
    sinkPoints: 64,
    tier: 3
  },
  steel_pipe: {
    id: 'steel_pipe',
    name: 'Steel Pipe',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Hollow steel tube for fluid transport and construction.',
    sinkPoints: 24,
    tier: 3
  },
  aluminum_casing: {
    id: 'aluminum_casing',
    name: 'Aluminum Casing',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Lightweight protective housing.',
    sinkPoints: 393,
    tier: 7
  },
  alclad_aluminum_sheet: {
    id: 'alclad_aluminum_sheet',
    name: 'Alclad Aluminum Sheet',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Corrosion-resistant aluminum sheet.',
    sinkPoints: 266,
    tier: 7
  },
  quartz_crystal: {
    id: 'quartz_crystal',
    name: 'Quartz Crystal',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Processed quartz for electronics.',
    sinkPoints: 50,
    tier: 3
  },
  silica: {
    id: 'silica',
    name: 'Silica',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Silicon dioxide for glass and aluminum production.',
    sinkPoints: 20,
    tier: 3
  },
  quickwire: {
    id: 'quickwire',
    name: 'Quickwire',
    category: 'component',
    stackSize: 500,
    isFluid: false,
    description: 'High-speed conductive wire.',
    sinkPoints: 17,
    tier: 2
  },

  // ============================================
  // INTERMEDIATE COMPONENTS
  // ============================================
  reinforced_iron_plate: {
    id: 'reinforced_iron_plate',
    name: 'Reinforced Iron Plate',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Strengthened metal plate for durability.',
    sinkPoints: 120,
    tier: 0
  },
  modular_frame: {
    id: 'modular_frame',
    name: 'Modular Frame',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'Structural frame for building assembly.',
    sinkPoints: 408,
    tier: 2
  },
  heavy_modular_frame: {
    id: 'heavy_modular_frame',
    name: 'Heavy Modular Frame',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'Reinforced frame for heavy-duty applications.',
    sinkPoints: 11520,
    tier: 5
  },
  fused_modular_frame: {
    id: 'fused_modular_frame',
    name: 'Fused Modular Frame',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'Advanced frame with integrated materials.',
    sinkPoints: 62840,
    tier: 8
  },
  rotor: {
    id: 'rotor',
    name: 'Rotor',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Rotating component for motors.',
    sinkPoints: 140,
    tier: 2
  },
  stator: {
    id: 'stator',
    name: 'Stator',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Stationary motor component.',
    sinkPoints: 240,
    tier: 4
  },
  motor: {
    id: 'motor',
    name: 'Motor',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'Electric motor for machinery.',
    sinkPoints: 1520,
    tier: 4
  },
  turbo_motor: {
    id: 'turbo_motor',
    name: 'Turbo Motor',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'High-performance motor.',
    sinkPoints: 242720,
    tier: 8
  },
  heat_sink: {
    id: 'heat_sink',
    name: 'Heat Sink',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Thermal management component.',
    sinkPoints: 2804,
    tier: 7
  },
  cooling_system: {
    id: 'cooling_system',
    name: 'Cooling System',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Active temperature control system.',
    sinkPoints: 12006,
    tier: 8
  },
  encased_industrial_beam: {
    id: 'encased_industrial_beam',
    name: 'Encased Industrial Beam',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Protected structural beam.',
    sinkPoints: 632,
    tier: 4
  },
  versatile_framework: {
    id: 'versatile_framework',
    name: 'Versatile Framework',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'Adaptable structural framework.',
    sinkPoints: 1176,
    tier: 3
  },

  // ============================================
  // ELECTRONIC COMPONENTS
  // ============================================
  circuit_board: {
    id: 'circuit_board',
    name: 'Circuit Board',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Basic electronic circuit board.',
    sinkPoints: 696,
    tier: 5
  },
  ai_limiter: {
    id: 'ai_limiter',
    name: 'AI Limiter',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Safety component for AI systems.',
    sinkPoints: 920,
    tier: 7
  },
  computer: {
    id: 'computer',
    name: 'Computer',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'Processing unit for automation.',
    sinkPoints: 17260,
    tier: 5
  },
  supercomputer: {
    id: 'supercomputer',
    name: 'Supercomputer',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'Advanced computing system.',
    sinkPoints: 99576,
    tier: 7
  },
  high_speed_connector: {
    id: 'high_speed_connector',
    name: 'High-Speed Connector',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Fast data transmission interface.',
    sinkPoints: 3776,
    tier: 6
  },
  crystal_oscillator: {
    id: 'crystal_oscillator',
    name: 'Crystal Oscillator',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Precise timing component.',
    sinkPoints: 3072,
    tier: 5
  },
  radio_control_unit: {
    id: 'radio_control_unit',
    name: 'Radio Control Unit',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'Wireless control system.',
    sinkPoints: 19600,
    tier: 8
  },
  electromagnetic_control_rod: {
    id: 'electromagnetic_control_rod',
    name: 'Electromagnetic Control Rod',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Magnetic field control device.',
    sinkPoints: 2560,
    tier: 8
  },

  // ============================================
  // ADVANCED COMPONENTS
  // ============================================
  smart_plating: {
    id: 'smart_plating',
    name: 'Smart Plating',
    category: 'project_part',
    stackSize: 50,
    isFluid: false,
    description: 'Space Elevator project part.',
    sinkPoints: 520,
    tier: 2
  },
  automated_wiring: {
    id: 'automated_wiring',
    name: 'Automated Wiring',
    category: 'project_part',
    stackSize: 50,
    isFluid: false,
    description: 'Space Elevator project part.',
    sinkPoints: 1440,
    tier: 4
  },
  modular_engine: {
    id: 'modular_engine',
    name: 'Modular Engine',
    category: 'project_part',
    stackSize: 50,
    isFluid: false,
    description: 'Space Elevator project part.',
    sinkPoints: 9960,
    tier: 5
  },
  adaptive_control_unit: {
    id: 'adaptive_control_unit',
    name: 'Adaptive Control Unit',
    category: 'project_part',
    stackSize: 50,
    isFluid: false,
    description: 'Space Elevator project part.',
    sinkPoints: 86120,
    tier: 6
  },
  magnetic_field_generator: {
    id: 'magnetic_field_generator',
    name: 'Magnetic Field Generator',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'Creates strong magnetic fields.',
    sinkPoints: 15650,
    tier: 8
  },
  assembly_director_system: {
    id: 'assembly_director_system',
    name: 'Assembly Director System',
    category: 'project_part',
    stackSize: 50,
    isFluid: false,
    description: 'Space Elevator project part.',
    sinkPoints: 543632,
    tier: 8
  },
  thermal_propulsion_rocket: {
    id: 'thermal_propulsion_rocket',
    name: 'Thermal Propulsion Rocket',
    category: 'project_part',
    stackSize: 50,
    isFluid: false,
    description: 'Space Elevator project part.',
    sinkPoints: 732956,
    tier: 8
  },
  nuclear_pasta: {
    id: 'nuclear_pasta',
    name: 'Nuclear Pasta',
    category: 'project_part',
    stackSize: 50,
    isFluid: false,
    description: 'Exotic matter for project assembly.',
    sinkPoints: 543424,
    tier: 8
  },
  pressure_conversion_cube: {
    id: 'pressure_conversion_cube',
    name: 'Pressure Conversion Cube',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'Pressure transformation device.',
    sinkPoints: 257312,
    tier: 8
  },

  // ============================================
  // PLASTICS & RUBBER
  // ============================================
  plastic: {
    id: 'plastic',
    name: 'Plastic',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Synthetic polymer material.',
    sinkPoints: 75,
    tier: 5
  },
  rubber: {
    id: 'rubber',
    name: 'Rubber',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Elastic synthetic material.',
    sinkPoints: 60,
    tier: 5
  },
  polymer_resin: {
    id: 'polymer_resin',
    name: 'Polymer Resin',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Oil-derived polymer material.',
    sinkPoints: 12,
    tier: 5
  },
  fabric: {
    id: 'fabric',
    name: 'Fabric',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Woven material for filters and equipment.',
    sinkPoints: 140,
    tier: 2
  },
  gas_filter: {
    id: 'gas_filter',
    name: 'Gas Filter',
    category: 'equipment_material',
    stackSize: 50,
    isFluid: false,
    description: 'Filter for hazardous gases.',
    sinkPoints: 830,
    tier: 5
  },
  iodine_infused_filter: {
    id: 'iodine_infused_filter',
    name: 'Iodine-Infused Filter',
    category: 'equipment_material',
    stackSize: 50,
    isFluid: false,
    description: 'Filter for radioactive protection.',
    sinkPoints: 2718,
    tier: 8
  },
  empty_canister: {
    id: 'empty_canister',
    name: 'Empty Canister',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Container for packaged fluids.',
    sinkPoints: 60,
    tier: 5
  },
  empty_fluid_tank: {
    id: 'empty_fluid_tank',
    name: 'Empty Fluid Tank',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Large container for packaged fluids.',
    sinkPoints: 225,
    tier: 7
  },

  // ============================================
  // AMMUNITION & EXPLOSIVES
  // ============================================
  black_powder: {
    id: 'black_powder',
    name: 'Black Powder',
    category: 'ammunition',
    stackSize: 200,
    isFluid: false,
    description: 'Basic explosive compound.',
    sinkPoints: 14,
    tier: 5
  },
  smokeless_powder: {
    id: 'smokeless_powder',
    name: 'Smokeless Powder',
    category: 'ammunition',
    stackSize: 200,
    isFluid: false,
    description: 'Advanced explosive compound.',
    sinkPoints: 58,
    tier: 5
  },
  compacted_coal: {
    id: 'compacted_coal',
    name: 'Compacted Coal',
    category: 'fuel',
    stackSize: 100,
    isFluid: false,
    description: 'Dense coal for efficient burning.',
    sinkPoints: 28,
    tier: 5
  },
  iron_rebar: {
    id: 'iron_rebar',
    name: 'Iron Rebar',
    category: 'ammunition',
    stackSize: 100,
    isFluid: false,
    description: 'Projectile ammunition.',
    sinkPoints: 8,
    tier: 3
  },
  shatter_rebar: {
    id: 'shatter_rebar',
    name: 'Shatter Rebar',
    category: 'ammunition',
    stackSize: 100,
    isFluid: false,
    description: 'Fragmenting projectile.',
    sinkPoints: 332,
    tier: 6
  },
  stun_rebar: {
    id: 'stun_rebar',
    name: 'Stun Rebar',
    category: 'ammunition',
    stackSize: 100,
    isFluid: false,
    description: 'Electrified projectile.',
    sinkPoints: 186,
    tier: 6
  },
  explosive_rebar: {
    id: 'explosive_rebar',
    name: 'Explosive Rebar',
    category: 'ammunition',
    stackSize: 100,
    isFluid: false,
    description: 'Explosive projectile.',
    sinkPoints: 360,
    tier: 6
  },
  nobelisk: {
    id: 'nobelisk',
    name: 'Nobelisk',
    category: 'ammunition',
    stackSize: 50,
    isFluid: false,
    description: 'Throwable explosive.',
    sinkPoints: 152,
    tier: 5
  },
  cluster_nobelisk: {
    id: 'cluster_nobelisk',
    name: 'Cluster Nobelisk',
    category: 'ammunition',
    stackSize: 50,
    isFluid: false,
    description: 'Multi-charge explosive.',
    sinkPoints: 1376,
    tier: 6
  },
  pulse_nobelisk: {
    id: 'pulse_nobelisk',
    name: 'Pulse Nobelisk',
    category: 'ammunition',
    stackSize: 50,
    isFluid: false,
    description: 'EMP explosive.',
    sinkPoints: 1533,
    tier: 6
  },
  nuke_nobelisk: {
    id: 'nuke_nobelisk',
    name: 'Nuke Nobelisk',
    category: 'ammunition',
    stackSize: 50,
    isFluid: false,
    description: 'Nuclear explosive device.',
    sinkPoints: 19600,
    tier: 8
  },
  rifle_ammo: {
    id: 'rifle_ammo',
    name: 'Rifle Ammo',
    category: 'ammunition',
    stackSize: 100,
    isFluid: false,
    description: 'Standard rifle cartridges.',
    sinkPoints: 25,
    tier: 5
  },
  homing_rifle_ammo: {
    id: 'homing_rifle_ammo',
    name: 'Homing Rifle Ammo',
    category: 'ammunition',
    stackSize: 100,
    isFluid: false,
    description: 'Self-guided ammunition.',
    sinkPoints: 855,
    tier: 6
  },
  turbo_rifle_ammo: {
    id: 'turbo_rifle_ammo',
    name: 'Turbo Rifle Ammo',
    category: 'ammunition',
    stackSize: 100,
    isFluid: false,
    description: 'High-velocity ammunition.',
    sinkPoints: 120,
    tier: 7
  },

  // ============================================
  // BIOMASS & ORGANIC
  // ============================================
  leaves: {
    id: 'leaves',
    name: 'Leaves',
    category: 'biomass',
    stackSize: 500,
    isFluid: false,
    description: 'Organic plant material.',
    sinkPoints: 3,
    tier: 0
  },
  wood: {
    id: 'wood',
    name: 'Wood',
    category: 'biomass',
    stackSize: 200,
    isFluid: false,
    description: 'Plant-derived solid fuel.',
    sinkPoints: 30,
    tier: 0
  },
  mycelia: {
    id: 'mycelia',
    name: 'Mycelia',
    category: 'biomass',
    stackSize: 200,
    isFluid: false,
    description: 'Fungal organic material.',
    sinkPoints: 10,
    tier: 0
  },
  biomass: {
    id: 'biomass',
    name: 'Biomass',
    category: 'biomass',
    stackSize: 200,
    isFluid: false,
    description: 'Processed organic fuel.',
    sinkPoints: 12,
    tier: 0
  },
  solid_biofuel: {
    id: 'solid_biofuel',
    name: 'Solid Biofuel',
    category: 'fuel',
    stackSize: 200,
    isFluid: false,
    description: 'Compressed biomass fuel.',
    sinkPoints: 48,
    tier: 2
  },
  alien_protein: {
    id: 'alien_protein',
    name: 'Alien Protein',
    category: 'biomass',
    stackSize: 100,
    isFluid: false,
    description: 'Protein from alien creatures.',
    sinkPoints: 100,
    tier: 0
  },
  alien_dna_capsule: {
    id: 'alien_dna_capsule',
    name: 'Alien DNA Capsule',
    category: 'biomass',
    stackSize: 50,
    isFluid: false,
    description: 'Encapsulated alien genetic material.',
    sinkPoints: 200,
    tier: 0
  },
  hog_remains: {
    id: 'hog_remains',
    name: 'Hog Remains',
    category: 'biomass',
    stackSize: 50,
    isFluid: false,
    description: 'Organic remains from Hogs.',
    sinkPoints: 0,
    tier: 0
  },
  hatcher_remains: {
    id: 'hatcher_remains',
    name: 'Hatcher Remains',
    category: 'biomass',
    stackSize: 50,
    isFluid: false,
    description: 'Organic remains from Hatchers.',
    sinkPoints: 0,
    tier: 0
  },
  spitter_remains: {
    id: 'spitter_remains',
    name: 'Spitter Remains',
    category: 'biomass',
    stackSize: 50,
    isFluid: false,
    description: 'Organic remains from Spitters.',
    sinkPoints: 0,
    tier: 0
  },
  stinger_remains: {
    id: 'stinger_remains',
    name: 'Stinger Remains',
    category: 'biomass',
    stackSize: 50,
    isFluid: false,
    description: 'Organic remains from Stingers.',
    sinkPoints: 0,
    tier: 0
  },

  // ============================================
  // NUCLEAR & RADIOACTIVE
  // ============================================
  encased_uranium_cell: {
    id: 'encased_uranium_cell',
    name: 'Encased Uranium Cell',
    category: 'radioactive',
    stackSize: 200,
    isFluid: false,
    description: 'Shielded nuclear fuel cell.',
    sinkPoints: 147,
    tier: 8
  },
  uranium_fuel_rod: {
    id: 'uranium_fuel_rod',
    name: 'Uranium Fuel Rod',
    category: 'radioactive',
    stackSize: 50,
    isFluid: false,
    description: 'Nuclear reactor fuel assembly.',
    sinkPoints: 44092,
    tier: 8
  },
  uranium_waste: {
    id: 'uranium_waste',
    name: 'Uranium Waste',
    category: 'radioactive',
    stackSize: 500,
    isFluid: false,
    description: 'Depleted nuclear material.',
    sinkPoints: 0,
    tier: 8
  },
  non_fissile_uranium: {
    id: 'non_fissile_uranium',
    name: 'Non-Fissile Uranium',
    category: 'radioactive',
    stackSize: 500,
    isFluid: false,
    description: 'Stabilized uranium isotopes.',
    sinkPoints: 0,
    tier: 8
  },
  plutonium_pellet: {
    id: 'plutonium_pellet',
    name: 'Plutonium Pellet',
    category: 'radioactive',
    stackSize: 100,
    isFluid: false,
    description: 'Refined plutonium for fuel.',
    sinkPoints: 0,
    tier: 8
  },
  encased_plutonium_cell: {
    id: 'encased_plutonium_cell',
    name: 'Encased Plutonium Cell',
    category: 'radioactive',
    stackSize: 200,
    isFluid: false,
    description: 'Shielded plutonium fuel cell.',
    sinkPoints: 0,
    tier: 8
  },
  plutonium_fuel_rod: {
    id: 'plutonium_fuel_rod',
    name: 'Plutonium Fuel Rod',
    category: 'radioactive',
    stackSize: 50,
    isFluid: false,
    description: 'Advanced nuclear fuel assembly.',
    sinkPoints: 153184,
    tier: 8
  },
  ficsonium: {
    id: 'ficsonium',
    name: 'Ficsonium',
    category: 'radioactive',
    stackSize: 50,
    isFluid: false,
    description: 'Exotic radioactive material.',
    sinkPoints: 0,
    tier: 9
  },
  ficsonium_fuel_rod: {
    id: 'ficsonium_fuel_rod',
    name: 'Ficsonium Fuel Rod',
    category: 'radioactive',
    stackSize: 50,
    isFluid: false,
    description: 'Ultimate nuclear fuel assembly.',
    sinkPoints: 0,
    tier: 9
  },

  // ============================================
  // FLUIDS
  // ============================================
  water: {
    id: 'water',
    name: 'Water',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'Essential liquid for many processes.',
    sinkPoints: 0,
    tier: 3
  },
  crude_oil: {
    id: 'crude_oil',
    name: 'Crude Oil',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'Unrefined petroleum.',
    sinkPoints: 0,
    tier: 5
  },
  heavy_oil_residue: {
    id: 'heavy_oil_residue',
    name: 'Heavy Oil Residue',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'Thick petroleum byproduct.',
    sinkPoints: 0,
    tier: 5
  },
  fuel: {
    id: 'fuel',
    name: 'Fuel',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'Refined liquid fuel.',
    sinkPoints: 0,
    tier: 5
  },
  turbofuel: {
    id: 'turbofuel',
    name: 'Turbofuel',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'High-performance liquid fuel.',
    sinkPoints: 0,
    tier: 5
  },
  liquid_biofuel: {
    id: 'liquid_biofuel',
    name: 'Liquid Biofuel',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'Organic-based liquid fuel.',
    sinkPoints: 0,
    tier: 2
  },
  alumina_solution: {
    id: 'alumina_solution',
    name: 'Alumina Solution',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'Dissolved aluminum oxide.',
    sinkPoints: 0,
    tier: 7
  },
  sulfuric_acid: {
    id: 'sulfuric_acid',
    name: 'Sulfuric Acid',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'Strong industrial acid.',
    sinkPoints: 0,
    tier: 7
  },
  nitric_acid: {
    id: 'nitric_acid',
    name: 'Nitric Acid',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'Oxidizing acid for processes.',
    sinkPoints: 0,
    tier: 8
  },
  nitrogen_gas: {
    id: 'nitrogen_gas',
    name: 'Nitrogen Gas',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'Inert gas for manufacturing.',
    sinkPoints: 0,
    tier: 8
  },
  rocket_fuel: {
    id: 'rocket_fuel',
    name: 'Rocket Fuel',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'High-energy propellant.',
    sinkPoints: 0,
    tier: 8
  },
  ionized_fuel: {
    id: 'ionized_fuel',
    name: 'Ionized Fuel',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'Electrically charged fuel.',
    sinkPoints: 0,
    tier: 9
  },
  dissolved_silica: {
    id: 'dissolved_silica',
    name: 'Dissolved Silica',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'Silica in solution.',
    sinkPoints: 0,
    tier: 8
  },
  dark_matter_residue: {
    id: 'dark_matter_residue',
    name: 'Dark Matter Residue',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'Exotic matter byproduct.',
    sinkPoints: 0,
    tier: 9
  },
  excited_photonic_matter: {
    id: 'excited_photonic_matter',
    name: 'Excited Photonic Matter',
    category: 'fluid',
    stackSize: 0,
    isFluid: true,
    description: 'High-energy photonic material.',
    sinkPoints: 0,
    tier: 9
  },

  // ============================================
  // PACKAGED FLUIDS
  // ============================================
  packaged_water: {
    id: 'packaged_water',
    name: 'Packaged Water',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Water in portable container.',
    sinkPoints: 130,
    tier: 5
  },
  packaged_oil: {
    id: 'packaged_oil',
    name: 'Packaged Oil',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Crude oil in portable container.',
    sinkPoints: 180,
    tier: 5
  },
  packaged_fuel: {
    id: 'packaged_fuel',
    name: 'Packaged Fuel',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Fuel in portable container.',
    sinkPoints: 270,
    tier: 5
  },
  packaged_turbofuel: {
    id: 'packaged_turbofuel',
    name: 'Packaged Turbofuel',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Turbofuel in portable container.',
    sinkPoints: 570,
    tier: 5
  },
  packaged_heavy_oil_residue: {
    id: 'packaged_heavy_oil_residue',
    name: 'Packaged Heavy Oil Residue',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Heavy oil in portable container.',
    sinkPoints: 180,
    tier: 5
  },
  packaged_liquid_biofuel: {
    id: 'packaged_liquid_biofuel',
    name: 'Packaged Liquid Biofuel',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Liquid biofuel in portable container.',
    sinkPoints: 370,
    tier: 5
  },
  packaged_alumina_solution: {
    id: 'packaged_alumina_solution',
    name: 'Packaged Alumina Solution',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Alumina solution in portable container.',
    sinkPoints: 160,
    tier: 7
  },
  packaged_sulfuric_acid: {
    id: 'packaged_sulfuric_acid',
    name: 'Packaged Sulfuric Acid',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Sulfuric acid in portable container.',
    sinkPoints: 152,
    tier: 7
  },
  packaged_nitric_acid: {
    id: 'packaged_nitric_acid',
    name: 'Packaged Nitric Acid',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Nitric acid in portable container.',
    sinkPoints: 412,
    tier: 8
  },
  packaged_nitrogen_gas: {
    id: 'packaged_nitrogen_gas',
    name: 'Packaged Nitrogen Gas',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Nitrogen gas in portable container.',
    sinkPoints: 312,
    tier: 8
  },
  packaged_rocket_fuel: {
    id: 'packaged_rocket_fuel',
    name: 'Packaged Rocket Fuel',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Rocket fuel in portable container.',
    sinkPoints: 535,
    tier: 8
  },
  packaged_ionized_fuel: {
    id: 'packaged_ionized_fuel',
    name: 'Packaged Ionized Fuel',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Ionized fuel in portable container.',
    sinkPoints: 762,
    tier: 9
  },

  // ============================================
  // POWER & SPECIAL ITEMS
  // ============================================
  power_shard: {
    id: 'power_shard',
    name: 'Power Shard',
    category: 'special',
    stackSize: 100,
    isFluid: false,
    description: 'Crystal for overclocking machinery.',
    sinkPoints: 0,
    tier: 0
  },
  blue_power_slug: {
    id: 'blue_power_slug',
    name: 'Blue Power Slug',
    category: 'special',
    stackSize: 50,
    isFluid: false,
    description: 'Low-tier power slug.',
    sinkPoints: 0,
    tier: 0
  },
  yellow_power_slug: {
    id: 'yellow_power_slug',
    name: 'Yellow Power Slug',
    category: 'special',
    stackSize: 50,
    isFluid: false,
    description: 'Mid-tier power slug.',
    sinkPoints: 0,
    tier: 0
  },
  purple_power_slug: {
    id: 'purple_power_slug',
    name: 'Purple Power Slug',
    category: 'special',
    stackSize: 50,
    isFluid: false,
    description: 'High-tier power slug.',
    sinkPoints: 0,
    tier: 0
  },
  ficsit_coupon: {
    id: 'ficsit_coupon',
    name: 'FICSIT Coupon',
    category: 'special',
    stackSize: 500,
    isFluid: false,
    description: 'Currency from AWESOME Sink.',
    sinkPoints: 0,
    tier: 2
  },
  hard_drive: {
    id: 'hard_drive',
    name: 'Hard Drive',
    category: 'special',
    stackSize: 100,
    isFluid: false,
    description: 'Data storage for alternate recipes.',
    sinkPoints: 0,
    tier: 1
  },
  somersloop: {
    id: 'somersloop',
    name: 'Somersloop',
    category: 'special',
    stackSize: 50,
    isFluid: false,
    description: 'Alien artifact for production amplification.',
    sinkPoints: 0,
    tier: 0
  },
  mercer_sphere: {
    id: 'mercer_sphere',
    name: 'Mercer Sphere',
    category: 'special',
    stackSize: 50,
    isFluid: false,
    description: 'Mysterious alien artifact.',
    sinkPoints: 0,
    tier: 0
  },

  // ============================================
  // ALIEN & EXOTIC MATERIALS
  // ============================================
  reanimated_sam: {
    id: 'reanimated_sam',
    name: 'Reanimated SAM',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Processed Strange Alien Matter.',
    sinkPoints: 0,
    tier: 7
  },
  sam_fluctuator: {
    id: 'sam_fluctuator',
    name: 'SAM Fluctuator',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'SAM-based stabilization device.',
    sinkPoints: 0,
    tier: 7
  },
  ficsite_trigon: {
    id: 'ficsite_trigon',
    name: 'Ficsite Trigon',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Triangular alien-tech component.',
    sinkPoints: 1291,
    tier: 9
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Crystallized carbon.',
    sinkPoints: 240000,
    tier: 8
  },
  dark_matter_crystal: {
    id: 'dark_matter_crystal',
    name: 'Dark Matter Crystal',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Solidified dark matter.',
    sinkPoints: 0,
    tier: 9
  },
  time_crystal: {
    id: 'time_crystal',
    name: 'Time Crystal',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Crystallized time-matter.',
    sinkPoints: 0,
    tier: 9
  },
  singularity_cell: {
    id: 'singularity_cell',
    name: 'Singularity Cell',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Contained singularity.',
    sinkPoints: 0,
    tier: 9
  },
  superposition_oscillator: {
    id: 'superposition_oscillator',
    name: 'Superposition Oscillator',
    category: 'component',
    stackSize: 100,
    isFluid: false,
    description: 'Quantum superposition device.',
    sinkPoints: 0,
    tier: 9
  },
  neural_quantum_processor: {
    id: 'neural_quantum_processor',
    name: 'Neural-Quantum Processor',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'Advanced quantum computing.',
    sinkPoints: 0,
    tier: 9
  },
  biochemical_sculptor: {
    id: 'biochemical_sculptor',
    name: 'Biochemical Sculptor',
    category: 'component',
    stackSize: 50,
    isFluid: false,
    description: 'Bio-mechanical fabrication device.',
    sinkPoints: 0,
    tier: 9
  },
  ballistic_warp_drive: {
    id: 'ballistic_warp_drive',
    name: 'Ballistic Warp Drive',
    category: 'project_part',
    stackSize: 50,
    isFluid: false,
    description: 'Space-warping propulsion system.',
    sinkPoints: 0,
    tier: 9
  },
  aluminum_scrap: {
    id: 'aluminum_scrap',
    name: 'Aluminum Scrap',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Raw aluminum for smelting.',
    sinkPoints: 27,
    tier: 7
  },
  petroleum_coke: {
    id: 'petroleum_coke',
    name: 'Petroleum Coke',
    category: 'fuel',
    stackSize: 200,
    isFluid: false,
    description: 'Carbon-rich fuel from oil.',
    sinkPoints: 20,
    tier: 5
  },
  battery: {
    id: 'battery',
    name: 'Battery',
    category: 'component',
    stackSize: 200,
    isFluid: false,
    description: 'Rechargeable power storage.',
    sinkPoints: 465,
    tier: 7
  },
  portable_miner: {
    id: 'portable_miner',
    name: 'Portable Miner',
    category: 'equipment_material',
    stackSize: 1,
    isFluid: false,
    description: 'Deployable mining equipment.',
    sinkPoints: 60,
    tier: 0
  }
};

// Helper function to get items by category
export function getItemsByCategory(category: ItemCategory): Item[] {
  return Object.values(ITEMS).filter(item => item.category === category);
}

// Helper function to get all fluid items
export function getFluidItems(): Item[] {
  return Object.values(ITEMS).filter(item => item.isFluid);
}

// Helper function to get all solid items
export function getSolidItems(): Item[] {
  return Object.values(ITEMS).filter(item => !item.isFluid);
}

// Helper function to get item by ID
export function getItem(itemId: string): Item | undefined {
  return ITEMS[itemId];
}

// Export item count for reference
export const ITEM_COUNT = Object.keys(ITEMS).length;

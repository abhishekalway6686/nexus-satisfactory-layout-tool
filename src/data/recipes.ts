// src/data/recipes.ts
// Comprehensive recipe database for Satisfactory production simulation

export type BuildingType =
  | 'smelter'
  | 'foundry'
  | 'constructor'
  | 'assembler'
  | 'manufacturer'
  | 'refinery'
  | 'blender'
  | 'packager'
  | 'particle_accelerator'
  | 'quantum_encoder'
  | 'converter';

export interface RecipeIO {
  itemId: string;
  amount: number;
  ratePerMinute: number; // Calculated: (60 / craftTime) * amount
}

export interface Recipe {
  id: string;
  name: string;
  buildingType: BuildingType;
  craftTime: number; // In seconds
  inputs: RecipeIO[];
  outputs: RecipeIO[];
  isAlternate: boolean;
  tier?: number;
  powerConsumption?: number; // Base power for variable-power buildings
  powerConsumptionMax?: number; // Max power for particle accelerator
}

// Helper to calculate rate per minute
function calcRate(amount: number, craftTime: number): number {
  return (60 / craftTime) * amount;
}

// Helper to create recipe IO
function io(itemId: string, amount: number, craftTime: number): RecipeIO {
  return { itemId, amount, ratePerMinute: calcRate(amount, craftTime) };
}

export const RECIPES: Record<string, Recipe> = {
  // ============================================
  // SMELTER RECIPES
  // ============================================
  iron_ingot: {
    id: 'iron_ingot',
    name: 'Iron Ingot',
    buildingType: 'smelter',
    craftTime: 2,
    inputs: [io('iron_ore', 1, 2)],
    outputs: [io('iron_ingot', 1, 2)],
    isAlternate: false,
    tier: 0
  },
  copper_ingot: {
    id: 'copper_ingot',
    name: 'Copper Ingot',
    buildingType: 'smelter',
    craftTime: 2,
    inputs: [io('copper_ore', 1, 2)],
    outputs: [io('copper_ingot', 1, 2)],
    isAlternate: false,
    tier: 0
  },
  caterium_ingot: {
    id: 'caterium_ingot',
    name: 'Caterium Ingot',
    buildingType: 'smelter',
    craftTime: 4,
    inputs: [io('caterium_ore', 3, 4)],
    outputs: [io('caterium_ingot', 1, 4)],
    isAlternate: false,
    tier: 2
  },
  pure_aluminum_ingot: {
    id: 'pure_aluminum_ingot',
    name: 'Pure Aluminum Ingot',
    buildingType: 'smelter',
    craftTime: 2,
    inputs: [io('aluminum_scrap', 2, 2)],
    outputs: [io('aluminum_ingot', 1, 2)],
    isAlternate: true,
    tier: 7
  },

  // ============================================
  // FOUNDRY RECIPES
  // ============================================
  steel_ingot: {
    id: 'steel_ingot',
    name: 'Steel Ingot',
    buildingType: 'foundry',
    craftTime: 4,
    inputs: [io('iron_ore', 3, 4), io('coal', 3, 4)],
    outputs: [io('steel_ingot', 3, 4)],
    isAlternate: false,
    tier: 3
  },
  aluminum_ingot: {
    id: 'aluminum_ingot',
    name: 'Aluminum Ingot',
    buildingType: 'foundry',
    craftTime: 4,
    inputs: [io('aluminum_scrap', 6, 4), io('silica', 5, 4)],
    outputs: [io('aluminum_ingot', 4, 4)],
    isAlternate: false,
    tier: 7
  },
  basic_iron_ingot: {
    id: 'basic_iron_ingot',
    name: 'Basic Iron Ingot',
    buildingType: 'foundry',
    craftTime: 12,
    inputs: [io('iron_ore', 5, 12), io('limestone', 8, 12)],
    outputs: [io('iron_ingot', 10, 12)],
    isAlternate: true,
    tier: 0
  },
  coke_steel_ingot: {
    id: 'coke_steel_ingot',
    name: 'Coke Steel Ingot',
    buildingType: 'foundry',
    craftTime: 12,
    inputs: [io('iron_ore', 15, 12), io('petroleum_coke', 15, 12)],
    outputs: [io('steel_ingot', 20, 12)],
    isAlternate: true,
    tier: 5
  },
  compacted_steel_ingot: {
    id: 'compacted_steel_ingot',
    name: 'Compacted Steel Ingot',
    buildingType: 'foundry',
    craftTime: 24,
    inputs: [io('iron_ore', 2, 24), io('compacted_coal', 1, 24)],
    outputs: [io('steel_ingot', 4, 24)],
    isAlternate: true,
    tier: 5
  },
  copper_alloy_ingot: {
    id: 'copper_alloy_ingot',
    name: 'Copper Alloy Ingot',
    buildingType: 'foundry',
    craftTime: 6,
    inputs: [io('copper_ore', 5, 6), io('iron_ore', 5, 6)],
    outputs: [io('copper_ingot', 10, 6)],
    isAlternate: true,
    tier: 3
  },
  iron_alloy_ingot: {
    id: 'iron_alloy_ingot',
    name: 'Iron Alloy Ingot',
    buildingType: 'foundry',
    craftTime: 12,
    inputs: [io('iron_ore', 8, 12), io('copper_ore', 2, 12)],
    outputs: [io('iron_ingot', 15, 12)],
    isAlternate: true,
    tier: 3
  },
  solid_steel_ingot: {
    id: 'solid_steel_ingot',
    name: 'Solid Steel Ingot',
    buildingType: 'foundry',
    craftTime: 3,
    inputs: [io('iron_ingot', 2, 3), io('coal', 2, 3)],
    outputs: [io('steel_ingot', 3, 3)],
    isAlternate: true,
    tier: 3
  },
  tempered_caterium_ingot: {
    id: 'tempered_caterium_ingot',
    name: 'Tempered Caterium Ingot',
    buildingType: 'foundry',
    craftTime: 8,
    inputs: [io('caterium_ore', 6, 8), io('petroleum_coke', 2, 8)],
    outputs: [io('caterium_ingot', 3, 8)],
    isAlternate: true,
    tier: 5
  },
  tempered_copper_ingot: {
    id: 'tempered_copper_ingot',
    name: 'Tempered Copper Ingot',
    buildingType: 'foundry',
    craftTime: 12,
    inputs: [io('copper_ore', 5, 12), io('petroleum_coke', 8, 12)],
    outputs: [io('copper_ingot', 12, 12)],
    isAlternate: true,
    tier: 5
  },

  // ============================================
  // CONSTRUCTOR RECIPES
  // ============================================
  iron_plate: {
    id: 'iron_plate',
    name: 'Iron Plate',
    buildingType: 'constructor',
    craftTime: 6,
    inputs: [io('iron_ingot', 3, 6)],
    outputs: [io('iron_plate', 2, 6)],
    isAlternate: false,
    tier: 0
  },
  iron_rod: {
    id: 'iron_rod',
    name: 'Iron Rod',
    buildingType: 'constructor',
    craftTime: 4,
    inputs: [io('iron_ingot', 1, 4)],
    outputs: [io('iron_rod', 1, 4)],
    isAlternate: false,
    tier: 0
  },
  screw: {
    id: 'screw',
    name: 'Screw',
    buildingType: 'constructor',
    craftTime: 6,
    inputs: [io('iron_rod', 1, 6)],
    outputs: [io('screw', 4, 6)],
    isAlternate: false,
    tier: 0
  },
  wire: {
    id: 'wire',
    name: 'Wire',
    buildingType: 'constructor',
    craftTime: 4,
    inputs: [io('copper_ingot', 1, 4)],
    outputs: [io('wire', 2, 4)],
    isAlternate: false,
    tier: 0
  },
  cable: {
    id: 'cable',
    name: 'Cable',
    buildingType: 'constructor',
    craftTime: 2,
    inputs: [io('wire', 2, 2)],
    outputs: [io('cable', 1, 2)],
    isAlternate: false,
    tier: 0
  },
  concrete: {
    id: 'concrete',
    name: 'Concrete',
    buildingType: 'constructor',
    craftTime: 4,
    inputs: [io('limestone', 3, 4)],
    outputs: [io('concrete', 1, 4)],
    isAlternate: false,
    tier: 0
  },
  copper_sheet: {
    id: 'copper_sheet',
    name: 'Copper Sheet',
    buildingType: 'constructor',
    craftTime: 6,
    inputs: [io('copper_ingot', 2, 6)],
    outputs: [io('copper_sheet', 1, 6)],
    isAlternate: false,
    tier: 2
  },
  copper_powder: {
    id: 'copper_powder',
    name: 'Copper Powder',
    buildingType: 'constructor',
    craftTime: 6,
    inputs: [io('copper_ingot', 30, 6)],
    outputs: [io('copper_powder', 5, 6)],
    isAlternate: false,
    tier: 8
  },
  steel_beam: {
    id: 'steel_beam',
    name: 'Steel Beam',
    buildingType: 'constructor',
    craftTime: 4,
    inputs: [io('steel_ingot', 4, 4)],
    outputs: [io('steel_beam', 1, 4)],
    isAlternate: false,
    tier: 3
  },
  steel_pipe: {
    id: 'steel_pipe',
    name: 'Steel Pipe',
    buildingType: 'constructor',
    craftTime: 6,
    inputs: [io('steel_ingot', 3, 6)],
    outputs: [io('steel_pipe', 2, 6)],
    isAlternate: false,
    tier: 3
  },
  aluminum_casing: {
    id: 'aluminum_casing',
    name: 'Aluminum Casing',
    buildingType: 'constructor',
    craftTime: 2,
    inputs: [io('aluminum_ingot', 3, 2)],
    outputs: [io('aluminum_casing', 2, 2)],
    isAlternate: false,
    tier: 7
  },
  quartz_crystal: {
    id: 'quartz_crystal',
    name: 'Quartz Crystal',
    buildingType: 'constructor',
    craftTime: 8,
    inputs: [io('raw_quartz', 5, 8)],
    outputs: [io('quartz_crystal', 3, 8)],
    isAlternate: false,
    tier: 3
  },
  silica: {
    id: 'silica',
    name: 'Silica',
    buildingType: 'constructor',
    craftTime: 8,
    inputs: [io('raw_quartz', 3, 8)],
    outputs: [io('silica', 5, 8)],
    isAlternate: false,
    tier: 3
  },
  quickwire: {
    id: 'quickwire',
    name: 'Quickwire',
    buildingType: 'constructor',
    craftTime: 5,
    inputs: [io('caterium_ingot', 1, 5)],
    outputs: [io('quickwire', 5, 5)],
    isAlternate: false,
    tier: 2
  },
  empty_canister: {
    id: 'empty_canister',
    name: 'Empty Canister',
    buildingType: 'constructor',
    craftTime: 4,
    inputs: [io('plastic', 2, 4)],
    outputs: [io('empty_canister', 4, 4)],
    isAlternate: false,
    tier: 5
  },
  empty_fluid_tank: {
    id: 'empty_fluid_tank',
    name: 'Empty Fluid Tank',
    buildingType: 'constructor',
    craftTime: 1,
    inputs: [io('aluminum_ingot', 1, 1)],
    outputs: [io('empty_fluid_tank', 1, 1)],
    isAlternate: false,
    tier: 7
  },
  iron_rebar: {
    id: 'iron_rebar',
    name: 'Iron Rebar',
    buildingType: 'constructor',
    craftTime: 4,
    inputs: [io('iron_rod', 1, 4)],
    outputs: [io('iron_rebar', 1, 4)],
    isAlternate: false,
    tier: 3
  },
  biomass_leaves: {
    id: 'biomass_leaves',
    name: 'Biomass (Leaves)',
    buildingType: 'constructor',
    craftTime: 5,
    inputs: [io('leaves', 10, 5)],
    outputs: [io('biomass', 5, 5)],
    isAlternate: false,
    tier: 0
  },
  biomass_wood: {
    id: 'biomass_wood',
    name: 'Biomass (Wood)',
    buildingType: 'constructor',
    craftTime: 4,
    inputs: [io('wood', 4, 4)],
    outputs: [io('biomass', 20, 4)],
    isAlternate: false,
    tier: 0
  },
  biomass_mycelia: {
    id: 'biomass_mycelia',
    name: 'Biomass (Mycelia)',
    buildingType: 'constructor',
    craftTime: 4,
    inputs: [io('mycelia', 1, 4)],
    outputs: [io('biomass', 10, 4)],
    isAlternate: false,
    tier: 0
  },
  biomass_alien_protein: {
    id: 'biomass_alien_protein',
    name: 'Biomass (Alien Protein)',
    buildingType: 'constructor',
    craftTime: 4,
    inputs: [io('alien_protein', 1, 4)],
    outputs: [io('biomass', 100, 4)],
    isAlternate: false,
    tier: 0
  },
  solid_biofuel: {
    id: 'solid_biofuel',
    name: 'Solid Biofuel',
    buildingType: 'constructor',
    craftTime: 4,
    inputs: [io('biomass', 8, 4)],
    outputs: [io('solid_biofuel', 4, 4)],
    isAlternate: false,
    tier: 2
  },
  ficsite_trigon: {
    id: 'ficsite_trigon',
    name: 'Ficsite Trigon',
    buildingType: 'constructor',
    craftTime: 6,
    inputs: [io('ficsite_ingot', 1, 6)],
    outputs: [io('ficsite_trigon', 3, 6)],
    isAlternate: false,
    tier: 9
  },
  reanimated_sam: {
    id: 'reanimated_sam',
    name: 'Reanimated SAM',
    buildingType: 'constructor',
    craftTime: 2,
    inputs: [io('sam', 4, 2)],
    outputs: [io('reanimated_sam', 1, 2)],
    isAlternate: false,
    tier: 7
  },
  power_shard_1: {
    id: 'power_shard_1',
    name: 'Power Shard (1)',
    buildingType: 'constructor',
    craftTime: 8,
    inputs: [io('blue_power_slug', 1, 8)],
    outputs: [io('power_shard', 1, 8)],
    isAlternate: false,
    tier: 0
  },
  power_shard_2: {
    id: 'power_shard_2',
    name: 'Power Shard (2)',
    buildingType: 'constructor',
    craftTime: 12,
    inputs: [io('yellow_power_slug', 1, 12)],
    outputs: [io('power_shard', 2, 12)],
    isAlternate: false,
    tier: 0
  },
  power_shard_5: {
    id: 'power_shard_5',
    name: 'Power Shard (5)',
    buildingType: 'constructor',
    craftTime: 24,
    inputs: [io('purple_power_slug', 1, 24)],
    outputs: [io('power_shard', 5, 24)],
    isAlternate: false,
    tier: 0
  },
  // Constructor Alternates
  cast_screw: {
    id: 'cast_screw',
    name: 'Cast Screw',
    buildingType: 'constructor',
    craftTime: 24,
    inputs: [io('iron_ingot', 5, 24)],
    outputs: [io('screw', 20, 24)],
    isAlternate: true,
    tier: 0
  },
  caterium_wire: {
    id: 'caterium_wire',
    name: 'Caterium Wire',
    buildingType: 'constructor',
    craftTime: 4,
    inputs: [io('caterium_ingot', 1, 4)],
    outputs: [io('wire', 8, 4)],
    isAlternate: true,
    tier: 2
  },
  iron_wire: {
    id: 'iron_wire',
    name: 'Iron Wire',
    buildingType: 'constructor',
    craftTime: 24,
    inputs: [io('iron_ingot', 5, 24)],
    outputs: [io('wire', 9, 24)],
    isAlternate: true,
    tier: 0
  },
  steel_rod: {
    id: 'steel_rod',
    name: 'Steel Rod',
    buildingType: 'constructor',
    craftTime: 5,
    inputs: [io('steel_ingot', 1, 5)],
    outputs: [io('iron_rod', 4, 5)],
    isAlternate: true,
    tier: 3
  },
  steel_screw: {
    id: 'steel_screw',
    name: 'Steel Screw',
    buildingType: 'constructor',
    craftTime: 12,
    inputs: [io('steel_beam', 1, 12)],
    outputs: [io('screw', 52, 12)],
    isAlternate: true,
    tier: 3
  },
  steel_canister: {
    id: 'steel_canister',
    name: 'Steel Canister',
    buildingType: 'constructor',
    craftTime: 6,
    inputs: [io('steel_ingot', 4, 6)],
    outputs: [io('empty_canister', 4, 6)],
    isAlternate: true,
    tier: 5
  },
  biocoal: {
    id: 'biocoal',
    name: 'Biocoal',
    buildingType: 'constructor',
    craftTime: 8,
    inputs: [io('biomass', 5, 8)],
    outputs: [io('coal', 6, 8)],
    isAlternate: true,
    tier: 3
  },
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal',
    buildingType: 'constructor',
    craftTime: 4,
    inputs: [io('wood', 1, 4)],
    outputs: [io('coal', 10, 4)],
    isAlternate: true,
    tier: 3
  },

  // ============================================
  // ASSEMBLER RECIPES
  // ============================================
  reinforced_iron_plate: {
    id: 'reinforced_iron_plate',
    name: 'Reinforced Iron Plate',
    buildingType: 'assembler',
    craftTime: 12,
    inputs: [io('iron_plate', 6, 12), io('screw', 12, 12)],
    outputs: [io('reinforced_iron_plate', 1, 12)],
    isAlternate: false,
    tier: 0
  },
  modular_frame: {
    id: 'modular_frame',
    name: 'Modular Frame',
    buildingType: 'assembler',
    craftTime: 60,
    inputs: [io('reinforced_iron_plate', 3, 60), io('iron_rod', 12, 60)],
    outputs: [io('modular_frame', 2, 60)],
    isAlternate: false,
    tier: 2
  },
  rotor: {
    id: 'rotor',
    name: 'Rotor',
    buildingType: 'assembler',
    craftTime: 15,
    inputs: [io('iron_rod', 5, 15), io('screw', 25, 15)],
    outputs: [io('rotor', 1, 15)],
    isAlternate: false,
    tier: 2
  },
  stator: {
    id: 'stator',
    name: 'Stator',
    buildingType: 'assembler',
    craftTime: 12,
    inputs: [io('steel_pipe', 3, 12), io('wire', 8, 12)],
    outputs: [io('stator', 1, 12)],
    isAlternate: false,
    tier: 4
  },
  motor: {
    id: 'motor',
    name: 'Motor',
    buildingType: 'assembler',
    craftTime: 12,
    inputs: [io('rotor', 2, 12), io('stator', 2, 12)],
    outputs: [io('motor', 1, 12)],
    isAlternate: false,
    tier: 4
  },
  circuit_board: {
    id: 'circuit_board',
    name: 'Circuit Board',
    buildingType: 'assembler',
    craftTime: 8,
    inputs: [io('copper_sheet', 2, 8), io('plastic', 4, 8)],
    outputs: [io('circuit_board', 1, 8)],
    isAlternate: false,
    tier: 5
  },
  ai_limiter: {
    id: 'ai_limiter',
    name: 'AI Limiter',
    buildingType: 'assembler',
    craftTime: 12,
    inputs: [io('copper_sheet', 5, 12), io('quickwire', 20, 12)],
    outputs: [io('ai_limiter', 1, 12)],
    isAlternate: false,
    tier: 7
  },
  encased_industrial_beam: {
    id: 'encased_industrial_beam',
    name: 'Encased Industrial Beam',
    buildingType: 'assembler',
    craftTime: 10,
    inputs: [io('steel_beam', 3, 10), io('concrete', 6, 10)],
    outputs: [io('encased_industrial_beam', 1, 10)],
    isAlternate: false,
    tier: 4
  },
  versatile_framework: {
    id: 'versatile_framework',
    name: 'Versatile Framework',
    buildingType: 'assembler',
    craftTime: 24,
    inputs: [io('modular_frame', 1, 24), io('steel_beam', 12, 24)],
    outputs: [io('versatile_framework', 2, 24)],
    isAlternate: false,
    tier: 3
  },
  automated_wiring: {
    id: 'automated_wiring',
    name: 'Automated Wiring',
    buildingType: 'assembler',
    craftTime: 24,
    inputs: [io('stator', 1, 24), io('cable', 20, 24)],
    outputs: [io('automated_wiring', 1, 24)],
    isAlternate: false,
    tier: 4
  },
  smart_plating: {
    id: 'smart_plating',
    name: 'Smart Plating',
    buildingType: 'assembler',
    craftTime: 30,
    inputs: [io('reinforced_iron_plate', 1, 30), io('rotor', 1, 30)],
    outputs: [io('smart_plating', 1, 30)],
    isAlternate: false,
    tier: 2
  },
  alclad_aluminum_sheet: {
    id: 'alclad_aluminum_sheet',
    name: 'Alclad Aluminum Sheet',
    buildingType: 'assembler',
    craftTime: 6,
    inputs: [io('aluminum_ingot', 3, 6), io('copper_ingot', 1, 6)],
    outputs: [io('alclad_aluminum_sheet', 3, 6)],
    isAlternate: false,
    tier: 7
  },
  heat_sink: {
    id: 'heat_sink',
    name: 'Heat Sink',
    buildingType: 'assembler',
    craftTime: 8,
    inputs: [io('alclad_aluminum_sheet', 5, 8), io('copper_sheet', 3, 8)],
    outputs: [io('heat_sink', 1, 8)],
    isAlternate: false,
    tier: 7
  },
  electromagnetic_control_rod: {
    id: 'electromagnetic_control_rod',
    name: 'Electromagnetic Control Rod',
    buildingType: 'assembler',
    craftTime: 30,
    inputs: [io('stator', 3, 30), io('ai_limiter', 2, 30)],
    outputs: [io('electromagnetic_control_rod', 2, 30)],
    isAlternate: false,
    tier: 8
  },
  black_powder: {
    id: 'black_powder',
    name: 'Black Powder',
    buildingType: 'assembler',
    craftTime: 4,
    inputs: [io('coal', 1, 4), io('sulfur', 1, 4)],
    outputs: [io('black_powder', 2, 4)],
    isAlternate: false,
    tier: 5
  },
  nobelisk: {
    id: 'nobelisk',
    name: 'Nobelisk',
    buildingType: 'assembler',
    craftTime: 6,
    inputs: [io('black_powder', 2, 6), io('steel_pipe', 2, 6)],
    outputs: [io('nobelisk', 1, 6)],
    isAlternate: false,
    tier: 5
  },
  fabric: {
    id: 'fabric',
    name: 'Fabric',
    buildingType: 'assembler',
    craftTime: 4,
    inputs: [io('mycelia', 1, 4), io('biomass', 5, 4)],
    outputs: [io('fabric', 1, 4)],
    isAlternate: false,
    tier: 2
  },
  compacted_coal: {
    id: 'compacted_coal',
    name: 'Compacted Coal',
    buildingType: 'assembler',
    craftTime: 12,
    inputs: [io('coal', 5, 12), io('sulfur', 5, 12)],
    outputs: [io('compacted_coal', 5, 12)],
    isAlternate: false,
    tier: 5
  },
  // Assembler Alternates
  adhered_iron_plate: {
    id: 'adhered_iron_plate',
    name: 'Adhered Iron Plate',
    buildingType: 'assembler',
    craftTime: 16,
    inputs: [io('iron_plate', 3, 16), io('rubber', 1, 16)],
    outputs: [io('reinforced_iron_plate', 1, 16)],
    isAlternate: true,
    tier: 5
  },
  bolted_frame: {
    id: 'bolted_frame',
    name: 'Bolted Frame',
    buildingType: 'assembler',
    craftTime: 24,
    inputs: [io('reinforced_iron_plate', 3, 24), io('screw', 56, 24)],
    outputs: [io('modular_frame', 2, 24)],
    isAlternate: true,
    tier: 2
  },
  bolted_iron_plate: {
    id: 'bolted_iron_plate',
    name: 'Bolted Iron Plate',
    buildingType: 'assembler',
    craftTime: 12,
    inputs: [io('iron_plate', 18, 12), io('screw', 50, 12)],
    outputs: [io('reinforced_iron_plate', 3, 12)],
    isAlternate: true,
    tier: 0
  },
  copper_rotor: {
    id: 'copper_rotor',
    name: 'Copper Rotor',
    buildingType: 'assembler',
    craftTime: 16,
    inputs: [io('copper_sheet', 6, 16), io('screw', 52, 16)],
    outputs: [io('rotor', 3, 16)],
    isAlternate: true,
    tier: 2
  },
  steel_rotor: {
    id: 'steel_rotor',
    name: 'Steel Rotor',
    buildingType: 'assembler',
    craftTime: 12,
    inputs: [io('steel_pipe', 2, 12), io('wire', 6, 12)],
    outputs: [io('rotor', 1, 12)],
    isAlternate: true,
    tier: 3
  },
  steeled_frame: {
    id: 'steeled_frame',
    name: 'Steeled Frame',
    buildingType: 'assembler',
    craftTime: 60,
    inputs: [io('reinforced_iron_plate', 2, 60), io('steel_pipe', 10, 60)],
    outputs: [io('modular_frame', 3, 60)],
    isAlternate: true,
    tier: 3
  },
  quickwire_stator: {
    id: 'quickwire_stator',
    name: 'Quickwire Stator',
    buildingType: 'assembler',
    craftTime: 15,
    inputs: [io('steel_pipe', 4, 15), io('quickwire', 15, 15)],
    outputs: [io('stator', 2, 15)],
    isAlternate: true,
    tier: 4
  },
  electric_motor: {
    id: 'electric_motor',
    name: 'Electric Motor',
    buildingType: 'assembler',
    craftTime: 16,
    inputs: [io('electromagnetic_control_rod', 1, 16), io('rotor', 2, 16)],
    outputs: [io('motor', 2, 16)],
    isAlternate: true,
    tier: 8
  },
  caterium_circuit_board: {
    id: 'caterium_circuit_board',
    name: 'Caterium Circuit Board',
    buildingType: 'assembler',
    craftTime: 48,
    inputs: [io('plastic', 10, 48), io('quickwire', 30, 48)],
    outputs: [io('circuit_board', 7, 48)],
    isAlternate: true,
    tier: 5
  },
  electrode_circuit_board: {
    id: 'electrode_circuit_board',
    name: 'Electrode Circuit Board',
    buildingType: 'assembler',
    craftTime: 12,
    inputs: [io('rubber', 4, 12), io('petroleum_coke', 8, 12)],
    outputs: [io('circuit_board', 1, 12)],
    isAlternate: true,
    tier: 5
  },
  silicon_circuit_board: {
    id: 'silicon_circuit_board',
    name: 'Silicon Circuit Board',
    buildingType: 'assembler',
    craftTime: 24,
    inputs: [io('copper_sheet', 11, 24), io('silica', 11, 24)],
    outputs: [io('circuit_board', 5, 24)],
    isAlternate: true,
    tier: 5
  },
  insulated_cable: {
    id: 'insulated_cable',
    name: 'Insulated Cable',
    buildingType: 'assembler',
    craftTime: 12,
    inputs: [io('wire', 9, 12), io('rubber', 6, 12)],
    outputs: [io('cable', 20, 12)],
    isAlternate: true,
    tier: 5
  },
  quickwire_cable: {
    id: 'quickwire_cable',
    name: 'Quickwire Cable',
    buildingType: 'assembler',
    craftTime: 24,
    inputs: [io('quickwire', 3, 24), io('rubber', 2, 24)],
    outputs: [io('cable', 11, 24)],
    isAlternate: true,
    tier: 5
  },
  fine_concrete: {
    id: 'fine_concrete',
    name: 'Fine Concrete',
    buildingType: 'assembler',
    craftTime: 12,
    inputs: [io('silica', 3, 12), io('limestone', 12, 12)],
    outputs: [io('concrete', 10, 12)],
    isAlternate: true,
    tier: 3
  },
  rubber_concrete: {
    id: 'rubber_concrete',
    name: 'Rubber Concrete',
    buildingType: 'assembler',
    craftTime: 6,
    inputs: [io('limestone', 10, 6), io('rubber', 2, 6)],
    outputs: [io('concrete', 9, 6)],
    isAlternate: true,
    tier: 5
  },
  cheap_silica: {
    id: 'cheap_silica',
    name: 'Cheap Silica',
    buildingType: 'assembler',
    craftTime: 8,
    inputs: [io('raw_quartz', 3, 8), io('limestone', 5, 8)],
    outputs: [io('silica', 7, 8)],
    isAlternate: true,
    tier: 3
  },
  heat_exchanger: {
    id: 'heat_exchanger',
    name: 'Heat Exchanger',
    buildingType: 'assembler',
    craftTime: 6,
    inputs: [io('aluminum_casing', 3, 6), io('rubber', 3, 6)],
    outputs: [io('heat_sink', 1, 6)],
    isAlternate: true,
    tier: 7
  },

  // ============================================
  // MANUFACTURER RECIPES
  // ============================================
  computer: {
    id: 'computer',
    name: 'Computer',
    buildingType: 'manufacturer',
    craftTime: 24,
    inputs: [io('circuit_board', 4, 24), io('cable', 8, 24), io('plastic', 16, 24)],
    outputs: [io('computer', 1, 24)],
    isAlternate: false,
    tier: 5
  },
  supercomputer: {
    id: 'supercomputer',
    name: 'Supercomputer',
    buildingType: 'manufacturer',
    craftTime: 32,
    inputs: [io('computer', 4, 32), io('ai_limiter', 2, 32), io('high_speed_connector', 3, 32), io('plastic', 28, 32)],
    outputs: [io('supercomputer', 1, 32)],
    isAlternate: false,
    tier: 7
  },
  heavy_modular_frame: {
    id: 'heavy_modular_frame',
    name: 'Heavy Modular Frame',
    buildingType: 'manufacturer',
    craftTime: 30,
    inputs: [io('modular_frame', 5, 30), io('steel_pipe', 20, 30), io('encased_industrial_beam', 5, 30), io('screw', 120, 30)],
    outputs: [io('heavy_modular_frame', 1, 30)],
    isAlternate: false,
    tier: 5
  },
  crystal_oscillator: {
    id: 'crystal_oscillator',
    name: 'Crystal Oscillator',
    buildingType: 'manufacturer',
    craftTime: 120,
    inputs: [io('quartz_crystal', 36, 120), io('cable', 28, 120), io('reinforced_iron_plate', 5, 120)],
    outputs: [io('crystal_oscillator', 2, 120)],
    isAlternate: false,
    tier: 5
  },
  high_speed_connector: {
    id: 'high_speed_connector',
    name: 'High-Speed Connector',
    buildingType: 'manufacturer',
    craftTime: 16,
    inputs: [io('quickwire', 56, 16), io('cable', 10, 16), io('circuit_board', 1, 16)],
    outputs: [io('high_speed_connector', 1, 16)],
    isAlternate: false,
    tier: 6
  },
  radio_control_unit: {
    id: 'radio_control_unit',
    name: 'Radio Control Unit',
    buildingType: 'manufacturer',
    craftTime: 48,
    inputs: [io('aluminum_casing', 32, 48), io('crystal_oscillator', 1, 48), io('computer', 2, 48)],
    outputs: [io('radio_control_unit', 2, 48)],
    isAlternate: false,
    tier: 8
  },
  modular_engine: {
    id: 'modular_engine',
    name: 'Modular Engine',
    buildingType: 'manufacturer',
    craftTime: 60,
    inputs: [io('motor', 2, 60), io('rubber', 15, 60), io('smart_plating', 2, 60)],
    outputs: [io('modular_engine', 1, 60)],
    isAlternate: false,
    tier: 5
  },
  adaptive_control_unit: {
    id: 'adaptive_control_unit',
    name: 'Adaptive Control Unit',
    buildingType: 'manufacturer',
    craftTime: 60,
    inputs: [io('automated_wiring', 5, 60), io('circuit_board', 5, 60), io('heavy_modular_frame', 1, 60), io('computer', 2, 60)],
    outputs: [io('adaptive_control_unit', 1, 60)],
    isAlternate: false,
    tier: 6
  },
  turbo_motor: {
    id: 'turbo_motor',
    name: 'Turbo Motor',
    buildingType: 'manufacturer',
    craftTime: 32,
    inputs: [io('cooling_system', 4, 32), io('radio_control_unit', 2, 32), io('motor', 4, 32), io('rubber', 24, 32)],
    outputs: [io('turbo_motor', 1, 32)],
    isAlternate: false,
    tier: 8
  },
  gas_filter: {
    id: 'gas_filter',
    name: 'Gas Filter',
    buildingType: 'manufacturer',
    craftTime: 8,
    inputs: [io('fabric', 2, 8), io('coal', 4, 8), io('iron_plate', 2, 8)],
    outputs: [io('gas_filter', 1, 8)],
    isAlternate: false,
    tier: 5
  },
  iodine_infused_filter: {
    id: 'iodine_infused_filter',
    name: 'Iodine-Infused Filter',
    buildingType: 'manufacturer',
    craftTime: 16,
    inputs: [io('gas_filter', 1, 16), io('quickwire', 8, 16), io('aluminum_casing', 1, 16)],
    outputs: [io('iodine_infused_filter', 1, 16)],
    isAlternate: false,
    tier: 8
  },
  uranium_fuel_rod: {
    id: 'uranium_fuel_rod',
    name: 'Uranium Fuel Rod',
    buildingType: 'manufacturer',
    craftTime: 150,
    inputs: [io('encased_uranium_cell', 50, 150), io('encased_industrial_beam', 3, 150), io('electromagnetic_control_rod', 5, 150)],
    outputs: [io('uranium_fuel_rod', 1, 150)],
    isAlternate: false,
    tier: 8
  },
  plutonium_fuel_rod: {
    id: 'plutonium_fuel_rod',
    name: 'Plutonium Fuel Rod',
    buildingType: 'manufacturer',
    craftTime: 240,
    inputs: [io('encased_plutonium_cell', 30, 240), io('steel_beam', 18, 240), io('electromagnetic_control_rod', 6, 240), io('heat_sink', 10, 240)],
    outputs: [io('plutonium_fuel_rod', 1, 240)],
    isAlternate: false,
    tier: 8
  },
  sam_fluctuator: {
    id: 'sam_fluctuator',
    name: 'SAM Fluctuator',
    buildingType: 'manufacturer',
    craftTime: 6,
    inputs: [io('reanimated_sam', 6, 6), io('wire', 5, 6), io('steel_pipe', 3, 6)],
    outputs: [io('sam_fluctuator', 1, 6)],
    isAlternate: false,
    tier: 7
  },
  // Manufacturer Alternates
  crystal_computer: {
    id: 'crystal_computer',
    name: 'Crystal Computer',
    buildingType: 'assembler',
    craftTime: 36,
    inputs: [io('circuit_board', 3, 36), io('crystal_oscillator', 1, 36)],
    outputs: [io('computer', 2, 36)],
    isAlternate: true,
    tier: 5
  },
  caterium_computer: {
    id: 'caterium_computer',
    name: 'Caterium Computer',
    buildingType: 'manufacturer',
    craftTime: 16,
    inputs: [io('circuit_board', 4, 16), io('quickwire', 14, 16), io('rubber', 6, 16)],
    outputs: [io('computer', 1, 16)],
    isAlternate: true,
    tier: 5
  },
  heavy_encased_frame: {
    id: 'heavy_encased_frame',
    name: 'Heavy Encased Frame',
    buildingType: 'manufacturer',
    craftTime: 64,
    inputs: [io('modular_frame', 8, 64), io('encased_industrial_beam', 10, 64), io('steel_pipe', 36, 64), io('concrete', 22, 64)],
    outputs: [io('heavy_modular_frame', 3, 64)],
    isAlternate: true,
    tier: 5
  },
  heavy_flexible_frame: {
    id: 'heavy_flexible_frame',
    name: 'Heavy Flexible Frame',
    buildingType: 'manufacturer',
    craftTime: 16,
    inputs: [io('modular_frame', 5, 16), io('encased_industrial_beam', 3, 16), io('rubber', 20, 16), io('screw', 104, 16)],
    outputs: [io('heavy_modular_frame', 1, 16)],
    isAlternate: true,
    tier: 5
  },
  insulated_crystal_oscillator: {
    id: 'insulated_crystal_oscillator',
    name: 'Insulated Crystal Oscillator',
    buildingType: 'manufacturer',
    craftTime: 32,
    inputs: [io('quartz_crystal', 10, 32), io('rubber', 7, 32), io('ai_limiter', 1, 32)],
    outputs: [io('crystal_oscillator', 1, 32)],
    isAlternate: true,
    tier: 7
  },
  rigor_motor: {
    id: 'rigor_motor',
    name: 'Rigor Motor',
    buildingType: 'manufacturer',
    craftTime: 48,
    inputs: [io('rotor', 3, 48), io('stator', 3, 48), io('crystal_oscillator', 1, 48)],
    outputs: [io('motor', 6, 48)],
    isAlternate: true,
    tier: 5
  },
  turbo_electric_motor: {
    id: 'turbo_electric_motor',
    name: 'Turbo Electric Motor',
    buildingType: 'manufacturer',
    craftTime: 64,
    inputs: [io('motor', 7, 64), io('radio_control_unit', 9, 64), io('electromagnetic_control_rod', 5, 64), io('rotor', 7, 64)],
    outputs: [io('turbo_motor', 3, 64)],
    isAlternate: true,
    tier: 8
  },

  // ============================================
  // REFINERY RECIPES
  // ============================================
  plastic: {
    id: 'plastic',
    name: 'Plastic',
    buildingType: 'refinery',
    craftTime: 6,
    inputs: [io('crude_oil', 3, 6)],
    outputs: [io('plastic', 2, 6), io('heavy_oil_residue', 1, 6)],
    isAlternate: false,
    tier: 5
  },
  rubber: {
    id: 'rubber',
    name: 'Rubber',
    buildingType: 'refinery',
    craftTime: 6,
    inputs: [io('crude_oil', 3, 6)],
    outputs: [io('rubber', 2, 6), io('heavy_oil_residue', 2, 6)],
    isAlternate: false,
    tier: 5
  },
  fuel: {
    id: 'fuel',
    name: 'Fuel',
    buildingType: 'refinery',
    craftTime: 6,
    inputs: [io('crude_oil', 6, 6)],
    outputs: [io('fuel', 4, 6), io('polymer_resin', 3, 6)],
    isAlternate: false,
    tier: 5
  },
  residual_fuel: {
    id: 'residual_fuel',
    name: 'Residual Fuel',
    buildingType: 'refinery',
    craftTime: 6,
    inputs: [io('heavy_oil_residue', 6, 6)],
    outputs: [io('fuel', 4, 6)],
    isAlternate: false,
    tier: 5
  },
  residual_plastic: {
    id: 'residual_plastic',
    name: 'Residual Plastic',
    buildingType: 'refinery',
    craftTime: 6,
    inputs: [io('polymer_resin', 6, 6), io('water', 2, 6)],
    outputs: [io('plastic', 2, 6)],
    isAlternate: false,
    tier: 5
  },
  residual_rubber: {
    id: 'residual_rubber',
    name: 'Residual Rubber',
    buildingType: 'refinery',
    craftTime: 6,
    inputs: [io('polymer_resin', 4, 6), io('water', 4, 6)],
    outputs: [io('rubber', 2, 6)],
    isAlternate: false,
    tier: 5
  },
  petroleum_coke: {
    id: 'petroleum_coke',
    name: 'Petroleum Coke',
    buildingType: 'refinery',
    craftTime: 6,
    inputs: [io('heavy_oil_residue', 4, 6)],
    outputs: [io('petroleum_coke', 12, 6)],
    isAlternate: false,
    tier: 5
  },
  alumina_solution: {
    id: 'alumina_solution',
    name: 'Alumina Solution',
    buildingType: 'refinery',
    craftTime: 6,
    inputs: [io('bauxite', 12, 6), io('water', 18, 6)],
    outputs: [io('alumina_solution', 12, 6), io('silica', 5, 6)],
    isAlternate: false,
    tier: 7
  },
  aluminum_scrap: {
    id: 'aluminum_scrap',
    name: 'Aluminum Scrap',
    buildingType: 'refinery',
    craftTime: 1,
    inputs: [io('alumina_solution', 4, 1), io('coal', 2, 1)],
    outputs: [io('aluminum_scrap', 6, 1), io('water', 2, 1)],
    isAlternate: false,
    tier: 7
  },
  sulfuric_acid: {
    id: 'sulfuric_acid',
    name: 'Sulfuric Acid',
    buildingType: 'refinery',
    craftTime: 6,
    inputs: [io('sulfur', 5, 6), io('water', 5, 6)],
    outputs: [io('sulfuric_acid', 5, 6)],
    isAlternate: false,
    tier: 7
  },
  smokeless_powder: {
    id: 'smokeless_powder',
    name: 'Smokeless Powder',
    buildingType: 'refinery',
    craftTime: 6,
    inputs: [io('black_powder', 2, 6), io('heavy_oil_residue', 1, 6)],
    outputs: [io('smokeless_powder', 2, 6)],
    isAlternate: false,
    tier: 5
  },
  liquid_biofuel: {
    id: 'liquid_biofuel',
    name: 'Liquid Biofuel',
    buildingType: 'refinery',
    craftTime: 4,
    inputs: [io('solid_biofuel', 6, 4), io('water', 3, 4)],
    outputs: [io('liquid_biofuel', 4, 4)],
    isAlternate: false,
    tier: 5
  },
  turbofuel: {
    id: 'turbofuel',
    name: 'Turbofuel',
    buildingType: 'refinery',
    craftTime: 16,
    inputs: [io('fuel', 6, 16), io('compacted_coal', 4, 16)],
    outputs: [io('turbofuel', 5, 16)],
    isAlternate: false,
    tier: 5
  },
  // Refinery Alternates
  heavy_oil_residue: {
    id: 'heavy_oil_residue',
    name: 'Heavy Oil Residue',
    buildingType: 'refinery',
    craftTime: 6,
    inputs: [io('crude_oil', 3, 6)],
    outputs: [io('heavy_oil_residue', 4, 6), io('polymer_resin', 2, 6)],
    isAlternate: true,
    tier: 5
  },
  polymer_resin: {
    id: 'polymer_resin',
    name: 'Polymer Resin',
    buildingType: 'refinery',
    craftTime: 6,
    inputs: [io('crude_oil', 6, 6)],
    outputs: [io('polymer_resin', 13, 6), io('heavy_oil_residue', 2, 6)],
    isAlternate: true,
    tier: 5
  },
  recycled_plastic: {
    id: 'recycled_plastic',
    name: 'Recycled Plastic',
    buildingType: 'refinery',
    craftTime: 12,
    inputs: [io('rubber', 6, 12), io('fuel', 6, 12)],
    outputs: [io('plastic', 12, 12)],
    isAlternate: true,
    tier: 5
  },
  recycled_rubber: {
    id: 'recycled_rubber',
    name: 'Recycled Rubber',
    buildingType: 'refinery',
    craftTime: 12,
    inputs: [io('plastic', 6, 12), io('fuel', 6, 12)],
    outputs: [io('rubber', 12, 12)],
    isAlternate: true,
    tier: 5
  },
  turbo_heavy_fuel: {
    id: 'turbo_heavy_fuel',
    name: 'Turbo Heavy Fuel',
    buildingType: 'refinery',
    craftTime: 8,
    inputs: [io('heavy_oil_residue', 5, 8), io('compacted_coal', 4, 8)],
    outputs: [io('turbofuel', 4, 8)],
    isAlternate: true,
    tier: 5
  },
  coated_cable: {
    id: 'coated_cable',
    name: 'Coated Cable',
    buildingType: 'refinery',
    craftTime: 8,
    inputs: [io('wire', 5, 8), io('heavy_oil_residue', 2, 8)],
    outputs: [io('cable', 9, 8)],
    isAlternate: true,
    tier: 5
  },
  polyester_fabric: {
    id: 'polyester_fabric',
    name: 'Polyester Fabric',
    buildingType: 'refinery',
    craftTime: 2,
    inputs: [io('polymer_resin', 1, 2), io('water', 1, 2)],
    outputs: [io('fabric', 1, 2)],
    isAlternate: true,
    tier: 5
  },
  wet_concrete: {
    id: 'wet_concrete',
    name: 'Wet Concrete',
    buildingType: 'refinery',
    craftTime: 3,
    inputs: [io('limestone', 6, 3), io('water', 5, 3)],
    outputs: [io('concrete', 4, 3)],
    isAlternate: true,
    tier: 3
  },
  pure_iron_ingot: {
    id: 'pure_iron_ingot',
    name: 'Pure Iron Ingot',
    buildingType: 'refinery',
    craftTime: 12,
    inputs: [io('iron_ore', 7, 12), io('water', 4, 12)],
    outputs: [io('iron_ingot', 13, 12)],
    isAlternate: true,
    tier: 3
  },
  pure_copper_ingot: {
    id: 'pure_copper_ingot',
    name: 'Pure Copper Ingot',
    buildingType: 'refinery',
    craftTime: 24,
    inputs: [io('copper_ore', 6, 24), io('water', 4, 24)],
    outputs: [io('copper_ingot', 15, 24)],
    isAlternate: true,
    tier: 3
  },
  pure_caterium_ingot: {
    id: 'pure_caterium_ingot',
    name: 'Pure Caterium Ingot',
    buildingType: 'refinery',
    craftTime: 5,
    inputs: [io('caterium_ore', 2, 5), io('water', 2, 5)],
    outputs: [io('caterium_ingot', 1, 5)],
    isAlternate: true,
    tier: 3
  },
  pure_quartz_crystal: {
    id: 'pure_quartz_crystal',
    name: 'Pure Quartz Crystal',
    buildingType: 'refinery',
    craftTime: 8,
    inputs: [io('raw_quartz', 9, 8), io('water', 5, 8)],
    outputs: [io('quartz_crystal', 7, 8)],
    isAlternate: true,
    tier: 3
  },
  electrode_aluminum_scrap: {
    id: 'electrode_aluminum_scrap',
    name: 'Electrode Aluminum Scrap',
    buildingType: 'refinery',
    craftTime: 4,
    inputs: [io('alumina_solution', 12, 4), io('petroleum_coke', 4, 4)],
    outputs: [io('aluminum_scrap', 20, 4), io('water', 7, 4)],
    isAlternate: true,
    tier: 7
  },
  sloppy_alumina: {
    id: 'sloppy_alumina',
    name: 'Sloppy Alumina',
    buildingType: 'refinery',
    craftTime: 3,
    inputs: [io('bauxite', 10, 3), io('water', 10, 3)],
    outputs: [io('alumina_solution', 12, 3)],
    isAlternate: true,
    tier: 7
  },
  steamed_copper_sheet: {
    id: 'steamed_copper_sheet',
    name: 'Steamed Copper Sheet',
    buildingType: 'refinery',
    craftTime: 8,
    inputs: [io('copper_ingot', 3, 8), io('water', 3, 8)],
    outputs: [io('copper_sheet', 3, 8)],
    isAlternate: true,
    tier: 3
  },

  // ============================================
  // BLENDER RECIPES
  // ============================================
  battery: {
    id: 'battery',
    name: 'Battery',
    buildingType: 'blender',
    craftTime: 3,
    inputs: [io('sulfuric_acid', 2.5, 3), io('alumina_solution', 2, 3), io('aluminum_casing', 1, 3)],
    outputs: [io('battery', 1, 3), io('water', 1.5, 3)],
    isAlternate: false,
    tier: 7
  },
  cooling_system: {
    id: 'cooling_system',
    name: 'Cooling System',
    buildingType: 'blender',
    craftTime: 10,
    inputs: [io('heat_sink', 2, 10), io('rubber', 2, 10), io('water', 5, 10), io('nitrogen_gas', 25, 10)],
    outputs: [io('cooling_system', 1, 10)],
    isAlternate: false,
    tier: 8
  },
  fused_modular_frame: {
    id: 'fused_modular_frame',
    name: 'Fused Modular Frame',
    buildingType: 'blender',
    craftTime: 40,
    inputs: [io('heavy_modular_frame', 1, 40), io('aluminum_casing', 50, 40), io('nitrogen_gas', 25, 40)],
    outputs: [io('fused_modular_frame', 1, 40)],
    isAlternate: false,
    tier: 8
  },
  encased_uranium_cell: {
    id: 'encased_uranium_cell',
    name: 'Encased Uranium Cell',
    buildingType: 'blender',
    craftTime: 12,
    inputs: [io('uranium', 10, 12), io('concrete', 3, 12), io('sulfuric_acid', 8, 12)],
    outputs: [io('encased_uranium_cell', 5, 12), io('sulfuric_acid', 2, 12)],
    isAlternate: false,
    tier: 8
  },
  nitric_acid: {
    id: 'nitric_acid',
    name: 'Nitric Acid',
    buildingType: 'blender',
    craftTime: 6,
    inputs: [io('nitrogen_gas', 12, 6), io('water', 3, 6), io('iron_plate', 1, 6)],
    outputs: [io('nitric_acid', 3, 6)],
    isAlternate: false,
    tier: 8
  },
  non_fissile_uranium: {
    id: 'non_fissile_uranium',
    name: 'Non-Fissile Uranium',
    buildingType: 'blender',
    craftTime: 24,
    inputs: [io('uranium_waste', 15, 24), io('silica', 10, 24), io('nitric_acid', 6, 24), io('sulfuric_acid', 6, 24)],
    outputs: [io('non_fissile_uranium', 20, 24), io('water', 6, 24)],
    isAlternate: false,
    tier: 8
  },
  rocket_fuel: {
    id: 'rocket_fuel',
    name: 'Rocket Fuel',
    buildingType: 'blender',
    craftTime: 6,
    inputs: [io('turbofuel', 6, 6), io('nitric_acid', 1, 6)],
    outputs: [io('rocket_fuel', 10, 6), io('compacted_coal', 1, 6)],
    isAlternate: false,
    tier: 8
  },
  // Blender Alternates
  diluted_fuel: {
    id: 'diluted_fuel',
    name: 'Diluted Fuel',
    buildingType: 'blender',
    craftTime: 6,
    inputs: [io('heavy_oil_residue', 5, 6), io('water', 10, 6)],
    outputs: [io('fuel', 10, 6)],
    isAlternate: true,
    tier: 5
  },
  cooling_device: {
    id: 'cooling_device',
    name: 'Cooling Device',
    buildingType: 'blender',
    craftTime: 24,
    inputs: [io('heat_sink', 4, 24), io('motor', 1, 24), io('nitrogen_gas', 24, 24)],
    outputs: [io('cooling_system', 2, 24)],
    isAlternate: true,
    tier: 8
  },
  heat_fused_frame: {
    id: 'heat_fused_frame',
    name: 'Heat-Fused Frame',
    buildingType: 'blender',
    craftTime: 20,
    inputs: [io('heavy_modular_frame', 1, 20), io('aluminum_ingot', 50, 20), io('nitric_acid', 8, 20), io('fuel', 10, 20)],
    outputs: [io('fused_modular_frame', 1, 20)],
    isAlternate: true,
    tier: 8
  },
  instant_scrap: {
    id: 'instant_scrap',
    name: 'Instant Scrap',
    buildingType: 'blender',
    craftTime: 6,
    inputs: [io('bauxite', 15, 6), io('coal', 10, 6), io('sulfuric_acid', 5, 6), io('water', 6, 6)],
    outputs: [io('aluminum_scrap', 30, 6), io('water', 5, 6)],
    isAlternate: true,
    tier: 7
  },
  turbo_blend_fuel: {
    id: 'turbo_blend_fuel',
    name: 'Turbo Blend Fuel',
    buildingType: 'blender',
    craftTime: 8,
    inputs: [io('fuel', 2, 8), io('heavy_oil_residue', 4, 8), io('sulfur', 3, 8), io('petroleum_coke', 3, 8)],
    outputs: [io('turbofuel', 6, 8)],
    isAlternate: true,
    tier: 5
  },
  nitro_rocket_fuel: {
    id: 'nitro_rocket_fuel',
    name: 'Nitro Rocket Fuel',
    buildingType: 'blender',
    craftTime: 2.4,
    inputs: [io('fuel', 4, 2.4), io('nitrogen_gas', 3, 2.4), io('sulfur', 4, 2.4), io('coal', 2, 2.4)],
    outputs: [io('rocket_fuel', 6, 2.4), io('compacted_coal', 1, 2.4)],
    isAlternate: true,
    tier: 8
  },
  fertile_uranium: {
    id: 'fertile_uranium',
    name: 'Fertile Uranium',
    buildingType: 'blender',
    craftTime: 12,
    inputs: [io('uranium', 5, 12), io('uranium_waste', 5, 12), io('nitric_acid', 3, 12), io('sulfuric_acid', 5, 12)],
    outputs: [io('non_fissile_uranium', 20, 12), io('water', 8, 12)],
    isAlternate: true,
    tier: 8
  },
  classic_battery: {
    id: 'classic_battery',
    name: 'Classic Battery',
    buildingType: 'manufacturer',
    craftTime: 8,
    inputs: [io('sulfur', 6, 8), io('alclad_aluminum_sheet', 7, 8), io('plastic', 8, 8), io('wire', 12, 8)],
    outputs: [io('battery', 4, 8)],
    isAlternate: true,
    tier: 7
  },

  // ============================================
  // PARTICLE ACCELERATOR RECIPES
  // ============================================
  nuclear_pasta: {
    id: 'nuclear_pasta',
    name: 'Nuclear Pasta',
    buildingType: 'particle_accelerator',
    craftTime: 120,
    inputs: [io('copper_powder', 200, 120), io('pressure_conversion_cube', 1, 120)],
    outputs: [io('nuclear_pasta', 1, 120)],
    isAlternate: false,
    tier: 8,
    powerConsumption: 500,
    powerConsumptionMax: 1500
  },
  plutonium_pellet: {
    id: 'plutonium_pellet',
    name: 'Plutonium Pellet',
    buildingType: 'particle_accelerator',
    craftTime: 60,
    inputs: [io('non_fissile_uranium', 100, 60), io('uranium_waste', 25, 60)],
    outputs: [io('plutonium_pellet', 30, 60)],
    isAlternate: false,
    tier: 8,
    powerConsumption: 250,
    powerConsumptionMax: 750
  },
  diamonds: {
    id: 'diamonds',
    name: 'Diamonds',
    buildingType: 'particle_accelerator',
    craftTime: 2,
    inputs: [io('coal', 20, 2)],
    outputs: [io('diamond', 1, 2)],
    isAlternate: false,
    tier: 8,
    powerConsumption: 250,
    powerConsumptionMax: 750
  },
  dark_matter_crystal: {
    id: 'dark_matter_crystal',
    name: 'Dark Matter Crystal',
    buildingType: 'particle_accelerator',
    craftTime: 2,
    inputs: [io('diamond', 1, 2)],
    outputs: [io('dark_matter_crystal', 1, 2)],
    isAlternate: false,
    tier: 9,
    powerConsumption: 500,
    powerConsumptionMax: 1500
  },
  ficsonium: {
    id: 'ficsonium',
    name: 'Ficsonium',
    buildingType: 'particle_accelerator',
    craftTime: 6,
    inputs: [io('plutonium_waste', 1, 6), io('singularity_cell', 1, 6), io('dark_matter_residue', 20, 6)],
    outputs: [io('ficsonium', 1, 6)],
    isAlternate: false,
    tier: 9,
    powerConsumption: 500,
    powerConsumptionMax: 1500
  },
  // Particle Accelerator Alternates
  cloudy_diamonds: {
    id: 'cloudy_diamonds',
    name: 'Cloudy Diamonds',
    buildingType: 'particle_accelerator',
    craftTime: 3,
    inputs: [io('coal', 12, 3), io('limestone', 24, 3)],
    outputs: [io('diamond', 1, 3)],
    isAlternate: true,
    tier: 8,
    powerConsumption: 250,
    powerConsumptionMax: 750
  },
  oil_based_diamonds: {
    id: 'oil_based_diamonds',
    name: 'Oil-Based Diamonds',
    buildingType: 'particle_accelerator',
    craftTime: 3,
    inputs: [io('crude_oil', 10, 3)],
    outputs: [io('diamond', 2, 3)],
    isAlternate: true,
    tier: 8,
    powerConsumption: 250,
    powerConsumptionMax: 750
  },
  petroleum_diamonds: {
    id: 'petroleum_diamonds',
    name: 'Petroleum Diamonds',
    buildingType: 'particle_accelerator',
    craftTime: 2,
    inputs: [io('petroleum_coke', 24, 2)],
    outputs: [io('diamond', 1, 2)],
    isAlternate: true,
    tier: 8,
    powerConsumption: 250,
    powerConsumptionMax: 750
  },
  turbo_diamonds: {
    id: 'turbo_diamonds',
    name: 'Turbo Diamonds',
    buildingType: 'particle_accelerator',
    craftTime: 3,
    inputs: [io('coal', 30, 3), io('packaged_turbofuel', 2, 3)],
    outputs: [io('diamond', 3, 3)],
    isAlternate: true,
    tier: 8,
    powerConsumption: 250,
    powerConsumptionMax: 750
  }
};

// Helper function to get recipes by building type
export function getRecipesByBuilding(buildingType: BuildingType): Recipe[] {
  return Object.values(RECIPES).filter(recipe => recipe.buildingType === buildingType);
}

// Helper function to get standard recipes only
export function getStandardRecipes(): Recipe[] {
  return Object.values(RECIPES).filter(recipe => !recipe.isAlternate);
}

// Helper function to get alternate recipes only
export function getAlternateRecipes(): Recipe[] {
  return Object.values(RECIPES).filter(recipe => recipe.isAlternate);
}

// Helper function to get recipe by ID
export function getRecipe(recipeId: string): Recipe | undefined {
  return RECIPES[recipeId];
}

// Helper function to find recipes that produce a specific item
export function getRecipesProducingItem(itemId: string): Recipe[] {
  return Object.values(RECIPES).filter(recipe =>
    recipe.outputs.some(output => output.itemId === itemId)
  );
}

// Helper function to find recipes that consume a specific item
export function getRecipesConsumingItem(itemId: string): Recipe[] {
  return Object.values(RECIPES).filter(recipe =>
    recipe.inputs.some(input => input.itemId === itemId)
  );
}

// Export recipe count for reference
export const RECIPE_COUNT = Object.keys(RECIPES).length;

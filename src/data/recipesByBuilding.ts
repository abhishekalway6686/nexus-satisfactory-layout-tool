// src/data/recipesByBuilding.ts
// Index helper for quick recipe lookup by building type

import { RECIPES, Recipe, BuildingType } from './recipes';

// Pre-computed index of recipes by building type for O(1) lookup
const recipesByBuildingIndex: Record<BuildingType, Recipe[]> = {
  smelter: [],
  foundry: [],
  constructor: [],
  assembler: [],
  manufacturer: [],
  refinery: [],
  blender: [],
  packager: [],
  particle_accelerator: [],
  quantum_encoder: [],
  converter: []
};

// Build the index on module load
Object.values(RECIPES).forEach(recipe => {
  recipesByBuildingIndex[recipe.buildingType].push(recipe);
});

/**
 * Get all recipes available for a specific building type
 * Uses pre-computed index for O(1) lookup
 */
export function getRecipesForBuilding(buildingType: BuildingType): Recipe[] {
  return recipesByBuildingIndex[buildingType] || [];
}

/**
 * Get standard (non-alternate) recipes for a building type
 */
export function getStandardRecipesForBuilding(buildingType: BuildingType): Recipe[] {
  return recipesByBuildingIndex[buildingType].filter(r => !r.isAlternate);
}

/**
 * Get alternate recipes for a building type
 */
export function getAlternateRecipesForBuilding(buildingType: BuildingType): Recipe[] {
  return recipesByBuildingIndex[buildingType].filter(r => r.isAlternate);
}

/**
 * Get the count of recipes for each building type
 */
export function getRecipeCountByBuilding(): Record<BuildingType, { total: number; standard: number; alternate: number }> {
  const counts = {} as Record<BuildingType, { total: number; standard: number; alternate: number }>;

  for (const buildingType of Object.keys(recipesByBuildingIndex) as BuildingType[]) {
    const recipes = recipesByBuildingIndex[buildingType];
    counts[buildingType] = {
      total: recipes.length,
      standard: recipes.filter(r => !r.isAlternate).length,
      alternate: recipes.filter(r => r.isAlternate).length
    };
  }

  return counts;
}

/**
 * Map from layout tool building types to recipe building types
 * This maps the building IDs used in the layout tool to the recipe system
 */
export const BUILDING_TYPE_TO_RECIPE_TYPE: Record<string, BuildingType | null> = {
  // Production buildings
  constructor: 'constructor',
  assembler: 'assembler',
  manufacturer: 'manufacturer',
  smelter: 'smelter',
  foundry: 'foundry',
  refinery: 'refinery',
  blender: 'blender',
  packager: 'packager',
  particle_accelerator: 'particle_accelerator',
  quantum_encoder: 'quantum_encoder',
  converter: 'converter',

  // Extraction buildings (special handling - use extractedResourceId instead of recipes)
  miner_mk1: null,
  miner_mk2: null,
  miner_mk3: null,
  water_extractor: null,
  oil_extractor: null,
  resource_well_pressurizer: null,
  resource_well_extractor: null,
  biomass_burner: null,
  coal_generator: null,
  fuel_generator: null,
  nuclear_power_plant: null,
  geothermal_generator: null,
  power_storage: null,
  splitter: null,
  smart_splitter: null,
  programmable_splitter: null,
  merger: null,
  pipeline_junction: null,
  pipeline_pump: null,
  valve: null,
  storage: null,
  industrial_storage: null,
  fluid_buffer: null,
  industrial_fluid_buffer: null,
  train_station: null,
  freight_platform: null,
  fluid_freight_platform: null,
  truck_station: null,
  drone_port: null,
  hub: null,
  mam: null,
  space_elevator: null,
  awesome_sink: null,
  craft_bench: null,
  equipment_workshop: null
};

/**
 * Check if a building type supports recipes
 */
export function buildingSupportsRecipes(buildingType: string): boolean {
  return BUILDING_TYPE_TO_RECIPE_TYPE[buildingType] !== null &&
         BUILDING_TYPE_TO_RECIPE_TYPE[buildingType] !== undefined;
}

/**
 * Get the recipe building type for a layout tool building type
 */
export function getRecipeBuildingType(layoutBuildingType: string): BuildingType | null {
  return BUILDING_TYPE_TO_RECIPE_TYPE[layoutBuildingType] ?? null;
}

/**
 * Get available recipes for a layout tool building
 */
export function getAvailableRecipesForLayoutBuilding(layoutBuildingType: string): Recipe[] {
  const recipeBuildingType = getRecipeBuildingType(layoutBuildingType);
  if (!recipeBuildingType) {
    return [];
  }
  return getRecipesForBuilding(recipeBuildingType);
}

// Export the pre-built index for direct access if needed
export { recipesByBuildingIndex };

// ============================================
// EXTRACTION BUILDING TYPES
// ============================================

/**
 * Extraction building type definitions with output rates
 */
export type ExtractorType = 'miner' | 'water_extractor' | 'oil_extractor' | 'resource_well_extractor';

export interface ExtractorInfo {
  type: ExtractorType;
  tier?: number; // For miners: 1, 2, 3
  baseOutputRate: number; // Items/min or m³/min at 100% clock speed
  isFluid: boolean;
  defaultResource?: string; // Default resource ID for this extractor
  allowedResources: string[]; // Resource IDs this extractor can extract
}

/**
 * Miner output rates by tier (items/min at normal node purity)
 * Note: In game, actual rates depend on node purity (impure: 30/60/120, normal: 60/120/240, pure: 120/240/480)
 * We use normal node rates as default
 */
export const MINER_OUTPUT_RATES: Record<number, number> = {
  1: 60,   // Mk.1 Miner
  2: 120,  // Mk.2 Miner
  3: 240,  // Mk.3 Miner
};

/**
 * Extractor output rates (m³/min at 100% clock speed)
 */
export const EXTRACTOR_OUTPUT_RATES: Record<string, number> = {
  water_extractor: 120,        // 120 m³/min water
  oil_extractor: 120,          // 120 m³/min crude oil (varies by node)
  resource_well_extractor: 60, // 60 m³/min (varies by resource)
};

/**
 * Map of building types to their extractor info
 */
export const EXTRACTOR_BUILDINGS: Record<string, ExtractorInfo> = {
  miner_mk1: {
    type: 'miner',
    tier: 1,
    baseOutputRate: 60,
    isFluid: false,
    allowedResources: ['iron_ore', 'copper_ore', 'limestone', 'coal', 'caterium_ore', 'raw_quartz', 'sulfur', 'bauxite', 'uranium', 'sam'],
  },
  miner_mk2: {
    type: 'miner',
    tier: 2,
    baseOutputRate: 120,
    isFluid: false,
    allowedResources: ['iron_ore', 'copper_ore', 'limestone', 'coal', 'caterium_ore', 'raw_quartz', 'sulfur', 'bauxite', 'uranium', 'sam'],
  },
  miner_mk3: {
    type: 'miner',
    tier: 3,
    baseOutputRate: 240,
    isFluid: false,
    allowedResources: ['iron_ore', 'copper_ore', 'limestone', 'coal', 'caterium_ore', 'raw_quartz', 'sulfur', 'bauxite', 'uranium', 'sam'],
  },
  water_extractor: {
    type: 'water_extractor',
    baseOutputRate: 120,
    isFluid: true,
    defaultResource: 'water',
    allowedResources: ['water'],
  },
  oil_extractor: {
    type: 'oil_extractor',
    baseOutputRate: 120,
    isFluid: true,
    defaultResource: 'crude_oil',
    allowedResources: ['crude_oil'],
  },
  resource_well_extractor: {
    type: 'resource_well_extractor',
    baseOutputRate: 60,
    isFluid: true,
    allowedResources: ['water', 'crude_oil', 'nitrogen_gas'],
  },
};

/**
 * Check if a building type is an extraction building (miner or extractor)
 */
export function isExtractionBuilding(buildingType: string): boolean {
  return buildingType in EXTRACTOR_BUILDINGS;
}

/**
 * Get extractor info for a building type
 */
export function getExtractorInfo(buildingType: string): ExtractorInfo | null {
  return EXTRACTOR_BUILDINGS[buildingType] ?? null;
}

/**
 * Get the output rate for an extraction building at a given clock speed
 * @param buildingType The building type (e.g., 'miner_mk1', 'water_extractor')
 * @param clockSpeed Clock speed percentage (1-250, default 100)
 * @returns Output rate in items/min or m³/min
 */
export function getExtractorOutputRate(buildingType: string, clockSpeed: number = 100): number {
  const info = EXTRACTOR_BUILDINGS[buildingType];
  if (!info) return 0;

  // Apply clock speed modifier
  return info.baseOutputRate * (clockSpeed / 100);
}

/**
 * Get the default resource for an extraction building
 * Returns null for miners (user must select)
 */
export function getDefaultExtractedResource(buildingType: string): string | null {
  const info = EXTRACTOR_BUILDINGS[buildingType];
  return info?.defaultResource ?? null;
}

/**
 * Get allowed resources for an extraction building
 */
export function getAllowedResources(buildingType: string): string[] {
  const info = EXTRACTOR_BUILDINGS[buildingType];
  return info?.allowedResources ?? [];
}

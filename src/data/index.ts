// src/data/index.ts
// Barrel export for all data modules

// Items
export {
  ITEMS,
  ITEM_COUNT,
  getItemsByCategory,
  getFluidItems,
  getSolidItems,
  getItem,
  type Item,
  type ItemCategory
} from './items';

// Recipes
export {
  RECIPES,
  RECIPE_COUNT,
  getRecipesByBuilding,
  getStandardRecipes,
  getAlternateRecipes,
  getRecipe,
  getRecipesProducingItem,
  getRecipesConsumingItem,
  type Recipe,
  type RecipeIO,
  type BuildingType
} from './recipes';

// Recipes by Building Index
export {
  getRecipesForBuilding,
  getStandardRecipesForBuilding,
  getAlternateRecipesForBuilding,
  getRecipeCountByBuilding,
  buildingSupportsRecipes,
  getRecipeBuildingType,
  getAvailableRecipesForLayoutBuilding,
  BUILDING_TYPE_TO_RECIPE_TYPE,
  recipesByBuildingIndex
} from './recipesByBuilding';

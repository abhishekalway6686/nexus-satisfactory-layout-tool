// src/components/UI/RecipeDropdown.tsx
// Recipe selection dropdown for production buildings

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Clock, ArrowRight, FlaskConical, Sparkles } from 'lucide-react';
import { getAvailableRecipesForLayoutBuilding } from '../../data/recipesByBuilding';
import { Recipe } from '../../data/recipes';
import { ITEMS } from '../../data/items';

interface RecipeDropdownProps {
  buildingType: string;
  selectedRecipeId: string | null;
  onSelect: (recipeId: string | null) => void;
  disabled?: boolean;
}

interface RecipeItemProps {
  recipe: Recipe;
  isSelected: boolean;
  onSelect: () => void;
  showDetails?: boolean;
}

// Format rate for display (e.g., "30/min")
function formatRate(rate: number): string {
  if (rate >= 1) {
    return `${rate % 1 === 0 ? rate : rate.toFixed(1)}/min`;
  }
  return `${rate.toFixed(2)}/min`;
}

// Get item name from ID
function getItemName(itemId: string): string {
  const item = ITEMS[itemId];
  return item?.name || itemId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Recipe item component with hover details
const RecipeItem: React.FC<RecipeItemProps> = ({ recipe, isSelected, onSelect, showDetails = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-green-500/20 border-l-2 border-green-400'
          : 'hover:bg-slate-700/50 border-l-2 border-transparent'
      }`}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${isSelected ? 'text-green-300 font-medium' : 'text-slate-200'}`}>
            {recipe.name}
          </span>
          {recipe.isAlternate && (
            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/30 text-purple-300 rounded">
              ALT
            </span>
          )}
        </div>

        {/* Show details on hover or if expanded */}
        {(isHovered || showDetails) && (
          <div className="mt-2 text-xs space-y-1.5 border-t border-slate-600/50 pt-2">
            {/* Craft time */}
            <div className="flex items-center gap-1 text-slate-400">
              <Clock size={10} />
              <span>{recipe.craftTime}s cycle</span>
            </div>

            {/* Inputs */}
            <div className="space-y-0.5">
              <div className="text-slate-500 font-medium">Inputs:</div>
              {recipe.inputs.map((input, idx) => (
                <div key={idx} className="flex items-center justify-between text-orange-300 pl-2">
                  <span>{getItemName(input.itemId)}</span>
                  <span className="text-orange-400 font-mono">{formatRate(input.ratePerMinute)}</span>
                </div>
              ))}
            </div>

            {/* Outputs */}
            <div className="space-y-0.5">
              <div className="text-slate-500 font-medium">Outputs:</div>
              {recipe.outputs.map((output, idx) => (
                <div key={idx} className="flex items-center justify-between text-green-300 pl-2">
                  <span>{getItemName(output.itemId)}</span>
                  <span className="text-green-400 font-mono">{formatRate(output.ratePerMinute)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function RecipeDropdown({
  buildingType,
  selectedRecipeId,
  onSelect,
  disabled = false
}: RecipeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandAlternates, setExpandAlternates] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get available recipes for this building type
  const recipes = useMemo(() => {
    return getAvailableRecipesForLayoutBuilding(buildingType);
  }, [buildingType]);

  // Separate standard and alternate recipes
  const { standardRecipes, alternateRecipes } = useMemo(() => {
    const standard = recipes.filter(r => !r.isAlternate);
    const alternate = recipes.filter(r => r.isAlternate);
    return { standardRecipes: standard, alternateRecipes: alternate };
  }, [recipes]);

  // Get selected recipe details
  const selectedRecipe = useMemo(() => {
    if (!selectedRecipeId) return null;
    return recipes.find(r => r.id === selectedRecipeId) || null;
  }, [selectedRecipeId, recipes]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle recipe selection
  const handleSelect = (recipeId: string) => {
    onSelect(recipeId);
    setIsOpen(false);
  };

  // Handle clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setIsOpen(false);
  };

  // If no recipes available, show message
  if (recipes.length === 0) {
    return (
      <div className="glass-panel p-3 bg-slate-500/10 border-slate-400/20">
        <div className="text-sm text-slate-400 text-center">
          No recipes available for this building
        </div>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Dropdown trigger button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full sci-fi-button flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : isOpen
              ? 'border-green-400/60 bg-green-500/10'
              : 'border-green-400/30 bg-green-500/5 hover:border-green-400/50'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FlaskConical size={16} className="text-green-400 flex-shrink-0" />
          <span className={`truncate ${selectedRecipe ? 'text-green-300' : 'text-slate-400'}`}>
            {selectedRecipe ? selectedRecipe.name : 'Select a recipe...'}
          </span>
          {selectedRecipe?.isAlternate && (
            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/30 text-purple-300 rounded flex-shrink-0">
              ALT
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 rounded-lg border border-green-400/50 shadow-2xl max-h-80 overflow-y-auto" style={{ backgroundColor: '#0a0d12' }}>
          {/* Clear selection option */}
          {selectedRecipeId && (
            <div
              className="px-3 py-2 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer border-b border-slate-600/30 flex items-center gap-2"
              onClick={handleClear}
            >
              <span className="text-red-400">x</span>
              <span>Clear selection</span>
            </div>
          )}

          {/* Standard recipes section */}
          {standardRecipes.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-700/30 sticky top-0">
                Standard Recipes ({standardRecipes.length})
              </div>
              {standardRecipes.map(recipe => (
                <RecipeItem
                  key={recipe.id}
                  recipe={recipe}
                  isSelected={selectedRecipeId === recipe.id}
                  onSelect={() => handleSelect(recipe.id)}
                />
              ))}
            </div>
          )}

          {/* Alternate recipes section */}
          {alternateRecipes.length > 0 && (
            <div>
              <div
                className="px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-500/10 sticky top-0 flex items-center justify-between cursor-pointer hover:bg-purple-500/20"
                onClick={() => setExpandAlternates(!expandAlternates)}
              >
                <div className="flex items-center gap-1">
                  <Sparkles size={12} />
                  <span>Alternate Recipes ({alternateRecipes.length})</span>
                </div>
                <ChevronRight
                  size={14}
                  className={`transition-transform ${expandAlternates ? 'rotate-90' : ''}`}
                />
              </div>
              {expandAlternates && alternateRecipes.map(recipe => (
                <RecipeItem
                  key={recipe.id}
                  recipe={recipe}
                  isSelected={selectedRecipeId === recipe.id}
                  onSelect={() => handleSelect(recipe.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Recipe details component for showing full recipe info in properties panel
interface RecipeDetailsProps {
  recipe: Recipe;
  clockSpeed?: number;
}

export function RecipeDetails({ recipe, clockSpeed = 100 }: RecipeDetailsProps) {
  const effectiveMultiplier = clockSpeed / 100;

  return (
    <div className="space-y-4">
      {/* Craft time */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400 flex items-center gap-1">
          <Clock size={14} />
          Craft Time:
        </span>
        <span className="text-slate-200 font-mono">{recipe.craftTime}s</span>
      </div>

      {/* Inputs */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-orange-300 flex items-center gap-1">
          <ArrowRight size={14} className="rotate-180" />
          Inputs
        </div>
        <div className="space-y-1.5">
          {recipe.inputs.map((input, idx) => {
            const effectiveRate = input.ratePerMinute * effectiveMultiplier;
            return (
              <div
                key={idx}
                className="glass-panel p-2 bg-orange-500/5 border-orange-400/20 flex items-center justify-between"
              >
                <span className="text-sm text-slate-200">{getItemName(input.itemId)}</span>
                <div className="text-right">
                  <div className="text-sm font-mono text-orange-300">
                    {formatRate(effectiveRate)}
                  </div>
                  {clockSpeed !== 100 && (
                    <div className="text-xs text-slate-500">
                      (base: {formatRate(input.ratePerMinute)})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outputs */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-green-300 flex items-center gap-1">
          <ArrowRight size={14} />
          Outputs
        </div>
        <div className="space-y-1.5">
          {recipe.outputs.map((output, idx) => {
            const effectiveRate = output.ratePerMinute * effectiveMultiplier;
            return (
              <div
                key={idx}
                className="glass-panel p-2 bg-green-500/5 border-green-400/20 flex items-center justify-between"
              >
                <span className="text-sm text-slate-200">{getItemName(output.itemId)}</span>
                <div className="text-right">
                  <div className="text-sm font-mono text-green-300">
                    {formatRate(effectiveRate)}
                  </div>
                  {clockSpeed !== 100 && (
                    <div className="text-xs text-slate-500">
                      (base: {formatRate(output.ratePerMinute)})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Power consumption if applicable */}
      {recipe.powerConsumption && (
        <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-600/30">
          <span className="text-slate-400">Power:</span>
          <span className="text-yellow-300 font-mono">
            {(recipe.powerConsumption * effectiveMultiplier).toFixed(1)} MW
            {recipe.powerConsumptionMax && ` - ${(recipe.powerConsumptionMax * effectiveMultiplier).toFixed(1)} MW`}
          </span>
        </div>
      )}
    </div>
  );
}

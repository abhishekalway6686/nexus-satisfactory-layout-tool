// src/components/UI/StationResourceSelector.tsx
// Component for configuring train station incoming resources

import React, { useState, useMemo, useCallback } from 'react';
import { Search, Train, Droplet, Package, ChevronDown, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { ITEMS, getFluidItems, getSolidItems, Item } from '../../data/items';
import { StationResourceConfig } from '../../types';

interface StationResourceSelectorProps {
  /** Building type for context */
  buildingType: string;
  /** Current configuration (null if not configured) */
  currentConfig: StationResourceConfig | null;
  /** Callback when configuration changes */
  onConfigChange: (config: StationResourceConfig | null) => void;
}

// Common transport rates for quick selection
const COMMON_RATES = {
  solid: [60, 120, 270, 480, 780, 1200],
  fluid: [150, 300, 450, 600],
};

export default function StationResourceSelector({
  buildingType,
  currentConfig,
  onConfigChange,
}: StationResourceSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFluids, setShowFluids] = useState(buildingType.includes('fluid'));

  // Get appropriate items based on building type
  const availableItems = useMemo(() => {
    // Fluid freight platform can only handle fluids
    if (buildingType === 'fluid_freight_platform') {
      return getFluidItems();
    }
    // Regular freight platform handles solids
    if (buildingType === 'freight_platform') {
      return getSolidItems();
    }
    // Train station can theoretically have both (for planning)
    return showFluids ? getFluidItems() : getSolidItems();
  }, [buildingType, showFluids]);

  // Filter items by search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return availableItems;
    const term = searchTerm.toLowerCase();
    return availableItems.filter(
      item => item.name.toLowerCase().includes(term) || item.id.toLowerCase().includes(term)
    );
  }, [availableItems, searchTerm]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, Item[]> = {};
    for (const item of filteredItems) {
      const category = item.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    }
    return groups;
  }, [filteredItems]);

  // Handle item selection
  const handleSelectItem = useCallback((item: Item) => {
    const defaultRate = item.isFluid ? 300 : 480; // Mk.2 pipe or Mk.4 belt
    onConfigChange({
      resourceId: item.id,
      isFluid: item.isFluid,
      rate: defaultRate,
      enabled: true,
    });
    setIsDropdownOpen(false);
    setSearchTerm('');
  }, [onConfigChange]);

  // Handle rate change
  const handleRateChange = useCallback((rate: number) => {
    if (!currentConfig) return;
    onConfigChange({
      ...currentConfig,
      rate: Math.max(0, Math.min(rate, 10000)),
    });
  }, [currentConfig, onConfigChange]);

  // Handle toggle enabled
  const handleToggleEnabled = useCallback(() => {
    if (!currentConfig) return;
    onConfigChange({
      ...currentConfig,
      enabled: !currentConfig.enabled,
    });
  }, [currentConfig, onConfigChange]);

  // Handle clear configuration
  const handleClear = useCallback(() => {
    onConfigChange(null);
  }, [onConfigChange]);

  // Get current item details
  const currentItem = currentConfig ? ITEMS[currentConfig.resourceId] : null;

  // Format category name for display
  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const canToggleFluidMode = buildingType === 'train_station';
  const isFluidPlatform = buildingType === 'fluid_freight_platform';

  return (
    <div className="space-y-3">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
          <Train size={16} />
          Incoming Resource
        </div>
        {currentConfig && (
          <button
            onClick={handleToggleEnabled}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              currentConfig.enabled
                ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
            }`}
          >
            {currentConfig.enabled ? (
              <>
                <ToggleRight size={14} />
                Active
              </>
            ) : (
              <>
                <ToggleLeft size={14} />
                Disabled
              </>
            )}
          </button>
        )}
      </div>

      {/* Resource Selection Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            currentItem
              ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-100'
              : 'bg-slate-800/50 border-slate-600/30 text-slate-300 hover:border-slate-500/50'
          }`}
        >
          <div className="flex items-center gap-3">
            {currentItem ? (
              <>
                {currentItem.isFluid ? (
                  <Droplet size={18} className="text-blue-400" />
                ) : (
                  <Package size={18} className="text-orange-400" />
                )}
                <div className="text-left">
                  <div className="font-medium">{currentItem.name}</div>
                  <div className="text-xs text-slate-400">
                    {formatCategory(currentItem.category)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-5 h-5 rounded border border-dashed border-slate-500 flex items-center justify-center text-slate-500">
                  ?
                </div>
                <span className="text-slate-400">Select incoming resource...</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentItem && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
              >
                <X size={16} />
              </button>
            )}
            <ChevronDown
              size={18}
              className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* Dropdown Content */}
        {isDropdownOpen && (
          <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
            {/* Search and Filter */}
            <div className="p-2 border-b border-slate-700 space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
              </div>

              {/* Fluid/Solid Toggle (for train stations only) */}
              {canToggleFluidMode && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowFluids(false)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      !showFluids
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Package size={14} />
                    Solids
                  </button>
                  <button
                    onClick={() => setShowFluids(true)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      showFluids
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Droplet size={14} />
                    Fluids
                  </button>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="overflow-y-auto max-h-52">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-800/50 sticky top-0">
                    {formatCategory(category)}
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800 text-left transition-colors"
                    >
                      {item.isFluid ? (
                        <Droplet size={14} className="text-blue-400 flex-shrink-0" />
                      ) : (
                        <Package size={14} className="text-orange-400 flex-shrink-0" />
                      )}
                      <span className="text-sm text-slate-200">{item.name}</span>
                    </button>
                  ))}
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  No items found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rate Configuration (shown when item is selected) */}
      {currentConfig && currentItem && (
        <div className="space-y-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Input Rate</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={currentConfig.rate}
                onChange={(e) => handleRateChange(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-right text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                min={0}
                max={10000}
                step={currentItem.isFluid ? 0.1 : 1}
              />
              <span className="text-xs text-slate-400">
                {currentItem.isFluid ? 'm³/min' : '/min'}
              </span>
            </div>
          </div>

          {/* Quick Rate Buttons */}
          <div className="flex flex-wrap gap-1">
            {(currentItem.isFluid ? COMMON_RATES.fluid : COMMON_RATES.solid).map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentConfig.rate === rate
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/30 hover:bg-slate-700'
                }`}
              >
                {rate}
              </button>
            ))}
          </div>

          {/* Info */}
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">
            {currentItem.isFluid ? (
              <p>Configure the rate at which {currentItem.name.toLowerCase()} arrives via trains to be used in your production line.</p>
            ) : (
              <p>Configure the rate at which {currentItem.name.toLowerCase()} arrives via trains to feed your production buildings.</p>
            )}
          </div>
        </div>
      )}

      {/* Not configured state */}
      {!currentConfig && (
        <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 text-center">
          <p className="text-xs text-slate-500">
            {isFluidPlatform
              ? 'Configure this platform as a fluid source for production calculations.'
              : 'Configure this platform as a material source for production calculations.'}
          </p>
        </div>
      )}
    </div>
  );
}

// Details component for showing configured resource info
export function StationResourceDetails({ config }: { config: StationResourceConfig }) {
  const item = ITEMS[config.resourceId];
  if (!item) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {item.isFluid ? (
            <Droplet size={14} className="text-blue-400" />
          ) : (
            <Package size={14} className="text-orange-400" />
          )}
          <span className="text-sm font-medium text-slate-200">{item.name}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${
          config.enabled
            ? 'bg-green-500/20 text-green-300'
            : 'bg-slate-700/50 text-slate-400'
        }`}>
          {config.enabled ? 'Active' : 'Disabled'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-800/50 rounded p-2">
          <div className="text-slate-500">Input Rate</div>
          <div className="text-cyan-300 font-mono">
            {config.rate} {item.isFluid ? 'm³/min' : '/min'}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded p-2">
          <div className="text-slate-500">Type</div>
          <div className="text-slate-200">
            {item.isFluid ? 'Fluid' : 'Solid'}
          </div>
        </div>
      </div>
    </div>
  );
}

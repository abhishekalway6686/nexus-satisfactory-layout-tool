// src/components/UI/ResourceSelector.tsx
// Resource selection dropdown for extraction buildings (miners, extractors)

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Pickaxe, Droplets, Zap } from 'lucide-react';
import { ITEMS } from '../../data/items';
import {
  getExtractorInfo,
  getExtractorOutputRate,
  getAllowedResources,
  isExtractionBuilding,
} from '../../data/recipesByBuilding';

interface ResourceSelectorProps {
  buildingType: string;
  selectedResourceId: string | null;
  clockSpeed?: number;
  onSelect: (resourceId: string | null) => void;
  disabled?: boolean;
}

// Format rate for display
function formatRate(rate: number | undefined, isFluid: boolean): string {
  if (rate === undefined || rate === null) return '0/min';
  const unit = isFluid ? 'm\u00B3/min' : '/min';
  if (rate >= 1) {
    return `${rate % 1 === 0 ? rate : rate.toFixed(1)}${unit}`;
  }
  return `${rate.toFixed(2)}${unit}`;
}

// Get item display name
function getItemName(itemId: string): string {
  const item = ITEMS[itemId];
  return item?.name || itemId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function ResourceSelector({
  buildingType,
  selectedResourceId,
  clockSpeed: _clockSpeed = 100,
  onSelect,
  disabled = false
}: ResourceSelectorProps) {
  // Note: clockSpeed is passed for API consistency but not used in dropdown UI
  void _clockSpeed;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get extractor info
  const extractorInfo = useMemo(() => getExtractorInfo(buildingType), [buildingType]);

  // Get allowed resources for this extractor
  const allowedResources = useMemo(() => {
    return getAllowedResources(buildingType);
  }, [buildingType]);

  // Get resource items with details
  const resourceOptions = useMemo(() => {
    return allowedResources.map(resourceId => {
      const item = ITEMS[resourceId];
      return {
        id: resourceId,
        name: item?.name || getItemName(resourceId),
        isFluid: item?.isFluid || false,
        category: item?.category || 'ore',
      };
    });
  }, [allowedResources]);

  // Get selected resource details
  const selectedResource = useMemo(() => {
    if (!selectedResourceId) return null;
    const item = ITEMS[selectedResourceId];
    return item ? {
      id: selectedResourceId,
      name: item.name,
      isFluid: item.isFluid,
    } : null;
  }, [selectedResourceId]);


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

  // Handle resource selection
  const handleSelect = (resourceId: string) => {
    onSelect(resourceId);
    setIsOpen(false);
  };

  // Handle clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setIsOpen(false);
  };

  // If not an extraction building, show nothing
  if (!isExtractionBuilding(buildingType)) {
    return null;
  }

  // Determine the icon based on extractor type
  const getExtractorIcon = () => {
    if (extractorInfo?.isFluid) {
      return <Droplets size={16} className="text-blue-400 flex-shrink-0" />;
    }
    return <Pickaxe size={16} className="text-orange-400 flex-shrink-0" />;
  };

  const themeColor = extractorInfo?.isFluid ? 'blue' : 'orange';

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
              ? `border-${themeColor}-400/60 bg-${themeColor}-500/10`
              : `border-${themeColor}-400/30 bg-${themeColor}-500/5 hover:border-${themeColor}-400/50`
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getExtractorIcon()}
          <span className={`truncate ${selectedResource ? `text-${themeColor}-300` : 'text-slate-400'}`}>
            {selectedResource ? selectedResource.name : 'Select a resource...'}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 rounded-lg border border-${themeColor}-400/50 shadow-2xl max-h-80 overflow-y-auto`} style={{ backgroundColor: '#0a0d12' }}>
          {/* Clear selection option */}
          {selectedResourceId && (
            <div
              className="px-3 py-2 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer border-b border-slate-600/30 flex items-center gap-2"
              onClick={handleClear}
            >
              <span className="text-red-400">x</span>
              <span>Clear selection</span>
            </div>
          )}

          {/* Resource options */}
          {resourceOptions.length > 0 ? (
            <div>
              <div className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-700/30 sticky top-0">
                Available Resources ({resourceOptions.length})
              </div>
              {resourceOptions.map(resource => (
                <div
                  key={resource.id}
                  className={`px-3 py-2 cursor-pointer transition-all duration-150 ${
                    selectedResourceId === resource.id
                      ? `bg-${themeColor}-500/20 border-l-2 border-${themeColor}-400`
                      : 'hover:bg-slate-700/50 border-l-2 border-transparent'
                  }`}
                  onClick={() => handleSelect(resource.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${selectedResourceId === resource.id ? `text-${themeColor}-300 font-medium` : 'text-slate-200'}`}>
                      {resource.name}
                    </span>
                    {resource.isFluid && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/30 text-blue-300 rounded">
                        FLUID
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm text-slate-400 text-center">
              No resources available for this extractor
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Resource extraction details component for showing full info in properties panel
interface ResourceExtractionDetailsProps {
  buildingType: string;
  resourceId: string | null;
  clockSpeed?: number;
}

export function ResourceExtractionDetails({
  buildingType,
  resourceId,
  clockSpeed = 100
}: ResourceExtractionDetailsProps) {
  const extractorInfo = getExtractorInfo(buildingType);
  const outputRate = getExtractorOutputRate(buildingType, clockSpeed);
  const resource = resourceId ? ITEMS[resourceId] : null;

  if (!extractorInfo) return null;

  const effectiveMultiplier = clockSpeed / 100;

  return (
    <div className="space-y-4">
      {/* Extractor Type */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400 flex items-center gap-1">
          {extractorInfo.isFluid ? <Droplets size={14} /> : <Pickaxe size={14} />}
          Extractor Type:
        </span>
        <span className="text-slate-200 font-medium">
          {extractorInfo.tier ? `Miner Mk.${extractorInfo.tier}` : buildingType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      </div>

      {/* Output Resource */}
      {resource ? (
        <div className={`glass-panel p-3 ${extractorInfo.isFluid ? 'bg-blue-500/5 border-blue-400/20' : 'bg-green-500/5 border-green-400/20'} flex items-center justify-between`}>
          <span className="text-sm text-slate-200">{resource.name}</span>
          <div className="text-right">
            <div className={`text-sm font-mono ${extractorInfo.isFluid ? 'text-blue-300' : 'text-green-300'}`}>
              {formatRate(outputRate, extractorInfo.isFluid)}
            </div>
            {clockSpeed !== 100 && (
              <div className="text-xs text-slate-500">
                (base: {formatRate(extractorInfo.baseOutputRate, extractorInfo.isFluid)})
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel p-3 bg-yellow-500/5 border-yellow-400/20">
          <div className="flex items-center gap-2 text-yellow-300 text-sm">
            <Zap size={14} />
            <span>No resource selected - select a resource to simulate production</span>
          </div>
        </div>
      )}

      {/* Base Output Rate Info */}
      <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-600/30">
        <span className="text-slate-400">Base Output:</span>
        <span className={`font-mono ${extractorInfo.isFluid ? 'text-blue-300' : 'text-orange-300'}`}>
          {formatRate(extractorInfo.baseOutputRate, extractorInfo.isFluid)}
        </span>
      </div>

      {/* Clock speed effect note */}
      {clockSpeed !== 100 && (
        <div className="text-xs text-slate-500 pt-1">
          Clock speed at {clockSpeed}% ({effectiveMultiplier.toFixed(2)}x multiplier)
        </div>
      )}
    </div>
  );
}

// src/components/UI/BuildingPalette.tsx - Enhanced with Building Previews

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, GripVertical, Maximize2, X, Search } from 'lucide-react';
import { useLayoutStore } from '../../store/layoutStore';
import { usePerformanceMode } from '../../hooks/usePerformanceMode';
import { BUILDING_TYPES, FOUNDATION_SIZE, FLOOR_HEIGHT } from '../../constants';
import { validateWallPlacement, isPlacementBlockedByBuildingBelow } from '../../utils/helpers';
import { Building, BuildingCategory, UTILITIES_SUBCATEGORIES } from '../../types';
import { searchBuildings, groupSearchResults, createDebouncedSearch } from '../../utils/searchOptimization';
import { detectNearbyStations, snapBuildingToStation, isTrainStation } from '../../utils/stationSnapping';
import BuildingPreview from './BuildingPreview';

// Simplified building card for low performance mode
const SimpleBuildingCard: React.FC<{
  buildingKey: string;
  building: typeof BUILDING_TYPES[string];
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onClick?: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  isMobile: boolean;
}> = ({
  buildingKey,
  building,
  onDragStart,
  onDragEnd,
  onClick,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  isMobile
}) => {
  return (
    <button
      className={`${isMobile ? 'glass-panel-solid' : 'glass-panel-desktop hover:glass-panel-solid'} p-3 text-left group relative transition-all duration-150 focus-ring flex flex-col ${
        isMobile
          ? 'cursor-default select-none min-h-[120px] active:scale-95'
          : 'cursor-grab active:cursor-grabbing min-h-[110px] hover:border-orange-400 hover:transform hover:scale-[1.02] hover:shadow-lg desktop-button'
      }`}
      draggable={!isMobile}
      onDragStart={!isMobile ? onDragStart : undefined}
      onDragEnd={!isMobile ? onDragEnd : undefined}
      onTouchStart={isMobile ? onTouchStart : undefined}
      onTouchMove={isMobile ? onTouchMove : undefined}
      onTouchEnd={isMobile ? onTouchEnd : undefined}
      onClick={!isMobile ? onClick : undefined}
      title={`${building.name}\n${building.width}×${building.height}×${building.depth}m`}
    >
      {/* Enhanced Building Preview */}
      <div className="mb-3 flex-shrink-0">
        <BuildingPreview
          buildingKey={buildingKey}
          name={building.name}
          width={building.width}
          height={building.height}
          depth={building.depth}
          color={building.color}
          category={building.category}
          connectionPoints={building.connectionPoints}
          railwayPoints={building.railwayPoints}
          isMobile={isMobile}
          enableGlowEffects={false}
        />
      </div>

      {/* Building name */}
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <div
          className={`text-slate-300 font-medium leading-tight text-center truncate px-1 ${
            isMobile ? 'text-sm' : 'text-[11px]'
          }`}
          style={{
            fontSize: building.name.length > 18 ? (isMobile ? '12px' : '10px') : undefined
          }}
          title={building.name}
        >
          {building.name}
        </div>
      </div>

      {/* Metadata */}
      <div className={`text-slate-500 ${isMobile ? 'text-xs' : 'text-[10px]'} mt-2 flex justify-between items-center flex-shrink-0`}>
        <span className="font-mono">{building.width}×{building.height}m</span>
        <div className="flex items-center gap-1">
          {building.connectionPoints.length > 0 && (
            <span>{building.connectionPoints.length}</span>
          )}
        </div>
      </div>
    </button>
  );
};

// Export default component
export default function BuildingPalette() {
  const {
    addBuilding,
    currentFloor,
    buildingPanelWidth,
    setBuildingPanelWidth,
    collapsedCategories,
    toggleCategory,
    wallSegments,
    buildings,
    gridSnappingEnabled,
    showGrid
  } = useLayoutStore();
  
  const { config, isLowPerformance } = usePerformanceMode();
  
  const [isResizing, setIsResizing] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; type: string } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  
  // Create debounced search handler for better performance
  const debouncedSearch = useMemo(() => createDebouncedSearch(100), []);

  // Monitor screen size changes
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && buildingPanelWidth > 300) {
        setBuildingPanelWidth(280);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [buildingPanelWidth, setBuildingPanelWidth]);

  // Group buildings by category (excluding sticky note and specific architectural pieces)
  const buildingsByCategory = useMemo(() => {
    const categories: Record<BuildingCategory, Array<[string, typeof BUILDING_TYPES[string]]>> = {
      production: [],
      extraction: [],
      logistics: [],
      power: [],
      storage: [],
      special: [],
      workstations: [],
      transport: [],
      infrastructure: [],
      architecture: []
    };

    // List of specific building keys to exclude from the palette (only foundation and wall pieces)
    const excludedBuildingKeys = new Set([
      'foundation',
      'foundation_2m', 
      'foundation_4m',
      'wall_1m',
      'wall_2m', 
      'wall_4m',
      'wall_8m'
    ]);

    Object.entries(BUILDING_TYPES).forEach(([buildingKey, building]) => {
      // Exclude sticky note and specific foundation/wall pieces (they're now only available through drawing tools)
      if (buildingKey !== 'sticky_note' && !excludedBuildingKeys.has(buildingKey)) {
        categories[building.category].push([buildingKey, building]);
      }
    });

    return categories;
  }, []);

  // Use optimized search with pre-built indexes for 50x faster search performance
  // The searchBuildings function uses pre-computed indexes (byName, byCategory, fuzzyIndex, ngrams)
  // to provide instant search results instead of iterating through all buildings
  const filteredBuildingsByCategory = useMemo(() => {
    if (!searchQuery.trim()) return buildingsByCategory;

    // Use the optimized search function with pre-computed indexes
    const searchResults = searchBuildings(searchQuery);
    return groupSearchResults(searchResults);
  }, [buildingsByCategory, searchQuery]);

  const categoryDisplayNames: Record<BuildingCategory, string> = {
    extraction: 'Extraction',
    production: 'Production',
    logistics: 'Logistics',
    power: 'Power',
    storage: 'Storage',
    transport: 'Transport',
    special: 'Special',
    infrastructure: 'Infrastructure',
    workstations: 'Workstations',
    architecture: 'Architecture'
  };

  // New ordering: Extraction at top, Architecture at bottom, Utilities (grouped) second-to-last
  // Categories that are NOT in the utilities group
  const mainCategoryOrder: BuildingCategory[] = [
    'extraction', 'production', 'logistics', 'power', 'storage', 'transport'
  ];

  // Track expanded state for utilities parent category
  const [isUtilitiesExpanded, setIsUtilitiesExpanded] = useState(true);

  // Subcategory display names for utilities
  const utilitiesSubcategoryNames: Record<string, string> = {
    special: 'Special',
    infrastructure: 'Infrastructure',
    workstations: 'Workstations'
  };

  // Enhanced touch handling for drag and drop
  const handleBuildingTouchStart = useCallback((e: React.TouchEvent, buildingType: string) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setIsDragging(false);
    
    const timer = setTimeout(() => {
      if (!isDragging) {
        const buildingDef = BUILDING_TYPES[buildingType];
        if (buildingDef) {
          setDragPreview({
            x: touch.clientX,
            y: touch.clientY,
            type: buildingType
          });
          setIsDragging(true);
          
          if ('vibrate' in navigator) {
            navigator.vibrate([50, 20, 50]);
          }
        }
      }
    }, 200);
    
    (e.currentTarget as any).dragTimer = timer;
  }, [isMobile, isDragging]);

  const handleBuildingTouchMove = useCallback((e: React.TouchEvent, buildingType: string) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    
    if ((deltaX > 15 || deltaY > 15) && !isDragging) {
      const timer = (e.currentTarget as any).dragTimer;
      if (timer) {
        clearTimeout(timer);
      }
      
      const buildingDef = BUILDING_TYPES[buildingType];
      if (buildingDef) {
        setDragPreview({
          x: touch.clientX,
          y: touch.clientY,
          type: buildingType
        });
        setIsDragging(true);
        
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 20, 50]);
        }
      }
    }
    
    if (isDragging && dragPreview) {
      setDragPreview(prev => prev ? {
        ...prev,
        x: touch.clientX,
        y: touch.clientY
      } : null);
    }
  }, [isMobile, touchStartPos, isDragging, dragPreview]);

  const handleBuildingTouchEnd = useCallback((e: React.TouchEvent, buildingType: string) => {
    const timer = (e.currentTarget as any).dragTimer;
    if (timer) {
      clearTimeout(timer);
    }
    
    if (isDragging && dragPreview) {
      const touch = e.changedTouches[0];
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      const canvas = elementBelow?.closest('canvas') || elementBelow?.closest('[data-drop-target]');
      
      if (canvas) {
        handleBuildingPlace(buildingType);
        
        if ('vibrate' in navigator) {
          navigator.vibrate(100);
        }
      }
    } else if (!isDragging) {
      handleBuildingClick(buildingType);
    }
    
    setDragPreview(null);
    setIsDragging(false);
  }, [isDragging, dragPreview]);

  // Enhanced drag start with visual feedback for desktop
  const handleBuildingDragStart = useCallback((e: React.DragEvent, buildingType: string) => {
    e.dataTransfer.setData('application/building-type', buildingType);
    e.dataTransfer.effectAllowed = 'copy';
    
    const buildingDef = BUILDING_TYPES[buildingType];
    if (buildingDef) {
      setDragPreview({
        x: e.clientX,
        y: e.clientY,
        type: buildingType
      });
    }
    
    // Set custom drag image if animations are enabled
    if (config.enableAnimations) {
      const dragImage = document.createElement('div');
      dragImage.style.width = '140px';
      dragImage.style.height = '90px';
      dragImage.style.background = `linear-gradient(145deg, ${buildingDef?.color}88, ${buildingDef?.color}44)`;
      dragImage.style.borderRadius = '12px';
      dragImage.style.display = 'flex';
      dragImage.style.alignItems = 'center';
      dragImage.style.justifyContent = 'center';
      dragImage.style.color = 'white';
      dragImage.style.fontWeight = 'bold';
      dragImage.style.fontSize = '14px';
      dragImage.style.textAlign = 'center';
      dragImage.style.padding = '8px';
      dragImage.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
      dragImage.style.border = '2px solid rgba(250, 149, 73, 0.5)';
      dragImage.style.backdropFilter = 'blur(10px)';
      dragImage.textContent = buildingDef?.name || buildingType;
      
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 70, 45);
      
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
  }, [config.enableAnimations]);

  const handleBuildingDragEnd = useCallback(() => {
    setDragPreview(null);
  }, []);

  const handleBuildingPlace = useCallback((buildingType: string) => {
    const buildingDef = BUILDING_TYPES[buildingType];
    if (!buildingDef) return;

    // Helper function to apply grid snapping - only when BOTH grid is visible AND snapping enabled
    // Uses FOUNDATION_SIZE (8m) to match visible grid lines
    const shouldSnap = gridSnappingEnabled && showGrid;
    const snapToGrid = (value: number) => shouldSnap ? Math.round(value / FOUNDATION_SIZE) * FOUNDATION_SIZE : value;

    // For train stations, try to find a good placement position
    let worldX = 0;
    let worldY = 0;

    if (isTrainStation(buildingType)) {
      // Find existing train stations and place near them
      const existingStations = Object.values(buildings).filter(b =>
        isTrainStation(b.type) && b.z === currentFloor * FLOOR_HEIGHT
      );

      if (existingStations.length > 0) {
        // Place near the first existing station for easier snapping
        const referenceStation = existingStations[0];
        const referenceDef = BUILDING_TYPES[referenceStation.type];
        // Place to the right of the reference station with some offset
        worldX = snapToGrid(referenceStation.x + referenceDef.width + 2); // 2 meter gap
        worldY = snapToGrid(referenceStation.y);
        console.log('[Station Placement Mobile] Placing near existing station at:', { x: worldX, y: worldY });
      }
    }

    // Apply grid snapping to default coordinates (0, 0 stays 0 when snapped)
    worldX = snapToGrid(worldX);
    worldY = snapToGrid(worldY);

    // Check for building height blocking from buildings on lower floors
    const blockingResult = isPlacementBlockedByBuildingBelow(
      worldX, worldY, currentFloor, buildingType, buildings, 0
    );

    if (blockingResult.isBlocked) {
      console.warn(`Cannot place ${buildingType}: ${blockingResult.message}`);
      return; // Don't place the building
    }

    let building: Building = {
      id: `building-${Date.now()}`,
      type: buildingType,
      x: worldX,
      y: worldY,
      z: currentFloor * FLOOR_HEIGHT,
      floor: currentFloor,
      rotation: 0,
      connectionPoints: buildingDef.connectionPoints,
      railwayPoints: buildingDef.railwayPoints || undefined
    };

    // Check for train station snapping if this is a train building
    if (isTrainStation(buildingType)) {
      const stationSnapResult = detectNearbyStations(building, buildings);
      if (stationSnapResult.shouldSnap) {
        const snappedBuilding = snapBuildingToStation(building, stationSnapResult);
        if (snappedBuilding) {
          building = snappedBuilding;
          console.log('🚂 Train station snapped to align with nearby station:', stationSnapResult.snapTarget?.building.type);
        }
      }
    }

    addBuilding(building);
  }, [currentFloor, addBuilding, buildings, gridSnappingEnabled, showGrid]);

  const handleBuildingClick = useCallback((buildingType: string) => {
    const buildingDef = BUILDING_TYPES[buildingType];
    if (!buildingDef) return;

    // Helper function to apply grid snapping - only when BOTH grid is visible AND snapping enabled
    // Uses FOUNDATION_SIZE (8m) to match visible grid lines
    const shouldSnap = gridSnappingEnabled && showGrid;
    const snapToGrid = (value: number) => shouldSnap ? Math.round(value / FOUNDATION_SIZE) * FOUNDATION_SIZE : value;

    // For train stations, try to find a good placement position
    let buildingX = 0;
    let buildingY = 0;

    if (isTrainStation(buildingType)) {
      // Find existing train stations and place near them
      const existingStations = Object.values(buildings).filter(b =>
        isTrainStation(b.type) && b.z === currentFloor * FLOOR_HEIGHT
      );

      if (existingStations.length > 0) {
        // Place near the first existing station for easier snapping
        const referenceStation = existingStations[0];
        const referenceDef = BUILDING_TYPES[referenceStation.type];
        // Place to the right of the reference station with some offset
        buildingX = snapToGrid(referenceStation.x + referenceDef.width + 2); // 2 meter gap
        buildingY = snapToGrid(referenceStation.y);
        console.log('[Station Placement] Placing near existing station at:', { x: buildingX, y: buildingY });
      }
    }

    // Apply grid snapping to default coordinates (0, 0 stays 0 when snapped)
    buildingX = snapToGrid(buildingX);
    buildingY = snapToGrid(buildingY);

    // Check for building height blocking from buildings on lower floors
    const blockingResult = isPlacementBlockedByBuildingBelow(
      buildingX, buildingY, currentFloor, buildingType, buildings, 0
    );

    if (blockingResult.isBlocked) {
      console.warn(`Cannot place ${buildingType}: ${blockingResult.message}`);
      return; // Don't place the building
    }

    const buildingPosition = { x: buildingX, y: buildingY, z: currentFloor * FLOOR_HEIGHT };

    // Validate wall placement for windows and doors
    if (['window', 'door'].includes(buildingType)) {
      const isValidPlacement = validateWallPlacement(buildingPosition, buildingType, wallSegments, currentFloor);
      if (!isValidPlacement) {
        console.warn(`Cannot place ${buildingType} at position: No valid wall found. Try dragging it near a wall instead.`);
        return;
      }
    }

    let building: Building = {
      id: `building-${Date.now()}`,
      type: buildingType,
      x: buildingX,
      y: buildingY,
      z: currentFloor * FLOOR_HEIGHT,
      floor: currentFloor,
      rotation: 0,
      connectionPoints: buildingDef.connectionPoints,
      railwayPoints: buildingDef.railwayPoints || undefined
    };

    // Check for train station snapping if this is a train building
    if (isTrainStation(buildingType)) {
      const stationSnapResult = detectNearbyStations(building, buildings);
      if (stationSnapResult.shouldSnap) {
        const snappedBuilding = snapBuildingToStation(building, stationSnapResult);
        if (snappedBuilding) {
          building = snappedBuilding;
          console.log('🚂 Train station snapped to align with nearby station:', stationSnapResult.snapTarget?.building.type);
        }
      }
    }

    addBuilding(building);
  }, [currentFloor, addBuilding, wallSegments, buildings, gridSnappingEnabled, showGrid]);

  // Touch-friendly resize handling (desktop only)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    setIsResizing(true);
    e.preventDefault();
  }, [isMobile]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || isMobile) return;
    const newWidth = e.clientX;
    setBuildingPanelWidth(newWidth);
  }, [isResizing, isMobile, setBuildingPanelWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing && !isMobile) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, isMobile, handleMouseMove, handleMouseUp]);

  const effectiveWidth = isMobile ? '100%' : buildingPanelWidth;
  const panelClass = config.enableBackdropBlur ? 'glass-panel' : 'glass-panel-solid';

  return (
    <div 
      className={`h-full flex flex-col overflow-hidden relative transition-all duration-300 ${
        isMobile ? 'bg-transparent' : ''
      }`}
      style={{ width: effectiveWidth }}
    >
      {/* Mobile Header */}
      {isMobile && (
        <div className="flex-shrink-0 p-4 border-b border-orange-400/20 bg-gradient-to-r from-orange-500/10 to-orange-600/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold gradient-text">Buildings</h2>
            {isCollapsed && (
              <button
                className="sci-fi-button p-2"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <Maximize2 size={16} />
              </button>
            )}
          </div>

          {/* Enhanced Search Bar for Mobile */}
          <div className="relative mb-4">
            <div className={`relative transition-all duration-300 ${isSearchFocused ? 'scale-105' : ''}`}>
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-20 pointer-events-none" />
              <input
                type="text"
                placeholder="Search buildings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="sci-fi-input building-search-input w-full pr-10 py-3 text-base focus:glow-orange"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Instructions */}
          <div className="text-xs text-slate-400 space-y-2 bg-slate-800/30 p-3 rounded-lg">
            <div className="font-bold text-orange-300 mb-2">📱 Mobile Controls:</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <span>Tap to place at origin (0,0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>Hold & drag to canvas for precise placement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Haptic feedback confirms actions</span>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && !isCollapsed && (
        <div className="flex-shrink-0 p-4 border-b border-orange-400/20">
          <h2 className="text-lg font-bold gradient-text mb-3">Buildings</h2>
          
          {/* Desktop Search */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-20 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sci-fi-input building-search-input w-full pr-8 py-2 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
          
          <div className="text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
              <span>Drag to canvas or click to place at origin</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Categories */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden palette-scrollbar">
          {/* Helper function to render a single category's buildings grid */}
          {(() => {
            const renderBuildingsGrid = (buildings: Array<[string, typeof BUILDING_TYPES[string]]>, startIndex: number = 0) => (
              <div className={`p-4 grid ${
                isMobile
                  ? 'grid-cols-2 gap-4'
                  : buildingPanelWidth >= 350 ? 'grid-cols-3 gap-2' : 'grid-cols-2 gap-2'
              } bg-gradient-to-r from-slate-900/30 to-slate-800/30`}>
                {buildings.map(([buildingKey, building], buildingIndex) => {
                  // Use simplified card for low performance mode
                  if (isLowPerformance) {
                    return (
                      <SimpleBuildingCard
                        key={buildingKey}
                        buildingKey={buildingKey}
                        building={building}
                        onDragStart={!isMobile ? (e: React.DragEvent) => handleBuildingDragStart(e, buildingKey) : undefined}
                        onDragEnd={!isMobile ? handleBuildingDragEnd : undefined}
                        onTouchStart={isMobile ? (e: React.TouchEvent) => handleBuildingTouchStart(e, buildingKey) : undefined}
                        onTouchMove={isMobile ? (e: React.TouchEvent) => handleBuildingTouchMove(e, buildingKey) : undefined}
                        onTouchEnd={isMobile ? (e: React.TouchEvent) => handleBuildingTouchEnd(e, buildingKey) : undefined}
                        onClick={!isMobile ? () => handleBuildingClick(buildingKey) : undefined}
                        isMobile={isMobile}
                      />
                    );
                  }

                  // Full animated card for higher performance modes
                  return (
                    <div
                      key={buildingKey}
                      className="relative"
                      style={config.enableAnimations ? {
                        animation: `fadeInScale 0.2s ease-out ${(startIndex + buildingIndex) * 0.03}s both`
                      } : undefined}
                    >
                      <button
                        className={`${panelClass} p-3 text-left group relative transition-all duration-300 focus-ring flex flex-col w-full hover:scale-105 hover:shadow-lg ${
                          isMobile
                            ? 'cursor-default select-none min-h-[120px] active:scale-95 active:glow-orange'
                            : 'cursor-grab active:cursor-grabbing min-h-[110px]'
                        }`}
                        draggable={!isMobile}
                        onDragStart={!isMobile ? (e: React.DragEvent<HTMLButtonElement>) => handleBuildingDragStart(e, buildingKey) : undefined}
                        onDragEnd={!isMobile ? () => handleBuildingDragEnd() : undefined}
                        onTouchStart={isMobile ? (e: React.TouchEvent) => handleBuildingTouchStart(e, buildingKey) : undefined}
                        onTouchMove={isMobile ? (e: React.TouchEvent) => handleBuildingTouchMove(e, buildingKey) : undefined}
                        onTouchEnd={isMobile ? (e: React.TouchEvent) => handleBuildingTouchEnd(e, buildingKey) : undefined}
                        onClick={!isMobile ? () => handleBuildingClick(buildingKey) : undefined}
                        title={`${building.name}\n${building.width}×${building.height}×${building.depth}m\n${building.connectionPoints.length} connection points${building.railwayPoints ? `\n${building.railwayPoints.length} railway connections` : ''}\n\n${isMobile ? 'Tap to place at origin or hold & drag to canvas' : 'Drag to canvas or click to place at origin'}`}
                        style={config.enableGlowEffects ? {
                          boxShadow: config.enableGlowEffects ? `0 2px 8px ${building.color}22` : undefined
                        } : undefined}
                      >
                        {/* Enhanced Building Preview */}
                        <div className="mb-3 flex-shrink-0">
                          <BuildingPreview
                            buildingKey={buildingKey}
                            name={building.name}
                            width={building.width}
                            height={building.height}
                            depth={building.depth}
                            color={building.color}
                            category={building.category}
                            connectionPoints={building.connectionPoints}
                            railwayPoints={building.railwayPoints}
                            isMobile={isMobile}
                            enableGlowEffects={config.enableGlowEffects}
                          />
                        </div>

                        {/* Building name with better typography */}
                        <div className="flex-1 flex flex-col justify-center min-h-0">
                          <div
                            className={`text-slate-300 font-medium transition-all duration-300 group-hover:text-orange-300 leading-tight text-center truncate px-1 ${
                              isMobile ? 'text-sm' : 'text-[11px]'
                            }`}
                            style={{
                              fontSize: building.name.length > 18 ? (isMobile ? '12px' : '10px') : undefined
                            }}
                            title={building.name}
                          >
                            {building.name}
                          </div>
                        </div>

                        {/* Enhanced metadata */}
                        <div className={`text-slate-500 ${isMobile ? 'text-xs' : 'text-[10px]'} mt-2 flex justify-between items-center flex-shrink-0`}>
                          <span className="font-mono">{building.width}x{building.height}m</span>
                          <div className="flex items-center gap-1">
                            {building.connectionPoints.length > 0 && (
                              <div className="flex items-center gap-1">
                                <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-1 h-1'} bg-green-400 rounded-full`}></div>
                                <span>{building.connectionPoints.length}</span>
                              </div>
                            )}
                            {building.railwayPoints && (
                              <div className="flex items-center gap-1 ml-1">
                                <div className={`${isMobile ? 'w-2 h-1' : 'w-1.5 h-0.5'} bg-slate-600 rounded-sm`}></div>
                                <span>{building.railwayPoints.length}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Hover/Active effects */}
                        {config.enableGlowEffects && (
                          <div className="absolute inset-0 bg-gradient-to-t from-orange-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg"></div>
                        )}

                        {/* Mobile touch feedback */}
                        {isMobile && (
                          <div className="absolute inset-0 bg-gradient-to-t from-orange-400/20 to-transparent opacity-0 group-active:opacity-100 transition-opacity duration-150 pointer-events-none rounded-lg"></div>
                        )}

                        {/* Drag indicator for mobile */}
                        {isMobile && (
                          <div className="absolute top-2 right-2 text-slate-400">
                            <div className="text-xs">..</div>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            );

            // Render a single category section
            const renderCategorySection = (category: BuildingCategory, categoryIndex: number, isSubcategory: boolean = false) => {
              const categoryBuildings = filteredBuildingsByCategory[category];
              if (categoryBuildings.length === 0) return null;

              const isCategoryCollapsed = collapsedCategories.has(category);

              // Determine category-specific colors
              const getCategoryColors = () => {
                if (isSubcategory) {
                  return {
                    bg: 'bg-gradient-to-r from-slate-800/30 to-slate-700/30',
                    border: 'border-orange-400/20',
                    text: 'text-slate-300',
                    indicator: 'bg-slate-500/30',
                    hover: 'hover:bg-orange-400/10',
                    active: 'active:bg-orange-400/20'
                  };
                }
                switch (category) {
                  case 'transport':
                    return {
                      bg: 'bg-gradient-to-r from-slate-700/50 to-zinc-600/40',
                      border: 'border-slate-500/30',
                      text: 'text-slate-300',
                      indicator: 'bg-slate-400/40',
                      hover: 'hover:bg-slate-400/10',
                      active: 'active:bg-slate-400/20'
                    };
                  case 'architecture':
                    return {
                      bg: 'bg-gradient-to-r from-cyan-900/40 to-teal-800/30',
                      border: 'border-cyan-500/30',
                      text: 'text-cyan-300',
                      indicator: 'bg-cyan-400/40',
                      hover: 'hover:bg-cyan-400/10',
                      active: 'active:bg-cyan-400/20'
                    };
                  default:
                    return {
                      bg: 'bg-gradient-to-r from-slate-800/50 to-slate-700/50',
                      border: 'border-orange-400/10',
                      text: 'text-orange-300',
                      indicator: 'bg-orange-400/30',
                      hover: 'hover:bg-orange-400/10',
                      active: 'active:bg-orange-400/20'
                    };
                }
              };

              const colors = getCategoryColors();

              return (
                <div
                  key={category}
                  className={`border-b ${colors.border} ${isSubcategory ? `ml-4 border-l ${colors.border}` : ''}`}
                  style={config.enableAnimations ? {
                    animation: `fadeInUp 0.3s ease-out ${categoryIndex * 0.05}s both`
                  } : undefined}
                >
                  <button
                    type="button"
                    className={`w-full px-4 py-3 text-left ${colors.bg} backdrop-blur-sm flex items-center justify-between text-sm font-medium transition-all duration-300 focus-ring ${colors.hover} ${
                      isMobile ? `min-h-[56px] ${colors.active}` : ''
                    }`}
                    onClick={() => toggleCategory(category)}
                    style={config.enableAnimations ? {
                      transform: 'scale(1)',
                      transition: 'all 0.2s ease'
                    } : undefined}
                    onMouseDown={(e) => {
                      if (config.enableAnimations) {
                        e.currentTarget.style.transform = 'scale(0.98)';
                      }
                    }}
                    onMouseUp={(e) => {
                      if (config.enableAnimations) {
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (config.enableAnimations) {
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    <span className={`${colors.text} flex items-center gap-2`}>
                      <div className={`w-3 h-3 rounded ${colors.indicator}`}></div>
                      {categoryDisplayNames[category]} ({categoryBuildings.length})
                    </span>
                    <div
                      className="transition-transform duration-200"
                      style={{
                        transform: `rotate(${isCategoryCollapsed ? 0 : 90}deg)`
                      }}
                    >
                      <ChevronRight size={16} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {!isCategoryCollapsed && (
                      <motion.div
                        initial={config.enableAnimations ? { height: 0, opacity: 0 } : false}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={config.enableAnimations ? { height: 0, opacity: 0 } : undefined}
                        transition={config.enableAnimations ? { duration: 0.3 } : { duration: 0.01 }}
                        style={{ overflow: 'hidden' }}
                      >
                        {renderBuildingsGrid(categoryBuildings, categoryIndex * 10)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            };

            // Calculate total utilities buildings count
            const utilitiesBuildingsCount = UTILITIES_SUBCATEGORIES.reduce((count, cat) => {
              return count + filteredBuildingsByCategory[cat].length;
            }, 0);

            // Check if any utilities subcategories have buildings
            const hasUtilitiesBuildings = utilitiesBuildingsCount > 0;

            return (
              <>
                {/* Render main categories in order: Extraction, Production, Logistics, Power, Storage, Transport */}
                {mainCategoryOrder.map((category, categoryIndex) =>
                  renderCategorySection(category, categoryIndex)
                )}

                {/* Render Utilities parent category with subcategories */}
                {hasUtilitiesBuildings && (
                  <div
                    key="utilities"
                    className="border-b border-orange-400/10"
                    style={config.enableAnimations ? {
                      animation: `fadeInUp 0.3s ease-out ${mainCategoryOrder.length * 0.05}s both`
                    } : undefined}
                  >
                    {/* Utilities Parent Header */}
                    <button
                      type="button"
                      className={`w-full px-4 py-3 text-left bg-gradient-to-r from-purple-900/30 to-slate-700/50 backdrop-blur-sm flex items-center justify-between text-sm font-medium transition-all duration-300 focus-ring hover:bg-purple-400/10 ${
                        isMobile ? 'min-h-[56px] active:bg-purple-400/20' : ''
                      }`}
                      onClick={() => setIsUtilitiesExpanded(!isUtilitiesExpanded)}
                      style={config.enableAnimations ? {
                        transform: 'scale(1)',
                        transition: 'all 0.2s ease'
                      } : undefined}
                      onMouseDown={(e) => {
                        if (config.enableAnimations) {
                          e.currentTarget.style.transform = 'scale(0.98)';
                        }
                      }}
                      onMouseUp={(e) => {
                        if (config.enableAnimations) {
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (config.enableAnimations) {
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                    >
                      <span className="text-purple-300 flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-purple-400/30"></div>
                        Utilities ({utilitiesBuildingsCount})
                      </span>
                      <div
                        className="transition-transform duration-200"
                        style={{
                          transform: `rotate(${isUtilitiesExpanded ? 90 : 0}deg)`
                        }}
                      >
                        <ChevronRight size={16} />
                      </div>
                    </button>

                    {/* Utilities Subcategories */}
                    <AnimatePresence>
                      {isUtilitiesExpanded && (
                        <motion.div
                          initial={config.enableAnimations ? { height: 0, opacity: 0 } : false}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={config.enableAnimations ? { height: 0, opacity: 0 } : undefined}
                          transition={config.enableAnimations ? { duration: 0.3 } : { duration: 0.01 }}
                          style={{ overflow: 'hidden' }}
                        >
                          {UTILITIES_SUBCATEGORIES.map((subcategory, subIndex) =>
                            renderCategorySection(subcategory, mainCategoryOrder.length + subIndex + 1, true)
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Render Architecture at the bottom */}
                {renderCategorySection('architecture', mainCategoryOrder.length + UTILITIES_SUBCATEGORIES.length + 1)}
              </>
            );
          })()}

          {/* No results message */}
          {searchQuery && Object.values(filteredBuildingsByCategory).every(buildings => buildings.length === 0) && (
            <div className="p-8 text-center">
              <div className="text-3xl mb-4">🔍</div>
              <div className="text-slate-400 mb-2 text-base">No buildings found</div>
              <div className="text-sm text-slate-500">Try a different search term</div>
              <button
                onClick={() => setSearchQuery('')}
                className="sci-fi-button px-4 py-2 mt-4 text-sm"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Resize Handle - Desktop Only */}
      {!isMobile && (
        <div
          ref={resizeRef}
          className="absolute top-0 right-0 w-1 h-full hover:w-2 bg-orange-400/20 hover:bg-orange-400/40 cursor-ew-resize transition-all duration-300 z-10"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-4 h-12 flex flex-col justify-center items-center">
            <GripVertical size={12} className="text-orange-400/60" />
          </div>
        </div>
      )}
      
      {/* Enhanced Drag Preview */}
      <AnimatePresence>
        {dragPreview && config.enableAnimations && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'fixed',
              left: dragPreview.x + 15,
              top: dragPreview.y + 15,
              pointerEvents: 'none',
              zIndex: 50
            }}
          >
            <div className={`${panelClass} p-4 text-sm text-orange-300 font-bold max-w-[220px] border border-orange-400/50 shadow-lg`}>
              <div className="text-lg mb-2">
                {BUILDING_TYPES[dragPreview.type]?.name}
              </div>
              {isMobile && (
                <div className="text-xs text-slate-400 space-y-1">
                  <div>📱 Drag to canvas area</div>
                  <div>✨ Release to place building</div>
                  <div className="text-orange-300">🎯 Vibration confirms drop</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
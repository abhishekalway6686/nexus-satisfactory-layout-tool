import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GripVertical, ArrowLeft, RotateCw, Trash2, Copy, Settings, Info, FlaskConical, Pickaxe } from 'lucide-react';
import { useLayoutStore } from '../../store/layoutStore';
import { useConveyorBeltsArray, usePipelinesArray, useRailwaysArray } from '../../store/performanceSelectors';
import { usePerformanceMode } from '../../hooks/usePerformanceMode';
import { BUILDING_TYPES, GRID_SIZE, FLOOR_HEIGHT } from '../../constants';
import { Pipeline } from '../../types';
import RecipeDropdown, { RecipeDetails } from './RecipeDropdown';
import ResourceSelector, { ResourceExtractionDetails } from './ResourceSelector';
import StationResourceSelector, { StationResourceDetails } from './StationResourceSelector';
import { buildingSupportsRecipes, isExtractionBuilding } from '../../data/recipesByBuilding';
import { RECIPES } from '../../data/recipes';

export default function PropertiesPanel() {
  // Use performance-optimized selectors
  const conveyorBeltsArray = useConveyorBeltsArray();
  const pipelinesArray = usePipelinesArray();
  const railwaysArray = useRailwaysArray();
  
  const {
    selectedBuilding,
    selectedPole,
    selectedPipeSupport,
    selectedPipeSegment,
    selectedConveyorSegment,
    selectedStickyNote,
    selectedRailwaySegment,
    selectedConveyorLift,
    selectedPipeFloorConnection,
    selectedPowerPole,
    selectedTool,
    drawingState,
    currentFloor,
    buildings,
    conveyorPoles,
    pipeSupports,
    powerPoles,
    conveyorBelts,
    conveyorSegments,
    pipelines,
    pipeSegments,
    conveyorLifts,
    pipeFloorConnections,
    railwaySegments,
    stickyNotes,
    updateBuilding,
    deleteBuilding,
    deletePole,
    deletePipeSupport,
    deletePipeSegment,
    deleteConveyorSegment,
    deleteStickyNote,
    updateStickyNote,
    deleteConveyorLift,
    deletePipeFloorConnection,
    updateConveyorLift,
    updatePipeFloorConnection,
    updateRailwaySegment,
    updatePipeline,
    updateConveyorBelt,
    addBuilding,
    deleteRailwaySegment,
    rotateBuilding,
    setSelectedBuilding,
    setSelectedPole,
    setSelectedPipeSupport,
    setSelectedPipeSegment,
    setSelectedConveyorSegment,
    setSelectedStickyNote,
    setSelectedRailwaySegment,
    setSelectedConveyorLift,
    setSelectedPipeFloorConnection,
    setSelectedPowerPole,
    updatePowerPole,
    deletePowerPole,
    propertiesPanelWidth,
    setPropertiesPanelWidth,
    reverseBeltDirection,
    setSelectedRecipe,
    setClockSpeed,
    setExtractedResource,
    setStationResourceConfig
  } = useLayoutStore();
  
  const { config } = usePerformanceMode();
  
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'connections'>('basic');
  const [touchStartX, setTouchStartX] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  
  // Monitor screen size changes
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && propertiesPanelWidth > 320) {
        setPropertiesPanelWidth(300);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [propertiesPanelWidth, setPropertiesPanelWidth]);
  
  // Memoize belt search to avoid O(n) search on every render
  // This optimization prevents expensive searches from running on each render
  const { selectedBelt, beltTotalLength } = useMemo(() => {
    if (!selectedPole) {
      return { selectedBelt: null, beltTotalLength: 0 };
    }

    const belt = conveyorBeltsArray.find(belt => {
      return belt.segments.some(segId => {
        const seg = conveyorSegments[segId];
        return seg && (seg.startPole === selectedPole || seg.endPole === selectedPole);
      });
    });
    
    let totalLength = 0;
    if (belt) {
      belt.segments.forEach(segId => {
        const seg = conveyorSegments[segId];
        if (seg) {
          totalLength += seg.length;
        }
      });
    }
    
    return { selectedBelt: belt, beltTotalLength: totalLength };
  }, [selectedPole, conveyorBelts, conveyorSegments]);
  
  // Memoize pipeline search to avoid O(n) search on every render
  // This optimization prevents expensive searches from running on each render
  const { selectedPipeline, pipelineTotalLength, totalHeadLift } = useMemo(() => {
    if (!selectedPipeSupport) {
      return { selectedPipeline: null, pipelineTotalLength: 0, totalHeadLift: 0 };
    }

    const pipeline = pipelinesArray.find(pipeline => {
      return pipeline.segments.some(segId => {
        const seg = pipeSegments[segId];
        return seg && (seg.startSupport === selectedPipeSupport || seg.endSupport === selectedPipeSupport);
      });
    });
    
    let totalLength = 0;
    let headLift = 0;
    if (pipeline) {
      pipeline.segments.forEach(segId => {
        const seg = pipeSegments[segId];
        if (seg) {
          totalLength += seg.length;
          if (seg.headLift) {
            headLift += seg.headLift;
          }
        }
      });
    }
    
    return { selectedPipeline: pipeline, pipelineTotalLength: totalLength, totalHeadLift: headLift };
  }, [selectedPipeSupport, pipelines, pipeSegments]);
  
  // Desktop resize handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    setIsResizing(true);
    e.preventDefault();
  }, [isMobile]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || isMobile) return;
    const newWidth = window.innerWidth - e.clientX;
    setPropertiesPanelWidth(newWidth);
  }, [isResizing, isMobile, setPropertiesPanelWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing && !isMobile) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, isMobile, handleMouseMove, handleMouseUp]);

  // Mobile swipe handling for tabs
  const handleSwipeStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setTouchStartX(e.touches[0].clientX);
    setSwipeDirection(null);
  };

  const handleSwipeMove = (e: React.TouchEvent) => {
    if (!isMobile || !touchStartX) return;
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX;
    
    if (Math.abs(deltaX) > 50) { // 50px threshold
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    }
  };

  const handleSwipeEnd = () => {
    if (!isMobile || !swipeDirection) return;
    
    const tabs = ['basic', 'advanced', 'connections'] as const;
    const currentIndex = tabs.indexOf(activeTab);
    
    if (swipeDirection === 'left' && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    } else if (swipeDirection === 'right' && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    }
    
    setSwipeDirection(null);
    setTouchStartX(0);
  };

  const effectiveWidth = isMobile ? '100%' : propertiesPanelWidth;
  const panelClass = config.enableBackdropBlur ? 'glass-panel' : 'glass-panel-solid';

  // Clear selection handler for mobile
  const handleClearSelection = () => {
    setSelectedBuilding(null);
    setSelectedPole(null);
    setSelectedPipeSupport(null);
    setSelectedStickyNote(null);
    setSelectedRailwaySegment(null);
    setSelectedConveyorLift(null);
    setSelectedPipeFloorConnection(null);
    setSelectedPowerPole(null);
  };

  // Quick action handlers
  const handleQuickAction = (action: 'rotate' | 'delete' | 'copy') => {
    // Add haptic feedback
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    if (action === 'rotate' && selectedBuilding) {
      rotateBuilding(selectedBuilding);
    } else if (action === 'delete') {
      if (selectedBuilding) {
        deleteBuilding(selectedBuilding);
        setSelectedBuilding(null);
      } else if (selectedPole) {
        deletePole(selectedPole);
        setSelectedPole(null);
      } else if (selectedPipeSupport) {
        deletePipeSupport(selectedPipeSupport);
        setSelectedPipeSupport(null);
      } else if (selectedStickyNote) {
        deleteStickyNote(selectedStickyNote);
        setSelectedStickyNote(null);
      } else if (selectedConveyorLift) {
        deleteConveyorLift(selectedConveyorLift);
        setSelectedConveyorLift(null);
      } else if (selectedPipeFloorConnection) {
        deletePipeFloorConnection(selectedPipeFloorConnection);
        setSelectedPipeFloorConnection(null);
      } else if (selectedPowerPole) {
        deletePowerPole(selectedPowerPole);
        setSelectedPowerPole(null);
      }
    } else if (action === 'copy' && selectedBuilding) {
      // Simple copy functionality - duplicate at slight offset
      const building = buildings[selectedBuilding];
      if (building) {
        const buildingDef = BUILDING_TYPES[building.type];
        const newBuilding = {
          ...building,
          id: `building-${Date.now()}`,
          x: building.x + buildingDef.width + 1,
          y: building.y
        };
        addBuilding(newBuilding);
      }
    }
  };

  // Enhanced mobile input component
  const MobileInput: React.FC<{
    value: number;
    onChange: (value: number) => void;
    step?: number;
    label: string;
    unit?: string;
  }> = ({ value, onChange, step = 1, label, unit = '' }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-orange-300">{label}</label>
      <div className="flex items-center gap-2">
        <button
          className="sci-fi-button p-3 min-w-[48px] min-h-[48px] flex items-center justify-center bg-red-500/20 border-red-400/40"
          onClick={() => onChange(value - step)}
        >
          -
        </button>
        
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="sci-fi-input font-mono bg-orange-500/10 border-orange-400/30 text-center flex-1 text-lg py-4"
          step={step}
        />
        
        <button
          className="sci-fi-button p-3 min-w-[48px] min-h-[48px] flex items-center justify-center bg-green-500/20 border-green-400/40"
          onClick={() => onChange(value + step)}
        >
          +
        </button>
      </div>
      {unit && (
        <div className="text-xs text-slate-400 text-center">{unit}</div>
      )}
    </div>
  );

  // Conveyor Segment Properties
  if (selectedConveyorSegment && conveyorSegments[selectedConveyorSegment]) {
    const segment = conveyorSegments[selectedConveyorSegment];
    const belt = Object.values(conveyorBelts).find(b => b.segments.includes(selectedConveyorSegment));

    // Belt tier info
    const beltSpeeds: Record<number, number> = { 1: 60, 2: 120, 3: 270, 4: 480, 5: 780, 6: 1200 };

    return (
      <div className={`w-full h-full flex flex-col overflow-hidden relative ${
        isMobile ? 'bg-slate-900/98 backdrop-blur-xl' : ''
      }`} style={{ width: effectiveWidth }}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-orange-400/20">
          <div className="flex items-center justify-between">
            {isMobile && (
              <button onClick={handleClearSelection} className="sci-fi-button p-3 hover:bg-slate-700/50 min-h-[48px] min-w-[48px] flex items-center justify-center">
                <ArrowLeft size={20} />
              </button>
            )}
            <h3 className="text-lg font-bold text-orange-300">Conveyor Segment</h3>
            <button
              onClick={() => {
                deleteConveyorSegment(selectedConveyorSegment);
                setSelectedConveyorSegment(null);
              }}
              className="sci-fi-button p-3 bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Segment Info */}
          <div className="glass-panel p-4 bg-orange-500/5 border-orange-400/20">
            <div className="text-sm font-medium text-orange-300 mb-3">Segment Information</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Type:</span>
                <span className="font-bold text-slate-200 capitalize">{segment.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Length:</span>
                <span className="font-bold text-slate-200">{segment.length.toFixed(1)}m</span>
              </div>
            </div>
          </div>

          {/* Production Simulation: Throughput Info */}
          {belt && (
            <div className="glass-panel p-4 bg-green-500/5 border-green-400/20">
              <div className="text-sm font-medium text-green-300 mb-3">Production Simulation</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Max Throughput:</span>
                  <span className="font-bold text-green-200">{beltSpeeds[belt.mark]} items/min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Actual Throughput:</span>
                  <span className="font-bold text-slate-200">{segment.actualThroughput ?? 0} items/min</span>
                </div>
                {segment.itemType && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Item Type:</span>
                    <span className="font-bold text-slate-200">{segment.itemType}</span>
                  </div>
                )}
                {segment.isBottleneck && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-red-500/20 rounded border border-red-400/40">
                    <span className="text-red-300 text-sm font-medium">Bottleneck Detected</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Belt Info */}
          {belt && (
            <>
              <div className="glass-panel p-4 bg-orange-500/5 border-orange-400/20">
                <div className="text-sm font-medium text-orange-300 mb-3">Belt Information</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Tier:</span>
                    <span className="font-bold text-slate-200">Mk.{belt.mark}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Speed:</span>
                    <span className="font-bold text-slate-200">{beltSpeeds[belt.mark]} items/min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Direction:</span>
                    <span className="font-bold text-slate-200 capitalize">{belt.direction}</span>
                  </div>
                </div>
              </div>

              {/* Belt Tier Selector */}
              <div className="glass-panel p-4 bg-orange-500/5 border-orange-400/20">
                <div className="text-sm font-medium text-orange-300 mb-3">Belt Tier</div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((mark) => (
                    <button
                      key={mark}
                      className={`sci-fi-button py-2 px-3 text-sm ${
                        belt.mark === mark ? 'active border-orange-400 bg-orange-400/20' : 'border-orange-400/40 bg-orange-400/10'
                      }`}
                      onClick={() => updateConveyorBelt(belt.id, { mark: mark as 1|2|3|4|5|6 })}
                    >
                      <div className="font-bold">Mk.{mark}</div>
                      <div className="text-xs opacity-70">{beltSpeeds[mark]}/min</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction Toggle */}
              <div className="glass-panel p-4 bg-orange-500/5 border-orange-400/20">
                <div className="text-sm font-medium text-orange-300 mb-3">Direction</div>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 sci-fi-button py-2 px-3 ${
                      belt.direction === 'forward' ? 'active border-orange-400 bg-orange-400/20' : 'border-orange-400/40 bg-orange-400/10'
                    }`}
                    onClick={() => updateConveyorBelt(belt.id, { direction: 'forward' })}
                  >
                    Forward
                  </button>
                  <button
                    className={`flex-1 sci-fi-button py-2 px-3 ${
                      belt.direction === 'reverse' ? 'active border-orange-400 bg-orange-400/20' : 'border-orange-400/40 bg-orange-400/10'
                    }`}
                    onClick={() => updateConveyorBelt(belt.id, { direction: 'reverse' })}
                  >
                    Reverse
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Desktop Resize Handle */}
        {!isMobile && (
          <div
            ref={resizeRef}
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize bg-gradient-to-b from-slate-400/30 to-slate-400/30 hover:from-slate-400/50 hover:to-slate-400/50 transition-all z-20"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-12 flex flex-col justify-center items-center">
              <GripVertical size={12} className="text-slate-400/60" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pipe Segment Properties
  if (selectedPipeSegment && pipeSegments[selectedPipeSegment]) {
    const segment = pipeSegments[selectedPipeSegment];
    const pipeline = Object.values(pipelines).find(p => p.segments.includes(selectedPipeSegment));

    return (
      <div
        className={`w-full h-full flex flex-col overflow-hidden relative ${
          isMobile ? 'bg-slate-900/98 backdrop-blur-xl' : ''
        }`}
        style={{ width: effectiveWidth }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-blue-400/20">
          <div className="flex items-center justify-between">
            {isMobile && (
              <button
                onClick={handleClearSelection}
                className="sci-fi-button p-3 hover:bg-slate-700/50 min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h3 className="text-lg font-bold text-blue-300">Pipe Segment</h3>
            <button
              onClick={() => {
                deletePipeSegment(selectedPipeSegment);
                setSelectedPipeSegment(null);
              }}
              className="sci-fi-button p-3 bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Segment Info */}
          <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
            <div className="text-sm font-medium text-blue-300 mb-3">Segment Information</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Type:</span>
                <span className="font-bold text-slate-200 capitalize">{segment.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Length:</span>
                <span className="font-bold text-slate-200">{segment.length.toFixed(1)}m</span>
              </div>
              {segment.headLift !== undefined && segment.headLift !== 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Head Lift:</span>
                  <span className={`font-bold ${segment.headLift > 0 ? 'text-orange-300' : 'text-green-300'}`}>
                    {segment.headLift > 0 ? '+' : ''}{segment.headLift.toFixed(1)}m
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Production Simulation: Throughput Info */}
          {pipeline && (
            <div className="glass-panel p-4 bg-green-500/5 border-green-400/20">
              <div className="text-sm font-medium text-green-300 mb-3">Production Simulation</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Max Throughput:</span>
                  <span className="font-bold text-green-200">{pipeline.mark === 1 ? '300' : '600'} m³/min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Actual Throughput:</span>
                  <span className="font-bold text-slate-200">{segment.actualThroughput ?? 0} m³/min</span>
                </div>
                {segment.fluidType && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Fluid Type:</span>
                    <span className="font-bold text-slate-200">{segment.fluidType}</span>
                  </div>
                )}
                {segment.isBottleneck && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-red-500/20 rounded border border-red-400/40">
                    <span className="text-red-300 text-sm font-medium">Bottleneck Detected</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pipeline Info */}
          {pipeline && (
            <>
              <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
                <div className="text-sm font-medium text-blue-300 mb-3">Pipeline Information</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Tier:</span>
                    <span className="font-bold text-slate-200">Mk.{pipeline.mark}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Capacity:</span>
                    <span className="font-bold text-slate-200">{pipeline.mark === 1 ? '300' : '600'}m³/min</span>
                  </div>
                  {pipeline.fluidType && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fluid:</span>
                      <span className="font-bold text-slate-200 capitalize">{pipeline.fluidType}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fluid Type Selector */}
              <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
                <div className="text-sm font-medium text-blue-300 mb-3">Fluid Type</div>
                <select
                  value={pipeline.fluidType || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const newFluidType = value === '' ? undefined : value as Pipeline['fluidType'];
                    updatePipeline(pipeline.id, { fluidType: newFluidType });
                  }}
                  className="sci-fi-input w-full bg-blue-500/10 border-blue-400/30"
                >
                  <option value="">None</option>
                  <option value="water">Water</option>
                  <option value="oil">Crude Oil</option>
                  <option value="fuel">Fuel</option>
                  <option value="acid">Sulfuric Acid</option>
                  <option value="alumina">Alumina Solution</option>
                  <option value="nitrogen">Nitrogen Gas</option>
                </select>
              </div>

              {/* Pipeline Tier Selector */}
              <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
                <div className="text-sm font-medium text-blue-300 mb-3">Pipeline Tier</div>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 sci-fi-button py-3 px-3 flex flex-col items-center ${
                      pipeline.mark === 1 ? 'active border-blue-400 bg-blue-400/20' : 'border-blue-400/40 bg-blue-400/10'
                    }`}
                    onClick={() => updatePipeline(pipeline.id, { mark: 1 })}
                  >
                    <div className="font-bold">Mk.1</div>
                    <div className="text-xs opacity-70">300 m³/min</div>
                  </button>
                  <button
                    className={`flex-1 sci-fi-button py-3 px-3 flex flex-col items-center ${
                      pipeline.mark === 2 ? 'active border-blue-400 bg-blue-400/20' : 'border-blue-400/40 bg-blue-400/10'
                    }`}
                    onClick={() => updatePipeline(pipeline.id, { mark: 2 })}
                  >
                    <div className="font-bold">Mk.2</div>
                    <div className="text-xs opacity-70">600 m³/min</div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Desktop Resize Handle */}
        {!isMobile && (
          <div
            ref={resizeRef}
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize bg-gradient-to-b from-slate-400/30 to-slate-400/30 hover:from-slate-400/50 hover:to-slate-400/50 transition-all z-20"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-12 flex flex-col justify-center items-center">
              <GripVertical size={12} className="text-slate-400/60" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pipe Support Properties
  if (selectedPipeSupport && pipeSupports[selectedPipeSupport]) {
    const support = pipeSupports[selectedPipeSupport];
    
    return (
      <div 
        className={`w-full h-full flex flex-col overflow-hidden relative ${
          isMobile ? 'bg-slate-900/98 backdrop-blur-xl' : ''
        }`}
        style={{ width: effectiveWidth }}
        onTouchStart={handleSwipeStart}
        onTouchMove={handleSwipeMove}
        onTouchEnd={handleSwipeEnd}
      >
        {/* Mobile Header */}
        {isMobile && (
          <div className="flex-shrink-0 p-4 border-b border-blue-400/20 bg-gradient-to-r from-blue-500/10 to-blue-600/5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleClearSelection}
                className="sci-fi-button p-3 hover:bg-slate-700/50 min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="text-lg font-bold text-blue-300">Pipe Support</h3>
              <button
                onClick={() => handleQuickAction('delete')}
                className="sci-fi-button p-3 bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            {/* Mobile Tabs with better touch targets */}
            <div className="flex rounded-lg bg-slate-800/50 p-1">
              {[
                { id: 'basic', label: 'Info', icon: Info },
                { id: 'advanced', label: 'Pipeline', icon: Settings }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded text-sm font-medium transition-all min-h-[48px] ${
                    activeTab === tab.id 
                      ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Swipe indicator */}
            <div className="flex justify-center mt-2 gap-1">
              {['basic', 'advanced'].map((tab, _index) => (
                <div
                  key={tab}
                  className={`w-2 h-2 rounded-full transition-all ${
                    activeTab === tab ? 'bg-blue-400' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <div className="flex-shrink-0 p-4 border-b border-blue-400/20">
            <h3 className="text-lg font-bold text-blue-300">Pipe Support Properties</h3>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Desktop: Show all content without tabs */}
          {!isMobile ? (
            <div className="p-4 space-y-6">
              {/* Basic Info Section */}
              <div className={`${panelClass} p-4 bg-blue-500/5 border-blue-400/20`}>
                <div className="text-sm font-medium text-blue-300 mb-3">Position (meters)</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-slate-400">X</div>
                    <div className="font-mono font-bold text-slate-200 text-lg">{support.x}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400">Y</div>
                    <div className="font-mono font-bold text-slate-200 text-lg">{support.y}</div>
                  </div>
                </div>
              </div>

            {/* Floor & Height */}
            <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
              <div className="text-sm font-medium text-blue-300 mb-3">Floor & Height</div>
              <div className="space-y-2">
                <div className="font-bold text-slate-200 text-base">Floor {support.floor}</div>
                <div className="text-sm text-slate-400">Elevation: {support.z.toFixed(1)}m</div>
              </div>
            </div>

            {/* Support Type */}
            <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
              <div className="text-sm font-medium text-blue-300 mb-3">Support Type</div>
              <div className="font-bold text-slate-200 text-lg flex items-center gap-2">
                {support.isAnchor ? (
                  <>
                    🏢
                    <span>Building Connection</span>
                  </>
                ) : support.isPump ? (
                  <>
                    ⚡
                    <span>Pipeline Pump</span>
                  </>
                ) : (
                  <>
                    🔧
                    <span>Pipe Support</span>
                  </>
                )}
              </div>
              {support.isPump && (
                <div className="mt-3 p-3 bg-blue-500/10 rounded-lg">
                  <div className="text-sm text-blue-300 space-y-1">
                    <div className="flex items-center gap-2">
                      <span>💪</span>
                      <span>Head Lift: +20m</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>↕️</span>
                      <span>Direction: {support.pumpDirection === 'up' ? 'Upward ⬆️' : 'Downward ⬇️'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Connected Pipeline Section - Always visible on desktop */}
            {selectedPipeline && (
              <>
                <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
                  <div className="text-lg font-bold text-blue-300 mb-4 flex items-center gap-2">
                    🚰
                    <span>Pipeline System</span>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass-panel p-3 bg-blue-500/10 border-blue-400/30 text-center">
                        <div className="text-xs text-slate-400 mb-1">Total Length</div>
                        <div className="font-mono font-bold text-blue-200 text-lg">{pipelineTotalLength.toFixed(1)}m</div>
                      </div>
                      <div className="glass-panel p-3 bg-blue-500/10 border-blue-400/30 text-center">
                        <div className="text-xs text-slate-400 mb-1">Segments</div>
                        <div className="font-mono font-bold text-blue-200 text-lg">{selectedPipeline.segments.length}</div>
                      </div>
                    </div>
                    
                    {totalHeadLift > 0 && (
                      <div className="glass-panel p-3 bg-orange-500/10 border-orange-400/30">
                        <div className="flex items-center justify-between">
                          <span className="text-orange-300 font-medium">⚠️ Total Head Lift:</span>
                          <span className="font-mono font-bold text-orange-200 text-lg">{totalHeadLift.toFixed(1)}m</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fluid Type Selector */}
                <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
                  <div className="text-sm font-medium text-blue-300 mb-3">Fluid Type</div>
                  <select
                    value={selectedPipeline.fluidType || ''}
                    onChange={(e) => {
                      const newFluidType = e.target.value as Pipeline['fluidType'];
                      updatePipeline(selectedPipeline.id, {
                        fluidType: newFluidType || undefined
                      });
                      // Force re-render
                      useLayoutStore.setState((state) => ({
                        pipelines: { ...state.pipelines }
                      }));
                    }}
                    className="sci-fi-input w-full bg-blue-500/10 border-blue-400/30"
                  >
                    <option value="">None</option>
                    <option value="water">Water</option>
                    <option value="oil">Crude Oil</option>
                    <option value="fuel">Fuel</option>
                    <option value="acid">Sulfuric Acid</option>
                    <option value="alumina">Alumina Solution</option>
                    <option value="nitrogen">Nitrogen Gas</option>
                  </select>
                </div>

                {/* Pipeline Tier Selector */}
                <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
                  <div className="text-sm font-medium text-blue-300 mb-3">Pipeline Tier</div>
                  <div className="flex gap-2">
                    <button
                      className={`flex-1 sci-fi-button py-2 px-3 ${
                        selectedPipeline.mark === 1 ? 'active border-blue-400 bg-blue-400/20' : 'border-blue-400/40 bg-blue-400/10'
                      }`}
                      onClick={() => {
                        updatePipeline(selectedPipeline.id, {
                          mark: 1
                        });
                        useLayoutStore.setState((state) => ({
                          pipelines: { ...state.pipelines }
                        }));
                      }}
                    >
                      Mk.1 (300m³/min)
                    </button>
                    <button
                      className={`flex-1 sci-fi-button py-2 px-3 ${
                        selectedPipeline.mark === 2 ? 'active border-blue-400 bg-blue-400/20' : 'border-blue-400/40 bg-blue-400/10'
                      }`}
                      onClick={() => {
                        updatePipeline(selectedPipeline.id, {
                          mark: 2
                        });
                        useLayoutStore.setState((state) => ({
                          pipelines: { ...state.pipelines }
                        }));
                      }}
                    >
                      Mk.2 (600m³/min)
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          // Mobile: Tab-based content
          <AnimatePresence mode="wait">
            <div key={activeTab} className="h-full overflow-y-auto">
              {activeTab === 'basic' && (
                <div className="p-4 space-y-6">
                  {/* Position with enhanced mobile inputs */}
                  <div className="space-y-4">
                    <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
                      <div className="text-sm font-medium text-blue-300 mb-3">Position (meters)</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-xs text-slate-400">X</div>
                          <div className="font-mono font-bold text-slate-200 text-lg">{support.x}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-400">Y</div>
                          <div className="font-mono font-bold text-slate-200 text-lg">{support.y}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floor & Height */}
                  <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
                    <div className="text-sm font-medium text-blue-300 mb-3">Floor & Height</div>
                    <div className="space-y-2">
                      <div className="font-bold text-slate-200 text-base">Floor {support.floor}</div>
                      <div className="text-sm text-slate-400">Elevation: {support.z.toFixed(1)}m</div>
                    </div>
                  </div>

                  {/* Type with enhanced styling */}
                  <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
                    <div className="text-sm font-medium text-blue-300 mb-3">Support Type</div>
                    <div className="font-bold text-slate-200 text-lg flex items-center gap-2">
                      {support.isAnchor ? (
                        <>
                          🏢
                          <span>Building Connection</span>
                        </>
                      ) : support.isPump ? (
                        <>
                          ⚡
                          <span>Pipeline Pump</span>
                        </>
                      ) : (
                        <>
                          🔧
                          <span>Pipe Support</span>
                        </>
                      )}
                    </div>
                    {support.isPump && (
                      <div className="mt-3 p-3 bg-blue-500/10 rounded-lg">
                        <div className="text-sm text-blue-300 space-y-1">
                          <div className="flex items-center gap-2">
                            <span>💪</span>
                            <span>Head Lift: +20m</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>↕️</span>
                            <span>Direction: {support.pumpDirection === 'up' ? 'Upward ⬆️' : 'Downward ⬇️'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'advanced' && selectedPipeline && (
                <div className="p-4 space-y-6">
                  {/* Connected Pipeline */}
                  <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
                    <div className="text-lg font-bold text-blue-300 mb-4 flex items-center gap-2">
                      🚰
                      <span>Pipeline System</span>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="glass-panel p-3 bg-blue-500/10 border-blue-400/30 text-center">
                          <div className="text-xs text-slate-400 mb-1">Total Length</div>
                          <div className="font-mono font-bold text-blue-200 text-lg">{pipelineTotalLength.toFixed(1)}m</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-400 mb-1">Segments</div>
                          <div className="font-mono font-bold text-blue-200 text-lg">{selectedPipeline.segments.length}</div>
                        </div>
                      </div>
                      
                      {totalHeadLift > 0 && (
                        <div className="glass-panel p-3 bg-orange-500/10 border-orange-400/30">
                          <div className="flex items-center justify-between">
                            <span className="text-orange-300 font-medium">⚠️ Total Head Lift:</span>
                            <span className="font-mono font-bold text-orange-200 text-lg">{totalHeadLift.toFixed(1)}m</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="glass-panel p-3 bg-blue-500/10 border-blue-400/30">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">Fluid Type:</span>
                          <span className="font-mono font-bold text-blue-200">{selectedPipeline.fluidType || 'None'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fluid Type Selector - Mobile */}
                  <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
                    <div className="text-sm font-medium text-blue-300 mb-3">Fluid Type</div>
                    <select
                      value={selectedPipeline.fluidType || ''}
                      onChange={(e) => {
                        const newFluidType = e.target.value as Pipeline['fluidType'];
                        updatePipeline(selectedPipeline.id, {
                          fluidType: newFluidType || undefined
                        });
                        // Force re-render
                        useLayoutStore.setState((state) => ({
                          pipelines: { ...state.pipelines }
                        }));
                      }}
                      className="sci-fi-input w-full bg-blue-500/10 border-blue-400/30"
                    >
                      <option value="">None</option>
                      <option value="water">Water</option>
                      <option value="oil">Crude Oil</option>
                      <option value="fuel">Fuel</option>
                      <option value="acid">Sulfuric Acid</option>
                      <option value="alumina">Alumina Solution</option>
                      <option value="nitrogen">Nitrogen Gas</option>
                    </select>
                  </div>

                  {/* Pipeline Tier Selector - Mobile */}
                  <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
                    <div className="text-sm font-medium text-blue-300 mb-3">Pipeline Tier</div>
                    <div className="flex gap-2">
                      <button
                        className={`flex-1 sci-fi-button py-2 px-3 ${
                          selectedPipeline.mark === 1 ? 'active border-blue-400 bg-blue-400/20' : 'border-blue-400/40 bg-blue-400/10'
                        }`}
                        onClick={() => {
                          updatePipeline(selectedPipeline.id, {
                            mark: 1
                          });
                          useLayoutStore.setState((state) => ({
                            pipelines: { ...state.pipelines }
                          }));
                        }}
                      >
                        Mk.1
                      </button>
                      <button
                        className={`flex-1 sci-fi-button py-2 px-3 ${
                          selectedPipeline.mark === 2 ? 'active border-blue-400 bg-blue-400/20' : 'border-blue-400/40 bg-blue-400/10'
                        }`}
                        onClick={() => {
                          updatePipeline(selectedPipeline.id, {
                            mark: 2
                          });
                          useLayoutStore.setState((state) => ({
                            pipelines: { ...state.pipelines }
                          }));
                        }}
                      >
                        Mk.2
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AnimatePresence>
        )}
      </div>
      
      {/* Desktop Resize Handle */}
      {!isMobile && (
          <div
            ref={resizeRef}
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize bg-gradient-to-b from-blue-400/30 to-blue-400/30 hover:from-blue-400/50 hover:to-blue-400/50 transition-all z-20"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-12 flex flex-col justify-center items-center">
              <GripVertical size={12} className="text-blue-400/60" />
            </div>
          </div>
        )}
      </div>
    );
}
  
  // Pole Properties with same enhanced mobile UX
if (selectedPole && conveyorPoles[selectedPole]) {
  const pole = conveyorPoles[selectedPole];
  
  return (
    <div 
      className={`w-full h-full flex flex-col overflow-hidden relative ${
        isMobile ? 'bg-slate-900/98 backdrop-blur-xl' : ''
      }`}
      style={{ width: effectiveWidth }}
      onTouchStart={handleSwipeStart}
      onTouchMove={handleSwipeMove}
      onTouchEnd={handleSwipeEnd}
    >
      {/* Mobile Header */}
      {isMobile && (
        <div className="flex-shrink-0 p-4 border-b border-orange-400/20 bg-gradient-to-r from-orange-500/10 to-orange-600/5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleClearSelection}
              className="sci-fi-button p-3 hover:bg-slate-700/50 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </button>
            <h3 className="text-lg font-bold text-orange-300">Conveyor Pole</h3>
            <button
              onClick={() => handleQuickAction('delete')}
              className="sci-fi-button p-3 bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Trash2 size={18} />
            </button>
          </div>
          
          {/* Mobile Tabs */}
          <div className="flex rounded-lg bg-slate-800/50 p-1">
            {[
              { id: 'basic', label: 'Info', icon: Info },
              { id: 'advanced', label: 'Belt', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded text-sm font-medium transition-all min-h-[48px] ${
                  activeTab === tab.id 
                    ? 'bg-orange-500/30 text-orange-200 border border-orange-400/50' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="flex-shrink-0 p-4 border-b border-orange-400/20">
          <h3 className="text-lg font-bold text-orange-300">Pole Properties</h3>
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Desktop: Show all content without tabs */}
        {!isMobile ? (
          <div className="p-4 space-y-6">
            {/* Position */}
            <div className="glass-panel p-4 bg-orange-500/5 border-orange-400/20">
              <div className="text-sm font-medium text-orange-300 mb-3">Position (meters)</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xs text-slate-400">X</div>
                  <div className="font-mono font-bold text-slate-200 text-lg">{pole.x}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400">Y</div>
                  <div className="font-mono font-bold text-slate-200 text-lg">{pole.y}</div>
                </div>
              </div>
            </div>

            {/* Floor */}
            <div className="glass-panel p-4 bg-orange-500/5 border-orange-400/20">
              <div className="text-sm font-medium text-orange-300 mb-3">Floor & Height</div>
              <div className="space-y-2">
                <div className="font-bold text-slate-200 text-base">Floor {pole.floor}</div>
                <div className="text-sm text-slate-400">Elevation: {pole.z.toFixed(1)}m</div>
              </div>
            </div>

            {/* Type */}
            <div className="glass-panel p-4 bg-orange-500/5 border-orange-400/20">
              <div className="text-sm font-medium text-orange-300 mb-3">Pole Type</div>
              <div className="font-bold text-slate-200 text-lg flex items-center gap-2">
                {pole.isAnchor ? (
                  <>
                    🏢
                    <span>Building Connection</span>
                  </>
                ) : (
                  <>
                    ⚙️
                    <span>Conveyor Pole</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Connected Belt - Always show on desktop */}
            {selectedBelt && (
              <>
                <div className="glass-panel p-4 bg-orange-500/5 border-orange-400/20">
                  <div className="text-lg font-bold text-orange-300 mb-4 flex items-center gap-2">
                    ⚙️
                    <span>Conveyor System</span>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass-panel p-3 bg-orange-500/10 border-orange-400/30 text-center">
                        <div className="text-xs text-slate-400 mb-1">Total Length</div>
                        <div className="font-mono font-bold text-orange-200 text-lg">{beltTotalLength.toFixed(1)}m</div>
                      </div>
                      <div className="glass-panel p-3 bg-orange-500/10 border-orange-400/30 text-center">
                        <div className="text-xs text-slate-400 mb-1">Segments</div>
                        <div className="font-mono font-bold text-orange-200 text-lg">{selectedBelt.segments.length}</div>
                      </div>
                    </div>
                    
                    <div className="glass-panel p-3 bg-green-500/10 border-green-400/30">
                      <div className="flex items-center justify-between">
                        <span className="text-green-300 font-medium">Direction:</span>
                        <span className="font-mono font-bold text-green-200 text-lg">
                          {selectedBelt.direction === 'forward' ? '➡️ Forward' : '⬅️ Reverse'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Belt Tier Selector */}
                <div className="glass-panel p-4 bg-orange-500/5 border-orange-400/20">
                  <div className="text-sm font-medium text-orange-300 mb-3">Conveyor Belt Tier</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((tier) => (
                      <button
                        key={tier}
                        className={`sci-fi-button py-2 px-3 text-sm ${
                          selectedBelt.mark === tier 
                            ? 'active border-orange-400 bg-orange-400/20' 
                            : 'border-orange-400/40 bg-orange-400/10'
                        }`}
                        onClick={() => {
                          updateConveyorBelt(selectedBelt.id, {
                            mark: tier as any
                          });
                          // No need to force re-render with proper reactive action
                        }}
                      >
                        Mk.{tier}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-slate-400 text-center">
                    {selectedBelt.mark === 1 && "60 items/min"}
                    {selectedBelt.mark === 2 && "120 items/min"}
                    {selectedBelt.mark === 3 && "270 items/min"}
                    {selectedBelt.mark === 4 && "480 items/min"}
                    {selectedBelt.mark === 5 && "780 items/min"}
                    {selectedBelt.mark === 6 && "1200 items/min"}
                  </div>
                </div>

                {/* Direction Toggle */}
                <div className="glass-panel p-4 bg-orange-500/5 border-orange-400/20">
                  <div className="text-sm font-medium text-orange-300 mb-3">Belt Direction</div>
                  <button
                    className="sci-fi-button w-full py-3 px-4 flex items-center justify-center gap-3 hover:bg-orange-400/20"
                    onClick={() => reverseBeltDirection(selectedBelt.id)}
                  >
                    <RotateCw size={18} />
                    <span>Reverse Direction</span>
                    <span className="text-lg">
                      {selectedBelt.direction === 'forward' ? '➡️' : '⬅️'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          // Mobile: Use tab interface
          <AnimatePresence mode="wait">
            <div key={activeTab} className="h-full overflow-y-auto">
              {activeTab === 'basic' && (
                <div className="p-4 space-y-6">
                  {/* Basic info content - same as desktop */}
                </div>
              )}

              {activeTab === 'advanced' && selectedBelt && (
                <div className="p-4 space-y-6">
                  {/* Belt settings content - same as desktop */}
                </div>
              )}
            </div>
          </AnimatePresence>
        )}
      </div>
      
      {/* Desktop Resize Handle */}
      {!isMobile && (
        <div
          ref={resizeRef}
          className="absolute top-0 left-0 w-1 h-full cursor-col-resize bg-gradient-to-b from-orange-400/30 to-orange-400/30 hover:from-orange-400/50 hover:to-orange-400/50 transition-all z-20"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-12 flex flex-col justify-center items-center">
            <GripVertical size={12} className="text-orange-400/60" />
          </div>
        </div>
      )}
    </div>
  );
}

  // Conveyor Lift Properties
  if (selectedConveyorLift && conveyorLifts[selectedConveyorLift]) {
    const lift = conveyorLifts[selectedConveyorLift];
    
    return (
      <div 
        className={`w-full h-full flex flex-col overflow-hidden relative ${
          isMobile ? 'bg-slate-900/98 backdrop-blur-xl' : ''
        }`}
        style={{ width: effectiveWidth }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-purple-400/20">
          <div className="flex items-center justify-between">
            {isMobile && (
              <button
                onClick={handleClearSelection}
                className="sci-fi-button p-3 hover:bg-slate-700/50 min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h3 className="text-lg font-bold text-purple-300">Conveyor Lift</h3>
            <button
              onClick={() => handleQuickAction('delete')}
              className="sci-fi-button p-3 bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Position */}
          <div className="glass-panel p-4 bg-purple-500/5 border-purple-400/20">
            <div className="text-sm font-medium text-purple-300 mb-3">Position (meters)</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xs text-slate-400">X</div>
                <div className="font-mono font-bold text-slate-200 text-lg">{lift.x}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400">Y</div>
                <div className="font-mono font-bold text-slate-200 text-lg">{lift.y}</div>
              </div>
            </div>
          </div>
          
          {/* Floors */}
          <div className="glass-panel p-4 bg-purple-500/5 border-purple-400/20">
            <div className="text-sm font-medium text-purple-300 mb-3">Floors</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Start Floor:</span>
                <span className="font-bold text-slate-200">Floor {lift.startFloor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">End Floor:</span>
                <span className="font-bold text-slate-200">Floor {lift.endFloor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Height:</span>
                <span className="font-bold text-slate-200">{lift.height}m</span>
              </div>
            </div>
          </div>
          
          {/* Tier Selection */}
          <div className="glass-panel p-4 bg-purple-500/5 border-purple-400/20">
            <div className="text-sm font-medium text-purple-300 mb-3">Tier</div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map(tier => (
                <button
                  key={tier}
                  className={`sci-fi-button py-2 px-3 text-sm ${
                    lift.mark === tier ? 'active border-purple-400 bg-purple-400/20' : 'border-purple-400/40 bg-purple-400/10'
                  }`}
                  onClick={() => updateConveyorLift(lift.id, { mark: tier as any })}
                >
                  Mk.{tier}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Speed: {lift.mark === 1 ? '60' : lift.mark === 2 ? '120' : lift.mark === 3 ? '270' : lift.mark === 4 ? '480' : lift.mark === 5 ? '780' : '1200'} items/min
            </div>
          </div>
          
          {/* Direction */}
          <div className="glass-panel p-4 bg-purple-500/5 border-purple-400/20">
            <div className="text-sm font-medium text-purple-300 mb-3">Direction</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`sci-fi-button py-2 px-3 ${
                  lift.direction === 'up' ? 'active border-green-400 bg-green-400/20' : 'border-green-400/40 bg-green-400/10'
                }`}
                onClick={() => updateConveyorLift(lift.id, { direction: 'up' })}
              >
                ⬆️ Up
              </button>
              <button
                className={`sci-fi-button py-2 px-3 ${
                  lift.direction === 'down' ? 'active border-red-400 bg-red-400/20' : 'border-red-400/40 bg-red-400/10'
                }`}
                onClick={() => updateConveyorLift(lift.id, { direction: 'down' })}
              >
                ⬇️ Down
              </button>
            </div>
          </div>
          
          {/* Cost */}
          <div className="glass-panel p-4 bg-purple-500/5 border-purple-400/20">
            <div className="text-sm font-medium text-purple-300 mb-3">Build Cost</div>
            <div className="font-bold text-slate-200 text-lg">{lift.cost} points</div>
          </div>
        </div>
      </div>
    );
  }

  // Power Pole Properties
  if (selectedPowerPole && powerPoles[selectedPowerPole]) {
    const pole = powerPoles[selectedPowerPole];
    
    return (
      <div 
        className={`w-full h-full flex flex-col overflow-hidden relative ${
          isMobile ? 'bg-slate-900/98 backdrop-blur-xl' : ''
        }`}
        style={{ width: effectiveWidth }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-yellow-400/20">
          <div className="flex items-center justify-between">
            {isMobile && (
              <button
                onClick={handleClearSelection}
                className="sci-fi-button p-3 hover:bg-slate-700/50 min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h3 className="text-lg font-bold text-yellow-300">Power Pole</h3>
            <button
              onClick={() => handleQuickAction('delete')}
              className="sci-fi-button p-3 bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Type Selection */}
          <div className="glass-panel p-4 bg-yellow-500/5 border-yellow-400/20">
            <div className="text-sm font-medium text-yellow-300 mb-3">Tier</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`
                  sci-fi-button p-3 text-sm transition-all min-h-[48px]
                  ${pole.type === 'power_pole_mk1' ? 'active border-yellow-400 bg-yellow-400/20' : 'border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/20'}
                `}
                onClick={() => updatePowerPole(pole.id, { 
                  type: 'power_pole_mk1',
                  range: 30,
                  maxConnections: 4
                })}
              >
                <div className="font-medium">Mk.1</div>
                <div className="text-xs text-slate-400">30m range</div>
              </button>
              <button
                className={`
                  sci-fi-button p-3 text-sm transition-all min-h-[48px]
                  ${pole.type === 'power_pole_mk2' ? 'active border-yellow-400 bg-yellow-400/20' : 'border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/20'}
                `}
                onClick={() => updatePowerPole(pole.id, { 
                  type: 'power_pole_mk2',
                  range: 35,
                  maxConnections: 4
                })}
              >
                <div className="font-medium">Mk.2</div>
                <div className="text-xs text-slate-400">35m range</div>
              </button>
              <button
                className={`
                  sci-fi-button p-3 text-sm transition-all min-h-[48px]
                  ${pole.type === 'power_pole_mk3' ? 'active border-yellow-400 bg-yellow-400/20' : 'border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/20'}
                `}
                onClick={() => updatePowerPole(pole.id, { 
                  type: 'power_pole_mk3',
                  range: 40,
                  maxConnections: 4
                })}
              >
                <div className="font-medium">Mk.3</div>
                <div className="text-xs text-slate-400">40m range</div>
              </button>
              <button
                className={`
                  sci-fi-button p-3 text-sm transition-all min-h-[48px]
                  ${pole.type === 'power_tower' ? 'active border-yellow-400 bg-yellow-400/20' : 'border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/20'}
                `}
                onClick={() => updatePowerPole(pole.id, { 
                  type: 'power_tower',
                  range: 100,
                  maxConnections: 8
                })}
              >
                <div className="font-medium">Tower</div>
                <div className="text-xs text-slate-400">100m range</div>
              </button>
            </div>
          </div>

          {/* Position */}
          <div className="glass-panel p-4 bg-yellow-500/5 border-yellow-400/20">
            <div className="text-sm font-medium text-yellow-300 mb-3">Position</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">X Position</div>
                <div className="text-slate-200">{pole.x.toFixed(1)}m</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Y Position</div>
                <div className="text-slate-200">{pole.y.toFixed(1)}m</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Floor</div>
                <div className="text-slate-200">Floor {pole.floor}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Height</div>
                <div className="text-slate-200">{pole.z.toFixed(1)}m</div>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="glass-panel p-4 bg-yellow-500/5 border-yellow-400/20">
            <div className="text-sm font-medium text-yellow-300 mb-3">Specifications</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Range:</span>
                <span className="text-slate-200">{pole.range}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Connections:</span>
                <span className="text-slate-200">{pole.maxConnections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Connections:</span>
                <span className="text-slate-200">{pole.connections.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sticky Note Properties
  if (selectedStickyNote && stickyNotes[selectedStickyNote]) {
    const note = stickyNotes[selectedStickyNote];

    // Available sticky note colors
    const noteColors = [
      { value: '#ffeb3b', name: 'Yellow', bg: 'bg-yellow-400' },
      { value: '#4caf50', name: 'Green', bg: 'bg-green-500' },
      { value: '#2196f3', name: 'Blue', bg: 'bg-blue-500' },
      { value: '#ff9800', name: 'Orange', bg: 'bg-orange-500' },
      { value: '#e91e63', name: 'Pink', bg: 'bg-pink-500' },
    ];

    return (
      <div
        className={`w-full h-full flex flex-col overflow-hidden relative ${
          isMobile ? 'bg-slate-900/98 backdrop-blur-xl' : ''
        }`}
        style={{ width: effectiveWidth }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-yellow-400/20">
          <div className="flex items-center justify-between">
            {isMobile && (
              <button
                onClick={handleClearSelection}
                className="sci-fi-button p-3 hover:bg-slate-700/50 min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h3 className="text-lg font-bold text-yellow-300">Sticky Note</h3>
            <button
              onClick={() => handleQuickAction('delete')}
              className="sci-fi-button p-3 bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Color Selection */}
          <div className="glass-panel p-4 bg-yellow-500/5 border-yellow-400/20">
            <div className="text-sm font-medium text-yellow-300 mb-3">Note Color</div>
            <div className="flex gap-2 flex-wrap">
              {noteColors.map((color) => (
                <button
                  key={color.value}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    note.color === color.value
                      ? 'border-white shadow-lg scale-110'
                      : 'border-transparent hover:border-white/50 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => updateStickyNote(note.id, { color: color.value })}
                  title={color.name}
                />
              ))}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Selected: {noteColors.find(c => c.value === note.color)?.name || 'Custom'}
            </div>
          </div>

          {/* Position */}
          <div className="glass-panel p-4 bg-yellow-500/5 border-yellow-400/20">
            <div className="text-sm font-medium text-yellow-300 mb-3">Position (meters)</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xs text-slate-400">X</div>
                <div className="font-mono font-bold text-slate-200 text-lg">{note.x.toFixed(1)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400">Y</div>
                <div className="font-mono font-bold text-slate-200 text-lg">{note.y.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="glass-panel p-4 bg-yellow-500/5 border-yellow-400/20">
            <div className="text-sm font-medium text-yellow-300 mb-3">Size</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xs text-slate-400">Width</div>
                <div className="font-mono font-bold text-slate-200 text-base">{note.width}m</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400">Height</div>
                <div className="font-mono font-bold text-slate-200 text-base">{note.height}m</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Drag the corner handle on the note to resize
            </div>
          </div>

          {/* Floor */}
          <div className="glass-panel p-4 bg-yellow-500/5 border-yellow-400/20">
            <div className="text-sm font-medium text-yellow-300 mb-3">Floor</div>
            <div className="font-bold text-slate-200 text-base">Floor {note.floor}</div>
            <div className="text-sm text-slate-400 mt-1">Elevation: {note.z.toFixed(1)}m</div>
          </div>

          {/* Text Preview */}
          <div className="glass-panel p-4 bg-yellow-500/5 border-yellow-400/20">
            <div className="text-sm font-medium text-yellow-300 mb-3">Content Preview</div>
            <div className="text-slate-200 text-sm whitespace-pre-wrap break-words max-h-32 overflow-y-auto bg-slate-800/50 rounded p-2">
              {note.text || '(empty note)'}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Double-click the note to edit text
            </div>
          </div>

          {/* Markdown Help */}
          <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
            <div className="text-sm font-medium text-blue-300 mb-3">Markdown Formatting</div>
            <div className="text-xs text-slate-400 space-y-1 font-mono">
              <div><span className="text-slate-200"># Header</span> - Creates a header</div>
              <div><span className="text-slate-200">**bold**</span> - Bold text</div>
              <div><span className="text-slate-200">*italic*</span> - Italic text</div>
              <div><span className="text-slate-200">- item</span> - Bullet point</div>
            </div>
          </div>
        </div>

        {/* Desktop Resize Handle */}
        {!isMobile && (
          <div
            ref={resizeRef}
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize bg-gradient-to-b from-yellow-400/30 to-yellow-400/30 hover:from-yellow-400/50 hover:to-yellow-400/50 transition-all z-20"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-12 flex flex-col justify-center items-center">
              <GripVertical size={12} className="text-yellow-400/60" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Drawing Tool Guidance
  const drawingTools = ['foundation', 'wall', 'railway', 'conveyor', 'pipe', 'powerline', 'power_pole', 'railing'];
  const nothingSelected = !selectedBuilding && !selectedPole && !selectedPipeSupport && !selectedStickyNote && !selectedConveyorLift && !selectedPipeFloorConnection && !selectedPowerPole && !selectedRailwaySegment && !selectedConveyorSegment && !selectedPipeSegment;

  if (drawingTools.includes(selectedTool) && nothingSelected) {
    const isRailway = selectedTool === 'railway';
    const isConveyor = selectedTool === 'conveyor';
    const isPipe = selectedTool === 'pipe';
    const isPowerline = selectedTool === 'powerline';
    const isPowerPole = selectedTool === 'power_pole';
    const isFoundation = selectedTool === 'foundation';
    const isWall = selectedTool === 'wall';
    const isRailing = selectedTool === 'railing';

    const theme = isRailway ? 'slate' : isConveyor ? 'orange' : isPipe ? 'blue' : (isPowerline || isPowerPole) ? 'yellow' : 'gray';
    const title = isRailway ? 'Railway Tool' : isConveyor ? 'Conveyor Tool' : isPipe ? 'Pipeline Tool' : isPowerline ? 'Powerline Tool' : isPowerPole ? 'Power Pole Tool' : isFoundation ? 'Foundation Tool' : isWall ? 'Wall Tool' : 'Railing Tool';

    // Local Step component for clean JSX
    const Step = ({ num, title, desc, color = 'text-blue-400' }: { num: string; title: string; desc: string; color?: string }) => (
      <div className="flex items-start gap-3">
        <span className={`${color} text-sm font-bold min-w-[20px] pt-0.5`}>{num}</span>
        <div>
          <div className="font-medium text-slate-200 text-sm">{title}</div>
          <div className="text-slate-400 text-xs">{desc}</div>
        </div>
      </div>
    );

    return (
      <div className={`w-full h-full flex flex-col overflow-hidden relative ${isMobile ? 'bg-slate-900/98 backdrop-blur-xl' : ''}`} style={{ width: effectiveWidth }}>
        <div className={`flex-shrink-0 p-4 border-b border-${theme}-400/20 bg-gradient-to-r from-${theme}-500/10 to-${theme}-600/5`}>
          <h3 className={`text-lg font-bold text-${theme}-300`}>{title}</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className={`${panelClass} p-4 bg-${theme}-500/5 border-${theme}-400/20`}>
            <div className={`text-sm font-medium text-${theme}-300 mb-3`}>Current Status</div>
            <div className="flex items-center gap-2 font-bold">
              <span className={`w-2 h-2 bg-${theme}-400 rounded-full animate-pulse`}></span>
              <span className={theme === 'slate' ? 'text-slate-300' : theme === 'orange' ? 'text-orange-300' : theme === 'blue' ? 'text-blue-300' : theme === 'yellow' ? 'text-yellow-300' : 'text-gray-300'}>
                {isRailway ? (drawingState.drawingRailway ? 'Drawing track - click to add points' : 'Ready to draw - click building or grid') :
                 isConveyor ? (drawingState.isDrawing ? 'Drawing belt - click to add points' : 'Ready to draw - click connection or grid') :
                 isPipe ? (drawingState.drawingPipe ? 'Drawing pipe - click to add points' : 'Ready to draw - click connection or grid') :
                 isPowerline ? (drawingState.drawingPowerline ? 'Drawing powerline - click poles' : 'Ready to draw - click a pole or building') :
                 isFoundation ? (drawingState.drawingFoundation ? 'Drawing foundation - drag to set size' : 'Ready to draw - click to start') :
                 isWall ? (drawingState.drawingWall ? 'Drawing walls - click to add points' : 'Ready to draw - click to start') :
                 isRailing ? (drawingState.drawingRailing ? 'Drawing railing - click to add points' : 'Ready to draw - click to start') :
                 'Ready to place - click on grid or foundation'}
              </span>
            </div>
          </div>

          <div className={`${panelClass} p-4 bg-${theme}-500/5 border-${theme}-400/20`}>
            <div className={`text-sm font-medium text-${theme}-300 mb-3`}>Instructions</div>
            <div className="space-y-4">
              {isRailway && (
                <>
                  <Step num="1" title="Start Point" desc="Click a building connection or grid point to begin." />
                  <Step num="2" title="Route" desc="Click along your path. Nexus auto-calculates smooth curves." />
                  <Step num="3" title="Snap" desc="Move near existing tracks to snap automatically." />
                  <Step num="ENTER" title="Finish" desc="Press ENTER or Right-Click to build the railway." color="text-green-400" />
                  <Step num="ESC" title="Cancel" desc="Press ESC to discard the current path." color="text-red-400" />
                </>
              )}
              {isConveyor && (
                <>
                  <Step num="1" title="Start" desc="Click a port or place a pole on the grid." />
                  <Step num="2" title="Route" desc="Continue clicking to place poles. Hold Shift for constraints." />
                  <Step num="ENTER" title="Finish" desc="Connect to a port or press ENTER to finish." color="text-green-400" />
                </>
              )}
              {isPipe && (
                <>
                  <Step num="1" title="Start" desc="Click a fluid port or place a support." />
                  <Step num="2" title="Route" desc="Place intermediate supports. Mind the max segment length." />
                  <Step num="ENTER" title="Finish" desc="Connect to a port or press ENTER to finish." color="text-green-400" />
                </>
              )}
              {isPowerline && (
                <>
                  <Step num="1" title="Connect" desc="Click a power pole or a building power connection." />
                  <Step num="2" title="Finalize" desc="Click another valid power target to create the line." />
                </>
              )}
              {isFoundation && (
                <>
                  <Step num="1" title="Start" desc="Click and hold to set the starting corner." />
                  <Step num="2" title="Size" desc="Drag to define the area (snaps to 8m grid)." />
                  <Step num="3" title="Build" desc="Release the mouse button to place." />
                </>
              )}
              {(isWall || isRailing) && (
                <>
                  <Step num="1" title="Start" desc="Click to place the first point." />
                  <Step num="2" title="Route" desc="Continue clicking to add segments." />
                  <Step num="ENTER" title="Finish" desc="Press ENTER or Right-Click to finish." color="text-green-400" />
                </>
              )}
              {isPowerPole && (
                <>
                  <Step num="1" title="Place" desc="Click on the grid or a foundation to place the pole." />
                  <Step num="2" title="Connect" desc="Poles will automatically link if placed during line drawing." />
                </>
              )}
            </div>
          </div>

          <div className={`${panelClass} p-4 border-blue-400/20 bg-blue-400/5`}>
            <h3 className="font-bold text-blue-300 text-sm mb-2">💡 Pro Tips</h3>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
              {isRailway && <li>Railways support large curves for high-speed trains.</li>}
              {(isConveyor || isPipe) && <li>Clicking a port automatically starts drawing from that port.</li>}
              {isFoundation && <li>Hold CTRL while dragging to disable grid snapping.</li>}
              <li>Use the Floor Selector at the top to design multi-story factories.</li>
              <li>Press 'G' to toggle the grid overlay.</li>
            </ul>
          </div>
        </div>
        
        {!isMobile && (
          <div ref={resizeRef} className={`absolute top-0 left-0 w-1 h-full cursor-col-resize bg-gradient-to-b from-${theme}-400/30 to-${theme}-400/30 hover:from-${theme}-400/50 hover:to-${theme}-400/50 transition-all z-20`} onMouseDown={handleMouseDown}>
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-12 flex flex-col justify-center items-center">
              <GripVertical size={12} className="text-slate-400/60" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pipe Floor Connection Properties
  if (selectedPipeFloorConnection && pipeFloorConnections[selectedPipeFloorConnection]) {
    const connection = pipeFloorConnections[selectedPipeFloorConnection];
    
    return (
      <div 
        className={`w-full h-full flex flex-col overflow-hidden relative ${
          isMobile ? 'bg-slate-900/98 backdrop-blur-xl' : ''
        }`}
        style={{ width: effectiveWidth }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-blue-400/20">
          <div className="flex items-center justify-between">
            {isMobile && (
              <button
                onClick={handleClearSelection}
                className="sci-fi-button p-3 hover:bg-slate-700/50 min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h3 className="text-lg font-bold text-blue-300">Pipe Floor Connection</h3>
            <button
              onClick={() => handleQuickAction('delete')}
              className="sci-fi-button p-3 bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Position */}
          <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
            <div className="text-sm font-medium text-blue-300 mb-3">Position (meters)</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xs text-slate-400">X</div>
                <div className="font-mono font-bold text-slate-200 text-lg">{connection.x}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400">Y</div>
                <div className="font-mono font-bold text-slate-200 text-lg">{connection.y}</div>
              </div>
            </div>
          </div>
          
          {/* Floors */}
          <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
            <div className="text-sm font-medium text-blue-300 mb-3">Floors</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Start Floor:</span>
                <span className="font-bold text-slate-200">Floor {connection.startFloor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">End Floor:</span>
                <span className="font-bold text-slate-200">Floor {connection.endFloor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Height:</span>
                <span className="font-bold text-slate-200">{connection.height}m</span>
              </div>
            </div>
          </div>
          
          {/* Tier Selection */}
          <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
            <div className="text-sm font-medium text-blue-300 mb-3">Tier</div>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map(tier => (
                <button
                  key={tier}
                  className={`sci-fi-button py-2 px-3 ${
                    connection.mark === tier ? 'active border-blue-400 bg-blue-400/20' : 'border-blue-400/40 bg-blue-400/10'
                  }`}
                  onClick={() => updatePipeFloorConnection(connection.id, { mark: tier as any })}
                >
                  Mk.{tier}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Throughput: {connection.mark === 1 ? '300' : '600'} m³/min
            </div>
          </div>
          
          
          {/* Direction */}
          <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
            <div className="text-sm font-medium text-blue-300 mb-3">Direction</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`sci-fi-button py-2 px-3 ${
                  connection.direction === 'up' ? 'active border-green-400 bg-green-400/20' : 'border-green-400/40 bg-green-400/10'
                }`}
                onClick={() => updatePipeFloorConnection(connection.id, { direction: 'up' })}
              >
                ⬆️ Up
              </button>
              <button
                className={`sci-fi-button py-2 px-3 ${
                  connection.direction === 'down' ? 'active border-red-400 bg-red-400/20' : 'border-red-400/40 bg-red-400/10'
                }`}
                onClick={() => updatePipeFloorConnection(connection.id, { direction: 'down' })}
              >
                ⬇️ Down
              </button>
            </div>
          </div>
          
          {/* Cost */}
          <div className="glass-panel p-4 bg-blue-500/5 border-blue-400/20">
            <div className="text-sm font-medium text-blue-300 mb-3">Build Cost</div>
            <div className="font-bold text-slate-200 text-lg">{connection.cost} points</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Railway Segment Properties
  if (selectedRailwaySegment && railwaySegments[selectedRailwaySegment]) {
    const segment = railwaySegments[selectedRailwaySegment];
    
    return (
      <div 
        className={`w-full h-full flex flex-col overflow-hidden relative ${
          isMobile ? 'bg-slate-900/98 backdrop-blur-xl' : ''
        }`}
        style={{ width: effectiveWidth }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-slate-400/20">
          <div className="flex items-center justify-between">
            {isMobile && (
              <button
                onClick={handleClearSelection}
                className="sci-fi-button p-3 hover:bg-slate-700/50 min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h3 className="text-lg font-bold text-slate-300">Railway Segment</h3>
            <button
              onClick={() => {
                // Use proper reactive action that handles all railway relationships
                deleteRailwaySegment(selectedRailwaySegment);
                setSelectedRailwaySegment(null);
              }}
              className="sci-fi-button p-3 bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Segment Info */}
          <div className="glass-panel p-4 bg-slate-500/5 border-slate-400/20">
            <div className="text-sm font-medium text-slate-300 mb-3">Segment Information</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Type:</span>
                <span className="font-bold text-slate-200 capitalize">{segment.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Length:</span>
                <span className="font-bold text-slate-200">{segment.length.toFixed(1)}m</span>
              </div>
              {segment.fromStation && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">From Station:</span>
                  <span className="font-bold text-slate-200">
                    {buildings[segment.fromStation]?.type.replace(/_/g, ' ') || 'Unknown'}
                  </span>
                </div>
              )}
              {segment.toStation && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">To Station:</span>
                  <span className="font-bold text-slate-200">
                    {buildings[segment.toStation]?.type.replace(/_/g, ' ') || 'Unknown'}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Direction Settings */}
          <div className="glass-panel p-4 bg-slate-500/5 border-slate-400/20">
            <div className="text-sm font-medium text-slate-300 mb-3">Train Direction</div>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <button
                  className={`sci-fi-button py-2 px-2 text-sm ${
                    (segment.direction === 'forward' || !segment.direction) && segment.showArrows !== false
                      ? 'active border-green-400 bg-green-400/20'
                      : 'border-slate-400/40 bg-slate-400/10'
                  }`}
                  onClick={() => updateRailwaySegment(segment.id, { direction: 'forward', showArrows: true })}
                >
                  <div>→</div>
                  <div className="text-xs">Forward</div>
                </button>
                <button
                  className={`sci-fi-button py-2 px-2 text-sm ${
                    segment.direction === 'reverse' && segment.showArrows !== false
                      ? 'active border-red-400 bg-red-400/20'
                      : 'border-slate-400/40 bg-slate-400/10'
                  }`}
                  onClick={() => updateRailwaySegment(segment.id, { direction: 'reverse', showArrows: true })}
                >
                  <div>←</div>
                  <div className="text-xs">Reverse</div>
                </button>
                <button
                  className={`sci-fi-button py-2 px-2 text-sm ${
                    segment.direction === 'bidirectional' && segment.showArrows !== false
                      ? 'active border-blue-400 bg-blue-400/20'
                      : 'border-slate-400/40 bg-slate-400/10'
                  }`}
                  onClick={() => updateRailwaySegment(segment.id, { direction: 'bidirectional', showArrows: true })}
                >
                  <div>↔</div>
                  <div className="text-xs">Both</div>
                </button>
                <button
                  className={`sci-fi-button py-2 px-2 text-sm ${
                    segment.showArrows === false
                      ? 'active border-purple-400 bg-purple-400/20'
                      : 'border-slate-400/40 bg-slate-400/10'
                  }`}
                  onClick={() => updateRailwaySegment(segment.id, { showArrows: false })}
                >
                  <div>○</div>
                  <div className="text-xs">None</div>
                </button>
              </div>

              <div className="text-xs text-slate-400">
                {segment.showArrows === false && "Omnidirectional - no direction arrows shown"}
                {segment.showArrows !== false && segment.direction === 'forward' && "Trains will travel from start to end"}
                {segment.showArrows !== false && segment.direction === 'reverse' && "Trains will travel from end to start"}
                {segment.showArrows !== false && segment.direction === 'bidirectional' && "Trains can travel in both directions"}
                {segment.showArrows !== false && !segment.direction && "Default: forward direction"}
              </div>
            </div>
          </div>
          
          {/* Arrow Display Toggle */}
          <div className="glass-panel p-4 bg-slate-500/5 border-slate-400/20">
            <div className="text-sm font-medium text-slate-300 mb-3">Display Options</div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Show Direction Arrows</span>
              <button
                className={`sci-fi-button px-4 py-2 ${
                  segment.showArrows !== false
                    ? 'bg-green-500/20 border-green-400/40 text-green-300'
                    : 'bg-slate-500/20 border-slate-400/40 text-slate-300'
                }`}
                onClick={() => updateRailwaySegment(segment.id, { 
                  showArrows: segment.showArrows === false ? true : false 
                })}
              >
                {segment.showArrows !== false ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {segment.showArrows !== false 
                ? "Direction arrows are visible on the track" 
                : "Direction arrows are hidden"}
            </div>
          </div>
        </div>
        
        {/* Desktop Resize Handle */}
        {!isMobile && (
          <div
            ref={resizeRef}
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize bg-gradient-to-b from-slate-400/30 to-slate-400/30 hover:from-slate-400/50 hover:to-slate-400/50 transition-all z-20"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-12 flex flex-col justify-center items-center">
              <GripVertical size={12} className="text-slate-400/60" />
            </div>
          </div>
        )}
      </div>
    );
  }
  
 // Building Properties with enhanced mobile UX
  if (selectedBuilding && buildings[selectedBuilding]) {
    const building = buildings[selectedBuilding];
    const buildingDef = BUILDING_TYPES[building.type];
    
    return (
      <div 
        className={`w-full h-full flex flex-col overflow-hidden relative ${
          isMobile ? 'bg-slate-900/98 backdrop-blur-xl' : ''
        }`}
        style={{ width: effectiveWidth }}
        onTouchStart={handleSwipeStart}
        onTouchMove={handleSwipeMove}
        onTouchEnd={handleSwipeEnd}
      >
        {/* Mobile Header */}
        {isMobile && (
          <div className="flex-shrink-0 p-4 border-b border-orange-400/20 bg-gradient-to-r from-orange-500/10 to-orange-600/5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleClearSelection}
                className="sci-fi-button p-3 hover:bg-slate-700/50 min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="text-lg font-bold text-orange-300">Building</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleQuickAction('rotate')}
                  className="sci-fi-button p-3 bg-blue-500/20 border-blue-400/40 text-blue-300 hover:bg-blue-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
                >
                  <RotateCw size={16} />
                </button>
                <button
                  onClick={() => handleQuickAction('copy')}
                  className="sci-fi-button p-3 bg-green-500/20 border-green-400/40 text-green-300 hover:bg-green-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => handleQuickAction('delete')}
                  className="sci-fi-button p-3 bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            {/* Mobile Tabs with swipe support */}
            <div className="flex rounded-lg bg-slate-800/50 p-1">
              {[
                { id: 'basic', label: 'Info', icon: Info },
                { id: 'advanced', label: 'Edit', icon: Settings },
                { id: 'connections', label: 'Ports', icon: Settings }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1 py-3 px-2 rounded text-xs font-medium transition-all min-h-[48px] ${
                    activeTab === tab.id 
                      ? 'bg-orange-500/30 text-orange-200 border border-orange-400/50' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Swipe indicator */}
            <div className="flex justify-center mt-2 gap-1">
              {['basic', 'advanced', 'connections'].map((tab, _index) => (
                <div
                  key={tab}
                  className={`w-2 h-2 rounded-full transition-all ${
                    activeTab === tab ? 'bg-orange-400' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <div className="flex-shrink-0 p-4 border-b border-orange-400/20">
            <h3 className="text-lg font-bold text-orange-300">Building Properties</h3>
          </div>
        )}
        
        {/* Content with swipe animation */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <div key={activeTab} className="h-full overflow-y-auto">
              {activeTab === 'basic' && (
                <div className="p-4 space-y-6">
                  {/* Type */}
                  <div className={`${panelClass} p-4 bg-orange-500/5 border-orange-400/20`}>
                    <div className="text-sm font-medium text-orange-300 mb-3">Building Type</div>
                    <div className="space-y-2">
                      <div className="font-bold text-slate-200 text-base">{buildingDef?.name || building.type}</div>
                      <div className="text-sm text-slate-400">Category: {buildingDef?.category}</div>
                    </div>
                  </div>

                  {/* Train Station Name */}
                  {(building.type === 'train_station' || building.type === 'freight_platform' || building.type === 'fluid_freight_platform') && (
                    <div className={`${panelClass} p-4 bg-blue-500/5 border-blue-400/20`}>
                      <div className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
                        🚂 Station Name
                      </div>
                      <input
                        type="text"
                        placeholder="Enter station name..."
                        value={building.text || ''}
                        onChange={(e) => updateBuilding(selectedBuilding, {
                          text: e.target.value || undefined
                        })}
                        className="sci-fi-input w-full bg-blue-500/10 border-blue-400/30 text-slate-200 placeholder-slate-500"
                        maxLength={50}
                      />
                      <div className="mt-2 text-xs text-slate-400">
                        {building.text ? 
                          '✅ Custom name will be displayed above the station' : 
                          '💡 Add a custom name to identify this station'
                        }
                      </div>
                    </div>
                  )}

                  {/* Floor & Height */}
                  <div className={`${panelClass} p-4 bg-orange-500/5 border-orange-400/20`}>
                    <div className="text-sm font-medium text-orange-300 mb-3">Floor & Height</div>
                    <div className="space-y-2">
                      <div className="font-bold text-slate-200 text-base">Floor {building.floor}</div>
                      <div className="text-sm text-slate-400">Base elevation: {building.z.toFixed(1)}m</div>
                      <div className="text-sm text-slate-400">Building height: {buildingDef.depth}m</div>
                      <div className="text-sm text-orange-300">
                        Top reaches: {(building.z + buildingDef.depth).toFixed(1)}m 
                        {buildingDef.depth > FLOOR_HEIGHT && (
                          <span className="text-yellow-400">
                            {' '}(Floor {Math.floor((building.z + buildingDef.depth) / FLOOR_HEIGHT)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Size */}
                  <div className={`${panelClass} p-4 bg-orange-500/5 border-orange-400/20`}>
                    <div className="text-sm font-medium text-orange-300 mb-3">Dimensions</div>
                    <div className="font-mono font-bold text-slate-200 text-base">
                      {buildingDef.width} × {buildingDef.height} × {buildingDef.depth}m
                    </div>
                  </div>

                  {/* Rotation */}
                  <div className={`${panelClass} p-4 bg-orange-500/5 border-orange-400/20`}>
                    <div className="text-sm font-medium text-orange-300 mb-3">Rotation</div>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-200 text-base">{building.rotation}°</div>
                      {isMobile && (
                        <button
                          onClick={() => handleQuickAction('rotate')}
                          className="sci-fi-button p-3 bg-blue-500/20 border-blue-400/40 text-blue-300 hover:bg-blue-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center"
                        >
                          <RotateCw size={20} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resource Selection - for extraction buildings (miners, extractors) */}
                  {isExtractionBuilding(building.type) && (
                    <div className={`${panelClass} p-4 bg-orange-500/5 border-orange-400/20`}>
                      <div className="text-sm font-medium text-orange-300 mb-3 flex items-center gap-2">
                        <Pickaxe size={16} />
                        Extracted Resource
                      </div>

                      <ResourceSelector
                        buildingType={building.type}
                        selectedResourceId={building.extractedResourceId || null}
                        clockSpeed={building.clockSpeed || 100}
                        onSelect={(resourceId) => setExtractedResource(selectedBuilding, resourceId)}
                      />

                      {/* Resource Extraction Details */}
                      <div className="mt-4 pt-4 border-t border-orange-400/20">
                        <ResourceExtractionDetails
                          buildingType={building.type}
                          resourceId={building.extractedResourceId || null}
                          clockSpeed={building.clockSpeed || 100}
                        />
                      </div>

                      {/* Clock Speed Control for extractors */}
                      <div className="mt-4 pt-4 border-t border-orange-400/20">
                        <div className="text-sm font-medium text-orange-300 mb-3">Clock Speed</div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="1"
                            max="250"
                            value={building.clockSpeed || 100}
                            onChange={(e) => setClockSpeed(selectedBuilding, parseInt(e.target.value))}
                            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-400"
                          />
                          <div className="w-16 text-right">
                            <span className="font-mono text-orange-300 font-bold">
                              {building.clockSpeed || 100}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-slate-500">
                          <span>1%</span>
                          <span>100%</span>
                          <span>250%</span>
                        </div>
                        {(building.clockSpeed || 100) > 100 && (
                          <div className="mt-2 text-xs text-yellow-400">
                            Overclocking requires Power Shards
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recipe Selection - for production buildings */}
                  {buildingSupportsRecipes(building.type) && (
                    <div className={`${panelClass} p-4 bg-green-500/5 border-green-400/20`}>
                      <div className="text-sm font-medium text-green-300 mb-3 flex items-center gap-2">
                        <FlaskConical size={16} />
                        Production Recipe
                      </div>

                      <RecipeDropdown
                        buildingType={building.type}
                        selectedRecipeId={building.selectedRecipeId || null}
                        onSelect={(recipeId) => setSelectedRecipe(selectedBuilding, recipeId)}
                      />

                      {/* Recipe Details */}
                      {building.selectedRecipeId && RECIPES[building.selectedRecipeId] && (
                        <div className="mt-4 pt-4 border-t border-green-400/20">
                          <RecipeDetails
                            recipe={RECIPES[building.selectedRecipeId]}
                            clockSpeed={building.clockSpeed || 100}
                          />
                        </div>
                      )}

                      {/* No recipe selected message */}
                      {!building.selectedRecipeId && (
                        <div className="mt-3 p-3 bg-slate-800/50 rounded-lg text-center">
                          <div className="text-sm text-slate-400">
                            Select a recipe to calculate production rates
                          </div>
                        </div>
                      )}

                      {/* Clock Speed Control */}
                      {building.selectedRecipeId && (
                        <div className="mt-4 pt-4 border-t border-green-400/20">
                          <div className="text-sm font-medium text-green-300 mb-3">Clock Speed</div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="1"
                              max="250"
                              value={building.clockSpeed || 100}
                              onChange={(e) => setClockSpeed(selectedBuilding, parseInt(e.target.value))}
                              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-400"
                            />
                            <div className="w-16 text-right">
                              <span className="font-mono text-green-300 font-bold">
                                {building.clockSpeed || 100}%
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex justify-between text-xs text-slate-500">
                            <span>1%</span>
                            <span>100%</span>
                            <span>250%</span>
                          </div>
                          {(building.clockSpeed || 100) > 100 && (
                            <div className="mt-2 text-xs text-yellow-400">
                              Overclocking requires Power Shards
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Station Resource Configuration - for freight platforms */}
                  {(building.type === 'freight_platform' || building.type === 'fluid_freight_platform') && (
                    <div className={`${panelClass} p-4 bg-cyan-500/5 border-cyan-400/20`}>
                      <StationResourceSelector
                        buildingType={building.type}
                        currentConfig={building.stationResourceConfig || null}
                        onConfigChange={(config) => setStationResourceConfig(selectedBuilding, config)}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="p-4 space-y-6">
                  {/* Train Station Name Input */}
                  {(building.type === 'train_station' || building.type === 'freight_platform' || building.type === 'fluid_freight_platform') && (
                    <div className={`${panelClass} p-4 bg-orange-500/5 border-orange-400/20`}>
                      <div className="text-sm font-medium text-orange-300 mb-3 flex items-center gap-2">
                        🚂 Station Name
                      </div>
                      <input
                        type="text"
                        placeholder="Enter station name..."
                        value={building.text || ''}
                        onChange={(e) => updateBuilding(selectedBuilding, {
                          text: e.target.value || undefined
                        })}
                        className="sci-fi-input w-full bg-orange-500/10 border-orange-400/30 text-slate-200 placeholder-slate-500"
                        maxLength={50}
                      />
                      <div className="mt-2 text-xs text-slate-400">
                        Custom name will be displayed above the station
                      </div>
                    </div>
                  )}

                  {/* Position with mobile-friendly inputs */}
                  <div className="space-y-4">
                    <MobileInput
                      label="X Position"
                      value={building.x}
                      onChange={(value) => updateBuilding(selectedBuilding, {
                        x: Math.round(value / GRID_SIZE) * GRID_SIZE
                      })}
                      step={GRID_SIZE}
                      unit="meters"
                    />
                    <MobileInput
                      label="Y Position"
                      value={building.y}
                      onChange={(value) => updateBuilding(selectedBuilding, {
                        y: Math.round(value / GRID_SIZE) * GRID_SIZE
                      })}
                      step={GRID_SIZE}
                      unit="meters"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'connections' && (
                <div className="p-4 space-y-6">
                  {/* Connection Points */}
                  <div>
                    <h4 className="font-bold text-orange-300 mb-4 flex items-center gap-2 text-lg">
                      <span>🔌</span>
                      Connection Points
                    </h4>
                    <div className="space-y-4">
                      {buildingDef.connectionPoints.length > 0 ? buildingDef.connectionPoints.map((cp) => (
                        <div 
                          key={cp.id}
                          className={`${panelClass} p-4 flex items-center gap-4 ${
                            cp.isFluid ? 'bg-blue-500/5 border-blue-400/20' : 'bg-orange-500/5 border-orange-400/20'
                          }`}
                        >
                          <div className={`${isMobile ? 'w-8 h-8' : 'w-6 h-6'} rounded-full flex-shrink-0 flex items-center justify-center ${
                            cp.isFluid 
                              ? 'bg-blue-500 shadow-lg shadow-blue-500/50' 
                              : cp.type === 'input' 
                                ? 'bg-orange-500 shadow-lg shadow-orange-500/50' 
                                : cp.type === 'output'
                                  ? 'bg-green-500 shadow-lg shadow-green-500/50'
                                  : 'bg-yellow-500 shadow-lg shadow-yellow-500/50'
                          }`}>
                            {cp.isFluid ? '💧' : '⚙️'}
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium ${isMobile ? 'text-base' : 'text-sm'} text-slate-200 capitalize flex items-center gap-2`}>
                              {cp.isFluid ? 'Fluid ' : ''}{cp.type}
                              {cp.isFluid && <span className="text-xs bg-blue-500/20 px-2 py-1 rounded">FLUID</span>}
                            </div>
                            <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-slate-400 mt-1`}>
                              📍 {cp.side} side
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className={`${panelClass} p-6 text-center text-slate-500`}>
                          <div className="text-2xl mb-2">🚫</div>
                          <div className="text-lg">No connection points</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Railway connection points */}
                  {buildingDef.railwayPoints && buildingDef.railwayPoints.length > 0 && (
                    <div className="border-t border-slate-400/20 pt-6">
                      <h4 className="font-bold text-slate-300 mb-4 flex items-center gap-2 text-lg">
                        <span>🚂</span>
                        Railway Connections
                      </h4>
                      <div className="space-y-4">
                        {buildingDef.railwayPoints.map((rp) => (
                          <div 
                            key={rp.id}
                            className={`${panelClass} p-4 flex items-center gap-4 bg-slate-500/5 border-slate-400/20`}
                          >
                            <div className={`${isMobile ? 'w-8 h-4' : 'w-6 h-3'} bg-slate-600 rounded flex-shrink-0 shadow-lg shadow-slate-600/50`} />
                            <div className="flex-1">
                              <div className={`font-medium ${isMobile ? 'text-base' : 'text-sm'} text-slate-200`}>
                                🚂 Railway {rp.direction}
                              </div>
                              <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-slate-400 mt-1`}>
                                📍 {rp.side} side
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </AnimatePresence>
        </div>
        
        {/* Desktop Resize Handle */}
        {!isMobile && (
          <div
            ref={resizeRef}
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize bg-gradient-to-b from-orange-400/30 to-orange-400/30 hover:from-orange-400/50 hover:to-orange-400/50 transition-all z-20"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-12 flex flex-col justify-center items-center">
              <GripVertical size={12} className="text-orange-400/60" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default Help State with better mobile UX
  return (
    <div 
      className={`w-full h-full flex flex-col overflow-hidden relative bg-slate-800 ${
        isMobile ? 'bg-slate-900/98 backdrop-blur-xl' : ''
      }`}
      style={{ width: effectiveWidth }}
    >
      {/* Mobile Header */}
      {isMobile && (
        <div className="flex-shrink-0 p-4 border-b border-orange-400/20">
          <h3 className="text-lg font-bold gradient-text">Help & Tips</h3>
        </div>
      )}

      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center py-8">
          <div className="text-3xl mb-4">📋</div>
          <div className="text-slate-400 mb-6 text-base">
            {isMobile ? 
              'Select something to edit properties' :
              'Select a building, pole, or pipe support to view properties'
            }
          </div>
          
          <div className={`${panelClass} p-6 text-left max-w-md mx-auto`}>
            <h4 className="font-bold text-orange-300 mb-4 text-center">Quick Tips</h4>
            <div className="space-y-4 text-sm text-slate-300">
              {(isMobile ? [
                { icon: '👆', text: 'Tap objects to select them' },
                { icon: '👈👉', text: 'Swipe tabs to access all settings' },
                { icon: '🔄', text: 'Use action buttons for quick edits' },
                { icon: '📱', text: 'Larger touch targets for mobile' }
              ] : [
                { icon: '🖱️', text: 'Click objects to select them' },
                { icon: '🔄', text: 'Mouse wheel over selected buildings to rotate' },
                { icon: '⌨️', text: 'Delete key to remove selected items' },
                { icon: '🎯', text: 'Drag buildings to move them around' }
              ]).map((tip, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 ${panelClass} bg-orange-500/5`}
                >
                  <span className="text-lg">{tip.icon}</span>
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Desktop Resize Handle */}
      {!isMobile && (
        <div
          ref={resizeRef}
          className="absolute top-0 left-0 w-1 h-full cursor-col-resize bg-gradient-to-b from-orange-400/30 to-orange-400/30 hover:from-orange-400/50 hover:to-orange-400/50 transition-all z-20"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-12 flex flex-col justify-center items-center">
            <GripVertical size={12} className="text-orange-400/60" />
          </div>
        </div>
      )}
    </div>
  );
}
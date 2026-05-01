/**
 * Adaptive Factory Canvas - Uses renderer abstraction to work with both Konva and WebGL
 * Maintains all existing functionality while supporting GPU acceleration
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Activity } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

// Renderer abstraction imports
import { useRendererAdapter } from '../../hooks/useRendererAdapter';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';

// Layer components (will be updated to use adapters)
import { AdaptiveStaticBackgroundLayer } from './layers/AdaptiveStaticBackgroundLayer';
import { AdaptiveFloorBelowLayer } from './layers/AdaptiveFloorBelowLayer';
import { AdaptiveMainContentLayer } from './layers/AdaptiveMainContentLayer';
import { AdaptiveStickyNotesLayer } from './layers/AdaptiveStickyNotesLayer';
import { AdaptiveAuxiliaryLayer } from './layers/AdaptiveAuxiliaryLayer';
import { AdaptiveUIOverlayLayer } from './layers/AdaptiveUIOverlayLayer';

// Drawing preview components (will be updated)
import { AdaptiveRailwayDrawingPreview } from './AdaptiveRailwayDrawingPreview';
import { AdaptivePowerlineDrawingPreview } from './AdaptivePowerlineDrawingPreview';
import { AdaptiveConveyorDrawingPreview } from './AdaptiveConveyorDrawingPreview';
import { AdaptivePipeDrawingPreview } from './AdaptivePipeDrawingPreview';

// UI components
import { OverlayToolbar } from '../UI/OverlayToolbar';
import { MobileDrawingControls } from '../UI/MobileDrawingControls';

// Store and utilities
import { useLayoutStore } from '../../store/layoutStore';
import { 
  useRenderingData,
  useDrawingState, 
  useUIState,
  useSelectionState,
  useBuildingsArray
} from '../../store/performanceSelectors';
import { usePerformanceMode } from '../../hooks/usePerformanceMode';
import { useOptimizedCallbacks, useStableMemo, useMemoizedCallback } from "../../hooks/useOptimizedCallbacks";
import { useViewportSystem } from '../../hooks/useViewportSystem';

// Types and constants
import { Building, Point3D } from '../../types';
import { snapToGrid, snapPointToGrid } from '../../utils/helpers';
import { detectNearbyStations, snapBuildingToStation, isTrainStation, StationSnapVisualIndicator } from '../../utils/stationSnapping';
import { 
  BUILDING_TYPES, 
  PIXELS_PER_METER, 
  GRID_SIZE, 
  CANVAS_HEIGHT, 
  MIN_ZOOM, 
  MAX_ZOOM, 
  FLOOR_HEIGHT,
  BUILDING_RAILWAY_SNAP_THRESHOLD
} from '../../constants';

// Performance utilities
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function createSmoothZoom() {
  let animationId: number | null = null;
  
  return {
    cancel: () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    start: (fromScale: number, toScale: number, duration: number, onUpdate: (scale: number) => void, onComplete?: () => void) => {
      const startTime = performance.now();
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing function
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentScale = fromScale + (toScale - fromScale) * eased;
        
        onUpdate(currentScale);
        
        if (progress < 1) {
          animationId = requestAnimationFrame(animate);
        } else {
          animationId = null;
          onComplete?.();
        }
      };
      
      animationId = requestAnimationFrame(animate);
    }
  };
}

interface AdaptiveFactoryCanvasProps {
  onPositionChange?: (x: number, y: number) => void;
  onZoomChange?: (scale: number) => void;
  leftPanelWidth?: number;
  rightPanelWidth?: number;
}

export const AdaptiveFactoryCanvas: React.FC<AdaptiveFactoryCanvasProps> = ({ 
  onPositionChange, 
  onZoomChange, 
  leftPanelWidth, 
  rightPanelWidth 
}) => {
  // Container ref for renderer
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDraggingRef, setIsDraggingRef] = useState(false);
  
  // Canvas sizing
  const [canvasSize, setCanvasSize] = useState(() => {
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) {
      const estimatedLeftPanel = leftPanelWidth || 350;
      const estimatedRightPanel = rightPanelWidth || 400;
      const buffer = 20;
      const calculatedWidth = window.innerWidth - estimatedLeftPanel - estimatedRightPanel - buffer;
      const calculatedHeight = window.innerHeight - 120;
      
      return { 
        width: Math.max(100, calculatedWidth), 
        height: Math.max(100, calculatedHeight)
      };
    }
    return { 
      width: Math.max(100, window.innerWidth), 
      height: Math.max(100, CANVAS_HEIGHT) 
    };
  });

  // Drag and interaction state
  const [dragOver, setDragOver] = useState(false);
  const [dragValidation, setDragValidation] = useState<{ isValid: boolean; buildingType: string } | null>(null);
  const [stationSnapIndicator, setStationSnapIndicator] = useState<StationSnapVisualIndicator | null>(null);
  const [isMobile, setIsMobile] = useState(isTouchDevice());
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Performance mode
  const { config } = usePerformanceMode();
  const [renderQuality, setRenderQuality] = useState(1);

  // Touch interaction state
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [showRailwayDebug, setShowRailwayDebug] = useState(false);
  const [touchStartDistance, setTouchStartDistance] = useState(0);
  const [touchStartScale, setTouchStartScale] = useState(1);

  // Constants
  const TOUCH_MOVE_THRESHOLD = 10;
  const TOUCH_DRAG_TIME_THRESHOLD = 150;

  // Initialize renderer adapter
  const {
    adapter,
    isLoading: adapterLoading,
    error: adapterError,
    rendererType,
    capabilities,
    stats,
    enableInstancedRendering,
    setLODConfig,
    getCurrentLOD,
    flushBatchedOperations
  } = useRendererAdapter(containerRef.current, {
    enableBatching: true,
    enableInstancedRendering: capabilities?.supportsInstancedRendering,
    lodConfig: {
      lowDetail: 0.5,
      mediumDetail: 1.0,
      highDetail: 2.0
    },
    instancedConfig: {
      maxInstances: 5000,
      bufferSize: 8192,
      updateFrequency: 16
    }
  });

  // Store selectors
  const {
    buildings,
    conveyorPoles,
    conveyorBelts,
    conveyorLifts,
    pipeSupports,
    pipelines,
    pipeFloorConnections,
    stickyNotes,
    railways,
    powerlines,
    powerPoles,
    foundations,
    walls,
    railings
  } = useLayoutStore(useShallow((state) => ({
    buildings: state.buildings,
    conveyorPoles: state.conveyorPoles,
    conveyorBelts: state.conveyorBelts,
    conveyorLifts: state.conveyorLifts,
    pipeSupports: state.pipeSupports,
    pipelines: state.pipelines,
    pipeFloorConnections: state.pipeFloorConnections,
    stickyNotes: state.stickyNotes,
    railways: state.railways,
    powerlines: state.powerlines,
    powerPoles: state.powerPoles,
    foundations: state.foundations,
    walls: state.walls,
    railings: state.railings
  })));

  const drawingState = useDrawingState();
  const uiState = useUIState();
  const selectionState = useSelectionState();

  // Smooth zoom utility
  const smoothZoom = useMemo(() => createSmoothZoom(), []);

  // Optimized grid snapping
  const snapToGridOptimized = useMemoizedCallback((pos: { x: number; y: number }, currentScale: number) => {
    const gridSize = GRID_SIZE * Math.max(currentScale, 0.01);
    const invGridSize = 1 / gridSize;
    
    return {
      x: Math.round(pos.x * invGridSize) * gridSize,
      y: Math.round(pos.y * invGridSize) * gridSize,
    };
  }, []);

  // Performance optimization based on renderer capabilities
  useEffect(() => {
    if (!adapter) return;

    // Configure LOD based on current scale
    const currentLOD = getCurrentLOD(scale);
    
    // Auto-optimize for performance
    if (capabilities.supportsInstancedRendering) {
      const buildingCount = buildings.length;
      const shouldUseInstancing = buildingCount > 100;
      
      enableInstancedRendering(shouldUseInstancing);
    }

    // Adjust render quality based on performance
    if (stats) {
      const { fps } = stats;
      if (fps < 30 && renderQuality > 0.5) {
        setRenderQuality(0.5); // Reduce quality for better performance
      } else if (fps > 50 && renderQuality < 1) {
        setRenderQuality(1); // Restore quality when performance is good
      }
    }
  }, [adapter, scale, capabilities, stats, buildings.length, renderQuality]);

  // Viewport system integration
  const {
    viewportTransform,
    updateViewport,
    screenToWorld,
    worldToScreen,
    isPointInViewport,
    getVisibleBounds
  } = useViewportSystem({
    width: canvasSize.width,
    height: canvasSize.height,
    scale,
    position: { x: position.x, y: position.y },
    onViewportChange: (transform) => {
      // Update renderer viewport
      if (adapter) {
        adapter.getRenderer().setViewport({
          x: transform.x,
          y: transform.y,
          width: canvasSize.width,
          height: canvasSize.height
        });
        adapter.getRenderer().setTransform({
          scale: transform.scale,
          x: transform.x,
          y: transform.y
        });
      }
    }
  });

  // Resize handling
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      if (isDesktop) {
        const estimatedLeftPanel = leftPanelWidth || 350;
        const estimatedRightPanel = rightPanelWidth || 400;
        const buffer = 20;
        const calculatedWidth = window.innerWidth - estimatedLeftPanel - estimatedRightPanel - buffer;
        const calculatedHeight = window.innerHeight - 120;
        
        setCanvasSize({ 
          width: Math.max(100, calculatedWidth), 
          height: Math.max(100, calculatedHeight)
        });
      } else {
        setCanvasSize({ 
          width: Math.max(100, window.innerWidth), 
          height: Math.max(100, CANVAS_HEIGHT) 
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [leftPanelWidth, rightPanelWidth]);

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(scale * 1.2, MAX_ZOOM);
    setScale(newScale);
    onZoomChange?.(newScale);
  }, [scale, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(scale / 1.2, MIN_ZOOM);
    setScale(newScale);
    onZoomChange?.(newScale);
  }, [scale, onZoomChange]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const scaleBy = 1.1;
    const stage = adapter?.getRenderer();
    if (!stage) return;

    const oldScale = scale;
    const pointer = { x: e.clientX, y: e.clientY };
    
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const newScale = e.deltaY > 0 ? 
      Math.max(oldScale / scaleBy, MIN_ZOOM) : 
      Math.min(oldScale * scaleBy, MAX_ZOOM);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setScale(newScale);
    setPosition(newPos);
    onPositionChange?.(newPos.x, newPos.y);
    onZoomChange?.(newScale);
  }, [scale, position, onPositionChange, onZoomChange, adapter]);

  // Stage event handlers for renderer abstraction
  const stageEvents = {
    onWheel: handleWheel,
    onPointerDown: (e: any) => {
      // Handle pointer events through adapter
      if (adapter) {
        // Convert to adapter event format if needed
      }
    },
    onPointerMove: (e: any) => {
      // Handle pointer move events
    },
    onPointerUp: (e: any) => {
      // Handle pointer up events
    },
    onContextMenu: (e: any) => {
      e.preventDefault();
    }
  };

  // Render loading state
  if (adapterLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100">
        <div className="text-center">
          <Activity className="animate-spin w-8 h-8 mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Initializing {rendererType || 'renderer'}...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (adapterError) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-red-50">
        <div className="text-center">
          <p className="text-red-600 mb-2">Renderer Error:</p>
          <p className="text-red-800 text-sm">{adapterError}</p>
          <p className="text-red-600 text-xs mt-2">Falling back to basic rendering...</p>
        </div>
      </div>
    );
  }

  // Render main canvas
  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-100">
      {/* Renderer container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ width: canvasSize.width, height: canvasSize.height }}
      >
        {adapter && adapter.createStage({
          width: canvasSize.width,
          height: canvasSize.height,
          scale: { x: scale, y: scale },
          x: position.x,
          y: position.y,
          draggable: false,
          events: stageEvents,
          children: (
            <>
              {/* Background Layer */}
              {adapter.createLayer({
                id: 'background-layer',
                listening: false,
                children: (
                  <AdaptiveStaticBackgroundLayer 
                    adapter={adapter}
                    scale={scale}
                    position={position}
                    canvasSize={canvasSize}
                  />
                )
              })}

              {/* Floor Below Layer */}
              {adapter.createLayer({
                id: 'floor-below-layer',
                children: (
                  <AdaptiveFloorBelowLayer 
                    adapter={adapter}
                    scale={scale}
                    currentFloor={uiState.currentFloor}
                    buildings={buildings}
                    foundations={foundations}
                    walls={walls}
                    railings={railings}
                  />
                )
              })}

              {/* Main Content Layer */}
              {adapter.createLayer({
                id: 'main-content-layer',
                children: (
                  <AdaptiveMainContentLayer 
                    adapter={adapter}
                    scale={scale}
                    currentFloor={uiState.currentFloor}
                    buildings={buildings}
                    conveyorPoles={conveyorPoles}
                    conveyorBelts={conveyorBelts}
                    conveyorLifts={conveyorLifts}
                    pipeSupports={pipeSupports}
                    pipelines={pipelines}
                    pipeFloorConnections={pipeFloorConnections}
                    railways={railways}
                    powerlines={powerlines}
                    powerPoles={powerPoles}
                    foundations={foundations}
                    walls={walls}
                    railings={railings}
                    selectedIds={selectionState.selectedIds}
                    renderQuality={renderQuality}
                  />
                )
              })}

              {/* Sticky Notes Layer */}
              {adapter.createLayer({
                id: 'sticky-notes-layer',
                children: (
                  <AdaptiveStickyNotesLayer 
                    adapter={adapter}
                    stickyNotes={stickyNotes}
                    currentFloor={uiState.currentFloor}
                    selectedIds={selectionState.selectedIds}
                  />
                )
              })}

              {/* Drawing Preview Layer */}
              {adapter.createLayer({
                id: 'drawing-preview-layer',
                children: (
                  <>
                    {drawingState.isDrawingConveyor && (
                      <AdaptiveConveyorDrawingPreview adapter={adapter} />
                    )}
                    {drawingState.isDrawingPipe && (
                      <AdaptivePipeDrawingPreview adapter={adapter} />
                    )}
                    {drawingState.isDrawingRailway && (
                      <AdaptiveRailwayDrawingPreview adapter={adapter} />
                    )}
                    {drawingState.isDrawingPowerline && (
                      <AdaptivePowerlineDrawingPreview adapter={adapter} />
                    )}
                  </>
                )
              })}

              {/* Auxiliary Layer */}
              {adapter.createLayer({
                id: 'auxiliary-layer',
                children: (
                  <AdaptiveAuxiliaryLayer 
                    adapter={adapter}
                    stationSnapIndicator={stationSnapIndicator}
                    dragValidation={dragValidation}
                    showRailwayDebug={showRailwayDebug}
                  />
                )
              })}

              {/* UI Overlay Layer */}
              {adapter.createLayer({
                id: 'ui-overlay-layer',
                listening: false,
                children: (
                  <AdaptiveUIOverlayLayer 
                    adapter={adapter}
                    rendererStats={stats}
                    rendererType={rendererType}
                    capabilities={capabilities}
                  />
                )
              })}
            </>
          )
        })}
      </div>

      {/* UI Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleZoomIn}
          className="bg-white shadow-lg rounded-lg p-2 hover:bg-gray-50"
          disabled={scale >= MAX_ZOOM}
        >
          <ZoomIn className="w-5 h-5" />
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleZoomOut}
          className="bg-white shadow-lg rounded-lg p-2 hover:bg-gray-50"
          disabled={scale <= MIN_ZOOM}
        >
          <ZoomOut className="w-5 h-5" />
        </motion.button>

        {/* Renderer Info */}
        {stats && (
          <div className="bg-white shadow-lg rounded-lg p-2 text-xs">
            <div className="text-gray-600">Renderer: {rendererType}</div>
            <div className="text-gray-600">FPS: {Math.round(stats.fps)}</div>
            {capabilities.supportsGPURendering && (
              <div className="text-green-600">GPU: Active</div>
            )}
          </div>
        )}
      </div>

      {/* Overlay Toolbar */}
      <OverlayToolbar />

      {/* Mobile Controls */}
      {isMobile && <MobileDrawingControls />}
    </div>
  );
};

export default AdaptiveFactoryCanvas;
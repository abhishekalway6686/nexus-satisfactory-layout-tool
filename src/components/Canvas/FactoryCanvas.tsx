// src/components/Canvas/FactoryCanvas.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo, useTransition } from 'react';
import { Stage, Layer, Circle, Group, Line } from 'react-konva';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { GridBackground } from './GridBackground';
import { BuildingShape } from '../Buildings/BuildingShape';
import { ConveyorPoleShape } from '../Conveyors/ConveyorPoleShape';
import { ConveyorBeltShape } from '../Conveyors/ConveyorBeltShape';
import { ConveyorLiftShape } from '../Conveyors/ConveyorLiftShape';
import { PipeSupportShape } from '../Pipes/PipeSupportShape';
import { PipelineShape } from '../Pipes/PipelineShape';
import { PipeFloorConnectionShape } from '../Pipes/PipeFloorConnectionShape';
import { StickyNoteShape } from '../StickyNotes/StickyNoteShape';
import { RailwayShape } from '../Transport/RailwayShape';
import { PowerlineShape } from '../Transport/PowerlineShape';
import { PowerPoleShape } from '../Transport/PowerPoleShape';
import { RailwayDebugOverlay } from '../Transport/RailwayDebugOverlay';
import { FoundationShape } from '../Architecture/FoundationShape';
import { WallShape } from '../Architecture/WallShape';
import { RailingShape } from '../Architecture/RailingShape';
import { RailwayDrawingPreview } from './RailwayDrawingPreview';
import { PowerlineDrawingPreview } from './PowerlineDrawingPreview';
import { ConveyorDrawingPreview } from './ConveyorDrawingPreview';
import { PipeDrawingPreview } from './PipeDrawingPreview';
import { FoundationDrawingPreview } from './FoundationDrawingPreview';
import { WallDrawingPreview } from './WallDrawingPreview';
import { RailingDrawingPreview } from './RailingDrawingPreview';
import { StationSnapIndicator } from './StationSnapIndicator';
import { OverlayToolbar } from '../UI/OverlayToolbar';
import { MobileDrawingControls } from '../UI/MobileDrawingControls';
import { BackgroundLayer } from './Layers/BackgroundLayer';
import { MainContentLayer } from './Layers/MainContentLayer';
import { StickyNotesLayer } from './Layers/StickyNotesLayer';
import { OverlayLayer } from './Layers/OverlayLayer';
import { ProductionOverlayLayer } from './Layers/ProductionOverlayLayer';
import { useLayoutStore } from '../../store/layoutStore';
import {
  useRenderingData,
  useDrawingState,
  useUIState,
  useSelectionState,
  useBuildingsArray
} from '../../store/performanceSelectors';
import { createNodeAtPoint } from '../../logic/railway';
import { usePerformanceMode } from '../../hooks/usePerformanceMode';
import { useOptimizedCallbacks, useStableMemo, useMemoizedCallback, useOptimizedHandlers } from "../../hooks/useOptimizedCallbacks";
import { useViewportSystem } from '../../hooks/useViewportSystem';
import { startBuildingDrag, endBuildingDrag } from '../../store/buildingDragOptimization';
import { ConveyorPole, Building, PipeSupport, Point3D, ConveyorLift, PipeFloorConnection, PowerPole } from '../../types';
import { snapToGrid, snapPointToGrid, detectWallSnap, calculateWallAlignedRotation, isPlacementBlockedByBuildingBelow, getTallBuildingsExtendingToFloor } from '../../utils/helpers';
import { detectNearbyStations, snapBuildingToStation, isTrainStation, StationSnapVisualIndicator } from '../../utils/stationSnapping';
import {
  BUILDING_TYPES,
  PIXELS_PER_METER,
  GRID_SIZE,
  FOUNDATION_SIZE,
  CANVAS_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  FLOOR_HEIGHT,
  CONVEYOR_LIFT_BASE_COSTS,
  PIPE_FLOOR_CONNECTION_BASE_COSTS,
  BUILDING_RAILWAY_SNAP_THRESHOLD
} from '../../constants';

interface AnimatedButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  className,
  onClick,
  type = 'button'
}) => {
  // PERFORMANCE FIX: Replace Framer Motion with CSS transitions
  // This eliminates 40-50ms of motion.button reconciliation overhead
  return (
    <button
      className={`${className} transition-all duration-150 hover:scale-110 active:scale-95`}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
};

// PERFORMANCE FIX: Optimized throttle utilities with RAF for smoother animation
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  let lastCallTime = 0;
  
  return function(this: any, ...args: any[]) {
    const context = this;
    const now = performance.now();
    
    if (!inThrottle || now - lastCallTime >= limit) {
      lastCallTime = now;
      inThrottle = true;
      
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        func.apply(context, args);
        inThrottle = false;
      });
    }
  }
};

// PERFORMANCE FIX: Debounced expensive operations to prevent 8fps regression
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return function(this: any) {
    const args = arguments;
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(context, args), delay);
  };
};

// Smooth zoom - direct execution for responsive scrollwheel zooming
// Removed throttling that was causing step-by-step feel
const createSmoothZoom = () => {
  return (scale: number, position: { x: number; y: number }, callback: (scale: number, pos: { x: number; y: number }) => void, onComplete?: () => void) => {
    // Execute zoom immediately for responsive feel
    callback(scale, position);
    if (onComplete) {
      // Schedule completion callback for next frame
      requestAnimationFrame(onComplete);
    }
  };
};

// Memoized components for better performance
const MemoizedBuildingShape = React.memo(BuildingShape);
const MemoizedConveyorPoleShape = React.memo(ConveyorPoleShape);
const MemoizedConveyorBeltShape = React.memo(ConveyorBeltShape);
const MemoizedConveyorLiftShape = React.memo(ConveyorLiftShape);
const MemoizedPipeSupportShape = React.memo(PipeSupportShape);
const MemoizedPipelineShape = React.memo(PipelineShape);
const MemoizedPipeFloorConnectionShape = React.memo(PipeFloorConnectionShape);
const MemoizedStickyNoteShape = React.memo(StickyNoteShape);
const MemoizedRailwayShape = React.memo(RailwayShape);
const MemoizedPowerlineShape = React.memo(PowerlineShape);
const MemoizedPowerPoleShape = React.memo(PowerPoleShape);

// Touch/mouse event helpers
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Performance-optimized store selectors using memoization
const useOptimizedStore = () => {
  const renderingData = useRenderingData();
  const drawingState = useDrawingState();
  const uiState = useUIState();
  const selectionState = useSelectionState();
  
  // Store actions for reactive updates
  const actions = useLayoutStore(
    useShallow((state) => ({
      addRailwayNode: state.addRailwayNode,
      addPipeSupport: state.addPipeSupport,
      addConveyorLift: state.addConveyorLift,
      addPipeFloorConnection: state.addPipeFloorConnection,
      setSelectedConveyorLift: state.setSelectedConveyorLift,
      setSelectedPipeFloorConnection: state.setSelectedPipeFloorConnection,
      setSelectedPowerPole: state.setSelectedPowerPole,
      setConveyorMode: state.setConveyorMode
    }))
  );
  
  // Return a stable object combining all needed data
  return useMemo(() => ({
    // Entity data with floor filtering and memoization
    buildings: renderingData.buildings,
    conveyorPoles: renderingData.conveyorPoles,
    conveyorBelts: renderingData.conveyorBelts,
    pipelines: renderingData.pipelines,
    railways: renderingData.railways,
    railwayNodes: renderingData.railwayNodes,
    railwaySegments: renderingData.railwaySegments,
    foundations: renderingData.foundations,
    powerPoles: renderingData.powerPoles,
    powerlines: renderingData.powerlines,
    conveyorSegments: renderingData.conveyorSegments,
    pipeSupports: renderingData.pipeSupports,
    pipeSegments: renderingData.pipeSegments,
    conveyorLifts: renderingData.conveyorLifts,
    pipeFloorConnections: renderingData.pipeFloorConnections,
    stickyNotes: renderingData.stickyNotes,
    powerlineSegments: renderingData.powerlineSegments,
    wallSegments: renderingData.wallSegments,
    railingSegments: renderingData.railingSegments,

    // Drawing state
    drawingState: drawingState.drawingState,
    powerlineConnectionState: drawingState.powerlineConnectionState,
    snapIndicator: drawingState.snapIndicator,
    selectedTool: drawingState.selectedTool,
    
    // UI state
    showGrid: uiState.showGrid,
    currentFloor: uiState.currentFloor,
    
    // Selection state
    selectedBuilding: selectionState.selectedBuilding,
    selectedPole: selectionState.selectedPole,
    selectedPipeSupport: selectionState.selectedPipeSupport,
    selectedStickyNote: selectionState.selectedStickyNote,
    selectedConveyorLift: selectionState.selectedConveyorLift,
    selectedPipeFloorConnection: selectionState.selectedPipeFloorConnection,
    selectedFoundation: selectionState.selectedFoundation,
    selectedWall: selectionState.selectedWall,
    selectedRailing: selectionState.selectedRailing,
    selectedPowerPole: selectionState.selectedPowerPole,
    selectedPowerlineSegment: selectionState.selectedPowerlineSegment,
    selectedPowerline: selectionState.selectedPowerline,
    
    // UI state
    showFloorBelow: uiState.showFloorBelow,
    gridSnappingEnabled: uiState.gridSnappingEnabled,
    productionOverlaySettings: uiState.productionOverlaySettings,

    // Actions for reactive state updates
    actions
  }), [renderingData, drawingState, uiState, selectionState, actions]);
};

// Helper function to calculate visible bounds
const calculateVisibleBounds = (
  canvasWidth: number, 
  canvasHeight: number, 
  scale: number, 
  position: { x: number; y: number }
) => {
  const padding = 200;
  const left = (-position.x - padding) / scale / PIXELS_PER_METER;
  const right = (-position.x + canvasWidth + padding) / scale / PIXELS_PER_METER;
  const top = (-position.y - padding) / scale / PIXELS_PER_METER;
  const bottom = (-position.y + canvasHeight + padding) / scale / PIXELS_PER_METER;
  
  return { left, right, top, bottom };
};

// Helper function to check if a building is visible
const isBuildingVisible = (building: Building, buildingDef: any, bounds: any): boolean => {
  const left = building.x;
  const right = building.x + buildingDef.width;
  const top = building.y;
  const bottom = building.y + buildingDef.height;
  
  return !(right < bounds.left || left > bounds.right || bottom < bounds.top || top > bounds.bottom);
};

// Helper function to check if a point is visible
const isPointVisible = (x: number, y: number, bounds: any, padding = 2): boolean => {
  return x >= bounds.left - padding && 
         x <= bounds.right + padding && 
         y >= bounds.top - padding && 
         y <= bounds.bottom + padding;
};

// Helper functions for constraints
const constrainPoint = (reference: { x: number; y: number }, current: { x: number; y: number }, isShiftPressed: boolean, isCtrlPressed: boolean) => {
  if (!isShiftPressed && !isCtrlPressed) return current;
  
  const dx = Math.abs(current.x - reference.x);
  const dy = Math.abs(current.y - reference.y);
  
  if (isShiftPressed && !isCtrlPressed) {
    if (dx > dy) {
      return { x: current.x, y: reference.y };
    } else {
      return { x: reference.x, y: current.y };
    }
  } else if (isCtrlPressed && !isShiftPressed) {
    const angle = Math.atan2(current.y - reference.y, current.x - reference.x);
    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return {
      x: reference.x + Math.cos(snapAngle) * distance,
      y: reference.y + Math.sin(snapAngle) * distance
    };
  } else if (isShiftPressed && isCtrlPressed) {
    const gridSize = 8;
    const angle = Math.atan2(current.y - reference.y, current.x - reference.x);
    
    return {
      x: reference.x + Math.cos(angle) * gridSize,
      y: reference.y + Math.sin(angle) * gridSize
    };
  }
  
  return current;
};

interface FactoryCanvasProps {
  onPositionChange?: (position: { x: number; y: number }) => void;
  onZoomChange?: (zoom: number) => void;
  leftPanelWidth?: number;
  rightPanelWidth?: number;
}

export const FactoryCanvas: React.FC<FactoryCanvasProps> = ({ onPositionChange, onZoomChange, leftPanelWidth, rightPanelWidth }) => {
  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Performance optimization: Refs for drag state management
  const isDraggingRef = useRef(false);

  // PERFORMANCE OPTIMIZATION: useTransition for prioritizing urgent vs non-urgent updates
  // Position/isDragging are urgent (user-facing), viewport bounds are non-urgent (background)
  const [isPending, startTransition] = useTransition();
  
  // Ultra-optimized grid snapping function for Konva drag operations
  // Note: This operates on pixel coordinates, so we need to convert to world, snap, then convert back
  const snapToGridOptimized = useMemoizedCallback((pos: { x: number; y: number }, currentScale: number) => {
    // Convert pixel position to world coordinates (meters)
    // pos is in screen pixels, we need to divide by scale and PIXELS_PER_METER
    const worldX = pos.x / currentScale / PIXELS_PER_METER;
    const worldY = pos.y / currentScale / PIXELS_PER_METER;

    // Snap in world coordinates using the fixed grid size
    const invGridSize = 1 / GRID_SIZE;

    // Use precision-aware rounding to avoid floating-point edge cases
    const epsilon = 1e-10;
    const scaledX = worldX * invGridSize;
    const scaledY = worldY * invGridSize;
    const signX = scaledX >= 0 ? 1 : -1;
    const signY = scaledY >= 0 ? 1 : -1;

    const snappedWorldX = Math.round(scaledX + signX * epsilon) * GRID_SIZE;
    const snappedWorldY = Math.round(scaledY + signY * epsilon) * GRID_SIZE;

    // Convert back to pixel coordinates
    return {
      x: snappedWorldX * PIXELS_PER_METER * currentScale,
      y: snappedWorldY * PIXELS_PER_METER * currentScale,
    };
  }, []);
  
  // Cached drag bound function to prevent recreating on every drag
  const dragBoundFuncRef = useRef<((pos: { x: number; y: number }) => { x: number; y: number }) | null>(null);
  
  const [canvasSize, setCanvasSize] = useState(() => {
    // Better initial sizing for desktop layout
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) {
      // Account for actual default panel widths in desktop mode
      const estimatedLeftPanel = leftPanelWidth || 350; // use prop or default
      const estimatedRightPanel = rightPanelWidth || 400; // use prop or default
      const buffer = 20; // account for borders, padding, scrollbars
      const calculatedWidth = window.innerWidth - estimatedLeftPanel - estimatedRightPanel - buffer;
      const calculatedHeight = window.innerHeight - 120; // account for toolbar and padding
      
      // Ensure we always have positive dimensions
      return { 
        width: Math.max(100, calculatedWidth), 
        height: Math.max(100, calculatedHeight)
      };
    }
    // Mobile: use full window dimensions
    return { 
      width: Math.max(100, window.innerWidth), 
      height: Math.max(100, CANVAS_HEIGHT) 
    };
  });
  const [dragOver, setDragOver] = useState(false);
  const [dragValidation, setDragValidation] = useState<{ isValid: boolean; buildingType: string; blockedMessage?: string } | null>(null);
  const [stationSnapIndicator, setStationSnapIndicator] = useState<StationSnapVisualIndicator | null>(null);
  const [isMobile, setIsMobile] = useState(isTouchDevice());
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [lastTouchPos, setLastTouchPos] = useState({ x: 0, y: 0 });
  const [touchStartDistance, setTouchStartDistance] = useState(0);
  const [touchStartScale, setTouchStartScale] = useState(1);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Performance mode integration
  const { config } = usePerformanceMode();
  const [renderQuality, setRenderQuality] = useState(1);
  
  // Touch interaction state management
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [showRailwayDebug, setShowRailwayDebug] = useState(false);
  
  // Touch thresholds for better mobile UX
  const TOUCH_MOVE_THRESHOLD = 10; // 10px movement threshold
  const TOUCH_DRAG_TIME_THRESHOLD = 150; // 150ms before considering drag
  
  // Smooth zoom implementation
  const smoothZoom = useMemo(() => createSmoothZoom(), []);
  // Initialize optimized callbacks for better performance
  const { createStableHandler, getCachedCallback } = useOptimizedCallbacks();

  // Zoom performance tracking
  const zoomFrameSkipCounterRef = useRef(0);
  const zoomStateUpdateTimeoutRef = useRef<number | null>(null);
  const isZoomingRef = useRef(false);

  // Ref to access updateVisibleBoundsImmediate before it's defined
  const updateVisibleBoundsImmediateRef = useRef<(() => void) | null>(null);

  // Update both scale and position simultaneously to prevent double renders
  const updateZoom = useMemoizedCallback((newScale: number, newPosition: { x: number; y: number }) => {
    // PHASE 2 FIX: Update Konva Stage imperatively FIRST before React state
    // This prevents race conditions with the position sync effect
    const stage = stageRef.current;
    if (stage) {
      stage.scaleX(newScale);
      stage.scaleY(newScale);
      stage.position(newPosition); // Use position() instead of x/y for atomicity

      // Always redraw immediately for smooth zooming - frame skipping was causing choppy feel
      stage.batchDraw();
    }

    // PERFORMANCE: Defer React state updates until zoom settles
    // Clear any pending state update
    if (zoomStateUpdateTimeoutRef.current) {
      clearTimeout(zoomStateUpdateTimeoutRef.current);
    }

    // Mark as zooming
    isZoomingRef.current = true;

    // Schedule state sync after zoom settles (100ms of no zoom activity - reduced from 150ms for responsiveness)
    zoomStateUpdateTimeoutRef.current = window.setTimeout(() => {
      const stage = stageRef.current;
      if (stage) {
        // Sync React state with final Konva state
        const finalScale = stage.scaleX();
        const finalPos = stage.position();

        setScale(finalScale);
        setPosition(finalPos);

        // Notify parent components only after zoom completes
        if (onZoomChange) onZoomChange(finalScale);
        if (onPositionChange) onPositionChange(finalPos);

        // Mark zooming as complete
        isZoomingRef.current = false;

        // Viewport bounds will be updated automatically via existing effects
        // when setScale/setPosition trigger re-renders
      }
    }, 100);
  }, [onZoomChange, onPositionChange, setScale, setPosition]);
  
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
    powerPoles,
    powerlineSegments,
    powerlines,
    foundations,
    wallSegments,
    railingSegments,
    currentFloor,
    selectedBuilding,
    selectedPole,
    selectedPipeSupport,
    selectedStickyNote,
    selectedConveyorLift,
    selectedPipeFloorConnection,
    selectedFoundation,
    selectedWall,
    selectedRailing,
    selectedPowerPole,
    selectedPowerlineSegment,
    selectedPowerline,
    selectedTool,
    drawingState,
    powerlineConnectionState,
    showGrid,
    setSelectedPowerlineSegment,
    setSelectedPowerline,
    showFloorBelow,
    gridSnappingEnabled,
    productionOverlaySettings,
    actions
  } = useOptimizedStore();
  
  // Initialize drag bound function once - moved here after gridSnappingEnabled is available
  useEffect(() => {
    dragBoundFuncRef.current = (pos: { x: number; y: number }) => {
      // CRITICAL: This function must be as fast as possible to prevent violations
      const stage = stageRef.current;
      if (!stage) return pos;

      const currentScale = stage.scaleX() || 1;

      // Only snap to grid if enabled, otherwise return position as-is
      if (!gridSnappingEnabled) return pos;

      // Use the most optimized grid snapping
      return snapToGridOptimized(pos, currentScale);
    };
  }, [snapToGridOptimized, gridSnappingEnabled]);

  // PHASE 2 PERFORMANCE FIX: Imperative position sync (no props on Stage)
  // Sync position imperatively only for PROGRAMMATIC changes (zoom, reset, etc)
  // NOTE: Drag changes are NOT synced here - they're already applied imperatively during drag
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || isDraggingRef.current) return;

    // Use RAF to prevent blocking and ensure stage is ready
    requestAnimationFrame(() => {
      // Get current Konva position
      const currentPos = stage.position();

      // Only update if position actually changed (prevent unnecessary work)
      // This typically only fires for programmatic position changes (zoom centering, etc)
      if (currentPos.x !== position.x || currentPos.y !== position.y) {
        stage.position(position);
        stage.batchDraw();
      }
    });
  }, [position.x, position.y]); // Only re-run when position changes

  // PERFORMANCE OPTIMIZATION: Imperative scale sync (no scale props on Stage)
  // Sync scale imperatively to eliminate Stage reconciliation overhead during zoom
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // Use RAF to prevent blocking and ensure stage is ready
    requestAnimationFrame(() => {
      // Get current Konva scale
      const currentScale = stage.scaleX();

      // Only update if scale actually changed (prevent unnecessary work)
      if (currentScale !== scale) {
        stage.scale({ x: scale, y: scale });
        stage.batchDraw();
      }
    });
  }, [scale]); // Only re-run when scale changes

  // Store functions - memoized
  // Consolidate action subscriptions
  const storeActions = useLayoutStore(
    useShallow(state => ({
      updateBuilding: state.updateBuilding,
      updateStickyNote: state.updateStickyNote,
      deleteBuilding: state.deleteBuilding,
      deletePole: state.deletePole,
      deletePipeSupport: state.deletePipeSupport,
      deletePowerPole: state.deletePowerPole,
      deleteStickyNote: state.deleteStickyNote,
      setSelectedBuilding: state.setSelectedBuilding,
      setSelectedPole: state.setSelectedPole,
      setSelectedPipeSupport: state.setSelectedPipeSupport,
      setSelectedStickyNote: state.setSelectedStickyNote,
      setSelectedRailwaySegment: state.setSelectedRailwaySegment,
      setSelectedRailwayNode: state.setSelectedRailwayNode,
      rotateBuilding: state.rotateBuilding,
      addPoleToPath: state.addPoleToPath,
      finishConveyorDrawing: state.finishConveyorDrawing,
      cancelDrawing: state.cancelDrawing,
      addPipeSupport: state.addPipeSupport,
      finishPipeDrawing: state.finishPipeDrawing,
      cancelPipeDrawing: state.cancelPipeDrawing,
      reverseBeltDirection: state.reverseBeltDirection,
      addBuilding: state.addBuilding,
      startRailwayDrawing: state.startRailwayDrawing,
      addRailwayPoint: state.addRailwayPoint,
      finishRailwayDrawing: state.finishRailwayDrawing,
      cancelRailwayDrawing: state.cancelRailwayDrawing,
      startPowerlineDrawing: state.startPowerlineDrawing,
      addPowerlinePoint: state.addPowerlinePoint,
      finishPowerlineDrawing: state.finishPowerlineDrawing,
      cancelPowerlineDrawing: state.cancelPowerlineDrawing,
      detectNearbyBuildingForRailwayConnection: state.detectNearbyBuildingForRailwayConnection,
      detectNearbyBuildingForConveyorConnection: state.detectNearbyBuildingForConveyorConnection,
      detectNearbyBuildingForPipeConnection: state.detectNearbyBuildingForPipeConnection,
      startConveyorLiftDrawing: state.startConveyorLiftDrawing,
      startPipeFloorConnectionDrawing: state.startPipeFloorConnectionDrawing,
      setSelectedConveyorLift: state.setSelectedConveyorLift,
      setSelectedPipeFloorConnection: state.setSelectedPipeFloorConnection,
      deleteConveyorLift: state.deleteConveyorLift,
      deletePipeFloorConnection: state.deletePipeFloorConnection,
      startFoundationDrawing: state.startFoundationDrawing,
      finishFoundationDrawing: state.finishFoundationDrawing,
      startWallDrawing: state.startWallDrawing,
      addWallPoint: state.addWallPoint,
      finishWallDrawing: state.finishWallDrawing,
      cancelWallDrawing: state.cancelWallDrawing,
      startRailingDrawing: state.startRailingDrawing,
      addRailingPoint: state.addRailingPoint,
      finishRailingDrawing: state.finishRailingDrawing,
      cancelRailingDrawing: state.cancelRailingDrawing,
      cancelFoundationDrawing: state.cancelFoundationDrawing,
      setSelectedFoundation: state.setSelectedFoundation,
      setSelectedWall: state.setSelectedWall,
      setSelectedRailing: state.setSelectedRailing,
      updateFoundation: state.updateFoundation,
      updateWallSegment: state.updateWallSegment,
      updateRailingSegment: state.updateRailingSegment,
      deleteFoundation: state.deleteFoundation,
      deleteWallSegment: state.deleteWallSegment,
      deleteRailingSegment: state.deleteRailingSegment,
      clearPowerlineConnectionState: state.clearPowerlineConnectionState,
      deletePowerlineSegment: state.deletePowerlineSegment,
      setSelectedPowerlineSegment: state.setSelectedPowerlineSegment,
    }))
  );

  const {
    updateBuilding,
    updateStickyNote,
    deleteBuilding,
    deletePole,
    deletePipeSupport,
    deletePowerPole,
    deleteStickyNote,
    startPowerlineDrawing,
    addPowerlinePoint,
    finishPowerlineDrawing,
    cancelPowerlineDrawing,
    setSelectedBuilding,
    setSelectedPole,
    setSelectedPipeSupport,
    setSelectedStickyNote,
    setSelectedRailwaySegment,
    setSelectedRailwayNode,
    rotateBuilding,
    addPoleToPath,
    finishConveyorDrawing,
    cancelDrawing,
    addPipeSupport,
    finishPipeDrawing,
    cancelPipeDrawing,
    reverseBeltDirection,
    addBuilding,
    startRailwayDrawing,
    addRailwayPoint,
    finishRailwayDrawing,
    cancelRailwayDrawing,
    detectNearbyBuildingForRailwayConnection,
    detectNearbyBuildingForConveyorConnection,
    detectNearbyBuildingForPipeConnection,
    startConveyorLiftDrawing,
    startPipeFloorConnectionDrawing,
    setSelectedConveyorLift,
    setSelectedPipeFloorConnection,
    deleteConveyorLift,
    deletePipeFloorConnection,
    startFoundationDrawing,
    finishFoundationDrawing,
    startWallDrawing,
    addWallPoint,
    finishWallDrawing,
    cancelWallDrawing,
    startRailingDrawing,
    addRailingPoint,
    finishRailingDrawing,
    cancelRailingDrawing,
    cancelFoundationDrawing,
    setSelectedFoundation,
    setSelectedWall,
    setSelectedRailing,
    updateFoundation,
    updateWallSegment,
    updateRailingSegment,
    deleteFoundation,
    deleteWallSegment,
    deleteRailingSegment,
    clearPowerlineConnectionState,
    deletePowerlineSegment,
  } = storeActions;
  
  // FIXED: Determine if stage should be draggable - moved earlier in the component
  const isStageDraggable = useMemo(() => {
    const allowedTools = ['move', 'select'];
    const isValidTool = allowedTools.includes(selectedTool) || isSpacePressed;
    const notDrawing = !drawingState.isDrawing && !drawingState.drawingPipe && !drawingState.drawingRailway && !drawingState.drawingPowerline?.isDrawing && !drawingState.drawingConveyorLift && !drawingState.drawingPipeFloorConnection;
    return isValidTool && notDrawing;
  }, [selectedTool, drawingState, isSpacePressed]);

  // Detect mobile device changes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isTouchDevice() || window.innerWidth < 768);
    };
    
    window.addEventListener('resize', checkMobile);
    checkMobile();
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Adjust render quality based on performance mode
  useEffect(() => {
    if (config.shadowQuality === 'low') {
      setRenderQuality(0.75); // Render at 75% resolution
    } else if (config.shadowQuality === 'medium') {
      setRenderQuality(0.9); // Render at 90% resolution
    } else {
      setRenderQuality(1); // Full resolution
    }
  }, [config.shadowQuality]);
  
  // Track previous canvas size to detect significant changes
  const prevCanvasSizeRef = useRef(canvasSize);
  
  // PERFORMANCE FIX: Debounce visible bounds calculation to prevent updates during dragging
  const [stableVisibleBounds, setStableVisibleBounds] = useState(() => 
    calculateVisibleBounds(canvasSize.width, canvasSize.height, scale, position)
  );
  
  // PERFORMANCE OPTIMIZATION: Stabilize callback by reading from stage imperatively
  // Removed scale and position from dependencies - always read from stage when available
  const updateVisibleBoundsImmediate = useCallback(() => {
    const stage = stageRef.current;
    let newBounds;
    if (stage) {
      // PERFORMANCE: Always read current values from stage imperatively (no dependencies needed)
      const currentScale = stage.scaleX() || 1; // Fallback to 1 if undefined
      const currentPosition = stage.position() || { x: 0, y: 0 }; // Fallback to origin
      newBounds = calculateVisibleBounds(canvasSize.width, canvasSize.height, currentScale, currentPosition);
    } else {
      // Fallback only when stage doesn't exist (initialization)
      newBounds = calculateVisibleBounds(canvasSize.width, canvasSize.height, 1, { x: 0, y: 0 });
    }
    setStableVisibleBounds(newBounds);
    return newBounds;
  }, [canvasSize.width, canvasSize.height]); // Only canvas size in dependencies

  // Populate ref so it can be accessed from earlier callbacks
  useEffect(() => {
    updateVisibleBoundsImmediateRef.current = updateVisibleBoundsImmediate;
  }, [updateVisibleBoundsImmediate]);

  // Responsive canvas sizing with ResizeObserver for reliable container tracking
  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    let observedContainer: HTMLElement | null = null;

    const updateCanvasSize = (forceUpdate = false) => {
      // First try to get the Stage's container
      let container = stageRef.current?.container()?.parentElement;

      // If not available, try to find the canvas area container
      if (!container) {
        container = document.querySelector('[data-canvas-area="true"]') as HTMLElement;
      }

      // Final fallback: find the div that contains this FactoryCanvas
      if (!container) {
        const canvasWrapper = document.querySelector('.w-full.h-full.relative.overflow-hidden') as HTMLElement;
        if (canvasWrapper) {
          container = canvasWrapper.parentElement as HTMLElement;
        }
      }

      if (container) {
        const rect = container.getBoundingClientRect();
        const newSize = {
          width: rect.width,
          height: rect.height
        };

        // Skip if size is invalid (0 dimensions)
        if (newSize.width <= 0 || newSize.height <= 0) return;

        // Check for significant size change (resize threshold)
        const prevSize = prevCanvasSizeRef.current;
        const widthChange = Math.abs(newSize.width - prevSize.width);
        const heightChange = Math.abs(newSize.height - prevSize.height);
        const significantResize = widthChange > 5 || heightChange > 5 || forceUpdate;

        if (significantResize) {
          setCanvasSize(newSize);
          prevCanvasSizeRef.current = newSize;

          // Force immediate viewport bounds update
          if (prevSize.width > 0 && prevSize.height > 0) {
            setTimeout(() => {
              updateVisibleBoundsImmediate();
            }, 0);
          }
        }

        // Set up ResizeObserver if not already observing this container
        if (container !== observedContainer && resizeObserver) {
          if (observedContainer) {
            resizeObserver.unobserve(observedContainer);
          }
          resizeObserver.observe(container);
          observedContainer = container;
        }
      }
    };

    // Create ResizeObserver for reliable container size tracking
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const newSize = { width, height };
          const prevSize = prevCanvasSizeRef.current;
          const widthChange = Math.abs(width - prevSize.width);
          const heightChange = Math.abs(height - prevSize.height);

          if (widthChange > 5 || heightChange > 5) {
            setCanvasSize(newSize);
            prevCanvasSizeRef.current = newSize;
            setTimeout(() => {
              updateVisibleBoundsImmediate();
            }, 0);
          }
        }
      }
    });

    // Initial size update
    updateCanvasSize(true);

    // Also update after a short delay to ensure DOM is ready
    const timer = setTimeout(() => updateCanvasSize(true), 100);

    window.addEventListener('resize', () => updateCanvasSize());
    return () => {
      window.removeEventListener('resize', () => updateCanvasSize());
      clearTimeout(timer);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [updateVisibleBoundsImmediate]);
  
  // Force canvas size update after component mounts and DOM is fully rendered
  useEffect(() => {
    const forceUpdate = () => {
      const container = document.querySelector('[data-canvas-area="true"]') as HTMLElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCanvasSize({
            width: rect.width,
            height: rect.height
          });
        }
      }
    };
    
    // Try multiple times to ensure we get the right size
    // More aggressive on desktop since panels need time to render
    const isDesktop = window.innerWidth >= 1024;
    const delays = isDesktop ? [50, 100, 200, 500, 1000, 1500] : [50, 100, 200, 500];
    const timers = delays.map(delay => 
      setTimeout(forceUpdate, delay)
    );
    
    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);
  
  // Resize canvas when panel widths change (desktop layout)
  useEffect(() => {
    if (leftPanelWidth !== undefined || rightPanelWidth !== undefined) {
      const timer = setTimeout(() => {
        const container = document.querySelector('[data-canvas-area="true"]') as HTMLElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setCanvasSize({
              width: rect.width,
              height: rect.height
            });
          }
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [leftPanelWidth, rightPanelWidth]);
  
  const updateVisibleBoundsDebounced = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);

      // CRITICAL DRAG OPTIMIZATION: Skip viewport updates entirely during drag
      // The viewport will update immediately when drag ends via handleCanvasDragEnd
      if (isDraggingRef.current) {
        return;
      }

      timeoutId = setTimeout(() => {
        updateVisibleBoundsImmediate();
      }, 16); // ~60fps max update rate
    };
  }, [updateVisibleBoundsImmediate, isDraggingRef]);
  
  // Update visible bounds when dependencies change, but debounced
  useEffect(() => {
    updateVisibleBoundsDebounced();
  }, [updateVisibleBoundsDebounced]);

  // PERFORMANCE OPTIMIZATION: Use Rust viewport system to eliminate O(n) filtering
  const {
    visibleObjects,
    performanceMetrics: viewportMetrics,
    isRustAvailable,
    invalidateCache: invalidateViewportCache
  } = useViewportSystem(
    {
      ...stableVisibleBounds,
      width: stableVisibleBounds.right - stableVisibleBounds.left,
      height: stableVisibleBounds.bottom - stableVisibleBounds.top
    },
    currentFloor,
    showFloorBelow,
    isDraggingRef  // Pass drag state ref to prevent O(30n) filtering during drag
  );
  
  // CANVAS RESIZE FIX: Force immediate viewport update when canvas size changes significantly
  useEffect(() => {
    const prevSize = prevCanvasSizeRef.current;
    const widthChange = Math.abs(canvasSize.width - prevSize.width);
    const heightChange = Math.abs(canvasSize.height - prevSize.height);
    const significantChange = widthChange > 50 || heightChange > 50;
    
    if (significantChange && prevSize.width > 0 && prevSize.height > 0 && !isDraggingRef.current) { // Ensure it's not initial load
      // Immediate bounds update without debouncing for canvas resize
      updateVisibleBoundsImmediate();
      // Force viewport cache invalidation to ensure new areas render
      if (invalidateViewportCache) {
        invalidateViewportCache();
      }
    }
  }, [canvasSize.width, canvasSize.height, updateVisibleBoundsImmediate, invalidateViewportCache]);

  // PERFORMANCE: Cache invalidation when objects are added/moved/removed
  const prevObjectCountsRef = useRef<{ [key: string]: number }>({});
  
  useEffect(() => {
    const currentCounts = {
      buildings: buildings ? Object.keys(buildings).length : 0,
      conveyorPoles: conveyorPoles ? Object.keys(conveyorPoles).length : 0,
      pipeSupports: pipeSupports ? Object.keys(pipeSupports).length : 0,
      conveyorBelts: conveyorBelts ? Object.keys(conveyorBelts).length : 0,
      pipelines: pipelines ? Object.keys(pipelines).length : 0,
      railways: railways ? Object.keys(railways).length : 0,
      powerlineSegments: powerlineSegments ? Object.keys(powerlineSegments).length : 0,
      foundations: foundations ? Object.keys(foundations).length : 0,
      wallSegments: wallSegments ? Object.keys(wallSegments).length : 0,
      railingSegments: railingSegments ? Object.keys(railingSegments).length : 0
    };
    
    // Check if any object counts have changed
    const hasChanges = Object.keys(currentCounts).some(key => 
      prevObjectCountsRef.current[key] !== currentCounts[key as keyof typeof currentCounts]
    );
    
    if (hasChanges && Object.keys(prevObjectCountsRef.current).length > 0 && !isDraggingRef.current) {
      // Invalidate viewport cache when objects are added/removed
      invalidateViewportCache();
    }
    
    prevObjectCountsRef.current = currentCounts;
  }, [buildings, conveyorPoles, pipeSupports, conveyorBelts, pipelines, railways, 
      powerlineSegments, foundations, wallSegments, railingSegments, invalidateViewportCache]);
  
  // PERFORMANCE OPTIMIZED: Use proper reactive selectors instead of getState()
  const allBuildings = useBuildingsArray();
  const { currentFloorBuildings, floorBelowBuildings } = useMemo(() => {
    // Use optimized buildings (already filtered by floor) instead of visibleObjects
    const currentFloorBuildings = buildings; // Already filtered by current floor

    // For floor below visualization, include ALL buildings from lower floors that extend into the current floor
    // This accounts for tall buildings (like silos, tanks, etc.) that span multiple floors
    // Uses getTallBuildingsExtendingToFloor to get buildings whose height extends to this floor
    const tallBuildingsExtending = getTallBuildingsExtendingToFloor(currentFloor, Object.fromEntries(allBuildings.map(b => [b.id, b])));

    // Also include buildings from the floor directly below for standard visualization
    const directlyBelowBuildings = allBuildings.filter(b => b.floor === currentFloor - 1);

    // Combine and deduplicate (tallBuildingsExtending may include some from floor below)
    const floorBelowBuildingsSet = new Set(tallBuildingsExtending.map(b => b.id));
    const floorBelowBuildings = [
      ...tallBuildingsExtending,
      ...directlyBelowBuildings.filter(b => !floorBelowBuildingsSet.has(b.id))
    ];

    return { currentFloorBuildings, floorBelowBuildings };
  }, [buildings, currentFloor, allBuildings]);
  
  // REPLACED: Use viewport system for poles
  const { currentFloorPoles, floorBelowPoles } = useMemo(() => {
    const allPoles = visibleObjects.conveyorPoles;
    const currentFloorPoles = allPoles.filter(p => p.floor === currentFloor);
    const floorBelowPoles = allPoles.filter(p => p.floor === currentFloor - 1);
    
    return { currentFloorPoles, floorBelowPoles };
  }, [visibleObjects.conveyorPoles, currentFloor]);
  
  // REPLACED: Use viewport system for pipe supports
  const { currentFloorPipeSupports, floorBelowPipeSupports } = useMemo(() => {
    const allSupports = visibleObjects.pipeSupports;
    const currentFloorPipeSupports = allSupports.filter(s => s.floor === currentFloor);
    const floorBelowPipeSupports = allSupports.filter(s => s.floor === currentFloor - 1);
    
    return { currentFloorPipeSupports, floorBelowPipeSupports };
  }, [visibleObjects.pipeSupports, currentFloor]);
  
  // REPLACED: Use viewport system for conveyors
  const { currentFloorConveyors, floorBelowConveyors } = useMemo(() => {
    const allConveyors = visibleObjects.conveyorBelts;
    const currentFloorConveyors = allConveyors.filter(belt => belt.floor === currentFloor);
    const floorBelowConveyors = allConveyors.filter(belt => belt.floor === currentFloor - 1);
    
    return { currentFloorConveyors, floorBelowConveyors };
  }, [visibleObjects.conveyorBelts, currentFloor]);
  
  // REPLACED: Use viewport system for pipelines
  const { currentFloorPipelines, floorBelowPipelines } = useMemo(() => {
    const allPipelines = visibleObjects.pipelines;
    const currentFloorPipelines = allPipelines.filter(pipeline => pipeline.floor === currentFloor);
    const floorBelowPipelines = allPipelines.filter(pipeline => pipeline.floor === currentFloor - 1);
    
    return { currentFloorPipelines, floorBelowPipelines };
  }, [visibleObjects.pipelines, currentFloor]);
  
  // REPLACED: Use viewport system for railways
  const { currentFloorRailways, floorBelowRailways } = useMemo(() => {
    const allRailways = visibleObjects.railways;
    const currentFloorRailways = allRailways.filter(railway => railway.floor === currentFloor);
    const floorBelowRailways = allRailways.filter(railway => railway.floor === currentFloor - 1);
    
    return { currentFloorRailways, floorBelowRailways };
  }, [visibleObjects.railways, currentFloor]);
  
  // REPLACED: Use viewport system for powerline segments
  const { currentFloorPowerlineSegments, floorBelowPowerlineSegments } = useMemo(() => {
    const allPowerlineSegments = visibleObjects.powerlineSegments;

    // DEBUG: Log incoming segments from viewport system
    if (allPowerlineSegments.length > 0) {
      console.log('[FactoryCanvas] Received', allPowerlineSegments.length, 'powerline segments from viewport, currentFloor:', currentFloor);
    }

    const currentFloorPowerlineSegments = allPowerlineSegments.filter(segment => {
      // Use loose equality (==) in case of number/string mismatch
      return segment.floor == currentFloor;
    });
    const floorBelowPowerlineSegments = allPowerlineSegments.filter(segment => {
      return segment.floor == currentFloor - 1;
    });

    // DEBUG: Log filtered results
    if (allPowerlineSegments.length > 0) {
      console.log('[FactoryCanvas] After floor filter:', currentFloorPowerlineSegments.length, 'for current floor,', floorBelowPowerlineSegments.length, 'for floor below');
    }

    return { currentFloorPowerlineSegments, floorBelowPowerlineSegments };
  }, [visibleObjects.powerlineSegments, currentFloor]);
  
  // Power poles filtering - use renderingData.powerPoles
  const { currentFloorPowerPoles, floorBelowPowerPoles } = useMemo(() => {
    const allPowerPoles = powerPoles ? Object.values(powerPoles) : [];
    const currentFloorPowerPoles = allPowerPoles.filter(pole => pole.floor === currentFloor);
    const floorBelowPowerPoles = allPowerPoles.filter(pole => pole.floor === currentFloor - 1);
    
    return { currentFloorPowerPoles, floorBelowPowerPoles };
  }, [powerPoles, currentFloor]);

  // REPLACED: Use viewport system for foundations
  const { currentFloorFoundations, floorBelowFoundations } = useMemo(() => {
    const allFoundations = visibleObjects.foundations;
    const currentFloorFoundations = allFoundations.filter(f => f.floor === currentFloor);
    const floorBelowFoundations = allFoundations.filter(f => f.floor === currentFloor - 1);
    
    return { currentFloorFoundations, floorBelowFoundations };
  }, [visibleObjects.foundations, currentFloor]);

  // REPLACED: Use viewport system for walls
  const { currentFloorWalls, floorBelowWalls } = useMemo(() => {
    const allWalls = visibleObjects.wallSegments;
    const currentFloorWalls = allWalls.filter(w => w.floor === currentFloor);
    const floorBelowWalls = allWalls.filter(w => w.floor === currentFloor - 1);
    
    return { currentFloorWalls, floorBelowWalls };
  }, [visibleObjects.wallSegments, currentFloor]);

  // REPLACED: Use viewport system for railings
  const { currentFloorRailings, floorBelowRailings } = useMemo(() => {
    const allRailings = visibleObjects.railingSegments;
    const currentFloorRailings = allRailings.filter(r => r.floor === currentFloor);
    const floorBelowRailings = allRailings.filter(r => r.floor === currentFloor - 1);
    
    return { currentFloorRailings, floorBelowRailings };
  }, [visibleObjects.railingSegments, currentFloor]);

  // Enhanced drag and drop support - memoized callbacks
  const handleDragOver = useMemoizedCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
    
    // Check if we're dragging a building type and provide appropriate feedback
    const buildingType = e.dataTransfer.getData('application/building-type');
    if (buildingType && BUILDING_TYPES[buildingType]) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Convert to world coordinates (same as handleDrop)
      const adjustedX = x * renderQuality;
      const adjustedY = y * renderQuality;
      const rawWorldX = (adjustedX - position.x) / scale / PIXELS_PER_METER;
      const rawWorldY = (adjustedY - position.y) / scale / PIXELS_PER_METER;
      const worldX = snapToGrid(rawWorldX, GRID_SIZE, gridSnappingEnabled);
      const worldY = snapToGrid(rawWorldY, GRID_SIZE, gridSnappingEnabled);
      
      // PERFORMANCE FIX: Debounce expensive snapping operations to prevent 8fps regression
      const performSnappingChecks = debounce(() => {
        // First check for building height blocking from buildings on lower floors
        const allBuildingsRecord = Object.fromEntries(allBuildings.map(b => [b.id, b]));
        const blockingResult = isPlacementBlockedByBuildingBelow(
          worldX, worldY, currentFloor, buildingType, allBuildingsRecord, 0
        );

        if (blockingResult.isBlocked) {
          setDragValidation({
            isValid: false,
            buildingType,
            blockedMessage: blockingResult.message
          });
        } else if (['window', 'door'].includes(buildingType)) {
          // Check for wall snapping validation for windows/doors
          const dragPosition = { x: worldX, y: worldY, z: currentFloor * FLOOR_HEIGHT };
          const wallSnapResult = detectWallSnap(dragPosition, buildingType, wallSegments, currentFloor);
          setDragValidation({ isValid: wallSnapResult.isValid, buildingType });
        } else {
          setDragValidation(null);
        }
        
        // Check for train station snapping preview
        if (isTrainStation(buildingType)) {
          const buildingDef = BUILDING_TYPES[buildingType];
          const previewBuilding: Building = {
            id: 'preview',
            type: buildingType,
            x: worldX,
            y: worldY,
            z: currentFloor * FLOOR_HEIGHT,
            floor: currentFloor,
            rotation: 0,
            connectionPoints: buildingDef.connectionPoints,
            railwayPoints: buildingDef.railwayPoints
          };
          
          const stationSnapResult = detectNearbyStations(previewBuilding, buildings);
          if (stationSnapResult.shouldSnap && stationSnapResult.visualIndicator) {
            setStationSnapIndicator(stationSnapResult.visualIndicator);
          } else {
            setStationSnapIndicator(null);
          }
        } else {
          setStationSnapIndicator(null);
        }
      }, 32); // 32ms = ~30fps update rate for expensive operations
      
      performSnappingChecks();
    } else {
      setDragValidation(null);
      setStationSnapIndicator(null);
    }
  }, [renderQuality, position, scale, gridSnappingEnabled, currentFloor, wallSegments, buildings, allBuildings]);

  const handleBuildingDragStart = useMemoizedCallback((buildingId: string) => {
    startBuildingDrag(buildingId);
  }, []);

  const handleBuildingDragEnd = useMemoizedCallback((buildingId: string, e: any) => {
    // Get fresh state from store to avoid stale closure issues with useMemoizedCallback
    const { buildings: currentBuildings, gridSnappingEnabled: isSnappingEnabled, showGrid } = useLayoutStore.getState();
    const building = currentBuildings[buildingId];
    if (!building) {
      console.warn('[FactoryCanvas] Building not found:', buildingId);
      return;
    }

    const buildingDef = BUILDING_TYPES[building.type];

    // Calculate raw position (convert from screen pixels to world meters)
    // The building is positioned at its center in Konva, so subtract half the dimensions
    const rawX = e.target.x() / PIXELS_PER_METER - buildingDef.width / 2;
    const rawY = e.target.y() / PIXELS_PER_METER - buildingDef.height / 2;

    // Only apply grid snapping if BOTH grid is visible AND snapping is enabled
    // Use the improved snapToGrid function for precision
    const shouldSnap = isSnappingEnabled && showGrid;

    // Buildings snap to GRID_SIZE (0.5m) for finer placement control
    // This allows precise positioning while still respecting the grid
    const x = snapToGrid(rawX, GRID_SIZE, shouldSnap);
    const y = snapToGrid(rawY, GRID_SIZE, shouldSnap);

    // End the drag state first
    endBuildingDrag();

    // Now update the position - this will trigger full cascade updates since drag has ended
    updateBuilding(buildingId, { x, y });
  }, [updateBuilding]); // Removed gridSnappingEnabled from deps since we get it fresh from store

  // DRAG PERFORMANCE OPTIMIZATION: Ultra-smooth 60fps dragging

  // RAF-based position update for smooth dragging without state update lag
  const dragPositionUpdateRef = useRef<number | null>(null);
  const lastDragPositionRef = useRef({ x: 0, y: 0 });
  const dragStartMousePosRef = useRef({ x: 0, y: 0 });
  const dragStartStagePosRef = useRef({ x: 0, y: 0 });
  const frameSkipCounterRef = useRef(0);

  const handleCanvasDragStart = useMemoizedCallback((e: any) => {
    // isStageDraggable already checks for valid tools ('move', 'select') and drawing state
    if (!isStageDraggable || e.target !== stageRef.current) {
      e.evt.preventDefault();
      return;
    }

    // PERFORMANCE FIX: Only use ref for drag state (no React state updates)
    isDraggingRef.current = true;

    // Store initial position
    const stage = stageRef.current;
    if (stage) {
      lastDragPositionRef.current = stage.position();
      dragStartStagePosRef.current = stage.position();
      // Store mouse position at drag start
      const mousePos = stage.getPointerPosition();
      if (mousePos) {
        dragStartMousePosRef.current = mousePos;
      }
    }

    // Change cursor to grabbing
    if (stage) {
      stage.container().style.cursor = 'grabbing';
    }
  }, [isStageDraggable, selectedTool]);

  // CRITICAL FPS FIX: Manual drag control with throttled batchDraw
  // Previously, Konva's automatic drag called batchDraw() on EVERY pixel movement
  // Now we manually control position updates and throttle redraws to 30fps for smooth performance
  const handleCanvasDragMove = useMemoizedCallback((e: any) => {
    if (e.target !== stageRef.current || !isDraggingRef.current) return;

    const stage = stageRef.current;
    if (!stage) return;

    // Get current mouse position
    const mousePos = stage.getPointerPosition();
    if (!mousePos) return;

    // Calculate new stage position based on mouse movement
    const dx = mousePos.x - dragStartMousePosRef.current.x;
    const dy = mousePos.y - dragStartMousePosRef.current.y;
    const newPos = {
      x: dragStartStagePosRef.current.x + dx,
      y: dragStartStagePosRef.current.y + dy
    };

    // Update position immediately (no visual lag)
    stage.position(newPos);

    // Cancel any pending RAF update
    if (dragPositionUpdateRef.current) {
      cancelAnimationFrame(dragPositionUpdateRef.current);
    }

    // PERFORMANCE: Skip every other frame to reduce batchDraw calls from 60fps to 30fps
    // This significantly improves performance on complex layouts while maintaining smooth feel
    dragPositionUpdateRef.current = requestAnimationFrame(() => {
      frameSkipCounterRef.current++;

      // Only redraw every 2nd frame (30fps) to reduce GPU/CPU load
      if (frameSkipCounterRef.current % 2 === 0) {
        // Only redraw if position actually changed
        if (newPos.x !== lastDragPositionRef.current.x ||
            newPos.y !== lastDragPositionRef.current.y) {
          lastDragPositionRef.current = newPos;

          // PERFORMANCE: Manually trigger batchDraw at controlled 30fps rate
          // Instead of Konva's automatic redraw on every pixel movement (hundreds/second)
          stage.batchDraw();
        }
      }

      dragPositionUpdateRef.current = null;
    });
  }, []);

  const handleCanvasDragEnd = useMemoizedCallback(() => {
    if (!isDraggingRef.current) return;

    // Cancel any pending drag update
    if (dragPositionUpdateRef.current) {
      cancelAnimationFrame(dragPositionUpdateRef.current);
      dragPositionUpdateRef.current = null;
    }

    // Mark dragging as finished FIRST (ref update is instant, no React overhead)
    isDraggingRef.current = false;

    // Reset frame skip counter
    frameSkipCounterRef.current = 0;

    // Restore cursor
    const stage = stageRef.current;
    if (stage) {
      stage.container().style.cursor = isStageDraggable && selectedTool === 'select' ? 'grab' : 'default';

      // FIX 1: Sync position state to fix grid rendering
      // The grid depends on position prop, but we updated stage position imperatively during drag
      // Now sync the React state so grid updates on next render
      const finalPos = stage.position();
      setPosition(finalPos);

      // FIX 2: Update viewport bounds asynchronously to fix new areas not rendering
      // Use requestIdleCallback to avoid blocking the main thread
      // This ensures newly-visible objects render without causing lag
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          updateVisibleBoundsImmediateRef.current?.();
        }, { timeout: 100 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          updateVisibleBoundsImmediateRef.current?.();
        }, 50);
      }
    }

    // PERFORMANCE NOTE: Why these updates are safe now:
    //   1. setPosition() - Single state update, grid will re-render on next frame (no lag)
    //   2. updateVisibleBoundsImmediate() - Called asynchronously via requestIdleCallback
    //      - Runs during browser idle time, doesn't block main thread
    //      - Ensures newly-visible areas render properly
    //      - 100ms timeout ensures it runs even if browser is busy
  }, [setPosition, updateVisibleBoundsImmediate, isStageDraggable, selectedTool]);

  const handleContextMenu = useMemoizedCallback((e: any) => {
    e.evt.preventDefault();
    if (drawingState.drawingWall && drawingState.wallSegments && drawingState.wallSegments.length > 0) {
      finishWallDrawing("default");
    } else if (drawingState.drawingRailing && drawingState.railingSegments && drawingState.railingSegments.length > 0) {
      finishRailingDrawing("default");
    }
  }, [drawingState.drawingWall, drawingState.wallSegments, finishWallDrawing, drawingState.drawingRailing, drawingState.railingSegments, finishRailingDrawing]);

const handleStickyNoteDragEnd = useMemoizedCallback((noteId: string, e: any) => {
  // Get fresh snapping state from store
  const { gridSnappingEnabled: isSnappingEnabled } = useLayoutStore.getState();
  const rawX = e.target.x() / PIXELS_PER_METER;
  const rawY = e.target.y() / PIXELS_PER_METER;
  const x = snapToGrid(rawX, GRID_SIZE, isSnappingEnabled);
  const y = snapToGrid(rawY, GRID_SIZE, isSnappingEnabled);
  updateStickyNote(noteId, { x, y });
}, [updateStickyNote]);

const handleFoundationDragEnd = useMemoizedCallback((foundationId: string, e: any) => {
  // Apply grid snapping if enabled (8m grid for foundations)
  const rawX = e.target.x() / PIXELS_PER_METER;
  const rawY = e.target.y() / PIXELS_PER_METER;
  const x = snapToGrid(rawX, 8, gridSnappingEnabled);
  const y = snapToGrid(rawY, 8, gridSnappingEnabled);
  updateFoundation(foundationId, { x, y });
}, [updateFoundation, gridSnappingEnabled]);

const handleWallDragEnd = useMemoizedCallback((wallId: string, e: any) => {
  // For walls, we need to update both start and end positions
  const wall = wallSegments[wallId];
  if (!wall) return;
  
  const dx = e.target.x() / PIXELS_PER_METER - wall.x;
  const dy = e.target.y() / PIXELS_PER_METER - wall.y;
  
  updateWallSegment(wallId, { 
    x: wall.x + dx, 
    y: wall.y + dy,
    endX: wall.endX + dx,
    endY: wall.endY + dy
  });
}, [wallSegments, updateWallSegment]);

const handleRailingDragEnd = useMemoizedCallback((railingId: string, e: any) => {
  // For railings, we need to update both start and end positions
  const railing = railingSegments[railingId];
  if (!railing) return;
  
  const dx = e.target.x() / PIXELS_PER_METER - railing.x;
  const dy = e.target.y() / PIXELS_PER_METER - railing.y;
  
  updateRailingSegment(railingId, { 
    x: railing.x + dx, 
    y: railing.y + dy,
    endX: railing.endX + dx,
    endY: railing.endY + dy
  });
}, [railingSegments, updateRailingSegment]);

  const handleDragLeave = useMemoizedCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setDragValidation(null);
    setStationSnapIndicator(null);
  }, []);

  // FIXED: Drag and drop coordinate conversion with renderQuality
  const handleDrop = useMemoizedCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setDragValidation(null);
    
    const buildingType = e.dataTransfer.getData('application/building-type');
    if (!buildingType || !BUILDING_TYPES[buildingType]) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // FIXED: Account for renderQuality factor in coordinate conversion
    const adjustedX = x * renderQuality;
    const adjustedY = y * renderQuality;
    
    // Convert to world coordinates
    const rawWorldX = (adjustedX - position.x) / scale / PIXELS_PER_METER;
    const rawWorldY = (adjustedY - position.y) / scale / PIXELS_PER_METER;
    
    // Apply grid snapping if enabled (but wall snapping takes priority for windows/doors)
    let worldX = snapToGrid(rawWorldX, GRID_SIZE, gridSnappingEnabled);
    let worldY = snapToGrid(rawWorldY, GRID_SIZE, gridSnappingEnabled);
    let rotation: 0 | 90 | 180 | 270 = 0;
    
    const buildingDef = BUILDING_TYPES[buildingType];
    const initialPosition = { x: worldX, y: worldY, z: currentFloor * FLOOR_HEIGHT };

    // Check for building height blocking from buildings on lower floors
    const allBuildingsRecord = Object.fromEntries(allBuildings.map(b => [b.id, b]));
    const blockingResult = isPlacementBlockedByBuildingBelow(
      worldX, worldY, currentFloor, buildingType, allBuildingsRecord, 0
    );

    if (blockingResult.isBlocked) {
      console.warn(`Cannot place ${buildingType}: ${blockingResult.message}`);
      return; // Don't place the building
    }

    // Check for wall snapping for windows and doors
    const wallSnapResult = detectWallSnap(initialPosition, buildingType, wallSegments, currentFloor);
    
    if (!wallSnapResult.isValid) {
      // For windows and doors, show error if no valid wall placement
      if (['window', 'door'].includes(buildingType)) {
        console.warn(`Cannot place ${buildingType}: No valid wall found nearby`);
        return; // Don't place the building
      }
    } else if (wallSnapResult.snapPosition && wallSnapResult.wallNormal) {
      // Use wall snap position and calculate proper rotation
      worldX = wallSnapResult.snapPosition.x;
      worldY = wallSnapResult.snapPosition.y;
      rotation = calculateWallAlignedRotation(wallSnapResult.wallNormal);
    }
    
    let building: Building = {
      id: `building-${Date.now()}`,
      type: buildingType,
      x: worldX,
      y: worldY,
      z: currentFloor * FLOOR_HEIGHT,
      floor: currentFloor,
      rotation,
      connectionPoints: buildingDef.connectionPoints,
      railwayPoints: buildingDef.railwayPoints
    };
    
    // Check for train station snapping - takes priority over other snapping modes
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
    
    // Only select if not in drawing mode
    if (!drawingState.isDrawing && !drawingState.drawingPipe && !drawingState.drawingRailway && !drawingState.drawingPowerline?.isDrawing) {
      setSelectedBuilding(building.id);
    }
  }, [position, scale, currentFloor, addBuilding, setSelectedBuilding, drawingState, renderQuality, wallSegments, gridSnappingEnabled, buildings, allBuildings]);

  // Touch distance calculation for pinch zoom
  const getTouchDistance = useMemoizedCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  // Improved touch handling for mobile
  const handleTouchStart = useMemoizedCallback((e: any) => {
    const touches = e.evt.touches;
    const now = Date.now();
    
    if (touches.length === 2) {
      // Pinch zoom start
      const distance = getTouchDistance(touches);
      setTouchStartDistance(distance);
      setTouchStartScale(scale);
      setIsDragging(false);
      setHasMoved(false);
      e.evt.preventDefault();
    } else if (touches.length === 1) {
      const touch = touches[0];
      
      // Record touch start state
      setTouchStartTime(now);
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
      setIsDragging(false);
      setHasMoved(false);
      
      // Double-tap detection for zoom
      if (now - lastTouchTime < 300 && 
          Math.abs(touch.clientX - lastTouchPos.x) < 50 && 
          Math.abs(touch.clientY - lastTouchPos.y) < 50) {
        const newScale = scale > 1 ? MIN_ZOOM : Math.min(scale * 2, MAX_ZOOM);
        setScale(newScale);
        if (onZoomChange) onZoomChange(newScale);
        e.evt.preventDefault();
      }
      
      setLastTouchTime(now);
      setLastTouchPos({ x: touch.clientX, y: touch.clientY });
    }
  }, [scale, lastTouchTime, lastTouchPos, getTouchDistance]);

  const handleTouchMove = useMemoizedCallback((e: any) => {
    const touches = e.evt.touches;
    const now = Date.now();
    
    if (touches.length === 2) {
      // Pinch zoom
      const distance = getTouchDistance(touches);
      if (touchStartDistance > 0) {
        const scaleChange = distance / touchStartDistance;
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, touchStartScale * scaleChange));
        setScale(newScale);
        if (onZoomChange) onZoomChange(newScale);
      }
      e.evt.preventDefault();
    } else if (touches.length === 1) {
      const touch = touches[0];
      const moveDistance = Math.sqrt(
        Math.pow(touch.clientX - touchStartPos.x, 2) + 
        Math.pow(touch.clientY - touchStartPos.y, 2)
      );
      
      // Better movement detection - both time AND distance thresholds
      if (!hasMoved && (
        moveDistance > TOUCH_MOVE_THRESHOLD || 
        (now - touchStartTime > TOUCH_DRAG_TIME_THRESHOLD && moveDistance > 5)
      )) {
        setHasMoved(true);
        // Only set dragging if we're in move mode or dragging canvas
        if (selectedTool === 'move' || (!drawingState.isDrawing && !drawingState.drawingPipe && !drawingState.drawingRailway && !drawingState.drawingPowerline?.isDrawing)) {
          setIsDragging(true);
        }
      }
    }
  }, [touchStartDistance, touchStartScale, getTouchDistance, touchStartPos, touchStartTime, hasMoved, selectedTool, drawingState]);

  const handleTouchEnd = useMemoizedCallback(() => {
    // Reset states with delay to allow selection events to process
    setTimeout(() => {
      setIsDragging(false);
      setHasMoved(false);
    }, 50);
  }, []);
  
  // Handle zoom with improved performance and smoothness
  const handleWheel = useMemoizedCallback((e: any) => {
    e.evt.preventDefault();

    // Quick building rotation check first (lightweight)
    // Read fresh from store to avoid stale closure issues
    const currentSelectedBuilding = useLayoutStore.getState().selectedBuilding;
    if (currentSelectedBuilding) {
      const currentBuildings = useLayoutStore.getState().buildings;
      const building = currentBuildings[currentSelectedBuilding];
      if (building) {
        // Bidirectional rotation: scroll up = counter-clockwise, scroll down = clockwise
        const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
        const currentRotation = (building.rotation || 0) as 0 | 90 | 180 | 270;
        const currentIndex = rotations.indexOf(currentRotation);
        const validIndex = currentIndex >= 0 ? currentIndex : 0; // Fallback to 0 if not found
        const direction = e.evt.deltaY > 0 ? 1 : -1; // down = clockwise, up = counter-clockwise
        const newIndex = (validIndex + direction + 4) % 4;
        const newRotation = rotations[newIndex];

        useLayoutStore.getState().updateBuilding(currentSelectedBuilding, { rotation: newRotation });
      }
      return;
    }
    
    // Optimized zoom calculation
    const scaleBy = 1.1;
    const stage = stageRef.current;
    if (!stage) return;
    
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    // Calculate new scale with clamping
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldScale * Math.pow(scaleBy, direction)));
    
    // Only update if scale actually changed
    if (Math.abs(newScale - oldScale) < 0.001) return;
    
    // FIXED: Improved zoom calculation to properly center on mouse cursor
    // Get the mouse position relative to the stage (not the canvas position)
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };
    
    // Calculate the new position so the point under the mouse stays in the same place
    const newPosition = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    
    // Use smooth zoom for better performance
    // State sync and viewport update now handled in updateZoom after zoom settles
    smoothZoom(newScale, newPosition, updateZoom);
  }, [selectedBuilding, buildings, updateBuilding, scale, position, smoothZoom, updateZoom]);
  
  // Remove duplicate handlers - already defined above

  // Enhanced building selection with mobile considerations - fixed parameter type
  const handleBuildingSelect = useMemoizedCallback((buildingId: string) => {
    // On mobile, check if we were actually actually dragging/moving
    if (isMobile && hasMoved) {
      return;
    }
    
    if (selectedTool === 'delete') {
      deleteBuilding(buildingId);
    } else if (selectedTool === 'rotate') {
      console.log('🔄 Rotation tool clicked for building:', buildingId);
      rotateBuilding(buildingId);
      // Add haptic feedback on mobile
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } else if (selectedTool === 'powerline') {
      // Handle powerline tool for buildings with power connections
      const building = buildings[buildingId];
      if (building) {
        const buildingDef = BUILDING_TYPES[building.type];
        const powerConnection = buildingDef?.powerData?.powerConnections?.[0];
        if (powerConnection) {
          startPowerlineDrawing(building.id, powerConnection.id, undefined);
          // Add haptic feedback on mobile
          if (isMobile && 'vibrate' in navigator) {
            navigator.vibrate(50);
          }
        }
      }
    } else {
      // Only select if not in drawing mode to avoid workflow interruption
      if (!drawingState.isDrawing && !drawingState.drawingPipe && !drawingState.drawingRailway && !drawingState.drawingPowerline?.isDrawing) {
        setSelectedBuilding(buildingId);
        // Clear other selections to prevent multiple selections
        setSelectedRailwaySegment(null);
        setSelectedRailwayNode(null);
        setSelectedPole(null);
        setSelectedPipeSupport(null);
        setSelectedStickyNote(null);
        setSelectedConveyorLift(null);
        setSelectedPipeFloorConnection(null);
        actions.setSelectedPowerPole(null);
        setSelectedFoundation(null);
        setSelectedWall(null);
        setSelectedRailing(null);
        // Add haptic feedback on mobile
        if (isMobile && 'vibrate' in navigator) {
          navigator.vibrate(30);
        }
      }
    }
  }, [selectedTool, deleteBuilding, rotateBuilding, setSelectedBuilding, setSelectedRailwaySegment, 
      setSelectedRailwayNode, setSelectedPole, setSelectedPipeSupport, setSelectedStickyNote,
      setSelectedConveyorLift, setSelectedPipeFloorConnection, setSelectedFoundation, setSelectedWall,
      drawingState, isMobile, hasMoved]);
  
  // FIXED: Improved pole selection handling with proper mobile support - fixed parameter type
  const handlePoleSelect = useMemoizedCallback((poleId: string) => {
    
    // On mobile, only ignore if we actually moved significantly
    if (isMobile && hasMoved) {
      return;
    }
    
    // Priority 1: Drawing mode - handle conveyor connections
    if (drawingState.isDrawing && (selectedTool === 'conveyor' || selectedTool === 'select')) {
      finishConveyorDrawing(undefined, undefined, poleId);
      // Add haptic feedback for successful connection
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
      return;
    }
    
    // Priority 2: Tool-based actions
    if (selectedTool === 'delete') {
      deletePole(poleId);
      // Add haptic feedback for deletion
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } else {
      // Only select if not in drawing mode to avoid workflow interruption
      if (!drawingState.isDrawing && !drawingState.drawingPipe && !drawingState.drawingRailway && !drawingState.drawingPowerline?.isDrawing) {
        setSelectedPole(poleId);
        // Add haptic feedback for selection
        if (isMobile && 'vibrate' in navigator) {
          navigator.vibrate(30);
        }
      }
    }
  }, [selectedTool, drawingState.isDrawing, finishConveyorDrawing, deletePole, setSelectedPole, isMobile, hasMoved, touchStartTime]);
  
  // FIXED: Enhanced pipe support selection handling - fixed parameter type
  const handlePipeSupportSelect = useMemoizedCallback((supportId: string) => {
    
    // On mobile, only ignore if we actually moved significantly
    if (isMobile && hasMoved) {
      return;
    }
    
    // Priority 1: Drawing mode - handle pipe connections
    if (drawingState.drawingPipe && (selectedTool === 'pipe' || selectedTool === 'select')) {
      finishPipeDrawing(undefined, undefined, supportId);
      // Add haptic feedback for successful connection
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
      return;
    }
    
    // Priority 2: Tool-based actions
    if (selectedTool === 'delete') {
      deletePipeSupport(supportId);
      // Add haptic feedback for deletion
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } else {
      // Only select if not in drawing mode to avoid workflow interruption
      if (!drawingState.isDrawing && !drawingState.drawingPipe && !drawingState.drawingRailway && !drawingState.drawingPowerline?.isDrawing) {
        setSelectedPipeSupport(supportId);
        // Add haptic feedback for selection
        if (isMobile && 'vibrate' in navigator) {
          navigator.vibrate(30);
        }
      }
    }
  }, [selectedTool, drawingState.drawingPipe, finishPipeDrawing, deletePipeSupport, setSelectedPipeSupport, isMobile, hasMoved]);
  
  // Power pole selection handling - similar to other handlers
  const handlePowerPoleSelect = useMemoizedCallback((poleId: string) => {
    // On mobile, only ignore if we actually moved significantly
    if (isMobile && hasMoved) {
      return;
    }
    
    // Priority 1: Drawing mode - handle powerline connections
    if (drawingState.drawingPowerline?.isDrawing && (selectedTool === 'powerline' || selectedTool === 'select')) {
      finishPowerlineDrawing(undefined, undefined, poleId);
      // Add haptic feedback for successful connection
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
      return;
    }
    
    // Priority 2: Tool-based actions  
    if (selectedTool === 'delete') {
      deletePowerPole(poleId);
      // Add haptic feedback for deletion
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } else if (selectedTool === 'powerline') {
      // Start powerline drawing from this pole
      startPowerlineDrawing(undefined, undefined, poleId);
      // Add haptic feedback
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } else {
      // Only select if not in drawing mode to avoid workflow interruption
      if (!drawingState.isDrawing && !drawingState.drawingPipe && !drawingState.drawingRailway && !drawingState.drawingPowerline?.isDrawing) {
        actions.setSelectedPowerPole(poleId);
        // Add haptic feedback for selection
        if (isMobile && 'vibrate' in navigator) {
          navigator.vibrate(30);
        }
      }
    }
  }, [selectedTool, drawingState, finishPowerlineDrawing, deletePowerPole, startPowerlineDrawing, actions.setSelectedPowerPole, isMobile, hasMoved]);

  // Handle power pole drag end - updates pole position and cascades to connected powerlines
  const handlePowerPoleDragEnd = useMemoizedCallback((poleId: string, e: any) => {
    const { powerPoles, buildings, gridSnappingEnabled, showGrid, updatePowerPole, updateBuilding } = useLayoutStore.getState();

    // Calculate new position from drag event
    const rawX = e.target.x() / PIXELS_PER_METER;
    const rawY = e.target.y() / PIXELS_PER_METER;

    // Apply grid snapping if enabled using improved precision-aware function
    const shouldSnap = gridSnappingEnabled && showGrid;
    const x = snapToGrid(rawX, GRID_SIZE, shouldSnap);
    const y = snapToGrid(rawY, GRID_SIZE, shouldSnap);

    // Check if this is a standalone power pole
    const standalonePole = powerPoles[poleId];
    if (standalonePole) {
      // Update standalone pole position (this also updates connected powerlines)
      updatePowerPole(poleId, { x, y });
    } else {
      // Check if this is a building-based power pole
      const buildingPole = buildings[poleId];
      if (buildingPole) {
        // Update building position (this also updates connected infrastructure)
        updateBuilding(poleId, { x, y });
      } else {
        console.warn('Power pole drag: Could not find pole or building with id:', poleId);
        return;
      }
    }

    // Add haptic feedback on mobile
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, [isMobile]);

  // FIXED: Handle sticky note selection - memoized - fixed parameter type
  const handleStickyNoteSelect = useMemoizedCallback((noteId: string) => {
    // On mobile, check if we were actually moving
    if (isMobile && hasMoved) {
      return;
    }
    
    if (selectedTool === 'delete') {
      deleteStickyNote(noteId);
      // Add haptic feedback for deletion
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } else {
      // Only select if not in drawing mode
      if (!drawingState.isDrawing && !drawingState.drawingPipe && !drawingState.drawingRailway && !drawingState.drawingPowerline?.isDrawing) {
        setSelectedStickyNote(noteId);
        // Add haptic feedback for selection
        if (isMobile && 'vibrate' in navigator) {
          navigator.vibrate(30);
        }
      }
    }
  }, [selectedTool, deleteStickyNote, setSelectedStickyNote, drawingState, isMobile, hasMoved]);

  // Handle foundation selection
  const handleFoundationSelect = useMemoizedCallback((foundationId: string) => {
    if (isMobile && hasMoved) {
      return;
    }
    
    if (selectedTool === 'move' || selectedTool === 'select' || selectedTool === 'delete') {
      setSelectedFoundation(foundationId);
    }
  }, [selectedTool, setSelectedFoundation, isMobile, hasMoved]);

  // Handle wall selection
  const handleWallSelect = useMemoizedCallback((wallId: string) => {
    if (isMobile && hasMoved) {
      return;
    }
    
    if (selectedTool === 'move' || selectedTool === 'select' || selectedTool === 'delete') {
      setSelectedWall(wallId);
    }
  }, [selectedTool, setSelectedWall, isMobile, hasMoved]);

  // Handle railing selection
  const handleRailingSelect = useMemoizedCallback((railingId: string) => {
    if (isMobile && hasMoved) {
      return;
    }
    
    if (selectedTool === 'move' || selectedTool === 'select' || selectedTool === 'delete') {
      setSelectedRailing(railingId);
    }
  }, [selectedTool, setSelectedRailing, isMobile, hasMoved]);
  
  // Handle belt click for direction reversal - memoized
  const handleBeltClick = useMemoizedCallback((beltId: string) => {
    reverseBeltDirection(beltId);
    // Add haptic feedback for belt direction change
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [reverseBeltDirection, isMobile]);
  
  // Enhanced stage click with better mobile touch handling
  const handleStageClick = useMemoizedCallback((e: any) => {
    // Check what was actually clicked
    const target = e.target;
    const targetName = (typeof target.name === 'function' ? target.name() : target.name) || target.className || '';
    
    
    // Only process clicks on the actual stage background
    if (target !== target.getStage()) {
      return;
    }
    
    // On mobile, ignore if we were actually moving (dragging the canvas)
    if (isMobile && hasMoved) {
      return;
    }
    
    const isShiftPressed = e.evt?.shiftKey || false;
    const isCtrlPressed = e.evt?.ctrlKey || e.evt?.metaKey || false;
    
    // Railway drawing mode
if (selectedTool === 'railway') {
  const stage = stageRef.current;
  const point = stage.getPointerPosition();
  if (!point) return;

  const x = (point.x - position.x) / scale;
  const y = (point.y - position.y) / scale;

  // Convert to world coordinates and apply grid snapping if enabled
  const rawWorldX = x / PIXELS_PER_METER;
  const rawWorldY = y / PIXELS_PER_METER;
  const worldX = snapToGrid(rawWorldX, GRID_SIZE, gridSnappingEnabled);
  const worldY = snapToGrid(rawWorldY, GRID_SIZE, gridSnappingEnabled);
  const worldZ = currentFloor * FLOOR_HEIGHT;

  const clickPoint: Point3D = { x: worldX, y: worldY, z: worldZ };

  if (!drawingState.drawingRailway) {
    // Check if we're clicking near a building for direct connection (start new drawing)
    const nearbyBuilding = detectNearbyBuildingForRailwayConnection(
      clickPoint,
      '', // No building to exclude for starting
      1.5 // 1.5 meter threshold for initial building detection
    );

    if (nearbyBuilding) {
      // Start drawing from this building
      startRailwayDrawing(nearbyBuilding.buildingId, nearbyBuilding.railPointId);
    } else {
      // Check if we're clicking on an existing railway node (to extend from it)
      const storeState = useLayoutStore.getState();
      const EXISTING_NODE_SNAP_THRESHOLD = 1.0; // 1 meter threshold for existing nodes
      let existingNodeId: string | null = null;

      for (const [nodeId, node] of Object.entries(storeState.railwayNodes)) {
        if (node.floor === currentFloor) {
          const dx = node.x - clickPoint.x;
          const dy = node.y - clickPoint.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < EXISTING_NODE_SNAP_THRESHOLD) {
            existingNodeId = nodeId;
            break;
          }
        }
      }

      if (existingNodeId) {
        // Start drawing from the existing node
        startRailwayDrawing(undefined, undefined, existingNodeId);
      } else {
        // Create and add the starting node first for free drawing
        const newStartNode = createNodeAtPoint(clickPoint, currentFloor);
        actions.addRailwayNode(newStartNode);
        startRailwayDrawing(undefined, undefined, newStartNode.id);
      }
    }
  } else {
    // Check if we're finishing on a building for direct connection
    const nearbyBuilding = drawingState.railwayStartStation ? 
      detectNearbyBuildingForRailwayConnection(
        clickPoint,
        drawingState.railwayStartStation, // Exclude the starting building
        1.5 // 1.5 meter threshold
      ) : null;
    
    if (nearbyBuilding) {
      // Finish drawing to this building
      finishRailwayDrawing(nearbyBuilding.buildingId, nearbyBuilding.railPointId);
    } else {
      addRailwayPoint(clickPoint);
    }
  }

  // Add haptic feedback for placing railway points
  if (isMobile && 'vibrate' in navigator) {
    navigator.vibrate(40);
  }
  return;
}

// Simplified powerline tool - clear selection on empty click
if (selectedTool === 'powerline') {
  // Clear any active powerline connection state when clicking empty space
  clearPowerlineConnectionState();
  return;
}

// Power pole placement mode
if (selectedTool === 'power_pole') {
  const stage = stageRef.current;
  const point = stage.getPointerPosition();
  if (!point) return;

  const x = (point.x - position.x) / scale;
  const y = (point.y - position.y) / scale;

  // Convert to world coordinates and apply grid snapping if enabled
  const rawWorldX = x / PIXELS_PER_METER;
  const rawWorldY = y / PIXELS_PER_METER;
  const worldX = snapToGrid(rawWorldX, GRID_SIZE, gridSnappingEnabled);
  const worldY = snapToGrid(rawWorldY, GRID_SIZE, gridSnappingEnabled);
  const worldZ = currentFloor * FLOOR_HEIGHT;

  const clickPoint: Point3D = { x: worldX, y: worldY, z: worldZ };

  // Create power pole with current tier setting
  const { powerPoleTier, addPowerPole } = useLayoutStore.getState();
  // Tower type is 'power_tower', not 'power_pole_tower'
  const poleType = powerPoleTier === 'tower' ? 'power_tower' : `power_pole_${powerPoleTier}`;
  
  const range = powerPoleTier === 'tower' ? 100 :
                powerPoleTier === 'mk3' ? 40 :
                powerPoleTier === 'mk2' ? 35 : 30;

  // Max connections per Satisfactory game: Mk1=4, Mk2=7, Mk3=10, Tower=7 (3 tower + 4 building)
  const maxConnections = powerPoleTier === 'tower' ? 7 :
                         powerPoleTier === 'mk3' ? 10 :
                         powerPoleTier === 'mk2' ? 7 : 4;
  
  const newPole: PowerPole = {
    id: `power-pole-${Date.now()}`,
    x: worldX,
    y: worldY,
    z: worldZ,
    floor: currentFloor,
    type: poleType as 'power_pole_mk1' | 'power_pole_mk2' | 'power_pole_mk3' | 'power_tower',
    range: range,
    maxConnections: maxConnections,
    connections: []
  };
  
  addPowerPole(newPole);
  
  // Add haptic feedback for placing power poles
  if (isMobile && 'vibrate' in navigator) {
    navigator.vibrate(50);
  }
  return;
}
    
    // During pipe drawing mode, add supports on empty space clicks
    if (drawingState.drawingPipe) {
      const stage = stageRef.current;
      const point = stage.getPointerPosition();
      const x = (point.x - position.x) / scale;
      const y = (point.y - position.y) / scale;

      // Convert to world coordinates and apply grid snapping if enabled
      const rawWorldX = x / PIXELS_PER_METER;
      const rawWorldY = y / PIXELS_PER_METER;
      const worldX = snapToGrid(rawWorldX, GRID_SIZE, gridSnappingEnabled);
      const worldY = snapToGrid(rawWorldY, GRID_SIZE, gridSnappingEnabled);

      // Check for nearby building connections
      const clickPoint = { x: worldX, y: worldY, z: currentFloor * FLOOR_HEIGHT };
      const nearbyBuilding = detectNearbyBuildingForPipeConnection(
        clickPoint,
        '', // No building to exclude for initial clicks
        BUILDING_RAILWAY_SNAP_THRESHOLD
      );
      
      if (nearbyBuilding) {
        // Finish pipe drawing to this building connection
        finishPipeDrawing(nearbyBuilding.buildingId, nearbyBuilding.connectionPointId);
      } else {
        const newSupport: PipeSupport = {
          id: `support-${Date.now()}`,
          x: worldX,
          y: worldY,
          z: currentFloor * FLOOR_HEIGHT,
          floor: currentFloor
        };
        
        addPipeSupport(newSupport);
      }
      
      // Add haptic feedback for placing pipe supports
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
      return;
    }
    
    // During conveyor drawing mode, add poles on empty space clicks
    if (drawingState.isDrawing) {
      const stage = stageRef.current;
      const point = stage.getPointerPosition();
      const x = (point.x - position.x) / scale;
      const y = (point.y - position.y) / scale;
      
      let worldX = x / PIXELS_PER_METER;
      let worldY = y / PIXELS_PER_METER;
      
      // Apply constraints if shift/ctrl is pressed
      if ((isShiftPressed || isCtrlPressed) && drawingState.currentPath.length > 0) {
        const lastPole = drawingState.currentPath[drawingState.currentPath.length - 1];
        const constrainedPos = constrainPoint(
          { x: lastPole.x, y: lastPole.y },
          { x: worldX, y: worldY },
          isShiftPressed,
          isCtrlPressed
        );
        worldX = constrainedPos.x;
        worldY = constrainedPos.y;
      }

      // Apply grid snapping if enabled (half-foundation grid for poles)
      worldX = snapToGrid(worldX, GRID_SIZE, gridSnappingEnabled);
      worldY = snapToGrid(worldY, GRID_SIZE, gridSnappingEnabled);

      // Check for nearby building connections
      const clickPoint = { x: worldX, y: worldY, z: currentFloor * FLOOR_HEIGHT };
      const nearbyBuilding = detectNearbyBuildingForConveyorConnection(
        clickPoint,
        '', // No building to exclude for initial clicks
        BUILDING_RAILWAY_SNAP_THRESHOLD
      );
      
      if (nearbyBuilding) {
        // Finish conveyor drawing to this building connection
        finishConveyorDrawing(nearbyBuilding.buildingId, nearbyBuilding.connectionPointId);
      } else {
        const newPole: ConveyorPole = {
          id: `pole-${Date.now()}`,
          x: worldX,
          y: worldY,
          z: currentFloor * FLOOR_HEIGHT,
          floor: currentFloor
        };
        
        addPoleToPath(newPole);
      }
      
      // Add haptic feedback for placing conveyor poles
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
      return;
    }
    
    // Normal tool behavior
    if (selectedTool === 'pipe_support') {
      const stage = stageRef.current;
      const point = stage.getPointerPosition();
      const x = (point.x - position.x) / scale;
      const y = (point.y - position.y) / scale;

      // Convert to world coordinates and apply grid snapping if enabled
      const rawWorldX = x / PIXELS_PER_METER;
      const rawWorldY = y / PIXELS_PER_METER;
      const worldX = snapToGrid(rawWorldX, GRID_SIZE, gridSnappingEnabled);
      const worldY = snapToGrid(rawWorldY, GRID_SIZE, gridSnappingEnabled);

      const newSupport: PipeSupport = {
        id: `support-${Date.now()}`,
        x: worldX,
        y: worldY,
        z: currentFloor * FLOOR_HEIGHT,
        floor: currentFloor
      };
      
      actions.addPipeSupport(newSupport);

      // Add haptic feedback for placing individual pipe supports
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
    } else if (selectedTool === 'conveyor_pole') {
      // Place a standalone conveyor support/pole
      const stage = stageRef.current;
      const point = stage.getPointerPosition();
      const x = (point.x - position.x) / scale;
      const y = (point.y - position.y) / scale;

      // Convert to world coordinates and apply grid snapping if enabled
      const rawWorldX = x / PIXELS_PER_METER;
      const rawWorldY = y / PIXELS_PER_METER;
      const worldX = snapToGrid(rawWorldX, GRID_SIZE, gridSnappingEnabled);
      const worldY = snapToGrid(rawWorldY, GRID_SIZE, gridSnappingEnabled);

      const newPole: ConveyorPole = {
        id: `pole-${Date.now()}`,
        x: worldX,
        y: worldY,
        z: currentFloor * FLOOR_HEIGHT,
        floor: currentFloor
      };

      actions.addPole(newPole);

      // Add haptic feedback for placing individual conveyor poles
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
    } else if (selectedTool === 'conveyor_lift') {
      const stage = stageRef.current;
      const point = stage.getPointerPosition();
      if (!point) return;

      // Convert screen coordinates to world coordinates and apply grid snapping if enabled
      const rawWorldX = (point.x - position.x) / scale / PIXELS_PER_METER;
      const rawWorldY = (point.y - position.y) / scale / PIXELS_PER_METER;
      const worldX = snapToGrid(rawWorldX, GRID_SIZE, gridSnappingEnabled);
      const worldY = snapToGrid(rawWorldY, GRID_SIZE, gridSnappingEnabled);

      // Create a default conveyor lift (Mk 1, up direction, 1 floor up)
      const id = `lift-${Date.now()}`;
      const startFloor = currentFloor;
      const endFloor = currentFloor + 1;
      const height = FLOOR_HEIGHT;
      
      const lift: ConveyorLift = {
        id,
        x: worldX,
        y: worldY,
        startFloor,
        endFloor,
        mark: 1,
        direction: 'up',
        height,
        cost: CONVEYOR_LIFT_BASE_COSTS[1] * Math.ceil(height / 2),
        connectionPoints: [
          {
            id: 'start-floor',
            x: 0,
            y: 1.5,
            type: 'input',
            side: 'back',
            isFluid: false,
          },
          {
            id: 'end-floor',
            x: 0,
            y: -1.5,
            type: 'output',
            side: 'front',
            isFluid: false,
          },
        ],
      };

      actions.addConveyorLift(lift);
      actions.setSelectedConveyorLift(lift.id);

      // Add haptic feedback
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } else if (selectedTool === 'pipe_floor_connection') {
      const stage = stageRef.current;
      const point = stage.getPointerPosition();
      if (!point) return;

      // Convert screen coordinates to world coordinates and apply grid snapping if enabled
      const rawWorldX = (point.x - position.x) / scale / PIXELS_PER_METER;
      const rawWorldY = (point.y - position.y) / scale / PIXELS_PER_METER;
      const worldX = snapToGrid(rawWorldX, GRID_SIZE, gridSnappingEnabled);
      const worldY = snapToGrid(rawWorldY, GRID_SIZE, gridSnappingEnabled);

      // Create a default pipe floor connection (Mk 1, up direction, fluid type, 1 floor up)
      const id = `pipefloor-${Date.now()}`;
      const startFloor = currentFloor;
      const endFloor = currentFloor + 1;
      const height = FLOOR_HEIGHT;
      
      const connection: PipeFloorConnection = {
        id,
        x: worldX,
        y: worldY,
        startFloor,
        endFloor,
        mark: 1,
        direction: 'up',
        height,
        cost: PIPE_FLOOR_CONNECTION_BASE_COSTS[1] * Math.ceil(height / 2),
        bottomConnectionPoint: {
          id: `${id}_bottom`,
          x: 0,
          y: 1,
          type: 'input',
          isFluid: true,
        },
        topConnectionPoint: {
          id: `${id}_top`,
          x: 0,
          y: -1,
          type: 'output',
          isFluid: true,
        },
      };

      actions.addPipeFloorConnection(connection);
      actions.setSelectedPipeFloorConnection(connection.id);

      // Add haptic feedback
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } else if (selectedTool === 'foundation') {
      const stage = stageRef.current;
      const point = stage.getPointerPosition();
      if (!point) return;

      // Convert screen coordinates to world coordinates
      const worldX = (point.x - position.x) / scale / PIXELS_PER_METER;
      const worldY = (point.y - position.y) / scale / PIXELS_PER_METER;

      // Apply grid snapping if enabled (8m grid for foundations)
      const snapX = snapToGrid(worldX, 8, gridSnappingEnabled);
      const snapY = snapToGrid(worldY, 8, gridSnappingEnabled);

      if (!drawingState.drawingFoundation) {
        // Start foundation drawing
        startFoundationDrawing({ x: snapX, y: snapY });
      } else {
        // Finish foundation drawing with default material
        finishFoundationDrawing({ x: snapX, y: snapY }, 'default');
      }

      // Add haptic feedback
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
    } else if (selectedTool === 'wall') {
      const stage = stageRef.current;
      const point = stage.getPointerPosition();
      if (!point) return;

      // Convert screen coordinates to world coordinates
      const worldX = (point.x - position.x) / scale / PIXELS_PER_METER;
      const worldY = (point.y - position.y) / scale / PIXELS_PER_METER;

      // FIXED: Implement improved smart wall snapping logic with better tolerance
      let snapX = worldX;
      let snapY = worldY;
      let snappedToFoundation = false;
      let closestDistance = Infinity;

      // Find nearest foundation edge for snapping with improved tolerance
      Object.values(foundations).forEach(foundation => {
        if (foundation.floor !== currentFloor) return;

        const edges = [
          // Top edge
          { x1: foundation.x, y1: foundation.y, x2: foundation.x + foundation.width, y2: foundation.y },
          // Bottom edge  
          { x1: foundation.x, y1: foundation.y + foundation.height, x2: foundation.x + foundation.width, y2: foundation.y + foundation.height },
          // Left edge
          { x1: foundation.x, y1: foundation.y, x2: foundation.x, y2: foundation.y + foundation.height },
          // Right edge
          { x1: foundation.x + foundation.width, y1: foundation.y, x2: foundation.x + foundation.width, y2: foundation.y + foundation.height },
        ];

        edges.forEach(edge => {
          // Calculate distance from mouse to edge
          const dx = edge.x2 - edge.x1;
          const dy = edge.y2 - edge.y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          
          if (length === 0) return; // Skip zero-length edges
          
          const t = Math.max(0, Math.min(1, ((worldX - edge.x1) * dx + (worldY - edge.y1) * dy) / (dx * dx + dy * dy)));
          const nearestX = edge.x1 + t * dx;
          const nearestY = edge.y1 + t * dy;
          const distance = Math.sqrt((worldX - nearestX) ** 2 + (worldY - nearestY) ** 2);

          // FIXED: Increased snapping tolerance from 2m to 4m for more forgiving wall placement
          if (distance < 4 && distance < closestDistance) {
            snapX = nearestX;
            snapY = nearestY;
            snappedToFoundation = true;
            closestDistance = distance;
          }
        });
      });

      // If not snapped to foundation, apply grid snapping if enabled (8m grid for walls)
      if (!snappedToFoundation) {
        snapX = snapToGrid(snapX, 8, gridSnappingEnabled);
        snapY = snapToGrid(snapY, 8, gridSnappingEnabled);
      }

      if (!drawingState.drawingWall) {
        // Start wall drawing with default height
        startWallDrawing({ x: snapX, y: snapY }, 4);
      } else {
        // Add wall point
        addWallPoint({ x: snapX, y: snapY });
      }
    } else if (selectedTool === 'railing') {
      const stage = stageRef.current;
      const point = stage.getPointerPosition();
      if (!point) return;

      // Convert screen coordinates to world coordinates
      const worldX = (point.x - position.x) / scale / PIXELS_PER_METER;
      const worldY = (point.y - position.y) / scale / PIXELS_PER_METER;
      
      // Snap to 8m grid for railings
      let snapX = worldX;
      let snapY = worldY;
      
      // Check for foundation snapping
      const snappedToFoundation = false; // Similar to wall logic, could be enhanced later
      
      if (!snappedToFoundation) {
        snapX = snapToGrid(snapX, 8, gridSnappingEnabled);
        snapY = snapToGrid(snapY, 8, gridSnappingEnabled);
      }

      if (!drawingState.drawingRailing) {
        // Start railing drawing
        startRailingDrawing({ x: snapX, y: snapY });
      } else {
        // Add railing point
        addRailingPoint({ x: snapX, y: snapY });
      }

      // Add haptic feedback
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
    } else {
      // Clear selections when clicking on empty space (only if not drawing)
      if (!drawingState.isDrawing && !drawingState.drawingPipe && !drawingState.drawingRailway && !drawingState.drawingPowerline?.isDrawing &&
          !drawingState.drawingConveyorLift && !drawingState.drawingPipeFloorConnection &&
          !drawingState.drawingFoundation && !drawingState.drawingWall && !drawingState.drawingRailing) {
        setSelectedBuilding(null);
        setSelectedPole(null);
        setSelectedPipeSupport(null);
        setSelectedStickyNote(null);
        setSelectedConveyorLift(null);
        setSelectedPipeFloorConnection(null);
        actions.setSelectedPowerPole(null);
        setSelectedFoundation(null);
        setSelectedWall(null);
        setSelectedRailing(null);
        setSelectedRailwaySegment(null);
        setSelectedRailwayNode(null);
      }
    }
  }, [drawingState, selectedTool, currentFloor, position, scale, addPoleToPath, addPipeSupport, 
      addRailwayPoint, startRailwayDrawing, startConveyorLiftDrawing, setSelectedBuilding, setSelectedPole, 
      setSelectedPipeSupport, setSelectedStickyNote, setSelectedRailwaySegment, setSelectedRailwayNode,
      isMobile, hasMoved, finishWallDrawing, detectNearbyBuildingForRailwayConnection,
      startPipeFloorConnectionDrawing, setSelectedConveyorLift, setSelectedPipeFloorConnection,
      finishFoundationDrawing, startFoundationDrawing, startWallDrawing, addWallPoint,
      startPowerlineDrawing, addPowerlinePoint, finishPowerlineDrawing,
      foundations]);
  
  // OPTIMIZED: Handle mouse move with smart throttling to prevent FPS drops
  const mousePositionRef = useRef({ x: 0, y: 0, lastUpdate: 0 });
  
  const handleMouseMove = useMemoizedCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const point = stage.getPointerPosition();
    if (!point) return;

    // CRITICAL FIX: Get position/scale from stage directly to prevent unstable dependencies
    // This prevents handleMouseMove recreation which would cascade to throttledMouseMove
    const currentPosition = stage.position();
    const currentScale = stage.scaleX();

    // ULTRA-OPTIMIZED: Pre-calculate scale factors to prevent repeated division
    const invScale = 1 / currentScale;
    const invPixelsPerMeter = 1 / PIXELS_PER_METER;
    const scaleFactor = invScale * invPixelsPerMeter;

    // PERFORMANCE CRITICAL: Use bitwise operations and avoid Math.abs where possible
    const stageToWorldX = (point.x - currentPosition.x) * scaleFactor;
    const stageToWorldY = (point.y - currentPosition.y) * scaleFactor;
    
    // OPTIMIZED: Use squared distance to avoid sqrt in distance calculations
    const deltaXSq = (stageToWorldX - mousePositionRef.current.x) ** 2;
    const deltaYSq = (stageToWorldY - mousePositionRef.current.y) ** 2;
    const now = performance.now();
    const timeDelta = now - mousePositionRef.current.lastUpdate;
    
    // PERFORMANCE: Use squared thresholds to avoid Math.abs
    const significantMovement = deltaXSq > 0.01 || deltaYSq > 0.01; // ~10cm threshold squared
    const timeThreshold = timeDelta > 16; // ~60fps max for UI updates
    
    if (significantMovement || (timeThreshold && (deltaXSq > 0.0001 || deltaYSq > 0.0001))) {
      mousePositionRef.current = { x: stageToWorldX, y: stageToWorldY, lastUpdate: now };
      
      // CRITICAL: Use RAF to defer state updates and prevent message handler violations
      if (!isDraggingRef.current) { // Only update during non-drag operations
        requestAnimationFrame(() => {
          setMousePos({ x: stageToWorldX, y: stageToWorldY });
        });
      }
    }

  }, []); // No dependencies - reads position/scale directly from stage
  
  // CRITICAL PERFORMANCE: Optimized throttling to prevent message handler violations
  const throttleDelay = useMemo(() => {
    const isDrawing = drawingState.isDrawing || drawingState.drawingRailway || drawingState.drawingPipe || drawingState.drawingPowerline?.isDrawing;
    
    // PERFORMANCE CRITICAL: Use lower delays with RAF to maintain smooth 60fps
    const baseDelay = config.shadowQuality === 'low' ? 32 : config.shadowQuality === 'medium' ? 16 : 8;
    
    // Slightly higher delay during drawing but still responsive
    return isDrawing ? Math.max(baseDelay, 16) : baseDelay; // 16ms = ~60fps max
  }, [config.shadowQuality, drawingState.isDrawing, drawingState.drawingRailway, drawingState.drawingPipe, drawingState.drawingPowerline]);
  
  // PERFORMANCE CRITICAL: RAF-based throttling prevents message handler violations
  const throttledMouseMove = useMemo(() => {
    let rafId: number | null = null;
    let lastCallTime = 0;

    return function(...args: any[]) {
      // CRITICAL FIX: Prevent mouse move handler from executing during canvas drag
      // This eliminates 11-28ms React scheduler overhead from RAF callbacks
      if (isDraggingRef.current) return;

      const now = performance.now();
      
      if (now - lastCallTime >= throttleDelay) {
        lastCallTime = now;
        
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          handleMouseMove();
          rafId = null;
        });
      }
    };
  }, [handleMouseMove, throttleDelay]);
  
  // Wheel handler - no throttling for immediate response
  // Each wheel event should produce visible zoom change
  const throttledWheel = useMemo(() => {
    return function(...args: any[]) {
      // Execute immediately - no throttling for responsive zoom
      handleWheel.apply(this, args);
    };
  }, [handleWheel]);
  
  // Enhanced escape key and shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if another handler already processed this event
      if (e.defaultPrevented) {
        return;
      }

      if (drawingState.drawingFoundation) {
        if (e.key === 'Escape') {
          cancelFoundationDrawing();
        }
      } else if (drawingState.drawingWall) {
        if (e.key === 'Escape') {
          cancelWallDrawing();
        } else if (e.key === 'Enter' || e.key === 'f' || e.key === 'F') {
          if (!drawingState.wallSegments || drawingState.wallSegments.length === 0) {
            return;
          }
          finishWallDrawing('default'); // Using default material
        }
      } else if (drawingState.drawingRailing) {
        if (e.key === 'Escape') {
          cancelRailingDrawing();
        } else if (e.key === 'Enter' || e.key === 'f' || e.key === 'F') {
          if (!drawingState.railingSegments || drawingState.railingSegments.length === 0) {
            return;
          }
          finishRailingDrawing('default'); // Using default material
        }
      } else if (drawingState.drawingRailway) {
        // Only handle Escape here - Enter/F is handled by useKeyboardShortcuts
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cancelRailwayDrawing();
        }
      } else if (drawingState.drawingPowerline?.isDrawing) {
        if (e.key === 'Escape') {
          cancelPowerlineDrawing();
        } else if (e.key === 'Enter' || e.key === 'f' || e.key === 'F') {
          finishPowerlineDrawing();
        }
      } else if (selectedTool === 'powerline' && powerlineConnectionState?.startPoint) {
        // Handle escape key for simplified powerline connection
        if (e.key === 'Escape') {
          clearPowerlineConnectionState();
        }
      } else if (drawingState.drawingPipe) {
        if (e.key === 'Escape') {
          cancelPipeDrawing();
        } else if (e.key === 'Enter' || e.key === 'f' || e.key === 'F') {
          if (!drawingState.pipePath || drawingState.pipePath.length < 2) {
            return;
          }
          finishPipeDrawing();
        }
      } else if (drawingState.isDrawing) {
        if (e.key === 'Escape') {
          cancelDrawing();
        } else if (e.key === 'Enter' || e.key === 'f' || e.key === 'F') {
          if (drawingState.currentPath.length < 2) {
            return;
          }
          finishConveyorDrawing();
        }
      } else if ((e.key === 'r' || e.key === 'R')) {
        const currentMode = drawingState.conveyorMode;
        actions.setConveyorMode(
          currentMode === 'default' ? 'straight' : 'default'
        );
      } else if (e.key === 'd' && e.ctrlKey && e.shiftKey) {
        // Toggle railway debug overlay with Ctrl+Shift+D
        e.preventDefault();
        setShowRailwayDebug(prev => !prev);
      } else if (e.key === 'f' && e.ctrlKey && e.shiftKey) {
        // Toggle performance debug panel with Ctrl+Shift+F (F for FPS)
        e.preventDefault();
        // Performance debug panel was removed during cleanup
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingState, selectedTool, powerlineConnectionState, clearPowerlineConnectionState, cancelDrawing, finishConveyorDrawing, cancelRailwayDrawing, 
      finishRailwayDrawing, cancelPowerlineDrawing, finishPowerlineDrawing, cancelPipeDrawing, finishPipeDrawing, 
      cancelFoundationDrawing, cancelWallDrawing, finishWallDrawing, 
      cancelRailingDrawing, finishRailingDrawing, showRailwayDebug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if another handler already processed this event
      if (e.defaultPrevented) {
        return;
      }

      // Skip if typing in an input field (allows Delete/Backspace in text areas)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
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
        } else if (selectedFoundation) {
          deleteFoundation(selectedFoundation);
          setSelectedFoundation(null);
        } else if (selectedWall) {
          deleteWallSegment(selectedWall);
          setSelectedWall(null);
          setSelectedRailing(null);
        } else if (selectedRailing) {
          deleteRailingSegment(selectedRailing);
          setSelectedRailing(null);
        } else if (selectedPowerlineSegment) {
          deletePowerlineSegment(selectedPowerlineSegment);
          setSelectedPowerlineSegment(null);
        } else if (selectedPowerPole) {
          deletePowerPole(selectedPowerPole);
          actions.setSelectedPowerPole(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBuilding, selectedPole, selectedPipeSupport, selectedStickyNote, 
      selectedConveyorLift, selectedPipeFloorConnection, selectedFoundation, selectedWall, selectedRailing,
      selectedPowerlineSegment, selectedPowerPole,
      deleteBuilding, deletePole, deletePipeSupport, deleteStickyNote,
      deleteConveyorLift, deletePipeFloorConnection, deleteFoundation, deleteWallSegment, deleteRailingSegment,
      deletePowerlineSegment, deletePowerPole,
      setSelectedBuilding, setSelectedPole, setSelectedPipeSupport, setSelectedStickyNote,
      setSelectedConveyorLift, setSelectedPipeFloorConnection, setSelectedFoundation, setSelectedWall, setSelectedRailing,
      setSelectedPowerlineSegment, actions.setSelectedPowerPole]);
  
  // Handle space key for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input field (allows spacebar in text areas)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Skip if typing in an input field (allows spacebar in text areas)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Cleanup dragging state and RAF on unmount
  useEffect(() => {
    return () => {
      isDraggingRef.current = false;

      // Cancel any pending drag position update RAF
      if (dragPositionUpdateRef.current) {
        cancelAnimationFrame(dragPositionUpdateRef.current);
        dragPositionUpdateRef.current = null;
      }
    };
  }, []);

  // Helper function to determine building opacity
  const getBuildingOpacity = useMemoizedCallback((building: Building, isGhost: boolean) => {
    if (isGhost) return 0.2;
    
    const buildingDef = BUILDING_TYPES[building.type];
    if (!buildingDef) return 1;
    
    if (building.floor < currentFloor) {
      const buildingTop = building.z + buildingDef.depth;
      const currentFloorBottom = currentFloor * FLOOR_HEIGHT;
      const visibleHeight = buildingTop - currentFloorBottom;
      const opacity = Math.min(1, Math.max(0.3, visibleHeight / buildingDef.depth));
      return opacity;
    }
    
    return 1;
  }, [currentFloor]);

  // Check if drawing is active
  const isDrawing = drawingState.isDrawing || drawingState.drawingPipe || drawingState.drawingRailway || drawingState.drawingPowerline?.isDrawing;
  const panelClass = config.enableBackdropBlur ? 'glass-panel' : 'glass-panel-solid';

  return (
    <div
      className={`w-full h-full relative overflow-hidden transition-all duration-300 ${
        dragOver ? 'bg-blue-900/20' :
        isSpacePressed ? 'cursor-grab' :
        isStageDraggable ? 'cursor-grab' :
        'bg-gradient-to-br from-slate-900/80 via-gray-900/80 to-slate-800/80'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
{/* Enhanced drag overlay */}
      {dragOver && config.enableAnimations && (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
  >
    <div className={`${panelClass} absolute inset-0 z-10 pointer-events-none flex items-center justify-center`}>
      <div className={`${panelClass} px-8 py-4 text-center ${
        dragValidation && !dragValidation.isValid ? 'border-2 border-red-500 bg-red-900/20' : ''
      }`}>
        <div className={`text-2xl font-bold mb-2 ${
          dragValidation && !dragValidation.isValid ? 'text-red-400' : 'gradient-text'
        }`}>
          {dragValidation && !dragValidation.isValid 
            ? `Invalid ${dragValidation.buildingType} placement` 
            : 'Drop Building Here'}
        </div>
        <div className={`${dragValidation && !dragValidation.isValid ? 'text-red-300' : 'text-slate-400'}`}>
          {dragValidation && !dragValidation.isValid
            ? (dragValidation.blockedMessage
                ? dragValidation.blockedMessage
                : `${dragValidation.buildingType.charAt(0).toUpperCase() + dragValidation.buildingType.slice(1)}s must be placed on walls`)
            : 'Release to place at cursor position'}
        </div>
      </div>
    </div>
  </motion.div>
)}
      
      {/* Enhanced canvas background - only on higher performance */}
      {config.shadowQuality !== 'low' && (
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(rgba(250, 149, 73, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(250, 149, 73, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: config.enableAnimations ? 'hex-float 20s linear infinite' : 'none'
            }}
          ></div>
          
          {config.enableGlowEffects && (
            <>
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
            </>
          )}
        </div>
      )}
      
      {/* Overlay Toolbar */}
      <div className="relative z-50">
        <OverlayToolbar />
      </div>

      {/* Mobile Drawing Controls */}
      {isMobile && isDrawing && (
        <MobileDrawingControls />
      )}

      <Stage
        ref={stageRef}
        width={Math.max(1, canvasSize.width * renderQuality)}
        height={Math.max(1, canvasSize.height * renderQuality)}
        // PERFORMANCE OPTIMIZATION: Scale managed imperatively via useEffect (see line ~500)
        // Removed scaleX={scale} and scaleY={scale} to eliminate Stage reconciliation overhead
        // CRITICAL FPS FIX: Disable Konva's automatic drag to prevent batchDraw() on every pixel
        // We use manual mouse-based drag control with throttled redraws (see handleCanvasDragStart/Move/End)
        draggable={false}
        listening={true}
        hitGraphEnabled={false}
        pixelRatio={1}
        onMouseDown={handleCanvasDragStart}
        onMouseMove={(e: any) => {
          // Handle canvas dragging if active
          if (isDraggingRef.current) {
            handleCanvasDragMove(e);
          } else {
            // Normal mouse move handling
            throttledMouseMove(e);
          }
        }}
        onMouseUp={handleCanvasDragEnd}
        onMouseLeave={handleCanvasDragEnd}
        onWheel={throttledWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={throttledMouseMove}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          cursor: isStageDraggable && selectedTool === 'select' ? 'grab' : 'default',
        }}
      >
        {/* Background Layer - Grid + Floor Below objects (non-interactive, optimized) */}
        {/* NOTE: position prop is REQUIRED by GridBackground for correct grid rendering */}
        {/* Custom memo comparison prevents re-renders during drag - see BackgroundLayer.tsx line 241 */}
        <BackgroundLayer
          showGrid={showGrid}
          canvasSize={canvasSize}
          scale={scale}
          position={position}
          stageRef={stageRef}
          floorBelowFoundations={floorBelowFoundations}
          floorBelowBuildings={floorBelowBuildings}
          floorBelowWalls={floorBelowWalls}
          floorBelowRailings={floorBelowRailings}
          floorBelowConveyors={floorBelowConveyors}
          floorBelowPipelines={floorBelowPipelines}
          floorBelowPoles={floorBelowPoles}
          floorBelowPipeSupports={floorBelowPipeSupports}
          floorBelowRailways={floorBelowRailways}
          floorBelowPowerlineSegments={floorBelowPowerlineSegments}
        />

        {/* Sticky Notes Layer - Sticky notes above grid but BELOW buildings/infrastructure */}
        <StickyNotesLayer
          stickyNotes={stickyNotes}
          currentFloor={currentFloor}
          selectedStickyNote={selectedStickyNote}
          handleStickyNoteSelect={handleStickyNoteSelect}
          handleStickyNoteDragEnd={handleStickyNoteDragEnd}
        />

        {/* Main Content Layer - Current floor interactive objects (rendered above sticky notes) */}
        <MainContentLayer
          currentFloorFoundations={currentFloorFoundations}
          selectedFoundation={selectedFoundation}
          handleFoundationSelect={handleFoundationSelect}
          handleFoundationDragEnd={handleFoundationDragEnd}
          currentFloorBuildings={currentFloorBuildings}
          selectedBuilding={selectedBuilding}
          getBuildingOpacity={getBuildingOpacity}
          handleBuildingSelect={handleBuildingSelect}
          handleBuildingDragStart={handleBuildingDragStart}
          handleBuildingDragEnd={handleBuildingDragEnd}
          scale={scale}
          currentFloorWalls={currentFloorWalls}
          selectedWall={selectedWall}
          handleWallSelect={handleWallSelect}
          handleWallDragEnd={handleWallDragEnd}
          currentFloorRailings={currentFloorRailings}
          selectedRailing={selectedRailing}
          handleRailingSelect={handleRailingSelect}
          handleRailingDragEnd={handleRailingDragEnd}
          currentFloorConveyors={currentFloorConveyors}
          handleBeltClick={handleBeltClick}
          currentFloorPipelines={currentFloorPipelines}
          currentFloorPoles={currentFloorPoles}
          selectedPole={selectedPole}
          handlePoleSelect={handlePoleSelect}
          currentFloorPipeSupports={currentFloorPipeSupports}
          selectedPipeSupport={selectedPipeSupport}
          handlePipeSupportSelect={handlePipeSupportSelect}
          currentFloorPowerPoles={currentFloorPowerPoles}
          selectedPowerPole={selectedPowerPole}
          handlePowerPoleSelect={handlePowerPoleSelect}
          handlePowerPoleDragEnd={handlePowerPoleDragEnd}
          currentFloorRailways={currentFloorRailways}
          showRailwayDebug={showRailwayDebug}
        />

        {/* Overlay Layer - Lifts, connections, powerlines + UI overlays (optimized) */}
        <OverlayLayer
          conveyorLifts={conveyorLifts}
          pipeFloorConnections={pipeFloorConnections}
          currentFloorPowerlineSegments={currentFloorPowerlineSegments}
          selectedPowerlineSegment={selectedPowerlineSegment}
          scale={scale}
          drawingState={drawingState}
          selectedTool={selectedTool}
          powerlineConnectionState={powerlineConnectionState}
          mousePos={mousePos}
          stageRef={stageRef}
          position={position}
          currentFloor={currentFloor}
          config={config}
          gridSnappingEnabled={gridSnappingEnabled}
          stationSnapIndicator={stationSnapIndicator}
        />

        {/* Production Overlay Layer - Shows production badges and flow rates */}
        {productionOverlaySettings && (
          <ProductionOverlayLayer
            currentFloor={currentFloor}
            scale={scale}
            settings={productionOverlaySettings}
          />
        )}
      </Stage>
      
      {/* Enhanced controls with better mobile styling */}
<div className={`absolute ${isMobile ? 'bottom-24' : 'bottom-6'} right-6 z-20`}>
  <div className={`${panelClass} p-3 space-y-3`}>
    <AnimatedButton
      className={`sci-fi-button p-3 w-full flex items-center justify-center ${isMobile ? 'min-h-[48px]' : ''}`}
      onClick={() => {
        const newScale = Math.min(scale * 1.1, MAX_ZOOM);
        setScale(newScale);
        if (onZoomChange) onZoomChange(newScale);
      }}
    >
      <ZoomIn size={isMobile ? 24 : 20} />
    </AnimatedButton>

    <div className="text-center text-sm font-mono font-bold text-orange-300">
      {Math.round(scale * 100)}%
    </div>

    <AnimatedButton
      className={`sci-fi-button p-3 w-full flex items-center justify-center ${isMobile ? 'min-h-[48px]' : ''}`}
      onClick={() => {
        const newScale = Math.max(scale / 1.1, MIN_ZOOM);
        setScale(newScale);
        if (onZoomChange) onZoomChange(newScale);
      }}
    >
      <ZoomOut size={isMobile ? 24 : 20} />
    </AnimatedButton>

  </div>
</div>

      </div>
  );
};
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLayoutStore } from '../store/layoutStore';
import { 
  Point3D,
  UniversalSpatialResult,
  SpatialQueryOptions
} from '../tauri/commands';
import { 
  queryBuildingsRadius, 
  universalSpatialQuery, 
  getSpatialStats
} from '../tauri/universalCommands';
import { isTauriEnvironment } from '../tauri/environment';
import { BUILDING_TYPES } from '../constants';

export interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface BufferedViewportBounds extends ViewportBounds {
  bufferedLeft: number;
  bufferedRight: number;
  bufferedTop: number;
  bufferedBottom: number;
  bufferZone: number;
}

export interface ViewportObjects {
  buildings: any[];
  conveyorPoles: any[];
  pipeSupports: any[];
  conveyorBelts: any[];
  pipelines: any[];
  railways: any[];
  powerlineSegments: any[];
  foundations: any[];
  wallSegments: any[];
  railingSegments: any[];
}

export interface ViewportPerformanceMetrics {
  totalObjectsChecked: number;
  visibleObjectsReturned: number;
  queryTimeMs: number;
  fallbackUsed: boolean;
  spatialIndexUsed: boolean;
  lastUpdateTime: number;
}

// Entity count tracking for efficient cache invalidation
interface EntityCounts {
  buildings: number;
  conveyorPoles: number;
  pipeSupports: number;
  conveyorBelts: number;
  pipelines: number;
  railways: number;
  powerlineSegments: number;
  foundations: number;
  wallSegments: number;
  railingSegments: number;
}

// Viewport result cache to avoid redundant queries
interface ViewportResultCache {
  bounds: ViewportBounds;
  floor: number;
  showFloorBelow: boolean;
  results: ViewportObjects;
  timestamp: number;
  entityCountHash: string;  // Quick hash of entity counts to detect data changes
}

const VIEWPORT_UPDATE_THRESHOLD = 150; // pixels - more aggressive threshold to reduce updates
const RUST_QUERY_RADIUS_MULTIPLIER = 1.8; // Query larger area for buffering
const VIEWPORT_BUFFER_PERCENTAGE = 0.3; // 30% buffer zone around viewport
const VIEWPORT_UPDATE_DEBOUNCE = 16; // ~60fps max update rate
const CACHE_MAX_AGE_MS = 500; // Maximum age of cached results before forced refresh
const CACHE_BOUNDS_TOLERANCE = 50; // Pixels of bounds change before cache invalidation

// Add graceful degradation when Rust fails
const handleRustError = (error: any, operation: string): void => {
  console.warn(`Viewport system: ${operation} failed, using fallback:`, error);
  // Could add telemetry here to track Rust failures
};

export const useViewportSystem = (
  bounds: ViewportBounds,
  currentFloor: number,
  showFloorBelow: boolean = false,
  isDraggingRef?: React.MutableRefObject<boolean>  // Optional ref to check current drag state
) => {
  const [visibleObjects, setVisibleObjects] = useState<ViewportObjects>({
    buildings: [],
    conveyorPoles: [],
    pipeSupports: [],
    conveyorBelts: [],
    pipelines: [],
    railways: [],
    powerlineSegments: [],
    foundations: [],
    wallSegments: [],
    railingSegments: []
  });
  
  const [performanceMetrics, setPerformanceMetrics] = useState<ViewportPerformanceMetrics>({
    totalObjectsChecked: 0,
    visibleObjectsReturned: 0,
    queryTimeMs: 0,
    fallbackUsed: false,
    spatialIndexUsed: false,
    lastUpdateTime: 0
  });

  const [isRustAvailable, setIsRustAvailable] = useState(false);
  const lastBoundsRef = useRef<ViewportBounds | null>(null);
  const lastBufferedBoundsRef = useRef<BufferedViewportBounds | null>(null);
  const updateDebounceRef = useRef<NodeJS.Timeout>();
  const rafRef = useRef<number | null>(null);

  // Track previous entity counts to detect actual additions/removals (not just reference changes)
  const prevEntityCountsRef = useRef<EntityCounts | null>(null);

  // Cache for viewport query results to avoid redundant queries
  const resultCacheRef = useRef<ViewportResultCache | null>(null);

  // Get store data for fallback
  const {
    buildings,
    conveyorPoles,
    pipeSupports,
    conveyorBelts,
    pipelines,
    railways,
    powerlineSegments,
    foundations,
    wallSegments,
    railingSegments,
    powerlines
  } = useLayoutStore();

  // Create buffered viewport bounds with 30% buffer zone
  const createBufferedBounds = useCallback((bounds: ViewportBounds): BufferedViewportBounds => {
    const bufferX = bounds.width * VIEWPORT_BUFFER_PERCENTAGE;
    const bufferY = bounds.height * VIEWPORT_BUFFER_PERCENTAGE;
    
    return {
      ...bounds,
      bufferedLeft: bounds.left - bufferX,
      bufferedRight: bounds.right + bufferX,
      bufferedTop: bounds.top - bufferY,
      bufferedBottom: bounds.bottom + bufferY,
      bufferZone: Math.max(bufferX, bufferY)
    };
  }, []);

  // Check if viewport moved outside buffered area (requires update)
  const needsBufferUpdate = useCallback((newBounds: ViewportBounds): boolean => {
    if (!lastBufferedBoundsRef.current) return true;
    
    const buffered = lastBufferedBoundsRef.current;
    
    // Check if current viewport is still within buffered area
    return newBounds.left < buffered.bufferedLeft ||
           newBounds.right > buffered.bufferedRight ||
           newBounds.top < buffered.bufferedTop ||
           newBounds.bottom > buffered.bufferedBottom ||
           Math.abs(newBounds.width - buffered.width) > VIEWPORT_UPDATE_THRESHOLD * 0.1 ||
           Math.abs(newBounds.height - buffered.height) > VIEWPORT_UPDATE_THRESHOLD * 0.1;
  }, []);

  // Check if significant viewport change occurred for legacy compatibility
  const hasSignificantViewportChange = useCallback((newBounds: ViewportBounds): boolean => {
    if (!lastBoundsRef.current) return true;

    const lastBounds = lastBoundsRef.current;
    const deltaX = Math.abs(newBounds.left - lastBounds.left);
    const deltaY = Math.abs(newBounds.top - lastBounds.top);
    const deltaWidth = Math.abs(newBounds.width - lastBounds.width);
    const deltaHeight = Math.abs(newBounds.height - lastBounds.height);

    return deltaX > VIEWPORT_UPDATE_THRESHOLD ||
           deltaY > VIEWPORT_UPDATE_THRESHOLD ||
           deltaWidth > VIEWPORT_UPDATE_THRESHOLD * 0.1 ||
           deltaHeight > VIEWPORT_UPDATE_THRESHOLD * 0.1;
  }, []);

  // Generate a quick hash for entity counts to detect data changes
  const generateEntityCountHash = useCallback((counts: EntityCounts): string => {
    return `${counts.buildings}-${counts.conveyorPoles}-${counts.pipeSupports}-${counts.conveyorBelts}-${counts.pipelines}-${counts.railways}-${counts.powerlineSegments}-${counts.foundations}-${counts.wallSegments}-${counts.railingSegments}`;
  }, []);

  // Check if we can use cached results (bounds similar enough, cache not stale, data unchanged)
  const canUseCachedResults = useCallback((
    targetBounds: ViewportBounds,
    entityCountHash: string
  ): boolean => {
    const cache = resultCacheRef.current;
    if (!cache) return false;

    // Check if cache is too old
    const cacheAge = Date.now() - cache.timestamp;
    if (cacheAge > CACHE_MAX_AGE_MS) return false;

    // Check if floor or showFloorBelow changed
    if (cache.floor !== currentFloor || cache.showFloorBelow !== showFloorBelow) return false;

    // Check if entity data changed
    if (cache.entityCountHash !== entityCountHash) return false;

    // Check if bounds are similar enough (within tolerance)
    const cachedBounds = cache.bounds;
    const deltaLeft = Math.abs(targetBounds.left - cachedBounds.left);
    const deltaRight = Math.abs(targetBounds.right - cachedBounds.right);
    const deltaTop = Math.abs(targetBounds.top - cachedBounds.top);
    const deltaBottom = Math.abs(targetBounds.bottom - cachedBounds.bottom);

    // If the target bounds are still within the cached buffered bounds, we can reuse
    const withinTolerance = deltaLeft < CACHE_BOUNDS_TOLERANCE &&
                           deltaRight < CACHE_BOUNDS_TOLERANCE &&
                           deltaTop < CACHE_BOUNDS_TOLERANCE &&
                           deltaBottom < CACHE_BOUNDS_TOLERANCE;

    return withinTolerance;
  }, [currentFloor, showFloorBelow]);

  // Fallback filtering functions (original O(n) logic for web environment)
  const filterObjectsFallback = useCallback((targetBounds: ViewportBounds) => {
    const startTime = performance.now();

    // Helper functions matching original logic
    const isBuildingVisible = (building: any, buildingDef: any): boolean => {
      if (!buildingDef) return false;
      const left = building.x;
      const right = building.x + buildingDef.width;
      const top = building.y;
      const bottom = building.y + buildingDef.depth;
      
      return !(right < targetBounds.left || left > targetBounds.right || 
               bottom < targetBounds.top || top > targetBounds.bottom);
    };

    const isPointVisible = (x: number, y: number, padding = 2): boolean => {
      return x >= targetBounds.left - padding && 
             x <= targetBounds.right + padding && 
             y >= targetBounds.top - padding && 
             y <= targetBounds.bottom + padding;
    };

    // Filter buildings
    const allBuildings = Object.values(buildings);
    const currentFloorBuildings = allBuildings.filter((b: any) => {
      const buildingDef = BUILDING_TYPES[b.type];
      const isOnFloor = b.floor === currentFloor;
      return isOnFloor && isBuildingVisible(b, buildingDef);
    });

    const floorBelowBuildings = showFloorBelow ? allBuildings.filter((b: any) => {
      const buildingDef = BUILDING_TYPES[b.type];
      const isOnFloorBelow = b.floor === currentFloor - 1;
      return isOnFloorBelow && isBuildingVisible(b, buildingDef);
    }) : [];

    // Filter other objects
    const allPoles = Object.values(conveyorPoles);
    const currentFloorPoles = allPoles.filter((p: any) =>
      p.floor === currentFloor && isPointVisible(p.x, p.y)
    );
    const floorBelowPoles = showFloorBelow ? 
      allPoles.filter((p: any) => p.floor === currentFloor - 1 && isPointVisible(p.x, p.y)) : [];

    const allSupports = Object.values(pipeSupports);
    const currentFloorPipeSupports = allSupports.filter((s: any) => 
      s.floor === currentFloor && isPointVisible(s.x, s.y)
    );
    const floorBelowPipeSupports = showFloorBelow ? 
      allSupports.filter((s: any) => s.floor === currentFloor - 1 && isPointVisible(s.x, s.y)) : [];

    // Infrastructure filtering (less expensive, no visibility checks needed for lines)
    const allConveyors = Object.values(conveyorBelts);
    const currentFloorConveyors = allConveyors.filter((belt: any) => belt.floor === currentFloor);
    const floorBelowConveyors = showFloorBelow ? 
      allConveyors.filter((belt: any) => belt.floor === currentFloor - 1) : [];

    const allPipelines = Object.values(pipelines);
    const currentFloorPipelines = allPipelines.filter((pipeline: any) => pipeline.floor === currentFloor);
    const floorBelowPipelines = showFloorBelow ? 
      allPipelines.filter((pipeline: any) => pipeline.floor === currentFloor - 1) : [];

    const allRailways = Object.values(railways);
    const currentFloorRailways = allRailways.filter((railway: any) => railway.floor === currentFloor);
    const floorBelowRailways = showFloorBelow ? 
      allRailways.filter((railway: any) => railway.floor === currentFloor - 1) : [];

    // Powerline segments - use segment's own floor property for better reliability
    const allPowerlineSegments = Object.values(powerlineSegments);

    // DEBUG: Log floor comparison details for powerline segments
    if (allPowerlineSegments.length > 0) {
      console.log('[ViewportSystem-Fallback] Powerline floor check - currentFloor:', currentFloor, '(type:', typeof currentFloor, ')');
      allPowerlineSegments.forEach((seg: any) => {
        console.log('[ViewportSystem-Fallback] Segment', seg.id, '- floor:', seg.floor, '(type:', typeof seg.floor, '), match:', seg.floor === currentFloor);
      });
    }

    const currentFloorPowerlineSegments = allPowerlineSegments.filter((segment: any) => {
      // Use segment's floor property directly if available, otherwise fall back to powerline mapping
      if (segment.floor !== undefined) {
        // Use loose equality (==) in case of number/string mismatch, but log if types differ
        const matches = segment.floor == currentFloor;
        if (segment.floor !== currentFloor && matches) {
          console.warn('[ViewportSystem-Fallback] Floor type mismatch! segment.floor:', segment.floor, '(type:', typeof segment.floor, '), currentFloor:', currentFloor, '(type:', typeof currentFloor, ')');
        }
        return matches;
      }

      // Fallback to powerline mapping if segment doesn't have floor property
      const powerlineEntry = Object.values(powerlines).find((powerline: any) =>
        powerline.segments && powerline.segments.includes(segment.id)
      );
      return powerlineEntry && powerlineEntry.floor == currentFloor;
    });
    const floorBelowPowerlineSegments = showFloorBelow ?
      allPowerlineSegments.filter((segment: any) => {
        // Use segment's floor property directly if available
        if (segment.floor !== undefined) {
          // Use loose equality (==) in case of number/string mismatch
          return segment.floor == currentFloor - 1;
        }

        // Fallback to powerline mapping
        const powerlineEntry = Object.values(powerlines).find((powerline: any) =>
          powerline.segments && powerline.segments.includes(segment.id)
        );
        return powerlineEntry && powerlineEntry.floor == currentFloor - 1;
      }) : [];

    const allFoundations = Object.values(foundations);
    const currentFloorFoundations = allFoundations.filter((f: any) => f.floor === currentFloor);
    const floorBelowFoundations = showFloorBelow ? 
      allFoundations.filter((f: any) => f.floor === currentFloor - 1) : [];

    const allWalls = Object.values(wallSegments);
    const currentFloorWalls = allWalls.filter((w: any) => w.floor === currentFloor);
    const floorBelowWalls = showFloorBelow ? 
      allWalls.filter((w: any) => w.floor === currentFloor - 1) : [];

    const allRailings = Object.values(railingSegments);
    const currentFloorRailings = allRailings.filter((r: any) => r.floor === currentFloor);
    const floorBelowRailings = showFloorBelow ? 
      allRailings.filter((r: any) => r.floor === currentFloor - 1) : [];

    const endTime = performance.now();
    const totalObjects = [...currentFloorBuildings, ...floorBelowBuildings, 
                          ...currentFloorPoles, ...floorBelowPoles,
                          ...currentFloorPipeSupports, ...floorBelowPipeSupports].length;

    setPerformanceMetrics({
      totalObjectsChecked: allBuildings.length + allPoles.length + allSupports.length,
      visibleObjectsReturned: totalObjects,
      queryTimeMs: endTime - startTime,
      fallbackUsed: true,
      spatialIndexUsed: false,
      lastUpdateTime: Date.now()
    });

    return {
      buildings: [...currentFloorBuildings, ...floorBelowBuildings],
      conveyorPoles: [...currentFloorPoles, ...floorBelowPoles],
      pipeSupports: [...currentFloorPipeSupports, ...floorBelowPipeSupports],
      conveyorBelts: [...currentFloorConveyors, ...floorBelowConveyors],
      pipelines: [...currentFloorPipelines, ...floorBelowPipelines],
      railways: [...currentFloorRailways, ...floorBelowRailways],
      powerlineSegments: [...currentFloorPowerlineSegments, ...floorBelowPowerlineSegments],
      foundations: [...currentFloorFoundations, ...floorBelowFoundations],
      wallSegments: [...currentFloorWalls, ...floorBelowWalls],
      railingSegments: [...currentFloorRailings, ...floorBelowRailings]
    };
  }, [buildings, conveyorPoles, pipeSupports, conveyorBelts, pipelines, railways, 
      powerlineSegments, foundations, wallSegments, railingSegments, powerlines, 
      currentFloor, showFloorBelow]);

  // Rust-powered spatial query
  const queryObjectsRust = useCallback(async (targetBounds: ViewportBounds) => {
    const startTime = performance.now();

    try {
      // Calculate query center and radius from bounds
      const centerX = (targetBounds.left + targetBounds.right) / 2;
      const centerY = (targetBounds.top + targetBounds.bottom) / 2;
      const radiusX = (targetBounds.right - targetBounds.left) / 2;
      const radiusY = (targetBounds.bottom - targetBounds.top) / 2;
      const queryRadius = Math.max(radiusX, radiusY) * RUST_QUERY_RADIUS_MULTIPLIER;

      const queryCenter: Point3D = {
        x: centerX,
        y: centerY,
        z: currentFloor * 4 // FLOOR_HEIGHT = 4
      };

      const queryOptions: SpatialQueryOptions = {
        exclude_ids: [],
        include_buildings: true,
        include_railway_nodes: true,
        include_conveyor_poles: true,
        include_pipe_supports: true
      };

      // Use universal spatial query to get all nearby objects
      const rustResult: UniversalSpatialResult = await universalSpatialQuery(
        queryCenter, 
        queryRadius, 
        queryOptions
      );

      // Filter results by floor and target bounds (including buffer zone)
      const filterByFloorAndBounds = (objects: any[], targetFloor: number) => {
        return objects.filter((obj: any) => {
          if (obj.floor !== targetFloor) return false;

          // For buildings, check building bounds against target area
          if (obj.type && obj.width && obj.depth) {
            const left = obj.x;
            const right = obj.x + obj.width;
            const top = obj.y;
            const bottom = obj.y + obj.depth;
            return !(right < targetBounds.left || left > targetBounds.right ||
                     bottom < targetBounds.top || top > targetBounds.bottom);
          }

          // For point objects, check if point is in target bounds (with small padding)
          const padding = 2;
          return obj.x >= targetBounds.left - padding &&
                 obj.x <= targetBounds.right + padding &&
                 obj.y >= targetBounds.top - padding &&
                 obj.y <= targetBounds.bottom + padding;
        });
      };

      // Apply floor filtering
      const currentFloorBuildings = filterByFloorAndBounds(rustResult.buildings, currentFloor);

      const floorBelowBuildings = showFloorBelow ?
        filterByFloorAndBounds(rustResult.buildings, currentFloor - 1) : [];

      // For conveyor poles, use store data since Rust backend isn't synced with frontend state
      // (poles are added/removed frequently during drawing and aren't synced to Rust spatial index)
      const allConveyorPoles = Object.values(conveyorPoles);
      const currentFloorPoles = filterByFloorAndBounds(allConveyorPoles, currentFloor);
      const floorBelowPoles = showFloorBelow ?
        filterByFloorAndBounds(allConveyorPoles, currentFloor - 1) : [];

      // For pipe supports, use store data since Rust backend isn't synced with frontend state
      const allPipeSupports = Object.values(pipeSupports);
      const currentFloorPipeSupports = filterByFloorAndBounds(allPipeSupports, currentFloor);
      const floorBelowPipeSupports = showFloorBelow ?
        filterByFloorAndBounds(allPipeSupports, currentFloor - 1) : [];

      // For linear infrastructure, we still need to filter from store (Rust spatial index doesn't handle these yet)
      const allConveyors = Object.values(conveyorBelts);
      const currentFloorConveyors = allConveyors.filter((belt: any) => belt.floor === currentFloor);
      const floorBelowConveyors = showFloorBelow ? 
        allConveyors.filter((belt: any) => belt.floor === currentFloor - 1) : [];

      const allPipelines = Object.values(pipelines);
      const currentFloorPipelines = allPipelines.filter((pipeline: any) => pipeline.floor === currentFloor);
      const floorBelowPipelines = showFloorBelow ? 
        allPipelines.filter((pipeline: any) => pipeline.floor === currentFloor - 1) : [];

      const allRailways = Object.values(railways);
      const currentFloorRailways = allRailways.filter((railway: any) => railway.floor === currentFloor);
      const floorBelowRailways = showFloorBelow ? 
        allRailways.filter((railway: any) => railway.floor === currentFloor - 1) : [];

      // Powerline segments - use segment's own floor property for better reliability
      const allPowerlineSegments = Object.values(powerlineSegments);
      const currentFloorPowerlineSegments = allPowerlineSegments.filter((segment: any) => {
        // Use segment's floor property directly if available, otherwise fall back to powerline mapping
        if (segment.floor !== undefined) {
          // Use loose equality (==) in case of number/string mismatch
          return segment.floor == currentFloor;
        }

        // Fallback to powerline mapping if segment doesn't have floor property
        const powerlineEntry = Object.values(powerlines).find((powerline: any) =>
          powerline.segments && powerline.segments.includes(segment.id)
        );
        return powerlineEntry && powerlineEntry.floor == currentFloor;
      });
      const floorBelowPowerlineSegments = showFloorBelow ?
        allPowerlineSegments.filter((segment: any) => {
          // Use segment's floor property directly if available
          if (segment.floor !== undefined) {
            // Use loose equality (==) in case of number/string mismatch
            return segment.floor == currentFloor - 1;
          }

          // Fallback to powerline mapping
          const powerlineEntry = Object.values(powerlines).find((powerline: any) =>
            powerline.segments && powerline.segments.includes(segment.id)
          );
          return powerlineEntry && powerlineEntry.floor == currentFloor - 1;
        }) : [];

      const allFoundations = Object.values(foundations);
      const currentFloorFoundations = allFoundations.filter((f: any) => f.floor === currentFloor);
      const floorBelowFoundations = showFloorBelow ? 
        allFoundations.filter((f: any) => f.floor === currentFloor - 1) : [];

      const allWalls = Object.values(wallSegments);
      const currentFloorWalls = allWalls.filter((w: any) => w.floor === currentFloor);
      const floorBelowWalls = showFloorBelow ? 
        allWalls.filter((w: any) => w.floor === currentFloor - 1) : [];

      const allRailings = Object.values(railingSegments);
      const currentFloorRailings = allRailings.filter((r: any) => r.floor === currentFloor);
      const floorBelowRailings = showFloorBelow ? 
        allRailings.filter((r: any) => r.floor === currentFloor - 1) : [];

      const endTime = performance.now();
      const totalVisibleObjects = [...currentFloorBuildings, ...floorBelowBuildings, 
                                   ...currentFloorPoles, ...floorBelowPoles,
                                   ...currentFloorPipeSupports, ...floorBelowPipeSupports].length;

      setPerformanceMetrics({
        totalObjectsChecked: rustResult.buildings.length + allConveyorPoles.length + allPipeSupports.length,
        visibleObjectsReturned: totalVisibleObjects,
        queryTimeMs: endTime - startTime,
        fallbackUsed: false,
        spatialIndexUsed: true,
        lastUpdateTime: Date.now()
      });

      return {
        buildings: [...currentFloorBuildings, ...floorBelowBuildings],
        conveyorPoles: [...currentFloorPoles, ...floorBelowPoles],
        pipeSupports: [...currentFloorPipeSupports, ...floorBelowPipeSupports],
        conveyorBelts: [...currentFloorConveyors, ...floorBelowConveyors],
        pipelines: [...currentFloorPipelines, ...floorBelowPipelines],
        railways: [...currentFloorRailways, ...floorBelowRailways],
        powerlineSegments: [...currentFloorPowerlineSegments, ...floorBelowPowerlineSegments],
        foundations: [...currentFloorFoundations, ...floorBelowFoundations],
        wallSegments: [...currentFloorWalls, ...floorBelowWalls],
        railingSegments: [...currentFloorRailings, ...floorBelowRailings]
      };

    } catch (error) {
      handleRustError(error, 'spatial query');
      return filterObjectsFallback(targetBounds);
    }
  }, [currentFloor, showFloorBelow, conveyorBelts, pipelines, railways, powerlineSegments, 
      foundations, wallSegments, railingSegments, powerlines, filterObjectsFallback]);

  // Compute current entity count hash for cache validation
  const currentEntityCountHash = useMemo(() => {
    const counts: EntityCounts = {
      buildings: Object.keys(buildings).length,
      conveyorPoles: Object.keys(conveyorPoles).length,
      pipeSupports: Object.keys(pipeSupports).length,
      conveyorBelts: Object.keys(conveyorBelts).length,
      pipelines: Object.keys(pipelines).length,
      railways: Object.keys(railways).length,
      powerlineSegments: Object.keys(powerlineSegments).length,
      foundations: Object.keys(foundations).length,
      wallSegments: Object.keys(wallSegments).length,
      railingSegments: Object.keys(railingSegments).length,
    };
    return generateEntityCountHash(counts);
  }, [buildings, conveyorPoles, pipeSupports, conveyorBelts, pipelines,
      railways, powerlineSegments, foundations, wallSegments, railingSegments, generateEntityCountHash]);

  // Update visible objects using buffered viewport system with result caching
  const updateVisibleObjects = useCallback(async (targetBounds: ViewportBounds, forceUpdate: boolean = false, abortSignal?: AbortSignal) => {
    // Check if we can use cached results (fast path)
    if (!forceUpdate && canUseCachedResults(targetBounds, currentEntityCountHash)) {
      // Cache hit - use cached results without querying
      const cache = resultCacheRef.current!;
      setVisibleObjects(cache.results);
      setPerformanceMetrics(prev => ({
        ...prev,
        queryTimeMs: 0, // Cache hit = no query time
        lastUpdateTime: Date.now()
      }));
      return;
    }

    // Check if we need to update based on buffer boundaries instead of viewport boundaries
    if (!forceUpdate && !needsBufferUpdate(targetBounds)) {
      return; // Skip update if viewport is still within buffered area
    }

    // Create buffered bounds for pre-loading off-screen content
    const bufferedBounds = createBufferedBounds(targetBounds);
    lastBoundsRef.current = targetBounds;
    lastBufferedBoundsRef.current = bufferedBounds;

    try {
      let newVisibleObjects: ViewportObjects;

      if (isRustAvailable) {
        newVisibleObjects = await queryObjectsRust(bufferedBounds);
      } else {
        newVisibleObjects = filterObjectsFallback(bufferedBounds);
      }

      // Check if operation was cancelled before updating state
      if (abortSignal?.aborted) {
        return; // Operation was cancelled, don't update state
      }

      // DEBUG: Log viewport update completion
      console.log('[ViewportSystem] Setting visibleObjects with', newVisibleObjects.powerlineSegments.length, 'powerline segments');

      // Update the result cache with new results
      resultCacheRef.current = {
        bounds: targetBounds,
        floor: currentFloor,
        showFloorBelow,
        results: newVisibleObjects,
        timestamp: Date.now(),
        entityCountHash: currentEntityCountHash
      };

      setVisibleObjects(newVisibleObjects);
    } catch (error) {
      handleRustError(error, 'viewport update');
      // Check if operation was cancelled before fallback
      if (abortSignal?.aborted) {
        return; // Operation was cancelled, don't update state
      }

      // Fallback to frontend filtering on any error - also use buffered bounds
      const fallbackObjects = filterObjectsFallback(bufferedBounds);

      // Cache fallback results too
      resultCacheRef.current = {
        bounds: targetBounds,
        floor: currentFloor,
        showFloorBelow,
        results: fallbackObjects,
        timestamp: Date.now(),
        entityCountHash: currentEntityCountHash
      };

      setVisibleObjects(fallbackObjects);
    }
  }, [needsBufferUpdate, createBufferedBounds, isRustAvailable, queryObjectsRust, filterObjectsFallback,
      canUseCachedResults, currentEntityCountHash, currentFloor, showFloorBelow]);

  // Async operation cancellation for race condition prevention
  const currentOperationRef = useRef<AbortController | null>(null);

  // RAF-optimized viewport update with proper async cancellation
  const debouncedUpdateVisibleObjects = useCallback((targetBounds: ViewportBounds, isDragging: boolean = false) => {
    // CRITICAL DRAG OPTIMIZATION: Skip all viewport updates during active canvas dragging
    // The viewport will update once when dragging stops via handleCanvasDragEnd
    if (isDragging) {
      return;
    }

    // Cancel any existing debounced update
    if (updateDebounceRef.current) {
      clearTimeout(updateDebounceRef.current);
    }

    // Cancel any pending RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Cancel any in-flight async operation
    if (currentOperationRef.current) {
      currentOperationRef.current.abort();
      currentOperationRef.current = null;
    }

    // Use RAF for smooth updates during dragging, debounce for less frequent updates
    const performUpdate = async () => {
      // Create new abort controller for this operation
      const abortController = new AbortController();
      currentOperationRef.current = abortController;

      try {
        await updateVisibleObjects(targetBounds, false, abortController.signal);
      } catch (error) {
        // Only log if not cancelled
        if (!abortController.signal.aborted) {
          console.warn('Viewport update failed:', error);
        }
      } finally {
        // Clear the controller if it's still our current operation
        if (currentOperationRef.current === abortController) {
          currentOperationRef.current = null;
        }
        rafRef.current = null;
      }
    };

    // For immediate updates during active interaction, use RAF
    // For less frequent updates, use debounced timeout
    updateDebounceRef.current = setTimeout(() => {
      rafRef.current = requestAnimationFrame(performUpdate);
    }, VIEWPORT_UPDATE_DEBOUNCE);
  }, [updateVisibleObjects]);

  // Check Rust availability on mount
  useEffect(() => {
    const checkRustAvailability = async () => {
      try {
        // Check if we have ANY Rust backend (Tauri OR HTTP Bridge)
        const { isRustBackendAvailable } = await import('../tauri/environment');
        const hasRust = await isRustBackendAvailable();
        
        if (hasRust) {
          // Test spatial query to verify Rust backend is working
          await getSpatialStats();
          setIsRustAvailable(true);
          console.log('Viewport system: Rust backend available via HTTP bridge, using spatial indexing');
        } else {
          setIsRustAvailable(false);
          console.log('Viewport system: No Rust backend, using fallback filtering');
        }
      } catch (error) {
        console.warn('Viewport system: Rust backend check failed, using fallback:', error);
        setIsRustAvailable(false);
      }
    };

    checkRustAvailability();
  }, []);

  // Update when bounds change OR when object counts change
  useEffect(() => {
    // CRITICAL PERFORMANCE FIX: Skip viewport updates during active drag
    // This prevents O(30n) filtering operation from running during drag
    // Bounds will update on next zoom when user explicitly changes view
    if (isDraggingRef?.current) {
      return;
    }

    debouncedUpdateVisibleObjects(bounds);
  }, [bounds, currentFloor, showFloorBelow, debouncedUpdateVisibleObjects, isDraggingRef]);
  
  // Compute entity counts ONCE per render using useMemo
  // This prevents Object.keys() from being called in dependency arrays
  const currentEntityCounts = useMemo((): EntityCounts => ({
    buildings: Object.keys(buildings).length,
    conveyorPoles: Object.keys(conveyorPoles).length,
    pipeSupports: Object.keys(pipeSupports).length,
    conveyorBelts: Object.keys(conveyorBelts).length,
    pipelines: Object.keys(pipelines).length,
    railways: Object.keys(railways).length,
    powerlineSegments: Object.keys(powerlineSegments).length,
    foundations: Object.keys(foundations).length,
    wallSegments: Object.keys(wallSegments).length,
    railingSegments: Object.keys(railingSegments).length,
  }), [buildings, conveyorPoles, pipeSupports, conveyorBelts, pipelines,
      railways, powerlineSegments, foundations, wallSegments, railingSegments]);

  // Detect actual count changes and trigger update only when entities are added/removed
  // This replaces the problematic Object.keys().length dependency pattern
  useEffect(() => {
    const prevCounts = prevEntityCountsRef.current;

    // Skip on first render - initial update handled by bounds change effect
    if (prevCounts === null) {
      prevEntityCountsRef.current = currentEntityCounts;
      return;
    }

    // Check if any entity counts actually changed
    const countKeys = Object.keys(currentEntityCounts) as (keyof EntityCounts)[];
    const hasCountChange = countKeys.some(
      key => currentEntityCounts[key] !== prevCounts[key]
    );

    // Only invalidate and update if counts actually changed (entity added/removed)
    if (hasCountChange) {
      // Log only in development for debugging
      if (process.env.NODE_ENV === 'development') {
        const changes = countKeys
          .filter(key => currentEntityCounts[key] !== prevCounts[key])
          .map(key => `${key}: ${prevCounts[key]} → ${currentEntityCounts[key]}`);
        console.log('📦 Entity count changed, updating viewport:', changes.join(', '));
      }

      // Update previous counts ref
      prevEntityCountsRef.current = currentEntityCounts;

      // Force cache invalidation and update
      lastBoundsRef.current = null;
      resultCacheRef.current = null; // Clear result cache when entities change
      updateVisibleObjects(bounds, true);
    }
  }, [currentEntityCounts, bounds, updateVisibleObjects]);

  // Cleanup debounce, RAF, and async operations on unmount
  useEffect(() => {
    return () => {
      // Clear debounced timeout
      if (updateDebounceRef.current) {
        clearTimeout(updateDebounceRef.current);
      }
      
      // Cancel any pending RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      
      // Cancel any in-flight async operations to prevent state updates after unmount
      if (currentOperationRef.current) {
        currentOperationRef.current.abort();
        currentOperationRef.current = null;
      }
    };
  }, []);

  return {
    visibleObjects,
    performanceMetrics,
    isRustAvailable,
    // Expose update function for manual cache invalidation
    invalidateCache: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Viewport cache invalidated - forcing update');
      }
      lastBoundsRef.current = null;
      resultCacheRef.current = null; // Also clear the result cache
      updateVisibleObjects(bounds, true); // Force update regardless of viewport change
    }
  };
};
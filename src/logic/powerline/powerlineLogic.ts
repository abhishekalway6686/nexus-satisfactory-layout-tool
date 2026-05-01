// src/logic/powerline/powerlineLogic.ts
import { 
  PowerPole, 
  PowerlineSegment, 
  Powerline, 
  Point3D, 
  Building, 
  DrawingPowerlineState,
  PowerValidationResult,
  BuildingPowerData,
  PowerConnectionPoint
} from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { distance3D, getPowerConnectionPointWorldPos } from '../../utils/helpers';
import { BUILDING_TYPES, POWERLINE_MAX_LENGTH, POWER_POLE_MK1_MAX_CONNECTIONS, POWER_POLE_MK2_MAX_CONNECTIONS, POWER_POLE_MK3_MAX_CONNECTIONS, POWER_TOWER_MAX_TOTAL_CONNECTIONS } from '../../constants';

/**
 * Get max connections for a power pole type
 */
const getMaxConnectionsForPoleType = (poleType: string): number => {
  switch (poleType) {
    case 'power_pole_mk1':
      return POWER_POLE_MK1_MAX_CONNECTIONS; // 4
    case 'power_pole_mk2':
      return POWER_POLE_MK2_MAX_CONNECTIONS; // 7
    case 'power_pole_mk3':
      return POWER_POLE_MK3_MAX_CONNECTIONS; // 10
    case 'power_tower':
      return POWER_TOWER_MAX_TOTAL_CONNECTIONS; // 7
    default:
      return POWER_POLE_MK1_MAX_CONNECTIONS; // Default to 4
  }
};
// Import Rust backend commands for powerline calculations
import {
  calculatePowerDistance,
  validatePowerConnection,
  calculatePowerCapacity as rustCalculatePowerCapacity,
  findOptimalPowerPath,
  createPowerPole as rustCreatePowerPole,
  validateBuildingPowerConnection
} from '../../tauri/commands';
import { powerlineCache } from '../../utils/powerlineCache';

export interface StartPowerlineDrawingResult {
  drawingState: DrawingPowerlineState;
  startPole?: PowerPole;
}

export interface AddPowerlinePointResult {
  poles: Record<string, PowerPole>;
  segments: Record<string, PowerlineSegment>;
  powerlines: Record<string, Powerline>;
  drawingState: Partial<DrawingPowerlineState>;
  path: string[];
}

export interface FinishPowerlineDrawingResult {
  poles: Record<string, PowerPole>;
  segments: Record<string, PowerlineSegment>;
  powerlines: Record<string, Powerline>;
  drawingState: Partial<DrawingPowerlineState>;
}

/**
 * Creates a new power pole at a given point
 */
export const createPoleAtPoint = (point: Point3D, floor: number, poleType: string = 'power_pole_mk1'): PowerPole => ({
  id: uuidv4(),
  x: point.x,
  y: point.y,
  z: point.z,
  floor,
  isAnchor: false,
  type: poleType as any,
  range: 30, // Default range for mk1
  maxConnections: getMaxConnectionsForPoleType(poleType),
  connections: [], // Empty connections initially
});

/**
 * Starts powerline drawing from a building connection or power pole
 */
export const startPowerlineDrawing = (
  buildings: Record<string, Building>,
  powerPoles: Record<string, PowerPole>,
  buildingId?: string,
  powerPointId?: string,
  poleId?: string
): StartPowerlineDrawingResult => {
  let startPole: PowerPole | null = null;
  let startBuildingId: string | undefined;
  let startPowerPoint: string | undefined;

  if (buildingId && powerPointId) {
    // Starting from a building power connection
    const building = buildings[buildingId];
    const buildingDef = BUILDING_TYPES[building.type];
    const powerPoint = buildingDef.powerData?.powerConnections?.find((pp) => pp.id === powerPointId);
    
    if (building && buildingDef && powerPoint) {
      const worldPos = getPowerConnectionPointWorldPos(building, buildingDef, powerPoint);
      const anchorPoleId = `power-anchor-${buildingId}-${powerPointId}`;
      startPole = {
        id: anchorPoleId,
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
        floor: building.floor,
        isAnchor: true,
        type: 'power_pole_mk1', // Building anchors use mk1 type
        range: 30,
        maxConnections: getMaxConnectionsForPoleType('power_pole_mk1'),
        connections: [],
      };
      startBuildingId = buildingId;
      startPowerPoint = powerPointId;
    }
  } else if (poleId && powerPoles[poleId]) {
    // Starting from an existing power pole
    startPole = powerPoles[poleId];
  }

  const drawingState: DrawingPowerlineState = {
    isDrawing: true,
    currentPowerlineId: `powerline-${Date.now()}`,
    powerlinePath: startPole ? [startPole.id] : [],
    startPole: startPole || null,
    startBuildingId,
    startPowerPoint,
    targetPole: null,
    targetBuildingId: undefined,
    targetPowerPoint: undefined,
    previewSegments: [],
    snapResult: {
      shouldSnap: false
    }
  };

  return {
    drawingState,
    startPole: startPole || undefined,
  };
};

/**
 * Adds a point to the current powerline being drawn (PREVIEW ONLY - no segments created)
 * This function only manages poles and path during the drawing phase.
 * Segments are created later in finishPowerlineDrawing to prevent phantom segment issues.
 */
export const addPowerlinePointPreviewOnly = (
  point: Point3D,
  currentFloor: number,
  drawingState: DrawingPowerlineState,
  existingPoles: Record<string, PowerPole>
): { poles: Record<string, PowerPole>; path: string[] } | null => {
  if (!drawingState.isDrawing || !drawingState.currentPowerlineId) {
    return null;
  }

  const newPole = createPoleAtPoint(point, currentFloor);
  const poles = { ...existingPoles, [newPole.id]: newPole };
  const path: string[] = [...(drawingState.powerlinePath ?? []), newPole.id];

  return {
    poles,
    path,
  };
};

/**
 * Adds a point to the current powerline being drawn (LEGACY - creates segments during drawing)
 * WARNING: This function creates phantom segments during drawing and should be avoided.
 * Use addPowerlinePointPreviewOnly instead for the drawing phase.
 */
export const addPowerlinePoint = (
  point: Point3D,
  currentFloor: number,
  drawingState: DrawingPowerlineState,
  existingPoles: Record<string, PowerPole>,
  existingSegments: Record<string, PowerlineSegment>,
  existingPowerlines: Record<string, Powerline>
): AddPowerlinePointResult | null => {
  if (!drawingState.isDrawing || !drawingState.currentPowerlineId) {
    return null;
  }

  // Input validation to prevent NaN issues
  if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number' ||
      isNaN(point.x) || isNaN(point.y) || isNaN(point.z)) {
    console.warn('[addPowerlinePoint] Invalid point coordinates:', point);
    return null;
  }

  const newPole = createPoleAtPoint(point, currentFloor);
  const poles = { ...existingPoles, [newPole.id]: newPole };
  const path: string[] = [...(drawingState.powerlinePath ?? []), newPole.id];
  const segments = { ...existingSegments };
  const powerlines = { ...existingPowerlines };

  // Create segments from the path
  if (path.length >= 2) {
    const prevPoleId = path[path.length - 2];
    const prevPole = poles[prevPoleId];
    const currentPole = poles[path[path.length - 1]];

    if (prevPole && currentPole) {
      const segmentLength = distance3D(prevPole, currentPole);
      
      // Additional validation for calculated distance
      if (!isFinite(segmentLength) || isNaN(segmentLength)) {
        console.warn('[addPowerlinePoint] Invalid segment length:', segmentLength, 'between', prevPole, currentPole);
        return null;
      }
      
      if (segmentLength > POWERLINE_MAX_LENGTH) {
        console.warn('[addPowerlinePoint] Segment too long:', segmentLength);
        return null;
      }

      const newSegment: PowerlineSegment = {
        id: `powerline-segment-${Date.now()}`,
        type: 'curve', // Powerlines are curves due to hanging
        startPole: prevPoleId,
        endPole: newPole.id,
        startPoint: { x: prevPole.x, y: prevPole.y, z: prevPole.z },
        endPoint: { x: currentPole.x, y: currentPole.y, z: currentPole.z },
        controlPoints: [], // Basic straight line segments
        length: segmentLength,
        capacity: 1000, // Default capacity
        voltage: 'medium', // Default voltage
        floor: currentFloor,
      };

      segments[newSegment.id] = newSegment;

      // Update the powerline with the new segment
      const powerline = powerlines[drawingState.currentPowerlineId];
      if (powerline) {
        powerline.segments.push(newSegment.id);
      } else {
        powerlines[drawingState.currentPowerlineId] = {
          id: drawingState.currentPowerlineId,
          segments: [newSegment.id],
          fromBuildingId: drawingState.startBuildingId,
          fromPowerPoint: drawingState.startPowerPoint,
          floor: currentFloor,
          capacity: 1000,
          currentLoad: 0,
          efficiency: 100,
          voltage: 'medium',
        };
      }
    }
  }

  return {
    poles,
    segments,
    powerlines,
    drawingState: {
      powerlinePath: path,
    },
    path,
  };
};




/**
 * Validates powerline connection between two points using Rust backend with caching
 */
export const validatePowerlineConnection = async (
  fromPoint: Point3D,
  toPoint: Point3D,
  fromBuilding?: Building,
  toBuilding?: Building,
  fromPowerPoint?: string,
  toPowerPoint?: string
): Promise<PowerValidationResult> => {
  try {
    // Check cache first for distance calculation
    let distance = powerlineCache.getCachedDistance(fromPoint, toPoint);
    if (distance === null) {
      // Use Rust backend for distance calculation
      distance = await calculatePowerDistance(fromPoint, toPoint);
      powerlineCache.cacheDistance(fromPoint, toPoint, distance);
    }
    
    // Check distance limits
    if (distance > POWERLINE_MAX_LENGTH) {
      return {
        isValid: false,
        canConnect: false,
        reason: `Distance ${distance.toFixed(1)}m exceeds maximum powerline length of ${POWERLINE_MAX_LENGTH}m`,
        distanceToTarget: distance,
        withinRange: false,
        capacityValid: true,
        voltageCompatible: true,
        suggestions: ['Add intermediate power poles to reduce segment length'],
      };
    }

    // Use Rust backend for building power connection validation
    if (fromBuilding && toBuilding && fromPowerPoint && toPowerPoint) {
      try {
        const backendValidation = await validateBuildingPowerConnection(
          fromBuilding.id,
          fromPowerPoint,
          toBuilding.id,
          'building'
        );
        
        if (!backendValidation.canConnect) {
          return {
            isValid: false,
            canConnect: false,
            reason: backendValidation.reason || 'Incompatible power connection types',
            distanceToTarget: distance,
            withinRange: backendValidation.withinRange,
            capacityValid: backendValidation.capacityValid,
            voltageCompatible: backendValidation.voltageCompatible,
            suggestions: backendValidation.suggestions || ['Check power connection compatibility'],
          };
        }
        
        return backendValidation;
      } catch (backendError) {
        console.warn('[validatePowerlineConnection] Backend validation failed, using fallback:', backendError);
        // Fall back to frontend validation
        return validatePowerlineConnectionFallback(fromPoint, toPoint, fromBuilding, toBuilding, fromPowerPoint, toPowerPoint, distance);
      }
    }

    return {
      isValid: true,
      canConnect: true,
      distanceToTarget: distance,
      withinRange: true,
      capacityValid: true,
      voltageCompatible: true,
      suggestions: [],
    };
  } catch (error) {
    console.warn('[validatePowerlineConnection] Distance calculation failed, using fallback:', error);
    // Fall back to frontend calculation
    const distance = distance3D(fromPoint, toPoint);
    return validatePowerlineConnectionFallback(fromPoint, toPoint, fromBuilding, toBuilding, fromPowerPoint, toPowerPoint, distance);
  }
};

/**
 * Fallback powerline validation using frontend calculations
 * Used when Rust backend is unavailable
 */
const validatePowerlineConnectionFallback = (
  fromPoint: Point3D,
  toPoint: Point3D,
  fromBuilding?: Building,
  toBuilding?: Building,
  fromPowerPoint?: string,
  toPowerPoint?: string,
  distance?: number
): PowerValidationResult => {
  const calculatedDistance = distance ?? distance3D(fromPoint, toPoint);
  
  // Check distance limits
  if (calculatedDistance > POWERLINE_MAX_LENGTH) {
    return {
      isValid: false,
      canConnect: false,
      reason: `Distance ${calculatedDistance.toFixed(1)}m exceeds maximum powerline length of ${POWERLINE_MAX_LENGTH}m`,
      distanceToTarget: calculatedDistance,
      withinRange: false,
      capacityValid: true,
      voltageCompatible: true,
      suggestions: ['Add intermediate power poles to reduce segment length'],
    };
  }

  // Check power type compatibility
  if (fromBuilding && toBuilding && fromPowerPoint && toPowerPoint) {
    const fromBuildingDef = BUILDING_TYPES[fromBuilding.type];
    const toBuildingDef = BUILDING_TYPES[toBuilding.type];
    
    const fromPower = fromBuildingDef.powerData?.powerConnections?.find(p => p.id === fromPowerPoint);
    const toPower = toBuildingDef.powerData?.powerConnections?.find(p => p.id === toPowerPoint);
    
    if (fromPower && toPower) {
      // Check if power types are compatible
      const isGeneratorToConsumer = fromPower.type === 'power_output' && toPower.type === 'power_input';
      const isPoleConnection = fromPower.type === 'power_pole' || toPower.type === 'power_pole';
      
      if (!isGeneratorToConsumer && !isPoleConnection) {
        return {
          isValid: false,
          canConnect: false,
          reason: 'Incompatible power connection types',
          distanceToTarget: calculatedDistance,
          withinRange: true,
          capacityValid: true,
          voltageCompatible: false,
          suggestions: ['Connect generator output to consumer input', 'Use power poles for complex routing'],
        };
      }
    }
  }

  return {
    isValid: true,
    canConnect: true,
    distanceToTarget: calculatedDistance,
    withinRange: true,
    capacityValid: true,
    voltageCompatible: true,
    suggestions: [],
  };
};

/**
 * Finishes powerline drawing and handles connections with Rust backend integration
 */
export const finishPowerlineDrawing = async (
  drawingState: DrawingPowerlineState,
  existingPoles: Record<string, PowerPole>,
  existingSegments: Record<string, PowerlineSegment>,
  existingPowerlines: Record<string, Powerline>,
  buildings: Record<string, Building>,
  currentFloor: number,
  buildingId?: string,
  powerPointId?: string,
  poleId?: string
): Promise<FinishPowerlineDrawingResult | null> => {
  if (!drawingState.isDrawing || !drawingState.currentPowerlineId || (drawingState.powerlinePath ?? []).length < 1) {
    return null;
  }

  let endPole: PowerPole | null = null;
  let shouldAddEndPole = false;
  const poles = { ...existingPoles };
  const segments = { ...existingSegments };
  const powerlines = { ...existingPowerlines };

  // Handle end pole creation
  if (buildingId && powerPointId) {
    const building = buildings[buildingId];
    const buildingDef = BUILDING_TYPES[building.type];
    const powerPoint = buildingDef.powerData?.powerConnections?.find((pp) => pp.id === powerPointId);
    
    if (building && buildingDef && powerPoint) {
      const worldPos = getPowerConnectionPointWorldPos(building, buildingDef, powerPoint);
      const anchorPoleId = `power-anchor-${buildingId}-${powerPointId}`;
      endPole = {
        id: anchorPoleId,
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
        floor: building.floor,
        isAnchor: true,
        type: 'power_pole_mk1', // Building anchors use mk1 type
        range: 30,
        maxConnections: getMaxConnectionsForPoleType('power_pole_mk1'),
        connections: [],
      };

      if (!poles[anchorPoleId]) {
        poles[anchorPoleId] = endPole;
        shouldAddEndPole = true;
      }
    }
  } else if (poleId && poles[poleId]) {
    endPole = poles[poleId];
  }

  // Build the final path
  const finalPath = [...(drawingState.powerlinePath ?? [])];
  if (endPole && shouldAddEndPole) {
    finalPath.push(endPole.id);
  }

  // Create segments from the path
  const newSegments: PowerlineSegment[] = [];
  const newSegmentIds: string[] = [];

  for (let i = 1; i < finalPath.length; i++) {
    const startPoleId = finalPath[i - 1];
    const endPoleId = finalPath[i];
    const startPole = poles[startPoleId];
    const endPole = poles[endPoleId];

    if (!startPole || !endPole) continue;

    try {
      // Use cached distance calculation with Rust backend
      let segmentLength = powerlineCache.getCachedDistance(
        { x: startPole.x, y: startPole.y, z: startPole.z },
        { x: endPole.x, y: endPole.y, z: endPole.z }
      );
      
      if (segmentLength === null) {
        // Calculate using Rust backend
        segmentLength = await calculatePowerDistance(
          { x: startPole.x, y: startPole.y, z: startPole.z },
          { x: endPole.x, y: endPole.y, z: endPole.z }
        );
        powerlineCache.cacheDistance(
          { x: startPole.x, y: startPole.y, z: startPole.z },
          { x: endPole.x, y: endPole.y, z: endPole.z },
          segmentLength
        );
      }
      
      if (segmentLength > POWERLINE_MAX_LENGTH) {
        console.warn('[finishPowerlineDrawing] Segment too long:', segmentLength);
        continue;
      }
      
      // Basic straight line segments (curve calculations removed)
      
      // Calculate capacity using Rust backend
      const capacity = await calculatePowerCapacity(startPole, endPole);
      
      const segment: PowerlineSegment = {
        id: `powerline-segment-${Date.now()}-${i}`,
        type: 'curve', // Powerlines are curves due to hanging
        startPole: startPoleId,
        endPole: endPoleId,
        startPoint: { x: startPole.x, y: startPole.y, z: startPole.z },
        endPoint: { x: endPole.x, y: endPole.y, z: endPole.z },
        controlPoints: [], // Basic straight line segments
        length: segmentLength,
        capacity,
        voltage: 'medium', // Default voltage
        floor: currentFloor,
      };

      newSegments.push(segment);
      newSegmentIds.push(segment.id);
    } catch (error) {
      console.warn('[finishPowerlineDrawing] Backend calculation failed for segment, using fallback:', error);
      
      // Fallback to frontend calculations
      const segmentLength = distance3D(startPole, endPole);
      if (segmentLength > POWERLINE_MAX_LENGTH) {
        console.warn('[finishPowerlineDrawing] Segment too long:', segmentLength);
        continue;
      }
      
      const segment: PowerlineSegment = {
        id: `powerline-segment-${Date.now()}-${i}`,
        type: 'curve', // Powerlines are curves due to hanging
        startPole: startPoleId,
        endPole: endPoleId,
        startPoint: { x: startPole.x, y: startPole.y, z: startPole.z },
        endPoint: { x: endPole.x, y: endPole.y, z: endPole.z },
        controlPoints: [], // Basic straight line segments
        length: segmentLength,
        capacity: calculatePowerCapacityFallback(startPole, endPole, segmentLength),
        voltage: 'medium', // Default voltage
        floor: currentFloor,
      };

      newSegments.push(segment);
      newSegmentIds.push(segment.id);
    }

    // This segment creation is now handled in the try-catch block above
    // to properly integrate with Rust backend calculations
  }

  // Add segments to store
  for (const segment of newSegments) {
    segments[segment.id] = segment;
  }

  // Create or update the powerline
  if (newSegmentIds.length > 0) {
    const powerline: Powerline = {
      id: drawingState.currentPowerlineId!,
      segments: newSegmentIds,
      fromBuildingId: drawingState.startBuildingId,
      fromPowerPoint: drawingState.startPowerPoint,
      toBuildingId: buildingId,
      toPowerPoint: powerPointId,
      floor: currentFloor,
      capacity: 1000,
      currentLoad: 0,
      efficiency: 100,
      voltage: 'medium',
    };

    powerlines[powerline.id] = powerline;
    console.log(`⚡ Created powerline with ${newSegmentIds.length} segments`);
  }

  return {
    poles,
    segments,
    powerlines,
    drawingState: {
      isDrawing: false,
      currentPowerlineId: undefined,
      powerlinePath: undefined,
      startPole: undefined,
      startBuildingId: undefined,
      startPowerPoint: undefined,
    },
  };
};

/**
 * Cancels powerline drawing and cleans up temporary state
 */
export const cancelPowerlineDrawing = (): Partial<DrawingPowerlineState> => {
  return {
    isDrawing: false,
    currentPowerlineId: undefined,
    powerlinePath: undefined,
    startPole: undefined,
    startBuildingId: undefined,
    startPowerPoint: undefined,
  };
};

/**
 * Finds the optimal power pole type for a given distance
 */
export const getOptimalPoleType = (distance: number): 'power_pole_mk1' | 'power_pole_mk2' | 'power_pole_mk3' | 'power_tower' => {
  if (distance <= 30) return 'power_pole_mk1';
  if (distance <= 50) return 'power_pole_mk2';
  if (distance <= 100) return 'power_pole_mk3';
  return 'power_tower';
};

/**
 * Calculates power capacity for a powerline segment using Rust backend with caching
 */
export const calculatePowerCapacity = async (
  startPole: PowerPole,
  endPole: PowerPole,
  length?: number
): Promise<number> => {
  try {
    // For capacity calculations, we can use a simple cache based on pole types and distance
    const cacheKey = `${startPole.type}-${endPole.type}-${length || 'auto'}`;
    
    // Use Rust backend for accurate capacity calculation
    const result = await rustCalculatePowerCapacity(
      { x: startPole.x, y: startPole.y, z: startPole.z },
      { x: endPole.x, y: endPole.y, z: endPole.z },
      startPole.type // Assuming wire type is based on pole type
    );
    
    return result.capacity;
  } catch (error) {
    console.warn('[calculatePowerCapacity] Backend call failed, using fallback:', error);
    // Fall back to frontend calculation
    return calculatePowerCapacityFallback(startPole, endPole, length);
  }
};

/**
 * Fallback power capacity calculation using frontend logic
 */
const calculatePowerCapacityFallback = (
  startPole: PowerPole,
  endPole: PowerPole,
  length?: number
): number => {
  // Base capacity depends on pole types
  const poleCapacities = {
    'power_pole_mk1': 1000,
    'power_pole_mk2': 2000,
    'power_pole_mk3': 5000,
    'power_tower': 10000,
  };

  const startCapacity = poleCapacities[startPole.type as keyof typeof poleCapacities] || 1000;
  const endCapacity = poleCapacities[endPole.type as keyof typeof poleCapacities] || 1000;

  // Capacity is limited by the weakest pole
  const baseCapacity = Math.min(startCapacity, endCapacity);

  // Apply length penalty for very long segments
  const calculatedLength = length ?? distance3D(startPole, endPole);
  const lengthPenalty = calculatedLength > 50 ? 0.9 : 1.0;

  return Math.floor(baseCapacity * lengthPenalty);
};

/**
 * Power network calculation result
 */
export interface PowerNetworkInfo {
  networkId: string;
  totalGeneration: number;        // Total MW generated
  totalConsumption: number;       // Total MW consumed
  netPower: number;               // Generation - Consumption (positive = surplus, negative = deficit)
  status: 'powered' | 'underpowered' | 'isolated' | 'surplus';
  connectedPoleIds: string[];     // All poles in this network
  connectedBuildingIds: string[]; // All buildings in this network
  generators: Array<{ buildingId: string; type: string; generation: number }>;
  consumers: Array<{ buildingId: string; type: string; consumption: number }>;
}

/**
 * Calculates power networks by finding all connected components through powerlines
 * Returns an array of network info for each disconnected network
 */
export const calculatePowerNetworks = (
  buildings: Record<string, Building>,
  powerPoles: Record<string, PowerPole>,
  powerlineSegments: Record<string, PowerlineSegment>
): PowerNetworkInfo[] => {
  const networks: PowerNetworkInfo[] = [];
  const visitedPoles = new Set<string>();

  // Build adjacency list from powerline segments
  const adjacencyList = new Map<string, Set<string>>();

  Object.values(powerlineSegments).forEach(segment => {
    if (!adjacencyList.has(segment.startPole)) {
      adjacencyList.set(segment.startPole, new Set());
    }
    if (!adjacencyList.has(segment.endPole)) {
      adjacencyList.set(segment.endPole, new Set());
    }
    adjacencyList.get(segment.startPole)!.add(segment.endPole);
    adjacencyList.get(segment.endPole)!.add(segment.startPole);
  });

  // Get all pole IDs (from both collections)
  const allPoleIds = new Set([
    ...Object.keys(powerPoles),
    ...Array.from(adjacencyList.keys())
  ]);

  let networkIndex = 0;

  // Find all connected components using BFS
  for (const startPoleId of allPoleIds) {
    if (visitedPoles.has(startPoleId)) continue;

    const networkPoles: string[] = [];
    const networkBuildings = new Set<string>();
    const generators: Array<{ buildingId: string; type: string; generation: number }> = [];
    const consumers: Array<{ buildingId: string; type: string; consumption: number }> = [];

    // BFS to find all connected poles
    const queue = [startPoleId];
    while (queue.length > 0) {
      const poleId = queue.shift()!;
      if (visitedPoles.has(poleId)) continue;

      visitedPoles.add(poleId);
      networkPoles.push(poleId);

      // Check if this pole is a building anchor (power-anchor-{buildingId}-{powerPointId})
      if (poleId.startsWith('power-anchor-')) {
        const match = poleId.match(/^power-anchor-(.+)-([^-]+)$/);
        if (match) {
          const buildingId = match[1];
          if (!networkBuildings.has(buildingId)) {
            networkBuildings.add(buildingId);

            // Get building power data
            const building = buildings[buildingId];
            if (building) {
              const buildingDef = BUILDING_TYPES[building.type];
              if (buildingDef?.powerData) {
                const powerData = buildingDef.powerData;

                if (powerData.classification === 'generator' && powerData.powerGeneration) {
                  generators.push({
                    buildingId,
                    type: building.type,
                    generation: powerData.powerGeneration
                  });
                } else if (powerData.classification === 'consumer' && powerData.powerConsumption) {
                  consumers.push({
                    buildingId,
                    type: building.type,
                    consumption: powerData.powerConsumption
                  });
                }
              }
            }
          }
        }
      }

      // Check if this is a direct building ID (for power pole buildings)
      const building = buildings[poleId];
      if (building && !networkBuildings.has(poleId)) {
        const buildingDef = BUILDING_TYPES[building.type];
        if (buildingDef?.powerData) {
          networkBuildings.add(poleId);
          const powerData = buildingDef.powerData;

          if (powerData.classification === 'generator' && powerData.powerGeneration) {
            generators.push({
              buildingId: poleId,
              type: building.type,
              generation: powerData.powerGeneration
            });
          } else if (powerData.classification === 'consumer' && powerData.powerConsumption) {
            consumers.push({
              buildingId: poleId,
              type: building.type,
              consumption: powerData.powerConsumption
            });
          }
        }
      }

      // Add neighbors to queue
      const neighbors = adjacencyList.get(poleId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visitedPoles.has(neighborId)) {
            queue.push(neighborId);
          }
        }
      }
    }

    // Calculate network totals
    const totalGeneration = generators.reduce((sum, g) => sum + g.generation, 0);
    const totalConsumption = consumers.reduce((sum, c) => sum + c.consumption, 0);
    const netPower = totalGeneration - totalConsumption;

    let status: PowerNetworkInfo['status'];
    if (totalGeneration === 0 && totalConsumption === 0) {
      status = 'isolated';
    } else if (totalGeneration === 0) {
      status = 'underpowered';
    } else if (netPower < 0) {
      status = 'underpowered';
    } else {
      status = netPower > 0 ? 'surplus' : 'powered';
    }

    networks.push({
      networkId: `network-${networkIndex++}`,
      totalGeneration,
      totalConsumption,
      netPower,
      status,
      connectedPoleIds: networkPoles,
      connectedBuildingIds: Array.from(networkBuildings),
      generators,
      consumers
    });
  }

  return networks;
};

/**
 * Gets power network info for a specific powerline segment
 */
export const getSegmentNetworkInfo = (
  segmentId: string,
  buildings: Record<string, Building>,
  powerPoles: Record<string, PowerPole>,
  powerlineSegments: Record<string, PowerlineSegment>
): PowerNetworkInfo | null => {
  const segment = powerlineSegments[segmentId];
  if (!segment) return null;

  const networks = calculatePowerNetworks(buildings, powerPoles, powerlineSegments);

  // Find which network contains this segment's poles
  for (const network of networks) {
    if (network.connectedPoleIds.includes(segment.startPole) ||
        network.connectedPoleIds.includes(segment.endPole)) {
      return network;
    }
  }

  return null;
};

/**
 * Cache for power network calculations to avoid recalculating on every render
 */
let cachedNetworks: PowerNetworkInfo[] | null = null;
let cachedNetworkKey = '';

export const getCachedPowerNetworks = (
  buildings: Record<string, Building>,
  powerPoles: Record<string, PowerPole>,
  powerlineSegments: Record<string, PowerlineSegment>
): PowerNetworkInfo[] => {
  // Simple cache key based on counts (recompute if counts change)
  const cacheKey = `${Object.keys(buildings).length}-${Object.keys(powerPoles).length}-${Object.keys(powerlineSegments).length}`;

  if (cacheKey !== cachedNetworkKey || !cachedNetworks) {
    cachedNetworks = calculatePowerNetworks(buildings, powerPoles, powerlineSegments);
    cachedNetworkKey = cacheKey;
  }

  return cachedNetworks;
};

/**
 * Invalidate power network cache (call when powerlines, poles, or buildings change)
 */
export const invalidatePowerNetworkCache = (): void => {
  cachedNetworks = null;
  cachedNetworkKey = '';
};
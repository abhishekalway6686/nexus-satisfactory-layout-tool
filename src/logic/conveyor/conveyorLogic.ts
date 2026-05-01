// src/logic/conveyor/conveyorLogic.ts
import { ConveyorPole, ConveyorSegment, ConveyorBelt, Point3D, Building, ConveyorLift } from '../../types';
import { distance3D, getConnectionPointWorldPos, getConveyorLiftConnectionPointWorldPos } from '../../utils/helpers';
import { shouldCreateTurn, calculateCurveControlPoint } from '../common/curveUtils';
import { BUILDING_TYPES, CONVEYOR_MAX_LENGTH } from '../../constants';

export interface ConveyorDrawingState {
  isDrawing: boolean;
  mode: 'default' | 'straight';
  currentBeltId: string | null;
  startPole: ConveyorPole | null;
  currentPath: ConveyorPole[];
  startBuildingId?: string;
  startConnectionPoint?: string;
}

export interface StartConveyorDrawingResult {
  drawingState: Partial<ConveyorDrawingState>;
  startPole?: ConveyorPole;
  poles: Record<string, ConveyorPole>;
}

export interface AddPoleToPathResult {
  poles: Record<string, ConveyorPole>;
  drawingState: Partial<ConveyorDrawingState>;
}

export interface FinishConveyorDrawingResult {
  poles: Record<string, ConveyorPole>;
  segments: Record<string, ConveyorSegment>;
  belts: Record<string, ConveyorBelt>;
  drawingState: Partial<ConveyorDrawingState>;
}

export interface CancelDrawingResult {
  poles: Record<string, ConveyorPole>;
  drawingState: Partial<ConveyorDrawingState>;
}

/**
 * Starts conveyor drawing from a building connection, conveyor lift, or existing pole
 */
export const startConveyorDrawing = (
  buildings: Record<string, Building>,
  existingPoles: Record<string, ConveyorPole>,
  conveyorLifts: Record<string, ConveyorLift>,
  currentFloor: number,
  buildingId?: string,
  connectionPointId?: string,
  poleId?: string,
  liftId?: string,
  liftConnectionPointId?: string
): StartConveyorDrawingResult => {
  let startPole: ConveyorPole | null = null;
  let startBuildingId: string | undefined;
  let startConnectionPoint: string | undefined;
  const poles = { ...existingPoles };

  // Handle building connection start
  if (buildingId && connectionPointId) {
    const building = buildings[buildingId];
    const buildingDef = BUILDING_TYPES[building.type];
    const connectionPoint = buildingDef.connectionPoints.find((cp) => cp.id === connectionPointId);

    if (building && buildingDef && connectionPoint && !connectionPoint.isFluid) {
      const worldPos = getConnectionPointWorldPos(building, buildingDef, connectionPoint);
      const anchorPoleId = `pole-anchor-${buildingId}-${connectionPointId}`;
      startPole = {
        id: anchorPoleId,
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
        floor: building.floor,
        isAnchor: true,
      };

      poles[startPole.id] = startPole;
      startBuildingId = buildingId;
      startConnectionPoint = connectionPointId;
    }
  } else if (liftId && liftConnectionPointId) {
    // Handle conveyor lift connection start
    const lift = conveyorLifts[liftId];
    const connectionPoint = lift?.connectionPoints?.find((cp) => cp.id === liftConnectionPointId);
    
    if (lift && connectionPoint) {
      // Check if this connection point is on the current floor
      const isOnCurrentFloor = (
        (connectionPoint.id === 'start-floor' && currentFloor === lift.startFloor) ||
        (connectionPoint.id === 'end-floor' && currentFloor === lift.endFloor)
      );
      
      if (isOnCurrentFloor) {
        const worldPos = getConveyorLiftConnectionPointWorldPos(lift, connectionPoint, currentFloor);
        const anchorPoleId = `pole-anchor-lift-${liftId}-${connectionPointId}`;
        startPole = {
          id: anchorPoleId,
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z,
          floor: currentFloor,
          isAnchor: true,
        };

        poles[startPole.id] = startPole;
        // Note: We're not setting startBuildingId/startConnectionPoint for lifts
        // This maintains compatibility with existing belt connection logic
      }
    }
  } else if (poleId && existingPoles[poleId]) {
    startPole = existingPoles[poleId];
  }

  if (!startPole) {
    return { drawingState: {}, poles };
  }

  const beltId = `belt-${Date.now()}`;

  const drawingState: Partial<ConveyorDrawingState> = {
    isDrawing: true,
    mode: 'default', // Will be set by conveyor mode
    currentBeltId: beltId,
    startPole: startPole,
    currentPath: [startPole],
    startBuildingId,
    startConnectionPoint,
  };

  return {
    drawingState,
    startPole,
    poles,
  };
};

/**
 * Adds a pole to the current conveyor path
 */
export const addPoleToPath = (
  pole: ConveyorPole,
  drawingState: ConveyorDrawingState,
  existingPoles: Record<string, ConveyorPole>
): AddPoleToPathResult => {
  if (!drawingState.isDrawing || !drawingState.startPole) {
    return { poles: existingPoles, drawingState: {} };
  }

  const poles = { ...existingPoles, [pole.id]: pole };
  const newPath = [...drawingState.currentPath, pole];

  return {
    poles,
    drawingState: {
      currentPath: newPath,
    },
  };
};

/**
 * Finishes conveyor drawing and creates segments/belt
 */
export const finishConveyorDrawing = (
  drawingState: ConveyorDrawingState,
  existingPoles: Record<string, ConveyorPole>,
  existingSegments: Record<string, ConveyorSegment>,
  existingBelts: Record<string, ConveyorBelt>,
  buildings: Record<string, Building>,
  conveyorLifts: Record<string, ConveyorLift>,
  currentFloor: number,
  conveyorMode: 'default' | 'straight',
  buildingId?: string,
  connectionPointId?: string,
  poleId?: string,
  liftId?: string,
  liftConnectionPointId?: string
): FinishConveyorDrawingResult | null => {
  if (!drawingState.isDrawing || !drawingState.currentBeltId || drawingState.currentPath.length < 1) {
    return null;
  }

  let endPole: ConveyorPole | null = null;
  let shouldAddEndPole = false;
  const poles = { ...existingPoles };
  const segments = { ...existingSegments };
  const belts = { ...existingBelts };

  // Handle end point
  if (buildingId && connectionPointId) {
    const building = buildings[buildingId];
    const buildingDef = BUILDING_TYPES[building.type];
    const connectionPoint = buildingDef.connectionPoints.find((cp) => cp.id === connectionPointId);

    if (building && buildingDef && connectionPoint && !connectionPoint.isFluid) {
      // Verify input/output compatibility
      if (drawingState.startBuildingId) {
        const startBuilding = buildings[drawingState.startBuildingId];
        const startBuildingDef = BUILDING_TYPES[startBuilding.type];
        const startPoint = startBuildingDef.connectionPoints.find(
          (cp) => cp.id === drawingState.startConnectionPoint
        );

        if (startPoint && startPoint.type === connectionPoint.type && connectionPoint.type !== 'bidirectional') {
          console.log('ERROR: Cannot connect same connection types (input to input or output to output)');
          return null;
        }
      }

      const worldPos = getConnectionPointWorldPos(building, buildingDef, connectionPoint);
      const anchorPoleId = `pole-anchor-end-${buildingId}-${connectionPointId}`;
      endPole = {
        id: anchorPoleId,
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
        floor: building.floor,
        isAnchor: true,
      };
      shouldAddEndPole = true;
      poles[endPole.id] = endPole;
    }
  } else if (liftId && liftConnectionPointId) {
    // Handle conveyor lift connection end
    const lift = conveyorLifts[liftId];
    const connectionPoint = lift?.connectionPoints?.find((cp) => cp.id === liftConnectionPointId);
    
    if (lift && connectionPoint) {
      // Check if this connection point is on the current floor
      const isOnCurrentFloor = (
        (connectionPoint.id === 'start-floor' && currentFloor === lift.startFloor) ||
        (connectionPoint.id === 'end-floor' && currentFloor === lift.endFloor)
      );
      
      if (isOnCurrentFloor) {
        // TODO: Add validation for input/output compatibility with lifts
        // For now, we'll allow any connection to a lift
        
        const worldPos = getConveyorLiftConnectionPointWorldPos(lift, connectionPoint, currentFloor);
        const anchorPoleId = `pole-anchor-end-lift-${liftId}-${liftConnectionPointId}`;
        endPole = {
          id: anchorPoleId,
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z,
          floor: currentFloor,
          isAnchor: true,
        };
        shouldAddEndPole = true;
        poles[endPole.id] = endPole;
      }
    }
  } else if (poleId && poles[poleId]) {
    endPole = poles[poleId];
    // Don't allow ending on start pole
    if (endPole.id === drawingState.startPole?.id) {
      console.log('ERROR: Cannot end on the same pole we started with');
      return null;
    }
  } else if (drawingState.currentPath.length >= 2) {
    // Finish at last pole in path
    endPole = drawingState.currentPath[drawingState.currentPath.length - 1];
  } else {
    console.log('ERROR: Need at least 2 poles to create a belt');
    return null;
  }

  if (!endPole) {
    return null;
  }

  // Add end pole to path if needed
  const finalPath = [...drawingState.currentPath];
  if (shouldAddEndPole || endPole.id !== finalPath[finalPath.length - 1]?.id) {
    finalPath.push(endPole);
  }

  // Ensure we have at least 2 poles to create segments
  if (finalPath.length < 2) {
    console.log('ERROR: Need at least 2 poles to create segments');
    return null;
  }

  // Create segments for the path with curve handling
  const segmentIds: string[] = [];

  for (let i = 0; i < finalPath.length - 1; i++) {
    const startPole = finalPath[i];
    const endPole = finalPath[i + 1];
    const segmentLength = distance3D(startPole, endPole);

    if (segmentLength < 0.5 || segmentLength > CONVEYOR_MAX_LENGTH) {
      console.log(`ERROR: Invalid segment length: ${segmentLength}m`);
      continue;
    }

    let segmentType: 'straight' | 'turn' | 'incline' = 'straight';
    let controlPoints: Point3D[] | undefined;

    // Check for incline
    if (startPole.z !== endPole.z) {
      segmentType = 'incline';
    } else if (conveyorMode === 'default' && i > 0) {
      const prevPole = finalPath[i - 1];

      // Use enhanced curve detection
      if (shouldCreateTurn(prevPole, startPole, endPole)) {
        segmentType = 'turn';
        const cp = calculateCurveControlPoint(prevPole, startPole, endPole);
        controlPoints = [cp];

        console.log(`Creating turn segment from (${prevPole.x},${prevPole.y}) -> (${startPole.x},${startPole.y}) -> (${endPole.x},${endPole.y})`);
        console.log(`Control point: (${cp.x},${cp.y})`);
      }
    }

    const segment: ConveyorSegment = {
      id: `segment-${Date.now()}-${i}`,
      type: segmentType,
      startPole: startPole.id,
      endPole: endPole.id,
      controlPoints,
      length: segmentLength,
      // Production Simulation defaults (tier inherited from belt)
      beltTier: 1,
      maxThroughput: 60, // Mk.1 default: 60 items/min
      actualThroughput: 0,
      itemType: null,
      isBottleneck: false,
    };

    segments[segment.id] = segment;
    segmentIds.push(segment.id);
  }

  if (segmentIds.length === 0) {
    return null;
  }

  // Create the belt
  const belt: ConveyorBelt = {
    id: drawingState.currentBeltId,
    segments: segmentIds,
    fromBuildingId: drawingState.startBuildingId,
    fromConnectionPoint: drawingState.startConnectionPoint,
    toBuildingId: buildingId,
    toConnectionPoint: connectionPointId,
    floor: currentFloor,
    mark: 1,
    direction: 'forward',
  };

  belts[belt.id] = belt;

  const newDrawingState: Partial<ConveyorDrawingState> = {
    isDrawing: false,
    mode: conveyorMode,
    currentBeltId: null,
    startPole: null,
    currentPath: [],
    startBuildingId: undefined,
    startConnectionPoint: undefined,
  };

  return {
    poles,
    segments,
    belts,
    drawingState: newDrawingState,
  };
};

/**
 * Cancels current conveyor drawing
 */
export const cancelConveyorDrawing = (
  drawingState: ConveyorDrawingState,
  existingPoles: Record<string, ConveyorPole>
): CancelDrawingResult => {
  // Remove non-anchor poles created during drawing
  const poles = { ...existingPoles };

  drawingState.currentPath.forEach((pole) => {
    if (!pole.isAnchor && poles[pole.id]) {
      delete poles[pole.id];
    }
  });

  const newDrawingState: Partial<ConveyorDrawingState> = {
    isDrawing: false,
    mode: 'default',
    currentBeltId: null,
    startPole: null,
    currentPath: [],
    startBuildingId: undefined,
    startConnectionPoint: undefined,
  };

  return {
    poles,
    drawingState: newDrawingState,
  };
};

/**
 * Updates pole positions and connected segments
 */
export const updatePoleAndSegments = (
  poleId: string,
  updates: Partial<ConveyorPole>,
  existingPoles: Record<string, ConveyorPole>,
  existingSegments: Record<string, ConveyorSegment>
): { poles: Record<string, ConveyorPole>; segments: Record<string, ConveyorSegment> } => {
  const poles = {
    ...existingPoles,
    [poleId]: { ...existingPoles[poleId], ...updates },
  };

  // Update connected conveyor segments
  const segments = { ...existingSegments };
  Object.values(segments).forEach((segment) => {
    if (segment.startPole === poleId || segment.endPole === poleId) {
      const startPole = poles[segment.startPole];
      const endPole = poles[segment.endPole];
      if (startPole && endPole) {
        segments[segment.id] = {
          ...segment,
          length: distance3D(startPole, endPole),
        };
      }
    }
  });

  return { poles, segments };
};

/**
 * Deletes a pole and its connected segments/belts
 */
export const deletePoleAndCleanup = (
  poleId: string,
  existingPoles: Record<string, ConveyorPole>,
  existingSegments: Record<string, ConveyorSegment>,
  existingBelts: Record<string, ConveyorBelt>
): {
  poles: Record<string, ConveyorPole>;
  segments: Record<string, ConveyorSegment>;
  belts: Record<string, ConveyorBelt>;
} => {
  const poles = { ...existingPoles };
  const segments = { ...existingSegments };
  const belts = { ...existingBelts };

  // Find and remove segments connected to this pole
  Object.entries(segments).forEach(([segId, segment]) => {
    if (segment.startPole === poleId || segment.endPole === poleId) {
      delete segments[segId];

      // Remove segment from belts
      Object.values(belts).forEach((belt) => {
        belt.segments = belt.segments.filter((s) => s !== segId);
      });
    }
  });

  // Remove empty belts
  Object.entries(belts).forEach(([beltId, belt]) => {
    if (belt.segments.length === 0) {
      delete belts[beltId];
    }
  });

  delete poles[poleId];

  return { poles, segments, belts };
};

/**
 * Reverses belt direction
 */
export const reverseBeltDirection = (
  beltId: string,
  existingBelts: Record<string, ConveyorBelt>
): Record<string, ConveyorBelt> => {
  const belt = existingBelts[beltId];
  if (!belt) return existingBelts;

  return {
    ...existingBelts,
    [beltId]: {
      ...belt,
      direction: belt.direction === 'forward' ? 'reverse' : 'forward',
    },
  };
};
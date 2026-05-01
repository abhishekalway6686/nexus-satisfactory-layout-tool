// src/logic/pipe/pipeLogic.ts
import { PipeSupport, PipeSegment, Pipeline, Point3D, Building } from '../../types';
import { distance3D, getConnectionPointWorldPos } from '../../utils/helpers';
import { shouldCreateTurn, calculateCurveControlPoint } from '../common/curveUtils';
import { BUILDING_TYPES, PIPE_MAX_LENGTH } from '../../constants';

export interface PipeDrawingState {
  drawingPipe: boolean;
  currentPipelineId?: string;
  pipeStartSupport: PipeSupport | null;
  pipePath: PipeSupport[];
  pipeStartBuildingId?: string;
  pipeStartConnectionPoint?: string;
}

export interface StartPipeDrawingResult {
  drawingState: Partial<PipeDrawingState>;
  startSupport?: PipeSupport;
  supports: Record<string, PipeSupport>;
}

export interface AddSupportToPathResult {
  supports: Record<string, PipeSupport>;
  drawingState: Partial<PipeDrawingState>;
}

export interface FinishPipeDrawingResult {
  supports: Record<string, PipeSupport>;
  segments: Record<string, PipeSegment>;
  pipelines: Record<string, Pipeline>;
  drawingState: Partial<PipeDrawingState>;
}

export interface CancelPipeDrawingResult {
  supports: Record<string, PipeSupport>;
  drawingState: Partial<PipeDrawingState>;
}

/**
 * Starts pipe drawing from a building connection or existing support
 */
export const startPipeDrawing = (
  buildings: Record<string, Building>,
  existingSupports: Record<string, PipeSupport>,
  buildingId?: string,
  connectionPointId?: string,
  supportId?: string
): StartPipeDrawingResult => {
  let startSupport: PipeSupport | null = null;
  let startBuildingId: string | undefined;
  let startConnectionPoint: string | undefined;
  const supports = { ...existingSupports };

  // Handle building connection start
  if (buildingId && connectionPointId) {
    const building = buildings[buildingId];
    const buildingDef = BUILDING_TYPES[building.type];
    const connectionPoint = buildingDef.connectionPoints.find((cp) => cp.id === connectionPointId);

    if (building && buildingDef && connectionPoint && connectionPoint.isFluid) {
      const worldPos = getConnectionPointWorldPos(building, buildingDef, connectionPoint);
      const anchorSupportId = `support-anchor-${buildingId}-${connectionPointId}`;
      startSupport = {
        id: anchorSupportId,
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
        floor: building.floor,
        isAnchor: true,
      };

      supports[startSupport.id] = startSupport;
      startBuildingId = buildingId;
      startConnectionPoint = connectionPointId;
    }
  } else if (supportId && existingSupports[supportId]) {
    startSupport = existingSupports[supportId];
  }

  if (!startSupport) {
    return { drawingState: {}, supports };
  }

  const pipelineId = `pipeline-${Date.now()}`;

  const drawingState: Partial<PipeDrawingState> = {
    drawingPipe: true,
    currentPipelineId: pipelineId,
    pipeStartSupport: startSupport,
    pipePath: [startSupport],
    pipeStartBuildingId: startBuildingId,
    pipeStartConnectionPoint: startConnectionPoint,
  };

  return {
    drawingState,
    startSupport,
    supports,
  };
};

/**
 * Adds a support to the current pipe path
 */
export const addSupportToPath = (
  support: PipeSupport,
  drawingState: PipeDrawingState,
  existingSupports: Record<string, PipeSupport>
): AddSupportToPathResult => {
  if (!drawingState.drawingPipe || !drawingState.pipeStartSupport) {
    return { supports: existingSupports, drawingState: {} };
  }

  const supports = { ...existingSupports, [support.id]: support };
  const newPath = [...drawingState.pipePath, support];

  return {
    supports,
    drawingState: {
      pipePath: newPath,
    },
  };
};

/**
 * Finishes pipe drawing and creates segments/pipeline
 */
export const finishPipeDrawing = (
  drawingState: PipeDrawingState,
  existingSupports: Record<string, PipeSupport>,
  existingSegments: Record<string, PipeSegment>,
  existingPipelines: Record<string, Pipeline>,
  buildings: Record<string, Building>,
  currentFloor: number,
  buildingId?: string,
  connectionPointId?: string,
  supportId?: string
): FinishPipeDrawingResult | null => {
  if (!drawingState.drawingPipe || !drawingState.currentPipelineId || drawingState.pipePath.length < 1) {
    return null;
  }

  let endSupport: PipeSupport | null = null;
  let shouldAddEndSupport = false;
  const supports = { ...existingSupports };
  const segments = { ...existingSegments };
  const pipelines = { ...existingPipelines };

  // Handle end point
  if (buildingId && connectionPointId) {
    const building = buildings[buildingId];
    const buildingDef = BUILDING_TYPES[building.type];
    const connectionPoint = buildingDef.connectionPoints.find((cp) => cp.id === connectionPointId);

    if (building && buildingDef && connectionPoint && connectionPoint.isFluid) {
      const worldPos = getConnectionPointWorldPos(building, buildingDef, connectionPoint);
      const anchorSupportId = `support-anchor-end-${buildingId}-${connectionPointId}`;
      endSupport = {
        id: anchorSupportId,
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
        floor: building.floor,
        isAnchor: true,
      };
      shouldAddEndSupport = true;
      supports[endSupport.id] = endSupport;
    }
  } else if (supportId && supports[supportId]) {
    endSupport = supports[supportId];
    // Don't allow ending on start support
    if (endSupport.id === drawingState.pipeStartSupport?.id) {
      console.log('ERROR: Cannot end on the same support we started with');
      return null;
    }
  } else if (drawingState.pipePath.length >= 2) {
    // Finish at last support in path
    endSupport = drawingState.pipePath[drawingState.pipePath.length - 1];
  } else {
    console.log('ERROR: Need at least 2 supports to create a pipeline');
    return null;
  }

  if (!endSupport) {
    return null;
  }

  // Add end support to path if needed
  const finalPath = [...drawingState.pipePath];
  if (shouldAddEndSupport || endSupport.id !== finalPath[finalPath.length - 1]?.id) {
    finalPath.push(endSupport);
  }

  // Ensure we have at least 2 supports to create segments
  if (finalPath.length < 2) {
    console.log('ERROR: Need at least 2 supports to create segments');
    return null;
  }

  // Create segments for the path
  const segmentIds: string[] = [];

  for (let i = 0; i < finalPath.length - 1; i++) {
    const startSupport = finalPath[i];
    const endSupport = finalPath[i + 1];
    const segmentLength = distance3D(startSupport, endSupport);

    if (segmentLength < 0.5 || segmentLength > PIPE_MAX_LENGTH) {
      console.log(`ERROR: Invalid segment length: ${segmentLength}m`);
      continue;
    }

    let segmentType: 'straight' | 'turn' | 'incline' | 'vertical' = 'straight';
    let controlPoints: Point3D[] | undefined;
    let headLift: number | undefined;

    // Check for vertical/inclined segments
    if (startSupport.z !== endSupport.z) {
      const heightDiff = Math.abs(endSupport.z - startSupport.z);
      segmentType = heightDiff > 0.1 ? 'vertical' : 'incline';
      headLift = heightDiff;
    } else if (i > 0) {
      // Check for turns on same level
      const prevSupport = finalPath[i - 1];
      if (shouldCreateTurn(prevSupport, startSupport, endSupport)) {
        segmentType = 'turn';
        // Store the previous support position as the control point
        // This tells generatePipePath where the pipe was coming FROM
        // so it can draw a proper elbow at the start support (turn point)
        controlPoints = [{ x: prevSupport.x, y: prevSupport.y, z: prevSupport.z }];
      }
    }

    const segment: PipeSegment = {
      id: `pipe-segment-${Date.now()}-${i}`,
      type: segmentType,
      startSupport: startSupport.id,
      endSupport: endSupport.id,
      controlPoints,
      length: segmentLength,
      headLift,
      // Production Simulation defaults (tier inherited from pipeline)
      pipeTier: 1,
      maxThroughput: 300, // Mk.1 default: 300 m³/min
      actualThroughput: 0,
      fluidType: null,
      isBottleneck: false,
    };

    segments[segment.id] = segment;
    segmentIds.push(segment.id);
  }

  if (segmentIds.length === 0) {
    return null;
  }

  // Create the pipeline
  const pipeline: Pipeline = {
    id: drawingState.currentPipelineId,
    segments: segmentIds,
    fromBuildingId: drawingState.pipeStartBuildingId,
    fromConnectionPoint: drawingState.pipeStartConnectionPoint,
    toBuildingId: buildingId,
    toConnectionPoint: connectionPointId,
    floor: currentFloor,
    mark: 1,
  };

  pipelines[pipeline.id] = pipeline;

  const newDrawingState: Partial<PipeDrawingState> = {
    drawingPipe: false,
    currentPipelineId: undefined,
    pipeStartSupport: null,
    pipePath: [],
    pipeStartBuildingId: undefined,
    pipeStartConnectionPoint: undefined,
  };

  return {
    supports,
    segments,
    pipelines,
    drawingState: newDrawingState,
  };
};

/**
 * Cancels current pipe drawing
 */
export const cancelPipeDrawing = (
  drawingState: PipeDrawingState,
  existingSupports: Record<string, PipeSupport>
): CancelPipeDrawingResult => {
  // Remove non-anchor supports created during drawing
  const supports = { ...existingSupports };

  drawingState.pipePath.forEach((support) => {
    if (!support.isAnchor && supports[support.id]) {
      delete supports[support.id];
    }
  });

  const newDrawingState: Partial<PipeDrawingState> = {
    drawingPipe: false,
    currentPipelineId: undefined,
    pipeStartSupport: null,
    pipePath: [],
    pipeStartBuildingId: undefined,
    pipeStartConnectionPoint: undefined,
  };

  return {
    supports,
    drawingState: newDrawingState,
  };
};

/**
 * Updates support positions and connected segments
 */
export const updateSupportAndSegments = (
  supportId: string,
  updates: Partial<PipeSupport>,
  existingSupports: Record<string, PipeSupport>,
  existingSegments: Record<string, PipeSegment>
): { supports: Record<string, PipeSupport>; segments: Record<string, PipeSegment> } => {
  const supports = {
    ...existingSupports,
    [supportId]: { ...existingSupports[supportId], ...updates },
  };

  // Update connected pipe segments
  const segments = { ...existingSegments };
  Object.values(segments).forEach((segment) => {
    if (segment.startSupport === supportId || segment.endSupport === supportId) {
      const startSupport = supports[segment.startSupport];
      const endSupport = supports[segment.endSupport];
      if (startSupport && endSupport) {
        const newLength = distance3D(startSupport, endSupport);
        const headLift = Math.abs(endSupport.z - startSupport.z);
        segments[segment.id] = {
          ...segment,
          length: newLength,
          headLift: headLift > 0 ? headLift : undefined,
        };
      }
    }
  });

  return { supports, segments };
};

/**
 * Deletes a support and its connected segments/pipelines
 */
export const deleteSupportAndCleanup = (
  supportId: string,
  existingSupports: Record<string, PipeSupport>,
  existingSegments: Record<string, PipeSegment>,
  existingPipelines: Record<string, Pipeline>
): {
  supports: Record<string, PipeSupport>;
  segments: Record<string, PipeSegment>;
  pipelines: Record<string, Pipeline>;
} => {
  const supports = { ...existingSupports };
  const segments = { ...existingSegments };
  const pipelines = { ...existingPipelines };

  // Find and remove segments connected to this support
  Object.entries(segments).forEach(([segId, segment]) => {
    if (segment.startSupport === supportId || segment.endSupport === supportId) {
      delete segments[segId];

      // Remove segment from pipelines
      Object.values(pipelines).forEach((pipeline) => {
        pipeline.segments = pipeline.segments.filter((s) => s !== segId);
      });
    }
  });

  // Remove empty pipelines
  Object.entries(pipelines).forEach(([pipelineId, pipeline]) => {
    if (pipeline.segments.length === 0) {
      delete pipelines[pipelineId];
    }
  });

  delete supports[supportId];

  return { supports, segments, pipelines };
};
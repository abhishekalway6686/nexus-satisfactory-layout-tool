// src/utils/helpers.ts
import { Point, Point3D, Building, ConnectionPoint, RailwayConnectionPoint, ConveyorSegment, ConveyorPole, PipeSegment, PipeSupport, RailwaySegment, RailwayNode, Railway, ConveyorLift, WallSegment, BuildingAlignmentContext, AlignmentValidationResult, AlignmentSuggestion, PowerPole, PowerlineSegment, Powerline, PowerConnectionPoint, PowerValidationResult, BuildingPowerData } from '../types';
import { PIXELS_PER_METER, BUILDING_TYPES, FLOOR_HEIGHT, GRID_SIZE, GRID_SNAP_THRESHOLD, POWERLINE_MAX_LENGTH, POWER_POLE_MK1_RANGE, POWER_POLE_MK2_RANGE, POWER_POLE_MK3_RANGE, POWER_TOWER_RANGE, POWER_POLE_MK1_MAX_CONNECTIONS, POWER_POLE_MK2_MAX_CONNECTIONS, POWER_POLE_MK3_MAX_CONNECTIONS, POWER_TOWER_MAX_TOTAL_CONNECTIONS, POWER_POLE_MAX_CONNECTIONS, POWER_TOWER_MAX_CONNECTIONS } from '../constants';
import { 
  distance3D, 
  distance3DSquared, 
  distance2D, 
  distance2DSquared, 
  projectPointOnLine,
  calculateDistancesBulkJS,
  calculateDistances3DSquaredBulkJS,
  calculateDistances2DBulkJS,
  calculateDistances2DSquaredBulkJS
} from './distanceCalculations';

export const getConnectionPointWorldPos = (building: Building, buildingDef: any, connectionPoint: ConnectionPoint): Point3D => {
  // Connection points are defined relative to the building's local coordinate system (0,0 at top-left)
  const localX = connectionPoint.x;
  const localY = connectionPoint.y;

  // Apply rotation transformation around the building center
  const centerX = buildingDef.width / 2;
  const centerY = buildingDef.height / 2;

  // Translate to origin (relative to center)
  const relX = localX - centerX;
  const relY = localY - centerY;

  // Apply rotation
  let rotatedX, rotatedY;
  switch (building.rotation) {
    case 90:
      rotatedX = -relY;
      rotatedY = relX;
      break;
    case 180:
      rotatedX = -relX;
      rotatedY = -relY;
      break;
    case 270:
      rotatedX = relY;
      rotatedY = -relX;
      break;
    default: // 0 degrees
      rotatedX = relX;
      rotatedY = relY;
      break;
  }

  // Translate back and add to building position
  return {
    x: building.x + centerX + rotatedX,
    y: building.y + centerY + rotatedY,
    z: building.z // Use building's z, as ConnectionPoint lacks z
  };
};

export const getConveyorLiftConnectionPointWorldPos = (lift: ConveyorLift, connectionPoint: ConnectionPoint, floor: number): Point3D => {
  // Calculate the Z position based on which floor we're checking
  let z: number;
  
  if (connectionPoint.id === 'start-floor') {
    z = lift.startFloor * FLOOR_HEIGHT;
  } else if (connectionPoint.id === 'end-floor') {
    z = lift.endFloor * FLOOR_HEIGHT;
  } else {
    // Default to current floor if somehow neither
    z = floor * FLOOR_HEIGHT;
  }
  
  // Connection points are relative to lift position
  return {
    x: lift.x + connectionPoint.x,
    y: lift.y + connectionPoint.y,
    z
  };
};

export const getRailwayConnectionPointWorldPos = (building: Building, buildingDef: any, railwayPoint: RailwayConnectionPoint): Point3D => {
  // Railway points are defined relative to the building's local coordinate system (0,0 at top-left)
  const localX = railwayPoint.x;
  const localY = railwayPoint.y;

  // Apply rotation transformation around the building center
  const centerX = buildingDef.width / 2;
  const centerY = buildingDef.height / 2;

  // Translate to origin (relative to center)
  const relX = localX - centerX;
  const relY = localY - centerY;

  // Apply rotation
  let rotatedX, rotatedY;
  switch (building.rotation) {
    case 90:
      rotatedX = -relY;
      rotatedY = relX;
      break;
    case 180:
      rotatedX = -relX;
      rotatedY = -relY;
      break;
    case 270:
      rotatedX = relY;
      rotatedY = -relX;
      break;
    default: // 0 degrees
      rotatedX = relX;
      rotatedY = relY;
      break;
  }

  // Translate back and add to building position
  return {
    x: building.x + centerX + rotatedX,
    y: building.y + centerY + rotatedY,
    z: building.z // Use building's z, as RailwayConnectionPoint lacks z
  };
};

/**
 * Creates prefab railway infrastructure for train buildings (train_station, freight_platform, etc.)
 * This function generates the internal railway track that runs through the building.
 *
 * In Satisfactory, train stations have railway tracks running through their center.
 * This function creates:
 * - Two anchor nodes at the rail_in and rail_out connection points
 * - One railway segment connecting them
 * - One railway entity referencing the segment
 *
 * @param building The train building that was just placed
 * @param buildingDef The building type definition from BUILDING_TYPES
 * @returns Prefab railway data to be merged into state, or null if not a train building
 */
export const createPrefabRailwayForTrainBuilding = (
  building: Building,
  buildingDef: {
    railwayPoints?: RailwayConnectionPoint[];
    width: number;
    height: number;
  }
): {
  nodes: Record<string, RailwayNode>;
  segments: Record<string, RailwaySegment>;
  railways: Record<string, Railway>;
} | null => {
  // Only create prefab railways for buildings with railway connection points
  if (!buildingDef.railwayPoints || buildingDef.railwayPoints.length < 2) {
    return null;
  }

  // Find rail_in and rail_out points
  const railInPoint = buildingDef.railwayPoints.find(rp => rp.id === 'rail_in');
  const railOutPoint = buildingDef.railwayPoints.find(rp => rp.id === 'rail_out');

  if (!railInPoint || !railOutPoint) {
    return null;
  }

  // Calculate world positions for both railway points
  const railInWorldPos = getRailwayConnectionPointWorldPos(building, buildingDef, railInPoint);
  const railOutWorldPos = getRailwayConnectionPointWorldPos(building, buildingDef, railOutPoint);

  // Create unique IDs for this building's prefab railway
  const railInNodeId = `rail-anchor-${building.id}-rail_in`;
  const railOutNodeId = `rail-anchor-${building.id}-rail_out`;
  const segmentId = `rail-segment-prefab-${building.id}`;
  const railwayId = `railway-prefab-${building.id}`;

  // Create anchor nodes at both railway connection points
  const railInNode: RailwayNode = {
    id: railInNodeId,
    x: railInWorldPos.x,
    y: railInWorldPos.y,
    z: railInWorldPos.z,
    floor: building.floor,
    isAnchor: true,
  };

  const railOutNode: RailwayNode = {
    id: railOutNodeId,
    x: railOutWorldPos.x,
    y: railOutWorldPos.y,
    z: railOutWorldPos.z,
    floor: building.floor,
    isAnchor: true,
  };

  // Create a straight railway segment through the building
  const segmentLength = distance3D(railInWorldPos, railOutWorldPos);
  const segment: RailwaySegment = {
    id: segmentId,
    type: 'straight',
    startNode: railInNodeId,
    endNode: railOutNodeId,
    startPoint: { x: railInWorldPos.x, y: railInWorldPos.y, z: railInWorldPos.z },
    endPoint: { x: railOutWorldPos.x, y: railOutWorldPos.y, z: railOutWorldPos.z },
    length: segmentLength,
    fromStation: building.id,
    fromRailPoint: 'rail_in',
    toStation: building.id,
    toRailPoint: 'rail_out',
    direction: 'bidirectional', // Internal tracks are bidirectional
    showArrows: false, // Don't show direction arrows for internal prefab tracks
  };

  // Create the railway entity
  const railway: Railway = {
    id: railwayId,
    segments: [segmentId],
    stations: [building.id],
    floor: building.floor,
  };

  return {
    nodes: {
      [railInNodeId]: railInNode,
      [railOutNodeId]: railOutNode,
    },
    segments: {
      [segmentId]: segment,
    },
    railways: {
      [railwayId]: railway,
    },
  };
};

// Export distance functions directly (now using pure JS implementations)
export { distance3D };

// Performance-optimized squared distance function - avoids expensive Math.sqrt() for comparisons
export { distance3DSquared };

export { distance2D };

// Performance-optimized squared distance function for 2D - avoids expensive Math.sqrt() for comparisons
export { distance2DSquared };

// Curve utilities moved to src/logic/common/curveUtils.ts

// Railway curve utilities moved to src/logic/railway/railwayCurves.ts

export const generateConveyorPath = (segment: ConveyorSegment, poles: Record<string, ConveyorPole>): string => {
  const startPole = poles[segment.startPole];
  const endPole = poles[segment.endPole];

  if (!startPole || !endPole) {
    return '';
  }

  const startX = startPole.x * PIXELS_PER_METER;
  const startY = startPole.y * PIXELS_PER_METER;
  const endX = endPole.x * PIXELS_PER_METER;
  const endY = endPole.y * PIXELS_PER_METER;

  if (segment.type === 'straight' || segment.type === 'incline') {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  } else if (segment.type === 'turn' && segment.controlPoints && segment.controlPoints.length > 0) {
    const cp = segment.controlPoints[0];
    const cpX = cp.x * PIXELS_PER_METER;
    const cpY = cp.y * PIXELS_PER_METER;
    return `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;
  }

  return `M ${startX} ${startY} L ${endX} ${endY}`;
};

/**
 * Generates SVG path for a pipe segment
 * For turn segments, creates a tight elbow at the turn point rather than a long bezier curve
 *
 * Satisfactory-style pipes use:
 * - Straight segments between supports
 * - Short, tight elbows (15-degree increments) at turn points
 * - Fixed small radius for the elbow arc
 *
 * For turn segments:
 * - controlPoints[0] contains the PREVIOUS support position (where pipe came from)
 * - The turn/elbow occurs at the startSupport position
 * - The pipe then continues to endSupport
 *
 * IMPORTANT: To prevent visual overlap between consecutive segments:
 * - Turn segments draw from startSupport to endSupport with an elbow arc at startSupport
 * - The path starts AT the startSupport (turn point), draws an elbow, then continues to endSupport
 * - This means the PREVIOUS segment should be aware that it connects to a turn
 */
export const generatePipePath = (segment: PipeSegment, supports: Record<string, PipeSupport>): string => {
  const startSupport = supports[segment.startSupport];
  const endSupport = supports[segment.endSupport];

  if (!startSupport || !endSupport) {
    return '';
  }

  const startX = startSupport.x * PIXELS_PER_METER;
  const startY = startSupport.y * PIXELS_PER_METER;
  const endX = endSupport.x * PIXELS_PER_METER;
  const endY = endSupport.y * PIXELS_PER_METER;

  if (segment.type === 'straight' || segment.type === 'incline' || segment.type === 'vertical') {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  } else if (segment.type === 'turn' && segment.controlPoints && segment.controlPoints.length > 0) {
    // For turn segments:
    // - controlPoints[0] = previous support position (where pipe came from)
    // - startSupport = the turn point (where the elbow is)
    // - endSupport = where the pipe goes after the turn
    //
    // The elbow is drawn AT the turn point (startSupport), connecting:
    // - The incoming direction (from previous support)
    // - The outgoing direction (toward end support)

    const prevPoint = segment.controlPoints[0];
    const prevX = prevPoint.x * PIXELS_PER_METER;
    const prevY = prevPoint.y * PIXELS_PER_METER;

    // The turn point is at startSupport
    const turnX = startX;
    const turnY = startY;

    // Calculate elbow radius - smaller radius for tighter curves to reduce overlap
    // Using 1.0 meter instead of 1.5 for tighter elbows
    const ELBOW_RADIUS = 1.0 * PIXELS_PER_METER;

    // Calculate directions: from turn point toward prev, and from turn point toward end
    const toPrevX = prevX - turnX;
    const toPrevY = prevY - turnY;
    const toEndX = endX - turnX;
    const toEndY = endY - turnY;

    const distToPrev = Math.sqrt(toPrevX * toPrevX + toPrevY * toPrevY);
    const distToEnd = Math.sqrt(toEndX * toEndX + toEndY * toEndY);

    // Handle edge case where distances are too small
    if (distToPrev < 0.1 || distToEnd < 0.1) {
      return `M ${startX} ${startY} L ${endX} ${endY}`;
    }

    // Normalize directions
    const dirToPrevX = toPrevX / distToPrev;
    const dirToPrevY = toPrevY / distToPrev;
    const dirToEndX = toEndX / distToEnd;
    const dirToEndY = toEndY / distToEnd;

    // Calculate the effective elbow radius
    // IMPORTANT: Use a smaller fraction (0.25) to prevent overlap with adjacent segments
    // The elbow should be compact and centered on the turn point
    const effectiveRadius = Math.min(ELBOW_RADIUS, distToPrev * 0.25, distToEnd * 0.25);

    // Calculate elbow entry point (on the incoming pipe direction from prev)
    // and elbow exit point (on the outgoing pipe direction to end)
    const elbowEntryX = turnX + dirToPrevX * effectiveRadius;
    const elbowEntryY = turnY + dirToPrevY * effectiveRadius;
    const elbowExitX = turnX + dirToEndX * effectiveRadius;
    const elbowExitY = turnY + dirToEndY * effectiveRadius;

    // Calculate the turn angle to determine sweep direction
    // Cross product determines clockwise vs counter-clockwise
    const crossProduct = dirToPrevX * dirToEndY - dirToPrevY * dirToEndX;
    const sweepFlag = crossProduct > 0 ? 0 : 1; // 0 for counter-clockwise, 1 for clockwise

    // Draw the path:
    // 1. Start at the turn point (startSupport)
    // 2. Line from turn point to elbow entry
    // 3. Arc from elbow entry to elbow exit (the actual elbow)
    // 4. Line from elbow exit to end support
    //
    // This ensures the path starts exactly at startSupport and ends exactly at endSupport,
    // preventing any overlap between consecutive segments.

    return `M ${turnX} ${turnY} L ${elbowEntryX} ${elbowEntryY} A ${effectiveRadius} ${effectiveRadius} 0 0 ${sweepFlag} ${elbowExitX} ${elbowExitY} L ${endX} ${endY}`;
  }

  return `M ${startX} ${startY} L ${endX} ${endY}`;
};

export const generateRailwayPath = (startPoint: Point3D, endPoint: Point3D, controlPoints?: Point3D[]): string => {
  const startX = startPoint.x * PIXELS_PER_METER;
  const startY = startPoint.y * PIXELS_PER_METER;
  const endX = endPoint.x * PIXELS_PER_METER;
  const endY = endPoint.y * PIXELS_PER_METER;

  if (controlPoints && controlPoints.length > 0) {
    const cp = controlPoints[0];
    const cpX = cp.x * PIXELS_PER_METER;
    const cpY = cp.y * PIXELS_PER_METER;
    return `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;
  }

  return `M ${startX} ${startY} L ${endX} ${endY}`;
};

export const constrainPoint = (reference: Point, current: Point, isShiftPressed: boolean, isCtrlPressed: boolean): Point => {
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
      y: reference.y + Math.sin(snapAngle) * distance,
    };
  } else if (isShiftPressed && isCtrlPressed) {
    const gridSize = 8;
    const angle = Math.atan2(current.y - reference.y, current.x - reference.x);

    return {
      x: reference.x + Math.cos(angle) * gridSize,
      y: reference.y + Math.sin(angle) * gridSize,
    };
  }

  return current;
};

// Re-export projectPointOnLine from distanceCalculations
export { projectPointOnLine };

export const findClosestRailwayNode = (point: Point3D, nodes: Record<string, RailwayNode>, threshold: number): string | null => {
  let minDistSquared = Infinity;
  let closestId: string | null = null;
  Object.entries(nodes).forEach(([id, node]) => {
    const distSquared = distance3DSquared(point, node);
    if (distSquared < minDistSquared && distSquared <= threshold * threshold) {
      minDistSquared = distSquared;
      closestId = id;
    }
  });
  return closestId;
};

export interface SnapResult {
  point: Point3D;
  segmentId: string;
  t: number;
}

export const findClosestRailwaySnap = (point: Point3D, segments: Record<string, RailwaySegment>, threshold: number): SnapResult | null => {
  let minDistSquared = Infinity;
  let closest: SnapResult | null = null;
  Object.entries(segments).forEach(([id, seg]) => {
    const { proj, t } = projectPointOnLine(point, seg.startPoint, seg.endPoint);
    const distSquared = distance3DSquared(point, proj);
    if (distSquared < minDistSquared && distSquared <= threshold * threshold) {
      minDistSquared = distSquared;
      closest = { point: proj, segmentId: id, t };
    }
  });
  return closest;
};

// Bezier utilities moved to src/logic/common/curveUtils.ts

export function getParallelCurvePoints(centerPoints: Point[], offset: number): Point[] {
  const parallel: Point[] = [];
  for (let i = 1; i < centerPoints.length; i++) {
    const prev = centerPoints[i - 1];
    const curr = centerPoints[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const perpX = -dy / len * offset;
      const perpY = dx / len * offset;
      parallel.push({ x: curr.x + perpX, y: curr.y + perpY });
    } else {
      parallel.push({ x: curr.x, y: curr.y });
    }
  }
  if (parallel.length > 0) {
    parallel.unshift(parallel[0]);
  }
  return parallel;
}

/**
 * Calculates arrow positions and rotations along a path with specified spacing
 * @param centerPoints The center points of the path
 * @param spacing Distance between arrows
 * @param isReverse Whether arrows should point in reverse direction
 * @returns Array of arrow positions with rotation angles
 */
export function getArrowPositionsAlongPath(
  centerPoints: Point[], 
  spacing: number = 80,
  isReverse: boolean = false
): { position: Point; rotation: number }[] {
  const arrows: { position: Point; rotation: number }[] = [];
  let accumulatedDistance = 0;
  
  for (let i = 1; i < centerPoints.length; i++) {
    const prev = centerPoints[i - 1];
    const curr = centerPoints[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    
    if (segmentLength === 0) continue;
    
    // Calculate how many arrows fit in this segment
    const remainingDistance = spacing - (accumulatedDistance % spacing);
    let currentDistance = remainingDistance;
    
    while (currentDistance <= segmentLength) {
      // Calculate position along the segment
      const t = currentDistance / segmentLength;
      const position = {
        x: prev.x + dx * t,
        y: prev.y + dy * t
      };
      
      // Calculate rotation (angle of the tangent)
      let rotation = Math.atan2(dy, dx) * 180 / Math.PI;
      if (isReverse) {
        rotation += 180;
      }
      
      arrows.push({ position, rotation });
      currentDistance += spacing;
    }
    
    accumulatedDistance += segmentLength;
  }
  
  return arrows;
}

// Intersection utilities moved to src/logic/common/intersectionLogic.ts

/**
 * Finds all railway segments connected to a specific building
 * @param buildingId The ID of the building
 * @param segments Record of all railway segments
 * @returns Array of segment IDs connected to the building
 */
export const findConnectedRailwaySegments = (
  buildingId: string,
  segments: Record<string, RailwaySegment>
): string[] => {
  return Object.keys(segments).filter(segmentId => {
    const segment = segments[segmentId];
    return segment.fromStation === buildingId || segment.toStation === buildingId;
  });
};

/**
 * Finds all railway segments that have anchor nodes connected to a building
 * @param buildingId The ID of the building
 * @param segments Record of all railway segments
 * @param railwayNodes Record of all railway nodes
 * @returns Object with segment IDs mapped to their connection information
 */
export const findSegmentsWithBuildingAnchors = (
  buildingId: string,
  segments: Record<string, RailwaySegment>,
  railwayNodes: Record<string, RailwayNode>
): { [segmentId: string]: { connectionType: 'start' | 'end' | 'both', railPointIds: string[] } } => {
  const connectedSegments: { [segmentId: string]: { connectionType: 'start' | 'end' | 'both', railPointIds: string[] } } = {};
  
  // Find all anchor nodes for this building
  const anchorNodes = Object.values(railwayNodes).filter(node => 
    node.isAnchor && node.id.includes(`rail-anchor-${buildingId}-`)
  );
  
  // Find segments that use these anchor nodes
  Object.entries(segments).forEach(([segmentId, segment]) => {
    const startAnchor = anchorNodes.find(node => node.id === segment.startNode);
    const endAnchor = anchorNodes.find(node => node.id === segment.endNode);
    
    if (startAnchor || endAnchor) {
      const railPointIds: string[] = [];
      let connectionType: 'start' | 'end' | 'both';
      
      if (startAnchor && endAnchor) {
        connectionType = 'both';
        // Extract rail point IDs from anchor node IDs
        const startRailPoint = startAnchor.id.split('-')[3];
        const endRailPoint = endAnchor.id.split('-')[3];
        if (startRailPoint) railPointIds.push(startRailPoint);
        if (endRailPoint && endRailPoint !== startRailPoint) railPointIds.push(endRailPoint);
      } else if (startAnchor) {
        connectionType = 'start';
        const railPoint = startAnchor.id.split('-')[3];
        if (railPoint) railPointIds.push(railPoint);
      } else {
        connectionType = 'end';
        const railPoint = endAnchor!.id.split('-')[3];
        if (railPoint) railPointIds.push(railPoint);
      }
      
      connectedSegments[segmentId] = { connectionType, railPointIds };
    }
  });
  
  return connectedSegments;
};

/**
 * Recalculates curve control points for a railway segment
 * @param segmentId The ID of the segment to recalculate
 * @param segments Record of all railway segments
 * @param railwayNodes Record of all railway nodes
 * @param railways Record of all railways
 * @returns Updated segment with recalculated control points, or null if no update needed
 */
export const recalculateSegmentCurveControlPoints = (
  segmentId: string,
  segments: Record<string, RailwaySegment>,
  railwayNodes: Record<string, RailwayNode>,
  railways: Record<string, Railway>
): RailwaySegment | null => {
  const segment = segments[segmentId];
  if (!segment) {
    return null;
  }
  
  const startNode = railwayNodes[segment.startNode];
  const endNode = railwayNodes[segment.endNode];
  
  if (!startNode || !endNode) {
    return null;
  }
  
  // Find the railway that contains this segment
  const railway = Object.values(railways).find(r => r.segments.includes(segmentId));
  if (!railway) {
    return null;
  }
  
  const segmentIndex = railway.segments.indexOf(segmentId);
  
  // We need the previous and next nodes to calculate curves properly
  let prevNode: RailwayNode | null = null;
  let nextNode: RailwayNode | null = null;
  
  // Find previous node (from previous segment)
  if (segmentIndex > 0) {
    const prevSegment = segments[railway.segments[segmentIndex - 1]];
    if (prevSegment) {
      // The previous node is the one that's not shared with current segment
      if (prevSegment.endNode === segment.startNode) {
        prevNode = railwayNodes[prevSegment.startNode];
      } else if (prevSegment.startNode === segment.startNode) {
        prevNode = railwayNodes[prevSegment.endNode];
      }
    }
  }
  
  // Find next node (from next segment)
  if (segmentIndex < railway.segments.length - 1) {
    const nextSegment = segments[railway.segments[segmentIndex + 1]];
    if (nextSegment) {
      // The next node is the one that's not shared with current segment
      if (nextSegment.startNode === segment.endNode) {
        nextNode = railwayNodes[nextSegment.endNode];
      } else if (nextSegment.endNode === segment.endNode) {
        nextNode = railwayNodes[nextSegment.startNode];
      }
    }
  }
  
  // Import curve utilities here to avoid circular dependencies
  // Use synchronous fallback for store operations
  // Constants for 15-degree curve increments
  const CURVE_ANGLE_INCREMENT = Math.PI / 12; // 15 degrees in radians

  const shouldCreateTurn = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): boolean => {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const angle1 = Math.atan2(v1.y, v1.x);
    const angle2 = Math.atan2(v2.y, v2.x);
    let diff = angle2 - angle1;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return Math.abs(diff) > CURVE_ANGLE_INCREMENT; // 15 degrees for tighter curves
  };

  const calculateCurveControlPoint = (p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }, p3: { x: number; y: number; z: number }): { x: number; y: number; z: number } => {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (len1 === 0 || len2 === 0) return p2;

    // Calculate bisector for tighter, more geometric curves
    const bisectorX = v1.x / len1 + v2.x / len2;
    const bisectorY = v1.y / len1 + v2.y / len2;
    const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY);

    if (bisectorLen < 0.001) {
      return { x: p2.x, y: p2.y, z: p2.z };
    }

    // Tighter offset for sharper curves (max 1.5 meters)
    const minDist = Math.min(len1, len2);
    const offsetDistance = Math.min(minDist * 0.2, 1.5);

    return {
      x: p2.x + (bisectorX / bisectorLen) * offsetDistance,
      y: p2.y + (bisectorY / bisectorLen) * offsetDistance,
      z: p2.z
    };
  };
  
  // Recalculate control points based on the available nodes
  let newControlPoints: Point3D[] | undefined;
  let newType: 'straight' | 'curve' = 'straight';
  
  // Check if we need to create a curve based on the three-point pattern
  if (prevNode && shouldCreateTurn(prevNode, startNode, endNode)) {
    // Curve at the start of this segment
    const cp = calculateCurveControlPoint(prevNode, startNode, endNode);
    newControlPoints = [cp];
    newType = 'curve';
  } else if (nextNode && shouldCreateTurn(startNode, endNode, nextNode)) {
    // Curve at the end of this segment
    const cp = calculateCurveControlPoint(startNode, endNode, nextNode);
    newControlPoints = [cp];
    newType = 'curve';
  }
  
  // Always update endpoints and length, even for straight segments
  const updatedSegment = {
    ...segment,
    startPoint: { x: startNode.x, y: startNode.y, z: startNode.z },
    endPoint: { x: endNode.x, y: endNode.y, z: endNode.z },
    length: distance3D(startNode, endNode),
    controlPoints: newControlPoints,
    type: newType
  };
  
  return updatedSegment;
};

/**
 * Updates metadata for railway segments connected to a building
 * @param buildingId The ID of the building
 * @param segments Record of all railway segments
 * @param railwayNodes Record of all railway nodes
 * @returns Updated segments record
 */
export const updateRailwaySegmentMetadata = (
  buildingId: string,
  segments: Record<string, RailwaySegment>,
  railwayNodes: Record<string, RailwayNode>
): Record<string, RailwaySegment> => {
  const updatedSegments = { ...segments };
  
  // Find all segments that reference this building
  Object.entries(updatedSegments).forEach(([segmentId, segment]) => {
    if (segment.fromStation === buildingId || segment.toStation === buildingId) {
      const startNode = railwayNodes[segment.startNode];
      const endNode = railwayNodes[segment.endNode];
      
      if (startNode && endNode) {
        updatedSegments[segmentId] = {
          ...segment,
          startPoint: { x: startNode.x, y: startNode.y, z: startNode.z },
          endPoint: { x: endNode.x, y: endNode.y, z: endNode.z },
          length: distance3D(startNode, endNode),
        };
      }
    }
  });
  
  return updatedSegments;
};

/**
 * Finds all railway segments that might be affected by changes to segments connected to a building
 * This includes segments that share nodes with the building's segments (for curve recalculation)
 * @param buildingId The ID of the building
 * @param segments Record of all railway segments
 * @param railwayNodes Record of all railway nodes
 * @param railways Record of all railways
 * @returns Array of segment IDs that might need curve recalculation
 */
export const findAdjacentSegmentsForCurveRecalculation = (
  buildingId: string,
  segments: Record<string, RailwaySegment>,
  railwayNodes: Record<string, RailwayNode>,
  railways: Record<string, Railway>
): string[] => {
  const affectedSegments = new Set<string>();
  
  // First, find all segments directly connected to the building
  const directlyConnectedSegments = findSegmentsWithBuildingAnchors(buildingId, segments, railwayNodes);
  
  // For each directly connected segment, find adjacent segments that might need curve updates
  Object.keys(directlyConnectedSegments).forEach(segmentId => {
    const segment = segments[segmentId];
    if (!segment) return;
    
    // Find the railway that contains this segment
    const railway = Object.values(railways).find(r => r.segments.includes(segmentId));
    if (!railway) return;
    
    const segmentIndex = railway.segments.indexOf(segmentId);
    
    // Add adjacent segments (both straight and curved) since position changes can affect curve calculations
    if (segmentIndex > 0) {
      const prevSegmentId = railway.segments[segmentIndex - 1];
      affectedSegments.add(prevSegmentId);
    }
    
    if (segmentIndex < railway.segments.length - 1) {
      const nextSegmentId = railway.segments[segmentIndex + 1];
      affectedSegments.add(nextSegmentId);
    }
    
    // Also check segments that are 2 positions away that might be affected
    // This handles cases where a building movement affects a curve that's not immediately adjacent
    if (segmentIndex > 1) {
      const prevPrevSegmentId = railway.segments[segmentIndex - 2];
      const prevPrevSegment = segments[prevPrevSegmentId];
      if (prevPrevSegment) {
        // Check if this segment's curve might be affected by the node movement
        const sharedNode = segment.startNode;
        if (prevPrevSegment.endNode === sharedNode || prevPrevSegment.startNode === sharedNode) {
          affectedSegments.add(prevPrevSegmentId);
        }
      }
    }
    
    if (segmentIndex < railway.segments.length - 2) {
      const nextNextSegmentId = railway.segments[segmentIndex + 2];
      const nextNextSegment = segments[nextNextSegmentId];
      if (nextNextSegment) {
        // Check if this segment's curve might be affected by the node movement
        const sharedNode = segment.endNode;
        if (nextNextSegment.startNode === sharedNode || nextNextSegment.endNode === sharedNode) {
          affectedSegments.add(nextNextSegmentId);
        }
      }
    }
  });
  
  return Array.from(affectedSegments);
};

/**
 * Validates and repairs railway segment integrity after building updates
 * This ensures that all segments maintain valid connections and proper curve calculations
 * @param buildingId The ID of the building that was updated
 * @param segments Record of all railway segments
 * @param railwayNodes Record of all railway nodes
 * @param railways Record of all railways
 * @returns Object with repaired segments and any validation errors
 */
export const validateAndRepairRailwayConnections = (
  buildingId: string,
  segments: Record<string, RailwaySegment>,
  railwayNodes: Record<string, RailwayNode>
): { 
  repairedSegments: Record<string, RailwaySegment>;
  validationErrors: string[];
} => {
  const repairedSegments = { ...segments };
  const validationErrors: string[] = [];
  
  // Find all segments connected to this building
  const connectedSegments = findSegmentsWithBuildingAnchors(buildingId, segments, railwayNodes);
  
  Object.keys(connectedSegments).forEach(segmentId => {
    const segment = repairedSegments[segmentId];
    if (!segment) {
      validationErrors.push(`Segment ${segmentId} not found`);
      return;
    }
    
    const startNode = railwayNodes[segment.startNode];
    const endNode = railwayNodes[segment.endNode];
    
    if (!startNode) {
      validationErrors.push(`Start node ${segment.startNode} not found for segment ${segmentId}`);
      return;
    }
    
    if (!endNode) {
      validationErrors.push(`End node ${segment.endNode} not found for segment ${segmentId}`);
      return;
    }
    
    // Validate segment length is reasonable
    const calculatedLength = distance3D(startNode, endNode);
    if (calculatedLength < 0.1) {
      validationErrors.push(`Segment ${segmentId} has invalid length: ${calculatedLength}`);
    }
    
    // Update segment with current node positions
    repairedSegments[segmentId] = {
      ...segment,
      startPoint: { x: startNode.x, y: startNode.y, z: startNode.z },
      endPoint: { x: endNode.x, y: endNode.y, z: endNode.z },
      length: calculatedLength
    };
  });
  
  return {
    repairedSegments,
    validationErrors
  };
};

/**
 * Handles comprehensive railway updates when a building is rotated
 * This specifically addresses rotation-related changes to railway connection points
 * @param buildingId The ID of the building being rotated
 * @param newRotation The new rotation angle
 * @param segments Record of all railway segments
 * @param railwayNodes Record of all railway nodes
 * @param railways Record of all railways
 * @param buildings Record of all buildings (with updated rotation)
 * @returns Updated segments and nodes with proper rotation handling
 */
export const handleBuildingRotationForRailways = (
  buildingId: string,
  _newRotation: number,
  segments: Record<string, RailwaySegment>,
  railwayNodes: Record<string, RailwayNode>,
  railways: Record<string, Railway>,
  buildings: Record<string, Building>
): {
  updatedSegments: Record<string, RailwaySegment>;
  updatedNodes: Record<string, RailwayNode>;
} => {
  const updatedSegments = { ...segments };
  const updatedNodes = { ...railwayNodes };
  
  const building = buildings[buildingId];
  if (!building) {
    return { updatedSegments, updatedNodes };
  }
  
  const buildingDef = BUILDING_TYPES[building.type];
  if (!buildingDef || !buildingDef.railwayPoints) {
    return { updatedSegments, updatedNodes };
  }
  
  // Update all anchor nodes for this building with new positions based on rotation
  buildingDef.railwayPoints.forEach(railPoint => {
    const anchorNodeId = `rail-anchor-${buildingId}-${railPoint.id}`;
    const anchorNode = updatedNodes[anchorNodeId];
    
    if (anchorNode) {
      const worldPos = getRailwayConnectionPointWorldPos(building, buildingDef, railPoint);
      updatedNodes[anchorNodeId] = {
        ...anchorNode,
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
      };
    }
  });
  
  // Find and update all segments connected to this building
  const connectedSegments = findSegmentsWithBuildingAnchors(buildingId, updatedSegments, updatedNodes);
  
  Object.keys(connectedSegments).forEach(segmentId => {
    const segment = updatedSegments[segmentId];
    if (!segment) return;
    
    const startNode = updatedNodes[segment.startNode];
    const endNode = updatedNodes[segment.endNode];
    
    if (startNode && endNode) {
      // Update segment endpoints and recalculate curves
      const updatedSegment = recalculateSegmentCurveControlPoints(
        segmentId,
        updatedSegments,
        updatedNodes,
        railways
      );
      
      if (updatedSegment) {
        updatedSegments[segmentId] = updatedSegment;
      } else {
        // Fallback: update basic properties
        updatedSegments[segmentId] = {
          ...segment,
          startPoint: { x: startNode.x, y: startNode.y, z: startNode.z },
          endPoint: { x: endNode.x, y: endNode.y, z: endNode.z },
          length: distance3D(startNode, endNode),
        };
      }
    }
  });
  
  // Also update adjacent segments that might be affected by the rotation
  const adjacentSegmentIds = findAdjacentSegmentsForCurveRecalculation(
    buildingId,
    updatedSegments,
    updatedNodes,
    railways
  );
  
  adjacentSegmentIds.forEach(segmentId => {
    if (!connectedSegments[segmentId]) { // Skip already processed segments
      const updatedSegment = recalculateSegmentCurveControlPoints(
        segmentId,
        updatedSegments,
        updatedNodes,
        railways
      );
      
      if (updatedSegment) {
        updatedSegments[segmentId] = updatedSegment;
      }
    }
  });
  
  return {
    updatedSegments,
    updatedNodes
  };
};

// Batch calculation utilities for performance-critical operations
// Use these for bulk distance calculations to benefit from SIMD optimization

/**
 * Calculate distances between multiple point pairs using SIMD optimization
 * @param pointsA Array of start points
 * @param pointsB Array of end points (must be same length as pointsA)
 * @returns Promise<Array of distances> - automatically uses Rust for large datasets, JS for smaller ones
 */
export { calculateDistancesBulkJS as calculateDistancesBulk };

/**
 * Calculate squared distances between multiple point pairs using SIMD optimization
 * @param pointsA Array of start points
 * @param pointsB Array of end points (must be same length as pointsA)
 * @returns Promise<Array of squared distances> - avoids sqrt for performance comparisons
 */
export { calculateDistances3DSquaredBulkJS as calculateDistances3DSquaredBulk };

/**
 * Calculate 2D distances between multiple point pairs using SIMD optimization
 * @param pointsA Array of start points (Z coordinate ignored)
 * @param pointsB Array of end points (Z coordinate ignored)
 * @returns Promise<Array of 2D distances>
 */
export { calculateDistances2DBulkJS as calculateDistances2DBulk };

/**
 * Calculate 2D squared distances between multiple point pairs using SIMD optimization
 * @param pointsA Array of start points (Z coordinate ignored)
 * @param pointsB Array of end points (Z coordinate ignored)
 * @returns Promise<Array of 2D squared distances> - optimal for 2D proximity comparisons
 */
export { calculateDistances2DSquaredBulkJS as calculateDistances2DSquaredBulk };

// Grid snapping utilities

/**
 * Apply grid snapping to coordinates if enabled.
 * Uses threshold-based snapping - only snaps when the value is close enough to a grid line.
 * This prevents the "too aggressive" snapping where buildings always jump to grid points.
 *
 * @param value Coordinate value (x or y)
 * @param gridSize Grid size in meters (default: GRID_SIZE = 2m for quarter-foundation alignment)
 * @param enabled Whether grid snapping is enabled
 * @param threshold Fraction of grid cell that triggers snapping (0.0-0.5, default uses GRID_SNAP_THRESHOLD)
 * @returns Snapped coordinate value (or original if not close enough to grid line)
 */
export const snapToGrid = (
  value: number,
  gridSize: number = GRID_SIZE,
  enabled: boolean = true,
  threshold?: number
): number => {
  if (!enabled) {
    return value;
  }

  // Import threshold from constants if not provided
  const snapThreshold = threshold ?? GRID_SNAP_THRESHOLD;

  // Calculate the nearest grid point
  const invGridSize = 1 / gridSize;
  const scaledValue = value * invGridSize;

  // Use epsilon for floating-point precision
  const epsilon = 1e-10;
  const sign = scaledValue >= 0 ? 1 : -1;
  const nearestGridIndex = Math.round(scaledValue + sign * epsilon);
  const nearestGridPoint = nearestGridIndex * gridSize;

  // Calculate distance to nearest grid point as a fraction of grid size
  const distanceToGrid = Math.abs(value - nearestGridPoint);
  const distanceFraction = distanceToGrid / gridSize;

  // Only snap if within threshold distance of a grid line
  // threshold of 0.5 means always snap (like the old behavior)
  // threshold of 0.25 means only snap if within 25% of grid cell
  if (distanceFraction <= snapThreshold) {
    return nearestGridPoint;
  }

  // Not close enough to grid line - return original value
  return value;
};

/**
 * Apply grid snapping to a 2D point if enabled.
 * Uses threshold-based snapping for less aggressive behavior.
 * @param point Point to snap
 * @param gridSize Grid size in meters (default: GRID_SIZE = 2m for quarter-foundation alignment)
 * @param enabled Whether grid snapping is enabled
 * @returns Snapped point (or original if not close enough to grid)
 */
export const snapPointToGrid = (point: Point, gridSize: number = GRID_SIZE, enabled: boolean = true): Point => {
  return {
    x: snapToGrid(point.x, gridSize, enabled),
    y: snapToGrid(point.y, gridSize, enabled)
  };
};

/**
 * Apply grid snapping to a 3D point if enabled.
 * Uses threshold-based snapping for less aggressive behavior.
 * @param point Point to snap
 * @param gridSize Grid size in meters (default: GRID_SIZE = 2m for quarter-foundation alignment)
 * @param enabled Whether grid snapping is enabled
 * @returns Snapped point (or original if not close enough to grid)
 */
export const snapPoint3DToGrid = (point: Point3D, gridSize: number = GRID_SIZE, enabled: boolean = true): Point3D => {
  return {
    x: snapToGrid(point.x, gridSize, enabled),
    y: snapToGrid(point.y, gridSize, enabled),
    z: point.z // Don't snap Z-axis (floors are handled separately)
  };
};

/**
 * Snap a pixel position to world grid coordinates.
 * This is the preferred function to use in drag handlers and event callbacks.
 * Uses threshold-based snapping for less aggressive behavior.
 *
 * @param pixelPos Position in pixels (e.g., from Konva event)
 * @param gridSize Grid size in meters (default: GRID_SIZE = 2m)
 * @param enabled Whether grid snapping is enabled
 * @returns Snapped position in world coordinates (meters), or original if not close to grid
 */
export const snapPixelPosToWorldGrid = (
  pixelPos: { x: number; y: number },
  gridSize: number = GRID_SIZE,
  enabled: boolean = true
): { x: number; y: number } => {
  // Convert pixels to meters first
  const worldX = pixelPos.x / PIXELS_PER_METER;
  const worldY = pixelPos.y / PIXELS_PER_METER;

  // Apply snapping in world coordinates
  return {
    x: snapToGrid(worldX, gridSize, enabled),
    y: snapToGrid(worldY, gridSize, enabled)
  };
};

// Wall detection and snapping utilities for windows and doors
export interface WallSnapResult {
  isValid: boolean;
  snapPosition?: Point3D;
  wallId?: string;
  wallNormal?: { x: number; y: number };
}

/**
 * Detects if a building position is near a wall and can snap to it
 * @param buildingPosition The position where the building wants to be placed
 * @param buildingType The type of building (window, door, etc.)
 * @param wallSegments All wall segments on the current floor
 * @param floor Current floor level
 * @param snapThreshold Maximum distance for snapping to wall (default: 1.0 meter)
 * @returns Wall snap result with position and validity
 */
export const detectWallSnap = (
  buildingPosition: Point3D,
  buildingType: string,
  wallSegments: Record<string, WallSegment>,
  floor: number,
  snapThreshold: number = 1.0
): WallSnapResult => {
  const buildingDef = BUILDING_TYPES[buildingType];
  if (!buildingDef) {
    return { isValid: false };
  }

  // Only windows and doors should snap to walls
  if (!['window', 'door'].includes(buildingType)) {
    return { isValid: true }; // Other buildings don't need wall validation
  }

  let closestWall: WallSegment | null = null;
  let closestDistance = snapThreshold;
  let closestSnapPosition: Point3D | null = null;
  let closestWallNormal: { x: number; y: number } | null = null;

  // Filter walls on the same floor
  const currentFloorWalls = Object.values(wallSegments).filter((wall: WallSegment) => wall.floor === floor);

  for (const wall of currentFloorWalls) {
    // Calculate wall direction and normal
    const wallVector = { x: wall.endX - wall.x, y: wall.endY - wall.y };
    const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
    
    if (wallLength < 0.01) continue; // Skip degenerate walls
    
    // Normalize wall direction
    const wallDir = { x: wallVector.x / wallLength, y: wallVector.y / wallLength };
    
    // Calculate wall normal (perpendicular to wall)
    const wallNormal = { x: -wallDir.y, y: wallDir.x };

    // Project building position onto wall line
    const wallStart = { x: wall.x, y: wall.y };
    const toBuildingVector = { x: buildingPosition.x - wallStart.x, y: buildingPosition.y - wallStart.y };
    
    // Parameter t along the wall (0 = start, 1 = end)
    const t = (toBuildingVector.x * wallDir.x + toBuildingVector.y * wallDir.y) / wallLength;
    
    // Clamp t to wall bounds
    const clampedT = Math.max(0, Math.min(1, t));
    
    // Calculate closest point on wall
    const closestPointOnWall = {
      x: wallStart.x + clampedT * wallVector.x,
      y: wallStart.y + clampedT * wallVector.y,
      z: buildingPosition.z
    };

    // Calculate distance from building to wall
    const distance = distance2D(buildingPosition, closestPointOnWall);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestWall = wall;
      
      // Calculate snap position on wall surface
      // For windows and doors, snap to the wall surface (slightly offset)
      const surfaceOffset = buildingDef.height / 2; // Half the building depth into the wall
      closestSnapPosition = {
        x: closestPointOnWall.x + wallNormal.x * surfaceOffset,
        y: closestPointOnWall.y + wallNormal.y * surfaceOffset,
        z: buildingPosition.z
      };
      closestWallNormal = wallNormal;
    }
  }

  if (closestWall && closestSnapPosition && closestWallNormal) {
    return {
      isValid: true,
      snapPosition: closestSnapPosition,
      wallId: closestWall.id,
      wallNormal: closestWallNormal
    };
  }

  // For windows and doors, if no wall is found nearby, placement is invalid
  if (['window', 'door'].includes(buildingType)) {
    return { isValid: false };
  }

  // For other buildings, no wall requirement
  return { isValid: true };
};

/**
 * Validates that a window or door is placed on a valid wall surface
 * @param buildingPosition The building position
 * @param buildingType The building type
 * @param wallSegments All wall segments
 * @param floor Current floor
 * @returns True if placement is valid
 */
export const validateWallPlacement = (
  buildingPosition: Point3D,
  buildingType: string,
  wallSegments: Record<string, WallSegment>,
  floor: number
): boolean => {
  const result = detectWallSnap(buildingPosition, buildingType, wallSegments, floor);
  return result.isValid;
};

/**
 * Calculates the rotation needed for a window/door to align with a wall
 * @param wallNormal The wall's normal vector
 * @returns Rotation in degrees (0, 90, 180, or 270)
 */
export const calculateWallAlignedRotation = (wallNormal: { x: number; y: number }): 0 | 90 | 180 | 270 => {
  // Calculate angle of wall normal
  const angle = Math.atan2(wallNormal.y, wallNormal.x) * (180 / Math.PI);
  
  // Round to nearest 90-degree increment
  const roundedAngle = Math.round(angle / 90) * 90;
  
  // Normalize to 0-270 range
  const normalizedAngle = ((roundedAngle % 360) + 360) % 360;
  
  // Ensure it's one of the valid rotation values
  if (normalizedAngle === 90) return 90;
  if (normalizedAngle === 180) return 180;
  if (normalizedAngle === 270) return 270;
  return 0;
};

// Enhanced railway building alignment utilities for Phase 3 improvements

/**
 * Calculates the optimal alignment position for railway connections between buildings
 * @param sourceBuilding The building initiating the connection
 * @param targetBuilding The target building to connect to
 * @param sourceRailPoint The railway connection point on the source building
 * @param targetRailPoint The railway connection point on the target building
 * @returns The optimal position and alignment data, or null if alignment is not possible
 */
export interface RailwayAlignmentResult {
  position: Point3D;
  alignmentScore: number;
  isOptimal: boolean;
  requiredAdjustments: {
    translation: Point3D;
    rotation?: number;
  };
}

export const calculateOptimalRailwayAlignment = (
  sourceBuilding: Building,
  targetBuilding: Building,
  sourceRailPoint: RailwayConnectionPoint,
  targetRailPoint: RailwayConnectionPoint
): RailwayAlignmentResult | null => {
  const sourceBuildingDef = BUILDING_TYPES[sourceBuilding.type];
  const targetBuildingDef = BUILDING_TYPES[targetBuilding.type];
  
  if (!sourceBuildingDef?.railwayPoints || !targetBuildingDef?.railwayPoints) {
    return null;
  }

  // Get target railway point world position
  const targetWorldPos = getRailwayConnectionPointWorldPos(targetBuilding, targetBuildingDef, targetRailPoint);
  
  // Calculate the required offset for the source building to align its railway point with the target
  const sourceBuildingCenter = { 
    x: sourceBuildingDef.width / 2, 
    y: sourceBuildingDef.height / 2 
  };

  // Apply rotation to the source railway point to get its offset from building center
  let railPointOffset = { 
    x: sourceRailPoint.x - sourceBuildingCenter.x, 
    y: sourceRailPoint.y - sourceBuildingCenter.y 
  };

  // Apply source building's rotation to the railway point offset
  switch (sourceBuilding.rotation) {
    case 90:
      railPointOffset = { x: -railPointOffset.y, y: railPointOffset.x };
      break;
    case 180:
      railPointOffset = { x: -railPointOffset.x, y: -railPointOffset.y };
      break;
    case 270:
      railPointOffset = { x: railPointOffset.y, y: -railPointOffset.x };
      break;
    // case 0: no change needed
  }

  // Calculate the required building position to align railway points perfectly
  const alignedPosition: Point3D = {
    x: targetWorldPos.x - railPointOffset.x,
    y: targetWorldPos.y - railPointOffset.y,
    z: targetBuilding.z, // Same floor level
  };

  // Calculate alignment score based on multiple factors
  const originalDistance = distance3D(
    { x: sourceBuilding.x, y: sourceBuilding.y, z: sourceBuilding.z },
    alignedPosition
  );
  
  // Distance penalty (closer is better)
  let alignmentScore = Math.max(0, 100 - originalDistance * 2);
  
  // Direction compatibility bonus
  const isCompatibleDirection = 
    (sourceRailPoint.direction === 'out' && targetRailPoint.direction === 'in') ||
    (sourceRailPoint.direction === 'in' && targetRailPoint.direction === 'out') ||
    (sourceRailPoint.direction === targetRailPoint.direction);
  
  if (isCompatibleDirection) {
    alignmentScore += 20;
  }

  // Building type compatibility bonus
  const TRAIN_STATION_TYPES = ['train_station', 'freight_platform', 'fluid_freight_platform', 'empty_platform'];
  const isTrainStationConnection = TRAIN_STATION_TYPES.includes(sourceBuilding.type) && 
                                   TRAIN_STATION_TYPES.includes(targetBuilding.type);
  
  if (isTrainStationConnection) {
    alignmentScore += 15;
  }

  return {
    position: alignedPosition,
    alignmentScore: Math.min(100, alignmentScore),
    isOptimal: alignmentScore > 75,
    requiredAdjustments: {
      translation: {
        x: alignedPosition.x - sourceBuilding.x,
        y: alignedPosition.y - sourceBuilding.y,
        z: 0
      }
    }
  };
};

/**
 * Calculates the approach angle quality for railway connections
 * @param connectionPoint The railway connection point world position
 * @param approachPoint The point from which the connection is being made
 * @param building The building containing the connection point
 * @param railPoint The railway connection point definition
 * @returns A score from 0-100, where higher values indicate better approach angles
 */
export const calculateApproachAngleScore = (
  connectionPoint: Point3D,
  approachPoint: Point3D,
  building: Building,
  railPoint: RailwayConnectionPoint
): number => {
  const buildingDef = BUILDING_TYPES[building.type];
  if (!buildingDef) return 0;

  // Calculate approach vector
  const approachVector = {
    x: connectionPoint.x - approachPoint.x,
    y: connectionPoint.y - approachPoint.y
  };

  // Calculate the ideal approach angle based on railway point direction
  const buildingCenter = {
    x: building.x + buildingDef.width / 2,
    y: building.y + buildingDef.height / 2
  };

  const railPointToBuildingCenter = {
    x: buildingCenter.x - connectionPoint.x,
    y: buildingCenter.y - connectionPoint.y
  };

  // Ideal approach angle depends on the railway point direction
  let idealApproachVector = { x: 0, y: 0 };
  
  if (railPoint.direction === 'in') {
    // For input points, ideal approach is from outside the building
    idealApproachVector = {
      x: -railPointToBuildingCenter.x,
      y: -railPointToBuildingCenter.y
    };
  } else if (railPoint.direction === 'out') {
    // For output points, ideal approach is toward the connection from outside
    idealApproachVector = railPointToBuildingCenter;
  } else {
    // For bidirectional, any reasonable approach is acceptable
    idealApproachVector = railPointToBuildingCenter;
  }

  // Normalize vectors
  const approachLength = Math.sqrt(approachVector.x ** 2 + approachVector.y ** 2);
  const idealLength = Math.sqrt(idealApproachVector.x ** 2 + idealApproachVector.y ** 2);

  if (approachLength === 0 || idealLength === 0) return 50; // Neutral score for degenerate cases

  const normalizedApproach = {
    x: approachVector.x / approachLength,
    y: approachVector.y / approachLength
  };

  const normalizedIdeal = {
    x: idealApproachVector.x / idealLength,
    y: idealApproachVector.y / idealLength
  };

  // Calculate dot product to get angle similarity
  const dotProduct = normalizedApproach.x * normalizedIdeal.x + normalizedApproach.y * normalizedIdeal.y;
  
  // Convert to score (dot product ranges from -1 to 1, we want 0-100)
  const angleScore = ((dotProduct + 1) / 2) * 100;

  return Math.max(0, Math.min(100, angleScore));
};

/**
 * Validates if a railway connection is structurally sound and follows game rules
 * @param sourceBuilding The source building
 * @param targetBuilding The target building  
 * @param sourceRailPoint The source railway connection point
 * @param targetRailPoint The target railway connection point
 * @returns Validation result with detailed feedback
 */
export interface RailwayConnectionValidation {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

export const validateRailwayConnection = (
  sourceBuilding: Building,
  targetBuilding: Building,
  sourceRailPoint: RailwayConnectionPoint,
  targetRailPoint: RailwayConnectionPoint
): RailwayConnectionValidation => {
  const issues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Floor level validation
  if (Math.abs(sourceBuilding.z - targetBuilding.z) > 0.1) {
    issues.push('Buildings must be on the same floor level for direct railway connections');
  }

  // Direction compatibility validation
  const isDirectionallyCompatible = 
    (sourceRailPoint.direction === 'out' && targetRailPoint.direction === 'in') ||
    (sourceRailPoint.direction === 'in' && targetRailPoint.direction === 'out');

  const isBidirectional = 
    sourceRailPoint.direction === 'bidirectional' || targetRailPoint.direction === 'bidirectional';

  if (!isDirectionallyCompatible && !isBidirectional) {
    warnings.push('Connection directions may not be optimal for efficient transport');
    recommendations.push('Consider using output->input or input->output connections for better flow');
  }

  // Distance validation
  const sourcePos = getRailwayConnectionPointWorldPos(
    sourceBuilding, 
    BUILDING_TYPES[sourceBuilding.type], 
    sourceRailPoint
  );
  const targetPos = getRailwayConnectionPointWorldPos(
    targetBuilding, 
    BUILDING_TYPES[targetBuilding.type], 
    targetRailPoint
  );
  
  const distance = distance3D(sourcePos, targetPos);
  
  if (distance > 100) { // Max railway segment length
    issues.push(`Connection distance (${distance.toFixed(1)}m) exceeds maximum railway segment length`);
  }

  if (distance < 2) {
    warnings.push('Buildings are very close - consider direct conveyor/pipe connections instead');
  }

  // Building type compatibility
  const TRAIN_STATION_TYPES = ['train_station', 'freight_platform', 'fluid_freight_platform', 'empty_platform'];
  const sourceIsStation = TRAIN_STATION_TYPES.includes(sourceBuilding.type);
  const targetIsStation = TRAIN_STATION_TYPES.includes(targetBuilding.type);

  if (!sourceIsStation && !targetIsStation) {
    warnings.push('Neither building is a dedicated train station - connection may have limited functionality');
  }

  if (sourceIsStation && targetIsStation) {
    recommendations.push('Station-to-station connection is optimal for railway transport');
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    recommendations
  };
};

// Building Alignment Validation Functions

/**
 * Calculate the quality score of railway alignment with a building connection point
 */
export const calculateBuildingAlignmentScore = (
  approachAngle: number,
  optimalAngle: number
): { score: number; quality: 'perfect' | 'good' | 'warning' | 'error' } => {
  const angleDiff = Math.abs(normalizeAngle(approachAngle - optimalAngle));
  
  // Perfect alignment: within ±15 degrees
  if (angleDiff <= 15) {
    return { score: Math.max(90, 100 - angleDiff), quality: 'perfect' };
  }
  // Good alignment: within ±30 degrees
  else if (angleDiff <= 30) {
    return { score: Math.max(70, 89 - (angleDiff - 15) * 1.3), quality: 'good' };
  }
  // Warning alignment: within ±45 degrees
  else if (angleDiff <= 45) {
    return { score: Math.max(50, 69 - (angleDiff - 30) * 1.3), quality: 'warning' };
  }
  // Error alignment: greater than ±45 degrees
  else {
    return { score: Math.max(0, 49 - (angleDiff - 45) * 0.8), quality: 'error' };
  }
};

/**
 * Get the optimal approach angle for a railway connection point based on building rotation and connection side
 */
export const getBuildingOptimalAngle = (
  building: Building,
  connectionPoint: RailwayConnectionPoint
): number => {
  // Base angles for each side when building is at 0 degrees rotation
  const sideAngles = {
    front: 270, // Approaching from above (north)
    back: 90,   // Approaching from below (south)  
    left: 180,  // Approaching from left (west)
    right: 0    // Approaching from right (east)
  };

  // Get base angle for the connection point side
  const baseAngle = sideAngles[connectionPoint.side];
  
  // Adjust for building rotation
  const rotationAdjustment = building.rotation;
  const optimalAngle = normalizeAngle(baseAngle + rotationAdjustment);
  
  return optimalAngle;
};

/**
 * Calculate the approach angle of a railway direction vector
 */
export const calculateApproachAngle = (railwayDirection: Point3D): number => {
  // Convert direction vector to angle (0-360 degrees)
  const angle = Math.atan2(railwayDirection.y, railwayDirection.x) * (180 / Math.PI);
  return normalizeAngle(angle);
};

/**
 * Normalize angle to 0-360 degree range
 */
const normalizeAngle = (angle: number): number => {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
};

/**
 * Validate railway building alignment and provide comprehensive feedback
 */
export const validateRailwayBuildingAlignment = (
  context: BuildingAlignmentContext
): AlignmentValidationResult => {
  const { building, connectionPoint, railwayDirection } = context;
  
  // Calculate approach angle from railway direction
  const approachAngle = calculateApproachAngle(railwayDirection);
  
  // Get optimal angle for this connection point
  const optimalAngle = getBuildingOptimalAngle(building, connectionPoint);
  
  // Calculate alignment score and quality
  const { score, quality } = calculateBuildingAlignmentScore(approachAngle, optimalAngle);
  
  // Calculate angle difference for display
  const angleDifference = Math.abs(normalizeAngle(approachAngle - optimalAngle));
  
  // Determine if connection should be allowed
  const isValid = quality !== 'error' || score >= 25; // Allow poor connections but warn
  
  // Generate user-friendly message
  const message = generateAlignmentMessage(quality, score, angleDifference);
  
  // Generate improvement suggestions
  const suggestions = generateAlignmentSuggestions(
    building, 
    connectionPoint, 
    approachAngle, 
    optimalAngle,
    quality
  );
  
  return {
    score,
    quality,
    isValid,
    approachAngle,
    optimalAngle,
    angleDifference,
    message,
    suggestions
  };
};

/**
 * Generate user-friendly alignment message based on quality and score
 */
const generateAlignmentMessage = (
  quality: 'perfect' | 'good' | 'warning' | 'error',
  score: number,
  angleDiff: number
): string => {
  switch (quality) {
    case 'perfect':
      return `Perfect alignment (${score.toFixed(0)}/100) - Railway approaches at optimal angle`;
    case 'good':
      return `Good alignment (${score.toFixed(0)}/100) - Railway approach is acceptable`;
    case 'warning':
      return `Suboptimal alignment (${score.toFixed(0)}/100) - ${angleDiff.toFixed(0)}° off optimal angle`;
    case 'error':
      return `Poor alignment (${score.toFixed(0)}/100) - ${angleDiff.toFixed(0)}° off optimal angle, consider adjusting`;
    default:
      return 'Unknown alignment quality';
  }
};

/**
 * Generate suggestions for improving railway building alignment
 */
const generateAlignmentSuggestions = (
  building: Building,
  connectionPoint: RailwayConnectionPoint,
  approachAngle: number,
  optimalAngle: number,
  quality: 'perfect' | 'good' | 'warning' | 'error'
): AlignmentSuggestion[] => {
  const suggestions: AlignmentSuggestion[] = [];
  
  // Only suggest improvements for suboptimal alignments
  if (quality === 'perfect') {
    return suggestions;
  }
  
  // Calculate potential building rotation improvements
  const rotationSuggestions = calculateRotationSuggestions(
    building, 
    connectionPoint, 
    approachAngle
  );
  
  suggestions.push(...rotationSuggestions);
  
  // Suggest path adjustment for poor alignments
  if (quality === 'warning' || quality === 'error') {
    suggestions.push({
      type: 'adjust_path',
      description: `Adjust railway path to approach from ${getOptimalDirectionName(optimalAngle)}`,
      estimatedImprovement: Math.min(40, 100 - Math.abs(normalizeAngle(approachAngle - optimalAngle)))
    });
  }
  
  // Suggest alternative connection points if building has multiple railway connections
  const buildingDef = BUILDING_TYPES[building.type];
  if (buildingDef?.railwayPoints && buildingDef.railwayPoints.length > 1) {
    const alternativePoints = findBetterConnectionPoints(
      building,
      buildingDef.railwayPoints,
      approachAngle,
      connectionPoint.id
    );
    
    suggestions.push(...alternativePoints);
  }
  
  return suggestions.sort((a, b) => b.estimatedImprovement - a.estimatedImprovement);
};

/**
 * Calculate building rotation suggestions for better alignment
 */
const calculateRotationSuggestions = (
  building: Building,
  connectionPoint: RailwayConnectionPoint,
  approachAngle: number
): AlignmentSuggestion[] => {
  const suggestions: AlignmentSuggestion[] = [];
  const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
  
  for (const rotation of rotations) {
    if (rotation === building.rotation) continue;
    
    // Create temporary context to test this rotation
    const tempBuilding = { ...building, rotation };
    const tempConnectionPoint = { ...connectionPoint };
    const optimalAngle = getBuildingOptimalAngle(tempBuilding, tempConnectionPoint);
    const { score } = calculateBuildingAlignmentScore(approachAngle, optimalAngle);
    
    const currentScore = calculateBuildingAlignmentScore(
      approachAngle, 
      getBuildingOptimalAngle(building, connectionPoint)
    ).score;
    
    const improvement = score - currentScore;
    
    if (improvement > 10) { // Only suggest if significant improvement
      suggestions.push({
        type: 'rotate_building',
        description: `Rotate building ${rotation - building.rotation}° for better alignment`,
        targetRotation: rotation,
        estimatedImprovement: improvement
      });
    }
  }
  
  return suggestions;
};

/**
 * Find alternative connection points that would provide better alignment
 */
const findBetterConnectionPoints = (
  building: Building,
  allRailwayPoints: RailwayConnectionPoint[],
  approachAngle: number,
  currentPointId: string
): AlignmentSuggestion[] => {
  const suggestions: AlignmentSuggestion[] = [];
  
  for (const railPoint of allRailwayPoints) {
    if (railPoint.id === currentPointId) continue;
    
    const optimalAngle = getBuildingOptimalAngle(building, railPoint);
    const { score } = calculateBuildingAlignmentScore(approachAngle, optimalAngle);
    
    const currentOptimal = getBuildingOptimalAngle(building, { id: currentPointId } as RailwayConnectionPoint);
    const currentScore = calculateBuildingAlignmentScore(approachAngle, currentOptimal).score;
    
    const improvement = score - currentScore;
    
    if (improvement > 15) { // Only suggest if significant improvement
      suggestions.push({
        type: 'use_different_connection',
        description: `Use ${railPoint.side} connection point for better alignment`,
        alternativeConnectionPoint: railPoint.id,
        estimatedImprovement: improvement
      });
    }
  }
  
  return suggestions;
};

/**
 * Convert angle to human-readable direction name
 */
const getOptimalDirectionName = (angle: number): string => {
  const normalizedAngle = normalizeAngle(angle);
  
  if (normalizedAngle >= 315 || normalizedAngle < 45) return 'the east';
  if (normalizedAngle >= 45 && normalizedAngle < 135) return 'the south';
  if (normalizedAngle >= 135 && normalizedAngle < 225) return 'the west';
  if (normalizedAngle >= 225 && normalizedAngle < 315) return 'the north';
  
  return 'an optimal direction';
};

/**
 * Check if alignment is within acceptable tolerance for auto-connections
 */
export const isAlignmentWithinTolerance = (
  context: BuildingAlignmentContext,
  strictMode: boolean = false
): boolean => {
  const result = validateRailwayBuildingAlignment(context);
  
  if (strictMode) {
    return result.quality === 'perfect' || result.quality === 'good';
  } else {
    return result.isValid;
  }
};

/**
 * Suggest optimal position correction for railway path to improve building alignment
 */
export const suggestAlignmentCorrection = (
  context: BuildingAlignmentContext,
  currentRailwayEndpoint: Point3D
): Point3D | null => {
  const { connectionWorldPos, building, connectionPoint } = context;
  const optimalAngle = getBuildingOptimalAngle(building, connectionPoint);
  
  // Calculate distance from connection point to current endpoint
  const distance = distance3D(connectionWorldPos, currentRailwayEndpoint);
  
  // Calculate where the endpoint should be for optimal alignment
  const angleRad = (optimalAngle * Math.PI) / 180;
  const suggestedEndpoint: Point3D = {
    x: connectionWorldPos.x + Math.cos(angleRad) * distance,
    y: connectionWorldPos.y + Math.sin(angleRad) * distance,
    z: connectionWorldPos.z
  };
  
  // Only suggest if the correction is reasonable (not too far from current position)
  const correctionDistance = distance3D(currentRailwayEndpoint, suggestedEndpoint);
  if (correctionDistance > distance * 0.5) {
    return null; // Correction would be too dramatic
  }
  
  return suggestedEndpoint;
};

// ============================================================================
// POWER SYSTEM UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the world position of a power connection point on a building
 */
export const getPowerConnectionPointWorldPos = (building: Building, buildingDef: any, powerPoint: PowerConnectionPoint): Point3D => {
  // Reuse the same transformation logic as regular connection points
  const localX = powerPoint.x;
  const localY = powerPoint.y;

  // Apply rotation transformation around the building center
  const centerX = buildingDef.width / 2;
  const centerY = buildingDef.height / 2;

  // Translate to origin (relative to center)
  const relX = localX - centerX;
  const relY = localY - centerY;

  // Apply rotation
  let rotatedX, rotatedY;
  switch (building.rotation) {
    case 90:
      rotatedX = -relY;
      rotatedY = relX;
      break;
    case 180:
      rotatedX = -relX;
      rotatedY = -relY;
      break;
    case 270:
      rotatedX = relY;
      rotatedY = -relX;
      break;
    default: // 0 degrees
      rotatedX = relX;
      rotatedY = relY;
      break;
  }

  // Translate back and add to building position
  const worldX = building.x + centerX + rotatedX;
  const worldY = building.y + centerY + rotatedY;
  
  return {
    x: worldX,
    y: worldY,
    z: building.z
  };
};

/**
 * Get the maximum connection range for a power pole type
 */
export const getPowerPoleRange = (poleType: string): number => {
  switch (poleType) {
    case 'power_pole_mk1':
      return POWER_POLE_MK1_RANGE;
    case 'power_pole_mk2':
      return POWER_POLE_MK2_RANGE;
    case 'power_pole_mk3':
      return POWER_POLE_MK3_RANGE;
    case 'power_tower':
      return POWER_TOWER_RANGE;
    default:
      return POWER_POLE_MK1_RANGE; // fallback
  }
};

/**
 * Get the maximum connections for a power pole type
 * Matches Satisfactory game values:
 * - Mk.1 Power Pole: 4 connections
 * - Mk.2 Power Pole: 7 connections
 * - Mk.3 Power Pole: 10 connections
 * - Power Tower: 7 total (3 to towers + 4 to buildings)
 */
export const getPowerPoleMaxConnections = (poleType: string): number => {
  switch (poleType) {
    case 'power_pole_mk1':
      return POWER_POLE_MK1_MAX_CONNECTIONS; // 4
    case 'power_pole_mk2':
      return POWER_POLE_MK2_MAX_CONNECTIONS; // 7
    case 'power_pole_mk3':
      return POWER_POLE_MK3_MAX_CONNECTIONS; // 10
    case 'power_tower':
      return POWER_TOWER_MAX_TOTAL_CONNECTIONS; // 7 (3 tower + 4 building)
    default:
      return POWER_POLE_MK1_MAX_CONNECTIONS; // Default to Mk.1 (4)
  }
};

/**
 * Validate if two power points can be connected
 */
export const validatePowerConnection = (
  fromPoint: Point3D,
  toPoint: Point3D,
  fromType: string,
  toType: string,
  fromPowerData?: BuildingPowerData,
  toPowerData?: BuildingPowerData
): PowerValidationResult => {
  const distance = distance3D(fromPoint, toPoint);
  const maxRange = Math.max(
    fromType.includes('pole') ? getPowerPoleRange(fromType) : 50,
    toType.includes('pole') ? getPowerPoleRange(toType) : 50
  );

  const result: PowerValidationResult = {
    isValid: true,
    canConnect: true,
    distanceToTarget: distance,
    withinRange: distance <= maxRange,
    capacityValid: true,
    voltageCompatible: true,
    suggestions: []
  };

  // Check distance
  if (distance > maxRange) {
    result.isValid = false;
    result.canConnect = false;
    result.reason = `Distance ${distance.toFixed(1)}m exceeds maximum range ${maxRange}m`;
    result.suggestions?.push('Add intermediate power poles to extend range');
  }

  // Check if distance exceeds segment max length
  if (distance > POWERLINE_MAX_LENGTH) {
    result.isValid = false;
    result.canConnect = false;
    result.reason = `Distance ${distance.toFixed(1)}m exceeds maximum powerline segment length ${POWERLINE_MAX_LENGTH}m`;
    result.suggestions?.push('Break connection into multiple segments with power poles');
  }

  // Check power compatibility (generators can only output, consumers can only input)
  if (fromPowerData && toPowerData) {
    if (fromPowerData.classification === 'generator' && toPowerData.classification === 'generator') {
      result.isValid = false;
      result.canConnect = false;
      result.reason = 'Cannot connect two power generators directly';
      result.suggestions?.push('Connect generators to power grid via power poles');
    }
  }

  return result;
};

/**
 * Find the optimal path for powerline routing between two points
 */
export const calculateOptimalPowerlinePath = (
  start: Point3D,
  end: Point3D,
  obstacles: Point3D[] = [],
  existingPoles: PowerPole[] = []
): Point3D[] => {
  const directDistance = distance3D(start, end);
  
  // If direct connection is possible and within range, use it
  if (directDistance <= POWERLINE_MAX_LENGTH) {
    return [start, end];
  }

  // Otherwise, find intermediate points using existing poles or create new ones
  const path: Point3D[] = [start];
  let currentPos = start;
  const direction = {
    x: (end.x - start.x) / directDistance,
    y: (end.y - start.y) / directDistance,
    z: (end.z - start.z) / directDistance
  };

  while (distance3D(currentPos, end) > POWERLINE_MAX_LENGTH) {
    // Try to use existing pole within range
    const nearbyPole = existingPoles.find(pole => {
      const distToPole = distance3D(currentPos, { x: pole.x, y: pole.y, z: pole.z });
      const poleRange = getPowerPoleRange(pole.type);
      return distToPole <= poleRange && distToPole > 10; // minimum spacing
    });

    if (nearbyPole) {
      currentPos = { x: nearbyPole.x, y: nearbyPole.y, z: nearbyPole.z };
    } else {
      // Create intermediate point
      const stepDistance = POWERLINE_MAX_LENGTH * 0.8; // 80% of max for safety margin
      currentPos = {
        x: currentPos.x + direction.x * stepDistance,
        y: currentPos.y + direction.y * stepDistance,
        z: currentPos.z + direction.z * stepDistance
      };
    }
    
    path.push(currentPos);
  }

  path.push(end);
  return path;
};

/**
 * Calculate power transmission efficiency based on distance and wire type
 */
export const calculatePowerTransmissionEfficiency = (
  distance: number,
  voltage: 'low' | 'medium' | 'high' = 'medium'
): number => {
  // Base efficiency starts at 100%
  let efficiency = 100;
  
  // Power loss increases with distance
  const baseLossPerMeter = voltage === 'high' ? 0.05 : voltage === 'medium' ? 0.1 : 0.2;
  const powerLoss = distance * baseLossPerMeter;
  
  efficiency = Math.max(85, 100 - powerLoss); // Minimum 85% efficiency
  
  return Math.round(efficiency * 100) / 100; // Round to 2 decimal places
};

/**
 * Find nearby power poles within connection range of a point
 */
export const findNearbyPowerPoles = (
  point: Point3D,
  poles: Record<string, PowerPole>,
  maxDistance?: number
): Array<{ pole: PowerPole; distance: number }> => {
  const nearby: Array<{ pole: PowerPole; distance: number }> = [];
  
  Object.values(poles).forEach(pole => {
    const polePos = { x: pole.x, y: pole.y, z: pole.z };
    const distance = distance3D(point, polePos);
    const poleRange = getPowerPoleRange(pole.type);
    const searchRange = maxDistance || poleRange;
    
    if (distance <= searchRange) {
      nearby.push({ pole, distance });
    }
  });
  
  return nearby.sort((a, b) => a.distance - b.distance);
};

/**
 * Find nearby buildings with power connections within range of a point
 */
export const findNearbyPowerBuildings = (
  point: Point3D,
  buildings: Record<string, Building>,
  maxDistance: number = 100
): Array<{ building: Building; distance: number; powerData: BuildingPowerData }> => {
  const nearby: Array<{ building: Building; distance: number; powerData: BuildingPowerData }> = [];
  
  Object.values(buildings).forEach(building => {
    const buildingDef = BUILDING_TYPES[building.type];
    if (buildingDef?.powerData) {
      const buildingPos = { x: building.x, y: building.y, z: building.z };
      const distance = distance3D(point, buildingPos);
      
      if (distance <= maxDistance) {
        nearby.push({
          building,
          distance,
          powerData: buildingDef.powerData
        });
      }
    }
  });
  
  return nearby.sort((a, b) => a.distance - b.distance);
};

/**
 * Check if a power pole has reached its maximum connection capacity
 */
export const isPowerPoleAtCapacity = (pole: PowerPole): boolean => {
  const maxConnections = getPowerPoleMaxConnections(pole.type);
  return pole.connections.length >= maxConnections;
};

/**
 * Calculate the total power generation in a network
 */
export const calculateNetworkPowerGeneration = (
  buildings: Record<string, Building>,
  generatorIds: string[]
): number => {
  let totalGeneration = 0;
  
  generatorIds.forEach(id => {
    const building = buildings[id];
    if (building) {
      const buildingDef = BUILDING_TYPES[building.type];
      if (buildingDef?.powerData?.powerGeneration) {
        totalGeneration += buildingDef.powerData.powerGeneration;
      }
    }
  });
  
  return totalGeneration;
};

/**
 * Calculate the total power consumption in a network
 */
export const calculateNetworkPowerConsumption = (
  buildings: Record<string, Building>,
  consumerIds: string[]
): number => {
  let totalConsumption = 0;
  
  consumerIds.forEach(id => {
    const building = buildings[id];
    if (building) {
      const buildingDef = BUILDING_TYPES[building.type];
      if (buildingDef?.powerData?.powerConsumption) {
        totalConsumption += buildingDef.powerData.powerConsumption;
      }
    }
  });
  
  return totalConsumption;
};

/**
 * Get building power classification
 */
export const getBuildingPowerClassification = (buildingType: string): 'generator' | 'consumer' | 'neutral' | 'pole' | null => {
  const buildingDef = BUILDING_TYPES[buildingType];
  return buildingDef?.powerData?.classification || null;
};

/**
 * Check if a building can generate power
 */
export const isBuildingPowerGenerator = (buildingType: string): boolean => {
  return getBuildingPowerClassification(buildingType) === 'generator';
};

/**
 * Check if a building consumes power
 */
export const isBuildingPowerConsumer = (buildingType: string): boolean => {
  return getBuildingPowerClassification(buildingType) === 'consumer';
};

/**
 * Calculate powerline segment length
 */
export const calculatePowerlineSegmentLength = (segment: PowerlineSegment): number => {
  if (segment.controlPoints && segment.controlPoints.length > 0) {
    // For curved segments, approximate length using control points
    let totalLength = 0;
    const points = [segment.startPoint, ...segment.controlPoints, segment.endPoint];
    
    for (let i = 0; i < points.length - 1; i++) {
      totalLength += distance3D(points[i], points[i + 1]);
    }
    
    return totalLength;
  } else {
    // Straight line distance
    return distance3D(segment.startPoint, segment.endPoint);
  }
};

/**
 * Validate powerline segment length
 */
export const validatePowerlineSegmentLength = (segment: PowerlineSegment): boolean => {
  const length = calculatePowerlineSegmentLength(segment);
  return length <= POWERLINE_MAX_LENGTH;
};

/**
 * Create a power pole at optimal position between two points
 */
export const calculateOptimalPowerPolePosition = (
  start: Point3D,
  end: Point3D,
  poleType: string = 'power_pole_mk2'
): Point3D => {
  const distance = distance3D(start, end);
  const poleRange = getPowerPoleRange(poleType);
  
  if (distance <= poleRange) {
    // If points are within range, place pole at midpoint
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
      z: Math.max(start.z, end.z) // Place at higher elevation
    };
  } else {
    // Place pole at optimal distance from start
    const direction = {
      x: (end.x - start.x) / distance,
      y: (end.y - start.y) / distance,
      z: (end.z - start.z) / distance
    };
    
    const optimalDistance = poleRange * 0.8; // 80% of max range for safety

    return {
      x: start.x + direction.x * optimalDistance,
      y: start.y + direction.y * optimalDistance,
      z: start.z + direction.z * optimalDistance
    };
  }
};

// ============================================================================
// BUILDING HEIGHT BLOCKING UTILITIES
// ============================================================================

/**
 * Building floor span result containing the range of floors a building occupies
 */
export interface BuildingFloorSpan {
  startFloor: number;  // The floor the building is placed on
  endFloor: number;    // The highest floor the building occupies (inclusive)
  floorsOccupied: number; // Total number of floors occupied
  heightInMeters: number; // Building height in meters
}

/**
 * Calculates the range of floors a building occupies based on its depth (height)
 *
 * @param building - The building to check
 * @param buildingDef - The building type definition from BUILDING_TYPES (optional, will look up if not provided)
 * @returns BuildingFloorSpan with floor range information
 *
 * @example
 * // A 100m tall building on Floor 0 would span floors 0-24 (25 floors total)
 * // Each floor is 4 meters (FLOOR_HEIGHT constant)
 * const span = getBuildingFloorSpan(building);
 * // span = { startFloor: 0, endFloor: 24, floorsOccupied: 25, heightInMeters: 100 }
 */
export const getBuildingFloorSpan = (
  building: Building,
  buildingDef?: { depth: number; width: number; height: number }
): BuildingFloorSpan => {
  const def = buildingDef || BUILDING_TYPES[building.type];

  if (!def) {
    // Fallback for unknown building types - assume single floor
    return {
      startFloor: building.floor,
      endFloor: building.floor,
      floorsOccupied: 1,
      heightInMeters: FLOOR_HEIGHT
    };
  }

  const heightInMeters = def.depth; // depth property represents height in meters
  // Calculate how many floors this building spans
  // A building occupies at least 1 floor (the floor it's placed on)
  // Additional floors are calculated by dividing height by floor height
  const floorsOccupied = Math.max(1, Math.ceil(heightInMeters / FLOOR_HEIGHT));

  return {
    startFloor: building.floor,
    endFloor: building.floor + floorsOccupied - 1,
    floorsOccupied,
    heightInMeters
  };
};

/**
 * Result of a building placement blocking check
 */
export interface PlacementBlockingResult {
  isBlocked: boolean;
  blockingBuildings: Array<{
    building: Building;
    floorSpan: BuildingFloorSpan;
    overlapFloors: number[]; // Which floors overlap with the proposed placement
  }>;
  message?: string;
}

/**
 * Checks if a building at a given position would overlap with another building's footprint
 * Uses axis-aligned bounding box (AABB) collision detection
 */
const doBuildingFootprintsOverlap = (
  x1: number, y1: number, width1: number, height1: number,
  x2: number, y2: number, width2: number, height2: number
): boolean => {
  // Check for AABB overlap
  return (
    x1 < x2 + width2 &&
    x1 + width1 > x2 &&
    y1 < y2 + height2 &&
    y1 + height1 > y2
  );
};

/**
 * Checks if a proposed building placement is blocked by buildings on lower floors
 * that are tall enough to extend into the proposed floor level
 *
 * @param proposedX - X coordinate of the proposed building placement
 * @param proposedY - Y coordinate of the proposed building placement
 * @param proposedFloor - Floor level where the building would be placed
 * @param buildingType - Type of building being placed
 * @param allBuildings - Record of all existing buildings
 * @param rotation - Rotation of the proposed building (0, 90, 180, or 270)
 * @returns PlacementBlockingResult with blocking information
 *
 * @example
 * // Check if placing a constructor on floor 5 is blocked
 * const result = isPlacementBlockedByBuildingBelow(10, 20, 5, 'constructor', buildings);
 * if (result.isBlocked) {
 *   console.log('Blocked by:', result.blockingBuildings.map(b => b.building.type));
 * }
 */
export const isPlacementBlockedByBuildingBelow = (
  proposedX: number,
  proposedY: number,
  proposedFloor: number,
  buildingType: string,
  allBuildings: Record<string, Building>,
  rotation: 0 | 90 | 180 | 270 = 0
): PlacementBlockingResult => {
  const proposedBuildingDef = BUILDING_TYPES[buildingType];

  if (!proposedBuildingDef) {
    return { isBlocked: false, blockingBuildings: [] };
  }

  // Get the proposed building's footprint dimensions
  // Account for rotation - swap width/height for 90 and 270 degree rotations
  const isRotated = rotation === 90 || rotation === 270;
  const proposedWidth = isRotated ? proposedBuildingDef.height : proposedBuildingDef.width;
  const proposedHeight = isRotated ? proposedBuildingDef.width : proposedBuildingDef.height;

  const blockingBuildings: PlacementBlockingResult['blockingBuildings'] = [];

  // Only check buildings on floors BELOW the proposed floor
  const buildingsToCheck = Object.values(allBuildings).filter(b => b.floor < proposedFloor);

  for (const existingBuilding of buildingsToCheck) {
    const existingDef = BUILDING_TYPES[existingBuilding.type];
    if (!existingDef) continue;

    // Calculate the floor span of the existing building
    const floorSpan = getBuildingFloorSpan(existingBuilding, existingDef);

    // Check if this building extends to or past the proposed floor
    if (floorSpan.endFloor < proposedFloor) {
      // Building doesn't reach the proposed floor, skip it
      continue;
    }

    // Get existing building's footprint dimensions (account for rotation)
    const existingRotated = existingBuilding.rotation === 90 || existingBuilding.rotation === 270;
    const existingWidth = existingRotated ? existingDef.height : existingDef.width;
    const existingHeight = existingRotated ? existingDef.width : existingDef.height;

    // Check if the footprints overlap in 2D
    if (doBuildingFootprintsOverlap(
      proposedX, proposedY, proposedWidth, proposedHeight,
      existingBuilding.x, existingBuilding.y, existingWidth, existingHeight
    )) {
      // Calculate which floors overlap
      const overlapFloors: number[] = [];
      for (let f = proposedFloor; f <= floorSpan.endFloor; f++) {
        overlapFloors.push(f);
      }

      blockingBuildings.push({
        building: existingBuilding,
        floorSpan,
        overlapFloors
      });
    }
  }

  const isBlocked = blockingBuildings.length > 0;
  let message: string | undefined;

  if (isBlocked) {
    const blockingNames = blockingBuildings
      .map(b => BUILDING_TYPES[b.building.type]?.name || b.building.type)
      .join(', ');
    const lowestBlockingFloor = Math.min(...blockingBuildings.map(b => b.building.floor));
    message = `Blocked by ${blockingNames} from floor ${lowestBlockingFloor}`;
  }

  return {
    isBlocked,
    blockingBuildings,
    message
  };
};

/**
 * Gets all buildings that extend into a specific floor level
 * This is useful for rendering buildings from lower floors that are tall enough
 * to be visible on the current floor
 *
 * @param floor - The floor level to check
 * @param allBuildings - Record of all buildings
 * @returns Array of buildings that occupy the specified floor (either placed there or extending into it)
 */
export const getBuildingsVisibleOnFloor = (
  floor: number,
  allBuildings: Record<string, Building>
): Building[] => {
  return Object.values(allBuildings).filter(building => {
    const floorSpan = getBuildingFloorSpan(building);
    // Building is visible on this floor if the floor is within its span
    return floor >= floorSpan.startFloor && floor <= floorSpan.endFloor;
  });
};

/**
 * Gets buildings from lower floors that extend into the current floor
 * (excluding buildings actually placed on the current floor)
 *
 * @param currentFloor - The current floor level
 * @param allBuildings - Record of all buildings
 * @returns Array of buildings from lower floors that extend into the current floor
 */
export const getTallBuildingsExtendingToFloor = (
  currentFloor: number,
  allBuildings: Record<string, Building>
): Building[] => {
  return Object.values(allBuildings).filter(building => {
    // Only include buildings from LOWER floors
    if (building.floor >= currentFloor) return false;

    const floorSpan = getBuildingFloorSpan(building);
    // Building extends to this floor if the floor is within its span
    return currentFloor <= floorSpan.endFloor;
  });
};
// src/logic/railway/railwaySnapping.ts
import { RailwayNode, RailwaySegment, Point3D, Point } from '../../types';
import { distance3D, distance3DSquared, distance2DSquared } from '../../utils/helpers';
// import { getQuadraticBezierPoints } from '../common/curveUtils'; // Not used currently

// Constants
export const DEFAULT_SNAP_THRESHOLD = 0.5; // 0.5 meters default snap distance
export const NODE_SNAP_PRIORITY = 1.5; // Multiplier for node snap priority over segment snap

// Type definitions for snapping
export interface SnapTarget {
  type: 'node' | 'segment';
  distance: number;
  snapPoint: Point3D;
  targetId: string; // Node ID or Segment ID
  t?: number; // Parameter along segment (0-1) for segment snaps
}

export interface SnapResult {
  shouldSnap: boolean;
  snapTarget?: SnapTarget;
  visualIndicator?: SnapVisualIndicator;
}

export interface SnapVisualIndicator {
  type: 'node' | 'segment';
  position: Point3D;
  radius: number;
  targetId: string;
  isActive: boolean;
}

export interface SegmentSplitResult {
  newSegments: RailwaySegment[];
  newNode: RailwayNode;
  removedSegmentId: string;
}

/**
 * Detects proximity to railway nodes within the snap threshold
 * @param point The point to check for nearby nodes
 * @param nodes All railway nodes
 * @param snapThreshold The distance threshold for snapping
 * @param excludeNodeIds Node IDs to exclude from snapping (e.g., current drawing path)
 * @returns Array of nearby nodes within snap threshold, sorted by distance
 */
export const detectNearbyNodes = (
  point: Point3D,
  nodes: Record<string, RailwayNode>,
  excludeNodeIds: string[] = [],
  snapThreshold: number = DEFAULT_SNAP_THRESHOLD,
): SnapTarget[] => {
  const nearbyNodes: SnapTarget[] = [];

  Object.entries(nodes).forEach(([nodeId, node]) => {
    if (excludeNodeIds.includes(nodeId)) return;
    
    const distSquared = distance3DSquared(point, node);
    const thresholdSquared = snapThreshold * snapThreshold;
    if (distSquared <= thresholdSquared) {
      const distance = Math.sqrt(distSquared); // Only calculate actual distance for sorting
      nearbyNodes.push({
        type: 'node',
        distance,
        snapPoint: { x: node.x, y: node.y, z: node.z },
        targetId: nodeId,
      });
    }
  });

  return nearbyNodes.sort((a, b) => a.distance - b.distance);
};

/**
 * Finds the closest point on a line segment to a given point
 * @param point The point to find the closest point to
 * @param lineStart The start of the line segment
 * @param lineEnd The end of the line segment
 * @returns The closest point on the line segment and the parameter t (0-1)
 */
const closestPointOnLine = (
  point: Point,
  lineStart: Point,
  lineEnd: Point
): { point: Point; t: number } => {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return { point: lineStart, t: 0 };
  }

  const t = Math.max(0, Math.min(1, 
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared
  ));

  return {
    point: {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy,
    },
    t,
  };
};

/**
 * Finds the closest point on a quadratic Bezier curve to a given point
 * Uses sampling to approximate the closest point
 * @param point The point to find the closest point to
 * @param start The start of the curve
 * @param control The control point of the curve
 * @param end The end of the curve
 * @param numSamples Number of samples to use for approximation
 * @returns The closest point on the curve and the approximate parameter t
 */
export const closestPointOnBezier = (
  point: Point,
  start: Point,
  control: Point,
  end: Point,
  numSamples: number = 50
): { point: Point; t: number } => {
  let closestDistSquared = Infinity;
  let closestPoint = start;
  let closestT = 0;

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const u = 1 - t;
    const samplePoint = {
      x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
      y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
    };
    
    const distSquared = distance2DSquared(point, samplePoint);
    if (distSquared < closestDistSquared) {
      closestDistSquared = distSquared;
      closestPoint = samplePoint;
      closestT = t;
    }
  }

  // Refine the result with binary search
  let low = Math.max(0, closestT - 1 / numSamples);
  let high = Math.min(1, closestT + 1 / numSamples);
  
  for (let iter = 0; iter < 5; iter++) {
    const mid1 = low + (high - low) / 3;
    const mid2 = high - (high - low) / 3;
    
    const u1 = 1 - mid1;
    const p1 = {
      x: u1 * u1 * start.x + 2 * u1 * mid1 * control.x + mid1 * mid1 * end.x,
      y: u1 * u1 * start.y + 2 * u1 * mid1 * control.y + mid1 * mid1 * end.y,
    };
    
    const u2 = 1 - mid2;
    const p2 = {
      x: u2 * u2 * start.x + 2 * u2 * mid2 * control.x + mid2 * mid2 * end.x,
      y: u2 * u2 * start.y + 2 * u2 * mid2 * control.y + mid2 * mid2 * end.y,
    };
    
    if (distance2DSquared(point, p1) < distance2DSquared(point, p2)) {
      high = mid2;
    } else {
      low = mid1;
    }
  }
  
  closestT = (low + high) / 2;
  const u = 1 - closestT;
  closestPoint = {
    x: u * u * start.x + 2 * u * closestT * control.x + closestT * closestT * end.x,
    y: u * u * start.y + 2 * u * closestT * control.y + closestT * closestT * end.y,
  };

  return { point: closestPoint, t: closestT };
};

/**
 * Detects proximity to railway segments within the snap threshold
 * @param point The point to check for nearby segments
 * @param segments All railway segments
 * @param nodes All railway nodes (needed to get segment endpoints)
 * @param snapThreshold The distance threshold for snapping
 * @param excludeSegmentIds Segment IDs to exclude from snapping
 * @returns Array of nearby segment snap points within threshold, sorted by distance
 */
export const detectNearbySegments = (
  point: Point3D,
  segments: Record<string, RailwaySegment>,
  nodes: Record<string, RailwayNode>,
  snapThreshold: number = DEFAULT_SNAP_THRESHOLD,
  excludeSegmentIds: string[] = []
): SnapTarget[] => {
  const nearbySegments: SnapTarget[] = [];

  Object.entries(segments).forEach(([segmentId, segment]) => {
    if (excludeSegmentIds.includes(segmentId)) return;

    const startNode = nodes[segment.startNode];
    const endNode = nodes[segment.endNode];
    if (!startNode || !endNode) return;

    let closestResult: { point: Point; t: number };

    if (segment.type === 'curve' && segment.controlPoints && segment.controlPoints.length > 0) {
      // Handle curved segments
      const control = segment.controlPoints[0];
      closestResult = closestPointOnBezier(point, startNode, control, endNode);
    } else {
      // Handle straight segments
      closestResult = closestPointOnLine(point, startNode, endNode);
    }

    const distanceSquared = distance2DSquared(point, closestResult.point);
    const thresholdSquared = snapThreshold * snapThreshold;
    if (distanceSquared <= thresholdSquared) {
      // Don't snap too close to segment endpoints (they should use node snapping instead)
      const minEndpointDistance = snapThreshold * 0.3;
      const minEndpointDistanceSquared = minEndpointDistance * minEndpointDistance;
      const distToStartSquared = distance2DSquared(closestResult.point, startNode);
      const distToEndSquared = distance2DSquared(closestResult.point, endNode);
      
      if (distToStartSquared > minEndpointDistanceSquared && distToEndSquared > minEndpointDistanceSquared) {
        const distance = Math.sqrt(distanceSquared); // Only calculate actual distance when needed for the result
        nearbySegments.push({
          type: 'segment',
          distance,
          snapPoint: {
            x: closestResult.point.x,
            y: closestResult.point.y,
            z: startNode.z + (endNode.z - startNode.z) * closestResult.t, // Interpolate Z
          },
          targetId: segmentId,
          t: closestResult.t,
        });
      }
    }
  });

  return nearbySegments.sort((a, b) => a.distance - b.distance);
};

/**
 * Determines the best snap target from available options
 * Prioritizes node snaps over segment snaps
 * @param point The point to snap from
 * @param nodes All railway nodes
 * @param segments All railway segments
 * @param snapThreshold The distance threshold for snapping
 * @param excludeNodeIds Node IDs to exclude from snapping
 * @param excludeSegmentIds Segment IDs to exclude from snapping
 * @returns The best snap result if any
 */
export const detectSnapTarget = (
  point: Point3D,
  nodes: Record<string, RailwayNode>,
  segments: Record<string, RailwaySegment>,
  snapThreshold: number = DEFAULT_SNAP_THRESHOLD,
  excludeNodeIds: string[] = [],
  excludeSegmentIds: string[] = []
): SnapResult => {
  // Find nearby nodes
  const nearbyNodes = detectNearbyNodes(point, nodes, excludeNodeIds, snapThreshold);
  
  // Find nearby segments
  const nearbySegments = detectNearbySegments(point, segments, nodes, snapThreshold, excludeSegmentIds);

  // If we have nearby nodes, prioritize them
  if (nearbyNodes.length > 0) {
    const bestNode = nearbyNodes[0];
    // Check if the node is significantly closer than any segment
    if (nearbySegments.length === 0 || bestNode.distance * NODE_SNAP_PRIORITY < nearbySegments[0].distance) {
      return {
        shouldSnap: true,
        snapTarget: bestNode,
        visualIndicator: {
          type: 'node',
          position: bestNode.snapPoint,
          radius: snapThreshold * 2,
          targetId: bestNode.targetId,
          isActive: true,
        },
      };
    }
  }

  // Otherwise use the closest segment if available
  if (nearbySegments.length > 0) {
    const bestSegment = nearbySegments[0];
    return {
      shouldSnap: true,
      snapTarget: bestSegment,
      visualIndicator: {
        type: 'segment',
        position: bestSegment.snapPoint,
        radius: snapThreshold * 1.5,
        targetId: bestSegment.targetId,
        isActive: true,
      },
    };
  }

  return { shouldSnap: false };
};

/**
 * Merges two nodes into one, updating all references
 * @param keepNodeId The node ID to keep
 * @param removeNodeId The node ID to remove
 * @param segments All railway segments
 * @returns Updated segments with merged node references
 */
export const mergeNodes = (
  keepNodeId: string,
  removeNodeId: string,
  segments: Record<string, RailwaySegment>
): Record<string, RailwaySegment> => {
  const updatedSegments: Record<string, RailwaySegment> = {};

  Object.entries(segments).forEach(([segmentId, segment]) => {
    const updatedSegment = { ...segment };
    
    if (segment.startNode === removeNodeId) {
      updatedSegment.startNode = keepNodeId;
    }
    if (segment.endNode === removeNodeId) {
      updatedSegment.endNode = keepNodeId;
    }
    
    updatedSegments[segmentId] = updatedSegment;
  });

  return updatedSegments;
};

/**
 * Splits a railway segment at a specific point
 * @param segmentId The ID of the segment to split
 * @param splitPoint The point at which to split the segment
 * @param t The parameter along the segment (0-1) where the split occurs
 * @param segments All railway segments
 * @param nodes All railway nodes
 * @param floor The floor level for the new node
 * @returns The split result with new segments and node
 */
export const splitSegmentAtPoint = (
  segmentId: string,
  splitPoint: Point3D,
  t: number,
  segments: Record<string, RailwaySegment>,
  nodes: Record<string, RailwayNode>,
  floor: number
): SegmentSplitResult | null => {
  const segment = segments[segmentId];
  if (!segment) return null;

  const startNode = nodes[segment.startNode];
  const endNode = nodes[segment.endNode];
  if (!startNode || !endNode) return null;

  // Create the new node at the split point
  const newNode: RailwayNode = {
    id: `rail-node-snap-${Date.now()}`,
    x: splitPoint.x,
    y: splitPoint.y,
    z: splitPoint.z,
    floor,
    isAnchor: false,
    snappedSegment: segmentId,
    snappedT: t,
  };

  // Create the two new segments
  const segment1: RailwaySegment = {
    id: `${segment.id}-split1`,
    type: 'straight', // Will be updated if needed
    startNode: segment.startNode,
    endNode: newNode.id,
    startPoint: segment.startPoint,
    endPoint: splitPoint,
    length: distance3D(segment.startPoint, splitPoint),
    fromStation: segment.fromStation,
    fromRailPoint: segment.fromRailPoint,
  };

  const segment2: RailwaySegment = {
    id: `${segment.id}-split2`,
    type: 'straight', // Will be updated if needed
    startNode: newNode.id,
    endNode: segment.endNode,
    startPoint: splitPoint,
    endPoint: segment.endPoint,
    length: distance3D(splitPoint, segment.endPoint),
    toStation: segment.toStation,
    toRailPoint: segment.toRailPoint,
  };

  // Handle control points for curved segments
  if (segment.type === 'curve' && segment.controlPoints && segment.controlPoints.length > 0) {
    const cp = segment.controlPoints[0];
    
    // Split the Bezier curve at parameter t
    const p1: Point3D = {
      x: startNode.x + t * (cp.x - startNode.x),
      y: startNode.y + t * (cp.y - startNode.y),
      z: startNode.z + t * (cp.z - startNode.z),
    };
    const p2: Point3D = {
      x: cp.x + t * (endNode.x - cp.x),
      y: cp.y + t * (endNode.y - cp.y),
      z: cp.z + t * (endNode.z - cp.z),
    };

    segment1.type = 'curve';
    segment1.controlPoints = [p1];
    segment2.type = 'curve';
    segment2.controlPoints = [p2];
  }

  return {
    newSegments: [segment1, segment2],
    newNode,
    removedSegmentId: segmentId,
  };
};

/**
 * Creates visual feedback data for snap indicators
 * @param snapTarget The current snap target
 * @param isActive Whether the snap is currently active
 * @returns Visual indicator data for rendering
 */
export const createSnapVisualIndicator = (
  snapTarget: SnapTarget | undefined,
  isActive: boolean
): SnapVisualIndicator | undefined => {
  if (!snapTarget) return undefined;

  return {
    type: snapTarget.type,
    position: snapTarget.snapPoint,
    radius: snapTarget.type === 'node' ? DEFAULT_SNAP_THRESHOLD * 2 : DEFAULT_SNAP_THRESHOLD * 1.5,
    targetId: snapTarget.targetId,
    isActive,
  };
};

/**
 * Validates if a snap operation is valid
 * Prevents invalid snaps like creating zero-length segments
 * @param snapTarget The target to snap to
 * @param currentPath The current drawing path (node IDs)
 * @param nodes All railway nodes
 * @returns Whether the snap is valid
 */
export const isValidSnap = (
  snapTarget: SnapTarget,
  currentPath: string[],
  _nodes: Record<string, RailwayNode>
): boolean => {
  if (snapTarget.type === 'node') {
    // Don't snap to nodes already in the current path
    if (currentPath.includes(snapTarget.targetId)) {
      return false;
    }

    // Don't snap to the immediate previous node (would create zero-length segment)
    if (currentPath.length > 0 && currentPath[currentPath.length - 1] === snapTarget.targetId) {
      return false;
    }

    return true;
  }

  // Segment snaps are generally valid unless we add more constraints
  return true;
};

/**
 * Gets the effective snap threshold based on context
 * Can be adjusted based on zoom level, drawing mode, etc.
 * @param baseThreshold The base snap threshold
 * @param zoomLevel The current zoom level (optional)
 * @param drawingMode The current drawing mode (optional)
 * @returns The adjusted snap threshold
 */
export const getEffectiveSnapThreshold = (
  baseThreshold: number = DEFAULT_SNAP_THRESHOLD,
  zoomLevel?: number,
  drawingMode?: string
): number => {
  let threshold = baseThreshold;

  // Adjust for zoom level if provided
  if (zoomLevel !== undefined) {
    // Increase threshold when zoomed out for easier snapping
    if (zoomLevel < 1) {
      threshold = baseThreshold / Math.sqrt(zoomLevel);
    }
  }

  // Adjust for drawing mode if needed
  if (drawingMode === 'precision') {
    threshold *= 0.5; // Smaller threshold for precision mode
  }

  return Math.min(threshold, baseThreshold * 3); // Cap at 3x base threshold
};
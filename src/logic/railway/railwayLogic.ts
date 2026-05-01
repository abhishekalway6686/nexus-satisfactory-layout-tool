// src/logic/railway/railwayLogic.ts
import { 
  RailwayNode, 
  RailwaySegment, 
  Railway, 
  Point3D, 
  Building, 
  JunctionNode, 
  IntersectionType, 
  RailwayIntersectionPoint, 
  IntersectionAnalysisResult 
} from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { distance3D, getRailwayConnectionPointWorldPos } from '../../utils/helpers';
import { 
  getPolyLine, 
  findIntersections, 
  isRightTrianglePattern, 
  classifyIntersection,
  detectAdvancedIntersections,
  findMultiWayIntersections,
  analyzeGradeSeparation 
} from '../common/intersectionLogic';
import { splitBezierAtT, findCurveToCurveIntersections } from '../common/curveUtils';
import { applyRailwayCurves, retroactivelyApplyCurve } from './railwayCurves';
import { BUILDING_TYPES, RAILWAY_MAX_LENGTH } from '../../constants';
import { findExistingNodeAtPosition } from './railwayNodeConsolidation';

export interface RailwayDrawingState {
  drawingRailway: boolean;
  currentRailwayId?: string;
  railwayPath?: string[];
  railwayStartNode?: string;
  railwayStartStation?: string;
  railwayStartRailPoint?: string;
}

export interface StartRailwayDrawingResult {
  drawingState: Partial<RailwayDrawingState>;
  startNode?: RailwayNode;
}

export interface AddRailwayPointResult {
  nodes: Record<string, RailwayNode>;
  segments: Record<string, RailwaySegment>;
  railways: Record<string, Railway>;
  drawingState: Partial<RailwayDrawingState>;
  path: string[];
}

export interface FinishRailwayDrawingResult {
  nodes: Record<string, RailwayNode>;
  segments: Record<string, RailwaySegment>;
  railways: Record<string, Railway>;
  drawingState: Partial<RailwayDrawingState>;
}

/**
 * Creates a new railway node at a given point
 */
export const createNodeAtPoint = (point: Point3D, floor: number): RailwayNode => ({
  id: uuidv4(),
  x: point.x,
  y: point.y,
  z: point.z,
  floor,
  isAnchor: false,
});

/**
 * Starts railway drawing from a building connection or free point
 */
export const startRailwayDrawing = (
  buildings: Record<string, Building>,
  buildingId?: string,
  railPointId?: string
): StartRailwayDrawingResult => {
  let startNode: RailwayNode | null = null;
  let startStation: string | undefined;
  let startRailPoint: string | undefined;

  if (buildingId && railPointId) {
    const building = buildings[buildingId];
    const buildingDef = BUILDING_TYPES[building.type];
    const railPoint = buildingDef.railwayPoints?.find((rp) => rp.id === railPointId);
    
    if (building && buildingDef && railPoint) {
      const worldPos = getRailwayConnectionPointWorldPos(building, buildingDef, railPoint);
      const anchorNodeId = `rail-anchor-${buildingId}-${railPointId}`;
      startNode = {
        id: anchorNodeId,
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
        floor: building.floor,
        isAnchor: true,
      };
      startStation = buildingId;
      startRailPoint = railPointId;
    }
  }

  const drawingState: Partial<RailwayDrawingState> = {
    drawingRailway: true,
    currentRailwayId: `railway-${Date.now()}`,
    railwayPath: startNode ? [startNode.id] : [],
    railwayStartNode: startNode?.id,
    railwayStartStation: startStation,
    railwayStartRailPoint: startRailPoint,
  };

  return {
    drawingState,
    startNode: startNode || undefined,
  };
};

/**
 * Adds a point to the current railway being drawn (PREVIEW ONLY - no segments created)
 * This function only manages nodes and path during the drawing phase.
 * Segments are created later in finishRailwayDrawing to prevent phantom segment issues.
 */
export const addRailwayPointPreviewOnly = (
  point: Point3D,
  currentFloor: number,
  drawingState: RailwayDrawingState,
  existingNodes: Record<string, RailwayNode>
): { nodes: Record<string, RailwayNode>; path: string[] } | null => {
  if (!drawingState.drawingRailway || !drawingState.currentRailwayId) {
    return null;
  }

  const newNode = createNodeAtPoint(point, currentFloor);
  const nodes = { ...existingNodes, [newNode.id]: newNode };
  const path: string[] = [...(drawingState.railwayPath ?? []), newNode.id];

  return {
    nodes,
    path,
  };
};

/**
 * Adds a point to the current railway being drawn (LEGACY - creates segments during drawing)
 * WARNING: This function creates phantom segments during drawing and should be avoided.
 * Use addRailwayPointPreviewOnly instead for the drawing phase.
 */
export const addRailwayPoint = (
  point: Point3D,
  currentFloor: number,
  drawingState: RailwayDrawingState,
  existingNodes: Record<string, RailwayNode>,
  existingSegments: Record<string, RailwaySegment>,
  existingRailways: Record<string, Railway>
): AddRailwayPointResult | null => {
  if (!drawingState.drawingRailway || !drawingState.currentRailwayId) {
    return null;
  }

  const newNode = createNodeAtPoint(point, currentFloor);
  const nodes = { ...existingNodes, [newNode.id]: newNode };
  let path: string[] = [...(drawingState.railwayPath ?? []), newNode.id];
  const segments = { ...existingSegments };
  const railways = { ...existingRailways };
  
  // Map to store positions of deleted nodes for curve control points
  // Using WeakRef for automatic cleanup and size limit for memory safety
  const deletedNodePositions = new Map<string, Point3D>();
  const MAX_DELETED_NODES = 100; // Prevent memory leak with reasonable limit

  // Check for right triangle pattern and optimize if found
  if (path.length >= 3) {
    const nodeA = nodes[path[path.length - 3]]; // A (first point)
    const nodeB = nodes[path[path.length - 2]]; // B (middle point - potential deletion candidate)
    const nodeC = nodes[path[path.length - 1]]; // C (current point)

    // Check if B can be deleted (not an anchor node and forms right triangle)
    if (!nodeB.isAnchor && isRightTrianglePattern(nodeA, nodeB, nodeC)) {
      // Implement LRU eviction if map is too large
      if (deletedNodePositions.size >= MAX_DELETED_NODES) {
        const firstKey = deletedNodePositions.keys().next().value;
        deletedNodePositions.delete(firstKey);
      }
      
      // Store the position of node B before deleting it
      deletedNodePositions.set(`${nodeA.id}-${nodeC.id}`, {
        x: nodeB.x,
        y: nodeB.y,
        z: nodeB.z
      });
      
      // Delete node B from the path and nodes
      path = [...path.slice(0, -2), nodeC.id]; // Remove B, keep A and C
      delete nodes[nodeB.id]; // Remove B from nodes
      
      // Remove any segments that reference the deleted node B
      const segmentsToDelete: string[] = [];
      Object.entries(segments).forEach(([segId, segment]) => {
        if (segment.startNode === nodeB.id || segment.endNode === nodeB.id) {
          segmentsToDelete.push(segId);
        }
      });
      
      // Clean up segments and railway references
      segmentsToDelete.forEach(segId => {
        delete segments[segId];
        
        // Update railways to remove reference to deleted segment
        Object.values(railways).forEach(railway => {
          if (railway.segments.includes(segId)) {
            railway.segments = railway.segments.filter(id => id !== segId);
          }
        });
      });

    }
  }

  // Create segments from the path
  if (path.length >= 2) {
    const prevNodeId = path[path.length - 2];
    const prevNode = nodes[prevNodeId];
    const currentNode = nodes[path[path.length - 1]];

    if (prevNode && currentNode) {
      const segmentLength = distance3D(prevNode, currentNode);
      
      if (segmentLength > RAILWAY_MAX_LENGTH) {
        console.warn('[addRailwayPoint] Segment too long:', segmentLength);
        return null;
      }

      let segmentType: 'straight' | 'curve' = 'straight';
      let controlPoints: Point3D[] | undefined;
      
      // First check if this segment had an intermediate node that was deleted
      const deletedNodeKey = `${prevNodeId}-${newNode.id}`;
      if (deletedNodePositions.has(deletedNodeKey)) {
        // Use the deleted node's position as the control point
        segmentType = 'curve';
        controlPoints = [deletedNodePositions.get(deletedNodeKey)!];
      }
      // Otherwise check if we need to apply a curve to the new segment
      else if (path.length >= 3) {
        const prevPrevNodeId = path[path.length - 3];
        const prevPrevNode = nodes[prevPrevNodeId];
        
        // Apply curve logic using the centralized curve system
        const tempSegment: RailwaySegment = {
          id: `temp-segment`,
          type: 'straight',
          startNode: prevNodeId,
          endNode: newNode.id,
          startPoint: { x: prevNode.x, y: prevNode.y, z: prevNode.z },
          endPoint: { x: currentNode.x, y: currentNode.y, z: currentNode.z },
          length: segmentLength,
        };

        const curvedSegment = retroactivelyApplyCurve(tempSegment, prevPrevNode, prevNode, currentNode);
        if (curvedSegment) {
          segmentType = curvedSegment.type as 'straight' | 'curve';
          controlPoints = curvedSegment.controlPoints;
        }
      }

      const newSegment: RailwaySegment = {
        id: `rail-segment-${Date.now()}`,
        type: segmentType,
        startNode: prevNodeId,
        endNode: newNode.id,
        startPoint: { x: prevNode.x, y: prevNode.y, z: prevNode.z },
        endPoint: { x: currentNode.x, y: currentNode.y, z: currentNode.z },
        controlPoints,
        length: segmentLength,
        fromStation: prevNode.isAnchor ? drawingState.railwayStartStation : undefined,
        fromRailPoint: prevNode.isAnchor ? drawingState.railwayStartRailPoint : undefined,
        direction: 'forward', // Default direction
        showArrows: true, // Show arrows by default
      };

      segments[newSegment.id] = newSegment;

      // Update the railway with the new segment
      const railway = railways[drawingState.currentRailwayId];
      if (railway) {
        railway.segments.push(newSegment.id);
      } else {
        railways[drawingState.currentRailwayId] = {
          id: drawingState.currentRailwayId,
          segments: [newSegment.id],
          stations: drawingState.railwayStartStation ? [drawingState.railwayStartStation] : [],
          floor: currentFloor,
        };
      }

      // Check if we need to retroactively apply a curve to the previous segment
      if (path.length >= 3) {
        const nodeAId = path[path.length - 3];
        const nodeBId = path[path.length - 2];
        const nodeCId = path[path.length - 1];
        
        const nodeA = nodes[nodeAId];
        const nodeB = nodes[nodeBId];
        const nodeC = nodes[nodeCId];
        
        if (nodeA && nodeB && nodeC) {
          // Find the segment from A to B
          const previousSegment = Object.values(segments).find(
            seg => seg.startNode === nodeAId && seg.endNode === nodeBId
          );
          
          if (previousSegment) {
            const updatedPrevSegment = retroactivelyApplyCurve(previousSegment, nodeA, nodeB, nodeC);
            if (updatedPrevSegment) {
              segments[previousSegment.id] = updatedPrevSegment;
            }
          }
        }
      }
    }
  }

  return {
    nodes,
    segments,
    railways,
    drawingState: {
      railwayPath: path,
    },
    path,
  };
};

/**
 * Finishes railway drawing and handles connections
 */
export const finishRailwayDrawing = async (
  drawingState: RailwayDrawingState,
  existingNodes: Record<string, RailwayNode>,
  existingSegments: Record<string, RailwaySegment>,
  existingRailways: Record<string, Railway>,
  buildings: Record<string, Building>,
  currentFloor: number,
  buildingId?: string,
  railPointId?: string,
  nodeId?: string
): Promise<FinishRailwayDrawingResult | null> => {
  const pathLength = (drawingState.railwayPath ?? []).length;
  const hasEndPoint = !!(buildingId && railPointId) || !!nodeId;

  // Early return if not in drawing mode or no current railway
  if (!drawingState.drawingRailway || !drawingState.currentRailwayId || pathLength < 1) {
    return null;
  }

  // If path only has 1 node (just the starting point) and no end point is specified,
  // we can't create any segments - return null to signal cancellation needed
  if (pathLength === 1 && !hasEndPoint) {
    // Path has only starting node with no end point - cannot create railway
    return null;
  }

  let endNode: RailwayNode | null = null;
  let shouldAddEndNode = false;
  const nodes = { ...existingNodes };
  const segments = { ...existingSegments };
  const railways = { ...existingRailways };

  // Handle end node creation
  if (buildingId && railPointId) {
    const building = buildings[buildingId];
    const buildingDef = BUILDING_TYPES[building.type];
    const railPoint = buildingDef.railwayPoints?.find((rp) => rp.id === railPointId);
    
    if (building && buildingDef && railPoint) {
      const worldPos = getRailwayConnectionPointWorldPos(building, buildingDef, railPoint);
      const anchorNodeId = `rail-anchor-${buildingId}-${railPointId}`;
      endNode = {
        id: anchorNodeId,
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
        floor: building.floor,
        isAnchor: true,
      };
      
      if (!nodes[anchorNodeId]) {
        nodes[anchorNodeId] = endNode;
        shouldAddEndNode = true;
      }
    }
  } else if (nodeId && nodes[nodeId]) {
    endNode = nodes[nodeId];
  }

  // Build the final path
  let finalPath = [...(drawingState.railwayPath ?? [])];
  if (endNode && shouldAddEndNode) {
    finalPath.push(endNode.id);
  }

  // Apply right triangle optimization to the final path
  const optimizedPath: string[] = [];
  const nodesToDelete: Set<string> = new Set();
  const deletedNodePositions = new Map<string, Point3D>();
  const MAX_FINISH_DELETED_NODES = 50; // Smaller limit for finish operation
  
  for (let i = 0; i < finalPath.length; i++) {
    const nodeId = finalPath[i];
    
    // Skip nodes marked for deletion
    if (nodesToDelete.has(nodeId)) {
      continue;
    }
    
    optimizedPath.push(nodeId);
    
    // Check for right triangle pattern with next two nodes
    if (i + 2 < finalPath.length) {
      const nodeA = nodes[finalPath[i]];
      const nodeB = nodes[finalPath[i + 1]];
      const nodeC = nodes[finalPath[i + 2]];
      
      // If B forms a right triangle and isn't an anchor, mark it for deletion
      if (nodeA && nodeB && nodeC && !nodeB.isAnchor && isRightTrianglePattern(nodeA, nodeB, nodeC)) {
        nodesToDelete.add(nodeB.id);
        
        // Implement LRU eviction for finish operation
        if (deletedNodePositions.size >= MAX_FINISH_DELETED_NODES) {
          const firstKey = deletedNodePositions.keys().next().value;
          deletedNodePositions.delete(firstKey);
        }
        
        // Store the position of the deleted node for curve control points
        deletedNodePositions.set(`${nodeA.id}-${nodeC.id}`, {
          x: nodeB.x,
          y: nodeB.y,
          z: nodeB.z
        });
      }
    }
  }
  
  // Clean up deleted nodes from the nodes object
  nodesToDelete.forEach(nodeId => {
    delete nodes[nodeId];
  });
  
  // Use the optimized path
  finalPath = optimizedPath;

  // Create segments from the path
  const newSegments: RailwaySegment[] = [];
  const newSegmentIds: string[] = [];

  for (let i = 1; i < finalPath.length; i++) {
    const startNodeId = finalPath[i - 1];
    const endNodeId = finalPath[i];
    const startNode = nodes[startNodeId];
    const endNode = nodes[endNodeId];

    if (!startNode || !endNode) continue;

    const segmentLength = distance3D(startNode, endNode);
    if (segmentLength > RAILWAY_MAX_LENGTH) {
      console.warn('[finishRailwayDrawing] Segment too long:', segmentLength);
      continue;
    }

    // Check if this segment had an intermediate node that was deleted
    const deletedNodeKey = `${startNodeId}-${endNodeId}`;
    const hasDeletedNode = deletedNodePositions.has(deletedNodeKey);
    
    const segment: RailwaySegment & { segmentIndex?: number } = {
      id: `rail-segment-${Date.now()}-${i}`,
      type: hasDeletedNode ? 'curve' : 'straight',
      startNode: startNodeId,
      endNode: endNodeId,
      startPoint: { x: startNode.x, y: startNode.y, z: startNode.z },
      endPoint: { x: endNode.x, y: endNode.y, z: endNode.z },
      controlPoints: hasDeletedNode ? [deletedNodePositions.get(deletedNodeKey)!] : undefined,
      length: segmentLength,
      segmentIndex: i - 1,
      direction: 'forward', // Default direction
      showArrows: true, // Show arrows by default
    };
    

    // Set station info if starting from an anchor
    if (i === 1 && startNode.isAnchor) {
      segment.fromStation = drawingState.railwayStartStation;
      segment.fromRailPoint = drawingState.railwayStartRailPoint;
    }

    newSegments.push(segment);
    newSegmentIds.push(segment.id);
  }

  // IMPORTANT: Apply curves BEFORE intersection processing
  // This ensures curves are applied to the original segments before they get split/modified
  const { segments: curvedSegments } = await applyRailwayCurves(newSegments, nodes, finalPath);
  
  // Update the segments with curve data
  for (let i = 0; i < newSegments.length; i++) {
    const segmentId = newSegments[i].id;
    if (curvedSegments[segmentId]) {
      newSegments[i] = curvedSegments[segmentId];
    }
  }

  // Process each segment for intersections first (with straight segments)
  const merged = false;
  for (const segment of newSegments) {
    // Check for intersections with existing segments
    const newPoly = getPolyLine(segment, nodes);

    for (const [segId, existingSegment] of Object.entries(existingSegments)) {
      if (segId === segment.id) continue;
      
      const existingPoly = getPolyLine(existingSegment, nodes);
      const intersections = await findIntersections(newPoly, existingPoly);
      
      // MULTIPLE INTERSECTION SUPPORT: Process ALL intersections, not just the first
      if (intersections.length > 0) {
        
        // Sort intersections by t1 parameter to process them in order along the segment
        const sortedIntersections = intersections.sort((a, b) => a.t1 - b.t1);
        
        for (let intersectionIndex = 0; intersectionIndex < sortedIntersections.length; intersectionIndex++) {
          const { point, t1, t2 } = sortedIntersections[intersectionIndex];

          // CRITICAL FIX: Skip endpoint intersections (shared nodes between segments)
          // These occur when t1 or t2 is very close to 0 or 1, meaning the intersection
          // is at an endpoint of one of the segments, not a mid-segment crossing.
          // Without this filter, connecting from an existing node triggers false intersections.
          const ENDPOINT_THRESHOLD = 0.02; // 2% tolerance for endpoint detection
          const isEndpoint1 = t1 < ENDPOINT_THRESHOLD || t1 > (1 - ENDPOINT_THRESHOLD);
          const isEndpoint2 = t2 < ENDPOINT_THRESHOLD || t2 > (1 - ENDPOINT_THRESHOLD);

          if (isEndpoint1 || isEndpoint2) {
            continue; // Skip endpoint intersections
          }

          const intersectionPoint: Point3D = { x: point.x, y: point.y, z: segment.startPoint.z };

          // Check if there's already a node at or near this intersection point
          let intersectionNode = findExistingNodeAtPosition(intersectionPoint, nodes);
          let intersectionNodeId: string;
          
          if (intersectionNode) {
            // Use existing node
            intersectionNodeId = Object.entries(nodes).find(([_, node]) => node === intersectionNode)![0];
          } else {
            // Create new intersection node with unique timestamp
            intersectionNodeId = `rail-node-intersection-${Date.now()}-${intersectionIndex}`;
            intersectionNode = {
              id: intersectionNodeId,
              x: intersectionPoint.x,
              y: intersectionPoint.y,
              z: intersectionPoint.z,
              floor: currentFloor,
              isAnchor: false,
            };
            nodes[intersectionNodeId] = intersectionNode;
          }
          
          // This intersection processing will be handled in the batch processing below
        }
      }
    }
  }
  
  // MULTIPLE INTERSECTION SEGMENT SPLITTING: Process all intersections for each segment
  const segmentIntersections = new Map<string, Array<{
    nodeId: string;
    point: Point3D;
    t1: number;
    t2: number;
    existingSegmentId: string;
  }>>();
  
  // Collect all intersections for batch processing
  for (const segment of newSegments) {
    for (const [segId, existingSegment] of Object.entries(existingSegments)) {
      if (segId === segment.id) continue;
      
      const newPoly = getPolyLine(segment, nodes);
      const existingPoly = getPolyLine(existingSegment, nodes);
      const intersections = await findIntersections(newPoly, existingPoly);
      
      if (intersections.length > 0) {
        const sortedIntersections = intersections.sort((a, b) => a.t1 - b.t1);
        
        for (let intersectionIndex = 0; intersectionIndex < sortedIntersections.length; intersectionIndex++) {
          const { point, t1, t2 } = sortedIntersections[intersectionIndex];

          // CRITICAL FIX: Skip endpoint intersections (same check as above)
          const ENDPOINT_THRESHOLD = 0.02;
          const isEndpoint1 = t1 < ENDPOINT_THRESHOLD || t1 > (1 - ENDPOINT_THRESHOLD);
          const isEndpoint2 = t2 < ENDPOINT_THRESHOLD || t2 > (1 - ENDPOINT_THRESHOLD);

          if (isEndpoint1 || isEndpoint2) {
            continue; // Skip endpoint intersections - these are shared nodes, not crossings
          }

          const intersectionPoint: Point3D = { x: point.x, y: point.y, z: segment.startPoint.z };

          // Find or create intersection node (code moved above)
          let intersectionNode = findExistingNodeAtPosition(intersectionPoint, nodes);
          let intersectionNodeId: string;
          
          if (intersectionNode) {
            intersectionNodeId = Object.entries(nodes).find(([_, node]) => node === intersectionNode)![0];
          } else {
            intersectionNodeId = `rail-node-intersection-${Date.now()}-${intersectionIndex}`;
            intersectionNode = {
              id: intersectionNodeId,
              x: intersectionPoint.x,
              y: intersectionPoint.y,
              z: intersectionPoint.z,
              floor: currentFloor,
              isAnchor: false,
            };
            nodes[intersectionNodeId] = intersectionNode;
          }
          
          // Store intersection for batch processing
          if (!segmentIntersections.has(segment.id)) {
            segmentIntersections.set(segment.id, []);
          }
          segmentIntersections.get(segment.id)!.push({
            nodeId: intersectionNodeId,
            point: intersectionPoint,
            t1,
            t2,
            existingSegmentId: segId
          });
        }
      }
    }
  }
  

  // Also track existing segments that need to be split at intersection points
  const existingSegmentIntersections = new Map<string, Array<{
    nodeId: string;
    point: Point3D;
    t: number; // t2 parameter along the existing segment
  }>>();

  // Track segment IDs that have been split and should NOT be re-added
  const splitSegmentIds = new Set<string>();

  // Collect intersections for existing segments
  for (const [_segmentId, intersections] of segmentIntersections) {
    for (const intersection of intersections) {
      if (!existingSegmentIntersections.has(intersection.existingSegmentId)) {
        existingSegmentIntersections.set(intersection.existingSegmentId, []);
      }
      existingSegmentIntersections.get(intersection.existingSegmentId)!.push({
        nodeId: intersection.nodeId,
        point: intersection.point,
        t: intersection.t2, // t2 is the parameter along the existing segment
      });
    }
  }

  // Split existing segments at intersection points
  for (const [existingSegId, intersections] of existingSegmentIntersections) {
    const existingSegment = segments[existingSegId];
    if (!existingSegment || intersections.length === 0) continue;


    // Sort intersections by t to split segment in order
    const sortedIntersections = intersections.sort((a, b) => a.t - b.t);

    // Create multiple segments between intersection points
    let currentStartNode = existingSegment.startNode;
    let currentStartPoint = existingSegment.startPoint;
    let segmentCounter = 1;

    for (const intersection of sortedIntersections) {
      const splitSegment: RailwaySegment = {
        id: `${existingSegment.id}-exist-split${segmentCounter}`,
        type: 'straight',
        startNode: currentStartNode,
        endNode: intersection.nodeId,
        startPoint: currentStartPoint,
        endPoint: intersection.point,
        length: distance3D(currentStartPoint, intersection.point),
        fromStation: segmentCounter === 1 ? existingSegment.fromStation : undefined,
        fromRailPoint: segmentCounter === 1 ? existingSegment.fromRailPoint : undefined,
        direction: existingSegment.direction,
        showArrows: existingSegment.showArrows,
      };

      segments[splitSegment.id] = splitSegment;
      currentStartNode = intersection.nodeId;
      currentStartPoint = intersection.point;
      segmentCounter++;
    }

    // Create final segment from last intersection to end
    const finalSplitSegment: RailwaySegment = {
      id: `${existingSegment.id}-exist-split${segmentCounter}`,
      type: 'straight',
      startNode: currentStartNode,
      endNode: existingSegment.endNode,
      startPoint: currentStartPoint,
      endPoint: existingSegment.endPoint,
      length: distance3D(currentStartPoint, existingSegment.endPoint),
      toStation: existingSegment.toStation,
      toRailPoint: existingSegment.toRailPoint,
      direction: existingSegment.direction,
      showArrows: existingSegment.showArrows,
    };

    segments[finalSplitSegment.id] = finalSplitSegment;

    // Update railways that contain this existing segment
    for (const railway of Object.values(railways)) {
      const segIndex = railway.segments.indexOf(existingSegId);
      if (segIndex !== -1) {
        // Replace the original segment ID with the new split segment IDs
        const newSegmentIds: string[] = [];
        for (let i = 1; i <= segmentCounter; i++) {
          newSegmentIds.push(`${existingSegment.id}-exist-split${i}`);
        }
        railway.segments.splice(segIndex, 1, ...newSegmentIds);
      }
    }

    // Remove the original existing segment and track it
    delete segments[existingSegId];
    splitSegmentIds.add(existingSegId);
  }

  // Process NEW segments with multiple intersections
  for (const [segmentId, intersections] of segmentIntersections) {
    const segment = segments[segmentId] || newSegments.find(s => s.id === segmentId);
    if (!segment || intersections.length === 0) continue;

    
    // Sort intersections by t1 to split segment in order
    const sortedIntersections = intersections.sort((a, b) => a.t1 - b.t1);
    
    // Create multiple segments between intersection points
    let currentStartNode = segment.startNode;
    let currentStartPoint = segment.startPoint;
    let segmentCounter = 1;
    
    for (const intersection of sortedIntersections) {
      // Create segment from current start to intersection
      const newSegment: RailwaySegment = {
        id: `${segment.id}-${segmentCounter}`,
        type: segmentCounter === 1 ? segment.type : 'straight', // Keep original type only for first segment
        startNode: currentStartNode,
        endNode: intersection.nodeId,
        startPoint: currentStartPoint,
        endPoint: intersection.point,
        length: distance3D(currentStartPoint, intersection.point),
        direction: segment.direction, // Preserve direction
        showArrows: segment.showArrows, // Preserve arrow settings
      };
      
      // Handle control points for curved segments - preserve curves when splitting
      if (segmentCounter === 1 && segment.type === 'curve' && segment.controlPoints) {
        // For the first intersection, use the original control points
        // Note: We could enhance this to recalculate control points for split curves,
        // but for now preserving the original curve is sufficient
        newSegment.controlPoints = segment.controlPoints;
      }
      
      segments[newSegment.id] = newSegment;
      
      // Update for next iteration
      currentStartNode = intersection.nodeId;
      currentStartPoint = intersection.point;
      segmentCounter++;
    }
    
    // Create final segment from last intersection to end
    const finalSegment: RailwaySegment = {
      id: `${segment.id}-${segmentCounter}`,
      type: 'straight', // Final segments after intersections are typically straight
      startNode: currentStartNode,
      endNode: segment.endNode,
      startPoint: currentStartPoint,
      endPoint: segment.endPoint,
      length: distance3D(currentStartPoint, segment.endPoint),
      direction: segment.direction, // Preserve direction
      showArrows: segment.showArrows, // Preserve arrow settings
    };
    
    segments[finalSegment.id] = finalSegment;
    
    // Remove the original segment since it's been split and track it
    delete segments[segment.id];
    splitSegmentIds.add(segment.id);

  }

  // Add any segments that weren't processed by intersection splitting
  // These segments retain their curve data from the pre-intersection curve application
  // IMPORTANT: Don't re-add segments that were split at intersections
  for (const segment of newSegments) {
    if (!segments[segment.id] && !splitSegmentIds.has(segment.id)) {
      segments[segment.id] = segment;
      if (segment.type === 'curve' && segment.controlPoints) {
      }
    }
  }

  // Note: Curve application has been moved to happen BEFORE intersection processing
  // to prevent curves from being applied to the wrong segments after splitting.
  // The curves are now preserved during intersection splitting above.

  // Create or update the railway using the final segment IDs (after intersection processing)
  // Get all segment IDs that were created for this railway (including split segments)
  const finalSegmentIds = Object.keys(segments).filter(segId => {
    const seg = segments[segId];
    // Check if this segment was part of the newly drawn railway
    return newSegmentIds.includes(segId) || 
           newSegmentIds.some(originalId => segId.startsWith(originalId + '-'));
  });
  
  if (finalSegmentIds.length > 0) {
    const railway: Railway = {
      id: drawingState.currentRailwayId!,
      segments: finalSegmentIds,
      stations: drawingState.railwayStartStation ? [drawingState.railwayStartStation] : [],
      floor: currentFloor,
    };
    railways[railway.id] = railway;
  }

  return {
    nodes,
    segments,
    railways,
    drawingState: {
      drawingRailway: false,
      currentRailwayId: undefined,
      railwayPath: undefined,
      railwayStartNode: undefined,
      railwayStartStation: undefined,
      railwayStartRailPoint: undefined,
    },
  };
};

// ============================================================================
// ADVANCED JUNCTION MANAGEMENT SYSTEM - Phase 4 Implementation
// ============================================================================

/**
 * Creates a junction node for multi-way intersections
 */
export const createJunctionNode = (
  intersectionPoint: Point3D,
  connectedSegments: string[],
  intersectionType: IntersectionType,
  floor: number
): JunctionNode => {
  const capacity = Math.max(4, connectedSegments.length + 1); // Allow for future connections
  
  let priority: 'first_come' | 'main_line' | 'signal_controlled';
  let visualRadius: number;

  switch (intersectionType) {
    case IntersectionType.T_JUNCTION:
      priority = 'main_line';
      visualRadius = 1.5;
      break;
    case IntersectionType.CROSSOVER:
      priority = 'signal_controlled';
      visualRadius = 2.0;
      break;
    case IntersectionType.STAR_HUB:
      priority = 'signal_controlled';
      visualRadius = 3.0;
      break;
    default:
      priority = 'first_come';
      visualRadius = 1.0;
  }

  return {
    id: uuidv4(),
    x: intersectionPoint.x,
    y: intersectionPoint.y,
    z: intersectionPoint.z,
    floor,
    isAnchor: false,
    junctionType: intersectionType,
    connectedSegments: [...connectedSegments],
    activeConnections: [...connectedSegments], // Initially all connections are active
    capacity,
    priority,
    visualRadius
  };
};

/**
 * Processes multiple intersections and creates appropriate junction nodes
 */
export const processAdvancedIntersections = async (
  newSegment: RailwaySegment,
  existingSegments: Record<string, RailwaySegment>,
  existingNodes: Record<string, RailwayNode>,
  currentFloor: number
): Promise<{
  intersectionPoints: RailwayIntersectionPoint[];
  junctionNodes: Record<string, JunctionNode>;
  updatedSegments: Record<string, RailwaySegment>;
  splitSegments: string[]; // IDs of segments that were split
}> => {
  const intersectionPoints: RailwayIntersectionPoint[] = [];
  const junctionNodes: Record<string, JunctionNode> = {};
  const updatedSegments = { ...existingSegments };
  const splitSegments: string[] = [];
  const segmentsOnCurrentFloor = Object.values(existingSegments).filter(
    seg => {
      const startNode = existingNodes[seg.startNode];
      return startNode && startNode.floor === currentFloor;
    }
  );

  // Find intersections with existing segments on the same floor
  for (const existingSegment of segmentsOnCurrentFloor) {
    if (existingSegment.id === newSegment.id) continue;

    // Use advanced intersection detection
    const intersections = await detectAdvancedIntersections(newSegment, existingSegment, existingNodes);
    
    if (intersections.length > 0) {
      intersectionPoints.push(...intersections);

      // Process each intersection for potential junction creation
      intersections.forEach(intersection => {
        // Check if this intersection requires a junction
        const connectedSegments = [newSegment.id, existingSegment.id];
        const analysis = classifyIntersection(intersection.position, 
          [newSegment, existingSegment], existingNodes);

        if (analysis.requiresJunction) {
          const junctionNode = createJunctionNode(
            intersection.position,
            connectedSegments,
            analysis.intersectionType,
            currentFloor
          );

          junctionNodes[junctionNode.id] = junctionNode;

          // Update intersection to reference junction
          intersection.isJunctionNode = true;
        }
      });
    }
  }

  // Find multi-way intersections (T-junctions, crossovers, hubs)
  if (segmentsOnCurrentFloor.length >= 2) {
    const multiWayIntersections = await findMultiWayIntersections(
      [newSegment, ...segmentsOnCurrentFloor], 
      existingNodes,
      0.5 // 0.5 meter threshold for grouping intersections
    );

    multiWayIntersections.forEach(intersection => {
      if (intersection.isJunctionNode && intersection.connectedSegments.length >= 3) {
        const junctionNode = createJunctionNode(
          intersection.position,
          intersection.connectedSegments,
          intersection.intersectionType,
          currentFloor
        );

        junctionNodes[junctionNode.id] = junctionNode;
        intersectionPoints.push(intersection);
      }
    });
  }

  // Check for grade separations with segments on different floors
  for (const existingSegment of Object.values(existingSegments)) {
    const startNode = existingNodes[existingSegment.startNode];
    if (startNode && Math.abs(startNode.floor - currentFloor) >= 1) {
      const gradeSeparation = await analyzeGradeSeparation(
        currentFloor < startNode.floor ? newSegment : existingSegment,
        currentFloor < startNode.floor ? existingSegment : newSegment,
        existingNodes
      );

      if (gradeSeparation) {
        intersectionPoints.push(gradeSeparation);
      }
    }
  }

  return {
    intersectionPoints,
    junctionNodes,
    updatedSegments,
    splitSegments
  };
};

/**
 * Handles complex curve intersections with proper segment splitting
 */
export const handleCurveIntersections = (
  curveSegment1: RailwaySegment,
  curveSegment2: RailwaySegment,
  nodes: Record<string, RailwayNode>
): {
  intersections: RailwayIntersectionPoint[];
  splitSegments: {
    curve1Segments: RailwaySegment[];
    curve2Segments: RailwaySegment[];
  };
} => {
  const intersections: RailwayIntersectionPoint[] = [];
  const splitSegments = {
    curve1Segments: [curveSegment1],
    curve2Segments: [curveSegment2]
  };

  // Only process if both segments are curves
  if (curveSegment1.type !== 'curve' || curveSegment2.type !== 'curve') {
    return { intersections, splitSegments };
  }

  if (!curveSegment1.controlPoints || !curveSegment2.controlPoints || 
      curveSegment1.controlPoints.length === 0 || curveSegment2.controlPoints.length === 0) {
    return { intersections, splitSegments };
  }

  const curve1Start = nodes[curveSegment1.startNode];
  const curve1End = nodes[curveSegment1.endNode];
  const curve2Start = nodes[curveSegment2.startNode];
  const curve2End = nodes[curveSegment2.endNode];

  if (!curve1Start || !curve1End || !curve2Start || !curve2End) {
    return { intersections, splitSegments };
  }

  // Find precise curve-to-curve intersections
  const curveIntersectionResult = findCurveToCurveIntersections(
    curve1Start,
    curveSegment1.controlPoints[0],
    curve1End,
    curve2Start,
    curveSegment2.controlPoints[0],
    curve2End,
    0.01 // 1cm tolerance
  );

  if (curveIntersectionResult.intersections.length > 0) {
    // Create intersection points
    curveIntersectionResult.intersections.forEach((intersection, index) => {
      const params = curveIntersectionResult.segmentParameters[index];
      
      intersections.push({
        id: uuidv4(),
        position: intersection,
        intersectionType: IntersectionType.CURVE_TO_CURVE,
        connectedSegments: [curveSegment1.id, curveSegment2.id],
        isJunctionNode: false,
        t1: params.t1,
        t2: params.t2,
        visualIndicator: 'curve_blend' as any
      });
    });

    // Split segments at intersection points if subdivisions are available
    if (curveIntersectionResult.curveSubdivisions) {
      const { curve1Splits, curve2Splits } = curveIntersectionResult.curveSubdivisions;

      // Split curve 1
      if (curve1Splits.length > 0) {
        const splitResults = splitCurveAtMultiplePoints(
          curveSegment1,
          curve1Start,
          curve1End,
          curve1Splits
        );
        splitSegments.curve1Segments = splitResults;
      }

      // Split curve 2
      if (curve2Splits.length > 0) {
        const splitResults = splitCurveAtMultiplePoints(
          curveSegment2,
          curve2Start,
          curve2End,
          curve2Splits
        );
        splitSegments.curve2Segments = splitResults;
      }
    }
  }

  return { intersections, splitSegments };
};

/**
 * Splits a curve segment at multiple intersection points
 */
const splitCurveAtMultiplePoints = (
  originalSegment: RailwaySegment,
  startNode: RailwayNode,
  endNode: RailwayNode,
  splitPoints: { t: number; point: Point3D; controlPoint: Point3D }[]
): RailwaySegment[] => {
  if (splitPoints.length === 0 || !originalSegment.controlPoints) {
    return [originalSegment];
  }

  // Sort split points by parameter t
  const sortedSplits = splitPoints.sort((a, b) => a.t - b.t);
  const newSegments: RailwaySegment[] = [];

  let currentStart = startNode;
  const currentControlPoint = originalSegment.controlPoints[0];
  let currentStartT = 0;

  sortedSplits.forEach((split, index) => {
    // Create segment from current start to split point
    const segmentId = `${originalSegment.id}-split-${index + 1}`;
    
    const newSegment: RailwaySegment = {
      id: segmentId,
      type: 'curve',
      startNode: currentStart.id,
      endNode: `split-node-${split.point.x}-${split.point.y}`,
      startPoint: { x: currentStart.x, y: currentStart.y, z: currentStart.z },
      endPoint: split.point,
      controlPoints: [split.controlPoint],
      length: distance3D(currentStart, split.point),
      direction: originalSegment.direction,
      showArrows: originalSegment.showArrows
    };

    newSegments.push(newSegment);

    // Update for next iteration
    currentStart = {
      id: newSegment.endNode,
      x: split.point.x,
      y: split.point.y,
      z: split.point.z,
      floor: currentStart.floor,
      isAnchor: false
    };
    currentStartT = split.t;
  });

  // Create final segment from last split to end
  if (currentStart.id !== endNode.id) {
    const finalSegment: RailwaySegment = {
      id: `${originalSegment.id}-split-final`,
      type: 'curve',
      startNode: currentStart.id,
      endNode: endNode.id,
      startPoint: { x: currentStart.x, y: currentStart.y, z: currentStart.z },
      endPoint: { x: endNode.x, y: endNode.y, z: endNode.z },
      controlPoints: [originalSegment.controlPoints[0]], // Recalculate if needed
      length: distance3D(currentStart, endNode),
      direction: originalSegment.direction,
      showArrows: originalSegment.showArrows
    };

    newSegments.push(finalSegment);
  }

  return newSegments;
};

/**
 * Validates junction node capacity and manages active connections
 */
export const manageJunctionConnections = (
  junctionNode: JunctionNode,
  requestedConnection: string,
  segments: Record<string, RailwaySegment>
): {
  success: boolean;
  updatedJunction: JunctionNode;
  message?: string;
} => {
  if (junctionNode.activeConnections.length >= junctionNode.capacity) {
    return {
      success: false,
      updatedJunction: junctionNode,
      message: 'Junction at capacity - cannot add more connections'
    };
  }

  if (junctionNode.activeConnections.includes(requestedConnection)) {
    return {
      success: true,
      updatedJunction: junctionNode,
      message: 'Connection already active'
    };
  }

  const updatedJunction: JunctionNode = {
    ...junctionNode,
    activeConnections: [...junctionNode.activeConnections, requestedConnection]
  };

  return {
    success: true,
    updatedJunction,
    message: 'Connection successfully added to junction'
  };
};

/**
 * Optimizes junction performance by removing unused connections
 */
export const optimizeJunctionConnections = (
  junctionNodes: Record<string, JunctionNode>,
  segments: Record<string, RailwaySegment>
): Record<string, JunctionNode> => {
  const optimizedJunctions: Record<string, JunctionNode> = {};

  Object.entries(junctionNodes).forEach(([id, junction]) => {
    // Find which connected segments still exist
    const validConnections = junction.connectedSegments.filter(
      segmentId => segments[segmentId] !== undefined
    );

    const validActiveConnections = junction.activeConnections.filter(
      segmentId => segments[segmentId] !== undefined
    );

    optimizedJunctions[id] = {
      ...junction,
      connectedSegments: validConnections,
      activeConnections: validActiveConnections
    };
  });

  return optimizedJunctions;
};
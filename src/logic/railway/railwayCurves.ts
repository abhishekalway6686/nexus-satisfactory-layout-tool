// src/logic/railway/railwayCurves.ts
import { RailwaySegment, RailwayNode, Point3D } from '../../types';
import { shouldCreateTurn, calculateCurveControlPoint } from '../common/curveUtils';
import { distance3D } from '../../utils/helpers';
import { HybridCalculations } from '../../utils/hybridCalculations';

export interface CurveApplicationResult {
  segments: Record<string, RailwaySegment>;
  appliedCurves: string[]; // IDs of segments that had curves applied
}

/**
 * Applies curves to railway segments based on the path of nodes with SIMD optimization
 * This is the centralized logic for determining which segments should be curved
 */
export const applyRailwayCurves = async (
  segments: RailwaySegment[],
  nodes: Record<string, RailwayNode>,
  nodePath: string[]
): Promise<CurveApplicationResult> => {
  // Use Rust batch curve calculations for large datasets
  if (nodePath.length > 10) {
    try {
      const nodePoints = nodePath.map(nodeId => nodes[nodeId]).filter(Boolean);
      const curveOptimization = await HybridCalculations.calculateRailwayCurvesBatch(
        nodePoints,
        0.873, // Standard curve threshold
        2.0    // Minimum curve radius
      );
      
      return applyOptimizedCurvesToSegments(segments, curveOptimization, nodePath);
    } catch (error) {
      console.warn('[Railway Curves] SIMD optimization failed, falling back to JavaScript:', error);
      // Fall through to JavaScript implementation
    }
  }
  
  // JavaScript fallback for small datasets or when Rust fails
  return await applyRailwayCurvesSync(segments, nodes, nodePath);
};

/**
 * Applies optimized curves from Rust SIMD calculations to segments
 */
const applyOptimizedCurvesToSegments = (
  segments: RailwaySegment[],
  curveOptimization: any, // RailwayCurveOptimization type
  nodePath: string[]
): CurveApplicationResult => {
  const updatedSegments: Record<string, RailwaySegment> = {};
  const appliedCurves: string[] = [];

  // Convert segments array to a map for easier access
  const segmentMap: Record<string, RailwaySegment> = {};
  segments.forEach(seg => {
    segmentMap[seg.id] = { ...seg };
    updatedSegments[seg.id] = { ...seg };
  });
  
  // Apply curve segments from Rust optimization
  curveOptimization.curveSegments?.forEach((curveSegment: any) => {
    // Find the corresponding segment
    const segment = segments.find(seg => {
      const segmentStartIdx = nodePath.indexOf(seg.startNode);
      const segmentEndIdx = nodePath.indexOf(seg.endNode);
      
      // Check if this curve segment matches this railway segment
      return segmentStartIdx >= 0 && segmentEndIdx >= 0 && 
             Math.abs(segmentEndIdx - segmentStartIdx) === 1;
    });
    
    if (segment && curveSegment.segmentType === 'curve') {
      updatedSegments[segment.id] = {
        ...segment,
        type: 'curve',
        controlPoints: [curveSegment.controlPoint]
      };
      appliedCurves.push(segment.id);
    }
  });
  
  return { segments: updatedSegments, appliedCurves };
};

/**
 * Synchronous JavaScript implementation for backward compatibility
 */
export const applyRailwayCurvesSync = async (
  segments: RailwaySegment[],
  nodes: Record<string, RailwayNode>,
  nodePath: string[]
): Promise<CurveApplicationResult> => {
  const updatedSegments: Record<string, RailwaySegment> = {};
  const appliedCurves: string[] = [];

  // Convert segments array to a map for easier access
  const segmentMap: Record<string, RailwaySegment> = {};
  segments.forEach(seg => {
    segmentMap[seg.id] = { ...seg };
  });

  // Process each segment in the context of the full path
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    updatedSegments[segment.id] = { ...segment };

    // Skip segments that already have control points (from deleted intermediate nodes)
    if (segment.type === 'curve' && segment.controlPoints && segment.controlPoints.length > 0) {
      // Segment already has control points, preserving them
      appliedCurves.push(segment.id);
      continue;
    }

    // RETROACTIVE CURVE APPLICATION: When processing segment i, check if segment i-1 should be curved
    // This matches the preview logic - curve the previous segment when we have enough context
    const segmentStartIdx = nodePath.indexOf(segment.startNode);
    const segmentEndIdx = nodePath.indexOf(segment.endNode);

    // If this is not the first segment, check if the PREVIOUS segment should be curved
    if (i > 0 && segmentStartIdx > 0) {
      const prevSegmentId = segments[i - 1].id;
      const prevSegment = updatedSegments[prevSegmentId];
      
      // Skip if previous segment already has control points
      if (prevSegment && !prevSegment.controlPoints) {
        const nodeA = nodePath[segmentStartIdx - 1]; // Node before previous segment
        const nodeB = nodePath[segmentStartIdx];     // Start of previous segment (end of previous segment)
        const nodeC = nodePath[segmentStartIdx + 1];  // Next node after B for proper curve detection
        
        const prevNode = nodes[nodeA];
        const currentNode = nodes[nodeB];
        const nextNode = nodes[nodeC];
        
        if (prevNode && currentNode && nextNode) {
          // Check if we should create a turn at node B (retroactive curve application)
          if (shouldCreateTurn(prevNode, currentNode, nextNode)) {
            // Apply curve to the PREVIOUS segment (retroactively based on the CURRENT point)
            updatedSegments[prevSegmentId].type = 'curve';
            updatedSegments[prevSegmentId].controlPoints = [calculateCurveControlPoint(prevNode, currentNode, nextNode)];
            appliedCurves.push(prevSegmentId);

            // Applied retroactive curve to previous segment
          }
        }
      }
    }
  }

  return { segments: updatedSegments, appliedCurves };
};

/**
 * Retroactively applies a curve to a segment when a new point is added
 * This is used during drawing when we detect that the previous segment should be curved
 */
export const retroactivelyApplyCurve = (
  segment: RailwaySegment,
  nodeA: RailwayNode,
  nodeB: RailwayNode,
  nodeC: RailwayNode
): RailwaySegment | null => {
  if (shouldCreateTurn(nodeA, nodeB, nodeC)) {
    return {
      ...segment,
      type: 'curve',
      controlPoints: [calculateCurveControlPoint(nodeA, nodeB, nodeC)]
    };
  }
  return null;
};

/**
 * Calculates the length of a railway segment with SIMD optimization for curves
 */
export const calculateSegmentLength = async (
  segment: RailwaySegment,
  nodes: Record<string, RailwayNode>
): Promise<number> => {
  const startNode = nodes[segment.startNode];
  const endNode = nodes[segment.endNode];
  
  if (!startNode || !endNode) {
    return 0;
  }

  if (segment.type === 'curve' && segment.controlPoints && segment.controlPoints.length > 0) {
    // Use Rust SIMD Bezier approximation for better performance
    try {
      const cp = segment.controlPoints[0];
      const curvePoints = await HybridCalculations.approximateBezierSimd(
        startNode,
        cp,
        endNode,
        20 // number of samples
      );
      
      // Use Rust SIMD to calculate segment lengths
      const segmentLengths = await HybridCalculations.calculateSegmentLengthsSimd(curvePoints);
      return segmentLengths.reduce((sum, length) => sum + length, 0);
    } catch (error) {
      console.warn('[Railway Curves] SIMD length calculation failed, falling back to JavaScript:', error);
      // Fall through to JavaScript implementation
    }
    
    // JavaScript fallback for curve calculation
    const numSamples = 20;
    let totalLength = 0;
    let prevPoint: Point3D = startNode;

    for (let i = 1; i <= numSamples; i++) {
      const t = i / numSamples;
      const u = 1 - t;
      const cp = segment.controlPoints[0];
      
      const currentPoint: Point3D = {
        x: u * u * startNode.x + 2 * u * t * cp.x + t * t * endNode.x,
        y: u * u * startNode.y + 2 * u * t * cp.y + t * t * endNode.y,
        z: u * u * startNode.z + 2 * u * t * cp.z + t * t * endNode.z,
      };

      totalLength += distance3D(prevPoint, currentPoint);
      prevPoint = currentPoint;
    }

    return totalLength;
  } else {
    // For straight segments, use direct distance
    return distance3D(startNode, endNode);
  }
};

/**
 * Synchronous version for cases where async is not suitable
 */
export const calculateSegmentLengthSync = (
  segment: RailwaySegment,
  nodes: Record<string, RailwayNode>
): number => {
  const startNode = nodes[segment.startNode];
  const endNode = nodes[segment.endNode];
  
  if (!startNode || !endNode) {
    return 0;
  }

  if (segment.type === 'curve' && segment.controlPoints && segment.controlPoints.length > 0) {
    // JavaScript implementation for synchronous calculation
    const numSamples = 20;
    let totalLength = 0;
    let prevPoint: Point3D = startNode;

    for (let i = 1; i <= numSamples; i++) {
      const t = i / numSamples;
      const u = 1 - t;
      const cp = segment.controlPoints[0];
      
      const currentPoint: Point3D = {
        x: u * u * startNode.x + 2 * u * t * cp.x + t * t * endNode.x,
        y: u * u * startNode.y + 2 * u * t * cp.y + t * t * endNode.y,
        z: u * u * startNode.z + 2 * u * t * cp.z + t * t * endNode.z,
      };

      totalLength += distance3D(prevPoint, currentPoint);
      prevPoint = currentPoint;
    }

    return totalLength;
  } else {
    // For straight segments, use direct distance
    return distance3D(startNode, endNode);
  }
};

/**
 * Batch segment length calculation with SIMD optimization
 */
export const calculateSegmentLengthsBatch = async (
  segments: RailwaySegment[],
  nodes: Record<string, RailwayNode>
): Promise<{ [segmentId: string]: number }> => {
  const results: { [segmentId: string]: number } = {};
  
  // Separate straight and curved segments for different optimization strategies
  const straightSegments: RailwaySegment[] = [];
  const curvedSegments: RailwaySegment[] = [];
  
  segments.forEach(segment => {
    if (segment.type === 'curve' && segment.controlPoints && segment.controlPoints.length > 0) {
      curvedSegments.push(segment);
    } else {
      straightSegments.push(segment);
    }
  });
  
  // Calculate straight segments using basic distance
  straightSegments.forEach(segment => {
    const startNode = nodes[segment.startNode];
    const endNode = nodes[segment.endNode];
    
    if (startNode && endNode) {
      results[segment.id] = distance3D(startNode, endNode);
    } else {
      results[segment.id] = 0;
    }
  });
  
  // Calculate curved segments using SIMD when beneficial
  if (curvedSegments.length > 5) {
    try {
      // Use batch processing for curved segments
      const curveCalculations = await Promise.all(
        curvedSegments.map(segment => calculateSegmentLength(segment, nodes))
      );
      
      curvedSegments.forEach((segment, index) => {
        results[segment.id] = curveCalculations[index];
      });
    } catch (error) {
      console.warn('[Railway Curves] Batch curve calculation failed:', error);
      
      // Fallback to individual calculations
      for (const segment of curvedSegments) {
        results[segment.id] = await calculateSegmentLength(segment, nodes);
      }
    }
  } else {
    // For small numbers of curved segments, calculate individually
    for (const segment of curvedSegments) {
      results[segment.id] = await calculateSegmentLength(segment, nodes);
    }
  }
  
  return results;
};

/**
 * Updates segment control points when a node is moved
 */
export const updateSegmentCurvesForNodeMove = (
  nodeId: string,
  segments: Record<string, RailwaySegment>,
  nodes: Record<string, RailwayNode>
): Record<string, RailwaySegment> => {
  const updatedSegments = { ...segments };
  
  // Find segments that need curve updates
  const segmentsToCheck: Array<{ segment: RailwaySegment; position: 'start' | 'end' }> = [];
  
  Object.values(segments).forEach(seg => {
    if (seg.startNode === nodeId) {
      segmentsToCheck.push({ segment: seg, position: 'start' });
    } else if (seg.endNode === nodeId) {
      segmentsToCheck.push({ segment: seg, position: 'end' });
    }
  });

  // For each affected segment, check if it needs curve updates
  segmentsToCheck.forEach(({ segment, position }) => {
    // Find the three nodes that form the potential curve
    let nodeA: RailwayNode | null = null;
    let nodeB: RailwayNode | null = null;
    let nodeC: RailwayNode | null = null;

    if (position === 'start') {
      // The moved node is at the start, we need the node before it
      nodeB = nodes[segment.startNode];
      nodeC = nodes[segment.endNode];
      
      // Find the segment that ends at our start node
      const prevSegment = Object.values(segments).find(s => s.endNode === segment.startNode);
      if (prevSegment) {
        nodeA = nodes[prevSegment.startNode];
      }
    } else {
      // The moved node is at the end, we need the node after it
      nodeA = nodes[segment.startNode];
      nodeB = nodes[segment.endNode];
      
      // Find the segment that starts at our end node
      const nextSegment = Object.values(segments).find(s => s.startNode === segment.endNode);
      if (nextSegment) {
        nodeC = nodes[nextSegment.endNode];
      }
    }

    // Update curve if we have all three nodes
    if (nodeA && nodeB && nodeC) {
      if (shouldCreateTurn(nodeA, nodeB, nodeC)) {
        const controlPoint = calculateCurveControlPoint(nodeA, nodeB, nodeC);
        
        // The segment from A to B should be curved
        if (position === 'end') {
          updatedSegments[segment.id] = {
            ...segment,
            type: 'curve',
            controlPoints: [controlPoint]
          };
        } else {
          // If position is 'start', we need to update the previous segment
          const prevSegment = Object.values(segments).find(s => s.endNode === segment.startNode);
          if (prevSegment) {
            updatedSegments[prevSegment.id] = {
              ...prevSegment,
              type: 'curve',
              controlPoints: [controlPoint]
            };
          }
        }
      } else {
        // No longer a turn, make it straight
        if (position === 'end') {
          updatedSegments[segment.id] = {
            ...segment,
            type: 'straight',
            controlPoints: undefined
          };
        } else {
          const prevSegment = Object.values(segments).find(s => s.endNode === segment.startNode);
          if (prevSegment) {
            updatedSegments[prevSegment.id] = {
              ...prevSegment,
              type: 'straight',
              controlPoints: undefined
            };
          }
        }
      }
    }
  });

  return updatedSegments;
};
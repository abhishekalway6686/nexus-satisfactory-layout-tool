// src/logic/common/intersectionLogic.ts
import { 
  Point, 
  Point3D, 
  RailwaySegment, 
  RailwayNode, 
  IntersectionType, 
  RailwayIntersectionPoint, 
  IntersectionAnalysisResult, 
  CurveIntersectionResult, 
  SegmentSplitInfo,
  IntersectionVisualType
} from '../../types';
import { distance2D, distance3D } from '../../utils/helpers';
import { HybridCalculations } from '../../utils/hybridCalculations';
import { v4 as uuidv4 } from 'uuid';

/**
 * Checks if two line segments intersect and returns the intersection point
 */
export const linesIntersect = (a1: Point, a2: Point, b1: Point, b2: Point): Point | null => {
  const den = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
  if (Math.abs(den) < 1e-6) return null;

  const t = ((a1.y - b1.y) * (b2.x - b1.x) - (a1.x - b1.x) * (b2.y - b1.y)) / den;
  const u = ((a1.y - b1.y) * (a2.x - a1.x) - (a1.x - b1.x) * (a2.y - a1.y)) / den;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: a1.x + t * (a2.x - a1.x),
      y: a1.y + t * (a2.y - a1.y),
    };
  }
  return null;
};

/**
 * Approximates a Bezier curve as a series of line segments
 */
export const approximateBezier = (start: Point, cp: Point, end: Point, steps: number = 20): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * start.x + 2 * u * t * cp.x + t * t * end.x;
    const y = u * u * start.y + 2 * u * t * cp.y + t * t * end.y;
    points.push({ x, y });
  }
  return points;
};

/**
 * Converts a railway segment to a polyline for intersection detection
 */
export const getPolyLine = (segment: RailwaySegment, nodes: Record<string, RailwayNode>, steps: number = 20): Point[] => {
  const start = nodes[segment.startNode];
  const end = nodes[segment.endNode];
  if (!start || !end) return [];

  if (segment.type !== 'curve' || !segment.controlPoints || segment.controlPoints.length === 0) {
    return [
      { x: start.x, y: start.y },
      { x: end.x, y: end.y },
    ];
  }

  const cp = segment.controlPoints[0];
  return approximateBezier(
    { x: start.x, y: start.y },
    { x: cp.x, y: cp.y },
    { x: end.x, y: end.y },
    steps
  );
};

/**
 * Finds all intersections between two polylines with Rust spatial indexing optimization
 * Uses Rust for large polylines (>10 points) and JavaScript for small ones
 */
export const findIntersections = async (poly1: Point[], poly2: Point[]): Promise<{ point: Point; t1: number; t2: number }[]> => {
  // Use Rust spatial indexing for large polylines (major performance improvement)
  if (poly1.length > 10 || poly2.length > 10) {
    try {
      const rustResult = await HybridCalculations.findIntersectionsSpatial(poly1, poly2, true);
      // Convert from Rust format to legacy format
      return rustResult.map(intersection => ({
        point: intersection.point,
        t1: intersection.t1,
        t2: intersection.t2
      }));
    } catch (error) {
      console.warn('[Intersection Logic] Rust spatial indexing failed, falling back to JavaScript:', error);
      // Fall through to JavaScript implementation
    }
  }
  
  // JavaScript fallback for small polylines or when Rust fails
  return findIntersectionsSync(poly1, poly2);
};

/**
 * Synchronous JavaScript implementation for backward compatibility and small datasets
 */
export const findIntersectionsSync = (poly1: Point[], poly2: Point[]): { point: Point; t1: number; t2: number }[] => {
  const intersections: { point: Point; t1: number; t2: number }[] = [];
  
  for (let j = 0; j < poly1.length - 1; j++) {
    for (let k = 0; k < poly2.length - 1; k++) {
      const inter = linesIntersect(poly1[j], poly1[j + 1], poly2[k], poly2[k + 1]);
      if (inter) {
        const segLen1 = distance2D(poly1[j], poly1[j + 1]);
        const distFromStart1 = distance2D(poly1[j], inter);
        const t1 = j / (poly1.length - 1) + (distFromStart1 / segLen1) / (poly1.length - 1);

        const segLen2 = distance2D(poly2[k], poly2[k + 1]);
        const distFromStart2 = distance2D(poly2[k], inter);
        const t2 = k / (poly2.length - 1) + (distFromStart2 / segLen2) / (poly2.length - 1);

        intersections.push({ point: inter, t1, t2 });
      }
    }
  }
  
  return intersections;
};

/**
 * Optimized polyline intersection detection with hybrid approach
 * Uses the best method based on polyline size and system capabilities
 */
export const findPolylineIntersections = async (poly1: Point[], poly2: Point[]): Promise<{ point: Point; t1: number; t2: number }[]> => {
  return await findIntersections(poly1, poly2);
};

/**
 * Checks if point B forms a right triangle pattern with points A and C
 * Used for optimizing railway paths by removing unnecessary intermediate points
 */
export const isRightTrianglePattern = (p1: Point3D, p2: Point3D, p3: Point3D): boolean => {
  // Calculate distances to check if we have a reasonable triangle
  const dist1 = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2);
  const dist2 = Math.sqrt((p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2 + (p3.z - p2.z) ** 2);

  // Require minimum distance to avoid micro-triangles
  const minDistance = 1.0; // 1 meter minimum
  if (dist1 < minDistance || dist2 < minDistance) {
    return false;
  }

  // Calculate the angle at point p2 (the middle point)
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (len1 === 0 || len2 === 0) return false;

  // Normalize vectors
  v1.x /= len1;
  v1.y /= len1;
  v2.x /= len2;
  v2.y /= len2;

  // Calculate dot product to get angle
  const dot = v1.x * v2.x + v1.y * v2.y;
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

  // Check if angle is close to 90 degrees (π/2 radians)
  const rightAngle = Math.PI / 2;
  const tolerance = Math.PI / 12; // 15 degrees tolerance
  
  return Math.abs(angle - rightAngle) <= tolerance;
};

// ============================================================================
// ADVANCED INTERSECTION DETECTION SYSTEM - Phase 4 Implementation
// ============================================================================

/**
 * Classifies the type of intersection based on geometry and connected segments
 */
export const classifyIntersection = (
  intersectionPoint: Point3D,
  connectedSegments: RailwaySegment[],
  nodes: Record<string, RailwayNode>
): IntersectionAnalysisResult => {
  const segmentCount = connectedSegments.length;
  let intersectionType: IntersectionType;
  let complexity: 'simple' | 'moderate' | 'complex' | 'critical';
  let requiresJunction: boolean;
  let suggestedJunctionType: 'simple' | 't_junction' | 'crossover' | 'hub' | undefined;
  const recommendations: string[] = [];

  // Classify based on number of connected segments
  if (segmentCount === 2) {
    // Check if both segments are curves
    const hasCurvedSegments = connectedSegments.some(seg => seg.type === 'curve');
    
    if (hasCurvedSegments) {
      intersectionType = connectedSegments.every(seg => seg.type === 'curve') 
        ? IntersectionType.CURVE_TO_CURVE 
        : IntersectionType.CURVE_CROSS;
      complexity = 'moderate';
      requiresJunction = false;
      recommendations.push('Consider smoothing curve intersections for better train flow');
    } else {
      intersectionType = IntersectionType.SIMPLE_CROSS;
      complexity = 'simple';
      requiresJunction = false;
    }
  } else if (segmentCount === 3) {
    intersectionType = IntersectionType.T_JUNCTION;
    complexity = 'moderate';
    requiresJunction = true;
    suggestedJunctionType = 't_junction';
    recommendations.push('T-junction created - consider traffic flow direction');
  } else if (segmentCount === 4) {
    intersectionType = IntersectionType.CROSSOVER;
    complexity = 'complex';
    requiresJunction = true;
    suggestedJunctionType = 'crossover';
    recommendations.push('Crossover intersection - may impact train scheduling');
  } else if (segmentCount >= 5) {
    intersectionType = IntersectionType.STAR_HUB;
    complexity = 'critical';
    requiresJunction = true;
    suggestedJunctionType = 'hub';
    recommendations.push('Multi-way hub created - consider using dedicated junction station');
  } else {
    intersectionType = IntersectionType.SIMPLE_CROSS;
    complexity = 'simple';
    requiresJunction = false;
  }

  // Analyze performance impact
  let performanceImpact: 'minimal' | 'moderate' | 'significant';
  if (complexity === 'simple') {
    performanceImpact = 'minimal';
  } else if (complexity === 'moderate') {
    performanceImpact = 'moderate';
  } else {
    performanceImpact = 'significant';
    recommendations.push('Complex intersection may require performance optimization');
  }

  // Calculate segment splits needed
  const segmentSplits: SegmentSplitInfo[] = connectedSegments.map(segment => {
    const startNode = nodes[segment.startNode];
    const endNode = nodes[segment.endNode];
    
    if (!startNode || !endNode) {
      return null;
    }

    // Calculate parameter t for intersection point along segment
    const segmentVector = {
      x: endNode.x - startNode.x,
      y: endNode.y - startNode.y,
      z: endNode.z - startNode.z
    };
    
    const intersectionVector = {
      x: intersectionPoint.x - startNode.x,
      y: intersectionPoint.y - startNode.y,
      z: intersectionPoint.z - startNode.z
    };

    const segmentLength = Math.sqrt(segmentVector.x ** 2 + segmentVector.y ** 2 + segmentVector.z ** 2);
    const projectionLength = Math.sqrt(intersectionVector.x ** 2 + intersectionVector.y ** 2 + intersectionVector.z ** 2);
    
    const t = segmentLength > 0 ? projectionLength / segmentLength : 0;

    return {
      originalSegmentId: segment.id,
      splitAtT: Math.max(0, Math.min(1, t)),
      splitPoint: intersectionPoint,
      newSegments: {
        beforeSplit: {
          endNode: `intersection-${intersectionPoint.x}-${intersectionPoint.y}-${intersectionPoint.z}`,
          endPoint: intersectionPoint,
        },
        afterSplit: {
          startNode: `intersection-${intersectionPoint.x}-${intersectionPoint.y}-${intersectionPoint.z}`,
          startPoint: intersectionPoint,
        }
      },
      requiresCurveRecalculation: segment.type === 'curve' && segment.controlPoints !== undefined
    };
  }).filter(split => split !== null) as SegmentSplitInfo[];

  return {
    intersectionType,
    complexity,
    requiresJunction,
    suggestedJunctionType,
    segmentSplits,
    performanceImpact,
    recommendations
  };
};

/**
 * Detects all intersection types between two railway segments
 * Supports straight-to-straight, curve-to-straight, and curve-to-curve intersections
 */
export const detectAdvancedIntersections = async (
  segment1: RailwaySegment,
  segment2: RailwaySegment,
  nodes: Record<string, RailwayNode>
): Promise<RailwayIntersectionPoint[]> => {
  const intersections: RailwayIntersectionPoint[] = [];

  // Get polylines for both segments
  const poly1 = getPolyLine(segment1, nodes);
  const poly2 = getPolyLine(segment2, nodes);

  if (poly1.length === 0 || poly2.length === 0) {
    return intersections;
  }

  // Find all intersection points using optimized Rust implementation
  const rawIntersections = await findIntersections(poly1, poly2);

  if (rawIntersections.length === 0) {
    return intersections;
  }

  // Process each intersection to create advanced intersection data
  rawIntersections.forEach((intersection, index) => {
    const intersectionId = uuidv4();
    
    // Determine intersection type based on segment types
    let intersectionType: IntersectionType;
    if (segment1.type === 'curve' && segment2.type === 'curve') {
      intersectionType = IntersectionType.CURVE_TO_CURVE;
    } else if (segment1.type === 'curve' || segment2.type === 'curve') {
      intersectionType = IntersectionType.CURVE_CROSS;
    } else {
      intersectionType = IntersectionType.SIMPLE_CROSS;
    }

    // Determine visual indicator
    let visualIndicator: IntersectionVisualType;
    switch (intersectionType) {
      case IntersectionType.CURVE_TO_CURVE:
        visualIndicator = IntersectionVisualType.CURVE_BLEND;
        break;
      case IntersectionType.CURVE_CROSS:
        visualIndicator = IntersectionVisualType.CROSS_MARKER;
        break;
      default:
        visualIndicator = IntersectionVisualType.CROSS_MARKER;
    }

    const intersectionPoint: RailwayIntersectionPoint = {
      id: intersectionId,
      position: { 
        x: intersection.point.x, 
        y: intersection.point.y, 
        z: nodes[segment1.startNode]?.z || 0 
      },
      intersectionType,
      connectedSegments: [segment1.id, segment2.id],
      isJunctionNode: false, // Will be updated if this becomes a junction
      t1: intersection.t1,
      t2: intersection.t2,
      visualIndicator
    };

    intersections.push(intersectionPoint);
  });

  return intersections;
};

/**
 * Finds all intersections between multiple segments for T-junction and multi-way detection
 */
export const findMultiWayIntersections = async (
  segments: RailwaySegment[],
  nodes: Record<string, RailwayNode>,
  intersectionThreshold: number = 0.5
): Promise<RailwayIntersectionPoint[]> => {
  const allIntersections: RailwayIntersectionPoint[] = [];
  const processedPairs = new Set<string>();

  // Find all pairwise intersections
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const pairKey = `${segments[i].id}-${segments[j].id}`;
      if (processedPairs.has(pairKey)) continue;

      processedPairs.add(pairKey);
      const intersections = await detectAdvancedIntersections(segments[i], segments[j], nodes);
      allIntersections.push(...intersections);
    }
  }

  // Group nearby intersections to detect multi-way junctions
  const groupedIntersections = groupNearbyIntersections(allIntersections, intersectionThreshold);
  
  // Convert groups to T-junctions, crossovers, or hubs
  return groupedIntersections.map(group => {
    if (group.length === 1) {
      return group[0]; // Simple intersection
    }

    // Create multi-way intersection
    const allConnectedSegments = Array.from(
      new Set(group.flatMap(intersection => intersection.connectedSegments))
    );

    const centerPosition = calculateCenterPoint(group.map(i => i.position));
    
    let intersectionType: IntersectionType;
    let visualIndicator: IntersectionVisualType;

    if (allConnectedSegments.length === 3) {
      intersectionType = IntersectionType.T_JUNCTION;
      visualIndicator = IntersectionVisualType.T_JUNCTION_NODE;
    } else if (allConnectedSegments.length === 4) {
      intersectionType = IntersectionType.CROSSOVER;
      visualIndicator = IntersectionVisualType.CROSS_MARKER;
    } else {
      intersectionType = IntersectionType.STAR_HUB;
      visualIndicator = IntersectionVisualType.HUB_CIRCLE;
    }

    return {
      id: uuidv4(),
      position: centerPosition,
      intersectionType,
      connectedSegments: allConnectedSegments,
      isJunctionNode: true,
      visualIndicator
    };
  });
};

/**
 * Groups nearby intersections that should be treated as a single multi-way junction
 */
const groupNearbyIntersections = (
  intersections: RailwayIntersectionPoint[],
  threshold: number
): RailwayIntersectionPoint[][] => {
  const groups: RailwayIntersectionPoint[][] = [];
  const processed = new Set<string>();

  intersections.forEach(intersection => {
    if (processed.has(intersection.id)) return;

    const group = [intersection];
    processed.add(intersection.id);

    // Find nearby intersections
    intersections.forEach(otherIntersection => {
      if (processed.has(otherIntersection.id)) return;

      const distance = distance3D(intersection.position, otherIntersection.position);
      if (distance <= threshold) {
        group.push(otherIntersection);
        processed.add(otherIntersection.id);
      }
    });

    groups.push(group);
  });

  return groups;
};

/**
 * Calculates the center point of a group of positions
 */
const calculateCenterPoint = (positions: Point3D[]): Point3D => {
  if (positions.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const sum = positions.reduce(
    (acc, pos) => ({
      x: acc.x + pos.x,
      y: acc.y + pos.y,
      z: acc.z + pos.z
    }),
    { x: 0, y: 0, z: 0 }
  );

  return {
    x: sum.x / positions.length,
    y: sum.y / positions.length,
    z: sum.z / positions.length
  };
};

/**
 * Analyzes grade separation needs for overlapping railway segments at different elevations
 */
export const analyzeGradeSeparation = async (
  lowerSegment: RailwaySegment,
  upperSegment: RailwaySegment,
  nodes: Record<string, RailwayNode>,
  elevationDifference: number = 4.0 // 4 meters = 1 floor
): Promise<RailwayIntersectionPoint | null> => {
  const lowerPoly = getPolyLine(lowerSegment, nodes);
  const upperPoly = getPolyLine(upperSegment, nodes);

  // Check for 2D intersection (overlapping in X-Y plane)
  const intersections = await findIntersections(lowerPoly, upperPoly);
  
  if (intersections.length === 0) {
    return null;
  }

  // Use the first intersection for grade separation
  const intersection = intersections[0];
  const lowerZ = nodes[lowerSegment.startNode]?.z || 0;
  const upperZ = nodes[upperSegment.startNode]?.z || 0;

  // Determine if this is a bridge or tunnel
  const isValidGradeSeparation = Math.abs(upperZ - lowerZ) >= elevationDifference;
  
  if (!isValidGradeSeparation) {
    return null;
  }

  return {
    id: uuidv4(),
    position: {
      x: intersection.point.x,
      y: intersection.point.y,
      z: (lowerZ + upperZ) / 2 // Midpoint elevation for visualization
    },
    intersectionType: IntersectionType.GRADE_SEPARATION,
    connectedSegments: [lowerSegment.id, upperSegment.id],
    isJunctionNode: false,
    t1: intersection.t1,
    t2: intersection.t2,
    elevationLevel: upperZ > lowerZ ? 1 : -1, // 1 for bridge, -1 for tunnel
    visualIndicator: upperZ > lowerZ 
      ? IntersectionVisualType.BRIDGE_SYMBOL 
      : IntersectionVisualType.TUNNEL_SYMBOL
  };
};


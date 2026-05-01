// src/logic/common/curveUtils.ts
import { Point, Point3D, CurveIntersectionResult, IntersectionType } from '../../types';
import { distance2D } from '../../utils/helpers';

// Curve configuration constants
const CURVE_ANGLE_INCREMENT = Math.PI / 12; // 15 degrees in radians
const MIN_CURVE_ANGLE = Math.PI / 12; // 15 degrees - minimum angle to create a curve
const MIN_CURVE_DISTANCE = 1.5; // Minimum 1.5 meters between points for curves

/**
 * Quantizes an angle to the nearest increment (default 15 degrees)
 * @param angle Angle in radians
 * @param increment Increment in radians (default 15 degrees)
 * @returns Quantized angle in radians
 */
export const quantizeAngle = (angle: number, increment: number = CURVE_ANGLE_INCREMENT): number => {
  return Math.round(angle / increment) * increment;
};

/**
 * Calculates the angle difference between three points
 */
export const calculateAngleDifference = (p1: Point, p2: Point, p3: Point): number => {
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  const angle1 = Math.atan2(v1.y, v1.x);
  const angle2 = Math.atan2(v2.y, v2.x);

  let diff = angle2 - angle1;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;

  return Math.abs(diff);
};

/**
 * Calculates the quantized angle difference (snapped to 15-degree increments)
 */
export const calculateQuantizedAngleDifference = (p1: Point, p2: Point, p3: Point): number => {
  const rawAngle = calculateAngleDifference(p1, p2, p3);
  return quantizeAngle(rawAngle);
};

/**
 * Determines if a turn should be created at the middle point of three points
 * Uses 15-degree threshold for tighter, more responsive curves
 * @param p1 First point
 * @param p2 Middle point (where the turn would be)
 * @param p3 Last point
 * @returns true if a turn should be created
 */
export const shouldCreateTurn = (p1: Point, p2: Point, p3: Point): boolean => {
  const angleDiff = calculateAngleDifference(p1, p2, p3);
  const dist1 = distance2D(p1, p2);
  const dist2 = distance2D(p2, p3);

  // Create curve if angle exceeds 15 degrees and segments are long enough
  const result = angleDiff > MIN_CURVE_ANGLE && dist1 >= MIN_CURVE_DISTANCE && dist2 >= MIN_CURVE_DISTANCE;

  return result;
};

/**
 * Calculates the control point for a quadratic Bezier curve through three points
 * Creates tighter, more geometric curves with 15-degree angle snapping
 * @param p1 Start point
 * @param p2 Middle point (the turn point)
 * @param p3 End point
 * @returns Control point for the curve
 */
export const calculateCurveControlPoint = (p1: Point3D, p2: Point3D, p3: Point3D): Point3D => {
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  // Handle zero-length vectors
  if (len1 === 0 || len2 === 0) return p2;

  // Normalize vectors
  v1.x /= len1;
  v1.y /= len1;
  v2.x /= len2;
  v2.y /= len2;

  // Calculate angle between vectors
  const dot = v1.x * v2.x + v1.y * v2.y;
  const rawAngle = Math.acos(Math.max(-1, Math.min(1, dot)));

  // Quantize angle to 15-degree increments for tighter, more predictable curves
  const quantizedAngle = quantizeAngle(rawAngle);

  // If quantized angle is too small, no curve needed
  if (quantizedAngle < CURVE_ANGLE_INCREMENT) return p2;

  // Calculate the bisector direction (direction that splits the angle)
  // This creates a more geometric, tighter curve
  const bisectorX = v1.x + v2.x;
  const bisectorY = v1.y + v2.y;
  const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY);

  if (bisectorLen < 0.001) {
    // Vectors are opposite - use perpendicular direction
    return {
      x: p2.x - v1.y * 0.5,
      y: p2.y + v1.x * 0.5,
      z: p2.z,
    };
  }

  // Normalize bisector
  const normBisectorX = bisectorX / bisectorLen;
  const normBisectorY = bisectorY / bisectorLen;

  // Calculate offset distance for tighter curves
  // Use smaller offset for tighter, more geometric appearance
  const minDist = Math.min(len1, len2);
  const turnSharpness = Math.sin(quantizedAngle / 2);

  // Tighter curve calculation: reduce offset distance for sharper, more responsive curves
  // Maximum offset is 1.5 meters (reduced from 2.5) for tighter curves
  const offsetDistance = Math.min(minDist * 0.2, 1.5) * turnSharpness;

  // Control point is placed along the bisector direction, away from the turn
  return {
    x: p2.x + normBisectorX * offsetDistance,
    y: p2.y + normBisectorY * offsetDistance,
    z: p2.z,
  };
};

/**
 * Generates points along a quadratic Bezier curve
 */
export const getQuadraticBezierPoints = (start: Point, cp: Point, end: Point, numPoints: number = 20): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const u = 1 - t;
    const x = u * u * start.x + 2 * u * t * cp.x + t * t * end.x;
    const y = u * u * start.y + 2 * u * t * cp.y + t * t * end.y;
    points.push({ x, y });
  }
  return points;
};

/**
 * Splits a quadratic Bezier curve at a given parameter t
 */
export const splitBezierAtT = (
  start: Point3D,
  cp: Point3D,
  end: Point3D,
  t: number
): { first: { controlPoints: Point3D[] }; second: { controlPoints: Point3D[] }; point: Point3D } => {
  const p1: Point3D = {
    x: start.x + t * (cp.x - start.x),
    y: start.y + t * (cp.y - start.y),
    z: start.z + t * (cp.z - start.z),
  };
  const p2: Point3D = {
    x: cp.x + t * (end.x - cp.x),
    y: cp.y + t * (end.y - cp.y),
    z: cp.z + t * (end.z - cp.z),
  };
  const r: Point3D = {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
    z: p1.z + t * (p2.z - p1.z),
  };

  return {
    first: { controlPoints: [p1] },
    second: { controlPoints: [p2] },
    point: r,
  };
};

// ============================================================================
// ADVANCED CURVE INTERSECTION SYSTEM - Phase 4 Implementation
// ============================================================================

/**
 * Finds precise intersections between two Bezier curves using numerical methods
 * More accurate than polyline approximation for curve-to-curve intersections
 */
export const findCurveToCurveIntersections = (
  curve1Start: Point3D,
  curve1Control: Point3D,
  curve1End: Point3D,
  curve2Start: Point3D,
  curve2Control: Point3D,
  curve2End: Point3D,
  tolerance: number = 0.01
): CurveIntersectionResult => {
  const intersections: Point3D[] = [];
  const segmentParameters: { t1: number; t2: number }[] = [];
  const intersectionTypes: IntersectionType[] = [];

  // Use iterative refinement to find intersections
  const maxIterations = 50;
  const searchResolution = 20; // Initial sampling resolution

  // Sample both curves at regular intervals
  const curve1Points: { point: Point3D; t: number }[] = [];
  const curve2Points: { point: Point3D; t: number }[] = [];

  for (let i = 0; i <= searchResolution; i++) {
    const t = i / searchResolution;
    
    // Sample curve 1
    const curve1Point = evaluateBezierAtT(curve1Start, curve1Control, curve1End, t);
    curve1Points.push({ point: curve1Point, t });

    // Sample curve 2
    const curve2Point = evaluateBezierAtT(curve2Start, curve2Control, curve2End, t);
    curve2Points.push({ point: curve2Point, t });
  }

  // Find approximate intersections by checking distance between sampled points
  for (let i = 0; i < curve1Points.length; i++) {
    for (let j = 0; j < curve2Points.length; j++) {
      const dist = distance2D(curve1Points[i].point, curve2Points[j].point);
      
      if (dist < tolerance * 10) { // Broader initial threshold
        // Refine intersection using Newton-Raphson method
        const refinedIntersection = refineBezierIntersection(
          curve1Start, curve1Control, curve1End,
          curve2Start, curve2Control, curve2End,
          curve1Points[i].t, curve2Points[j].t,
          tolerance, maxIterations
        );

        if (refinedIntersection) {
          // Check if this intersection is already found (avoid duplicates)
          const isDuplicate = intersections.some(existing => 
            distance2D(existing, refinedIntersection.intersection) < tolerance
          );

          if (!isDuplicate) {
            intersections.push(refinedIntersection.intersection);
            segmentParameters.push({ 
              t1: refinedIntersection.t1, 
              t2: refinedIntersection.t2 
            });
            intersectionTypes.push(IntersectionType.CURVE_TO_CURVE);
          }
        }
      }
    }
  }

  // Calculate curve subdivisions if intersections were found
  let curveSubdivisions;
  if (intersections.length > 0) {
    const curve1Splits: { t: number; point: Point3D; controlPoint: Point3D }[] = [];
    const curve2Splits: { t: number; point: Point3D; controlPoint: Point3D }[] = [];

    segmentParameters.forEach((params, index) => {
      // Split curve 1 at intersection
      const split1 = splitBezierAtT(curve1Start, curve1Control, curve1End, params.t1);
      curve1Splits.push({
        t: params.t1,
        point: intersections[index],
        controlPoint: split1.first.controlPoints[0]
      });

      // Split curve 2 at intersection
      const split2 = splitBezierAtT(curve2Start, curve2Control, curve2End, params.t2);
      curve2Splits.push({
        t: params.t2,
        point: intersections[index],
        controlPoint: split2.first.controlPoints[0]
      });
    });

    curveSubdivisions = { curve1Splits, curve2Splits };
  }

  return {
    intersections,
    segmentParameters,
    intersectionTypes,
    curveSubdivisions
  };
};

/**
 * Evaluates a quadratic Bezier curve at parameter t
 */
const evaluateBezierAtT = (start: Point3D, control: Point3D, end: Point3D, t: number): Point3D => {
  const u = 1 - t;
  return {
    x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
    y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
    z: u * u * start.z + 2 * u * t * control.z + t * t * end.z,
  };
};

/**
 * Calculates the derivative of a quadratic Bezier curve at parameter t
 */
const evaluateBezierDerivativeAtT = (start: Point3D, control: Point3D, end: Point3D, t: number): Point3D => {
  return {
    x: 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x),
    y: 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y),
    z: 2 * (1 - t) * (control.z - start.z) + 2 * t * (end.z - control.z),
  };
};

/**
 * Refines intersection between two Bezier curves using Newton-Raphson method
 */
const refineBezierIntersection = (
  curve1Start: Point3D,
  curve1Control: Point3D,
  curve1End: Point3D,
  curve2Start: Point3D,
  curve2Control: Point3D,
  curve2End: Point3D,
  initialT1: number,
  initialT2: number,
  tolerance: number,
  maxIterations: number
): { intersection: Point3D; t1: number; t2: number } | null => {
  let t1 = initialT1;
  let t2 = initialT2;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Evaluate curves and their derivatives at current parameters
    const p1 = evaluateBezierAtT(curve1Start, curve1Control, curve1End, t1);
    const p2 = evaluateBezierAtT(curve2Start, curve2Control, curve2End, t2);
    
    const dp1dt1 = evaluateBezierDerivativeAtT(curve1Start, curve1Control, curve1End, t1);
    const dp2dt2 = evaluateBezierDerivativeAtT(curve2Start, curve2Control, curve2End, t2);

    // Calculate difference vector
    const diff = {
      x: p1.x - p2.x,
      y: p1.y - p2.y
    };

    // Check convergence
    const distance = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
    if (distance < tolerance) {
      // Return average position as intersection point
      const intersection = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        z: (p1.z + p2.z) / 2
      };
      return { intersection, t1, t2 };
    }

    // Set up Newton-Raphson system: J * delta = -F
    // where J is Jacobian matrix and F is the function vector
    const j11 = dp1dt1.x;
    const j12 = -dp2dt2.x;
    const j21 = dp1dt1.y;
    const j22 = -dp2dt2.y;

    // Calculate determinant
    const det = j11 * j22 - j12 * j21;
    if (Math.abs(det) < 1e-10) {
      break; // Singular matrix, can't continue
    }

    // Solve for parameter updates
    const dt1 = (-diff.x * j22 + diff.y * j12) / det;
    const dt2 = (diff.x * j21 - diff.y * j11) / det;

    // Update parameters with damping to prevent overshooting
    const dampingFactor = 0.5;
    t1 += dt1 * dampingFactor;
    t2 += dt2 * dampingFactor;

    // Clamp parameters to valid range [0, 1]
    t1 = Math.max(0, Math.min(1, t1));
    t2 = Math.max(0, Math.min(1, t2));
  }

  return null; // Failed to converge
};

/**
 * Finds intersection between a curve and a straight line
 */
export const findCurveToLineIntersection = (
  curveStart: Point3D,
  curveControl: Point3D,
  curveEnd: Point3D,
  lineStart: Point3D,
  lineEnd: Point3D,
  tolerance: number = 0.01
): { point: Point3D; t: number }[] => {
  const intersections: { point: Point3D; t: number }[] = [];
  
  // Sample curve at regular intervals
  const sampleCount = 50;
  let prevPoint: Point3D | null = null;
  let prevT = 0;

  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    const currentPoint = evaluateBezierAtT(curveStart, curveControl, curveEnd, t);

    if (prevPoint) {
      // Check intersection between curve segment and line
      const intersection = findLineSegmentIntersection(
        prevPoint, currentPoint,
        lineStart, lineEnd
      );

      if (intersection) {
        // Refine the intersection to get more precise t parameter
        const refinedT = prevT + (t - prevT) * intersection.u;
        const precisePoin = evaluateBezierAtT(curveStart, curveControl, curveEnd, refinedT);
        
        intersections.push({
          point: precisePoin,
          t: refinedT
        });
      }
    }

    prevPoint = currentPoint;
    prevT = t;
  }

  return intersections;
};

/**
 * Helper function to find intersection between two line segments
 */
const findLineSegmentIntersection = (
  a1: Point3D, a2: Point3D,
  b1: Point3D, b2: Point3D
): { point: Point3D; t: number; u: number } | null => {
  const den = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
  if (Math.abs(den) < 1e-6) return null;

  const t = ((a1.y - b1.y) * (b2.x - b1.x) - (a1.x - b1.x) * (b2.y - b1.y)) / den;
  const u = ((a1.y - b1.y) * (a2.x - a1.x) - (a1.x - b1.x) * (a2.y - a1.y)) / den;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      point: {
        x: a1.x + t * (a2.x - a1.x),
        y: a1.y + t * (a2.y - a1.y),
        z: a1.z + t * (a2.z - a1.z),
      },
      t,
      u
    };
  }

  return null;
};

/**
 * Optimizes curve control points after intersection splitting
 * Ensures smooth transitions at intersection points
 */
export const optimizeCurveControlPointsAtIntersection = (
  beforeCurve: { start: Point3D; control: Point3D; end: Point3D },
  afterCurve: { start: Point3D; control: Point3D; end: Point3D },
  intersectionPoint: Point3D
): { beforeControl: Point3D; afterControl: Point3D } => {
  // Calculate tangent vectors at intersection point
  const beforeTangent = evaluateBezierDerivativeAtT(
    beforeCurve.start, beforeCurve.control, beforeCurve.end, 1.0
  );
  const afterTangent = evaluateBezierDerivativeAtT(
    afterCurve.start, afterCurve.control, afterCurve.end, 0.0
  );

  // Normalize tangent vectors
  const beforeLength = Math.sqrt(beforeTangent.x ** 2 + beforeTangent.y ** 2);
  const afterLength = Math.sqrt(afterTangent.x ** 2 + afterTangent.y ** 2);

  if (beforeLength > 0) {
    beforeTangent.x /= beforeLength;
    beforeTangent.y /= beforeLength;
  }
  if (afterLength > 0) {
    afterTangent.x /= afterLength;
    afterTangent.y /= afterLength;
  }

  // Calculate smoothed control points
  const controlDistance = 2.0; // Distance from intersection for control points

  const beforeControl = {
    x: intersectionPoint.x - beforeTangent.x * controlDistance,
    y: intersectionPoint.y - beforeTangent.y * controlDistance,
    z: intersectionPoint.z
  };

  const afterControl = {
    x: intersectionPoint.x + afterTangent.x * controlDistance,
    y: intersectionPoint.y + afterTangent.y * controlDistance,
    z: intersectionPoint.z
  };

  return { beforeControl, afterControl };
};
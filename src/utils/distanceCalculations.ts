// Pure JavaScript distance calculation implementations
// Used as fallback when Rust/Tauri is not available
// These implementations must exactly match the original TypeScript behavior

import { Point, Point3D, Building, ConnectionPoint, RailwayConnectionPoint, RailwayNode, RailwaySegment } from '../types';

/**
 * Calculate 3D distance between two points
 * This exactly matches the original JavaScript implementation for fallback
 */
export const distance3D = (p1: Point3D, p2: Point3D): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Calculate squared 3D distance between two points (avoids expensive sqrt)
 * This exactly matches the original JavaScript implementation for fallback
 */
export const distance3DSquared = (p1: Point3D, p2: Point3D): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return dx * dx + dy * dy + dz * dz;
};

/**
 * Calculate 2D distance between two points (ignores Z coordinate)
 * This exactly matches the original JavaScript implementation for fallback
 */
export const distance2D = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate squared 2D distance between two points (ignores Z coordinate, avoids sqrt)
 * This exactly matches the original JavaScript implementation for fallback
 */
export const distance2DSquared = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return dx * dx + dy * dy;
};

/**
 * Project a point onto a line segment
 * This exactly matches the original JavaScript implementation for fallback
 */
export const projectPointOnLine = (point: Point3D, start: Point3D, end: Point3D): { proj: Point3D; t: number } => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const lenSq = dx * dx + dy * dy + dz * dz;
  
  if (lenSq === 0) {
    return { proj: { ...start }, t: 0 };
  }
  
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy + (point.z - start.z) * dz) / lenSq));
  
  return {
    proj: {
      x: start.x + t * dx,
      y: start.y + t * dy,
      z: start.z + t * dz,
    },
    t,
  };
};

/**
 * Bulk distance calculations using JavaScript
 * For small arrays or when Rust is not available
 */
export const calculateDistancesBulkJS = (pointsA: Point3D[], pointsB: Point3D[]): number[] => {
  if (pointsA.length !== pointsB.length) {
    throw new Error('Point arrays must have the same length');
  }
  
  return pointsA.map((p1, i) => {
    const p2 = pointsB[i];
    return distance3D(p1, p2);
  });
};

/**
 * Bulk squared distance calculations using JavaScript
 * For small arrays or when Rust is not available
 */
export const calculateDistances3DSquaredBulkJS = (pointsA: Point3D[], pointsB: Point3D[]): number[] => {
  if (pointsA.length !== pointsB.length) {
    throw new Error('Point arrays must have the same length');
  }
  
  return pointsA.map((p1, i) => {
    const p2 = pointsB[i];
    return distance3DSquared(p1, p2);
  });
};

/**
 * Bulk 2D distance calculations using JavaScript
 * For small arrays or when Rust is not available
 */
export const calculateDistances2DBulkJS = (pointsA: Point3D[], pointsB: Point3D[]): number[] => {
  if (pointsA.length !== pointsB.length) {
    throw new Error('Point arrays must have the same length');
  }
  
  return pointsA.map((p1, i) => {
    const p2 = pointsB[i];
    return distance2D(p1, p2);
  });
};

/**
 * Bulk 2D squared distance calculations using JavaScript
 * For small arrays or when Rust is not available
 */
export const calculateDistances2DSquaredBulkJS = (pointsA: Point3D[], pointsB: Point3D[]): number[] => {
  if (pointsA.length !== pointsB.length) {
    throw new Error('Point arrays must have the same length');
  }
  
  return pointsA.map((p1, i) => {
    const p2 = pointsB[i];
    return distance2DSquared(p1, p2);
  });
};

/**
 * Performance benchmarking function to compare JS vs Rust implementations
 */
export const benchmarkJSDistanceCalculations = (iterations: number = 1000): {
  avgTime3D: number;
  avgTime3DSquared: number;
  avgTime2D: number;
  avgTime2DSquared: number;
  avgTimeProjection: number;
} => {
  // Generate test data
  const testPoints1: Point3D[] = [];
  const testPoints2: Point3D[] = [];
  
  for (let i = 0; i < iterations; i++) {
    testPoints1.push({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.random() * 100,
    });
    testPoints2.push({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.random() * 100,
    });
  }
  
  // Benchmark 3D distance
  const start3D = performance.now();
  for (let i = 0; i < iterations; i++) {
    distance3D(testPoints1[i], testPoints2[i]);
  }
  const avgTime3D = (performance.now() - start3D) / iterations;
  
  // Benchmark 3D squared distance
  const start3DSquared = performance.now();
  for (let i = 0; i < iterations; i++) {
    distance3DSquared(testPoints1[i], testPoints2[i]);
  }
  const avgTime3DSquared = (performance.now() - start3DSquared) / iterations;
  
  // Benchmark 2D distance
  const start2D = performance.now();
  for (let i = 0; i < iterations; i++) {
    distance2D(testPoints1[i], testPoints2[i]);
  }
  const avgTime2D = (performance.now() - start2D) / iterations;
  
  // Benchmark 2D squared distance
  const start2DSquared = performance.now();
  for (let i = 0; i < iterations; i++) {
    distance2DSquared(testPoints1[i], testPoints2[i]);
  }
  const avgTime2DSquared = (performance.now() - start2DSquared) / iterations;
  
  // Benchmark projection
  const startProjection = performance.now();
  for (let i = 0; i < iterations; i++) {
    const midIndex = Math.floor(iterations / 2);
    projectPointOnLine(testPoints1[i], testPoints2[i], testPoints1[midIndex]);
  }
  const avgTimeProjection = (performance.now() - startProjection) / iterations;
  
  return {
    avgTime3D,
    avgTime3DSquared,
    avgTime2D,
    avgTime2DSquared,
    avgTimeProjection,
  };
};

/**
 * Get connection point world position for buildings
 * This exactly matches the original JavaScript implementation for fallback
 */
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

/**
 * Get railway connection point world position for buildings
 * This exactly matches the original JavaScript implementation for fallback
 */
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
 * Find closest railway node within threshold
 * This exactly matches the original JavaScript implementation for fallback
 */
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

/**
 * Find closest railway snap point within threshold
 * This exactly matches the original JavaScript implementation for fallback
 */
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
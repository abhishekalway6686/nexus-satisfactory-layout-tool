// src/logic/pipe/pipeDrawing.ts
import { PipeSupport, PipeSegment, Point3D } from '../../types';
import { distance3D, distance3DSquared } from '../../utils/helpers';

/**
 * Creates a new pipe support at a given position
 */
export const createPipeSupport = (
  position: Point3D,
  floor: number,
  isAnchor: boolean = false
): PipeSupport => ({
  id: `support-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  x: position.x,
  y: position.y,
  z: position.z,
  floor,
  isAnchor,
});

/**
 * Validates pipe segment length and position
 */
export const validatePipeSegment = (
  startSupport: PipeSupport,
  endSupport: PipeSupport,
  maxLength: number
): { isValid: boolean; length: number; headLift?: number; error?: string } => {
  const length = distance3D(startSupport, endSupport);
  const headLift = Math.abs(endSupport.z - startSupport.z);
  
  if (length < 0.5) {
    return {
      isValid: false,
      length,
      headLift,
      error: 'Segment too short (minimum 0.5m)',
    };
  }
  
  if (length > maxLength) {
    return {
      isValid: false,
      length,
      headLift,
      error: `Segment too long (maximum ${maxLength}m)`,
    };
  }
  
  return {
    isValid: true,
    length,
    headLift: headLift > 0 ? headLift : undefined,
  };
};

/**
 * Gets preview path for pipe drawing
 */
export const getPipePreviewPath = (
  currentPath: PipeSupport[],
  mousePosition?: Point3D
): Point3D[] => {
  const points: Point3D[] = currentPath.map(support => ({ x: support.x, y: support.y, z: support.z }));
  
  if (mousePosition && currentPath.length > 0) {
    points.push(mousePosition);
  }
  
  return points;
};

/**
 * Calculates total pipeline length from segments
 */
export const calculatePipelineLength = (
  segments: PipeSegment[],
  supports: Record<string, PipeSupport>
): number => {
  return segments.reduce((total, segment) => {
    const startSupport = supports[segment.startSupport];
    const endSupport = supports[segment.endSupport];
    
    if (startSupport && endSupport) {
      return total + distance3D(startSupport, endSupport);
    }
    
    return total;
  }, 0);
};

/**
 * Calculates total head lift for a pipeline
 */
export const calculateTotalHeadLift = (
  segments: PipeSegment[]
): number => {
  return segments.reduce((total, segment) => {
    return total + (segment.headLift || 0);
  }, 0);
};

/**
 * Checks if a support can be placed at a position
 */
export const canPlaceSupport = (
  position: Point3D,
  existingSupports: Record<string, PipeSupport>,
  minDistance: number = 1.0
): { canPlace: boolean; conflictingSupport?: PipeSupport } => {
  for (const support of Object.values(existingSupports)) {
    const distSquared = distance3DSquared(position, support);
    if (distSquared < minDistance * minDistance) {
      return {
        canPlace: false,
        conflictingSupport: support,
      };
    }
  }
  
  return { canPlace: true };
};
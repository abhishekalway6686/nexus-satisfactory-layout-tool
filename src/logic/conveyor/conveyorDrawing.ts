// src/logic/conveyor/conveyorDrawing.ts
import { ConveyorPole, ConveyorSegment, Point3D } from '../../types';
import { distance3D, distance3DSquared } from '../../utils/helpers';

/**
 * Creates a new conveyor pole at a given position
 */
export const createConveyorPole = (
  position: Point3D,
  floor: number,
  isAnchor: boolean = false
): ConveyorPole => ({
  id: `pole-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  x: position.x,
  y: position.y,
  z: position.z,
  floor,
  isAnchor,
});

/**
 * Validates conveyor segment length and position
 */
export const validateConveyorSegment = (
  startPole: ConveyorPole,
  endPole: ConveyorPole,
  maxLength: number
): { isValid: boolean; length: number; error?: string } => {
  const length = distance3D(startPole, endPole);
  
  if (length < 0.5) {
    return {
      isValid: false,
      length,
      error: 'Segment too short (minimum 0.5m)',
    };
  }
  
  if (length > maxLength) {
    return {
      isValid: false,
      length,
      error: `Segment too long (maximum ${maxLength}m)`,
    };
  }
  
  return {
    isValid: true,
    length,
  };
};

/**
 * Gets preview path for conveyor drawing
 */
export const getConveyorPreviewPath = (
  currentPath: ConveyorPole[],
  mousePosition?: Point3D
): Point3D[] => {
  const points: Point3D[] = currentPath.map(pole => ({ x: pole.x, y: pole.y, z: pole.z }));
  
  if (mousePosition && currentPath.length > 0) {
    points.push(mousePosition);
  }
  
  return points;
};

/**
 * Calculates total belt length from segments
 */
export const calculateBeltLength = (
  segments: ConveyorSegment[],
  poles: Record<string, ConveyorPole>
): number => {
  return segments.reduce((total, segment) => {
    const startPole = poles[segment.startPole];
    const endPole = poles[segment.endPole];
    
    if (startPole && endPole) {
      return total + distance3D(startPole, endPole);
    }
    
    return total;
  }, 0);
};

/**
 * Checks if a pole can be placed at a position
 */
export const canPlacePole = (
  position: Point3D,
  existingPoles: Record<string, ConveyorPole>,
  minDistance: number = 1.0
): { canPlace: boolean; conflictingPole?: ConveyorPole } => {
  for (const pole of Object.values(existingPoles)) {
    const distSquared = distance3DSquared(position, pole);
    if (distSquared < minDistance * minDistance) {
      return {
        canPlace: false,
        conflictingPole: pole,
      };
    }
  }
  
  return { canPlace: true };
};
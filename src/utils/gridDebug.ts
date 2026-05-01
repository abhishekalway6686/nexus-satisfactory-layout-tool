// Debug utility to verify grid calculations
import { FOUNDATION_SIZE, GRID_SIZE, PIXELS_PER_METER } from '../constants';

export function debugGridCalculations(
  width: number,
  height: number,
  scale: number,
  stageX: number,
  stageY: number
) {
  console.group('Grid Debug Info');
  
  // Grid sizes
  const majorGridSize = FOUNDATION_SIZE * PIXELS_PER_METER;
  const minorGridSize = GRID_SIZE * PIXELS_PER_METER;
  
  console.log('Grid sizes:', {
    majorGridSize,
    minorGridSize,
    FOUNDATION_SIZE,
    GRID_SIZE,
    PIXELS_PER_METER
  });
  
  // World coordinates
  const worldLeft = -stageX / scale;
  const worldTop = -stageY / scale;
  const worldRight = worldLeft + width / scale;
  const worldBottom = worldTop + height / scale;
  
  console.log('World bounds:', {
    worldLeft,
    worldTop,
    worldRight,
    worldBottom
  });
  
  // View bounds with padding
  const padding = majorGridSize * 2;
  const viewLeft = worldLeft - padding;
  const viewRight = worldRight + padding;
  const viewTop = worldTop - padding;
  const viewBottom = worldBottom + padding;
  
  console.log('View bounds with padding:', {
    viewLeft,
    viewRight,
    viewTop,
    viewBottom,
    padding
  });
  
  // Grid step
  const majorStep = scale < 0.1 ? majorGridSize * 8 :
                   scale < 0.2 ? majorGridSize * 4 :
                   scale < 0.4 ? majorGridSize * 2 :
                   majorGridSize;
  
  console.log('Major step:', majorStep);
  
  // Grid line positions
  const startX = Math.floor(viewLeft / majorStep) * majorStep;
  const endX = Math.ceil(viewRight / majorStep) * majorStep;
  const startY = Math.floor(viewTop / majorStep) * majorStep;
  const endY = Math.ceil(viewBottom / majorStep) * majorStep;
  
  console.log('Grid line positions:', {
    startX,
    endX,
    startY,
    endY
  });
  
  // Line counts
  const numVerticalLines = Math.ceil((endX - startX) / majorStep);
  const numHorizontalLines = Math.ceil((endY - startY) / majorStep);
  
  console.log('Line counts:', {
    numVerticalLines,
    numHorizontalLines,
    total: numVerticalLines + numHorizontalLines
  });
  
  console.groupEnd();
}
// src/components/Canvas/GridBackground.tsx - Optimized grid rendering with performance improvements

import React, { useMemo } from 'react';
import { Line, Circle, Group } from 'react-konva';
import { FOUNDATION_SIZE, GRID_SIZE, PIXELS_PER_METER } from '../../constants';

interface GridBackgroundProps {
  width: number;
  height: number;
  scale: number;
  showGrid: boolean;
  stageX: number;
  stageY: number;
  stageRef?: React.RefObject<unknown>;
}

export const GridBackground = React.memo<GridBackgroundProps>(({ 
  width, 
  height, 
  scale, 
  showGrid,
  stageX,
  stageY
}) => {
  // Early return if grid is explicitly hidden
  if (!showGrid) return null;
  
  // If dimensions are not ready yet, return null
  // This ensures the component re-renders when dimensions become valid
  if (width <= 0 || height <= 0) {
    return null;
  }
  
  // Ensure scale is valid (default to 1 if not)
  const validScale = scale > 0 ? scale : 1;

  // Calculate grid lines with viewport culling
  const gridElements = useMemo(() => {
    const elements: React.ReactElement[] = [];
    
    // Grid sizes in pixels
    const majorGridSize = FOUNDATION_SIZE * PIXELS_PER_METER; // 8 * 10 = 80
    const minorGridSize = GRID_SIZE * PIXELS_PER_METER; // 4 * 10 = 40 (half-foundation snap grid)
    
    // Dynamic stroke widths based on zoom
    const majorStrokeWidth = Math.max(0.5, Math.min(2, 1.5 / validScale));
    const minorStrokeWidth = Math.max(0.25, Math.min(1, 0.5 / validScale));
    
    // Feature toggles based on performance and zoom
    // Minor grid shows snap points (4m half-foundation) - visible at most zoom levels
    const showMinorGrid = validScale > 0.3 && validScale <= 1.5;
    // Show snap dots at high zoom for precise placement (at 4m grid intersections)
    const showSnapDots = validScale > 0.8;
    const showOriginIndicator = validScale > 0.2;
    
    // Calculate visible bounds in world coordinates
    const worldLeft = -stageX / validScale;
    const worldTop = -stageY / validScale;
    const worldRight = worldLeft + width / validScale;
    const worldBottom = worldTop + height / validScale;
    
    // Add padding to ensure smooth scrolling
    const padding = majorGridSize * 2;
    const viewLeft = worldLeft - padding;
    const viewRight = worldRight + padding;
    const viewTop = worldTop - padding;
    const viewBottom = worldBottom + padding;
    
    // Calculate grid step multiplier based on zoom
    const majorStep = validScale < 0.1 ? majorGridSize * 8 :
                     validScale < 0.2 ? majorGridSize * 4 :
                     validScale < 0.4 ? majorGridSize * 2 :
                     majorGridSize;
    
    // Calculate start and end positions
    const startX = Math.floor(viewLeft / majorStep) * majorStep;
    const endX = Math.ceil(viewRight / majorStep) * majorStep;
    const startY = Math.floor(viewTop / majorStep) * majorStep;
    const endY = Math.ceil(viewBottom / majorStep) * majorStep;
    
    // Limit maximum number of lines for performance
    const maxLines = 200;
    const numVerticalLines = Math.abs((endX - startX) / majorStep);
    const numHorizontalLines = Math.abs((endY - startY) / majorStep);
    
    // Safety check to prevent infinite loops
    if (majorStep <= 0 || !isFinite(startX) || !isFinite(endX) || !isFinite(startY) || !isFinite(endY)) {
      return elements;
    }
    
    if (numVerticalLines + numHorizontalLines > maxLines) {
      // Increase step size to reduce line count
      const factor = Math.ceil((numVerticalLines + numHorizontalLines) / maxLines);
      const safeStep = majorStep * factor;
      
      // Recalculate with safe step
      const safeStartX = Math.floor(viewLeft / safeStep) * safeStep;
      const safeEndX = Math.ceil(viewRight / safeStep) * safeStep;
      const safeStartY = Math.floor(viewTop / safeStep) * safeStep;
      const safeEndY = Math.ceil(viewBottom / safeStep) * safeStep;
      
      // Render reduced grid
      for (let x = safeStartX; x <= safeEndX && x < safeEndX + safeStep; x += safeStep) {
        elements.push(
          <Line
            key={`v-safe-${x}`}
            points={[x, viewTop, x, viewBottom]}
            stroke="rgba(250, 149, 73, 0.3)"
            strokeWidth={majorStrokeWidth}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      }
      
      for (let y = safeStartY; y <= safeEndY && y < safeEndY + safeStep; y += safeStep) {
        elements.push(
          <Line
            key={`h-safe-${y}`}
            points={[viewLeft, y, viewRight, y]}
            stroke="rgba(250, 149, 73, 0.3)"
            strokeWidth={majorStrokeWidth}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      }
      
      return elements;
    }
    
    // Render major vertical lines
    let verticalCount = 0;
    for (let x = startX; x <= endX && verticalCount < maxLines/2; x += majorStep) {
      const isOrigin = Math.abs(x) < 0.01;
      const opacity = validScale < 0.3 ? 0.4 : validScale < 0.6 ? 0.6 : 0.8;
      
      elements.push(
        <Line
          key={`v-major-${x}`}
          points={[x, viewTop, x, viewBottom]}
          stroke={isOrigin ? '#fa9549' : 'rgba(250, 149, 73, 0.4)'}
          strokeWidth={isOrigin ? majorStrokeWidth * 1.5 : majorStrokeWidth}
          opacity={isOrigin ? 1 : opacity}
          listening={false}
          perfectDrawEnabled={false}
          shadowEnabled={false}
        />
      );
      verticalCount++;
    }
    
    // Render major horizontal lines
    let horizontalCount = 0;
    for (let y = startY; y <= endY && horizontalCount < maxLines/2; y += majorStep) {
      const isOrigin = Math.abs(y) < 0.01;
      const opacity = validScale < 0.3 ? 0.4 : validScale < 0.6 ? 0.6 : 0.8;
      
      elements.push(
        <Line
          key={`h-major-${y}`}
          points={[viewLeft, y, viewRight, y]}
          stroke={isOrigin ? '#fa9549' : 'rgba(250, 149, 73, 0.4)'}
          strokeWidth={isOrigin ? majorStrokeWidth * 1.5 : majorStrokeWidth}
          opacity={isOrigin ? 1 : opacity}
          listening={false}
          perfectDrawEnabled={false}
          shadowEnabled={false}
        />
      );
      horizontalCount++;
    }
    
    // Render minor grid if appropriate zoom level (shows 4m half-foundation snap points)
    if (showMinorGrid) {
      // Show 4m grid (half-foundation) - this matches the snap point density
      const minorStep = minorGridSize;
      const minorStartX = Math.floor(viewLeft / minorStep) * minorStep;
      const minorEndX = Math.ceil(viewRight / minorStep) * minorStep;
      const minorStartY = Math.floor(viewTop / minorStep) * minorStep;
      const minorEndY = Math.ceil(viewBottom / minorStep) * minorStep;

      // Check line count for minor grid - allow more lines for better coverage
      const numMinorVertical = Math.abs((minorEndX - minorStartX) / minorStep);
      const numMinorHorizontal = Math.abs((minorEndY - minorStartY) / minorStep);
      const maxMinorLines = 300; // Increased limit for minor grid

      if (numMinorVertical + numMinorHorizontal < maxMinorLines && minorStep > 0) {
        // Calculate opacity based on zoom - more visible at higher zoom
        const minorOpacity = validScale < 0.8 ? 0.15 : validScale < 1.0 ? 0.2 : 0.25;

        // Render minor vertical lines
        let minorVCount = 0;
        for (let x = minorStartX; x <= minorEndX && minorVCount < maxMinorLines / 2; x += minorStep) {
          // Skip if overlaps with major grid
          if (Math.abs(x % majorStep) < 0.01) continue;

          elements.push(
            <Line
              key={`v-minor-${x}`}
              points={[x, viewTop, x, viewBottom]}
              stroke={`rgba(250, 149, 73, ${minorOpacity})`}
              strokeWidth={minorStrokeWidth}
              listening={false}
              perfectDrawEnabled={false}
              shadowEnabled={false}
            />
          );
          minorVCount++;
        }

        // Render minor horizontal lines
        let minorHCount = 0;
        for (let y = minorStartY; y <= minorEndY && minorHCount < maxMinorLines / 2; y += minorStep) {
          // Skip if overlaps with major grid
          if (Math.abs(y % majorStep) < 0.01) continue;

          elements.push(
            <Line
              key={`h-minor-${y}`}
              points={[viewLeft, y, viewRight, y]}
              stroke={`rgba(250, 149, 73, ${minorOpacity})`}
              strokeWidth={minorStrokeWidth}
              listening={false}
              perfectDrawEnabled={false}
              shadowEnabled={false}
            />
          );
          minorHCount++;
        }
      }
    }

    // Render snap point dots at high zoom levels for precise placement
    if (showSnapDots) {
      const dotStep = minorGridSize; // 4m snap points (half-foundation)
      const dotStartX = Math.floor(viewLeft / dotStep) * dotStep;
      const dotEndX = Math.ceil(viewRight / dotStep) * dotStep;
      const dotStartY = Math.floor(viewTop / dotStep) * dotStep;
      const dotEndY = Math.ceil(viewBottom / dotStep) * dotStep;

      // Calculate how many dots we'd render
      const numDotsX = Math.abs((dotEndX - dotStartX) / dotStep);
      const numDotsY = Math.abs((dotEndY - dotStartY) / dotStep);
      const totalDots = numDotsX * numDotsY;
      const maxDots = 2000; // Limit for performance

      if (totalDots < maxDots && dotStep > 0) {
        const dotRadius = Math.max(0.5, Math.min(1.5, 1 / validScale));
        const dotOpacity = validScale < 1.2 ? 0.3 : 0.4;

        for (let x = dotStartX; x <= dotEndX; x += dotStep) {
          for (let y = dotStartY; y <= dotEndY; y += dotStep) {
            // Skip dots on major grid intersections (they're already marked)
            const onMajorX = Math.abs(x % majorStep) < 0.01;
            const onMajorY = Math.abs(y % majorStep) < 0.01;
            if (onMajorX && onMajorY) continue;

            elements.push(
              <Circle
                key={`dot-${x}-${y}`}
                x={x}
                y={y}
                radius={dotRadius}
                fill={`rgba(250, 149, 73, ${dotOpacity})`}
                listening={false}
                perfectDrawEnabled={false}
              />
            );
          }
        }
      }
    }
    
    // Render origin indicator
    if (showOriginIndicator && 
        viewLeft <= 0 && viewRight >= 0 && 
        viewTop <= 0 && viewBottom >= 0) {
      
      const originSize = Math.max(3, Math.min(8, 5 / validScale));
      const ringSize = Math.max(6, Math.min(15, 10 / validScale));
      
      elements.push(
        <Group key="origin">
          <Circle
            x={0}
            y={0}
            radius={ringSize}
            stroke="rgba(250, 149, 73, 0.6)"
            strokeWidth={Math.max(0.5, 1 / validScale)}
            listening={false}
          />
          <Circle
            x={0}
            y={0}
            radius={originSize}
            fill="#fa9549"
            listening={false}
          />
        </Group>
      );
    }
    
    return elements;
  }, [width, height, validScale, stageX, stageY]);

  return <>{gridElements}</>;
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.showGrid === nextProps.showGrid &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    Math.abs(prevProps.scale - nextProps.scale) < 0.001 &&
    Math.abs(prevProps.stageX - nextProps.stageX) < 1 &&
    Math.abs(prevProps.stageY - nextProps.stageY) < 1
  );
});

GridBackground.displayName = 'GridBackground';
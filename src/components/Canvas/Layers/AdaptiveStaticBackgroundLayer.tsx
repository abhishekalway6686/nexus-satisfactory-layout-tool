/**
 * Adaptive Static Background Layer - GPU-optimized grid and background rendering
 * Uses renderer abstraction for efficient grid rendering across different backends
 */

import React, { useMemo } from 'react';
import { RendererAdapter } from '../../../renderer/adapters/RendererAdapter';
import { GRID_SIZE, PIXELS_PER_METER } from '../../../constants';

interface AdaptiveStaticBackgroundLayerProps {
  adapter: RendererAdapter;
  scale: number;
  position: { x: number; y: number };
  canvasSize: { width: number; height: number };
}

export const AdaptiveStaticBackgroundLayer: React.FC<AdaptiveStaticBackgroundLayerProps> = ({
  adapter,
  scale,
  position,
  canvasSize
}) => {
  // Calculate visible area for performance optimization
  const visibleBounds = useMemo(() => {
    const padding = 100; // Extra padding to prevent grid popping
    return {
      left: (-position.x - padding) / scale,
      top: (-position.y - padding) / scale,
      right: (-position.x + canvasSize.width + padding) / scale,
      bottom: (-position.y + canvasSize.height + padding) / scale
    };
  }, [position, scale, canvasSize]);

  // Grid configuration based on zoom level
  const gridConfig = useMemo(() => {
    const gridPixelSize = GRID_SIZE * PIXELS_PER_METER * scale;
    
    // Adaptive grid density based on zoom level
    let gridStep = 1;
    let opacity = 0.3;
    let strokeWidth = 1;
    
    if (gridPixelSize < 10) {
      // Very zoomed out - hide minor grid, show major grid only
      gridStep = 8;
      opacity = 0.2;
      strokeWidth = 1;
    } else if (gridPixelSize < 20) {
      // Zoomed out - show every 4th grid line
      gridStep = 4;
      opacity = 0.25;
      strokeWidth = 1;
    } else if (gridPixelSize < 40) {
      // Medium zoom - show every 2nd grid line
      gridStep = 2;
      opacity = 0.3;
      strokeWidth = 1;
    } else {
      // Zoomed in - show all grid lines
      gridStep = 1;
      opacity = gridPixelSize > 80 ? 0.4 : 0.35;
      strokeWidth = gridPixelSize > 80 ? 1.5 : 1;
    }

    return {
      gridStep,
      opacity,
      strokeWidth,
      pixelSize: gridPixelSize,
      worldSize: GRID_SIZE * gridStep
    };
  }, [scale]);

  // GPU optimization: use different strategies for WebGL vs Konva
  const isGPURenderer = adapter.isGPURenderer();

  // Generate grid lines
  const gridLines = useMemo(() => {
    const { gridStep, worldSize } = gridConfig;
    const lines: { points: number[]; isHorizontal: boolean }[] = [];

    // Calculate grid bounds in world coordinates
    const startX = Math.floor(visibleBounds.left / worldSize) * worldSize;
    const endX = Math.ceil(visibleBounds.right / worldSize) * worldSize;
    const startY = Math.floor(visibleBounds.top / worldSize) * worldSize;
    const endY = Math.ceil(visibleBounds.bottom / worldSize) * worldSize;

    // Vertical lines
    for (let x = startX; x <= endX; x += worldSize) {
      const screenX = x * PIXELS_PER_METER;
      lines.push({
        points: [
          screenX, visibleBounds.top * PIXELS_PER_METER,
          screenX, visibleBounds.bottom * PIXELS_PER_METER
        ],
        isHorizontal: false
      });
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += worldSize) {
      const screenY = y * PIXELS_PER_METER;
      lines.push({
        points: [
          visibleBounds.left * PIXELS_PER_METER, screenY,
          visibleBounds.right * PIXELS_PER_METER, screenY
        ],
        isHorizontal: true
      });
    }

    return lines;
  }, [visibleBounds, gridConfig]);

  // Background color
  const backgroundColor = '#F5F5F5';

  // GPU-specific optimizations
  if (isGPURenderer && gridLines.length > 100) {
    // For WebGL with many grid lines, batch them into single draw calls
    const verticalLines = gridLines.filter(line => !line.isHorizontal).map(line => line.points).flat();
    const horizontalLines = gridLines.filter(line => line.isHorizontal).map(line => line.points).flat();

    return adapter.createGroup({
      id: 'background-gpu-optimized',
      children: (
        <>
          {/* Background rectangle */}
          {adapter.createRect({
            id: 'background-rect',
            x: visibleBounds.left * PIXELS_PER_METER,
            y: visibleBounds.top * PIXELS_PER_METER,
            width: (visibleBounds.right - visibleBounds.left) * PIXELS_PER_METER,
            height: (visibleBounds.bottom - visibleBounds.top) * PIXELS_PER_METER,
            fill: backgroundColor
          })}

          {/* Batched vertical grid lines */}
          {verticalLines.length > 0 && adapter.createLine({
            id: 'grid-vertical-batch',
            points: verticalLines,
            stroke: '#E0E0E0',
            strokeWidth: gridConfig.strokeWidth,
            opacity: gridConfig.opacity
          })}

          {/* Batched horizontal grid lines */}
          {horizontalLines.length > 0 && adapter.createLine({
            id: 'grid-horizontal-batch',
            points: horizontalLines,
            stroke: '#E0E0E0',
            strokeWidth: gridConfig.strokeWidth,
            opacity: gridConfig.opacity
          })}
        </>
      )
    });
  }

  // Standard rendering for Konva or fewer grid lines
  return adapter.createGroup({
    id: 'background-standard',
    children: (
      <>
        {/* Background rectangle */}
        {adapter.createRect({
          id: 'background-rect',
          x: visibleBounds.left * PIXELS_PER_METER,
          y: visibleBounds.top * PIXELS_PER_METER,
          width: (visibleBounds.right - visibleBounds.left) * PIXELS_PER_METER,
          height: (visibleBounds.bottom - visibleBounds.top) * PIXELS_PER_METER,
          fill: backgroundColor
        })}

        {/* Origin indicator (always visible) */}
        {adapter.createLine({
          id: 'origin-x-axis',
          points: [-50, 0, 50, 0],
          stroke: '#FF5722',
          strokeWidth: 2,
          opacity: 0.7
        })}

        {adapter.createLine({
          id: 'origin-y-axis',
          points: [0, -50, 0, 50],
          stroke: '#FF5722',
          strokeWidth: 2,
          opacity: 0.7
        })}

        {/* Grid lines */}
        {gridLines.map((line, index) => 
          adapter.createLine({
            id: `grid-line-${index}`,
            points: line.points,
            stroke: '#E0E0E0',
            strokeWidth: gridConfig.strokeWidth,
            opacity: gridConfig.opacity,
            lineCap: 'butt'
          })
        )}

        {/* Major grid lines (every 10 units) if zoomed in enough */}
        {gridConfig.pixelSize > 40 && (() => {
          const majorGridLines: { points: number[] }[] = [];
          const majorGridSize = GRID_SIZE * 10; // 10 meter intervals
          
          // Major vertical lines
          const majorStartX = Math.floor(visibleBounds.left / majorGridSize) * majorGridSize;
          const majorEndX = Math.ceil(visibleBounds.right / majorGridSize) * majorGridSize;
          
          for (let x = majorStartX; x <= majorEndX; x += majorGridSize) {
            const screenX = x * PIXELS_PER_METER;
            majorGridLines.push({
              points: [
                screenX, visibleBounds.top * PIXELS_PER_METER,
                screenX, visibleBounds.bottom * PIXELS_PER_METER
              ]
            });
          }

          // Major horizontal lines
          const majorStartY = Math.floor(visibleBounds.top / majorGridSize) * majorGridSize;
          const majorEndY = Math.ceil(visibleBounds.bottom / majorGridSize) * majorGridSize;
          
          for (let y = majorStartY; y <= majorEndY; y += majorGridSize) {
            const screenY = y * PIXELS_PER_METER;
            majorGridLines.push({
              points: [
                visibleBounds.left * PIXELS_PER_METER, screenY,
                visibleBounds.right * PIXELS_PER_METER, screenY
              ]
            });
          }

          return majorGridLines.map((line, index) => 
            adapter.createLine({
              id: `major-grid-line-${index}`,
              points: line.points,
              stroke: '#BDBDBD',
              strokeWidth: Math.max(1, gridConfig.strokeWidth),
              opacity: Math.min(0.6, gridConfig.opacity + 0.2),
              lineCap: 'butt'
            })
          );
        })()}

        {/* Coordinate labels for major grid lines (very high zoom only) */}
        {gridConfig.pixelSize > 100 && (() => {
          const labels: { x: number; y: number; text: string }[] = [];
          const labelGridSize = GRID_SIZE * 10;
          
          // Add coordinate labels every 10 units
          const labelStartX = Math.floor(visibleBounds.left / labelGridSize) * labelGridSize;
          const labelEndX = Math.ceil(visibleBounds.right / labelGridSize) * labelGridSize;
          
          for (let x = labelStartX; x <= labelEndX; x += labelGridSize) {
            if (x !== 0) { // Skip origin
              labels.push({
                x: x * PIXELS_PER_METER,
                y: 15,
                text: `${x}m`
              });
            }
          }

          const labelStartY = Math.floor(visibleBounds.top / labelGridSize) * labelGridSize;
          const labelEndY = Math.ceil(visibleBounds.bottom / labelGridSize) * labelGridSize;
          
          for (let y = labelStartY; y <= labelEndY; y += labelGridSize) {
            if (y !== 0) { // Skip origin
              labels.push({
                x: 15,
                y: y * PIXELS_PER_METER,
                text: `${y}m`
              });
            }
          }

          return labels.map((label, index) => 
            adapter.createText({
              id: `grid-label-${index}`,
              x: label.x,
              y: label.y,
              text: label.text,
              fontSize: 10,
              fontFamily: 'Arial',
              fill: '#666',
              opacity: 0.7
            })
          );
        })()}
      </>
    )
  });
};

export default AdaptiveStaticBackgroundLayer;
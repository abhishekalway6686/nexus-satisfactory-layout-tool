/**
 * Adaptive Railway Drawing Preview - GPU-accelerated railway preview
 * Uses renderer abstraction for optimal performance across Konva and WebGL
 */

import React, { useMemo, useEffect, useState } from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { useLayoutStore } from '../../store/layoutStore';
import { useShallow } from 'zustand/react/shallow';
import { PIXELS_PER_METER } from '../../constants';

interface AdaptiveRailwayDrawingPreviewProps {
  adapter: RendererAdapter;
}

// Railway colors
const RAILWAY_COLORS = {
  preview: '#FFC107',
  rails: '#795548',
  ties: '#424242',
  valid: '#4CAF50',
  invalid: '#F44336',
  ghost: 'rgba(255, 193, 7, 0.5)'
};

export const AdaptiveRailwayDrawingPreview: React.FC<AdaptiveRailwayDrawingPreviewProps> = ({
  adapter
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const {
    drawingRailway,
    railwayNodes,
    isDrawingRailway,
    currentFloor
  } = useLayoutStore(useShallow((state) => ({
    drawingRailway: state.drawingRailway,
    railwayNodes: state.railwayNodes,
    isDrawingRailway: state.isDrawingRailway,
    currentFloor: state.currentFloor
  })));

  // Track mouse position for preview
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawingRailway) return;
      
      const worldPos = adapter.screenToWorld({ x: e.clientX, y: e.clientY });
      setMousePosition(worldPos);
    };

    if (isDrawingRailway) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isDrawingRailway, adapter]);

  // Calculate railway preview path
  const previewPath = useMemo(() => {
    if (!isDrawingRailway || !drawingRailway?.startNode) return null;

    const startNode = railwayNodes.find(node => node.id === drawingRailway.startNode);
    if (!startNode) return null;

    const startX = startNode.x * PIXELS_PER_METER;
    const startY = startNode.y * PIXELS_PER_METER;
    const endX = mousePosition.x;
    const endY = mousePosition.y;

    // Calculate smooth curve points for railway
    const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    const curveIntensity = Math.min(distance * 0.2, 100); // Limit curve intensity

    // Control points for smooth curves
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    // Calculate perpendicular offset for curve
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < 10) {
      return {
        points: [startX, startY, endX, endY],
        isValid: false,
        distance: length
      };
    }

    const perpX = -dy / length * curveIntensity;
    const perpY = dx / length * curveIntensity;

    // Create smooth bezier-like curve with multiple points
    const points: number[] = [];
    const segments = Math.max(8, Math.floor(distance / 20)); // More segments for longer railways

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const t2 = t * t;
      const t3 = t2 * t;
      
      // Cubic bezier curve
      const cp1X = startX + perpX * 0.3;
      const cp1Y = startY + perpY * 0.3;
      const cp2X = endX + perpX * 0.3;
      const cp2Y = endY + perpY * 0.3;
      
      const x = (1 - t3) * startX + 3 * (1 - t2) * t * cp1X + 3 * (1 - t) * t2 * cp2X + t3 * endX;
      const y = (1 - t3) * startY + 3 * (1 - t2) * t * cp1Y + 3 * (1 - t) * t2 * cp2Y + t3 * endY;
      
      points.push(x, y);
    }

    return {
      points,
      isValid: distance > 20 && distance < 2000, // Valid range
      distance: length
    };
  }, [isDrawingRailway, drawingRailway, railwayNodes, mousePosition]);

  if (!isDrawingRailway || !previewPath) return null;

  const { points, isValid, distance } = previewPath;
  const isGPURenderer = adapter.isGPURenderer();

  // GPU optimization: use batched rendering for complex railway curves
  if (isGPURenderer && points.length > 20) {
    // For WebGL, we can render the entire railway as a single batched operation
    return adapter.createGroup({
      id: 'railway-preview-gpu',
      children: (
        <>
          {/* Main railway line */}
          {adapter.createLine({
            id: 'railway-preview-main',
            points: points,
            stroke: isValid ? RAILWAY_COLORS.valid : RAILWAY_COLORS.invalid,
            strokeWidth: 8,
            lineCap: 'round',
            lineJoin: 'round',
            opacity: 0.8
          })}

          {/* Railway rails (parallel lines) */}
          {adapter.createLine({
            id: 'railway-preview-rail1',
            points: points.map((p, i) => {
              if (i % 2 === 0) {
                // X coordinate - offset by rail width
                const nextX = points[i + 2] || points[i];
                const nextY = points[i + 3] || points[i + 1];
                const dx = nextX - p;
                const dy = nextY - points[i + 1];
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 0) {
                  return p + (-dy / len) * 3;
                }
              } else {
                // Y coordinate - offset by rail width
                const prevX = points[i - 1];
                const nextX = points[i + 1] || prevX;
                const nextY = points[i + 2] || p;
                const dx = nextX - prevX;
                const dy = nextY - p;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 0) {
                  return p + (dx / len) * 3;
                }
              }
              return p;
            }),
            stroke: RAILWAY_COLORS.rails,
            strokeWidth: 2,
            lineCap: 'round'
          })}

          {adapter.createLine({
            id: 'railway-preview-rail2',
            points: points.map((p, i) => {
              if (i % 2 === 0) {
                const nextX = points[i + 2] || points[i];
                const nextY = points[i + 3] || points[i + 1];
                const dx = nextX - p;
                const dy = nextY - points[i + 1];
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 0) {
                  return p + (dy / len) * 3;
                }
              } else {
                const prevX = points[i - 1];
                const nextX = points[i + 1] || prevX;
                const nextY = points[i + 2] || p;
                const dx = nextX - prevX;
                const dy = nextY - p;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 0) {
                  return p + (-dx / len) * 3;
                }
              }
              return p;
            }),
            stroke: RAILWAY_COLORS.rails,
            strokeWidth: 2,
            lineCap: 'round'
          })}
        </>
      )
    });
  }

  // Standard rendering for Konva or simple curves
  return adapter.createGroup({
    id: 'railway-preview-standard',
    children: (
      <>
        {/* Ghost line for feedback */}
        {adapter.createLine({
          id: 'railway-preview-ghost',
          points: points,
          stroke: RAILWAY_COLORS.ghost,
          strokeWidth: 12,
          lineCap: 'round',
          lineJoin: 'round',
          opacity: 0.3
        })}

        {/* Main preview line */}
        {adapter.createLine({
          id: 'railway-preview-main',
          points: points,
          stroke: isValid ? RAILWAY_COLORS.valid : RAILWAY_COLORS.invalid,
          strokeWidth: 6,
          lineCap: 'round',
          lineJoin: 'round',
          dash: isValid ? undefined : [10, 5]
        })}

        {/* Distance indicator */}
        {isValid && distance > 50 && adapter.createText({
          id: 'railway-preview-distance',
          x: (points[0] + points[points.length - 2]) / 2,
          y: (points[1] + points[points.length - 1]) / 2 - 20,
          text: `${Math.round(distance / PIXELS_PER_METER)}m`,
          fontSize: 12,
          fontFamily: 'Arial',
          fill: '#333',
          align: 'center'
        })}

        {/* End point indicator */}
        {adapter.createCircle({
          id: 'railway-preview-endpoint',
          x: points[points.length - 2],
          y: points[points.length - 1],
          radius: 6,
          fill: isValid ? RAILWAY_COLORS.valid : RAILWAY_COLORS.invalid,
          stroke: '#FFFFFF',
          strokeWidth: 2
        })}
      </>
    )
  });
};

export default AdaptiveRailwayDrawingPreview;
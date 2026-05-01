// src/components/Canvas/GridBackgroundCanvas.tsx - Ultra-performant canvas-based grid rendering

import React, { useRef, useEffect } from 'react';
import { FOUNDATION_SIZE, GRID_SIZE, PIXELS_PER_METER } from '../../constants';

interface GridBackgroundCanvasProps {
  width: number;
  height: number;
  scale: number;
  showGrid: boolean;
  stageX: number;
  stageY: number;
}

export const GridBackgroundCanvas = React.memo<GridBackgroundCanvasProps>(({ 
  width, 
  height, 
  scale, 
  showGrid,
  stageX,
  stageY
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastRenderRef = useRef({ x: stageX, y: stageY, scale });
  
  // PERFORMANCE: Cache grid calculations to prevent recalculation
  const gridCacheRef = useRef<{
    scale: number;
    majorGridPath?: Path2D;
    minorGridPath?: Path2D;
    originPath?: Path2D;
    bounds?: { left: number; right: number; top: number; bottom: number };
  }>({ scale: -1 });
  
  // PERFORMANCE: Use transform-based positioning when possible
  const lastTransformRef = useRef({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    if (!showGrid || !canvasRef.current) return;
    
    // Safety check: prevent zero or invalid dimensions
    if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
      console.warn('⚠️ GridBackgroundCanvas: Invalid dimensions', { width, height });
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match actual display size
    canvas.width = width;
    canvas.height = height;

    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // PERFORMANCE: Check if we can use cached grid or transform optimization
    const scaleChanged = Math.abs(scale - gridCacheRef.current.scale) > 0.001;
    const positionChanged = Math.abs(stageX - lastTransformRef.current.x) > 5 || 
                           Math.abs(stageY - lastTransformRef.current.y) > 5;
    const sizeChanged = Math.abs(scale - lastTransformRef.current.scale) > 0.001;

    // PERFORMANCE: Optimize rendering with caching and transform reuse
    animationFrameRef.current = requestAnimationFrame(() => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Grid configuration
      const majorGridSize = FOUNDATION_SIZE * PIXELS_PER_METER;
      const minorGridSize = GRID_SIZE * PIXELS_PER_METER;

      // Stroke widths based on scale
      const majorStrokeWidth = Math.max(0.2, Math.min(3, 2 / Math.max(scale, 0.01)));
      const minorStrokeWidth = Math.max(0.1, Math.min(1.5, 0.8 / Math.max(scale, 0.01)));

      // Performance toggles
      const showMinorGrid = scale > 0.5 && scale < 1.5;
      const showOriginDetails = scale > 0.2;

      // Convert to world coordinates
      const worldLeft = -stageX / scale;
      const worldTop = -stageY / scale;
      const worldRight = worldLeft + width / scale;
      const worldBottom = worldTop + height / scale;

      // PERFORMANCE: Use smaller padding but ensure smooth scrolling
      const padding = majorGridSize;
      const gridLeft = worldLeft - padding;
      const gridRight = worldRight + padding;
      const gridTop = worldTop - padding;
      const gridBottom = worldBottom + padding;
      
      // Check if we can use cached grid paths
      const needsGridRecalculation = scaleChanged || !gridCacheRef.current.majorGridPath ||
        !gridCacheRef.current.bounds || 
        gridLeft < gridCacheRef.current.bounds.left ||
        gridRight > gridCacheRef.current.bounds.right ||
        gridTop < gridCacheRef.current.bounds.top ||
        gridBottom > gridCacheRef.current.bounds.bottom;

      // Grid step size based on zoom
      const majorStepSize = scale < 0.05 ? majorGridSize * 8 :
                           scale < 0.1 ? majorGridSize * 4 :
                           scale < 0.25 ? majorGridSize * 2 :
                           majorGridSize;

      // Save context state
      ctx.save();

      // Apply world transform
      ctx.translate(stageX, stageY);
      ctx.scale(scale, scale);
      
      // PERFORMANCE: Rebuild grid paths only when necessary
      if (needsGridRecalculation) {
        // Update cache
        gridCacheRef.current = {
          scale,
          majorGridPath: new Path2D(),
          minorGridPath: new Path2D(),
          originPath: new Path2D(),
          bounds: { 
            left: gridLeft - majorGridSize,
            right: gridRight + majorGridSize,
            top: gridTop - majorGridSize,
            bottom: gridBottom + majorGridSize
          }
        };

        // Build minor grid path (if visible)
        if (showMinorGrid && gridCacheRef.current.minorGridPath) {
          const minorStepSize = scale < 0.8 ? minorGridSize * 2 : minorGridSize;
          const bounds = gridCacheRef.current.bounds!;
          
          // Vertical lines
          for (let x = Math.floor(bounds.left / minorStepSize) * minorStepSize; x <= bounds.right; x += minorStepSize) {
            if (Math.abs(x % majorStepSize) > 0.01) {
              gridCacheRef.current.minorGridPath.moveTo(x, bounds.top);
              gridCacheRef.current.minorGridPath.lineTo(x, bounds.bottom);
            }
          }
          
          // Horizontal lines
          for (let y = Math.floor(bounds.top / minorStepSize) * minorStepSize; y <= bounds.bottom; y += minorStepSize) {
            if (Math.abs(y % majorStepSize) > 0.01) {
              gridCacheRef.current.minorGridPath.moveTo(bounds.left, y);
              gridCacheRef.current.minorGridPath.lineTo(bounds.right, y);
            }
          }
        }

        // Build major grid path
        if (gridCacheRef.current.majorGridPath) {
          const bounds = gridCacheRef.current.bounds!;
          
          // Vertical lines
          for (let x = Math.floor(bounds.left / majorStepSize) * majorStepSize; x <= bounds.right; x += majorStepSize) {
            if (Math.abs(x) > 0.01) { // Skip origin line
              gridCacheRef.current.majorGridPath.moveTo(x, bounds.top);
              gridCacheRef.current.majorGridPath.lineTo(x, bounds.bottom);
            }
          }
          
          // Horizontal lines
          for (let y = Math.floor(bounds.top / majorStepSize) * majorStepSize; y <= bounds.bottom; y += majorStepSize) {
            if (Math.abs(y) > 0.01) { // Skip origin line
              gridCacheRef.current.majorGridPath.moveTo(bounds.left, y);
              gridCacheRef.current.majorGridPath.lineTo(bounds.right, y);
            }
          }
        }

        // Build origin lines path
        if (gridCacheRef.current.originPath) {
          const bounds = gridCacheRef.current.bounds!;
          
          // Origin vertical line
          if (bounds.left <= 0 && bounds.right >= 0) {
            gridCacheRef.current.originPath.moveTo(0, bounds.top);
            gridCacheRef.current.originPath.lineTo(0, bounds.bottom);
          }
          
          // Origin horizontal line
          if (bounds.top <= 0 && bounds.bottom >= 0) {
            gridCacheRef.current.originPath.moveTo(bounds.left, 0);
            gridCacheRef.current.originPath.lineTo(bounds.right, 0);
          }
        }
      }
      
      // PERFORMANCE: Draw cached grid paths
      // Draw minor grid first (if visible)
      if (showMinorGrid && gridCacheRef.current.minorGridPath) {
        ctx.strokeStyle = 'rgba(94, 102, 139, 0.25)';
        ctx.lineWidth = minorStrokeWidth / scale;
        ctx.stroke(gridCacheRef.current.minorGridPath);
      }
      
      // Draw major grid
      if (gridCacheRef.current.majorGridPath) {
        ctx.strokeStyle = 'rgba(250, 149, 73, 0.4)';
        ctx.lineWidth = majorStrokeWidth / scale;
        ctx.stroke(gridCacheRef.current.majorGridPath);
      }
      
      // Draw origin lines (thicker and different color)
      if (gridCacheRef.current.originPath) {
        ctx.strokeStyle = '#fa9549';
        ctx.lineWidth = (majorStrokeWidth * 1.4) / scale;
        ctx.stroke(gridCacheRef.current.originPath);
      }

      // Draw origin indicator
      if (showOriginDetails && worldLeft <= 0 && worldRight >= 0 && worldTop <= 0 && worldBottom >= 0) {
        const originSize = Math.max(2, Math.min(8, 4 / scale));
        
        ctx.fillStyle = '#fa9549';
        ctx.beginPath();
        ctx.arc(0, 0, originSize / scale, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Restore context state
      ctx.restore();

      // Update last render and transform state
      lastRenderRef.current = { x: stageX, y: stageY, scale };
      lastTransformRef.current = { x: stageX, y: stageY, scale };
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [width, height, scale, showGrid, stageX, stageY]);

  if (!showGrid) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        imageRendering: 'pixelated'
      }}
    />
  );
}, (prevProps, nextProps) => {
  // PERFORMANCE CRITICAL: Ultra-aggressive comparison to prevent unnecessary re-renders
  if (prevProps.showGrid !== nextProps.showGrid) return false;
  if (prevProps.width !== nextProps.width) return false;
  if (prevProps.height !== nextProps.height) return false;
  
  // Use higher thresholds to reduce re-renders - grid caching handles the rest
  const scaleChanged = Math.abs(prevProps.scale - nextProps.scale) > 0.01; // 1% change
  const positionThreshold = 20; // 20px threshold - very aggressive
  const positionChanged = Math.abs(prevProps.stageX - nextProps.stageX) > positionThreshold ||
                         Math.abs(prevProps.stageY - nextProps.stageY) > positionThreshold;
  
  return !scaleChanged && !positionChanged;
});
// src/hooks/usePowerlineSelectors.ts
import { useMemo } from 'react';
import { useLayoutStore } from '../store/layoutStore';
import { PowerlineSegment, PowerPole } from '../types';

/**
 * Optimized selectors for powerline data to prevent unnecessary re-renders
 */

// Memoized selector for powerline segments
export const usePowerlineSegments = () => {
  return useLayoutStore(
    (state) => state.powerlineSegments,
    (prev, next) => {
      // Only re-render if the number of segments changed or any segment was modified
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      
      if (prevKeys.length !== nextKeys.length) return false;
      
      // Check if any segment actually changed
      for (const key of prevKeys) {
        if (!next[key] || prev[key] !== next[key]) return false;
      }
      
      return true;
    }
  );
};

// Memoized selector for power poles
export const usePowerPoles = () => {
  return useLayoutStore(
    (state) => state.powerPoles,
    (prev, next) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      
      if (prevKeys.length !== nextKeys.length) return false;
      
      for (const key of prevKeys) {
        if (!next[key] || prev[key] !== next[key]) return false;
      }
      
      return true;
    }
  );
};

// Memoized selector for selected powerline
export const useSelectedPowerlineSegment = () => {
  return useLayoutStore((state) => state.selectedPowerlineSegment);
};

// Optimized selector that combines segments with their poles
export const usePowerlineSegmentsWithPoles = () => {
  const segments = usePowerlineSegments();
  const poles = usePowerPoles();
  
  return useMemo(() => {
    const segmentsArray = Object.values(segments);
    
    return segmentsArray
      .map(segment => {
        const startPole = poles[segment.startPole];
        const endPole = poles[segment.endPole];
        
        // Only include segments with valid poles
        if (!startPole || !endPole) return null;
        
        return {
          segment,
          startPole,
          endPole
        };
      })
      .filter(Boolean) as Array<{
        segment: PowerlineSegment;
        startPole: PowerPole;
        endPole: PowerPole;
      }>;
  }, [segments, poles]);
};

// Selector for visible powerlines in viewport (to be used with viewport culling)
export const useVisiblePowerlineSegments = (viewport?: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  const segmentsWithPoles = usePowerlineSegmentsWithPoles();
  
  return useMemo(() => {
    if (!viewport) return segmentsWithPoles;
    
    // Simple viewport culling based on pole positions
    return segmentsWithPoles.filter(({ startPole, endPole }) => {
      const PIXELS_PER_METER = 64; // Import from constants if needed
      const buffer = 100; // Buffer in pixels
      
      const startX = startPole.x * PIXELS_PER_METER;
      const startY = startPole.y * PIXELS_PER_METER;
      const endX = endPole.x * PIXELS_PER_METER;
      const endY = endPole.y * PIXELS_PER_METER;
      
      const lineMinX = Math.min(startX, endX) - buffer;
      const lineMaxX = Math.max(startX, endX) + buffer;
      const lineMinY = Math.min(startY, endY) - buffer;
      const lineMaxY = Math.max(startY, endY) + buffer;
      
      return !(
        lineMaxX < viewport.x ||
        lineMinX > viewport.x + viewport.width ||
        lineMaxY < viewport.y ||
        lineMinY > viewport.y + viewport.height
      );
    });
  }, [segmentsWithPoles, viewport]);
};

// Performance-focused selector that batches related data
export const usePowerlineSystemData = () => {
  const store = useLayoutStore();
  
  return useMemo(() => ({
    segments: store.powerlineSegments,
    poles: store.powerPoles,
    selectedSegment: store.selectedPowerlineSegment,
    selectedTool: store.selectedTool,
    drawingState: store.drawingState.drawingPowerline
  }), [
    store.powerlineSegments,
    store.powerPoles,
    store.selectedPowerlineSegment,
    store.selectedTool,
    store.drawingState.drawingPowerline
  ]);
};

// Selector for powerline statistics (for performance monitoring)
export const usePowerlineStats = () => {
  const segments = usePowerlineSegments();
  const poles = usePowerPoles();
  
  return useMemo(() => {
    const segmentCount = Object.keys(segments).length;
    const poleCount = Object.keys(poles).length;
    const connectedSegments = Object.values(segments).filter(segment => 
      poles[segment.startPole] && poles[segment.endPole]
    ).length;
    
    return {
      totalSegments: segmentCount,
      totalPoles: poleCount,
      connectedSegments,
      orphanedSegments: segmentCount - connectedSegments,
      averageSegmentsPerPole: poleCount > 0 ? (connectedSegments * 2) / poleCount : 0
    };
  }, [segments, poles]);
};
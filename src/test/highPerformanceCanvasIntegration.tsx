/**
 * High-Performance Viewport Integration Example
 * 
 * This shows how to integrate the Rust viewport system into the existing
 * FactoryCanvas component to eliminate canvas dragging lag.
 */

import React, { useEffect, useRef, useMemo } from "react";
import { useViewportSystem } from "../tauri/viewport";
import type { ViewportBounds } from "../types/viewport";

interface HighPerformanceCanvasProps {
  // Existing props from FactoryCanvas
  selectedTool: string;
  currentFloor: number;
  stageRef: React.RefObject<any>;
  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
}

export function HighPerformanceCanvas({
  selectedTool,
  currentFloor,
  stageRef,
  canvasWidth,
  canvasHeight,
}: HighPerformanceCanvasProps) {
  const { viewportSystem, updateViewport, isInitialized } = useViewportSystem();
  const lastBoundsRef = useRef<ViewportBounds | null>(null);
  const [visibleObjects, setVisibleObjects] = React.useState<any[]>([]);
  
  // Initialize viewport system on component mount
  useEffect(() => {
    if (\!isInitialized()) {
      viewportSystem.init({
        culling_enabled: true,
        predictive_cache_enabled: true,
        max_objects_per_query: 10000,
        spatial_index_cell_size: 50.0,
        cache_prediction_distance: 1000.0,
      });
    }
  }, [viewportSystem, isInitialized]);
  
  // Calculate current viewport bounds from Konva stage
  const calculateViewportBounds = useMemo(() => {
    return (): ViewportBounds | null => {
      if (\!stageRef.current) return null;
      
      const stage = stageRef.current;
      const scale = stage.scaleX(); // Assume uniform scaling
      const position = stage.position();
      
      // Calculate world coordinates of viewport
      const worldX = -position.x / scale;
      const worldY = -position.y / scale;
      const worldWidth = canvasWidth / scale;
      const worldHeight = canvasHeight / scale;
      
      return {
        x: worldX,
        y: worldY,
        width: worldWidth,
        height: worldHeight,
        scale: scale,
        floor: currentFloor,
      };
    };
  }, [stageRef, canvasWidth, canvasHeight, currentFloor]);
  
  // High-performance viewport update function
  const handleViewportUpdate = useMemo(() => {
    let updateTimeout: NodeJS.Timeout | null = null;
    
    return async () => {
      const bounds = calculateViewportBounds();
      if (\!bounds) return;
      
      // Skip update if bounds haven not changed significantly
      if (lastBoundsRef.current) {
        const prev = lastBoundsRef.current;
        const deltaX = Math.abs(bounds.x - prev.x);
        const deltaY = Math.abs(bounds.y - prev.y);
        const deltaScale = Math.abs(bounds.scale - prev.scale);
        
        // Only update if significant movement (reduces unnecessary calls)
        if (deltaX < 10 && deltaY < 10 && deltaScale < 0.01) {
          return;
        }
      }
      
      // Clear any pending updates
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      
      // Throttle updates for smooth performance
      updateTimeout = setTimeout(async () => {
        try {
          const startTime = performance.now();
          const objects = await updateViewport(bounds);
          const endTime = performance.now();
          
          console.log(`🚀 Viewport updated: ${objects.length} objects in ${(endTime - startTime).toFixed(2)}ms`);
          
          setVisibleObjects(objects);
          lastBoundsRef.current = bounds;
          
          // Log performance metrics occasionally
          if (Math.random() < 0.1) { // 10% of the time
            const metrics = await viewportSystem.getMetrics();
            console.log(`📊 Cache hit rate: ${(metrics.cache_hit_rate * 100).toFixed(1)}%`);
          }
        } catch (error) {
          console.error("Viewport update failed:", error);
        }
      }, 16); // ~60 FPS throttling
    };
  }, [calculateViewportBounds, updateViewport, viewportSystem]);
  
  // Attach viewport update to stage drag/zoom events
  useEffect(() => {
    if (\!stageRef.current) return;
    
    const stage = stageRef.current;
    
    // Handle drag events (canvas panning)
    const handleDrag = () => {
      handleViewportUpdate();
    };
    
    // Handle zoom events (scale changes)
    const handleWheel = () => {
      // Small delay to let zoom complete
      setTimeout(handleViewportUpdate, 10);
    };
    
    // Attach event listeners
    stage.on("dragmove", handleDrag);
    stage.on("dragend", handleViewportUpdate); // Final update on drag end
    stage.on("wheel", handleWheel);
    
    // Initial viewport load
    handleViewportUpdate();
    
    // Cleanup
    return () => {
      stage.off("dragmove", handleDrag);
      stage.off("dragend", handleViewportUpdate);
      stage.off("wheel", handleWheel);
    };
  }, [stageRef, handleViewportUpdate]);
  
  // Handle floor changes
  useEffect(() => {
    handleViewportUpdate();
  }, [currentFloor, handleViewportUpdate]);
  
  // Performance monitoring hook
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isInitialized()) {
        const metrics = await viewportSystem.getMetrics();
        
        // Log performance warnings
        if (metrics.last_query_time_ms > 5.0) {
          console.warn(`⚠️ Slow viewport query: ${metrics.last_query_time_ms.toFixed(2)}ms`);
        }
        
        if (metrics.cache_hit_rate < 0.8) {
          console.warn(`⚠️ Low cache hit rate: ${(metrics.cache_hit_rate * 100).toFixed(1)}%`);
        }
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [isInitialized, viewportSystem]);
  
  return {
    visibleObjects,
    isViewportReady: isInitialized(),
    handleViewportUpdate,
  };
}

// Usage in existing FactoryCanvas component:
/*
export const FactoryCanvas = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const { visibleObjects, isViewportReady } = HighPerformanceCanvas({
    selectedTool,
    currentFloor,
    stageRef,
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,
  });
  
  // Only render objects that are visible in viewport
  const renderVisibleObjects = () => {
    return visibleObjects.map(obj => {
      switch (obj.object_type) {
        case "building":
          return <BuildingShape key={obj.id} {...obj} />;
        case "conveyor_belt":
          return <ConveyorShape key={obj.id} {...obj} />;
        // ... other object types
        default:
          return null;
      }
    });
  };
  
  return (
    <Stage ref={stageRef} width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        {isViewportReady && renderVisibleObjects()}
      </Layer>
    </Stage>
  );
};
*/


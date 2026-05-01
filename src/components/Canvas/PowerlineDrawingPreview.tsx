// src/components/Canvas/PowerlineDrawingPreview.tsx
import React, { useMemo, useRef } from 'react';
import { Group, Circle, Line } from 'react-konva';
import { PIXELS_PER_METER, BUILDING_RAILWAY_SNAP_THRESHOLD } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';

// CRITICAL PERFORMANCE OPTIMIZATION: Throttle expensive detection functions
const createThrottledDetection = () => {
  let lastResult: any = null;
  let lastCallTime = 0;
  let lastPoint = { x: 0, y: 0, z: 0 };
  
  return (detectFunction: any, point: any, buildingId: string, threshold: number) => {
    const now = performance.now();
    const timeDelta = now - lastCallTime;
    
    // Check if position changed significantly or enough time has passed
    const deltaX = Math.abs(point.x - lastPoint.x);
    const deltaY = Math.abs(point.y - lastPoint.y);
    const significantMovement = deltaX > 0.2 || deltaY > 0.2; // 20cm threshold
    const timeThreshold = timeDelta > 100; // Max 10fps for expensive detection
    
    if (significantMovement || timeThreshold) {
      lastResult = detectFunction(point, buildingId, threshold);
      lastCallTime = now;
      lastPoint = { ...point };
    }
    
    return lastResult;
  };
};

interface PowerlineDrawingPreviewProps {
  mousePos: { x: number; y: number }; // Mouse position in pixels
  scale: number;
  position: { x: number; y: number };
  currentFloor: number;
}

/**
 * Gets powerline color based on connection quality
 */
const getPowerlineColor = (quality: 'perfect' | 'good' | 'warning' | 'error' | 'neutral'): string => {
  switch (quality) {
    case 'perfect': return '#00ff88'; // Bright green
    case 'good': return '#88ff00'; // Green-yellow
    case 'warning': return '#ffaa00'; // Orange
    case 'error': return '#ff4444'; // Red
    default: return '#66aaff'; // Blue
  }
};

// PERFORMANCE FIX: Add React.memo with proper comparison to prevent unnecessary re-renders
export const PowerlineDrawingPreview: React.FC<PowerlineDrawingPreviewProps> = React.memo(({ 
  mousePos, 
  scale, 
  position, 
  currentFloor 
}) => {
  const { 
    powerlineConnectionState, 
    buildings, 
    detectNearbyBuildingForRailwayConnection 
  } = useLayoutStore();
  
  // Create throttled detection function per component instance
  const throttledDetection = useRef(createThrottledDetection()).current;

  // 🚀 PERFORMANCE: Memoize expensive mouse position transformation
  const mousePosMeters = useMemo(() => {
    const worldX = (mousePos.x - position.x) / scale / PIXELS_PER_METER;
    const worldY = (mousePos.y - position.y) / scale / PIXELS_PER_METER;
    return {
      x: Math.round(worldX * 2) / 2, // Snap to 0.5m grid
      y: Math.round(worldY * 2) / 2,
      z: currentFloor * 4,
    };
  }, [mousePos.x, mousePos.y, position.x, position.y, scale, currentFloor]);

  // Simplified visual detail level calculation
  const visualDetailLevel = useMemo(() => {
    return {
      detailLevel: 'normal',
      shouldAnimate: scale > 0.5,
      showSecondaryIndicators: scale > 0.8,
      showTertiaryIndicators: scale > 1.2,
    };
  }, [scale]);

  // Check if we have a start point for powerline connection
  if (!powerlineConnectionState?.startPoint) {
    return null;
  }

  const startPoint = powerlineConnectionState.startPoint;

  // Check for nearby buildings for direct connection preview using throttled detection
  let buildingSnapResult: any = null;
  
  if (startPoint.type === 'building') {
    const effectiveBuildingThreshold = BUILDING_RAILWAY_SNAP_THRESHOLD; // Reuse railway snap threshold for now
    // PERFORMANCE OPTIMIZATION: Use throttled detection to prevent FPS drops
    buildingSnapResult = throttledDetection(
      detectNearbyBuildingForRailwayConnection,
      { x: mousePosMeters.x, y: mousePosMeters.y, z: currentFloor * 4 },
      startPoint.buildingId!,
      effectiveBuildingThreshold
    );
  }

  // Apply building snapping if available, otherwise use mouse position
  const endPos = buildingSnapResult 
    ? { x: buildingSnapResult.worldPos.x, y: buildingSnapResult.worldPos.y }
    : { x: mousePosMeters.x, y: mousePosMeters.y };

  // Calculate distance for connection quality
  const distance = Math.sqrt(
    Math.pow(endPos.x - startPoint.position.x, 2) + 
    Math.pow(endPos.y - startPoint.position.y, 2)
  );

  // Determine connection quality
  const connectionQuality = useMemo(() => {
    if (distance <= 30) return 'perfect';
    if (distance <= 50) return 'good';
    return 'warning';
  }, [distance]);

  // Generate simple straight line path (no complex curves for now)
  const pathData = `M ${startPoint.position.x * PIXELS_PER_METER} ${startPoint.position.y * PIXELS_PER_METER} L ${endPos.x * PIXELS_PER_METER} ${endPos.y * PIXELS_PER_METER}`;

  return (
    <Group listening={false}>
      {/* Building Connection Highlight */}
      {buildingSnapResult && (() => {
        const targetBuilding = buildings[buildingSnapResult.buildingId];
        if (!targetBuilding) return null;
        
        return (
          <Group opacity={0.8}>
            {/* Building highlight circle */}
            <Circle
              x={buildingSnapResult.worldPos.x * PIXELS_PER_METER}
              y={buildingSnapResult.worldPos.y * PIXELS_PER_METER}
              radius={20}
              stroke={getPowerlineColor(connectionQuality)}
              strokeWidth={3}
              opacity={0.7}
              dash={[8, 4]}
            />
            
            {/* Connection point indicator */}
            <Circle
              x={buildingSnapResult.worldPos.x * PIXELS_PER_METER}
              y={buildingSnapResult.worldPos.y * PIXELS_PER_METER}
              radius={8}
              fill={getPowerlineColor(connectionQuality)}
              stroke="#ffffff"
              strokeWidth={2}
              opacity={0.9}
            />
          </Group>
        );
      })()}
      
      {/* Simple powerline preview */}
      <Group opacity={0.8}>
        {/* Preview powerline (straight line) */}
        <Line
          points={[
            startPoint.position.x * PIXELS_PER_METER, 
            startPoint.position.y * PIXELS_PER_METER,
            endPos.x * PIXELS_PER_METER, 
            endPos.y * PIXELS_PER_METER
          ]}
          stroke={getPowerlineColor(connectionQuality)}
          strokeWidth={4}
          opacity={0.7}
          lineCap="round"
          dash={[8, 4]}
          shadowColor="rgba(0,0,0,0.3)"
          shadowBlur={2}
          shadowOffsetY={1}
        />
        
        {/* Start point indicator */}
        <Circle
          x={startPoint.position.x * PIXELS_PER_METER}
          y={startPoint.position.y * PIXELS_PER_METER}
          radius={8}
          fill="#ffaa00"
          stroke="#ffffff"
          strokeWidth={2}
          opacity={0.9}
        />
        
        {/* End point indicator */}
        <Circle
          x={endPos.x * PIXELS_PER_METER}
          y={endPos.y * PIXELS_PER_METER}
          radius={8}
          fill={getPowerlineColor(connectionQuality)}
          stroke="#ffffff"
          strokeWidth={2}
          opacity={0.8}
        />
        
        {/* Distance indicator */}
        {visualDetailLevel.showSecondaryIndicators && distance > 0 && (
          <Group>
            <Circle
              x={endPos.x * PIXELS_PER_METER}
              y={endPos.y * PIXELS_PER_METER}
              radius={Math.min(distance * PIXELS_PER_METER, 100)} // Cap the visual range
              stroke={getPowerlineColor(connectionQuality)}
              strokeWidth={1}
              opacity={0.2}
              dash={[4, 8]}
            />
          </Group>
        )}
      </Group>
    </Group>
  );
}, (prevProps, nextProps) => {
  // Simple comparison to prevent unnecessary re-renders
  return (
    prevProps.scale === nextProps.scale &&
    prevProps.currentFloor === nextProps.currentFloor &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    Math.abs(prevProps.mousePos.x - nextProps.mousePos.x) < 2 &&
    Math.abs(prevProps.mousePos.y - nextProps.mousePos.y) < 2
  );
});
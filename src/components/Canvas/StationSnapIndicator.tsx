// src/components/Canvas/StationSnapIndicator.tsx
import React from 'react';
import { Group, Line, Circle, Arc } from 'react-konva';
import { PIXELS_PER_METER } from '../../constants';
import { StationSnapVisualIndicator } from '../../utils/stationSnapping';

interface StationSnapIndicatorProps {
  visualIndicator?: StationSnapVisualIndicator;
  opacity?: number;
}

export const StationSnapIndicator: React.FC<StationSnapIndicatorProps> = ({ 
  visualIndicator,
  opacity = 0.8
}) => {
  if (!visualIndicator || !visualIndicator.isActive) {
    return null;
  }

  const startX = visualIndicator.position.x * PIXELS_PER_METER;
  const startY = visualIndicator.position.y * PIXELS_PER_METER;
  const endX = visualIndicator.targetPosition.x * PIXELS_PER_METER;
  const endY = visualIndicator.targetPosition.y * PIXELS_PER_METER;

  return (
    <Group>
      {/* Connection line showing the snap alignment */}
      <Line
        points={[startX, startY, endX, endY]}
        stroke="#10b981"
        strokeWidth={3}
        opacity={opacity * 0.6}
        dash={[8, 4]}
        lineCap="round"
      />
      
      {/* Source position indicator (current building) */}
      <Circle
        x={startX}
        y={startY}
        radius={12}
        stroke="#10b981"
        strokeWidth={3}
        opacity={opacity}
        fill="transparent"
      />
      
      {/* Inner pulse for source */}
      <Circle
        x={startX}
        y={startY}
        radius={6}
        fill="#10b981"
        opacity={opacity * 0.4}
      />
      
      {/* Target position indicator (snap target) */}
      <Circle
        x={endX}
        y={endY}
        radius={16}
        stroke="#f59e0b"
        strokeWidth={3}
        opacity={opacity}
        fill="transparent"
      />
      
      {/* Railway connection icon at target */}
      <Arc
        x={endX}
        y={endY}
        innerRadius={8}
        outerRadius={12}
        angle={180}
        rotation={-90}
        fill="#f59e0b"
        opacity={opacity * 0.7}
      />
      
      {/* Text indicator showing snap action */}
      {/* Note: Konva Text would go here, but keeping simple for now */}
    </Group>
  );
};
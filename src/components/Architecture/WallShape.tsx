import React from 'react';
import { Group, Rect, Line } from 'react-konva';
import { WallSegment } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface WallShapeProps {
  wall: WallSegment;
  isSelected: boolean;
  opacity?: number;
  onSelect: () => void;
  onDragEnd: (e: any) => void;
}

export const WallShape: React.FC<WallShapeProps> = ({
  wall,
  isSelected,
  opacity = 1,
  onSelect,
  onDragEnd,
}) => {
  // Calculate wall position and dimensions
  const dx = wall.endX - wall.x;
  const dy = wall.endY - wall.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  // Material colors and properties
  const getMaterialProperties = () => {
    switch (wall.material) {
      case 'concrete': 
        return { color: '#8B8680', hasWindow: false };
      case 'steel': 
        return { color: '#4A5568', hasWindow: false };
      case 'window': 
        return { color: '#1F2937', hasWindow: true };
      default: 
        return { color: '#6B7280', hasWindow: false };
    }
  };

  const { color, hasWindow } = getMaterialProperties();
  const strokeColor = isSelected ? '#FB923C' : '#9CA3AF';
  const wallThickness = 4; // Visual thickness in pixels

  return (
    <Group
      x={wall.x * PIXELS_PER_METER}
      y={wall.y * PIXELS_PER_METER}
      rotation={angle}
      onClick={onSelect}
      onTap={onSelect}
      draggable={isSelected}
      onDragEnd={onDragEnd}
      opacity={opacity}
    >
      {/* Wall base */}
      <Rect
        x={0}
        y={-wallThickness / 2}
        width={length * PIXELS_PER_METER}
        height={wallThickness}
        fill={color}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1}
      />

      {/* Height indicator lines */}
      <Line
        points={[
          0, -wallThickness / 2,
          0, -wallThickness / 2 - wall.height * 2 // Visual height representation
        ]}
        stroke={color}
        strokeWidth={1}
        opacity={0.5}
      />
      <Line
        points={[
          length * PIXELS_PER_METER, -wallThickness / 2,
          length * PIXELS_PER_METER, -wallThickness / 2 - wall.height * 2
        ]}
        stroke={color}
        strokeWidth={1}
        opacity={0.5}
      />

      {/* Window representation if material is window */}
      {hasWindow && (
        <Group>
          {/* Window frame */}
          <Rect
            x={length * PIXELS_PER_METER * 0.2}
            y={-wallThickness / 2}
            width={length * PIXELS_PER_METER * 0.6}
            height={wallThickness}
            fill="rgba(59, 130, 246, 0.3)"
            stroke="#3B82F6"
            strokeWidth={1}
          />
          {/* Window divisions */}
          <Line
            points={[
              length * PIXELS_PER_METER * 0.5, -wallThickness / 2,
              length * PIXELS_PER_METER * 0.5, wallThickness / 2
            ]}
            stroke="#3B82F6"
            strokeWidth={0.5}
          />
        </Group>
      )}

      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-2}
          y={-wallThickness / 2 - 2}
          width={length * PIXELS_PER_METER + 4}
          height={wallThickness + 4}
          stroke="#FB923C"
          strokeWidth={2}
          fill="transparent"
          dash={[5, 5]}
        />
      )}

      {/* End caps */}
      <Rect
        x={-2}
        y={-wallThickness / 2}
        width={4}
        height={wallThickness}
        fill={color}
      />
      <Rect
        x={length * PIXELS_PER_METER - 2}
        y={-wallThickness / 2}
        width={4}
        height={wallThickness}
        fill={color}
      />
    </Group>
  );
};
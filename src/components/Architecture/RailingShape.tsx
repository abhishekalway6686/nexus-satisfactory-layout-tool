import React from 'react';
import { Group, Rect, Line, Circle } from 'react-konva';
import { RailingSegment } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface RailingShapeProps {
  railing: RailingSegment;
  isSelected: boolean;
  opacity?: number;
  onSelect: () => void;
  onDragEnd: (e: any) => void;
}

export const RailingShape: React.FC<RailingShapeProps> = ({
  railing,
  isSelected,
  opacity = 1,
  onSelect,
  onDragEnd,
}) => {
  // Calculate railing position and dimensions
  const dx = railing.endX - railing.x;
  const dy = railing.endY - railing.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  // Material colors and properties
  const getMaterialProperties = () => {
    switch (railing.material) {
      case 'steel': 
        return { color: '#4A5568' };
      default: 
        return { color: '#6B7280' };
    }
  };

  const { color } = getMaterialProperties();
  const strokeColor = isSelected ? '#FB923C' : '#9CA3AF';
  const railThickness = 2; // Visual thickness in pixels
  const postRadius = 3; // Post radius in pixels
  const railHeight = 10; // Visual height representation in pixels

  return (
    <Group
      x={railing.x * PIXELS_PER_METER}
      y={railing.y * PIXELS_PER_METER}
      rotation={angle}
      onClick={onSelect}
      onTap={onSelect}
      draggable={isSelected}
      onDragEnd={onDragEnd}
      opacity={opacity}
    >
      {/* Bottom rail */}
      <Line
        points={[0, 0, length * PIXELS_PER_METER, 0]}
        stroke={color}
        strokeWidth={railThickness}
      />
      
      {/* Top rail */}
      <Line
        points={[0, -railHeight * 0.3, length * PIXELS_PER_METER, -railHeight * 0.3]}
        stroke={color}
        strokeWidth={railThickness}
      />

      {/* Start post */}
      <Circle
        x={0}
        y={-railHeight * 0.15}
        radius={postRadius}
        fill={color}
        stroke={strokeColor}
        strokeWidth={isSelected ? 1 : 0.5}
      />

      {/* End post */}
      <Circle
        x={length * PIXELS_PER_METER}
        y={-railHeight * 0.15}
        radius={postRadius}
        fill={color}
        stroke={strokeColor}
        strokeWidth={isSelected ? 1 : 0.5}
      />

      {/* Middle posts (every 4 meters for longer segments) */}
      {length > 4 && Array.from({ length: Math.floor(length / 4) - 1 }, (_, i) => (
        <Circle
          key={`post-${i}`}
          x={(i + 1) * 4 * PIXELS_PER_METER}
          y={-railHeight * 0.15}
          radius={postRadius * 0.8}
          fill={color}
          stroke={strokeColor}
          strokeWidth={isSelected ? 1 : 0.5}
        />
      ))}

      {/* Vertical connectors between rails and posts */}
      <Line
        points={[0, -railHeight * 0.3, 0, 0]}
        stroke={color}
        strokeWidth={1}
        opacity={0.7}
      />
      <Line
        points={[length * PIXELS_PER_METER, -railHeight * 0.3, length * PIXELS_PER_METER, 0]}
        stroke={color}
        strokeWidth={1}
        opacity={0.7}
      />

      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-5}
          y={-railHeight * 0.4}
          width={length * PIXELS_PER_METER + 10}
          height={railHeight * 0.8}
          stroke="#FB923C"
          strokeWidth={2}
          fill="transparent"
          dash={[5, 5]}
        />
      )}
    </Group>
  );
};
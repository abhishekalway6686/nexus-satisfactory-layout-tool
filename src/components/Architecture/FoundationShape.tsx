import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Foundation } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface FoundationShapeProps {
  foundation: Foundation;
  isSelected: boolean;
  opacity?: number;
  onSelect: () => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
}

export const FoundationShape: React.FC<FoundationShapeProps> = React.memo(({
  foundation,
  isSelected,
  opacity = 1,
  onSelect,
  onDragEnd,
}) => {
  // Material colors and display names
  const getMaterialInfo = () => {
    switch (foundation.material) {
      case 'concrete': return { color: '#8B8680', name: 'CONCRETE' };
      case 'coated': return { color: '#4A5568', name: 'COATED' };
      case 'asphalt': return { color: '#2D3748', name: 'ASPHALT' };
      case 'grip_metal': return { color: '#718096', name: 'GRIP METAL' };
      default: return { color: '#6B7280', name: 'FOUNDATION' }; // Show generic name instead of "DEFAULT"
    }
  };

  const materialInfo = getMaterialInfo();
  const fillColor = materialInfo.color;
  const strokeColor = isSelected ? '#FB923C' : '#9CA3AF';

  return (
    <Group
      x={foundation.x * PIXELS_PER_METER}
      y={foundation.y * PIXELS_PER_METER}
      onClick={onSelect}
      onTap={onSelect}
      draggable={isSelected}
      onDragEnd={onDragEnd}
      opacity={opacity}
    >
      {/* Foundation base */}
      <Rect
        width={foundation.width * PIXELS_PER_METER}
        height={foundation.height * PIXELS_PER_METER}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 3 : 1}
        shadowColor="black"
        shadowBlur={5}
        shadowOpacity={0.3}
        shadowOffsetX={2}
        shadowOffsetY={2}
      />

      {/* Grid pattern overlay */}
      {Array.from({ length: Math.floor(foundation.width / 8) }).map((_, i) => (
        <Rect
          key={`v-${i}`}
          x={(i + 1) * 8 * PIXELS_PER_METER}
          y={0}
          width={1}
          height={foundation.height * PIXELS_PER_METER}
          fill="rgba(0, 0, 0, 0.1)"
        />
      ))}
      {Array.from({ length: Math.floor(foundation.height / 8) }).map((_, i) => (
        <Rect
          key={`h-${i}`}
          x={0}
          y={(i + 1) * 8 * PIXELS_PER_METER}
          width={foundation.width * PIXELS_PER_METER}
          height={1}
          fill="rgba(0, 0, 0, 0.1)"
        />
      ))}

      {/* Material label - only show if large enough and not default */}
      {foundation.width >= 16 && foundation.height >= 16 && (
        <Text
          x={foundation.width * PIXELS_PER_METER / 2}
          y={foundation.height * PIXELS_PER_METER / 2}
          text={materialInfo.name}
          fontSize={12}
          fontFamily="Arial"
          fill="rgba(255, 255, 255, 0.5)"
          align="center"
          verticalAlign="middle"
        />
      )}

      {/* Selection highlight */}
      {isSelected && (
        <Rect
          width={foundation.width * PIXELS_PER_METER}
          height={foundation.height * PIXELS_PER_METER}
          stroke="#FB923C"
          strokeWidth={3}
          fill="transparent"
          dash={[5, 5]}
        />
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return prevProps.foundation === nextProps.foundation &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.opacity === nextProps.opacity &&
         prevProps.onSelect === nextProps.onSelect &&
         prevProps.onDragEnd === nextProps.onDragEnd;
});

FoundationShape.displayName = 'FoundationShape';
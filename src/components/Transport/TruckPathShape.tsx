// src/components/Transport/TruckPathShape.tsx - Enhanced with sci-fi road styling

import React from 'react';
import { Group, Line, Circle, Arrow, Rect, Text } from 'react-konva';
import { TruckPath } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface TruckPathShapeProps {
  truckPath: TruckPath;
  opacity?: number;
  onPathClick?: (pathId: string) => void;
}

export const TruckPathShape: React.FC<TruckPathShapeProps> = ({ 
  truckPath, 
  opacity = 1, 
  onPathClick 
}) => {
  const handlePathClick = () => {
    if (onPathClick) {
      onPathClick(truckPath.id);
    }
  };

  return (
    <Group opacity={opacity}>
      {truckPath.segments.map((segment, index) => {
        const startX = segment.startPoint.x * PIXELS_PER_METER;
        const startY = segment.startPoint.y * PIXELS_PER_METER;
        const endX = segment.endPoint.x * PIXELS_PER_METER;
        const endY = segment.endPoint.y * PIXELS_PER_METER;

        // Calculate perpendicular vector for road width
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const perpX = length > 0 ? -dy / length * 8 : 0; // 8 pixels = road half-width
        const perpY = length > 0 ? dx / length * 8 : 0;

        return (
          <React.Fragment key={segment.id}>
            {/* Road glow effect */}
            <Line
              points={[startX, startY, endX, endY]}
              stroke="rgba(102, 102, 102, 0.4)"
              strokeWidth={24}
              lineCap="round"
              blur={8}
              opacity={0.6}
              listening={false}
            />
            
            {/* Road shadow */}
            <Line
              points={[startX, startY, endX, endY]}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={20}
              lineCap="round"
              offsetY={3}
              blur={3}
              listening={false}
            />
            
            {/* Road surface with asphalt texture */}
            <Line
              points={[startX, startY, endX, endY]}
              stroke="linear-gradient(90deg, #4a4a4a, #666, #4a4a4a)"
              strokeWidth={18}
              lineCap="round"
              onClick={handlePathClick}
              name="truck-path"
              shadowBlur={4}
              shadowColor="rgba(74, 74, 74, 0.8)"
            />
            
            {/* Road texture overlay */}
            <Line
              points={[startX, startY, endX, endY]}
              stroke="rgba(85, 85, 85, 0.6)"
              strokeWidth={16}
              lineCap="round"
              dash={[2, 1]}
              opacity={0.7}
              listening={false}
            />
            
            {/* Road edges with enhanced styling */}
            <Line
              points={[
                startX + perpX, startY + perpY,
                endX + perpX, endY + perpY
              ]}
              stroke="#333"
              strokeWidth={2}
              lineCap="round"
              listening={false}
            />
            
            <Line
              points={[
                startX - perpX, startY - perpY,
                endX - perpX, endY - perpY
              ]}
              stroke="#333"
              strokeWidth={2}
              lineCap="round"
              listening={false}
            />
            
            {/* Enhanced center line */}
            <Line
              points={[startX, startY, endX, endY]}
              stroke="#ffff00"
              strokeWidth={2}
              dash={[8, 6]}
              lineCap="round"
              opacity={0.9}
              shadowBlur={4}
              shadowColor="#ffff00"
              listening={false}
            />

            {/* Enhanced direction arrow */}
            <Group x={(startX + endX) / 2} y={(startY + endY) / 2}>
              {/* Arrow glow */}
              <Arrow
                points={[
                  0, 0,
                  (endX - startX) * 0.15,
                  (endY - startY) * 0.15
                ]}
                pointerLength={12}
                pointerWidth={12}
                fill="rgba(255, 255, 0, 0.3)"
                blur={6}
                listening={false}
              />
              
              {/* Main arrow */}
              <Arrow
                points={[
                  0, 0,
                  (endX - startX) * 0.12,
                  (endY - startY) * 0.12
                ]}
                pointerLength={10}
                pointerWidth={10}
                fill="#ffff00"
                stroke="#333"
                strokeWidth={1}
                shadowBlur={4}
                shadowColor="#ffff00"
                listening={false}
              />
            </Group>

            {/* Enhanced connection points */}
            <Group x={startX} y={startY}>
              {/* Connection point glow */}
              <Circle
                radius={10}
                fill="rgba(243, 156, 18, 0.4)"
                blur={6}
                listening={false}
              />
              
              {/* Main connection point */}
              <Circle
                radius={8}
                fill="linear-gradient(145deg, #f39c12, #e67e22)"
                stroke="#333"
                strokeWidth={2}
                shadowBlur={6}
                shadowColor="rgba(243, 156, 18, 0.8)"
                listening={false}
              />
              
              {/* Connection highlight */}
              <Circle
                radius={4}
                fill="rgba(255,255,255,0.6)"
                offsetY={-2}
                listening={false}
              />
            </Group>
            
            {/* End connection point */}
            {index === truckPath.segments.length - 1 && (
              <Group x={endX} y={endY}>
                {/* Connection point glow */}
                <Circle
                  radius={10}
                  fill="rgba(243, 156, 18, 0.4)"
                  blur={6}
                  listening={false}
                />
                
                {/* Main connection point */}
                <Circle
                  radius={8}
                  fill="linear-gradient(145deg, #f39c12, #e67e22)"
                  stroke="#333"
                  strokeWidth={2}
                  shadowBlur={6}
                  shadowColor="rgba(243, 156, 18, 0.8)"
                  listening={false}
                />
                
                {/* Connection highlight */}
                <Circle
                  radius={4}
                  fill="rgba(255,255,255,0.6)"
                  offsetY={-2}
                  listening={false}
                />
              </Group>
            )}
            
            {/* Segment length indicator */}
            <Group x={(startX + endX) / 2} y={(startY + endY) / 2 + 15} listening={false}>
              <Rect
                x={-20}
                y={-8}
                width={40}
                height={16}
                fill="rgba(0,0,0,0.8)"
                cornerRadius={4}
                stroke="#f39c12"
                strokeWidth={1}
                shadowBlur={4}
                shadowColor="rgba(243, 156, 18, 0.6)"
                listening={false}
              />
              <Text
                text={`${Math.sqrt(dx * dx + dy * dy).toFixed(0)}m`}
                fontSize={9}
                fill="#f39c12"
                fontWeight="bold"
                align="center"
                width={40}
                offsetX={20}
                y={-4}
                listening={false}
              />
            </Group>
          </React.Fragment>
        );
      })}
      
      {/* Truck path label */}
      {truckPath.segments.length > 0 && (
        <Group 
          x={truckPath.segments[0].startPoint.x * PIXELS_PER_METER} 
          y={truckPath.segments[0].startPoint.y * PIXELS_PER_METER - 30}
          listening={false}
        >
          <Rect
            x={-30}
            y={-12}
            width={60}
            height={20}
            fill="rgba(243, 156, 18, 0.9)"
            cornerRadius={6}
            stroke="#fff"
            strokeWidth={1}
            shadowBlur={8}
            shadowColor="rgba(243, 156, 18, 0.8)"
            listening={false}
          />
          <Text
            text="🚛 TRUCK PATH"
            fontSize={10}
            fill="white"
            fontWeight="bold"
            align="center"
            width={60}
            offsetX={30}
            y={-6}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};
import React from 'react';
import { Group, Rect, Circle, Line, Text } from 'react-konva';
import { PipeFloorConnection } from '../../types';
import { useLayoutStore } from '../../store/layoutStore';
import { useShallow } from 'zustand/react/shallow';
import { PIXELS_PER_METER } from '../../constants';

interface PipeFloorConnectionShapeProps {
  connection: PipeFloorConnection;
}

export const PipeFloorConnectionShape: React.FC<PipeFloorConnectionShapeProps> = ({ connection }) => {
  const { currentFloor, selectedTool, selectedPipeFloorConnection, setSelectedPipeFloorConnection } = useLayoutStore(
    useShallow(state => ({
      currentFloor: state.currentFloor,
      selectedTool: state.selectedTool,
      selectedPipeFloorConnection: state.selectedPipeFloorConnection,
      setSelectedPipeFloorConnection: state.setSelectedPipeFloorConnection,
    }))
  );

  const x = connection.x * PIXELS_PER_METER;
  const y = connection.y * PIXELS_PER_METER;
  const connectionWidth = 2 * PIXELS_PER_METER; // 2 meter wide connection
  const connectionHeight = 2 * PIXELS_PER_METER; // 2 meter deep connection

  // Determine visibility and appearance based on current floor
  const isOnStartFloor = currentFloor === connection.startFloor;
  const isOnEndFloor = currentFloor === connection.endFloor;
  const isOnIntermediateFloor = currentFloor > connection.startFloor && currentFloor < connection.endFloor;
  const isVisible = isOnStartFloor || isOnEndFloor || isOnIntermediateFloor;

  if (!isVisible) {
    return null;
  }

  // Different colors for different Mk tiers
  const tierColors = {
    1: '#3498db', // Blue for Mk.1
    2: '#2980b9', // Darker blue for Mk.2
  };

  const connectionColor = tierColors[connection.mark];
  
  // Different appearance based on floor position
  let opacity = 1;
  let strokeWidth = 2;
  let fillColor = connectionColor;

  if (isOnIntermediateFloor) {
    // Show as blocked area on intermediate floors
    opacity = 0.3;
    strokeWidth = 1;
    fillColor = '#95a5a6'; // Gray for blocked area
  } else {
    // Show connection points on start and end floors
    opacity = selectedTool === 'pipe_floor_connection' ? 0.8 : 1;
  }

  const connectionPointRadius = 4;
  const connectionPointColor = connection.direction === 'up' ? '#27ae60' : '#e74c3c'; // Green for up, red for down

  const isSelected = selectedPipeFloorConnection === connection.id;

  const handleClick = (e: any) => {
    e.cancelBubble = true;
    if (selectedTool === 'select') {
      setSelectedPipeFloorConnection(connection.id);
    }
  };

  return (
    <Group 
      x={x - connectionWidth / 2} 
      y={y - connectionHeight / 2}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Main connection body */}
      <Rect
        width={connectionWidth}
        height={connectionHeight}
        fill={fillColor}
        stroke={isSelected ? '#e74c3c' : '#2c3e50'}
        strokeWidth={isSelected ? 3 : strokeWidth}
        opacity={opacity}
        cornerRadius={4}
      />

      {/* Pipe type and direction indicators - only show on start and end floors */}
      {(isOnStartFloor || isOnEndFloor) && (
        <Group>
          {/* Fluid indicator (waves) - pipe floor connections always handle fluids */}
          <Line
            points={[
              connectionWidth / 4, connectionHeight / 2 - 6,
              connectionWidth / 2, connectionHeight / 2 - 10,
              3 * connectionWidth / 4, connectionHeight / 2 - 6,
              connectionWidth, connectionHeight / 2 - 10,
              connectionWidth, connectionHeight / 2 + 10,
              3 * connectionWidth / 4, connectionHeight / 2 + 6,
              connectionWidth / 2, connectionHeight / 2 + 10,
              connectionWidth / 4, connectionHeight / 2 + 6,
              0, connectionHeight / 2 + 10,
            ]}
            stroke="#2c3e50"
            strokeWidth={1}
            opacity={0.4}
            closed
          />

          {/* Direction indicator */}
          <Line
            points={[
              connectionWidth / 2, connectionHeight / 2 - 8,
              connectionWidth / 2, connectionHeight / 2 + 8,
            ]}
            stroke="#2c3e50"
            strokeWidth={2}
            opacity={0.8}
          />
          {/* Arrow head */}
          <Line
            points={
              connection.direction === 'up'
                ? [
                    connectionWidth / 2 - 4, connectionHeight / 2 - 4,
                    connectionWidth / 2, connectionHeight / 2 - 8,
                    connectionWidth / 2 + 4, connectionHeight / 2 - 4,
                  ]
                : [
                    connectionWidth / 2 - 4, connectionHeight / 2 + 4,
                    connectionWidth / 2, connectionHeight / 2 + 8,
                    connectionWidth / 2 + 4, connectionHeight / 2 + 4,
                  ]
            }
            stroke="#2c3e50"
            strokeWidth={2}
            opacity={0.8}
          />
        </Group>
      )}

      {/* Connection points - only show on start and end floors */}
      {isOnStartFloor && (
        <Circle
          x={connectionWidth / 2 + connection.bottomConnectionPoint.x * PIXELS_PER_METER}
          y={connectionHeight / 2 + connection.bottomConnectionPoint.y * PIXELS_PER_METER}
          radius={connectionPointRadius}
          fill={connectionPointColor}
          stroke="#2c3e50"
          strokeWidth={1}
          opacity={0.9}
        />
      )}

      {isOnEndFloor && (
        <Circle
          x={connectionWidth / 2 + connection.topConnectionPoint.x * PIXELS_PER_METER}
          y={connectionHeight / 2 + connection.topConnectionPoint.y * PIXELS_PER_METER}
          radius={connectionPointRadius}
          fill={connectionPointColor}
          stroke="#2c3e50"
          strokeWidth={1}
          opacity={0.9}
        />
      )}

      {/* Floor indicator text */}
      {(isOnStartFloor || isOnEndFloor) && (
        <Text
          x={connectionWidth + 5}
          y={connectionHeight / 2 - 8}
          text={`Mk.${connection.mark} PIPE ${connection.direction.toUpperCase()}`}
          fontSize={10}
          fill="#2c3e50"
          opacity={0.8}
        />
      )}

      {/* Height and cost indicator */}
      {(isOnStartFloor || isOnEndFloor) && (
        <Text
          x={connectionWidth + 5}
          y={connectionHeight / 2 + 4}
          text={`${connection.height}m - ${connection.cost} cost`}
          fontSize={8}
          fill="#7f8c8d"
          opacity={0.8}
        />
      )}

      {/* Throughput indicator */}
      {(isOnStartFloor || isOnEndFloor) && (
        <Text
          x={connectionWidth + 5}
          y={connectionHeight / 2 + 16}
          text={`${connection.mark === 1 ? '300' : '600'} m³/min`}
          fontSize={8}
          fill='#3498db'
          opacity={0.8}
        />
      )}

      {/* Blocked area indicator on intermediate floors */}
      {isOnIntermediateFloor && (
        <Group>
          <Text
            x={connectionWidth / 2 - 20}
            y={connectionHeight / 2 - 8}
            text="BLOCKED"
            fontSize={8}
            fill="#e74c3c"
            opacity={0.9}
            align="center"
          />
          <Text
            x={connectionWidth / 2 - 15}
            y={connectionHeight / 2 + 2}
            text="PIPE"
            fontSize={8}
            fill="#e74c3c"
            opacity={0.9}
            align="center"
          />
        </Group>
      )}
    </Group>
  );
};

export default PipeFloorConnectionShape;
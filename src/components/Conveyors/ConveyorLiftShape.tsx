import React, { useCallback } from 'react';
import { Group, Rect, Circle, Line, Text } from 'react-konva';
import { ConveyorLift, ConnectionPoint } from '../../types';
import { useLayoutStore } from '../../store/layoutStore';
import { useShallow } from 'zustand/react/shallow';
import { PIXELS_PER_METER } from '../../constants';

interface ConveyorLiftShapeProps {
  lift: ConveyorLift;
}

export const ConveyorLiftShape: React.FC<ConveyorLiftShapeProps> = React.memo(({ lift }) => {
  const { 
    currentFloor, 
    selectedTool, 
    selectedConveyorLift, 
    setSelectedConveyorLift,
    startConveyorDrawing,
    finishConveyorDrawing,
    drawingState
  } = useLayoutStore(
    useShallow(state => ({
      currentFloor: state.currentFloor,
      selectedTool: state.selectedTool,
      selectedConveyorLift: state.selectedConveyorLift,
      setSelectedConveyorLift: state.setSelectedConveyorLift,
      startConveyorDrawing: state.startConveyorDrawing,
      finishConveyorDrawing: state.finishConveyorDrawing,
      drawingState: state.drawingState,
    }))
  );

  const x = lift.x * PIXELS_PER_METER;
  const y = lift.y * PIXELS_PER_METER;
  const liftWidth = 3 * PIXELS_PER_METER; // 3 meter wide lift (larger than pipe connections)
  const liftHeight = 3 * PIXELS_PER_METER; // 3 meter deep lift (larger than pipe connections)

  // Determine visibility and appearance based on current floor
  const isOnStartFloor = currentFloor === lift.startFloor;
  const isOnEndFloor = currentFloor === lift.endFloor;
  const isOnIntermediateFloor = currentFloor > lift.startFloor && currentFloor < lift.endFloor;
  const isVisible = isOnStartFloor || isOnEndFloor || isOnIntermediateFloor;

  if (!isVisible) {
    return null;
  }

  // Different colors for different Mk tiers
  const tierColors = {
    1: '#f39c12', // Orange - Mk.1
    2: '#e67e22', // Darker orange - Mk.2
    3: '#d35400', // Red-orange - Mk.3
    4: '#9b59b6', // Purple - Mk.4
    5: '#8e44ad', // Darker purple - Mk.5
    6: '#6c5ce7', // Blue-purple - Mk.6
  };

  const liftColor = tierColors[lift.mark];
  
  // Different appearance based on floor position
  let opacity = 1;
  let strokeWidth = 2;
  let fillColor = liftColor;

  if (isOnIntermediateFloor) {
    // Show as blocked area on intermediate floors
    opacity = 0.3;
    strokeWidth = 1;
    fillColor = '#95a5a6'; // Gray for blocked area
  } else {
    // Show connection points on start and end floors
    opacity = selectedTool === 'conveyor_lift' ? 0.8 : 1;
  }

  const connectionPointRadius = 4;

  const isSelected = selectedConveyorLift === lift.id;

  const handleClick = (e: any) => {
    e.cancelBubble = true;
    if (selectedTool === 'select') {
      setSelectedConveyorLift(lift.id);
    }
  };

  const handleConnectionMouseDown = useCallback((e: any, connectionPoint: ConnectionPoint) => {
    e.cancelBubble = true;
    
    if (selectedTool === 'conveyor') {
      startConveyorDrawing(undefined, undefined, undefined, lift.id, connectionPoint.id);
    }
  }, [lift.id, selectedTool, startConveyorDrawing]);

  const handleConnectionMouseUp = useCallback((e: any, connectionPoint: ConnectionPoint) => {
    e.cancelBubble = true;
    
    // Check if we're drawing and this isn't the same lift we started from
    if (drawingState.isDrawing) {
      // Check if we started from a different source (building, pole, or different lift)
      const startedFromDifferentSource = (
        drawingState.startBuildingId || 
        (drawingState.startPole && !drawingState.startPole.id.includes(`lift-${lift.id}`))
      );
      
      if (startedFromDifferentSource) {
        finishConveyorDrawing(undefined, undefined, undefined, lift.id, connectionPoint.id);
      }
    }
  }, [lift.id, drawingState, finishConveyorDrawing]);

  return (
    <Group 
      x={x - liftWidth / 2} 
      y={y - liftHeight / 2}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Main lift body */}
      <Rect
        width={liftWidth}
        height={liftHeight}
        fill={fillColor}
        stroke={isSelected ? '#e74c3c' : '#2c3e50'}
        strokeWidth={isSelected ? 3 : strokeWidth}
        opacity={opacity}
        cornerRadius={2}
      />

      {/* Direction indicator */}
      {(isOnStartFloor || isOnEndFloor) && (
        <Group>
          {/* Arrow indicating direction */}
          <Line
            points={[
              liftWidth / 2, liftHeight / 2 - 8,
              liftWidth / 2, liftHeight / 2 + 8,
            ]}
            stroke="#2c3e50"
            strokeWidth={2}
            opacity={0.8}
          />
          {/* Arrow head */}
          <Line
            points={
              lift.direction === 'up'
                ? [
                    liftWidth / 2 - 4, liftHeight / 2 - 4,
                    liftWidth / 2, liftHeight / 2 - 8,
                    liftWidth / 2 + 4, liftHeight / 2 - 4,
                  ]
                : [
                    liftWidth / 2 - 4, liftHeight / 2 + 4,
                    liftWidth / 2, liftHeight / 2 + 8,
                    liftWidth / 2 + 4, liftHeight / 2 + 4,
                  ]
            }
            stroke="#2c3e50"
            strokeWidth={2}
            opacity={0.8}
          />
        </Group>
      )}

      {/* Connection points - only show on start and end floors */}
      {lift.connectionPoints && lift.connectionPoints.map((point) => {
        // Determine which connection point to show based on floor
        const showPoint = (
          (isOnStartFloor && point.id === 'start-floor') ||
          (isOnEndFloor && point.id === 'end-floor')
        );
        
        if (!showPoint) return null;
        
        const cpX = liftWidth / 2 + point.x * PIXELS_PER_METER;
        const cpY = liftHeight / 2 + point.y * PIXELS_PER_METER;
        const isDrawingConveyor = selectedTool === 'conveyor' || drawingState.isDrawing;
        const hitboxRadius = 12;
        
        return (
          <Group key={point.id}>
            {/* Visual connection point */}
            <Circle
              x={cpX}
              y={cpY}
              radius={connectionPointRadius}
              fill={point.type === 'input' ? '#27ae60' : '#e74c3c'}
              stroke="#2c3e50"
              strokeWidth={1}
              opacity={0.9}
              listening={false}
            />
            
            {/* Interactive hitbox for connection */}
            <Circle
              x={cpX}
              y={cpY}
              radius={hitboxRadius}
              fill={isDrawingConveyor ? 'rgba(34,197,94,0.3)' : 'transparent'}
              stroke={isDrawingConveyor ? '#22c55e' : 'transparent'}
              strokeWidth={2}
              onMouseDown={(e) => handleConnectionMouseDown(e, point)}
              onMouseUp={(e) => handleConnectionMouseUp(e, point)}
              onMouseEnter={(e) => {
                if (isDrawingConveyor) {
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'crosshair';
                }
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
              }}
              name="connection"
            />
          </Group>
        );
      })}

      {/* Floor indicator text */}
      {(isOnStartFloor || isOnEndFloor) && (
        <Text
          x={liftWidth + 5}
          y={liftHeight / 2 - 6}
          text={`Mk.${lift.mark} ${lift.direction.toUpperCase()}`}
          fontSize={10}
          fill="#2c3e50"
          opacity={0.8}
        />
      )}

      {/* Height and cost indicator */}
      {(isOnStartFloor || isOnEndFloor) && (
        <Text
          x={liftWidth + 5}
          y={liftHeight / 2 + 6}
          text={`${lift.height}m - ${lift.cost} cost`}
          fontSize={8}
          fill="#7f8c8d"
          opacity={0.8}
        />
      )}

      {/* Blocked area indicator on intermediate floors */}
      {isOnIntermediateFloor && (
        <Group>
          <Text
            x={liftWidth / 2 - 15}
            y={liftHeight / 2 - 6}
            text="BLOCKED"
            fontSize={8}
            fill="#e74c3c"
            opacity={0.9}
            align="center"
          />
          <Text
            x={liftWidth / 2 - 10}
            y={liftHeight / 2 + 4}
            text="LIFT"
            fontSize={8}
            fill="#e74c3c"
            opacity={0.9}
            align="center"
          />
        </Group>
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return prevProps.lift === nextProps.lift;
});

ConveyorLiftShape.displayName = 'ConveyorLiftShape';

export default ConveyorLiftShape;
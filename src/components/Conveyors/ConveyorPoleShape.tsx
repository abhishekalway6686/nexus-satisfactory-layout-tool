// src/components/Conveyors/ConveyorPoleShape.tsx - Enhanced with sci-fi industrial styling

import React from 'react';
import { Group, Circle, Text, Rect, Line } from 'react-konva';
import { ConveyorPole } from '../../types';
import { PIXELS_PER_METER, GRID_SIZE } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { snapToGrid } from '../../utils/helpers';

interface ConveyorPoleShapeProps {
  pole: ConveyorPole;
  isSelected: boolean;
  onSelect: () => void;
  opacity?: number;
  interactive?: boolean;
}

export const ConveyorPoleShape: React.FC<ConveyorPoleShapeProps> = React.memo(({ 
  pole, 
  isSelected, 
  onSelect,
  opacity = 1,
  interactive = true
}) => {
  const { selectedTool, drawingState, startConveyorDrawing, finishConveyorDrawing, updatePole } = useLayoutStore();
  
  const handleMouseDown = (e: any) => {
    if (!interactive) return;
    e.cancelBubble = true;
    console.log('Pole mouseDown:', { poleId: pole.id, selectedTool, isDrawing: drawingState.isDrawing });
    
    if (selectedTool === 'conveyor' && !pole.isAnchor && !drawingState.isDrawing) {
      console.log('Starting conveyor drawing from pole:', pole.id);
      startConveyorDrawing(undefined, undefined, pole.id);
    }
  };
  
  const handleMouseUp = (e: any) => {
    if (!interactive) return;
    e.cancelBubble = true;
    console.log('Pole mouseUp:', { 
      poleId: pole.id, 
      isDrawing: drawingState.isDrawing, 
      startPoleId: drawingState.startPole?.id,
      pathLength: drawingState.currentPath.length 
    });
    
    if (drawingState.isDrawing && !pole.isAnchor) {
      // Don't allow finishing on the same pole we started from
      if (drawingState.startPole?.id === pole.id) {
        console.log('Cannot finish on start pole');
        return;
      }
      
      // Check if we have enough poles in the path
      if (drawingState.currentPath.length < 1) {
        console.log('Not enough poles in path');
        return;
      }
      
      console.log('Finishing conveyor drawing at pole:', pole.id);
      finishConveyorDrawing(undefined, undefined, pole.id);
    }
  };
  
  const handleClick = (e: any) => {
    if (!interactive) return;
    e.cancelBubble = true;
    console.log('Pole clicked:', { poleId: pole.id, selectedTool });
    
    // Handle selection for non-conveyor tools
    if (selectedTool !== 'conveyor') {
      onSelect();
    }
  };
  
  const handleDoubleClick = (e: any) => {
    if (!interactive) return;
    e.cancelBubble = true;
    console.log('Pole double-clicked:', { isDrawing: drawingState.isDrawing, pathLength: drawingState.currentPath.length });
    
    if (drawingState.isDrawing && drawingState.currentPath.length >= 2) {
      console.log('Finishing conveyor drawing via double-click');
      finishConveyorDrawing();
    }
  };
  
  const handleDragEnd = (e: any) => {
    if (!interactive || !pole.isAnchor) { // Only allow dragging non-anchor poles when interactive
      // Get fresh snapping state from store
      const { gridSnappingEnabled } = useLayoutStore.getState();
      const rawX = e.target.x() / PIXELS_PER_METER;
      const rawY = e.target.y() / PIXELS_PER_METER;
      const newX = snapToGrid(rawX, GRID_SIZE, gridSnappingEnabled);
      const newY = snapToGrid(rawY, GRID_SIZE, gridSnappingEnabled);

      updatePole(pole.id, {
        x: newX,
        y: newY
      });
    }
  };
  
  // Don't render anchor poles (they're at building connections)
  if (pole.isAnchor) return null;
  
  const isStartPole = drawingState.isDrawing && drawingState.startPole?.id === pole.id;
  const isInCurrentPath = drawingState.isDrawing && 
    drawingState.currentPath.some(p => p.id === pole.id);
  const canFinishHere = drawingState.isDrawing && 
    !isStartPole && 
    drawingState.currentPath.length >= 1 &&
    !pole.isAnchor;
  
  return (
    <Group
      x={pole.x * PIXELS_PER_METER}
      y={pole.y * PIXELS_PER_METER}
      opacity={opacity}
      draggable={interactive && selectedTool === 'select' && !drawingState.isDrawing}
      onClick={interactive ? handleClick : undefined}
      onMouseDown={interactive ? handleMouseDown : undefined}
      onMouseUp={interactive ? handleMouseUp : undefined}
      onDblClick={interactive ? handleDoubleClick : undefined}
      onDragEnd={interactive ? handleDragEnd : undefined}
      name="pole"
      listening={interactive}
    >
      {/* Start pole indicator with enhanced styling */}
      {isStartPole && (
        <Group>
          <Circle
            radius={18}
            stroke="#22c55e"
            strokeWidth={3}
            opacity={0.8}
            dash={[6, 6]}
            shadowBlur={12}
            shadowColor="rgba(34, 197, 94, 0.6)"
          />
          <Circle
            radius={15}
            fill="rgba(34, 197, 94, 0.1)"
            opacity={0.6}
          />
        </Group>
      )}
      
      {/* Current path indicator with glow */}
      {isInCurrentPath && !isStartPole && (
        <Group>
          <Circle
            radius={14}
            stroke="#fbbf24"
            strokeWidth={2}
            opacity={0.7}
            shadowBlur={8}
            shadowColor="rgba(251, 191, 36, 0.5)"
          />
          <Circle
            radius={12}
            fill="rgba(251, 191, 36, 0.1)"
            opacity={0.4}
          />
        </Group>
      )}
      
      {/* Finish target indicator with pulse effect */}
      {canFinishHere && (
        <Group>
          <Circle
            radius={20}
            stroke="#22c55e"
            strokeWidth={2}
            opacity={0.6}
            dash={[4, 4]}
            shadowBlur={12}
            shadowColor="rgba(34, 197, 94, 0.4)"
          />
          <Circle
            radius={17}
            fill="rgba(34, 197, 94, 0.1)"
            opacity={0.3}
          />
        </Group>
      )}
      
      {/* Enhanced pole structure with industrial design */}
      <Group>
        {/* Pole shadow */}
        <Circle
          radius={8}
          fill="rgba(0,0,0,0.4)"
          offsetY={2}
          blur={3}
        />
        
        {/* Pole base plate */}
        <Circle
          radius={10}
          fill="linear-gradient(145deg, #4a5568, #2d3748)"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={1}
        />
        
        {/* Main pole structure */}
        <Circle
          radius={7}
          fill="linear-gradient(145deg, #718096, #4a5568)"
          stroke={isSelected ? '#fa9549' : '#2d3748'}
          strokeWidth={isSelected ? 3 : 2}
          shadowBlur={isSelected ? 8 : 0}
          shadowColor={isSelected ? 'rgba(250, 149, 73, 0.6)' : undefined}
        />
        
        {/* Pole center hub */}
        <Circle
          radius={4}
          fill="linear-gradient(145deg, #a0aec0, #718096)"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth={1}
        />
        
        {/* Tech details - connection ports */}
        {[0, 90, 180, 270].map(angle => (
          <Group key={angle}>
            <Circle
              x={Math.cos(angle * Math.PI / 180) * 6}
              y={Math.sin(angle * Math.PI / 180) * 6}
              radius={1.5}
              fill="#2d3748"
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={0.5}
            />
            <Circle
              x={Math.cos(angle * Math.PI / 180) * 6}
              y={Math.sin(angle * Math.PI / 180) * 6}
              radius={0.8}
              fill="#4a5568"
            />
          </Group>
        ))}
        
        {/* Status LED when selected */}
        {isSelected && (
          <Circle
            x={0}
            y={-9}
            radius={1.5}
            fill="#22c55e"
            shadowBlur={6}
            shadowColor="#22c55e"
          />
        )}
        
        {/* Support struts for industrial look */}
        {[45, 135, 225, 315].map(angle => (
          <Line
            key={`strut-${angle}`}
            points={[
              Math.cos(angle * Math.PI / 180) * 4,
              Math.sin(angle * Math.PI / 180) * 4,
              Math.cos(angle * Math.PI / 180) * 8,
              Math.sin(angle * Math.PI / 180) * 8
            ]}
            stroke="rgba(74, 85, 104, 0.6)"
            strokeWidth={1}
          />
        ))}
      </Group>
      
      {/* Enhanced click hints with better styling */}
      {canFinishHere && (
        <Group y={28}>
  <Rect
    x={-35}
    y={-8}
    width={70}  // Fixed width instead of minWidth
    height={16}
    fill="rgba(0,0,0,0.8)"
    cornerRadius={4}
    stroke="#22c55e"
    strokeWidth={1}
  />
  <Text
    x={-35}  // Match the rect's x position
    y={-4}
    text="Click to finish"
    fontSize={8}
    fill="#22c55e"
    fontFamily="Inter, Arial, sans-serif"
    fontStyle="bold"
    align='center'
    width={70}  // Match the rect's width
    verticalAlign='middle'
  />
</Group>
      )}
      
      {/* Start hint */}
      {selectedTool === 'conveyor' && !drawingState.isDrawing && !isInCurrentPath && (
<Group y={28}>
  <Rect
    x={-35}
    y={-8}
    width={70}  // Fixed width instead of minWidth
    height={16}
    fill="rgba(0,0,0,0.8)"
    cornerRadius={4}
    stroke="#fa9549"
    strokeWidth={1}
  />
  <Text
    x={-35}  // Match the rect's x position
    y={-4}
    text="Click to start"
    fontSize={8}
    fill="#fa9549"
    fontFamily="Inter, Arial, sans-serif"
    fontStyle="bold"
    align='center'
    width={70}  // Match the rect's width
    verticalAlign='middle'
  />
</Group>
      )}
      
      {/* Enhanced drag hint when selected */}
      {isSelected && selectedTool === 'select' && (
<Group y={28}>
  <Rect
    x={-35}
    y={-8}
    width={70}  // Fixed width instead of minWidth
    height={16}
    fill="rgba(0,0,0,0.8)"
    cornerRadius={4}
    stroke="#fa9549"
    strokeWidth={1}
  />
  <Text
    x={-35}  // Match the rect's x position
    y={-4}
    text="Drag to move"
    fontSize={8}
    fill="#fa9549"
    fontFamily="Inter, Arial, sans-serif"
    fontStyle="bold"
    align='center'
    width={70}  // Match the rect's width
    verticalAlign='middle'
  />
</Group>
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return prevProps.pole === nextProps.pole &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.onSelect === nextProps.onSelect &&
         prevProps.opacity === nextProps.opacity &&
         prevProps.interactive === nextProps.interactive;
});

ConveyorPoleShape.displayName = 'ConveyorPoleShape';
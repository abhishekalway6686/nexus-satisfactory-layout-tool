// src/components/Pipes/PipeSupportShape.tsx - Fixed with proper hitbox and event handling

import React from 'react';
import { Group, Circle, Rect, Text, Arrow } from 'react-konva';
import { PipeSupport } from '../../types';
import { PIXELS_PER_METER, GRID_SIZE } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { snapToGrid } from '../../utils/helpers';

interface PipeSupportShapeProps {
  support: PipeSupport;
  isSelected: boolean;
  onSelect: () => void;
  opacity?: number;
  interactive?: boolean;
}

export const PipeSupportShape: React.FC<PipeSupportShapeProps> = ({ 
  support, 
  isSelected, 
  onSelect,
  opacity = 1,
  interactive = true
}) => {
  const { selectedTool, drawingState, startPipeDrawing, finishPipeDrawing, updatePipeSupport, deletePipeSupport } = useLayoutStore();
  
  const handleMouseDown = (e: any) => {
    if (!interactive) return;
    e.cancelBubble = true;
    console.log('PipeSupport mouseDown:', { 
      supportId: support.id, 
      selectedTool, 
      drawingPipe: drawingState.drawingPipe,
      isAnchor: support.isAnchor 
    });
    
    if (selectedTool === 'pipe' && !support.isAnchor && !drawingState.drawingPipe) {
      console.log('Starting pipe from support:', support.id);
      startPipeDrawing(undefined, undefined, support.id);
    }
  };
  
  const handleMouseUp = (e: any) => {
    if (!interactive) return;
    e.cancelBubble = true;
    console.log('PipeSupport mouseUp:', { 
      supportId: support.id, 
      drawingPipe: drawingState.drawingPipe,
      startSupportId: drawingState.pipeStartSupport?.id,
      pathLength: drawingState.pipePath?.length 
    });
    
    if (drawingState.drawingPipe && !support.isAnchor) {
      // Don't allow finishing on the same support we started from
      if (drawingState.pipeStartSupport?.id === support.id) {
        console.log('Cannot finish on start support');
        return;
      }
      
      // Check if we have enough supports in the path
      if (!drawingState.pipePath || drawingState.pipePath.length < 1) {
        console.log('Not enough supports in path');
        return;
      }
      
      console.log('Finishing pipe drawing at support:', support.id);
      finishPipeDrawing(undefined, undefined, support.id);
    }
  };
  
  const handleClick = (e: any) => {
    if (!interactive) return;
    e.cancelBubble = true;
    console.log('PipeSupport clicked:', { supportId: support.id, selectedTool });
    
    // Handle selection for non-pipe tools
    if (selectedTool === 'select') {
      onSelect();
    } else if (selectedTool === 'delete') {
      deletePipeSupport(support.id);
    }
  };
  
  const handleDragEnd = (e: any) => {
    if (!interactive || !support.isAnchor) { // Only allow dragging non-anchor supports when interactive
      // Get fresh snapping state from store
      const { gridSnappingEnabled } = useLayoutStore.getState();
      const rawX = e.target.x() / PIXELS_PER_METER;
      const rawY = e.target.y() / PIXELS_PER_METER;
      const newX = snapToGrid(rawX, GRID_SIZE, gridSnappingEnabled);
      const newY = snapToGrid(rawY, GRID_SIZE, gridSnappingEnabled);

      updatePipeSupport(support.id, {
        x: newX,
        y: newY
      });
    }
  };
    // Don't render anchor supports (they're at building connections)
  if (support.isAnchor) return null;
  
  const isStartSupport = drawingState.drawingPipe && drawingState.pipeStartSupport?.id === support.id;
  const isInCurrentPath = drawingState.drawingPipe && 
    drawingState.pipePath?.some(s => s.id === support.id);
  const canFinishHere = drawingState.drawingPipe && 
    !isStartSupport && 
    drawingState.pipePath && 
    drawingState.pipePath.length >= 1;
  
  // Determine cursor based on state
  const getCursor = () => {
    if (selectedTool === 'select') {
      return 'grab';
    } else if (selectedTool === 'pipe') {
      if (drawingState.drawingPipe && canFinishHere) {
        return 'pointer';
      } else if (!drawingState.drawingPipe) {
        return 'crosshair';
      }
    } else if (selectedTool === 'delete') {
      return 'not-allowed';
    }
    return 'default';
  };
  
  return (
    <Group
      x={support.x * PIXELS_PER_METER}
      y={support.y * PIXELS_PER_METER}
      opacity={opacity}
      draggable={interactive && selectedTool === 'select' && !drawingState.drawingPipe && !support.isAnchor}
      onClick={interactive ? handleClick : undefined}
      onMouseDown={interactive ? handleMouseDown : undefined}
      onMouseUp={interactive ? handleMouseUp : undefined}
      onDragEnd={interactive ? handleDragEnd : undefined}
      onMouseEnter={interactive ? (e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = getCursor();
      } : undefined}
      onMouseLeave={interactive ? (e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = 'default';
      } : undefined}
      name="pipe-support"
      listening={interactive}
    >
      {/* Invisible larger hitbox for easier clicking */}
      <Circle
        radius={20}
        fill="transparent"
        listening={interactive}
        name="pipe-support"
      />
      
      {/* Start support indicator with enhanced styling */}
      {isStartSupport && (
        <Circle
          radius={20}
          stroke="#00b7ff"
          strokeWidth={4}
          fill="rgba(0, 183, 255, 0.1)"
          opacity={0.9}
          dash={[8, 4]}
          listening={false}
          shadowBlur={12}
          shadowColor="#00b7ff"
        />
      )}
      
      {/* Current path indicator */}
      {isInCurrentPath && !isStartSupport && (
        <Circle
          radius={16}
          stroke="#00ffff"
          strokeWidth={3}
          fill="rgba(0, 255, 255, 0.1)"
          opacity={0.7}
          listening={false}
          shadowBlur={8}
          shadowColor="#00ffff"
        />
      )}
      
      {/* Finish target indicator */}
      {canFinishHere && (
        <Circle
          radius={22}
          stroke="#00b7ff"
          strokeWidth={3}
          fill="rgba(0, 183, 255, 0.1)"
          opacity={0.7}
          dash={[6, 3]}
          listening={false}
          shadowBlur={10}
          shadowColor="#00b7ff"
        />
      )}
      
      {/* Support structure with enhanced styling */}
      {support.isPump ? (
        <Group listening={false}>
          {/* Pump glow effect */}
          <Rect
            x={-12}
            y={-16}
            width={24}
            height={32}
            fill="rgba(41, 128, 185, 0.3)"
            cornerRadius={6}
            blur={8}
          />
          
          {/* Pump body with enhanced design */}
          <Rect
            x={-10}
            y={-14}
            width={20}
            height={28}
            fill="linear-gradient(145deg, #2980b9, #1f5f8b)"
            stroke={isSelected ? '#fff' : '#34495e'}
            strokeWidth={isSelected ? 4 : 2}
            cornerRadius={4}
            shadowBlur={isSelected ? 12 : 6}
            shadowColor={isSelected ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0,0,0,0.4)'}
          />
          
          {/* Pump housing details */}
          <Rect
            x={-8}
            y={-12}
            width={16}
            height={24}
            fill="linear-gradient(145deg, #3498db, #2980b9)"
            cornerRadius={2}
          />
          
          {/* Pump impeller indicator */}
          <Circle
            x={0}
            y={0}
            radius={6}
            fill="rgba(255,255,255,0.3)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={1}
          />
          
          {/* Enhanced pump direction arrow */}
          {support.pumpDirection === 'up' ? (
            <Arrow
              points={[0, 8, 0, -12]}
              pointerLength={8}
              pointerWidth={10}
              fill="#fff"
              stroke="#fff"
              strokeWidth={2}
              shadowBlur={6}
              shadowColor="#fff"
            />
          ) : (
            <Arrow
              points={[0, -8, 0, 12]}
              pointerLength={8}
              pointerWidth={10}
              fill="#fff"
              stroke="#fff"
              strokeWidth={2}
              shadowBlur={6}
              shadowColor="#fff"
            />
          )}
          
          {/* Pump label */}
          <Text
            y={20}
            text="PUMP"
            fontSize={8}
            fill="#2980b9"
            fontWeight="bold"
            align="center"
            width={24}
            offsetX={12}
          />
        </Group>
      ) : (
        <Group listening={false}>
          {/* Regular support shadow */}
          <Circle
            radius={10}
            fill="rgba(0,0,0,0.3)"
            offsetY={3}
          />
          
          {/* Regular support base with enhanced styling */}
          <Circle
            radius={10}
            fill="linear-gradient(145deg, #34495e, #2c3e50)"
            stroke={isSelected ? '#fff' : '#2c3e50'}
            strokeWidth={isSelected ? 4 : 2}
            shadowBlur={isSelected ? 12 : 6}
            shadowColor={isSelected ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0,0,0,0.4)'}
          />
          
          {/* Support center with metallic appearance */}
          <Circle
            radius={6}
            fill="linear-gradient(145deg, #7f8c8d, #5d6d7e)"
          />
          
          {/* Support highlight */}
          <Circle
            radius={3}
            fill="rgba(255,255,255,0.6)"
            offsetY={-2}
          />
        </Group>
      )}
      
      {/* Enhanced hints based on state - all with listening={false} */}
      {selectedTool === 'pipe' && !drawingState.drawingPipe && !support.isPump && (
        <Text
          y={-35}
          text="Click to start pipe"
          fontSize={9}
          fill="#00b7ff"
          fontWeight="bold"
          align="center"
          width={80}
          offsetX={40}
          listening={false}
        />


      )}
      
      {canFinishHere && (
        <Text
          y={-35}
          text="Click to finish"
          fontSize={9}
          fill="#00b7ff"
          fontWeight="bold"
          align="center"
          width={70}
          offsetX={35}
          listening={false}
        />
      )}
      
      {/* Enhanced pump info when selected */}
      {isSelected && support.isPump && (
        <Text
          y={35}
          text={`+20m ${support.pumpDirection?.toUpperCase()}`}
          fontSize={9}
          fill="#2980b9"
          fontWeight="bold"
          align="center"
          width={80}
          offsetX={40}
          listening={false}
        />
      )}
    </Group>
  );
};
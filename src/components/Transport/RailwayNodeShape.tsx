// src/components/Transport/RailwayNodeShape.tsx - Enhanced with sci-fi styling and improved dragging

import React from 'react';
import { Group, Circle, Text, Rect } from 'react-konva';
import { Point3D } from '../../types';
import { PIXELS_PER_METER, GRID_SIZE } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { snapToGrid } from '../../utils/helpers';

interface RailwayNodeShapeProps {
  point: Point3D;
  segmentId: string;
  isStart: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

export const RailwayNodeShape: React.FC<RailwayNodeShapeProps> = ({
  point,
  segmentId,
  isStart,
  isSelected,
  onSelect
}) => {
  const { selectedTool, drawingState, railwaySegments, railwayNodes, updateRailwayNode, startRailwayDrawing, deleteRailwaySegment } = useLayoutStore();
  
const handleDragEnd = (e: any) => {
  // Get fresh snapping state from store
  const { gridSnappingEnabled } = useLayoutStore.getState();
  const rawX = e.target.x() / PIXELS_PER_METER;
  const rawY = e.target.y() / PIXELS_PER_METER;
  const newX = snapToGrid(rawX, GRID_SIZE, gridSnappingEnabled);
  const newY = snapToGrid(rawY, GRID_SIZE, gridSnappingEnabled);

  const segment = railwaySegments[segmentId];
  const nodeId = isStart ? segment.startNode : segment.endNode;

  updateRailwayNode(nodeId, { x: newX, y: newY });

  // Snap the position immediately
  e.target.x(newX * PIXELS_PER_METER);
  e.target.y(newY * PIXELS_PER_METER);
};
  
  const handleClick = (e: any) => {
    // FIX: When in railway drawing mode, DO NOT intercept clicks on other endpoints.
    // Let the event propagate to the canvas so it can add a railway point.
    // The user can press Enter to finish and snap to nearby endpoints.
    // This prevents the bug where hovering/clicking on other endpoints
    // would unexpectedly finish or reset the railway drawing.
    if (selectedTool === 'railway' && drawingState.drawingRailway) {
      // Don't cancel bubble - let event propagate to canvas for normal point handling
      // The canvas click handler will detect if we're near a node and handle snapping
      // via the addRailwayPoint logic
      return;
    }
    
    e.cancelBubble = true; // Prevent event from propagating to stage

    if (selectedTool === 'railway' && !drawingState.drawingRailway) {
      // Start new railway drawing from this node
      const segment = railwaySegments[segmentId];
      if (!segment) return;

      const nodeId = isStart ? segment.startNode : segment.endNode;
      const node = railwayNodes[nodeId];
      if (!node) return;

      console.log('[RailwayNodeShape] Starting new railway from existing node:', nodeId);
      startRailwayDrawing(undefined, undefined, nodeId);
      return;
    }

    if (selectedTool === 'delete') {
      // Delete the railway segment associated with this node
      const segment = railwaySegments[segmentId];
      if (!segment) return;

      // Delete the segment (the store will clean up empty railways)
      deleteRailwaySegment(segmentId);
    } else {
      onSelect();
    }
  };
  
  return (
    <Group
      x={point.x * PIXELS_PER_METER}
      y={point.y * PIXELS_PER_METER}
      draggable={selectedTool === 'select'}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      name="railway-node"
    >
      {/* Node glow effect when selected or when railway tool is active */}
      {(isSelected || (selectedTool === 'railway')) && (
        <Circle
          radius={18}
          fill={selectedTool === 'railway' ? "rgba(44, 175, 254, 0.3)" : "rgba(44, 62, 80, 0.3)"}
          blur={8}
          listening={false}
        />
      )}
      
      {/* Larger invisible clickable area */}
      <Circle
        radius={20}
        fill="transparent"
      />
      
      {/* Node shadow */}
      <Circle
        radius={isSelected ? 14 : 10}
        fill="rgba(0,0,0,0.4)"
        offsetY={3}
        listening={false}
      />
      
      {/* Main node with enhanced metallic appearance */}
      <Circle
        radius={isSelected ? 14 : 10}
        fill="linear-gradient(145deg, #2c3e50, #34495e, #2c3e50)"
        stroke={isSelected ? '#fff' : '#34495e'}
        strokeWidth={isSelected ? 4 : 2}
        shadowBlur={isSelected ? 12 : 6}
        shadowColor={isSelected ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0,0,0,0.6)'}
      />
      
      {/* Node center with railway-specific styling */}
      <Circle
        radius={isSelected ? 8 : 6}
        fill="linear-gradient(145deg, #5d4e37, #6b5b40)"
        listening={false}
      />
      
      {/* Inner highlight */}
      <Circle
        radius={isSelected ? 4 : 3}
        fill="rgba(255,255,255,0.4)"
        offsetY={isSelected ? -2 : -1}
        listening={false}
      />
      
      {/* Railway connection indicator */}
      <Rect
        x={isSelected ? -6 : -4}
        y={isSelected ? -1 : -0.5}
        width={isSelected ? 12 : 8}
        height={isSelected ? 2 : 1}
        fill="#c0c0c0"
        cornerRadius={0.5}
        listening={false}
      />
      
      {/* Node type indicator */}
      {isSelected && (
        <Group>
          <Rect
            x={-15}
            y={-30}
            width={30}
            height={16}
            fill="rgba(44, 62, 80, 0.9)"
            cornerRadius={4}
            stroke="#fff"
            strokeWidth={1}
            shadowBlur={6}
            shadowColor="rgba(44, 62, 80, 0.8)"
            listening={false}
          />
          <Text
            text={isStart ? "START" : "END"}
            fontSize={8}
            fill="#ecf0f1"
            fontWeight="bold"
            align="center"
            width={30}
            offsetX={15}
            y={-26}
            listening={false}
          />
        </Group>
      )}
      
{/* Drag hint when selected */}
{isSelected && selectedTool === 'select' && (
  <Group y={25}>
    <Rect
      x={-35}
      y={-10}
      width={70}
      height={18}
      fill="rgba(0,0,0,0.8)"
      cornerRadius={4}
      stroke="#2c3e50"
      strokeWidth={1}
      listening={false}
    />
    <Text
      x={-35}
      y={-5}
      text="Drag to move"
      fontSize={9}
      fill="#eeeeee"
      fontWeight="bold"
      align="center"
      width={70}
      listening={false}
    />
  </Group>
)}
      
      {/* Railway tool hint - updated to reflect new behavior */}
      {selectedTool === 'railway' && (
        <Text
          y={-40}
          text={drawingState.drawingRailway ? "Snap point (Enter to finish)" : "Click to start railway"}
          fontSize={9}
          fill="#2cafe6"
          fontWeight="bold"
          align="center"
          width={140}
          offsetX={70}
          listening={false}
        />
      )}
      
      {/* Delete hint when in delete mode */}
      {selectedTool === 'delete' && (
        <Text
          y={-40}
          text="Click to delete"
          fontSize={9}
          fill="#e74c3c"
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

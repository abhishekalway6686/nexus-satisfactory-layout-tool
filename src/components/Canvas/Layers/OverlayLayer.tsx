// src/components/Canvas/layers/OverlayLayer.tsx
import React from 'react';
import { Layer, Group, Line, Circle } from 'react-konva';
import { ConveyorLiftShape } from '../../Conveyors/ConveyorLiftShape';
import { PipeFloorConnectionShape } from '../../Pipes/PipeFloorConnectionShape';
import { PowerlineShape } from '../../Transport/PowerlineShape';
import { ConveyorDrawingPreview } from '../ConveyorDrawingPreview';
import { RailwayDrawingPreview } from '../RailwayDrawingPreview';
import { PipeDrawingPreview } from '../PipeDrawingPreview';
import { FoundationDrawingPreview } from '../FoundationDrawingPreview';
import { WallDrawingPreview } from '../WallDrawingPreview';
import { RailingDrawingPreview } from '../RailingDrawingPreview';
import { StationSnapIndicator } from '../StationSnapIndicator';
import { PIXELS_PER_METER, GRID_SIZE } from '../../../constants';
import { snapToGrid } from '../../../utils/helpers';
import {
  ConveyorLift,
  PipeFloorConnection,
  PowerlineSegment
} from '../../../types';

// Memoized components for better performance
const MemoizedConveyorLiftShape = React.memo(ConveyorLiftShape);
const MemoizedPipeFloorConnectionShape = React.memo(PipeFloorConnectionShape);
const MemoizedPowerlineShape = React.memo(PowerlineShape);

interface OverlayLayerProps {
  // Auxiliary content (interactive)
  conveyorLifts: Record<string, ConveyorLift>;
  pipeFloorConnections: Record<string, PipeFloorConnection>;
  currentFloorPowerlineSegments: PowerlineSegment[];
  selectedPowerlineSegment: string | null;
  scale: number;

  // UI overlay content (non-interactive)
  drawingState: any; // TODO: Type this properly
  selectedTool: string;
  powerlineConnectionState: any; // TODO: Type this properly
  mousePos: { x: number; y: number };
  stageRef: React.RefObject<any>;
  position: { x: number; y: number };
  currentFloor: number;
  config: any; // TODO: Type this properly
  gridSnappingEnabled: boolean;
  stationSnapIndicator: any; // TODO: Type this properly
}

export const OverlayLayer = React.memo<OverlayLayerProps>(({
  // Auxiliary props
  conveyorLifts,
  pipeFloorConnections,
  currentFloorPowerlineSegments,
  selectedPowerlineSegment,
  scale,
  // UI overlay props
  drawingState,
  selectedTool,
  powerlineConnectionState,
  mousePos,
  stageRef,
  position,
  currentFloor,
  config,
  gridSnappingEnabled,
  stationSnapIndicator
}) => {
  // DEBUG: Log when powerline segments are received
  if (currentFloorPowerlineSegments && currentFloorPowerlineSegments.length > 0) {
    console.log('[OverlayLayer] Received', currentFloorPowerlineSegments.length, 'powerline segments to render');
  }
  // Helper function to get mouse position for drawing previews
  const getMousePosForPreview = () => {
    const stage = stageRef.current;
    if (stage) {
      const point = stage.getPointerPosition();
      if (point) return point;
    }
    // Fallback: convert world coordinates back to pixels
    return {
      x: mousePos.x * PIXELS_PER_METER * scale + position.x,
      y: mousePos.y * PIXELS_PER_METER * scale + position.y
    };
  };

  return (
    <Layer>
      {/* Auxiliary Content Group (interactive) - rendered first for proper z-order */}
      <Group>
        {/* Render conveyor lifts */}
        {conveyorLifts && Object.values(conveyorLifts).map(lift => (
          <MemoizedConveyorLiftShape
            key={lift.id}
            lift={lift}
          />
        ))}

        {/* Render pipe floor connections */}
        {pipeFloorConnections && Object.values(pipeFloorConnections).map(connection => (
          <MemoizedPipeFloorConnectionShape
            key={connection.id}
            connection={connection}
          />
        ))}

        {/* Render powerline segments */}
        {currentFloorPowerlineSegments && currentFloorPowerlineSegments.map(segment => (
          <MemoizedPowerlineShape
            key={segment.id}
            segment={segment}
            isSelected={selectedPowerlineSegment === segment.id}
            opacity={1}
            scale={scale}
          />
        ))}
      </Group>

      {/* UI Overlay Group (non-interactive) - rendered on top */}
      <Group listening={false}>
        {/* Drawing previews with consistent props */}
        {drawingState.isDrawing && (
          <ConveyorDrawingPreview
            mousePos={getMousePosForPreview()}
            scale={scale}
            position={position}
            currentFloor={currentFloor}
          />
        )}

        {drawingState.drawingRailway && (
          <RailwayDrawingPreview
            mousePos={getMousePosForPreview()}
            scale={scale}
            position={position}
            currentFloor={currentFloor}
          />
        )}

        {/* Simplified Powerline Connection Preview */}
        {selectedTool === 'powerline' && powerlineConnectionState?.startPoint && (
          <Group>
            {/* Preview line from start point to mouse cursor */}
            <Line
              points={[
                powerlineConnectionState.startPoint.position.x * PIXELS_PER_METER,
                powerlineConnectionState.startPoint.position.y * PIXELS_PER_METER,
                mousePos.x * PIXELS_PER_METER,
                mousePos.y * PIXELS_PER_METER
              ]}
              stroke="#ffaa00"
              strokeWidth={3}
              opacity={0.7}
              dash={[8, 4]}
              listening={false}
            />

            {/* Start point indicator */}
            <Circle
              x={powerlineConnectionState.startPoint.position.x * PIXELS_PER_METER}
              y={powerlineConnectionState.startPoint.position.y * PIXELS_PER_METER}
              radius={12}
              fill="rgba(255, 170, 0, 0.3)"
              stroke="#ffaa00"
              strokeWidth={3}
              listening={false}
            />

            {/* End point indicator (at mouse cursor) */}
            <Circle
              x={mousePos.x * PIXELS_PER_METER}
              y={mousePos.y * PIXELS_PER_METER}
              radius={8}
              fill="rgba(255, 170, 0, 0.5)"
              stroke="#ffaa00"
              strokeWidth={2}
              dash={[4, 2]}
              listening={false}
            />
          </Group>
        )}

        {drawingState.drawingPipe && (
          <PipeDrawingPreview
            mousePos={getMousePosForPreview()}
            scale={scale}
            position={position}
            currentFloor={currentFloor}
          />
        )}

        {/* FIXED: Show foundation preview when tool is selected OR actively drawing */}
        {(selectedTool === 'foundation' || drawingState.drawingFoundation) && (
          <FoundationDrawingPreview
            mousePos={getMousePosForPreview()}
            scale={scale}
            position={position}
          />
        )}

        {/* FIXED: Show wall preview when tool is selected OR actively drawing */}
        {(selectedTool === 'wall' || drawingState.drawingWall) && (
          <WallDrawingPreview
            mousePos={getMousePosForPreview()}
            scale={scale}
            position={position}
            currentFloor={currentFloor}
          />
        )}

        {/* Show railing preview when tool is selected OR actively drawing */}
        {(selectedTool === 'railing' || drawingState.drawingRailing) && (
          <RailingDrawingPreview
            mousePos={getMousePosForPreview()}
            scale={scale}
            position={position}
            currentFloor={currentFloor}
          />
        )}

        {/* Enhanced grid snap indicator - only on higher performance */}
        {config.shadowQuality !== 'low' && (selectedTool === 'pipe_support' || selectedTool === 'railway' || selectedTool === 'powerline' ||
          drawingState.isDrawing || drawingState.drawingRailway || drawingState.drawingPipe || drawingState.drawingPowerline?.isDrawing) && (
          <Group>
            <Circle
              x={snapToGrid(mousePos.x, GRID_SIZE, gridSnappingEnabled) * PIXELS_PER_METER}
              y={snapToGrid(mousePos.y, GRID_SIZE, gridSnappingEnabled) * PIXELS_PER_METER}
              radius={8}
              stroke={drawingState.drawingRailway ? "#666" : drawingState.drawingPipe ? "#00b7ff" : drawingState.drawingPowerline?.isDrawing ? "#ffaa00" : "#fa9549"}
              strokeWidth={2}
              opacity={gridSnappingEnabled ? 0.6 : 0.3}
              dash={[4, 4]}
              listening={false}
            />

            <Circle
              x={snapToGrid(mousePos.x, GRID_SIZE, gridSnappingEnabled) * PIXELS_PER_METER}
              y={snapToGrid(mousePos.y, GRID_SIZE, gridSnappingEnabled) * PIXELS_PER_METER}
              radius={2}
              fill={drawingState.drawingRailway ? "#666" : drawingState.drawingPipe ? "#00b7ff" : drawingState.drawingPowerline?.isDrawing ? "#ffaa00" : "#fa9549"}
              opacity={0.8}
              listening={false}
            />
          </Group>
        )}

        {/* Station snapping visual indicator */}
        <StationSnapIndicator
          visualIndicator={stationSnapIndicator}
          opacity={0.8}
        />
      </Group>
    </Layer>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders during canvas drag
  // Auxiliary content changes should trigger re-render, UI overlay position changes should not
  return (
    prevProps.conveyorLifts === nextProps.conveyorLifts &&
    prevProps.pipeFloorConnections === nextProps.pipeFloorConnections &&
    prevProps.currentFloorPowerlineSegments === nextProps.currentFloorPowerlineSegments &&
    prevProps.selectedPowerlineSegment === nextProps.selectedPowerlineSegment &&
    prevProps.scale === nextProps.scale &&
    prevProps.drawingState === nextProps.drawingState &&
    prevProps.selectedTool === nextProps.selectedTool &&
    prevProps.powerlineConnectionState === nextProps.powerlineConnectionState &&
    prevProps.mousePos.x === nextProps.mousePos.x &&
    prevProps.mousePos.y === nextProps.mousePos.y &&
    prevProps.stageRef === nextProps.stageRef &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.currentFloor === nextProps.currentFloor &&
    prevProps.config === nextProps.config &&
    prevProps.gridSnappingEnabled === nextProps.gridSnappingEnabled &&
    prevProps.stationSnapIndicator === nextProps.stationSnapIndicator
  );
});

OverlayLayer.displayName = 'OverlayLayer';

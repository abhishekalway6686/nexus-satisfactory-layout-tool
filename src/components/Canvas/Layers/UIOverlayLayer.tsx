// src/components/Canvas/layers/UIOverlayLayer.tsx
import React from 'react';
import { Layer, Group, Line, Circle } from 'react-konva';
import { ConveyorDrawingPreview } from '../ConveyorDrawingPreview';
import { RailwayDrawingPreview } from '../RailwayDrawingPreview';
import { PipeDrawingPreview } from '../PipeDrawingPreview';
import { FoundationDrawingPreview } from '../FoundationDrawingPreview';
import { WallDrawingPreview } from '../WallDrawingPreview';
import { RailingDrawingPreview } from '../RailingDrawingPreview';
import { StationSnapIndicator } from '../StationSnapIndicator';
import { PIXELS_PER_METER, GRID_SIZE } from '../../../constants';
import { snapToGrid } from '../../../utils/helpers';

interface UIOverlayLayerProps {
  // Drawing states
  drawingState: any; // TODO: Type this properly
  selectedTool: string;
  powerlineConnectionState: any; // TODO: Type this properly
  
  // Mouse and interaction
  mousePos: { x: number; y: number };
  stageRef: React.RefObject<any>;
  scale: number;
  position: { x: number; y: number };
  currentFloor: number;
  
  // Configuration
  config: any; // TODO: Type this properly
  gridSnappingEnabled: boolean;
  
  // Station snapping
  stationSnapIndicator: any; // TODO: Type this properly
}

export const UIOverlayLayer = React.memo<UIOverlayLayerProps>(({
  drawingState,
  selectedTool,
  powerlineConnectionState,
  mousePos,
  stageRef,
  scale,
  position,
  currentFloor,
  config,
  gridSnappingEnabled,
  stationSnapIndicator
}) => {
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
    <Layer listening={false}>
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
    </Layer>
  );
});

UIOverlayLayer.displayName = 'UIOverlayLayer';
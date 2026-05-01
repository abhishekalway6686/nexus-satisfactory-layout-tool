import React, { useRef, useEffect } from 'react';
import { Layer, Circle, Group } from 'react-konva';
import { RailwayDrawingPreview } from '../RailwayDrawingPreview';
import { ConveyorDrawingPreview } from '../ConveyorDrawingPreview';
import { PipeDrawingPreview } from '../PipeDrawingPreview';
import { FoundationDrawingPreview } from '../FoundationDrawingPreview';
import { WallDrawingPreview } from '../WallDrawingPreview';
import { RailwayDebugOverlay } from '../../Transport/RailwayDebugOverlay';
import { useLayoutStore } from '../../../store/layoutStore';
import { useShallow } from 'zustand/react/shallow';
import Konva from 'konva';

interface InteractiveLayerProps {
  scale: number;
  currentFloor: number;
  mousePos: { x: number; y: number };
  selectedTool: string | null;
  showRailwayDebug?: boolean;
  listening?: boolean;
}

// This layer renders interactive elements - previews, debug overlays, cursor indicators
// It updates frequently but only subscribes to drawing-related state
export const InteractiveLayer = React.memo<InteractiveLayerProps>(({ 
  scale, 
  currentFloor,
  mousePos,
  selectedTool,
  showRailwayDebug = false,
  listening = true
}) => {
  const layerRef = useRef<Konva.Layer>(null);
  
  // Only subscribe to drawing-related state
  const {
    drawingState,
    snapIndicator,
    railways
  } = useLayoutStore(
    useShallow((state) => ({
      drawingState: state.drawingState,
      snapIndicator: state.snapIndicator,
      railways: showRailwayDebug ? state.railways : {}
    }))
  );
  
  // Extract drawing state properties for easier access
  const {
    isDrawing,
    mode,
    currentPath,
    drawingPipe,
    pipePath,
    drawingRailway,
    railwayPath,
    drawingFoundation,
    foundationStartPoint,
    drawingWall,
    wallStartPoint,
    wallSegments
  } = drawingState;
  
  // Use batchDraw for smooth preview updates
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.batchDraw();
    }
  }, [mousePos, currentPath, pipePath, railwayPath, foundationStartPoint, wallSegments]);
  
  // Show cursor based on selected tool
  const showCursor = selectedTool && !isDrawing && !drawingPipe && !drawingRailway && 
                    !drawingFoundation && !drawingWall;
  
  return (
    <Layer 
      ref={layerRef}
      name="interactive" 
      listening={listening}
      clearBeforeDraw={true}
    >
      {/* Drawing Previews */}
      <Group name="drawing-previews">
        {(isDrawing && mode === 'conveyor') && currentPath.length > 0 && (
          <ConveyorDrawingPreview
            mousePos={mousePos}
            scale={scale}
            position={{ x: 0, y: 0 }}
            currentFloor={currentFloor}
          />
        )}
        
        {drawingPipe && pipePath && pipePath.length > 0 && (
          <PipeDrawingPreview
            mousePos={mousePos}
            scale={scale}
            position={{ x: 0, y: 0 }}
            currentFloor={currentFloor}
          />
        )}
        
        {drawingRailway && railwayPath && railwayPath.length > 0 && (
          <RailwayDrawingPreview
            mousePos={mousePos}
            scale={scale}
            position={{ x: 0, y: 0 }}
            currentFloor={currentFloor}
          />
        )}
        
        {drawingFoundation && foundationStartPoint && (
          <FoundationDrawingPreview
            mousePos={mousePos}
            scale={scale}
            position={{ x: 0, y: 0 }}
          />
        )}
        
        {drawingWall && wallStartPoint && (
          <WallDrawingPreview
            mousePos={mousePos}
            scale={scale}
            position={{ x: 0, y: 0 }}
            currentFloor={currentFloor}
          />
        )}
      </Group>
      
      {/* Snap Indicator */}
      {snapIndicator && (
        <Group name="snap-indicator">
          <Circle
            x={snapIndicator.x}
            y={snapIndicator.y}
            radius={12 / scale}
            fill="transparent"
            stroke="#10B981"
            strokeWidth={3 / scale}
            dash={[5 / scale, 5 / scale]}
          />
          <Circle
            x={snapIndicator.x}
            y={snapIndicator.y}
            radius={6 / scale}
            fill="#10B981"
            opacity={0.5}
          />
        </Group>
      )}
      
      {/* Cursor Indicator */}
      {showCursor && (
        <Circle
          x={mousePos.x}
          y={mousePos.y}
          radius={5 / scale}
          fill="#6366F1"
          opacity={0.6}
          listening={false}
        />
      )}
      
      {/* Railway Debug Overlay */}
      {showRailwayDebug && (
        <Group name="railway-debug">
          <RailwayDebugOverlay
            visible={showRailwayDebug}
          />
        </Group>
      )}
    </Layer>
  );
});

InteractiveLayer.displayName = 'InteractiveLayer';
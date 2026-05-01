// src/components/Canvas/layers/StaticBackgroundLayer.tsx
import React from 'react';
import { Layer } from 'react-konva';
import { GridBackground } from '../GridBackground';

interface StaticBackgroundLayerProps {
  showGrid: boolean;
  canvasSize: { width: number; height: number };
  scale: number;
  position: { x: number; y: number };
  stageRef: React.RefObject<any>;
}

export const StaticBackgroundLayer = React.memo<StaticBackgroundLayerProps>(({
  showGrid,
  canvasSize,
  scale,
  position,
  stageRef
}) => {
  // Provide sensible defaults if dimensions are not ready
  const safeWidth = canvasSize.width > 0 ? canvasSize.width : window.innerWidth || 800;
  const safeHeight = canvasSize.height > 0 ? canvasSize.height : window.innerHeight || 600;
  const safeScale = scale > 0 ? scale : 1;
  
  return (
    <Layer listening={false}>
      {showGrid && (
        <GridBackground
          width={safeWidth}
          height={safeHeight}
          scale={safeScale}
          showGrid={true}
          stageX={position.x}
          stageY={position.y}
          stageRef={stageRef}
        />
      )}
    </Layer>
  );
});

StaticBackgroundLayer.displayName = 'StaticBackgroundLayer';
import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { PIXELS_PER_METER } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';

interface FoundationDrawingPreviewProps {
  mousePos: { x: number; y: number }; // Mouse position in pixels
  scale: number;
  position: { x: number; y: number };
}

export const FoundationDrawingPreview: React.FC<FoundationDrawingPreviewProps> = ({ 
  mousePos, 
  scale, 
  position 
}) => {
  const { drawingState, selectedTool } = useLayoutStore();

  // Convert mouse position to world coordinates
  const worldMouseX = (mousePos.x - position.x) / scale / PIXELS_PER_METER;
  const worldMouseY = (mousePos.y - position.y) / scale / PIXELS_PER_METER;

  // Snap to 8m grid
  const snapX = Math.round(worldMouseX / 8) * 8;
  const snapY = Math.round(worldMouseY / 8) * 8;

  // Show snap preview dots when foundation tool is selected, even if not actively drawing
  if (selectedTool === 'foundation' && !drawingState.drawingFoundation) {
    return (
      <Group>
        {/* Snap indicator dot */}
        <Circle
          x={snapX * PIXELS_PER_METER}
          y={snapY * PIXELS_PER_METER}
          radius={6}
          fill="rgba(150, 150, 150, 0.8)"
          stroke="rgba(255, 255, 255, 0.9)"
          strokeWidth={2}
        />
        {/* Small grid preview around cursor */}
        <Rect
          x={snapX * PIXELS_PER_METER - 4}
          y={snapY * PIXELS_PER_METER - 4}
          width={8}
          height={8}
          fill="none"
          stroke="rgba(150, 150, 150, 0.6)"
          strokeWidth={1}
          dash={[2, 2]}
        />
      </Group>
    );
  }

  // Show snap preview even before starting to draw
  if (!drawingState.drawingFoundation || !drawingState.foundationStartPoint) {
    return null;
  }

  // Calculate foundation dimensions
  const startX = Math.min(drawingState.foundationStartPoint.x, snapX);
  const startY = Math.min(drawingState.foundationStartPoint.y, snapY);
  const endX = Math.max(drawingState.foundationStartPoint.x, snapX);
  const endY = Math.max(drawingState.foundationStartPoint.y, snapY);

  // Snap dimensions to 8m grid
  const x = Math.floor(startX / 8) * 8;
  const y = Math.floor(startY / 8) * 8;
  const width = Math.ceil((endX - x) / 8) * 8;
  const height = Math.ceil((endY - y) / 8) * 8;

  // Don't show if dimensions are 0
  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <Group>
      {/* Foundation preview */}
      <Rect
        x={x * PIXELS_PER_METER}
        y={y * PIXELS_PER_METER}
        width={width * PIXELS_PER_METER}
        height={height * PIXELS_PER_METER}
        fill="rgba(100, 100, 100, 0.3)"
        stroke="rgba(200, 200, 200, 0.8)"
        strokeWidth={2}
        dash={[5, 5]}
      />

      {/* Grid overlay to show 8m segments */}
      {Array.from({ length: Math.floor(width / 8) + 1 }).map((_, i) => (
        <Rect
          key={`v-${i}`}
          x={(x + i * 8) * PIXELS_PER_METER}
          y={y * PIXELS_PER_METER}
          width={1}
          height={height * PIXELS_PER_METER}
          fill="rgba(200, 200, 200, 0.3)"
        />
      ))}
      {Array.from({ length: Math.floor(height / 8) + 1 }).map((_, i) => (
        <Rect
          key={`h-${i}`}
          x={x * PIXELS_PER_METER}
          y={(y + i * 8) * PIXELS_PER_METER}
          width={width * PIXELS_PER_METER}
          height={1}
          fill="rgba(200, 200, 200, 0.3)"
        />
      ))}

      {/* Dimension display */}
      <Text
        x={(x + width / 2) * PIXELS_PER_METER}
        y={(y + height / 2) * PIXELS_PER_METER}
        text={`${width}m × ${height}m`}
        fontSize={16}
        fontFamily="Arial"
        fill="white"
        align="center"
        verticalAlign="middle"
        shadowColor="black"
        shadowBlur={3}
        shadowOpacity={0.8}
      />

      {/* Corner indicators */}
      <Rect
        x={x * PIXELS_PER_METER - 2}
        y={y * PIXELS_PER_METER - 2}
        width={4}
        height={4}
        fill="rgba(255, 255, 255, 0.8)"
      />
      <Rect
        x={(x + width) * PIXELS_PER_METER - 2}
        y={(y + height) * PIXELS_PER_METER - 2}
        width={4}
        height={4}
        fill="rgba(255, 255, 255, 0.8)"
      />
    </Group>
  );
};
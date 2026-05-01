import React from 'react';
import { Group, Line, Circle, Text, Rect } from 'react-konva';
import { PIXELS_PER_METER } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';

interface RailingDrawingPreviewProps {
  mousePos: { x: number; y: number }; // Mouse position in pixels
  scale: number;
  position: { x: number; y: number };
  currentFloor: number;
}

export const RailingDrawingPreview: React.FC<RailingDrawingPreviewProps> = ({ 
  mousePos, 
  scale, 
  position, 
  currentFloor 
}) => {
  const { drawingState, foundations, selectedTool } = useLayoutStore();

  // Convert mouse position to world coordinates
  const worldMouseX = (mousePos.x - position.x) / scale / PIXELS_PER_METER;
  const worldMouseY = (mousePos.y - position.y) / scale / PIXELS_PER_METER;

  // Find nearest foundation edge for snapping with improved tolerance
  let snapX = worldMouseX;
  let snapY = worldMouseY;
  let snappedToFoundation = false;
  let closestDistance = Infinity;

  Object.values(foundations).forEach(foundation => {
    if (foundation.floor !== currentFloor) return;

    const edges = [
      // Top edge
      { x1: foundation.x, y1: foundation.y, x2: foundation.x + foundation.width, y2: foundation.y },
      // Bottom edge
      { x1: foundation.x, y1: foundation.y + foundation.height, x2: foundation.x + foundation.width, y2: foundation.y + foundation.height },
      // Left edge
      { x1: foundation.x, y1: foundation.y, x2: foundation.x, y2: foundation.y + foundation.height },
      // Right edge
      { x1: foundation.x + foundation.width, y1: foundation.y, x2: foundation.x + foundation.width, y2: foundation.y + foundation.height },
    ];

    edges.forEach(edge => {
      // Calculate distance from mouse to edge
      const dx = edge.x2 - edge.x1;
      const dy = edge.y2 - edge.y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length === 0) return; // Skip zero-length edges
      
      const t = Math.max(0, Math.min(1, ((worldMouseX - edge.x1) * dx + (worldMouseY - edge.y1) * dy) / (dx * dx + dy * dy)));
      const nearestX = edge.x1 + t * dx;
      const nearestY = edge.y1 + t * dy;
      const distance = Math.sqrt((worldMouseX - nearestX) ** 2 + (worldMouseY - nearestY) ** 2);

      // Snap if within 4 meters and closest
      if (distance < 4 && distance < closestDistance) {
        snapX = nearestX;
        snapY = nearestY;
        snappedToFoundation = true;
        closestDistance = distance;
      }
    });
  });

  // If not snapped to foundation, fall back to 8m grid snapping
  if (!snappedToFoundation) {
    snapX = Math.round(snapX / 8) * 8;
    snapY = Math.round(snapY / 8) * 8;
  }

  // Show snap preview dots when railing tool is selected, even if not actively drawing
  if (selectedTool === 'railing' && (!drawingState.drawingRailing || !drawingState.railingStartPoint)) {
    return (
      <Group>
        {/* Snap indicator dot */}
        <Circle
          x={snapX * PIXELS_PER_METER}
          y={snapY * PIXELS_PER_METER}
          radius={6}
          fill={snappedToFoundation ? "rgba(100, 255, 100, 0.8)" : "rgba(150, 150, 150, 0.8)"}
          stroke="rgba(255, 255, 255, 0.9)"
          strokeWidth={2}
        />
        
        {/* Snap type indicator */}
        {snappedToFoundation && (
          <Text
            x={snapX * PIXELS_PER_METER}
            y={snapY * PIXELS_PER_METER + 15}
            text="Snap"
            fontSize={12}
            fontFamily="Arial"
            fill="rgba(100, 255, 100, 0.9)"
            align="center"
            shadowColor="black"
            shadowBlur={2}
            shadowOpacity={0.8}
          />
        )}
      </Group>
    );
  }

  if (!drawingState.drawingRailing || !drawingState.railingStartPoint) {
    return null;
  }

  // Get the last point (either from existing segments or start point)
  const lastPoint = drawingState.railingSegments && drawingState.railingSegments.length > 0
    ? { 
        x: drawingState.railingSegments[drawingState.railingSegments.length - 1].endX,
        y: drawingState.railingSegments[drawingState.railingSegments.length - 1].endY
      }
    : drawingState.railingStartPoint;

  // Calculate railing segments from last point to current position
  const dx = snapX - lastPoint.x;
  const dy = snapY - lastPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Create preview segments
  const previewSegments: { x: number; y: number; endX: number; endY: number }[] = [];
  const numSegments = Math.ceil(distance / 8);

  for (let i = 0; i < numSegments; i++) {
    const t = i / numSegments;
    const segmentX = Math.round((lastPoint.x + dx * t) / 8) * 8;
    const segmentY = Math.round((lastPoint.y + dy * t) / 8) * 8;
    const nextT = Math.min((i + 1) / numSegments, 1);
    const segmentEndX = Math.round((lastPoint.x + dx * nextT) / 8) * 8;
    const segmentEndY = Math.round((lastPoint.y + dy * nextT) / 8) * 8;

    previewSegments.push({ x: segmentX, y: segmentY, endX: segmentEndX, endY: segmentEndY });
  }

  return (
    <Group>
      {/* Existing railing segments */}
      {drawingState.railingSegments?.map((segment, index) => (
        <Group key={index}>
          {/* Bottom rail */}
          <Line
            points={[
              segment.x * PIXELS_PER_METER,
              segment.y * PIXELS_PER_METER,
              segment.endX * PIXELS_PER_METER,
              segment.endY * PIXELS_PER_METER,
            ]}
            stroke="rgba(100, 100, 100, 0.8)"
            strokeWidth={2}
          />
          {/* Top rail */}
          <Line
            points={[
              segment.x * PIXELS_PER_METER,
              (segment.y - 0.3) * PIXELS_PER_METER,
              segment.endX * PIXELS_PER_METER,
              (segment.endY - 0.3) * PIXELS_PER_METER,
            ]}
            stroke="rgba(100, 100, 100, 0.8)"
            strokeWidth={2}
          />
          {/* Start post */}
          <Circle
            x={segment.x * PIXELS_PER_METER}
            y={segment.y * PIXELS_PER_METER}
            radius={2}
            fill="rgba(120, 120, 120, 0.8)"
          />
        </Group>
      ))}

      {/* Preview segments */}
      {previewSegments.map((segment, index) => (
        <Group key={`preview-${index}`}>
          {/* Bottom rail preview */}
          <Line
            points={[
              segment.x * PIXELS_PER_METER,
              segment.y * PIXELS_PER_METER,
              segment.endX * PIXELS_PER_METER,
              segment.endY * PIXELS_PER_METER,
            ]}
            stroke="rgba(150, 150, 150, 0.6)"
            strokeWidth={2}
            dash={[5, 5]}
          />
          {/* Top rail preview */}
          <Line
            points={[
              segment.x * PIXELS_PER_METER,
              (segment.y - 0.3) * PIXELS_PER_METER,
              segment.endX * PIXELS_PER_METER,
              (segment.endY - 0.3) * PIXELS_PER_METER,
            ]}
            stroke="rgba(150, 150, 150, 0.6)"
            strokeWidth={2}
            dash={[5, 5]}
          />
        </Group>
      ))}

      {/* Current cursor position */}
      <Circle
        x={snapX * PIXELS_PER_METER}
        y={snapY * PIXELS_PER_METER}
        radius={5}
        fill={snappedToFoundation ? "rgba(100, 255, 100, 0.8)" : "rgba(255, 255, 255, 0.8)"}
        stroke="rgba(0, 0, 0, 0.5)"
        strokeWidth={1}
      />

      {/* Height indicator */}
      <Group x={snapX * PIXELS_PER_METER + 10} y={snapY * PIXELS_PER_METER - 20}>
        <Rect
          x={0}
          y={0}
          width={60}
          height={20}
          fill="rgba(0, 0, 0, 0.7)"
          cornerRadius={3}
        />
        <Text
          x={30}
          y={10}
          text="1m"
          fontSize={14}
          fontFamily="Arial"
          fill="white"
          align="center"
          verticalAlign="middle"
        />
      </Group>

      {/* Snap indicator */}
      {snappedToFoundation && (
        <Text
          x={snapX * PIXELS_PER_METER}
          y={snapY * PIXELS_PER_METER + 10}
          text="Snapped"
          fontSize={12}
          fontFamily="Arial"
          fill="rgba(100, 255, 100, 0.8)"
          align="center"
          shadowColor="black"
          shadowBlur={2}
          shadowOpacity={0.8}
        />
      )}
    </Group>
  );
};
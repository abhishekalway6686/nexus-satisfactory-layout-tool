// src/components/Conveyors/EndpointNodeShape.tsx
// Visual component for unconnected conveyor belt endpoints
// Shows an orange node with dashed border to indicate a "free end"

import React, { useEffect, useState } from 'react';
import { Group, Circle, Text, Rect } from 'react-konva';
import { ConveyorEndpoint } from '../../logic/conveyor/endpointDetection';
import { PIXELS_PER_METER } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';

interface EndpointNodeShapeProps {
  endpoint: ConveyorEndpoint;
  scale: number;
  interactive?: boolean;
}

export const EndpointNodeShape: React.FC<EndpointNodeShapeProps> = React.memo(({
  endpoint,
  scale,
  interactive = true
}) => {
  const {
    selectedTool,
    drawingState,
    startConveyorDrawing,
    finishConveyorDrawing
  } = useLayoutStore();

  // Pulse animation state
  const [pulseRadius, setPulseRadius] = useState(0);
  const [pulseOpacity, setPulseOpacity] = useState(0.6);

  // Animate pulse effect
  useEffect(() => {
    if (!interactive || selectedTool !== 'conveyor') return;

    let animationFrame: number;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) % 2000; // 2 second cycle
      const progress = elapsed / 2000;

      // Expand from 0 to 20, then reset
      setPulseRadius(progress * 20);
      // Fade out as it expands
      setPulseOpacity(0.6 * (1 - progress));

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [interactive, selectedTool]);

  const handleMouseDown = (e: any) => {
    if (!interactive) return;
    e.cancelBubble = true;

    // Start drawing from this endpoint
    if (selectedTool === 'conveyor' && !drawingState.isDrawing) {
      console.log('Starting conveyor drawing from endpoint pole:', endpoint.poleId);
      startConveyorDrawing(undefined, undefined, endpoint.poleId);
    }
  };

  const handleMouseUp = (e: any) => {
    if (!interactive) return;
    e.cancelBubble = true;

    // Finish drawing at this endpoint
    if (drawingState.isDrawing) {
      // Don't allow finishing on the same pole we started from
      if (drawingState.startPole?.id === endpoint.poleId) {
        console.log('Cannot finish on start pole');
        return;
      }

      // Check if we have enough poles in the path
      if (drawingState.currentPath.length < 1) {
        console.log('Not enough poles in path');
        return;
      }

      console.log('Finishing conveyor drawing at endpoint pole:', endpoint.poleId);
      finishConveyorDrawing(undefined, undefined, endpoint.poleId);
    }
  };

  const handleClick = (e: any) => {
    if (!interactive) return;
    e.cancelBubble = true;
  };

  // Check drawing state for visual feedback
  const isStartPole = drawingState.isDrawing && drawingState.startPole?.id === endpoint.poleId;
  const canFinishHere = drawingState.isDrawing &&
    !isStartPole &&
    drawingState.currentPath.length >= 1;

  // Show label based on zoom level
  const showLabel = scale > 0.5;

  // Orange color scheme for free ends
  const primaryColor = '#f97316'; // Orange-500
  const glowColor = 'rgba(249, 115, 22, 0.5)';
  const backgroundColor = 'rgba(249, 115, 22, 0.15)';

  // Use green when this is a valid finish target
  const activeColor = canFinishHere ? '#22c55e' : primaryColor;
  const activeGlow = canFinishHere ? 'rgba(34, 197, 94, 0.5)' : glowColor;

  return (
    <Group
      x={endpoint.pole.x * PIXELS_PER_METER}
      y={endpoint.pole.y * PIXELS_PER_METER}
      onClick={interactive ? handleClick : undefined}
      onMouseDown={interactive ? handleMouseDown : undefined}
      onMouseUp={interactive ? handleMouseUp : undefined}
      name="endpoint-node"
      listening={interactive}
    >
      {/* Animated pulse ring - only show when conveyor tool is active */}
      {selectedTool === 'conveyor' && !drawingState.isDrawing && (
        <Circle
          radius={12 + pulseRadius}
          stroke={primaryColor}
          strokeWidth={2}
          opacity={pulseOpacity}
        />
      )}

      {/* Outer glow ring */}
      <Circle
        radius={16}
        stroke={activeColor}
        strokeWidth={2}
        opacity={0.5}
        dash={[5, 5]}
        shadowBlur={12}
        shadowColor={activeGlow}
      />

      {/* Background fill */}
      <Circle
        radius={13}
        fill={backgroundColor}
        opacity={0.8}
      />

      {/* Main node - dashed border indicating "free end" */}
      <Circle
        radius={10}
        fill="rgba(0,0,0,0.6)"
        stroke={activeColor}
        strokeWidth={3}
        dash={[4, 3]}
        shadowBlur={8}
        shadowColor={activeGlow}
      />

      {/* Inner indicator */}
      <Circle
        radius={5}
        fill={activeColor}
        opacity={0.9}
      />

      {/* Direction indicator arrow */}
      {!endpoint.isStart ? (
        // This is an output end - arrow pointing outward
        <Group>
          <Circle
            x={0}
            y={-6}
            radius={2}
            fill={activeColor}
          />
        </Group>
      ) : (
        // This is an input end - arrow pointing inward
        <Group>
          <Circle
            x={0}
            y={6}
            radius={2}
            fill={activeColor}
          />
        </Group>
      )}

      {/* Finish target indicator */}
      {canFinishHere && (
        <Group>
          <Circle
            radius={22}
            stroke="#22c55e"
            strokeWidth={2}
            opacity={0.7}
            dash={[4, 4]}
            shadowBlur={12}
            shadowColor="rgba(34, 197, 94, 0.4)"
          />
        </Group>
      )}

      {/* "Free End" label - shown at high zoom */}
      {showLabel && selectedTool === 'conveyor' && !drawingState.isDrawing && (
        <Group y={-30}>
          <Rect
            x={-35}
            y={-8}
            width={70}
            height={16}
            fill="rgba(0,0,0,0.85)"
            cornerRadius={4}
            stroke={primaryColor}
            strokeWidth={1}
          />
          <Text
            x={-35}
            y={-4}
            text="Free End"
            fontSize={9}
            fill={primaryColor}
            fontFamily="Inter, Arial, sans-serif"
            fontStyle="bold"
            align="center"
            width={70}
            verticalAlign="middle"
          />
        </Group>
      )}

      {/* Click hint when conveyor tool active */}
      {showLabel && selectedTool === 'conveyor' && !drawingState.isDrawing && (
        <Group y={26}>
          <Rect
            x={-40}
            y={-8}
            width={80}
            height={16}
            fill="rgba(0,0,0,0.85)"
            cornerRadius={4}
            stroke={primaryColor}
            strokeWidth={1}
          />
          <Text
            x={-40}
            y={-4}
            text="Click to continue"
            fontSize={8}
            fill={primaryColor}
            fontFamily="Inter, Arial, sans-serif"
            fontStyle="bold"
            align="center"
            width={80}
            verticalAlign="middle"
          />
        </Group>
      )}

      {/* Finish hint when drawing */}
      {showLabel && canFinishHere && (
        <Group y={26}>
          <Rect
            x={-40}
            y={-8}
            width={80}
            height={16}
            fill="rgba(0,0,0,0.85)"
            cornerRadius={4}
            stroke="#22c55e"
            strokeWidth={1}
          />
          <Text
            x={-40}
            y={-4}
            text="Click to connect"
            fontSize={8}
            fill="#22c55e"
            fontFamily="Inter, Arial, sans-serif"
            fontStyle="bold"
            align="center"
            width={80}
            verticalAlign="middle"
          />
        </Group>
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.endpoint.poleId === nextProps.endpoint.poleId &&
    prevProps.endpoint.pole.x === nextProps.endpoint.pole.x &&
    prevProps.endpoint.pole.y === nextProps.endpoint.pole.y &&
    prevProps.scale === nextProps.scale &&
    prevProps.interactive === nextProps.interactive
  );
});

EndpointNodeShape.displayName = 'EndpointNodeShape';

// src/components/Conveyors/ConveyorBeltShape.tsx - Enhanced with sci-fi industrial styling

import React, { useState, useEffect, useRef } from 'react';
import { Group, Path, Circle, Arrow, Rect, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { PIXELS_PER_METER } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { generateConveyorPath } from '../../utils/helpers';
import { usePerformanceMode } from '../../hooks/usePerformanceMode';

interface ConveyorBeltShapeProps {
  beltId: string;
  opacity?: number;
  onBeltClick?: (beltId: string) => void;
  interactive?: boolean;
}

export const ConveyorBeltShape: React.FC<ConveyorBeltShapeProps> = React.memo(({
  beltId,
  opacity = 1,
  onBeltClick,
  interactive = true
}) => {
  // Get belt directly from store to react to updates
  const belt = useLayoutStore(state => state.conveyorBelts[beltId]);

  // Performance mode for animation control
  const { config, isLowPerformance } = usePerformanceMode();

  // Animation state for conveyor flow
  const [dashOffset, setDashOffset] = useState(0);
  const animationRef = useRef<number | null>(null);

  const {
    conveyorSegments,
    conveyorPoles,
    selectedTool,
    selectedConveyorSegment,
    setSelectedConveyorSegment,
    deleteConveyorSegment,
    setSelectedBuilding,
    setSelectedPole,
    setSelectedPipeSupport,
    setSelectedPipeSegment,
    setSelectedStickyNote,
    setSelectedConveyorLift,
    setSelectedPipeFloorConnection,
    setSelectedFoundation,
    setSelectedWall,
    setSelectedRailwaySegment,
    setSelectedRailwayNode
  } = useLayoutStore();

  // Enhanced color schemes for different belt tiers with industrial look
  const colors: Record<number, { base: string; edge: string; roller: string; glow: string; name: string; speed: string }> = {
    1: {
      base: '#8B4513',
      edge: '#654321',
      roller: '#444',
      glow: 'rgba(139, 69, 19, 0.3)',
      name: 'Mk.1',
      speed: '60/min'
    },
    2: {
      base: '#FF8C00',
      edge: '#CC7000',
      roller: '#555',
      glow: 'rgba(255, 140, 0, 0.3)',
      name: 'Mk.2',
      speed: '120/min'
    },
    3: {
      base: '#FFD700',
      edge: '#CCAA00',
      roller: '#666',
      glow: 'rgba(255, 215, 0, 0.3)',
      name: 'Mk.3',
      speed: '270/min'
    },
    4: {
      base: '#00CED1',
      edge: '#00A8AA',
      roller: '#777',
      glow: 'rgba(0, 206, 209, 0.3)',
      name: 'Mk.4',
      speed: '480/min'
    },
    5: {
      base: '#FF1493',
      edge: '#CC1075',
      roller: '#888',
      glow: 'rgba(255, 20, 147, 0.3)',
      name: 'Mk.5',
      speed: '780/min'
    },
    6: {
      base: '#9400D3',
      edge: '#7600AA',
      roller: '#999',
      glow: 'rgba(148, 0, 211, 0.3)',
      name: 'Mk.6',
      speed: '1200/min'
    }
  };

  // Use default values if belt is null (belt existence check comes after hooks)
  const beltMark = belt?.mark ?? 1;
  const beltDirection = belt?.direction ?? 'forward';

  const beltColors = colors[beltMark];
  const beltWidth = 6 + beltMark * 2; // Width increases with tier

  // Animation speed based on belt tier (higher tier = faster belt = faster animation)
  // Mk.1: 60/min, Mk.2: 120/min, Mk.3: 270/min, Mk.4: 480/min, Mk.5: 780/min, Mk.6: 1200/min
  const beltSpeedMultiplier = [0.5, 1, 2.25, 4, 6.5, 10][beltMark - 1] || 1;

  // Animation for conveyor flow - respects performance mode settings
  useEffect(() => {
    // Don't animate if belt doesn't exist, conveyor animations are disabled, or in low performance mode
    if (!belt || !config.enableConveyorAnimations || isLowPerformance) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Update dash offset based on belt speed
      // Base speed + tier multiplier, with direction based on belt direction
      const direction = beltDirection === 'forward' ? 1 : -1;
      const speed = 0.03 * beltSpeedMultiplier * direction;

      setDashOffset(prev => {
        const newOffset = prev + speed * deltaTime;
        // Keep offset in a reasonable range to prevent overflow
        return newOffset % 100;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [belt, config.enableConveyorAnimations, isLowPerformance, beltSpeedMultiplier, beltDirection]);

  // Early return if belt not found - MUST be after all hooks
  if (!belt) return null;

  const handleSegmentClick = (e: KonvaEventObject<MouseEvent>, segmentId: string) => {
    if (!interactive) return;
    e.cancelBubble = true;

    if (selectedTool === 'delete') {
      deleteConveyorSegment(segmentId);
    } else if (selectedTool === 'select') {
      setSelectedConveyorSegment(segmentId);
      // Clear other selections
      setSelectedBuilding(null);
      setSelectedPole(null);
      setSelectedPipeSupport(null);
      setSelectedPipeSegment(null);
      setSelectedStickyNote(null);
      setSelectedConveyorLift(null);
      setSelectedPipeFloorConnection(null);
      setSelectedFoundation(null);
      setSelectedWall(null);
      setSelectedRailwaySegment(null);
      setSelectedRailwayNode(null);
    } else if (onBeltClick) {
      onBeltClick(belt.id);
    }
  };
  
  return (
    <Group opacity={opacity}>
      {belt.segments.map((segmentId, segmentIndex) => {
        const segment = conveyorSegments[segmentId];
        if (!segment) return null;
        
        // Check if poles exist before rendering
        const startPole = conveyorPoles[segment.startPole];
        const endPole = conveyorPoles[segment.endPole];
        if (!startPole || !endPole) return null;
        
        const path = generateConveyorPath(segment, conveyorPoles);
        if (!path) return null;
        
        // Calculate segment length for roller spacing
        const segLength = segment.length * PIXELS_PER_METER;
        const rollerCount = Math.floor(segLength / 15); // Roller every 1.5m
        
        // Determine arrow direction based on belt direction
        let arrowStartX, arrowStartY, arrowEndX, arrowEndY;
        if (belt.direction === 'forward') {
          arrowStartX = startPole.x * PIXELS_PER_METER;
          arrowStartY = startPole.y * PIXELS_PER_METER;
          arrowEndX = endPole.x * PIXELS_PER_METER;
          arrowEndY = endPole.y * PIXELS_PER_METER;
        } else {
          arrowStartX = endPole.x * PIXELS_PER_METER;
          arrowStartY = endPole.y * PIXELS_PER_METER;
          arrowEndX = startPole.x * PIXELS_PER_METER;
          arrowEndY = startPole.y * PIXELS_PER_METER;
        }
        
        // Check if this segment is selected
        const isSelected = selectedConveyorSegment === segment.id;

        return (
          <React.Fragment key={segmentId}>
            {/* Selection highlight - rendered behind belt */}
            {isSelected && (
              <Path
                data={path}
                stroke="#ff9800"
                strokeWidth={beltWidth + 12}
                lineCap="round"
                lineJoin="round"
                opacity={0.5}
                listening={false}
              />
            )}

            {/* Enhanced belt glow effect */}
            <Path
              data={path}
              stroke={beltColors.glow}
              strokeWidth={beltWidth + 8}
              lineCap="round"
              lineJoin="round"
              blur={6}
              opacity={0.6}
              listening={false}
            />
            
            {/* Belt shadow with improved depth */}
            <Path
              data={path}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={beltWidth + 4}
              lineCap="round"
              lineJoin="round"
              offsetY={3}
              blur={2}
              onClick={interactive ? (e) => handleSegmentClick(e, segment.id) : undefined}
              name="belt"
              listening={interactive}
            />
            
            {/* Belt support structure (darker underlayer) */}
            <Path
              data={path}
              stroke="rgba(60, 60, 60, 0.8)"
              strokeWidth={beltWidth + 3}
              lineCap="round"
              lineJoin="round"
              onClick={interactive ? (e) => handleSegmentClick(e, segment.id) : undefined}
              name="belt"
              listening={interactive}
            />
            
            {/* Belt edges with metallic appearance */}
            <Path
              data={path}
              stroke={`linear-gradient(90deg, ${beltColors.edge}, ${beltColors.base}, ${beltColors.edge})`}
              strokeWidth={beltWidth + 2}
              lineCap="round"
              lineJoin="round"
              onClick={interactive ? (e) => handleSegmentClick(e, segment.id) : undefined}
              name="belt"
              listening={interactive}
            />
            
            {/* Main belt surface with gradient */}
            <Path
              data={path}
              stroke={`linear-gradient(45deg, ${beltColors.base}, ${beltColors.edge})`}
              strokeWidth={beltWidth}
              lineCap="round"
              lineJoin="round"
              onClick={interactive ? (e) => handleSegmentClick(e, segment.id) : undefined}
              name="belt"
              listening={interactive}
            />
            
            {/* Belt center groove for realism */}
            <Path
              data={path}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={Math.max(1, beltWidth / 4)}
              lineCap="round"
              lineJoin="round"
              onClick={interactive ? (e) => handleSegmentClick(e, segment.id) : undefined}
              name="belt"
              listening={interactive}
            />
            
            {/* Belt surface texture with moving pattern effect - animated when enabled */}
            <Path
              data={path}
              stroke={beltColors.edge}
              strokeWidth={beltWidth - 1}
              lineCap="round"
              lineJoin="round"
              dash={[3, 2]}
              dashOffset={config.enableConveyorAnimations ? dashOffset : 0}
              opacity={0.4}
              onClick={interactive ? (e) => handleSegmentClick(e, segment.id) : undefined}
              name="belt"
              listening={interactive}
            />

            {/* Animated flow indicator - shows material movement direction */}
            {config.enableConveyorAnimations && !isLowPerformance && (
              <Path
                data={path}
                stroke={beltColors.base}
                strokeWidth={Math.max(2, beltWidth / 2)}
                lineCap="round"
                lineJoin="round"
                dash={[6, 12]}
                dashOffset={-dashOffset * 2}
                opacity={0.7}
                listening={false}
              />
            )}

            {/* Static flow indicator for low/medium performance modes */}
            {(!config.enableConveyorAnimations || isLowPerformance) && (
              <Path
                data={path}
                stroke={beltColors.base}
                strokeWidth={Math.max(1, beltWidth / 3)}
                lineCap="round"
                lineJoin="round"
                dash={[4, 8]}
                opacity={0.5}
                listening={false}
              />
            )}
            
            {/* Enhanced roller indicators for straight segments */}
            {segment.type === 'straight' && Array.from({ length: rollerCount }).map((_, i) => {
              const t = (i + 1) / (rollerCount + 1);
              const x = startPole.x + (endPole.x - startPole.x) * t;
              const y = startPole.y + (endPole.y - startPole.y) * t;
              
              return (
                <Group key={`roller-${i}`} x={x * PIXELS_PER_METER} y={y * PIXELS_PER_METER}>
                  {/* Roller shadow */}
                  <Circle
                    radius={beltWidth / 3 + 1}
                    fill="rgba(0,0,0,0.3)"
                    offsetY={1}
                  />
                  
                  {/* Main roller with metallic appearance */}
                  <Circle
                    radius={beltWidth / 3}
                    fill={`linear-gradient(45deg, ${beltColors.roller}, #666, ${beltColors.roller})`}
                    stroke="rgba(0,0,0,0.4)"
                    strokeWidth={1}
                  />
                  
                  {/* Roller highlight */}
                  <Circle
                    radius={beltWidth / 4}
                    fill="rgba(255,255,255,0.2)"
                  />
                </Group>
              );
            })}
            
            {/* Enhanced direction arrows with glow */}
            <Arrow
              x={(arrowStartX + arrowEndX) / 2}
              y={(arrowStartY + arrowEndY) / 2}
              points={[
                0, 0,
                (arrowEndX - arrowStartX) * 0.12,
                (arrowEndY - arrowStartY) * 0.12
              ]}
              pointerLength={8}
              pointerWidth={8}
              fill="rgba(255,255,255,0.9)"
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={2}
              shadowBlur={6}
              shadowColor="rgba(255,255,255,0.5)"
            />
            
            {/* Belt tier indicator on first segment */}
            {segmentIndex === 0 && (
              <Group 
                x={(arrowStartX + arrowEndX) / 2 + 20} 
                y={(arrowStartY + arrowEndY) / 2 - 15}
              >
                {/* Indicator background */}
                <Rect
                  x={-15}
                  y={-8}
                  width={30}
                  height={16}
                  fill="rgba(0,0,0,0.8)"
                  cornerRadius={4}
                  stroke={beltColors.base}
                  strokeWidth={1}
                />
                
                {/* Tier text */}
                <Text
                  text={beltColors.name}
                  fontSize={8}
                  fill={beltColors.base}
                  fontFamily="Inter, Arial, sans-serif"
                  fontStyle="bold"
                  width={30}
                  align="center"
                  offsetX={15}
                  y={-4}
                />
              </Group>
            )}
          </React.Fragment>
        );
      })}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  // Note: belt data is read from store, so we only compare beltId
  return prevProps.beltId === nextProps.beltId &&
         prevProps.opacity === nextProps.opacity &&
         prevProps.onBeltClick === nextProps.onBeltClick &&
         prevProps.interactive === nextProps.interactive;
});

ConveyorBeltShape.displayName = 'ConveyorBeltShape';
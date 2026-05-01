// src/components/Transport/RailwayShape.tsx
import React from 'react';
import { Group, Line, Circle, Text, Rect, Arrow } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Railway } from '../../types';
import { PIXELS_PER_METER } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { RailwayNodeShape } from './RailwayNodeShape';
import { getParallelCurvePoints, getArrowPositionsAlongPath } from '../../utils/helpers';
import { getQuadraticBezierPoints } from '../../logic/common/curveUtils';

interface RailwayShapeProps {
  railway: Railway;
  opacity?: number;
  onRailClick?: (railId: string) => void;
  interactive?: boolean;
  renderLayer?: 'under' | 'over' | 'full'; // 'under' = ballast only, 'over' = rails/ties only, 'full' = everything
}


export const RailwayShape: React.FC<RailwayShapeProps> = React.memo(({ railway, opacity = 1, onRailClick, interactive = true, renderLayer = 'full' }) => {
  const { 
    railwaySegments, 
    railwayNodes, 
    buildings, 
    selectedTool, 
    setSelectedRailwayNode, 
    selectedRailwayNode, 
    setSelectedRailwaySegment, 
    selectedRailwaySegment, 
    deleteRailwaySegment,
    setSelectedBuilding,
    setSelectedPole,
    setSelectedPipeSupport,
    setSelectedStickyNote,
    setSelectedConveyorLift,
    setSelectedPipeFloorConnection,
    setSelectedFoundation,
    setSelectedWall
  } = useLayoutStore();

  const handleRailClick = (e: KonvaEventObject<MouseEvent>, segmentId: string) => {
    if (!interactive) return;
    
    e.cancelBubble = true;
    if (selectedTool === 'delete') {
      // Use proper reactive action instead of direct state manipulation
      deleteRailwaySegment(segmentId);
    } else if (selectedTool === 'select') {
      // Select the railway segment
      setSelectedRailwaySegment(segmentId);
      setSelectedRailwayNode(null); // Clear node selection
      // Clear other selections to prevent multiple selections
      setSelectedBuilding(null);
      setSelectedPole(null);
      setSelectedPipeSupport(null);
      setSelectedStickyNote(null);
      setSelectedConveyorLift(null);
      setSelectedPipeFloorConnection(null);
      setSelectedFoundation(null);
      setSelectedWall(null);
    } else if (onRailClick) {
      onRailClick(railway.id);
    }
  };

  const handleNodeSelect = (segmentId: string, isStart: boolean) => {
    if (!interactive) return;
    
    if (selectedTool === 'select') {
      setSelectedRailwayNode(`${segmentId}-${isStart ? 'start' : 'end'}`);
    }
  };

  return (
    <Group opacity={opacity}>
      {railway.segments.map((segmentId) => {
        const segment = railwaySegments[segmentId];
        if (!segment) {
          console.warn(`⚠️ RailwayShape: Missing segment ${segmentId} for railway ${railway.id}`);
          console.warn(`Available segments:`, Object.keys(railwaySegments));
          return null;
        }

        // const pathData = generateRailwayPath(segment, railwayNodes); // Unused in current rendering approach
        const startX = railwayNodes[segment.startNode]?.x * PIXELS_PER_METER;
        const startY = railwayNodes[segment.startNode]?.y * PIXELS_PER_METER;
        const endX = railwayNodes[segment.endNode]?.x * PIXELS_PER_METER;
        const endY = railwayNodes[segment.endNode]?.y * PIXELS_PER_METER;

        if (!startX || !startY || !endX || !endY) return null;

        let centerPoints: { x: number; y: number }[] = [];

        if (segment.type === 'curve' && segment.controlPoints && segment.controlPoints.length > 0) {
          const cp = segment.controlPoints[0];
          const cpX = cp.x * PIXELS_PER_METER;
          const cpY = cp.y * PIXELS_PER_METER;
          centerPoints = getQuadraticBezierPoints({ x: startX, y: startY }, { x: cpX, y: cpY }, { x: endX, y: endY }, 25);
        } else {
          // Generate multiple points along the straight line for proper parallel rail calculation
          const distance = Math.sqrt((startX - endX) ** 2 + (startY - endY) ** 2);
          const numPoints = Math.max(5, Math.floor(distance / 15)); // Increased minimum points and reduced spacing
          for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            centerPoints.push({
              x: startX + (endX - startX) * t,
              y: startY + (endY - startY) * t
            });
          }
        }

        const railOffset = 3; // Reduced rail spacing for more realistic appearance
        const leftPoints = getParallelCurvePoints(centerPoints, railOffset);
        const rightPoints = getParallelCurvePoints(centerPoints, -railOffset);

        let approxLength = 0;
        for (let i = 1; i < centerPoints.length; i++) {
          const dx = centerPoints[i].x - centerPoints[i - 1].x;
          const dy = centerPoints[i].y - centerPoints[i - 1].y;
          approxLength += Math.sqrt(dx * dx + dy * dy);
        }

        const tieSpacing = 25;
        const numTies = Math.floor(approxLength / tieSpacing) + 1;

        const isSelected = selectedRailwaySegment === segment.id;

        // Check if this is an internal prefab track (fromStation === toStation)
        const isInternalPrefabTrack = segment.fromStation && segment.toStation && segment.fromStation === segment.toStation;

        // Determine what to render based on renderLayer
        const renderBallast = renderLayer === 'under' || renderLayer === 'full';
        const renderRailsAndTies = renderLayer === 'over' || renderLayer === 'full';
        // For 'under' layer, use higher opacity for internal prefab tracks for better visibility
        // For regular railways, use reduced opacity to create depth effect
        const ballastOpacity = isInternalPrefabTrack ? 1 : (renderLayer === 'under' ? 0.6 : 1);

        return (
          <React.Fragment key={segment.id}>
            {/* Selection outline - only render in full mode or over mode */}
            {isSelected && renderRailsAndTies && (
              <Line
                points={centerPoints.flatMap(p => [p.x, p.y])}
                stroke="#ff9800"
                strokeWidth={26}
                closed={false}
                opacity={0.5}
                listening={false}
              />
            )}
            {/* Railway ballast/roadbed - rendered in 'under' or 'full' mode */}
            {renderBallast && (
              <>
                <Line
                  points={centerPoints.flatMap(p => [p.x, p.y])}
                  stroke={isInternalPrefabTrack ? "#6b5a45" : "#8b7355"} // Darker for internal tracks
                  strokeWidth={isInternalPrefabTrack ? 22 : 18} // Wider for internal tracks
                  closed={false}
                  onClick={interactive && renderLayer === 'full' ? (e) => handleRailClick(e, segmentId) : undefined}
                  name="railway"
                  shadowBlur={isInternalPrefabTrack ? 5 : 3}
                  shadowColor="rgba(0, 0, 0, 0.4)"
                  shadowOffsetY={2}
                  listening={interactive && renderLayer === 'full'}
                  opacity={ballastOpacity}
                />
                {/* Ballast texture - subtle gravel effect */}
                <Line
                  points={centerPoints.flatMap(p => [p.x, p.y])}
                  stroke={isInternalPrefabTrack ? "#8b7355" : "#a0845c"}
                  strokeWidth={isInternalPrefabTrack ? 20 : 16}
                  closed={false}
                  dash={[2, 1]}
                  opacity={0.8 * ballastOpacity}
                  listening={false}
                />
              </>
            )}
            {/* Invisible hit area for click detection in 'over' mode - the ballast is rendered in 'under' layer */}
            {renderRailsAndTies && interactive && renderLayer === 'over' && (
              <Line
                points={centerPoints.flatMap(p => [p.x, p.y])}
                stroke="transparent"
                strokeWidth={isInternalPrefabTrack ? 22 : 18}
                closed={false}
                onClick={(e) => handleRailClick(e, segmentId)}
                name="railway-hitarea"
                listening={true}
                hitStrokeWidth={24} // Extra wide hit area for easier selection
              />
            )}
            {/* Railway ties/sleepers - rendered in 'over' or 'full' mode */}
            {renderRailsAndTies && Array.from({ length: numTies }).map((_, index) => {
              const t = index / (numTies - 1);
              const pointIndex = Math.floor(t * (centerPoints.length - 1));
              const left = leftPoints[pointIndex];
              const right = rightPoints[pointIndex];

              if (!left || !right) return null;

              // Extend ties slightly beyond rails for realism (more extension for prefab tracks)
              const tieLength = Math.sqrt((right.x - left.x) ** 2 + (right.y - left.y) ** 2);
              const dirX = (right.x - left.x) / tieLength;
              const dirY = (right.y - left.y) / tieLength;
              const extension = isInternalPrefabTrack ? 3 : 2;

              const extLeft = { x: left.x - dirX * extension, y: left.y - dirY * extension };
              const extRight = { x: right.x + dirX * extension, y: right.y + dirY * extension };

              return (
                <Group key={`tie-${index}`}>
                  {/* Tie shadow */}
                  <Line
                    points={[extLeft.x + 1, extLeft.y + 1, extRight.x + 1, extRight.y + 1]}
                    stroke={isInternalPrefabTrack ? "rgba(0, 0, 0, 0.35)" : "rgba(0, 0, 0, 0.2)"}
                    strokeWidth={isInternalPrefabTrack ? 5 : 4}
                    closed={false}
                    listening={false}
                  />
                  {/* Main tie */}
                  <Line
                    points={[extLeft.x, extLeft.y, extRight.x, extRight.y]}
                    stroke={isInternalPrefabTrack ? "#4d3e27" : "#5d4e37"}
                    strokeWidth={isInternalPrefabTrack ? 4 : 3}
                    closed={false}
                    listening={false}
                  />
                </Group>
              );
            })}
            {/* Left rail - realistic steel appearance - rendered in 'over' or 'full' mode */}
            {renderRailsAndTies && (
              <>
                <Line
                  points={leftPoints.flatMap(p => [p.x, p.y])}
                  stroke={isInternalPrefabTrack ? "#d0d0d0" : "#c0c0c0"}
                  strokeWidth={isInternalPrefabTrack ? 4 : 3}
                  closed={false}
                  shadowBlur={isInternalPrefabTrack ? 3 : 2}
                  shadowColor="rgba(0, 0, 0, 0.5)"
                  shadowOffsetY={1}
                  listening={false}
                />
                {/* Left rail highlight */}
                <Line
                  points={leftPoints.flatMap(p => [p.x, p.y])}
                  stroke="#ffffff"
                  strokeWidth={isInternalPrefabTrack ? 1.5 : 1}
                  closed={false}
                  opacity={isInternalPrefabTrack ? 0.9 : 0.7}
                  listening={false}
                />
                {/* Right rail - realistic steel appearance */}
                <Line
                  points={rightPoints.flatMap(p => [p.x, p.y])}
                  stroke={isInternalPrefabTrack ? "#d0d0d0" : "#c0c0c0"}
                  strokeWidth={isInternalPrefabTrack ? 4 : 3}
                  closed={false}
                  shadowBlur={isInternalPrefabTrack ? 3 : 2}
                  shadowColor="rgba(0, 0, 0, 0.5)"
                  shadowOffsetY={1}
                  listening={false}
                />
                {/* Right rail highlight */}
                <Line
                  points={rightPoints.flatMap(p => [p.x, p.y])}
                  stroke="#ffffff"
                  strokeWidth={isInternalPrefabTrack ? 1.5 : 1}
                  closed={false}
                  opacity={isInternalPrefabTrack ? 0.9 : 0.7}
                  listening={false}
                />
                {/* Rail joints - simplified and subtle */}
                {Array.from({ length: Math.floor(approxLength / 300) + 1 }).map((_, index) => {
                  const t = (index * 300) / approxLength;
                  const pointIndex = Math.floor(t * (centerPoints.length - 1));
                  const jointLeft = leftPoints[pointIndex];
                  const jointRight = rightPoints[pointIndex];

                  if (!jointLeft || !jointRight || index === 0) return null;

                  return (
                    <Group key={`joint-${index}`}>
                      <Circle
                        x={jointLeft.x}
                        y={jointLeft.y}
                        radius={1.5}
                        fill="#999"
                        stroke="#666"
                        strokeWidth={0.5}
                        listening={false}
                      />
                      <Circle
                        x={jointRight.x}
                        y={jointRight.y}
                        radius={1.5}
                        fill="#999"
                        stroke="#666"
                        strokeWidth={0.5}
                        listening={false}
                      />
                    </Group>
                  );
                })}
              </>
            )}
            {/* Direction arrows - only in 'over' or 'full' mode */}
            {renderRailsAndTies && segment.showArrows !== false && segment.direction && segment.direction !== 'bidirectional' && (
              <>
                {getArrowPositionsAlongPath(centerPoints, 80, segment.direction === 'reverse').map((arrow, index) => {
                  // Enhanced colors for better visibility
                  const arrowColor = segment.direction === 'forward' ? '#10b981' : '#ef4444';
                  const outlineColor = segment.direction === 'forward' ? '#064e3b' : '#7f1d1d';
                  return (
                    <Group key={`arrow-${index}`}>
                      {/* Arrow shadow/outline for contrast */}
                      <Arrow
                        x={arrow.position.x}
                        y={arrow.position.y}
                        rotation={arrow.rotation}
                        points={[0, 0, 18, 0]}
                        pointerLength={10}
                        pointerWidth={10}
                        fill={outlineColor}
                        stroke={outlineColor}
                        strokeWidth={3}
                        opacity={1}
                        listening={false}
                      />
                      {/* Main arrow */}
                      <Arrow
                        x={arrow.position.x}
                        y={arrow.position.y}
                        rotation={arrow.rotation}
                        points={[0, 0, 16, 0]}
                        pointerLength={8}
                        pointerWidth={8}
                        fill={arrowColor}
                        stroke={arrowColor}
                        strokeWidth={2}
                        opacity={1}
                        listening={false}
                      />
                    </Group>
                  );
                })}
              </>
            )}
            {/* Bidirectional arrows - only in 'over' or 'full' mode */}
            {renderRailsAndTies && segment.showArrows !== false && segment.direction === 'bidirectional' && (
              <>
                {getArrowPositionsAlongPath(centerPoints, 80, false).map((arrow, index) => (
                  <Group key={`bidi-arrow-${index}`} x={arrow.position.x} y={arrow.position.y} rotation={arrow.rotation}>
                    {/* Bidirectional arrow shadow/outline */}
                    <Arrow
                      x={-10}
                      y={-4}
                      points={[0, 0, 14, 0]}
                      pointerLength={7}
                      pointerWidth={7}
                      fill="#1e3a8a"
                      stroke="#1e3a8a"
                      strokeWidth={2.5}
                      opacity={1}
                      listening={false}
                    />
                    <Arrow
                      x={10}
                      y={4}
                      points={[0, 0, -14, 0]}
                      pointerLength={7}
                      pointerWidth={7}
                      fill="#1e3a8a"
                      stroke="#1e3a8a"
                      strokeWidth={2.5}
                      opacity={1}
                      listening={false}
                    />
                    {/* Forward arrow */}
                    <Arrow
                      x={-10}
                      y={-4}
                      points={[0, 0, 12, 0]}
                      pointerLength={6}
                      pointerWidth={6}
                      fill="#3b82f6"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      opacity={1}
                      listening={false}
                    />
                    {/* Reverse arrow */}
                    <Arrow
                      x={10}
                      y={4}
                      points={[0, 0, -12, 0]}
                      pointerLength={6}
                      pointerWidth={6}
                      fill="#3b82f6"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      opacity={1}
                      listening={false}
                    />
                  </Group>
                ))}
              </>
            )}
            {/* Draggable nodes - only in 'over' or 'full' mode */}
            {renderRailsAndTies && !segment.fromStation && (
              <RailwayNodeShape
                point={{ x: railwayNodes[segment.startNode].x, y: railwayNodes[segment.startNode].y, z: railwayNodes[segment.startNode].z }}
                segmentId={segment.id}
                isStart={true}
                isSelected={selectedRailwayNode === `${segment.id}-start`}
                onSelect={() => handleNodeSelect(segment.id, true)}
              />
            )}
            {renderRailsAndTies && !segment.toStation && (
              <RailwayNodeShape
                point={{ x: railwayNodes[segment.endNode].x, y: railwayNodes[segment.endNode].y, z: railwayNodes[segment.endNode].z }}
                segmentId={segment.id}
                isStart={false}
                isSelected={selectedRailwayNode === `${segment.id}-end`}
                onSelect={() => handleNodeSelect(segment.id, false)}
              />
            )}
            {/* Station labels - only in 'over' or 'full' mode */}
            {/* Skip labels for internal prefab tracks (where fromStation === toStation) */}
            {renderRailsAndTies && segment.fromStation && segment.fromStation !== segment.toStation && (
              <Group x={startX} y={startY - 35} listening={false}>
                <Rect
                  x={-50}
                  y={-12}
                  width={100}
                  height={20}
                  fill="rgba(44, 62, 80, 0.9)"
                  cornerRadius={6}
                  stroke="#2c3e50"
                  strokeWidth={1}
                  shadowBlur={6}
                  shadowColor="rgba(44, 62, 80, 0.8)"
                  listening={false}
                />
                <Text
                  text={buildings[segment.fromStation]?.type.replace(/_/g, ' ').toUpperCase() || 'STATION'}
                  fontSize={10}
                  fill="#ecf0f1"
                  fontWeight="bold"
                  align="center"
                  width={100}
                  offsetX={50}
                  y={-6}
                  listening={false}
                />
              </Group>
            )}
            {renderRailsAndTies && segment.toStation && segment.fromStation !== segment.toStation && (
              <Group x={endX} y={endY - 35} listening={false}>
                <Rect
                  x={-50}
                  y={-12}
                  width={100}
                  height={20}
                  fill="rgba(44, 62, 80, 0.9)"
                  cornerRadius={6}
                  stroke="#2c3e50"
                  strokeWidth={1}
                  shadowBlur={6}
                  shadowColor="rgba(44, 62, 80, 0.8)"
                  listening={false}
                />
                <Text
                  text={buildings[segment.toStation]?.type.replace(/_/g, ' ').toUpperCase() || 'STATION'}
                  fontSize={10}
                  fill="#ecf0f1"
                  fontWeight="bold"
                  align="center"
                  width={100}
                  offsetX={50}
                  y={-6}
                  listening={false}
                />
              </Group>
            )}
            {/* Segment length indicator - only in 'over' or 'full' mode, skip for internal prefab tracks */}
            {renderRailsAndTies && !isInternalPrefabTrack && (
              <Group x={(startX + endX) / 2} y={(startY + endY) / 2 - 20} listening={false}>
                <Rect
                  x={-25}
                  y={-8}
                  width={50}
                  height={16}
                  fill="rgba(0,0,0,0.8)"
                  cornerRadius={4}
                  stroke="#666"
                  strokeWidth={1}
                  shadowBlur={4}
                  shadowColor="rgba(0,0,0,0.6)"
                  listening={false}
                />
                <Text
                  text={`${segment.length.toFixed(1)}m`}
                  fontSize={9}
                  fill="#ccc"
                  fontWeight="bold"
                  align="center"
                  width={50}
                  offsetX={25}
                  y={-4}
                  listening={false}
                />
              </Group>
            )}
          </React.Fragment>
        );
      })}
      
      {/* Intersection node indicators - rendered last to appear on top of tracks - only in 'over' or 'full' mode */}
      {renderLayer !== 'under' && railway.segments.map((segmentId) => {
        const segment = railwaySegments[segmentId];
        if (!segment) return null;

        const startX = railwayNodes[segment.startNode]?.x * PIXELS_PER_METER;
        const startY = railwayNodes[segment.startNode]?.y * PIXELS_PER_METER;
        const endX = railwayNodes[segment.endNode]?.x * PIXELS_PER_METER;
        const endY = railwayNodes[segment.endNode]?.y * PIXELS_PER_METER;

        if (!startX || !startY || !endX || !endY) return null;

        return (
          <React.Fragment key={`intersection-${segment.id}`}>
            {/* Start node intersection indicator */}
            {railwayNodes[segment.startNode]?.id?.startsWith('rail-node-intersection') && (
              <Group>
                {/* Glow effect */}
                <Circle
                  x={startX}
                  y={startY}
                  radius={16}
                  fill="rgba(255, 107, 53, 0.3)"
                  blur={8}
                  listening={false}
                />
                {/* Main intersection indicator */}
                <Circle
                  x={startX}
                  y={startY}
                  radius={12}
                  fill="#ff6b35"
                  stroke="#ff4500"
                  strokeWidth={3}
                  opacity={0.95}
                  shadowBlur={6}
                  shadowColor="rgba(255, 69, 0, 0.8)"
                  listening={false}
                />
                {/* Inner highlight */}
                <Circle
                  x={startX}
                  y={startY}
                  radius={6}
                  fill="rgba(255, 255, 255, 0.4)"
                  listening={false}
                />
              </Group>
            )}

            {/* End node intersection indicator */}
            {railwayNodes[segment.endNode]?.id?.startsWith('rail-node-intersection') && (
              <Group>
                {/* Glow effect */}
                <Circle
                  x={endX}
                  y={endY}
                  radius={16}
                  fill="rgba(255, 107, 53, 0.3)"
                  blur={8}
                  listening={false}
                />
                {/* Main intersection indicator */}
                <Circle
                  x={endX}
                  y={endY}
                  radius={12}
                  fill="#ff6b35"
                  stroke="#ff4500"
                  strokeWidth={3}
                  opacity={0.95}
                  shadowBlur={6}
                  shadowColor="rgba(255, 69, 0, 0.8)"
                  listening={false}
                />
                {/* Inner highlight */}
                <Circle
                  x={endX}
                  y={endY}
                  radius={6}
                  fill="rgba(255, 255, 255, 0.4)"
                  listening={false}
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
  return prevProps.railway === nextProps.railway &&
         prevProps.opacity === nextProps.opacity &&
         prevProps.onRailClick === nextProps.onRailClick &&
         prevProps.interactive === nextProps.interactive &&
         prevProps.renderLayer === nextProps.renderLayer;
});

RailwayShape.displayName = 'RailwayShape';
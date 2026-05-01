// src/components/Pipes/PipelineShape.tsx - Enhanced with sci-fi styling and better fluid visualization

import React from 'react';
import { Group, Path, Line, Circle, Rect, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { PIXELS_PER_METER } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { generatePipePath } from '../../utils/helpers';

interface PipelineShapeProps {
  pipelineId: string;
  opacity?: number;
  onPipeClick?: (pipelineId: string) => void;
  interactive?: boolean;
}

export const PipelineShape: React.FC<PipelineShapeProps> = React.memo(({
  pipelineId,
  opacity = 1,
  onPipeClick,
  interactive = true
}) => {
  // Get pipeline directly from store to react to updates
  const pipeline = useLayoutStore(state => state.pipelines[pipelineId]);

  const {
    pipeSegments,
    pipeSupports,
    selectedTool,
    selectedPipeSegment,
    setSelectedPipeSegment,
    deletePipeSegment,
    setSelectedBuilding,
    setSelectedPole,
    setSelectedPipeSupport,
    setSelectedStickyNote,
    setSelectedConveyorLift,
    setSelectedPipeFloorConnection,
    setSelectedFoundation,
    setSelectedWall,
    setSelectedRailwaySegment,
    setSelectedRailwayNode
  } = useLayoutStore();

  // Early return if pipeline not found
  if (!pipeline) return null;

  // Enhanced fluid type colors with sci-fi aesthetics
  const fluidColors = {
    water: { 
      base: '#3498db', 
      edge: '#2980b9', 
      flow: '#5dade2',
      glow: 'rgba(52, 152, 219, 0.4)',
      name: 'H₂O'
    },
    oil: { 
      base: '#2c3e50', 
      edge: '#1a252f', 
      flow: '#34495e',
      glow: 'rgba(44, 62, 80, 0.4)',
      name: 'OIL'
    },
    fuel: { 
      base: '#e67e22', 
      edge: '#d35400', 
      flow: '#f39c12',
      glow: 'rgba(230, 126, 34, 0.4)',
      name: 'FUEL'
    },
    acid: { 
      base: '#27ae60', 
      edge: '#229954', 
      flow: '#52be80',
      glow: 'rgba(39, 174, 96, 0.4)',
      name: 'H₂SO₄'
    },
    alumina: { 
      base: '#ecf0f1', 
      edge: '#bdc3c7', 
      flow: '#d5dbdb',
      glow: 'rgba(236, 240, 241, 0.4)',
      name: 'Al₂O₃'
    },
    nitrogen: { 
      base: '#85c1e2', 
      edge: '#5dade2', 
      flow: '#aed6f1',
      glow: 'rgba(133, 193, 226, 0.4)',
      name: 'N₂'
    }
  };
  
  const pipeColors = fluidColors[pipeline.fluidType || 'water'];
  const pipeWidth = pipeline.mark === 2 ? 14 : 12; // Mk.2 pipes are larger

  const handleSegmentClick = (e: KonvaEventObject<MouseEvent>, segmentId: string) => {
    if (!interactive) return;

    e.cancelBubble = true;

    if (selectedTool === 'delete') {
      deletePipeSegment(segmentId);
    } else if (selectedTool === 'select') {
      setSelectedPipeSegment(segmentId);
      // Clear other selections
      setSelectedBuilding(null);
      setSelectedPole(null);
      setSelectedPipeSupport(null);
      setSelectedStickyNote(null);
      setSelectedConveyorLift(null);
      setSelectedPipeFloorConnection(null);
      setSelectedFoundation(null);
      setSelectedWall(null);
      setSelectedRailwaySegment(null);
      setSelectedRailwayNode(null);
    } else if (onPipeClick) {
      onPipeClick(pipeline.id);
    }
  };
  
  return (
    <Group opacity={opacity}>
      {pipeline.segments.map((segmentId, i) => {
        const segment = pipeSegments[segmentId];
        if (!segment) return null;
        
        // Check if supports exist before rendering
        const startSupport = pipeSupports[segment.startSupport];
        const endSupport = pipeSupports[segment.endSupport];
        if (!startSupport || !endSupport) return null;
        
        const path = generatePipePath(segment, pipeSupports);
        if (!path) return null;
        
        // Calculate segment length for flow indicator spacing
        const segLength = segment.length * PIXELS_PER_METER;
        const indicatorCount = Math.floor(segLength / 80); // Flow indicator every 8m

        // Check if this segment is selected
        const isSelected = selectedPipeSegment === segment.id;

        return (
          <React.Fragment key={segmentId}>
            {/* Selection highlight - rendered behind pipe */}
            {isSelected && (
              <Path
                data={path}
                stroke="#ff9800"
                strokeWidth={pipeWidth + 12}
                lineCap="round"
                lineJoin="round"
                opacity={0.5}
                listening={false}
              />
            )}

            {/* Pipe glow effect */}
            <Path
              data={path}
              stroke={pipeColors.glow}
              strokeWidth={pipeWidth + 8}
              lineCap="round"
              lineJoin="round"
              blur={6}
              opacity={0.6}
              listening={false}
            />

            {/* Pipe shadow with enhanced depth */}
            <Path
              data={path}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={pipeWidth + 6}
              lineCap="round"
              lineJoin="round"
              offsetY={4}
              blur={3}
              onClick={interactive ? (e) => handleSegmentClick(e, segment.id) : undefined}
              name="pipe"
              listening={interactive}
            />

            {/* Pipe outer edge with metallic appearance */}
            <Path
              data={path}
              stroke={pipeColors.edge}
              strokeWidth={pipeWidth + 4}
              lineCap="round"
              lineJoin="round"
              onClick={interactive ? (e) => handleSegmentClick(e, segment.id) : undefined}
              name="pipe"
              listening={interactive}
              shadowBlur={4}
              shadowColor={pipeColors.edge}
            />

            {/* Main pipe body with gradient effect */}
            <Path
              data={path}
              stroke={pipeColors.base}
              strokeWidth={pipeWidth}
              lineCap="round"
              lineJoin="round"
              onClick={interactive ? (e) => handleSegmentClick(e, segment.id) : undefined}
              name="pipe"
              listening={interactive}
            />

            {/* Pipe highlight for 3D effect */}
            <Path
              data={path}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={3}
              lineCap="round"
              lineJoin="round"
              offsetY={-pipeWidth/3}
              onClick={interactive ? (e) => handleSegmentClick(e, segment.id) : undefined}
              name="pipe"
              listening={interactive}
            />
            
            {/* Flow indicators for straight segments with enhanced styling */}
            {segment.type === 'straight' && pipeline.fluidType && Array.from({ length: indicatorCount }).map((_, flowIndex) => {
              const t = (flowIndex + 1) / (indicatorCount + 1);
              const x = startSupport.x + (endSupport.x - startSupport.x) * t;
              const y = startSupport.y + (endSupport.y - startSupport.y) * t;
              
              return (
                <Group key={`indicator-${flowIndex}`} x={x * PIXELS_PER_METER} y={y * PIXELS_PER_METER}>
                  {/* Indicator glow */}
                  <Circle
                    radius={10}
                    fill={pipeColors.glow}
                    blur={4}
                    listening={false}
                  />
                  
                  {/* Indicator background with enhanced design */}
                  <Rect
                    x={-14}
                    y={-8}
                    width={28}
                    height={16}
                    fill={pipeColors.edge}
                    cornerRadius={8}
                    shadowBlur={4}
                    shadowColor={pipeColors.edge}
                    listening={false}
                  />
                  
                  {/* Flow window with fluid animation appearance */}
                  <Rect
                    x={-12}
                    y={-6}
                    width={24}
                    height={12}
                    fill={pipeColors.flow}
                    cornerRadius={6}
                    listening={false}
                  />
                  
                  {/* Flow pattern - enhanced fluid movement simulation */}
                  <Circle
                    x={-8}
                    radius={2}
                    fill={pipeColors.base}
                    opacity={0.9}
                    listening={false}
                  />
                  <Circle
                    x={-3}
                    radius={2.5}
                    fill={pipeColors.base}
                    opacity={0.7}
                    listening={false}
                  />
                  <Circle
                    x={2}
                    radius={2}
                    fill={pipeColors.base}
                    opacity={0.5}
                    listening={false}
                  />
                  <Circle
                    x={7}
                    radius={1.5}
                    fill={pipeColors.base}
                    opacity={0.3}
                    listening={false}
                  />
                  
                  {/* Fluid type label */}
                  <Text
                    y={-20}
                    text={pipeColors.name}
                    fontSize={8}
                    fill={pipeColors.base}
                    fontWeight="bold"
                    align="center"
                    width={28}
                    offsetX={14}
                    listening={false}
                  />
                </Group>
              );
            })}
            
            {/* Enhanced vertical indicator for incline/vertical segments */}
            {(segment.type === 'incline' || segment.type === 'vertical') && segment.headLift && (
              <Group>
                <Line
                  points={[
                    startSupport.x * PIXELS_PER_METER,
                    startSupport.y * PIXELS_PER_METER,
                    endSupport.x * PIXELS_PER_METER,
                    endSupport.y * PIXELS_PER_METER
                  ]}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={2}
                  dash={[8, 4]}
                  listening={false}
                />
                
                {/* Head lift indicator with enhanced styling */}
                <Group x={(startSupport.x + endSupport.x) / 2 * PIXELS_PER_METER} y={(startSupport.y + endSupport.y) / 2 * PIXELS_PER_METER - 20}>
                  <Rect
                    x={-25}
                    y={-10}
                    width={50}
                    height={16}
                    fill="rgba(255, 153, 0, 0.9)"
                    cornerRadius={4}
                    stroke="#fff"
                    strokeWidth={1}
                    shadowBlur={6}
                    shadowColor="rgba(255, 153, 0, 0.8)"
                    listening={false}
                  />
                  <Text
                    text={`↕ ${segment.headLift.toFixed(1)}m`}
                    fontSize={10}
                    fill="white"
                    fontWeight="bold"
                    align="center"
                    width={50}
                    offsetX={25}
                    y={-6}
                    listening={false}
                  />
                </Group>
              </Group>
            )}
            
            {/* Pipeline tier indicator with enhanced design */}
            {i === 0 && (
              <Group x={startSupport.x * PIXELS_PER_METER - 20} y={startSupport.y * PIXELS_PER_METER - 25}>
                <Rect
                  x={-15}
                  y={-8}
                  width={30}
                  height={16}
                  fill="rgba(0,0,0,0.8)"
                  cornerRadius={4}
                  stroke={pipeColors.base}
                  strokeWidth={1}
                  shadowBlur={4}
                  shadowColor={pipeColors.base}
                  listening={false}
                />
                <Text
                  text={`Mk.${pipeline.mark}`}
                  fontSize={9}
                  fill={pipeColors.base}
                  fontWeight="bold"
                  align="center"
                  width={30}
                  offsetX={15}
                  y={-4}
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
  // Note: pipeline data is read from store, so we only compare pipelineId
  return prevProps.pipelineId === nextProps.pipelineId &&
         prevProps.opacity === nextProps.opacity &&
         prevProps.onPipeClick === nextProps.onPipeClick &&
         prevProps.interactive === nextProps.interactive;
});

PipelineShape.displayName = 'PipelineShape';
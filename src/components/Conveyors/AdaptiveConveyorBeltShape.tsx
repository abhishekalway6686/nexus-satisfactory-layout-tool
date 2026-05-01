/**
 * Adaptive Conveyor Belt Shape - Renderer-agnostic conveyor belt component
 * Optimized for both Konva and WebGL rendering with GPU curve calculations
 */

import React, { useMemo, useCallback } from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { ConveyorBelt } from '../../types';
import { PIXELS_PER_METER } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';

type LODLevel = 'low' | 'medium' | 'high';

interface AdaptiveConveyorBeltShapeProps {
  adapter: RendererAdapter;
  item: ConveyorBelt;
  isSelected: boolean;
  lodLevel: LODLevel;
  renderQuality: number;
  batchIndex?: number;
  batchSize?: number;
}

// Conveyor belt colors
const CONVEYOR_COLORS = {
  default: '#4CAF50',
  selected: '#FF6B35',
  hover: '#66BB6A',
  belt: '#2E7D32',
  support: '#37474F'
};

export const AdaptiveConveyorBeltShape: React.FC<AdaptiveConveyorBeltShapeProps> = ({
  adapter,
  item: conveyorBelt,
  isSelected,
  lodLevel,
  renderQuality,
  batchIndex,
  batchSize
}) => {
  const { selectConveyorBelt, deleteConveyorBelt } = useLayoutStore();

  // Convert world coordinates to screen coordinates
  const startX = conveyorBelt.startX * PIXELS_PER_METER;
  const startY = conveyorBelt.startY * PIXELS_PER_METER;
  const endX = conveyorBelt.endX * PIXELS_PER_METER;
  const endY = conveyorBelt.endY * PIXELS_PER_METER;

  // Calculate curve points for smooth conveyor paths
  const curvePoints = useMemo(() => {
    const points = [startX, startY];
    
    // If we have control points for curves, add them
    if (conveyorBelt.controlPoints && conveyorBelt.controlPoints.length > 0) {
      for (const controlPoint of conveyorBelt.controlPoints) {
        points.push(controlPoint.x * PIXELS_PER_METER, controlPoint.y * PIXELS_PER_METER);
      }
    }
    
    points.push(endX, endY);
    return points;
  }, [conveyorBelt, startX, startY, endX, endY]);

  // Performance optimization: simplify geometry based on LOD
  const beltWidth = useMemo(() => {
    switch (lodLevel) {
      case 'low': return 2;
      case 'medium': return 4;
      case 'high': return 6;
      default: return 4;
    }
  }, [lodLevel]);

  // GPU optimization: batch similar conveyors when using WebGL
  const shouldUseBatching = adapter.isGPURenderer() && batchSize && batchSize > 50;

  // Event handlers
  const handleClick = useCallback(() => {
    selectConveyorBelt(conveyorBelt.id);
  }, [conveyorBelt.id, selectConveyorBelt]);

  const handleDoubleClick = useCallback(() => {
    deleteConveyorBelt(conveyorBelt.id);
  }, [conveyorBelt.id, deleteConveyorBelt]);

  // Color based on state
  let strokeColor = CONVEYOR_COLORS.default;
  if (isSelected) strokeColor = CONVEYOR_COLORS.selected;

  // For low LOD, render simple line
  if (lodLevel === 'low') {
    return adapter.createLine({
      id: `conveyor-${conveyorBelt.id}-simple`,
      points: [startX, startY, endX, endY],
      stroke: strokeColor,
      strokeWidth: 2,
      lineCap: 'round',
      events: {
        onClick: handleClick
      }
    });
  }

  // Medium and high detail rendering
  const mainBelt = adapter.createLine({
    id: `conveyor-${conveyorBelt.id}-main`,
    points: curvePoints,
    stroke: strokeColor,
    strokeWidth: beltWidth,
    lineCap: 'round',
    lineJoin: 'round',
    events: {
      onClick: handleClick,
      onPointerDown: handleDoubleClick
    }
  });

  // High detail: add belt texture lines
  const beltTexture = lodLevel === 'high' && renderQuality > 0.8 ? 
    adapter.createLine({
      id: `conveyor-${conveyorBelt.id}-texture`,
      points: curvePoints,
      stroke: CONVEYOR_COLORS.belt,
      strokeWidth: beltWidth - 2,
      lineCap: 'round',
      lineJoin: 'round',
      dash: [5, 3]
    }) : null;

  // Direction arrow for medium/high detail
  const directionArrow = lodLevel !== 'low' ? (() => {
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < 20) return null; // Too short for arrow
    
    const arrowLength = Math.min(20, length * 0.3);
    const arrowWidth = 8;
    
    // Calculate arrow position (75% along the belt)
    const arrowX = startX + dx * 0.75;
    const arrowY = startY + dy * 0.75;
    
    // Calculate arrow direction
    const dirX = dx / length;
    const dirY = dy / length;
    
    // Arrow points
    const arrowPoints = [
      arrowX - dirX * arrowLength/2 - dirY * arrowWidth/2,
      arrowY - dirY * arrowLength/2 + dirX * arrowWidth/2,
      arrowX + dirX * arrowLength/2,
      arrowY + dirY * arrowLength/2,
      arrowX - dirX * arrowLength/2 + dirY * arrowWidth/2,
      arrowY - dirY * arrowLength/2 - dirX * arrowWidth/2
    ];
    
    return adapter.createLine({
      id: `conveyor-${conveyorBelt.id}-arrow`,
      points: arrowPoints,
      fill: '#FFFFFF',
      stroke: '#333333',
      strokeWidth: 1,
      closed: true
    });
  })() : null;

  // Selection indicator
  const selectionIndicator = isSelected ? adapter.createLine({
    id: `conveyor-${conveyorBelt.id}-selection`,
    points: curvePoints,
    stroke: '#FFFFFF',
    strokeWidth: beltWidth + 4,
    lineCap: 'round',
    lineJoin: 'round',
    dash: [8, 4],
    opacity: 0.7
  }) : null;

  // Support poles at connection points (high detail only)
  const supportPoles = lodLevel === 'high' && renderQuality > 0.9 ? [
    adapter.createCircle({
      id: `conveyor-${conveyorBelt.id}-start-support`,
      x: startX,
      y: startY,
      radius: 3,
      fill: CONVEYOR_COLORS.support,
      stroke: '#FFFFFF',
      strokeWidth: 1
    }),
    adapter.createCircle({
      id: `conveyor-${conveyorBelt.id}-end-support`,
      x: endX,
      y: endY,
      radius: 3,
      fill: CONVEYOR_COLORS.support,
      stroke: '#FFFFFF',
      strokeWidth: 1
    })
  ] : [];

  // Group all elements
  return adapter.createGroup({
    id: `conveyor-group-${conveyorBelt.id}`,
    children: (
      <>
        {selectionIndicator}
        {mainBelt}
        {beltTexture}
        {directionArrow}
        {supportPoles}
      </>
    )
  });
};

export default AdaptiveConveyorBeltShape;
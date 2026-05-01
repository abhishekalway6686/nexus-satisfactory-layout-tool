/**
 * Adaptive Conveyor Lift Shape - Basic placeholder implementation
 */

import React from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { ConveyorLift } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface AdaptiveConveyorLiftShapeProps {
  adapter: RendererAdapter;
  item: ConveyorLift;
  isSelected: boolean;
  lodLevel: 'low' | 'medium' | 'high';
  renderQuality: number;
}

export const AdaptiveConveyorLiftShape: React.FC<AdaptiveConveyorLiftShapeProps> = ({
  adapter,
  item,
  isSelected
}) => {
  const startX = item.startX * PIXELS_PER_METER;
  const startY = item.startY * PIXELS_PER_METER;
  const endX = item.endX * PIXELS_PER_METER;
  const endY = item.endY * PIXELS_PER_METER;

  return adapter.createLine({
    id: `conveyor-lift-${item.id}`,
    points: [startX, startY, endX, endY],
    stroke: isSelected ? '#FF6B35' : '#2196F3',
    strokeWidth: 4,
    lineCap: 'round',
    dash: [8, 4]
  });
};

export default AdaptiveConveyorLiftShape;
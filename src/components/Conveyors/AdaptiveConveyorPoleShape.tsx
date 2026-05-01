/**
 * Adaptive Conveyor Pole Shape - Basic placeholder implementation
 */

import React from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { ConveyorPole } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface AdaptiveConveyorPoleShapeProps {
  adapter: RendererAdapter;
  item: ConveyorPole;
  isSelected: boolean;
  lodLevel: 'low' | 'medium' | 'high';
  renderQuality: number;
}

export const AdaptiveConveyorPoleShape: React.FC<AdaptiveConveyorPoleShapeProps> = ({
  adapter,
  item,
  isSelected,
  lodLevel
}) => {
  const x = item.x * PIXELS_PER_METER;
  const y = item.y * PIXELS_PER_METER;
  const radius = lodLevel === 'high' ? 6 : 4;

  return adapter.createCircle({
    id: `conveyor-pole-${item.id}`,
    x,
    y,
    radius,
    fill: isSelected ? '#FF6B35' : '#4CAF50',
    stroke: '#FFFFFF',
    strokeWidth: 1
  });
};

export default AdaptiveConveyorPoleShape;
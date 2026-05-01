/**
 * Adaptive Power Pole Shape - Basic placeholder implementation
 */

import React from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { PowerPole } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface AdaptivePowerPoleShapeProps {
  adapter: RendererAdapter;
  item: PowerPole;
  isSelected: boolean;
  lodLevel: 'low' | 'medium' | 'high';
  renderQuality: number;
}

export const AdaptivePowerPoleShape: React.FC<AdaptivePowerPoleShapeProps> = ({
  adapter,
  item,
  isSelected,
  lodLevel
}) => {
  const x = item.x * PIXELS_PER_METER;
  const y = item.y * PIXELS_PER_METER;
  const size = lodLevel === 'high' ? 8 : 6;

  return adapter.createRect({
    id: `power-pole-${item.id}`,
    x: x - size / 2,
    y: y - size / 2,
    width: size,
    height: size,
    fill: isSelected ? '#FF6B35' : '#FFD700',
    stroke: '#FFFFFF',
    strokeWidth: 1
  });
};

export default AdaptivePowerPoleShape;
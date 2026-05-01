/**
 * Adaptive Powerline Shape - GPU-optimized powerline rendering
 */

import React from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { Powerline } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface AdaptivePowerlineShapeProps {
  adapter: RendererAdapter;
  item: Powerline;
  isSelected: boolean;
  lodLevel: 'low' | 'medium' | 'high';
  renderQuality: number;
}

export const AdaptivePowerlineShape: React.FC<AdaptivePowerlineShapeProps> = ({
  adapter,
  item,
  isSelected,
  lodLevel
}) => {
  const startX = item.startX * PIXELS_PER_METER;
  const startY = item.startY * PIXELS_PER_METER;
  const endX = item.endX * PIXELS_PER_METER;
  const endY = item.endY * PIXELS_PER_METER;

  const strokeWidth = lodLevel === 'high' ? 3 : 2;

  return adapter.createLine({
    id: `powerline-${item.id}`,
    points: [startX, startY, endX, endY],
    stroke: isSelected ? '#FF6B35' : '#FFD700',
    strokeWidth,
    lineCap: 'round',
    dash: lodLevel === 'high' ? undefined : [5, 3]
  });
};

export default AdaptivePowerlineShape;
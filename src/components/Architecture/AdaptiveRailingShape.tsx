/**
 * Adaptive Railing Shape - Basic placeholder implementation
 */

import React from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { Railing } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface AdaptiveRailingShapeProps {
  adapter: RendererAdapter;
  item: Railing;
  isSelected: boolean;
  lodLevel: 'low' | 'medium' | 'high';
  renderQuality: number;
  opacity?: number;
}

export const AdaptiveRailingShape: React.FC<AdaptiveRailingShapeProps> = ({
  adapter,
  item,
  isSelected,
  lodLevel,
  opacity = 1
}) => {
  const startX = item.startX * PIXELS_PER_METER;
  const startY = item.startY * PIXELS_PER_METER;
  const endX = item.endX * PIXELS_PER_METER;
  const endY = item.endY * PIXELS_PER_METER;

  const strokeWidth = lodLevel === 'high' ? 3 : 2;

  return adapter.createLine({
    id: `railing-${item.id}`,
    points: [startX, startY, endX, endY],
    stroke: isSelected ? '#FF6B35' : '#616161',
    strokeWidth,
    lineCap: 'round',
    dash: [4, 4],
    opacity
  });
};

export default AdaptiveRailingShape;
/**
 * Adaptive Wall Shape - Basic placeholder implementation
 */

import React from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { Wall } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface AdaptiveWallShapeProps {
  adapter: RendererAdapter;
  item: Wall;
  isSelected: boolean;
  lodLevel: 'low' | 'medium' | 'high';
  renderQuality: number;
  opacity?: number;
}

export const AdaptiveWallShape: React.FC<AdaptiveWallShapeProps> = ({
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

  const strokeWidth = lodLevel === 'high' ? 6 : 4;

  return adapter.createLine({
    id: `wall-${item.id}`,
    points: [startX, startY, endX, endY],
    stroke: isSelected ? '#FF6B35' : '#9E9E9E',
    strokeWidth,
    lineCap: 'round',
    opacity
  });
};

export default AdaptiveWallShape;
/**
 * Adaptive Foundation Shape - Basic placeholder implementation
 */

import React from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { Foundation } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface AdaptiveFoundationShapeProps {
  adapter: RendererAdapter;
  item: Foundation;
  isSelected: boolean;
  lodLevel: 'low' | 'medium' | 'high';
  renderQuality: number;
  opacity?: number;
}

export const AdaptiveFoundationShape: React.FC<AdaptiveFoundationShapeProps> = ({
  adapter,
  item,
  isSelected,
  lodLevel,
  opacity = 1
}) => {
  const x = item.x * PIXELS_PER_METER;
  const y = item.y * PIXELS_PER_METER;
  const size = 8 * PIXELS_PER_METER; // 8m x 8m foundation

  return adapter.createRect({
    id: `foundation-${item.id}`,
    x: x - size / 2,
    y: y - size / 2,
    width: size,
    height: size,
    fill: isSelected ? '#FF6B35' : '#BDBDBD',
    stroke: '#FFFFFF',
    strokeWidth: 1,
    opacity,
    rotation: item.rotation || 0
  });
};

export default AdaptiveFoundationShape;
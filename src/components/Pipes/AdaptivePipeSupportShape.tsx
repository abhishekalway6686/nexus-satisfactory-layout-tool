/**
 * Adaptive Pipe Support Shape - Basic placeholder implementation
 */

import React from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { PipeSupport } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface AdaptivePipeSupportShapeProps {
  adapter: RendererAdapter;
  item: PipeSupport;
  isSelected: boolean;
  lodLevel: 'low' | 'medium' | 'high';
  renderQuality: number;
}

export const AdaptivePipeSupportShape: React.FC<AdaptivePipeSupportShapeProps> = ({
  adapter,
  item,
  isSelected,
  lodLevel
}) => {
  const x = item.x * PIXELS_PER_METER;
  const y = item.y * PIXELS_PER_METER;
  const radius = lodLevel === 'high' ? 5 : 3;

  return adapter.createCircle({
    id: `pipe-support-${item.id}`,
    x,
    y,
    radius,
    fill: isSelected ? '#FF6B35' : '#FFC107',
    stroke: '#FFFFFF',
    strokeWidth: 1
  });
};

export default AdaptivePipeSupportShape;
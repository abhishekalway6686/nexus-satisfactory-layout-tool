/**
 * Adaptive Pipeline Shape - Basic placeholder implementation
 */

import React from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { Pipeline } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface AdaptivePipelineShapeProps {
  adapter: RendererAdapter;
  item: Pipeline;
  isSelected: boolean;
  lodLevel: 'low' | 'medium' | 'high';
  renderQuality: number;
}

export const AdaptivePipelineShape: React.FC<AdaptivePipelineShapeProps> = ({
  adapter,
  item,
  isSelected,
  lodLevel
}) => {
  const startX = item.startX * PIXELS_PER_METER;
  const startY = item.startY * PIXELS_PER_METER;
  const endX = item.endX * PIXELS_PER_METER;
  const endY = item.endY * PIXELS_PER_METER;
  
  const strokeWidth = lodLevel === 'high' ? 8 : lodLevel === 'medium' ? 6 : 4;

  return adapter.createLine({
    id: `pipeline-${item.id}`,
    points: [startX, startY, endX, endY],
    stroke: isSelected ? '#FF6B35' : '#FFC107',
    strokeWidth,
    lineCap: 'round'
  });
};

export default AdaptivePipelineShape;
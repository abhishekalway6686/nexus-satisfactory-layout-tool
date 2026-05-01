/**
 * Adaptive Pipe Floor Connection Shape - Basic placeholder implementation
 */

import React from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { PipeFloorConnection } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface AdaptivePipeFloorConnectionShapeProps {
  adapter: RendererAdapter;
  item: PipeFloorConnection;
  isSelected: boolean;
  lodLevel: 'low' | 'medium' | 'high';
  renderQuality: number;
}

export const AdaptivePipeFloorConnectionShape: React.FC<AdaptivePipeFloorConnectionShapeProps> = ({
  adapter,
  item,
  isSelected
}) => {
  const x = item.x * PIXELS_PER_METER;
  const y = item.y * PIXELS_PER_METER;

  return adapter.createRect({
    id: `pipe-floor-connection-${item.id}`,
    x: x - 5,
    y: y - 5,
    width: 10,
    height: 10,
    fill: isSelected ? '#FF6B35' : '#FF9800',
    stroke: '#FFFFFF',
    strokeWidth: 1
  });
};

export default AdaptivePipeFloorConnectionShape;
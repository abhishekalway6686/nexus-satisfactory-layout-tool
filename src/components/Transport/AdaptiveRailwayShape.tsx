/**
 * Adaptive Railway Shape - GPU-optimized railway rendering
 */

import React, { useMemo } from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { Railway } from '../../types';
import { PIXELS_PER_METER } from '../../constants';

interface AdaptiveRailwayShapeProps {
  adapter: RendererAdapter;
  item: Railway;
  isSelected: boolean;
  lodLevel: 'low' | 'medium' | 'high';
  renderQuality: number;
}

export const AdaptiveRailwayShape: React.FC<AdaptiveRailwayShapeProps> = ({
  adapter,
  item,
  isSelected,
  lodLevel
}) => {
  const startX = item.startX * PIXELS_PER_METER;
  const startY = item.startY * PIXELS_PER_METER;
  const endX = item.endX * PIXELS_PER_METER;
  const endY = item.endY * PIXELS_PER_METER;

  // Calculate railway curve points if available
  const railwayPoints = useMemo(() => {
    const points = [startX, startY];
    
    if (item.controlPoints && item.controlPoints.length > 0) {
      for (const cp of item.controlPoints) {
        points.push(cp.x * PIXELS_PER_METER, cp.y * PIXELS_PER_METER);
      }
    }
    
    points.push(endX, endY);
    return points;
  }, [item, startX, startY, endX, endY]);

  const railWidth = lodLevel === 'high' ? 12 : lodLevel === 'medium' ? 8 : 6;

  if (lodLevel === 'low') {
    return adapter.createLine({
      id: `railway-${item.id}-simple`,
      points: [startX, startY, endX, endY],
      stroke: isSelected ? '#FF6B35' : '#795548',
      strokeWidth: 4,
      lineCap: 'round'
    });
  }

  return adapter.createGroup({
    id: `railway-group-${item.id}`,
    children: (
      <>
        {/* Railway bed */}
        {adapter.createLine({
          id: `railway-${item.id}-bed`,
          points: railwayPoints,
          stroke: isSelected ? '#FF6B35' : '#8D6E63',
          strokeWidth: railWidth,
          lineCap: 'round',
          lineJoin: 'round'
        })}

        {/* Railway rails (high detail only) */}
        {lodLevel === 'high' && (
          <>
            {adapter.createLine({
              id: `railway-${item.id}-rail1`,
              points: railwayPoints,
              stroke: '#424242',
              strokeWidth: 2,
              lineCap: 'round'
            })}
            {adapter.createLine({
              id: `railway-${item.id}-rail2`,
              points: railwayPoints,
              stroke: '#424242',
              strokeWidth: 2,
              lineCap: 'round'
            })}
          </>
        )}
      </>
    )
  });
};

export default AdaptiveRailwayShape;
/**
 * Adaptive Floor Below Layer - Renders items on floors below current floor
 * Optimized for GPU rendering with transparency and reduced detail
 */

import React, { useMemo } from 'react';
import { RendererAdapter } from '../../../renderer/adapters/RendererAdapter';
import { Building, Foundation, Wall, Railing } from '../../../types';
import { AdaptiveBuildingShape } from '../../Buildings/AdaptiveBuildingShape';
import { AdaptiveFoundationShape } from '../../Architecture/AdaptiveFoundationShape';
import { AdaptiveWallShape } from '../../Architecture/AdaptiveWallShape';
import { AdaptiveRailingShape } from '../../Architecture/AdaptiveRailingShape';

interface AdaptiveFloorBelowLayerProps {
  adapter: RendererAdapter;
  scale: number;
  currentFloor: number;
  buildings: Building[];
  foundations: Foundation[];
  walls: Wall[];
  railings: Railing[];
}

export const AdaptiveFloorBelowLayer: React.FC<AdaptiveFloorBelowLayerProps> = ({
  adapter,
  scale,
  currentFloor,
  buildings,
  foundations,
  walls,
  railings
}) => {
  // Filter items on floors below current floor
  const itemsBelow = useMemo(() => {
    const floorsBelow = [currentFloor - 1, currentFloor - 2]; // Show up to 2 floors below
    
    return {
      buildings: buildings.filter(b => floorsBelow.includes(b.z)),
      foundations: foundations.filter(f => floorsBelow.includes(f.z)),
      walls: walls.filter(w => floorsBelow.includes(w.z)),
      railings: railings.filter(r => floorsBelow.includes(r.z))
    };
  }, [currentFloor, buildings, foundations, walls, railings]);

  // Calculate opacity based on floor distance
  const getOpacityForFloor = (itemFloor: number): number => {
    const floorDistance = currentFloor - itemFloor;
    if (floorDistance === 1) return 0.3; // Floor directly below
    if (floorDistance === 2) return 0.15; // Two floors below
    return 0; // Too far below, don't render
  };

  // LOD for floor below (always low detail for performance)
  const lodLevel = 'low' as const;
  const renderQuality = 0.3;

  // Don't render if no items below
  if (itemsBelow.buildings.length === 0 && 
      itemsBelow.foundations.length === 0 && 
      itemsBelow.walls.length === 0 && 
      itemsBelow.railings.length === 0) {
    return null;
  }

  return adapter.createGroup({
    id: 'floor-below-group',
    opacity: 0.5, // Overall transparency for below floors
    children: (
      <>
        {/* Foundations below */}
        {itemsBelow.foundations.map(foundation => (
          <AdaptiveFoundationShape
            key={`below-${foundation.id}`}
            adapter={adapter}
            item={foundation}
            isSelected={false}
            lodLevel={lodLevel}
            renderQuality={renderQuality}
            opacity={getOpacityForFloor(foundation.z)}
          />
        ))}

        {/* Walls below */}
        {itemsBelow.walls.map(wall => (
          <AdaptiveWallShape
            key={`below-${wall.id}`}
            adapter={adapter}
            item={wall}
            isSelected={false}
            lodLevel={lodLevel}
            renderQuality={renderQuality}
            opacity={getOpacityForFloor(wall.z)}
          />
        ))}

        {/* Railings below */}
        {itemsBelow.railings.map(railing => (
          <AdaptiveRailingShape
            key={`below-${railing.id}`}
            adapter={adapter}
            item={railing}
            isSelected={false}
            lodLevel={lodLevel}
            renderQuality={renderQuality}
            opacity={getOpacityForFloor(railing.z)}
          />
        ))}

        {/* Buildings below */}
        {itemsBelow.buildings.map(building => (
          <AdaptiveBuildingShape
            key={`below-${building.id}`}
            adapter={adapter}
            item={building}
            isSelected={false}
            lodLevel={lodLevel}
            renderQuality={renderQuality}
            opacity={getOpacityForFloor(building.z)}
          />
        ))}
      </>
    )
  });
};

export default AdaptiveFloorBelowLayer;
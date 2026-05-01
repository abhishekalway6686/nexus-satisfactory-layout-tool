/**
 * Adaptive Auxiliary Layer - Helper indicators and debug overlays
 */

import React from 'react';
import { RendererAdapter } from '../../../renderer/adapters/RendererAdapter';
import { StationSnapVisualIndicator } from '../../../utils/stationSnapping';

interface AdaptiveAuxiliaryLayerProps {
  adapter: RendererAdapter;
  stationSnapIndicator: StationSnapVisualIndicator | null;
  dragValidation: { isValid: boolean; buildingType: string } | null;
  showRailwayDebug: boolean;
}

export const AdaptiveAuxiliaryLayer: React.FC<AdaptiveAuxiliaryLayerProps> = ({
  adapter,
  stationSnapIndicator,
  dragValidation,
  showRailwayDebug
}) => {
  return adapter.createGroup({
    id: 'auxiliary-group',
    children: (
      <>
        {/* Station snap indicator */}
        {stationSnapIndicator && adapter.createCircle({
          id: 'station-snap-indicator',
          x: stationSnapIndicator.x,
          y: stationSnapIndicator.y,
          radius: 20,
          fill: 'transparent',
          stroke: '#4CAF50',
          strokeWidth: 3,
          dash: [5, 5]
        })}

        {/* Drag validation indicator */}
        {dragValidation && adapter.createText({
          id: 'drag-validation',
          x: 20,
          y: 50,
          text: dragValidation.isValid ? 'Valid placement' : 'Invalid placement',
          fontSize: 14,
          fontFamily: 'Arial',
          fill: dragValidation.isValid ? '#4CAF50' : '#F44336'
        })}
      </>
    )
  });
};

export default AdaptiveAuxiliaryLayer;
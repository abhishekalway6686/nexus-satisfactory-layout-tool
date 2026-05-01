/**
 * Adaptive UI Overlay Layer - Performance and renderer information overlay
 */

import React from 'react';
import { RendererAdapter } from '../../../renderer/adapters/RendererAdapter';

interface AdaptiveUIOverlayLayerProps {
  adapter: RendererAdapter;
  rendererStats: any;
  rendererType: 'konva' | 'webgl' | null;
  capabilities: {
    supportsGPURendering: boolean;
    supportsInstancedRendering: boolean;
    supportsBatching: boolean;
    supportsLOD: boolean;
  };
}

export const AdaptiveUIOverlayLayer: React.FC<AdaptiveUIOverlayLayerProps> = ({
  adapter,
  rendererStats,
  rendererType,
  capabilities
}) => {
  // Performance overlay (only in development or when explicitly enabled)
  const showPerformanceOverlay = process.env.NODE_ENV === 'development';

  if (!showPerformanceOverlay) return null;

  return adapter.createGroup({
    id: 'ui-overlay-group',
    children: (
      <>
        {/* Performance stats */}
        {rendererStats && adapter.createText({
          id: 'performance-stats',
          x: 10,
          y: 10,
          text: `Renderer: ${rendererType}\nFPS: ${Math.round(rendererStats.fps)}\nFrame: ${rendererStats.frameTime?.toFixed(1)}ms`,
          fontSize: 12,
          fontFamily: 'monospace',
          fill: '#333',
          align: 'left'
        })}

        {/* Capabilities indicator */}
        {adapter.createText({
          id: 'capabilities-info',
          x: 10,
          y: 80,
          text: `GPU: ${capabilities.supportsGPURendering ? 'Yes' : 'No'}\nInstancing: ${capabilities.supportsInstancedRendering ? 'Yes' : 'No'}\nBatching: ${capabilities.supportsBatching ? 'Yes' : 'No'}`,
          fontSize: 10,
          fontFamily: 'monospace',
          fill: '#666',
          align: 'left'
        })}
      </>
    )
  });
};

export default AdaptiveUIOverlayLayer;
/**
 * useRendererAdapter Hook - Provides easy access to renderer adapters
 * Automatically creates and manages the appropriate adapter based on active renderer
 */

import { useMemo, useEffect, useState } from 'react';
import { useRenderer } from './useRenderer';
import { RendererAdapter } from '../renderer/adapters/RendererAdapter';
import { KonvaAdapter } from '../renderer/adapters/KonvaAdapter';
import { WebGLAdapter } from '../renderer/adapters/WebGLAdapter';

interface UseRendererAdapterOptions {
  enableBatching?: boolean;
  enableInstancedRendering?: boolean;
  lodConfig?: {
    lowDetail?: number;
    mediumDetail?: number;
    highDetail?: number;
  };
  instancedConfig?: {
    maxInstances?: number;
    bufferSize?: number;
    updateFrequency?: number;
  };
}

interface UseRendererAdapterReturn {
  adapter: RendererAdapter | null;
  isLoading: boolean;
  error: string | null;
  rendererType: 'konva' | 'webgl' | null;
  capabilities: {
    supportsGPURendering: boolean;
    supportsInstancedRendering: boolean;
    supportsBatching: boolean;
    supportsLOD: boolean;
  };
  stats: {
    fps: number;
    frameTime: number;
    drawCalls: number;
    memory: number;
    rendererSpecific?: any;
  } | null;
  // Adapter-specific methods
  enableInstancedRendering: (enabled: boolean) => void;
  setLODConfig: (config: any) => void;
  getCurrentLOD: (scale: number) => 'low' | 'medium' | 'high';
  flushBatchedOperations: () => void;
}

export function useRendererAdapter(
  container: HTMLElement | null,
  options: UseRendererAdapterOptions = {}
): UseRendererAdapterReturn {
  const [adapter, setAdapter] = useState<RendererAdapter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    renderer,
    rendererType,
    isLoading: rendererLoading,
    error: rendererError
  } = useRenderer({
    container,
    autoSwitch: true,
    fallbackToKonva: true
  });

  // Create adapter when renderer changes
  useEffect(() => {
    let isCancelled = false;

    async function createAdapter() {
      if (!renderer) {
        setAdapter(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let newAdapter: RendererAdapter;

        switch (renderer.getType()) {
          case 'konva':
            newAdapter = new KonvaAdapter(renderer);
            break;
          case 'webgl':
            newAdapter = new WebGLAdapter(renderer);
            break;
          default:
            throw new Error(`Unsupported renderer type: ${renderer.getType()}`);
        }

        // Configure adapter with options
        if (options.enableBatching) {
          // Batching is enabled by default in adapters
        }

        if (options.enableInstancedRendering && newAdapter.isGPURenderer()) {
          newAdapter.enableInstancedRendering(options.instancedConfig);
        }

        if (options.lodConfig) {
          newAdapter.setLODConfig(options.lodConfig);
        }

        if (!isCancelled) {
          setAdapter(newAdapter);
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to create adapter';
          setError(errorMessage);
          console.error('Failed to create renderer adapter:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    createAdapter();

    return () => {
      isCancelled = true;
      if (adapter) {
        adapter.dispose();
      }
    };
  }, [renderer, options.enableBatching, options.enableInstancedRendering]);

  // Capabilities based on current adapter
  const capabilities = useMemo(() => {
    if (!adapter) {
      return {
        supportsGPURendering: false,
        supportsInstancedRendering: false,
        supportsBatching: false,
        supportsLOD: false
      };
    }

    const isGPU = adapter.isGPURenderer();

    return {
      supportsGPURendering: isGPU,
      supportsInstancedRendering: isGPU,
      supportsBatching: true,
      supportsLOD: true
    };
  }, [adapter]);

  // Performance stats
  const stats = useMemo(() => {
    if (!adapter) return null;

    const baseStats = adapter.getStats();
    let rendererSpecific = null;

    // Get renderer-specific stats
    if (adapter instanceof KonvaAdapter) {
      rendererSpecific = (adapter as any).getKonvaStats?.();
    } else if (adapter instanceof WebGLAdapter) {
      rendererSpecific = (adapter as any).getWebGLStats?.();
    }

    return {
      ...baseStats,
      rendererSpecific
    };
  }, [adapter]);

  // Adapter control methods
  const enableInstancedRendering = (enabled: boolean) => {
    if (adapter) {
      if (enabled) {
        adapter.enableInstancedRendering(options.instancedConfig);
      } else {
        adapter.disableInstancedRendering();
      }
    }
  };

  const setLODConfig = (config: any) => {
    if (adapter) {
      adapter.setLODConfig(config);
    }
  };

  const getCurrentLOD = (scale: number) => {
    return adapter ? adapter.getCurrentLOD(scale) : 'medium';
  };

  const flushBatchedOperations = () => {
    if (adapter) {
      adapter.flushBatchedOperations();
    }
  };

  return {
    adapter,
    isLoading: isLoading || rendererLoading,
    error: error || rendererError,
    rendererType,
    capabilities,
    stats,
    enableInstancedRendering,
    setLODConfig,
    getCurrentLOD,
    flushBatchedOperations
  };
}

// Hook for accessing adapter context (if you want to use React Context)
export function useAdapterContext() {
  // This could be expanded to use React Context for adapter sharing
  // For now, returns null - components should use useRendererAdapter directly
  return null;
}

// Hook for simplified shape creation
export function useAdapterShapes(adapter: RendererAdapter | null) {
  return useMemo(() => {
    if (!adapter) {
      return {
        createRect: () => null,
        createCircle: () => null,
        createLine: () => null,
        createText: () => null,
        createGroup: () => null
      };
    }

    return {
      createRect: adapter.createRect.bind(adapter),
      createCircle: adapter.createCircle.bind(adapter),
      createLine: adapter.createLine.bind(adapter),
      createText: adapter.createText.bind(adapter),
      createGroup: adapter.createGroup.bind(adapter)
    };
  }, [adapter]);
}

// Hook for performance monitoring
export function useAdapterPerformance(adapter: RendererAdapter | null) {
  const [performanceData, setPerformanceData] = useState<any>(null);

  useEffect(() => {
    if (!adapter) return;

    const interval = setInterval(() => {
      const stats = adapter.getStats();
      setPerformanceData(stats);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [adapter]);

  return performanceData;
}

// Hook for automatic optimization based on performance
export function useAdapterAutoOptimization(adapter: RendererAdapter | null) {
  const performanceData = useAdapterPerformance(adapter);

  useEffect(() => {
    if (!adapter || !performanceData) return;

    // Auto-optimize based on performance
    const { fps, memory } = performanceData;

    // If FPS is low, enable more aggressive optimizations
    if (fps < 30) {
      adapter.enableInstancedRendering({
        enabled: true,
        maxInstances: 500, // Reduce instances
        updateFrequency: 32 // Lower update frequency
      });

      adapter.setLODConfig({
        lowDetail: 0.3,
        mediumDetail: 0.8,
        highDetail: 1.5
      });
    }

    // If memory usage is high, flush batches more frequently
    if (memory > 100 * 1024 * 1024) { // 100MB
      adapter.flushBatchedOperations();
    }
  }, [adapter, performanceData]);
}

export default useRendererAdapter;
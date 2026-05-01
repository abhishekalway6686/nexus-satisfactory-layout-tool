/**
 * useRenderer Hook - React hook for managing renderer instances
 * Provides easy access to renderer switching and management
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLayoutStore } from '../store/layoutStore';
import { RendererFactory, RendererType } from '../renderer/RendererFactory';
import { RendererInterface } from '../renderer/RendererInterface';

interface UseRendererOptions {
  container?: HTMLElement | null;
  width?: number;
  height?: number;
  autoSwitch?: boolean; // Automatically switch when store changes
  fallbackToKonva?: boolean;
}

interface UseRendererReturn {
  renderer: RendererInterface | null;
  rendererType: RendererType | null;
  isLoading: boolean;
  error: string | null;
  isWebGLSupported: boolean;
  switchRenderer: (type: RendererType) => Promise<void>;
  getStats: () => { fps: number; frameTime: number; drawCalls: number; memory: number } | null;
  benchmark: () => Promise<{
    konva: { fps: number; frameTime: number };
    webgl: { fps: number; frameTime: number };
    recommendation: RendererType;
  }>;
}

export function useRenderer(options: UseRendererOptions = {}): UseRendererReturn {
  const { rendererType: storeRendererType } = useLayoutStore();
  const [renderer, setRenderer] = useState<RendererInterface | null>(null);
  const [rendererType, setRendererType] = useState<RendererType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const rendererFactory = useRef<RendererFactory | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Initialize renderer factory
  useEffect(() => {
    rendererFactory.current = RendererFactory.getInstance();
    return () => {
      if (rendererFactory.current) {
        rendererFactory.current.dispose();
      }
    };
  }, []);

  // Update container reference
  useEffect(() => {
    containerRef.current = options.container || null;
  }, [options.container]);

  // Create or switch renderer when store changes
  useEffect(() => {
    if (!options.autoSwitch) return;
    if (!containerRef.current) return;
    if (!rendererFactory.current) return;

    const targetType = storeRendererType || 'konva';
    
    if (rendererType === targetType && renderer) {
      return; // No change needed
    }

    switchRendererInternal(targetType);
  }, [storeRendererType, options.autoSwitch, renderer, rendererType]);

  const switchRendererInternal = useCallback(async (newType: RendererType) => {
    if (!containerRef.current || !rendererFactory.current) {
      setError('Container or renderer factory not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let newRenderer: RendererInterface;

      if (renderer && rendererType) {
        // Switch existing renderer
        newRenderer = await rendererFactory.current.switchRenderer(newType);
      } else {
        // Create new renderer
        newRenderer = await rendererFactory.current.createRenderer({
          container: containerRef.current,
          width: options.width || containerRef.current.clientWidth,
          height: options.height || containerRef.current.clientHeight,
          preferredRenderer: newType,
          fallbackToKonva: options.fallbackToKonva
        });
      }

      setRenderer(newRenderer);
      setRendererType(newRenderer.getType());
      
      console.log(`Switched to ${newRenderer.getType()} renderer`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to switch renderer:', err);
    } finally {
      setIsLoading(false);
    }
  }, [renderer, rendererType, options.width, options.height, options.fallbackToKonva]);

  const switchRenderer = useCallback(async (newType: RendererType) => {
    await switchRendererInternal(newType);
  }, [switchRendererInternal]);

  const getStats = useCallback(() => {
    if (!renderer) return null;
    return renderer.getStats();
  }, [renderer]);

  const benchmark = useCallback(async () => {
    if (!rendererFactory.current) {
      throw new Error('Renderer factory not available');
    }

    return await rendererFactory.current.benchmarkRenderers();
  }, []);

  // Handle container resize
  useEffect(() => {
    if (!renderer || !containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        renderer.resize(width, height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [renderer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderer) {
        renderer.dispose();
      }
    };
  }, []);

  const isWebGLSupported = rendererFactory.current?.isWebGLAvailable() ?? false;

  return {
    renderer,
    rendererType,
    isLoading,
    error,
    isWebGLSupported,
    switchRenderer,
    getStats,
    benchmark
  };
}

// Utility hook for renderer-agnostic shape management
export function useRendererShapes(renderer: RendererInterface | null) {
  const addRect = useCallback((props: Parameters<RendererInterface['addRect']>[0]) => {
    if (renderer) {
      renderer.addRect(props);
    }
  }, [renderer]);

  const addCircle = useCallback((props: Parameters<RendererInterface['addCircle']>[0]) => {
    if (renderer) {
      renderer.addCircle(props);
    }
  }, [renderer]);

  const addLine = useCallback((props: Parameters<RendererInterface['addLine']>[0]) => {
    if (renderer) {
      renderer.addLine(props);
    }
  }, [renderer]);

  const addText = useCallback((props: Parameters<RendererInterface['addText']>[0]) => {
    if (renderer) {
      renderer.addText(props);
    }
  }, [renderer]);

  const updateShape = useCallback((id: string, props: Parameters<RendererInterface['updateShape']>[1]) => {
    if (renderer) {
      renderer.updateShape(id, props);
    }
  }, [renderer]);

  const removeShape = useCallback((id: string) => {
    if (renderer) {
      renderer.removeShape(id);
    }
  }, [renderer]);

  const clear = useCallback(() => {
    if (renderer) {
      renderer.clear();
    }
  }, [renderer]);

  return {
    addRect,
    addCircle,
    addLine,
    addText,
    updateShape,
    removeShape,
    clear
  };
}

// Hook for renderer event handling
export function useRendererEvents(renderer: RendererInterface | null) {
  const addEventListener = useCallback((type: string, listener: (event: any) => void) => {
    if (renderer) {
      renderer.addEventListener(type, listener);
    }
  }, [renderer]);

  const removeEventListener = useCallback((type: string, listener: (event: any) => void) => {
    if (renderer) {
      renderer.removeEventListener(type, listener);
    }
  }, [renderer]);

  // Auto-cleanup effect
  useEffect(() => {
    const listeners: Array<{ type: string; listener: (event: any) => void }> = [];

    return () => {
      // Clean up all listeners when component unmounts or renderer changes
      listeners.forEach(({ type, listener }) => {
        if (renderer) {
          renderer.removeEventListener(type, listener);
        }
      });
    };
  }, [renderer]);

  return {
    addEventListener,
    removeEventListener
  };
}
/**
 * Canvas Renderer - Unified component that can switch between legacy Konva and new adaptive rendering
 * Provides backward compatibility while enabling GPU acceleration
 */

import React, { useState, useEffect } from 'react';
import { FactoryCanvas } from './FactoryCanvas'; // Original Konva implementation
import { AdaptiveFactoryCanvas } from './AdaptiveFactoryCanvas'; // New adaptive implementation
import { useLayoutStore } from '../../store/layoutStore';

interface CanvasRendererProps {
  onPositionChange?: (x: number, y: number) => void;
  onZoomChange?: (scale: number) => void;
  leftPanelWidth?: number;
  rightPanelWidth?: number;
  // Rendering mode selection
  mode?: 'legacy' | 'adaptive' | 'auto';
  // Force specific renderer for testing
  forceRenderer?: 'konva' | 'webgl';
  // Performance settings
  enableGPU?: boolean;
  enableBatching?: boolean;
  enableLOD?: boolean;
}

// Capability detection
function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

function detectDeviceCapabilities() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isDesktop = !(/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent));
  const hasHighRAM = (navigator as any).deviceMemory ? (navigator as any).deviceMemory >= 4 : true;
  const hasWebGL = detectWebGLSupport();
  
  return {
    isDesktop,
    hasHighRAM,
    hasWebGL,
    recommendsGPU: isDesktop && hasHighRAM && hasWebGL
  };
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  mode = 'auto',
  forceRenderer,
  enableGPU = true,
  enableBatching = true,
  enableLOD = true,
  ...canvasProps
}) => {
  const [renderingMode, setRenderingMode] = useState<'legacy' | 'adaptive'>('legacy');
  const [capabilities, setCapabilities] = useState(detectDeviceCapabilities());
  
  // Store renderer preference
  const { rendererType, setRendererType } = useLayoutStore();

  // Determine rendering mode
  useEffect(() => {
    switch (mode) {
      case 'legacy':
        setRenderingMode('legacy');
        break;
      case 'adaptive':
        setRenderingMode('adaptive');
        break;
      case 'auto':
        // Auto-select based on capabilities and user preference
        if (forceRenderer) {
          setRenderingMode('adaptive');
          setRendererType(forceRenderer);
        } else if (capabilities.recommendsGPU && enableGPU) {
          setRenderingMode('adaptive');
          setRendererType('webgl');
        } else if (capabilities.hasWebGL) {
          setRenderingMode('adaptive');
          setRendererType('konva');
        } else {
          setRenderingMode('legacy');
        }
        break;
    }
  }, [mode, capabilities, enableGPU, forceRenderer, setRendererType]);

  // Performance monitoring for auto-optimization
  useEffect(() => {
    if (mode !== 'auto') return;

    let frameCount = 0;
    let lastTime = performance.now();
    const fpsHistory: number[] = [];

    const measurePerformance = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        fpsHistory.push(fps);
        if (fpsHistory.length > 5) fpsHistory.shift();
        
        const avgFPS = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
        
        // Auto-optimize based on performance
        if (avgFPS < 30 && renderingMode === 'adaptive' && rendererType === 'webgl') {
          console.log('Performance degraded, switching to Konva renderer');
          setRendererType('konva');
        } else if (avgFPS < 20 && renderingMode === 'adaptive') {
          console.log('Performance critically low, switching to legacy renderer');
          setRenderingMode('legacy');
        }
      }
      
      requestAnimationFrame(measurePerformance);
    };

    const animationId = requestAnimationFrame(measurePerformance);
    return () => cancelAnimationFrame(animationId);
  }, [mode, renderingMode, rendererType, setRendererType]);

  // Render based on selected mode
  if (renderingMode === 'legacy') {
    return <FactoryCanvas {...canvasProps} />;
  }

  return <AdaptiveFactoryCanvas {...canvasProps} />;
};

// Hook for manually controlling renderer mode
export function useCanvasRenderer() {
  const [mode, setMode] = useState<'legacy' | 'adaptive' | 'auto'>('auto');
  const [capabilities] = useState(detectDeviceCapabilities());
  const { rendererType, setRendererType } = useLayoutStore();

  const switchToLegacy = () => setMode('legacy');
  const switchToAdaptive = (renderer?: 'konva' | 'webgl') => {
    setMode('adaptive');
    if (renderer) {
      setRendererType(renderer);
    }
  };
  const switchToAuto = () => setMode('auto');

  const forceWebGL = () => {
    if (capabilities.hasWebGL) {
      setMode('adaptive');
      setRendererType('webgl');
    } else {
      console.warn('WebGL not supported, falling back to Konva');
      setMode('adaptive');
      setRendererType('konva');
    }
  };

  const forceKonva = () => {
    setMode('adaptive');
    setRendererType('konva');
  };

  return {
    mode,
    capabilities,
    currentRenderer: rendererType,
    switchToLegacy,
    switchToAdaptive,
    switchToAuto,
    forceWebGL,
    forceKonva,
    // Quick presets
    enableHighPerformance: () => forceWebGL(),
    enableCompatibilityMode: () => forceKonva(),
    enableAutoOptimization: () => switchToAuto()
  };
}

// Development helper component for testing renderers
export const RendererDebugPanel: React.FC = () => {
  const {
    mode,
    capabilities,
    currentRenderer,
    switchToLegacy,
    switchToAdaptive,
    switchToAuto,
    forceWebGL,
    forceKonva
  } = useCanvasRenderer();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed top-4 left-4 bg-white p-4 rounded shadow-lg border z-50">
      <h3 className="font-bold mb-2">Renderer Debug Panel</h3>
      
      <div className="text-sm mb-3">
        <div>Mode: {mode}</div>
        <div>Current: {currentRenderer || 'legacy'}</div>
        <div>WebGL: {capabilities.hasWebGL ? '✓' : '✗'}</div>
        <div>Desktop: {capabilities.isDesktop ? '✓' : '✗'}</div>
        <div>High RAM: {capabilities.hasHighRAM ? '✓' : '✗'}</div>
      </div>

      <div className="flex flex-col gap-1">
        <button
          onClick={switchToLegacy}
          className={`px-2 py-1 text-xs rounded ${mode === 'legacy' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Legacy Konva
        </button>
        <button
          onClick={() => switchToAdaptive('konva')}
          className={`px-2 py-1 text-xs rounded ${mode === 'adaptive' && currentRenderer === 'konva' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Adaptive Konva
        </button>
        <button
          onClick={forceWebGL}
          className={`px-2 py-1 text-xs rounded ${mode === 'adaptive' && currentRenderer === 'webgl' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          disabled={!capabilities.hasWebGL}
        >
          Adaptive WebGL
        </button>
        <button
          onClick={switchToAuto}
          className={`px-2 py-1 text-xs rounded ${mode === 'auto' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
        >
          Auto
        </button>
      </div>
    </div>
  );
};

export default CanvasRenderer;
// src/hooks/usePerformanceMode.ts

import { useState, useEffect, useCallback, useRef } from 'react';

interface PerformanceConfig {
  // UI Effects
  enableBackdropBlur: boolean;
  enableAnimations: boolean;
  enableGlowEffects: boolean;
  enableComplexGradients: boolean;
  blurAmount: number;
  shadowQuality: 'low' | 'medium' | 'high';
  animationDuration: number;

  // Canvas/Konva specific
  lodBias: number; // Multiplier for LOD thresholds (higher = more detail at lower zoom)
  enableKonvaCache: boolean; // Whether to cache Konva elements
  enableConnectionPoints: boolean; // Show building connection points
  enableConveyorAnimations: boolean; // Animate conveyor belts
  enableBuildingShadows: boolean; // Shadows under buildings
  maxRenderDistance: number; // Max distance from viewport center to render (0 = unlimited)
  targetFPS: number; // Target framerate for throttling
}

type PerformanceMode = 'auto' | 'high' | 'medium' | 'low';

// Performance presets
const PERFORMANCE_PRESETS: Record<Exclude<PerformanceMode, 'auto'>, PerformanceConfig> = {
  high: {
    enableBackdropBlur: true,
    enableAnimations: true,
    enableGlowEffects: true,
    enableComplexGradients: true,
    blurAmount: 20,
    shadowQuality: 'high',
    animationDuration: 2000,
    lodBias: 1.0,
    enableKonvaCache: true,
    enableConnectionPoints: true,
    enableConveyorAnimations: true,
    enableBuildingShadows: true,
    maxRenderDistance: 0,
    targetFPS: 60,
  },
  medium: {
    enableBackdropBlur: true,
    enableAnimations: true,
    enableGlowEffects: false,
    enableComplexGradients: false,
    blurAmount: 10,
    shadowQuality: 'medium',
    animationDuration: 1000,
    lodBias: 0.7,
    enableKonvaCache: true,
    enableConnectionPoints: true,
    enableConveyorAnimations: false,
    enableBuildingShadows: false,
    maxRenderDistance: 0,
    targetFPS: 30,
  },
  low: {
    enableBackdropBlur: false,
    enableAnimations: false,
    enableGlowEffects: false,
    enableComplexGradients: false,
    blurAmount: 0,
    shadowQuality: 'low',
    animationDuration: 0,
    lodBias: 0.25, // More aggressive LOD for low mode
    enableKonvaCache: true,
    enableConnectionPoints: false,
    enableConveyorAnimations: false,
    enableBuildingShadows: false,
    maxRenderDistance: 3000, // Reduced render distance
    targetFPS: 30,
  },
};

export const usePerformanceMode = () => {
  const [mode, setMode] = useState<PerformanceMode>('auto');
  const [config, setConfig] = useState<PerformanceConfig>(PERFORMANCE_PRESETS.high);
  const [detectedMode, setDetectedMode] = useState<Exclude<PerformanceMode, 'auto'>>('high');
  const [currentFPS, setCurrentFPS] = useState<number>(60);
  const [buildingCount, setBuildingCount] = useState<number>(0);

  // FPS tracking
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const fpsIntervalRef = useRef<number | null>(null);

  // Detect device capabilities
  const detectPerformance = useCallback((): Exclude<PerformanceMode, 'auto'> => {
    const factors = {
      isMobile: window.innerWidth < 768,
      hasTouch: 'ontouchstart' in window,
      deviceMemory: (navigator as any).deviceMemory || 4,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      connection: (navigator as any).connection,
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };

    // Auto-detect performance level
    let performanceScore = 0;

    if (!factors.isMobile) performanceScore += 2;
    if (factors.deviceMemory >= 8) performanceScore += 2;
    else if (factors.deviceMemory >= 4) performanceScore += 1;

    if (factors.hardwareConcurrency >= 8) performanceScore += 2;
    else if (factors.hardwareConcurrency >= 4) performanceScore += 1;

    if (factors.connection?.effectiveType === '4g') performanceScore += 1;
    if (!factors.prefersReducedMotion) performanceScore += 1;

    // Determine performance level based on score
    if (performanceScore >= 7) return 'high';
    if (performanceScore >= 4) return 'medium';
    return 'low';
  }, []);

  // Apply performance mode to DOM
  const applyPerformanceMode = useCallback((performanceMode: PerformanceMode, forceMode?: Exclude<PerformanceMode, 'auto'>) => {
    const root = document.documentElement;
    let actualMode: Exclude<PerformanceMode, 'auto'>;

    if (performanceMode === 'auto') {
      actualMode = forceMode || detectPerformance();
      setDetectedMode(actualMode);
    } else {
      actualMode = performanceMode;
      setDetectedMode(actualMode);
    }

    const newConfig = PERFORMANCE_PRESETS[actualMode];

    // Update CSS custom properties
    root.style.setProperty('--blur-amount', `${newConfig.blurAmount}px`);
    root.style.setProperty('--animation-duration', `${newConfig.animationDuration}ms`);
    root.style.setProperty('--shadow-layers', newConfig.shadowQuality === 'high' ? '3' : newConfig.shadowQuality === 'medium' ? '2' : '1');
    root.style.setProperty('--lod-bias', `${newConfig.lodBias}`);

    // Set performance attribute for CSS selectors
    if (actualMode === 'high') {
      root.removeAttribute('data-performance');
    } else {
      root.setAttribute('data-performance', actualMode);
    }

    // Add/remove performance classes
    document.body.classList.toggle('no-animations', !newConfig.enableAnimations);
    document.body.classList.toggle('no-blur', !newConfig.enableBackdropBlur);
    document.body.classList.toggle('no-glow', !newConfig.enableGlowEffects);
    document.body.classList.toggle('simple-gradients', !newConfig.enableComplexGradients);

    setConfig(newConfig);

    // Save preference
    localStorage.setItem('performanceMode', performanceMode);
  }, [detectPerformance]);

  // Lightweight FPS monitoring using RAF (less overhead than setInterval)
  const rafIdRef = useRef<number | null>(null);
  const sampleCountRef = useRef<number>(0);
  const fpsCheckThrottleRef = useRef<number>(0);

  const measureFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    // Only store every 3rd frame to reduce memory churn
    sampleCountRef.current++;
    if (sampleCountRef.current % 3 === 0) {
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 20) { // Reduced from 60 to 20 samples
        frameTimesRef.current.shift();
      }
    }

    // Only calculate FPS every 500ms to reduce overhead
    if (now - fpsCheckThrottleRef.current > 500) {
      fpsCheckThrottleRef.current = now;
      if (frameTimesRef.current.length > 5) {
        const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        const fps = Math.round(1000 / avgFrameTime);
        setCurrentFPS(fps);
        return fps;
      }
    }

    return currentFPS;
  }, [currentFPS]);

  // Auto-downgrade if FPS is consistently too low
  const lowFpsCountRef = useRef<number>(0);

  const checkAutoDowngrade = useCallback(() => {
    if (mode !== 'auto') return;

    const fps = measureFPS();

    // Require multiple low FPS readings before downgrading (debounce)
    if (fps < 20) {
      lowFpsCountRef.current++;
      if (lowFpsCountRef.current >= 3 && detectedMode !== 'low') {
        console.log(`[Performance] Persistent low FPS detected (${fps}), downgrading quality`);
        const newMode = detectedMode === 'high' ? 'medium' : 'low';
        applyPerformanceMode('auto', newMode);
        lowFpsCountRef.current = 0;
      }
    } else {
      lowFpsCountRef.current = 0;
    }
  }, [mode, detectedMode, measureFPS, applyPerformanceMode]);

  // Lightweight RAF-based FPS monitoring (only when in auto mode)
  useEffect(() => {
    if (mode !== 'auto') {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    let frameCount = 0;
    const monitorLoop = () => {
      frameCount++;
      // Only check for downgrade every ~60 frames (~1 second at 60fps)
      if (frameCount >= 60) {
        frameCount = 0;
        checkAutoDowngrade();
      } else {
        // Just measure, don't check
        measureFPS();
      }
      rafIdRef.current = requestAnimationFrame(monitorLoop);
    };

    rafIdRef.current = requestAnimationFrame(monitorLoop);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [mode, checkAutoDowngrade, measureFPS]);

  // Initialize on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('performanceMode') as PerformanceMode || 'auto';
    setMode(savedMode);
    applyPerformanceMode(savedMode);

    // Listen for device changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      if (mode === 'auto') {
        applyPerformanceMode('auto');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    window.addEventListener('resize', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  }, []);

  const setPerformanceMode = useCallback((newMode: PerformanceMode) => {
    setMode(newMode);
    applyPerformanceMode(newMode);
    // Reset FPS tracking when manually changing mode
    frameTimesRef.current = [];
  }, [applyPerformanceMode]);

  // Allow external code to report building count for adaptive performance
  const reportBuildingCount = useCallback((count: number) => {
    setBuildingCount(count);

    // Auto-downgrade if too many buildings in auto mode
    if (mode === 'auto' && count > 200 && detectedMode === 'high') {
      console.log(`[Performance] High building count (${count}), switching to medium quality`);
      applyPerformanceMode('auto', 'medium');
    } else if (mode === 'auto' && count > 500 && detectedMode !== 'low') {
      console.log(`[Performance] Very high building count (${count}), switching to low quality`);
      applyPerformanceMode('auto', 'low');
    }
  }, [mode, detectedMode, applyPerformanceMode]);

  return {
    mode,
    config,
    setPerformanceMode,
    detectedMode, // The actual mode being used (useful when mode is 'auto')
    currentFPS,
    buildingCount,
    reportBuildingCount,
    isLowPerformance: config.shadowQuality === 'low',
    isMediumPerformance: config.shadowQuality === 'medium',
    isHighPerformance: config.shadowQuality === 'high',
  };
};

// Export config type for use in other components
export type { PerformanceConfig, PerformanceMode };

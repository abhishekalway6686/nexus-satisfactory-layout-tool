// src/hooks/useDebouncedPowerlineCalculations.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Point3D } from '../types';
import { 
  validatePowerlineConnection 
} from '../logic/powerline/powerlineLogic';
import { calculatePowerDistance } from '../tauri/commands';
import { powerlineCache } from '../utils/powerlineCache';

interface PowerlineCalculationResult {
  distance: number;
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseDebouncedPowerlineCalculationsProps {
  startPoint: Point3D;
  endPoint: Point3D;
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * High-performance hook for debounced powerline calculations
 * Optimized for real-time drawing preview with caching and error handling
 */
export const useDebouncedPowerlineCalculations = ({
  startPoint,
  endPoint,
  debounceMs = 150, // Increased for better performance
  enabled = true
}: UseDebouncedPowerlineCalculationsProps): PowerlineCalculationResult => {
  const [result, setResult] = useState<PowerlineCalculationResult>({
    distance: 0,
    isValid: true,
    isLoading: false,
    error: null
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastCalculationRef = useRef<string>('');

  // Memoized calculation function
  const performCalculations = useCallback(async (
    from: Point3D, 
    to: Point3D, 
    abortSignal: AbortSignal
  ): Promise<PowerlineCalculationResult> => {
    try {
      // Check if calculation was aborted
      if (abortSignal.aborted) {
        throw new Error('Calculation aborted');
      }

      // Step 1: Calculate distance (cached) - prioritize cache
      let distance = powerlineCache.getCachedDistance(from, to);
      if (distance === null) {
        // Use timeout for backend calls to prevent hanging
        const distancePromise = calculatePowerDistance(from, to);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Distance calculation timeout')), 2000)
        );
        
        distance = await Promise.race([distancePromise, timeoutPromise]);
        powerlineCache.cacheDistance(from, to, distance);
      }

      if (abortSignal.aborted) {
        throw new Error('Calculation aborted');
      }

      // Step 2: Validate connection (cached when possible)
      let isValid = powerlineCache.getCachedValidation(from, to);
      if (isValid === null) {
        const validation = await validatePowerlineConnection(from, to);
        isValid = validation.isValid;
        powerlineCache.cacheValidation(from, to, isValid);
      }

      return {
        distance,
        isValid,
        isLoading: false,
        error: null
      };
    } catch (error) {
      if (abortSignal.aborted) {
        // Don't update state if aborted
        throw error;
      }

      console.warn('[useDebouncedPowerlineCalculations] Calculation failed:', error);

      // Fallback to frontend calculations
      const fallbackDistance = Math.sqrt(
        Math.pow(to.x - from.x, 2) + 
        Math.pow(to.y - from.y, 2) + 
        Math.pow(to.z - from.z, 2)
      );

      return {
        distance: fallbackDistance,
        isValid: fallbackDistance <= 100, // Simple validation fallback
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, []);

  // Debounced calculation effect
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Generate cache key to avoid duplicate calculations
    const cacheKey = `${startPoint.x},${startPoint.y},${startPoint.z}-${endPoint.x},${endPoint.y},${endPoint.z}`;
    
    // Skip if this is the same calculation as last time
    if (cacheKey === lastCalculationRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Abort any in-flight calculation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Set loading state immediately for responsive UI
    setResult(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    // Debounced calculation
    timeoutRef.current = setTimeout(async () => {
      try {
        lastCalculationRef.current = cacheKey;
        const calculationResult = await performCalculations(
          startPoint, 
          endPoint, 
          currentAbortController.signal
        );
        
        // Only update if this calculation wasn't aborted
        if (!currentAbortController.signal.aborted) {
          setResult(calculationResult);
        }
      } catch (error) {
        if (!currentAbortController.signal.aborted) {
          setResult(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      }
    }, debounceMs);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (currentAbortController) {
        currentAbortController.abort();
      }
    };
  }, [startPoint, endPoint, enabled, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return result;
};

/**
 * Lightweight hook for immediate calculations (no debouncing)
 * Use for one-time calculations or when immediate response is needed
 */
export const useImmediatePowerlineCalculations = (
  startPoint: Point3D,
  endPoint: Point3D,
  enabled: boolean = true
): PowerlineCalculationResult => {
  return useDebouncedPowerlineCalculations({
    startPoint,
    endPoint,
    debounceMs: 0,
    enabled
  });
};

/**
 * Hook for batch powerline calculations
 * Optimized for multiple segments with shared caching
 */
export const useBatchPowerlineCalculations = (
  segments: Array<{ start: Point3D; end: Point3D }>,
  enabled: boolean = true
): {
  results: PowerlineCalculationResult[];
  isLoading: boolean;
  errors: string[];
} => {
  const [results, setResults] = useState<PowerlineCalculationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled || segments.length === 0) {
      setResults([]);
      setErrors([]);
      return;
    }

    let aborted = false;
    setIsLoading(true);
    setErrors([]);

    const calculateBatch = async () => {
      const batchResults: PowerlineCalculationResult[] = [];
      const batchErrors: string[] = [];

      for (let i = 0; i < segments.length; i++) {
        if (aborted) break;

        const segment = segments[i];
        try {
          // Use immediate calculation for batch processing
          const distance = await calculatePowerDistance(segment.start, segment.end);
          const validation = await validatePowerlineConnection(segment.start, segment.end);

          batchResults.push({
            distance,
            isValid: validation.isValid,
            isLoading: false,
            error: null
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          batchErrors.push(`Segment ${i}: ${errorMessage}`);
          
          // Add fallback result
          const fallbackDistance = Math.sqrt(
            Math.pow(segment.end.x - segment.start.x, 2) + 
            Math.pow(segment.end.y - segment.start.y, 2) + 
            Math.pow(segment.end.z - segment.start.z, 2)
          );
          
          batchResults.push({
            distance: fallbackDistance,
            isValid: false,
            isLoading: false,
            error: errorMessage
          });
        }
      }

      if (!aborted) {
        setResults(batchResults);
        setErrors(batchErrors);
        setIsLoading(false);
      }
    };

    calculateBatch();

    return () => {
      aborted = true;
    };
  }, [segments, enabled]);

  return { results, isLoading, errors };
};
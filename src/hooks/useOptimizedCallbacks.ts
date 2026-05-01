// Performance optimization hook for event handler memoization
import { useCallback, useMemo, useRef } from 'react';

/**
 * Custom hook for creating memoized event handlers with proper dependency tracking
 * Reduces garbage collection pressure by preventing unnecessary function recreations
 */
export function useOptimizedCallbacks() {
  // Stable refs for consistent identity
  const stableRefs = useRef<Map<string, any>>(new Map());
  const callbackCache = useRef<Map<string, any>>(new Map());

  // Create a stable handler that doesn't change on re-renders
  const createStableHandler = useCallback(<T extends (...args: any[]) => any>(
    key: string,
    handler: T
  ): T => {
    if (!stableRefs.current.has(key)) {
      stableRefs.current.set(key, handler);
    }
    return stableRefs.current.get(key);
  }, []);

  // Get or create a cached callback
  const getCachedCallback = useCallback(<T extends (...args: any[]) => any>(
    key: string,
    factory: () => T
  ): T => {
    if (!callbackCache.current.has(key)) {
      callbackCache.current.set(key, factory());
    }
    return callbackCache.current.get(key);
  }, []);

  return {
    createStableHandler,
    getCachedCallback,
  };
}

/**
 * Hook for creating memoized callbacks with proper dependencies
 * This replaces the previous createMemoizedCallback function
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback as any, deps) as T;
}

/**
 * Hook for creating optimized event handlers
 * This replaces the previous createOptimizedHandlers function
 */
export function useOptimizedHandlers<T extends Record<string, any>>(
  handlers: T,
  deps: React.DependencyList = []
): T {
  return useMemo(() => {
    const optimized: Record<string, any> = {};
    
    Object.entries(handlers).forEach(([key, handler]) => {
      optimized[key] = handler;
    });
    
    return optimized as T;
  }, deps);
}

/**
 * Hook for optimizing component re-renders by memoizing expensive calculations
 */
export function useStableMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  key?: string
): T {
  const stableKey = key || 'default';
  const memoRef = useRef<Map<string, { value: T; deps: React.DependencyList }>>(new Map());
  
  return useMemo(() => {
    const cached = memoRef.current.get(stableKey);
    
    // Check if dependencies have changed
    if (cached && deps.length === cached.deps.length && 
        deps.every((dep, index) => Object.is(dep, cached.deps[index]))) {
      return cached.value;
    }
    
    // Compute new value and cache it
    const newValue = factory();
    memoRef.current.set(stableKey, { value: newValue, deps: [...deps] });
    
    return newValue;
  }, deps);
}

/**
 * Hook for creating debounced callbacks with proper cleanup
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay, ...deps]) as T;
}

/**
 * Hook for creating throttled callbacks with proper cleanup
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - (now - lastCallRef.current));
    }
  }, [callback, delay, ...deps]) as T;
}
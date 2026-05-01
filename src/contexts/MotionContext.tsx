// Performance-Optimized Motion Context
// Globally suspends framer-motion animations during canvas drag operations
// to eliminate script evaluation overhead and maintain 60fps performance

import React, { createContext, useContext, ReactNode } from 'react';

/**
 * Motion Context Interface
 * Provides animation state throughout the component tree
 */
interface MotionContextValue {
  /** Whether animations are currently enabled (disabled during canvas drag) */
  animationsEnabled: boolean;
}

/**
 * Default context value with animations enabled
 */
const defaultContextValue: MotionContextValue = {
  animationsEnabled: true
};

/**
 * Motion Context
 * Shared across all components to control animation behavior
 */
const MotionContext = createContext<MotionContextValue>(defaultContextValue);

/**
 * Motion Provider Props
 */
interface MotionProviderProps {
  children: ReactNode;
  /** Whether animations should be enabled (typically tied to inverse of isDragging state) */
  animationsEnabled: boolean;
}

/**
 * Motion Provider Component
 * Wraps the application to provide global animation control
 *
 * @example
 * ```tsx
 * <MotionProvider animationsEnabled={!isDraggingCanvas}>
 *   <App />
 * </MotionProvider>
 * ```
 */
export const MotionProvider: React.FC<MotionProviderProps> = ({
  children,
  animationsEnabled
}) => {
  const value: MotionContextValue = { animationsEnabled };

  return (
    <MotionContext.Provider value={value}>
      {children}
    </MotionContext.Provider>
  );
};

/**
 * Hook to access motion context
 * Returns whether animations are currently enabled
 *
 * @returns Motion context value with animationsEnabled flag
 *
 * @example
 * ```tsx
 * const { animationsEnabled } = useMotionContext();
 * const Component = animationsEnabled ? motion.div : 'div';
 * ```
 */
export const useMotionContext = (): MotionContextValue => {
  const context = useContext(MotionContext);

  if (!context) {
    // Gracefully fallback to default behavior if used outside provider
    return defaultContextValue;
  }

  return context;
};

/**
 * Export context for advanced use cases
 */
export { MotionContext };

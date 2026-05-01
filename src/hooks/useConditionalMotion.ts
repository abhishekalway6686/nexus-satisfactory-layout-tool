// Conditional Motion Hook
// Dynamically switches between framer-motion and regular HTML elements
// based on animation state to optimize performance during drag operations

import { motion, HTMLMotionProps, SVGMotionProps } from 'framer-motion';
import { useMotionContext } from '../contexts/MotionContext';

/**
 * Valid HTML element types that can be used with motion
 */
type HTMLMotionElements = keyof typeof motion;

/**
 * Conditional Motion Component Type
 * Returns either a motion component or a plain string element type
 */
type ConditionalMotionComponent<T extends HTMLMotionElements> =
  | typeof motion[T]
  | T;

/**
 * useConditionalMotion Hook
 *
 * Returns either a framer-motion component or a regular HTML element
 * based on whether animations are currently enabled.
 *
 * This allows components to seamlessly switch between animated and
 * non-animated modes without code changes.
 *
 * @param element - The HTML element type (e.g., 'div', 'button', 'span')
 * @returns Either motion[element] when animations are enabled, or the plain element type when disabled
 *
 * @example
 * ```tsx
 * const AnimatedDiv = useConditionalMotion('div');
 *
 * return (
 *   <AnimatedDiv
 *     initial={{ opacity: 0 }}
 *     animate={{ opacity: 1 }}
 *     className="my-component"
 *   >
 *     Content
 *   </AnimatedDiv>
 * );
 * ```
 *
 * When animations are disabled, this renders as:
 * ```tsx
 * <div className="my-component">Content</div>
 * ```
 *
 * When animations are enabled, this renders as:
 * ```tsx
 * <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-component">
 *   Content
 * </motion.div>
 * ```
 */
export function useConditionalMotion<T extends HTMLMotionElements>(
  element: T
): ConditionalMotionComponent<T> {
  const { animationsEnabled } = useMotionContext();

  // Return motion component when animations enabled, plain element when disabled
  return animationsEnabled
    ? motion[element]
    : element as ConditionalMotionComponent<T>;
}

/**
 * Hook variant that returns just the enabled state
 * Useful for conditional logic in render functions
 *
 * @returns boolean indicating if animations are enabled
 *
 * @example
 * ```tsx
 * const enabled = useAnimationsEnabled();
 *
 * return (
 *   <div>
 *     {enabled ? (
 *       <motion.div animate={{ scale: 1.1 }}>Animated</motion.div>
 *     ) : (
 *       <div>Static</div>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useAnimationsEnabled(): boolean {
  const { animationsEnabled } = useMotionContext();
  return animationsEnabled;
}

/**
 * Type-safe motion props helper
 * Filters out motion-specific props when animations are disabled
 *
 * @param props - Component props that may include motion props
 * @param enabled - Whether animations are enabled
 * @returns Filtered props (removes motion props when disabled)
 *
 * @example
 * ```tsx
 * const Component = (props: MyProps & HTMLMotionProps<'div'>) => {
 *   const enabled = useAnimationsEnabled();
 *   const safeProps = getMotionProps(props, enabled);
 *   const Element = useConditionalMotion('div');
 *
 *   return <Element {...safeProps} />;
 * };
 * ```
 */
export function getMotionProps<T extends object>(
  props: T,
  enabled: boolean
): Partial<T> {
  if (enabled) {
    return props;
  }

  // Filter out motion-specific props when animations disabled
  const motionPropKeys = [
    'initial', 'animate', 'exit', 'transition',
    'variants', 'whileHover', 'whileTap', 'whileFocus',
    'whileDrag', 'whileInView', 'drag', 'dragConstraints',
    'dragElastic', 'dragMomentum', 'onDrag', 'onDragStart',
    'onDragEnd', 'layout', 'layoutId'
  ];

  const filtered = { ...props };
  motionPropKeys.forEach(key => {
    delete (filtered as any)[key];
  });

  return filtered;
}

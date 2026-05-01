// Professional Animation System
import { Variants, TargetAndTransition } from 'framer-motion';

// Animation presets
export const animations = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  
  fadeInUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  
  fadeInDown: {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  
  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  
  scaleInBounce: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 500,
        damping: 15
      }
    },
    exit: { opacity: 0, scale: 0.8 }
  },
  
  // Slide animations
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
  },
  
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
  },
  
  // Stagger children
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  },
  
  staggerItem: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 }
  }
};

// Spring animations for natural feel
export const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
  mass: 0.5
};

// Smooth easing function
export const smoothEasing = [0.25, 0.1, 0.25, 1];

// Professional hover effects
export const hoverScale: TargetAndTransition = {
  scale: 1.02,
  transition: springTransition
};

export const hoverLift: TargetAndTransition = {
  y: -2,
  transition: springTransition
};

export const hoverGlow: TargetAndTransition = {
  boxShadow: '0 0 20px rgba(250, 149, 73, 0.4)',
  transition: { duration: 0.2 }
};

// Tap effects
export const tapScale: TargetAndTransition = {
  scale: 0.98,
  transition: { duration: 0.1 }
};

// Focus effects
export const focusRing: TargetAndTransition = {
  boxShadow: '0 0 0 3px rgba(250, 149, 73, 0.3)',
  transition: { duration: 0.2 }
};

// Loading states
export const pulseAnimation: Variants = {
  initial: { opacity: 0.3 },
  animate: {
    opacity: [0.3, 1, 0.3],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

export const shimmerAnimation: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

// Skeleton loading animation
export const skeletonAnimation: Variants = {
  initial: { 
    backgroundPosition: '-200% 0' 
  },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

// Success animation
export const successAnimation: Variants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: 'spring', duration: 1.5, bounce: 0 },
      opacity: { duration: 0.3 }
    }
  }
};

// Error shake animation
export const errorShake: Variants = {
  initial: { x: 0 },
  animate: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut'
    }
  }
};

// Tooltip animation
export const tooltipAnimation: Variants = {
  initial: { opacity: 0, y: 5, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.15,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0, 
    y: 2, 
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: 'easeIn'
    }
  }
};

// Context menu animation
export const contextMenuAnimation: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.15,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.96,
    transition: {
      duration: 0.1,
      ease: 'easeIn'
    }
  }
};

// Modal animation
export const modalAnimation: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

// Backdrop animation
export const backdropAnimation: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: 'easeIn'
    }
  }
};

// List item animation
export const listItemAnimation = {
  initial: { opacity: 0, x: -20 },
  animate: (custom: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: custom * 0.05,
      duration: 0.3,
      ease: smoothEasing
    }
  }),
  exit: { 
    opacity: 0, 
    x: -10,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

// Progress bar animation
export const progressAnimation: Variants = {
  initial: { scaleX: 0, originX: 0 },
  animate: (progress: number) => ({
    scaleX: progress,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20
    }
  })
};

// Notification animation
export const notificationAnimation: Variants = {
  initial: { opacity: 0, x: 100, scale: 0.9 },
  animate: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    x: 100, 
    scale: 0.9,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

// Accordion animation
export const accordionAnimation: Variants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { 
    height: 'auto', 
    opacity: 1,
    transition: {
      height: {
        type: 'spring',
        stiffness: 500,
        damping: 30
      },
      opacity: {
        duration: 0.2,
        ease: 'easeOut'
      }
    }
  }
};

// Tab animation
export const tabAnimation: Variants = {
  inactive: { opacity: 0.7 },
  active: { 
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  }
};

// Badge animation
export const badgeAnimation: Variants = {
  initial: { scale: 0 },
  animate: { 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 15,
      delay: 0.1
    }
  }
};

// Glow pulse animation
export const glowPulse: Variants = {
  initial: { 
    boxShadow: '0 0 0 0 rgba(250, 149, 73, 0)' 
  },
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(250, 149, 73, 0)',
      '0 0 0 10px rgba(250, 149, 73, 0.3)',
      '0 0 0 20px rgba(250, 149, 73, 0)'
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

// Create animation variants helper
export function createAnimationVariants(
  initialState: any,
  animateState: any,
  exitState?: any,
  transition?: any
): Variants {
  return {
    initial: initialState,
    animate: animateState,
    exit: exitState || initialState,
    transition: transition || { duration: 0.2 }
  };
}

// Gesture animation helpers
export const gestureAnimations = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  drag: { scale: 1.05 },
  focus: { boxShadow: '0 0 0 3px rgba(250, 149, 73, 0.3)' }
};

// Path drawing animation
export const drawPath = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay: 0.2, type: 'spring', duration: 1.5, bounce: 0 },
      opacity: { delay: 0.2, duration: 0.3 }
    }
  }
};

// Micro-interactions
export const microInteractions = {
  buttonClick: {
    scale: [1, 0.95, 1.05, 1],
    transition: { duration: 0.3 }
  },
  
  iconHover: {
    rotate: [0, -10, 10, 0],
    transition: { duration: 0.4 }
  },
  
  checkmark: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  ripple: {
    scale: [0, 4],
    opacity: [0.4, 0],
    transition: { duration: 0.6, ease: 'easeOut' }
  }
};
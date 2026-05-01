/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Optimize unused CSS purging
  safelist: [
    // Only include essential dynamic classes
    'glass-panel',
    'glass-panel-solid',
    'sci-fi-button',
    'sci-fi-input',
    'gradient-text',
    'glow-orange',
    'glow-blue',
    'glow-green',
    'glow-red',
  ],
  theme: {
    extend: {
      // Optimized screen breakpoints
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        // Add container query support
        '@container': {
          'xs': '320px',
          'sm': '480px',
          'md': '640px',
          'lg': '768px',
        },
      },
      
      // Essential width extensions only
      width: {
        '64': '16rem', // 256px for properties panel
        '18': '4.5rem',
        '22': '5.5rem',
      },
      
      // Essential height extensions
      maxHeight: {
        '60': '15rem', // 240px for mobile panels
      },
      
      // Optimized z-index scale
      zIndex: {
        '40': '40',
        '50': '50',
      },
      
      // Streamlined color palette
      colors: {
        'satisfactory': {
          'orange': '#fa9549',
          'orange-light': '#ffa866',
          'orange-dark': '#e8843c',
          'blue': '#5e668b',
          'blue-light': '#7481a8',
          'blue-dark': '#4a5270',
          'light': '#F4F4F4',
        }
      },
      
      // Optimized background images - reduce to essentials
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // Use CSS variable for hex pattern for better caching
        'hex-pattern': 'var(--hex-pattern)',
      },
      
      // Performance-optimized animations
      animation: {
        // Essential animations only
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        // GPU-optimized slide animations
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      
      // Optimized keyframes - use transform3d for GPU acceleration
      keyframes: {
        glow: {
          '0%': { 
            opacity: '0.8',
            boxShadow: '0 0 5px rgba(250, 149, 73, 0.3)'
          },
          '100%': { 
            opacity: '1',
            boxShadow: '0 0 20px rgba(250, 149, 73, 0.8), 0 0 30px rgba(250, 149, 73, 0.4)'
          },
        },
        slideInLeft: {
          '0%': { 
            transform: 'translate3d(-100%, 0, 0)', 
            opacity: '0' 
          },
          '100%': { 
            transform: 'translate3d(0, 0, 0)', 
            opacity: '1' 
          },
        },
        slideInRight: {
          '0%': { 
            transform: 'translate3d(100%, 0, 0)', 
            opacity: '0' 
          },
          '100%': { 
            transform: 'translate3d(0, 0, 0)', 
            opacity: '1' 
          },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { 
            transform: 'scale3d(0.9, 0.9, 1)', 
            opacity: '0' 
          },
          '100%': { 
            transform: 'scale3d(1, 1, 1)', 
            opacity: '1' 
          },
        },
      },
      
      // Optimized shadow system
      boxShadow: {
        // Pre-defined shadows for better performance
        'glow-orange': '0 0 20px rgba(250, 149, 73, 0.4)',
        'glow-blue': '0 0 20px rgba(94, 102, 139, 0.4)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.4)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        // Performance shadows
        'sm-perf': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'md-perf': '0 4px 16px rgba(0, 0, 0, 0.2)',
        'lg-perf': '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      
      // Optimized backdrop blur
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'performance': '8px',
      },
      
      // Essential font family extensions
      fontFamily: {
        'mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      
      // Essential spacing extensions
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      
      // Optimized border radius
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      
      // Performance-focused blur values
      blur: {
        'xs': '2px',
        'performance': '8px',
      },
      
      // Add container query support
      container: {
        center: true,
        padding: '1rem',
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
      },
      
      // Performance-focused transition timing
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'performance': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      // Essential transition durations
      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
        '400': '400ms',
      },
    },
  },
  
  // Optimized plugins with essential utilities only
  plugins: [
    function({ addUtilities, addComponents, theme }) {
      // Add essential component classes
      const components = {
        // Glass panel components
        '.glass-panel': {
          background: 'linear-gradient(145deg, rgba(94, 102, 139, 0.12) 0%, rgba(250, 149, 73, 0.08) 100%)',
          backdropFilter: 'blur(var(--blur-amount, 20px))',
          border: '1px solid rgba(250, 149, 73, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          contain: 'layout style',
        },
        
        '.glass-panel-solid': {
          background: 'linear-gradient(145deg, rgba(94, 102, 139, 0.95) 0%, rgba(250, 149, 73, 0.85) 100%)',
          border: '1px solid rgba(250, 149, 73, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          contain: 'layout style',
        },
        
        // Button components
        '.sci-fi-button': {
          background: 'linear-gradient(145deg, rgba(250, 149, 73, 0.15) 0%, rgba(94, 102, 139, 0.15) 100%)',
          border: '1px solid rgba(250, 149, 73, 0.3)',
          borderRadius: '8px',
          color: '#F4F4F4',
          transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1), border-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          transform: 'translateZ(0)',
          contain: 'layout style',
        },
        
        // Input components
        '.sci-fi-input': {
          background: 'rgba(94, 102, 139, 0.1)',
          border: '1px solid rgba(250, 149, 73, 0.3)',
          borderRadius: '8px',
          color: '#F4F4F4',
          padding: '12px 16px',
          transition: 'border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease',
          contain: 'layout style',
        },
        
        // Text components
        '.gradient-text': {
          background: 'linear-gradient(135deg, #fa9549 0%, #7481a8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          contain: 'layout style',
        },
      };
      
      // Add performance utilities
      const utilities = {
        // Performance utilities
        '.gpu-accelerated': {
          transform: 'translateZ(0)',
          willChange: 'transform',
        },
        
        '.contain-layout': {
          contain: 'layout',
        },
        
        '.contain-style': {
          contain: 'style',
        },
        
        '.contain-paint': {
          contain: 'paint',
        },
        
        '.contain-strict': {
          contain: 'strict',
        },
        
        // Focus utilities
        '.focus-ring': {
          '&:focus': {
            outline: 'none',
            boxShadow: '0 0 0 3px rgba(250, 149, 73, 0.3), 0 0 20px rgba(250, 149, 73, 0.2)',
          },
        },
        
        // Performance-optimized hover states
        '@media (hover: hover)': {
          '.hover\\:glow-orange:hover': {
            boxShadow: '0 0 20px rgba(250, 149, 73, 0.4), inset 0 0 10px rgba(250, 149, 73, 0.1)',
          },
          
          '.sci-fi-button:hover': {
            background: 'linear-gradient(145deg, rgba(250, 149, 73, 0.25) 0%, rgba(94, 102, 139, 0.25) 100%)',
            borderColor: 'rgba(250, 149, 73, 0.6)',
            boxShadow: '0 0 20px rgba(250, 149, 73, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            transform: 'translateY(-1px) translateZ(0)',
          },
        },
        
        // Mobile optimizations
        '@media (max-width: 768px)': {
          '.mobile-simple': {
            backdropFilter: 'blur(5px) !important',
            animation: 'none !important',
          },
          
          '.mobile-no-glow': {
            boxShadow: 'none !important',
          },
        },
        
        // Reduced motion support
        '@media (prefers-reduced-motion: reduce)': {
          '.motion-safe': {
            animation: 'none !important',
            transition: 'none !important',
          },
        },
        
        // Performance mode utilities
        '[data-performance="low"]': {
          '.adaptive-blur': {
            backdropFilter: 'none !important',
            background: 'rgba(94, 102, 139, 0.95) !important',
          },
          
          '.adaptive-animation': {
            animation: 'none !important',
          },
        },
        
        '[data-performance="medium"]': {
          '.adaptive-blur': {
            backdropFilter: 'blur(10px) !important',
          },
        },
      };
      
      addComponents(components);
      addUtilities(utilities);
    },
    
    // Container queries plugin (if you want container query support)
    function({ addUtilities }) {
      addUtilities({
        '@container (max-width: 480px)': {
          '.container-sm\\:text-sm': {
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
          },
          '.container-sm\\:p-2': {
            padding: '0.5rem',
          },
        },
        '@container (max-width: 640px)': {
          '.container-md\\:text-base': {
            fontSize: '1rem',
            lineHeight: '1.5rem',
          },
          '.container-md\\:p-4': {
            padding: '1rem',
          },
        },
      });
    },
  ],
  
  // Performance optimizations
  corePlugins: {
    // Disable unused core plugins for smaller bundle size
    preflight: true,
    container: true,
    accessibility: true,
    pointerEvents: true,
    visibility: true,
    position: true,
    inset: true,
    isolation: true,
    zIndex: true,
    order: true,
    gridColumn: true,
    gridColumnStart: true,
    gridColumnEnd: true,
    gridRow: true,
    gridRowStart: true,
    gridRowEnd: true,
    float: false, // Disabled - not used in modern layouts
    clear: false, // Disabled - not used in modern layouts
    margin: true,
    boxSizing: true,
    display: true,
    aspectRatio: true,
    height: true,
    maxHeight: true,
    minHeight: true,
    width: true,
    minWidth: true,
    maxWidth: true,
    flex: true,
    flexShrink: true,
    flexGrow: true,
    flexBasis: true,
    tableLayout: false, // Disabled - not used
    borderCollapse: false, // Disabled - not used
    borderSpacing: false, // Disabled - not used
    transformOrigin: true,
    transform: true,
    animation: true,
    cursor: true,
    touchAction: true,
    userSelect: true,
    resize: false, // Disabled - not used
    scrollSnapType: false, // Disabled - not used
    scrollSnapAlign: false, // Disabled - not used
    scrollSnapStop: false, // Disabled - not used
    scrollMargin: false, // Disabled - not used
    scrollPadding: false, // Disabled - not used
    listStylePosition: false, // Disabled - not used
    listStyleType: false, // Disabled - not used
    appearance: true,
    columns: false, // Disabled - not used
    breakBefore: false, // Disabled - not used
    breakInside: false, // Disabled - not used
    breakAfter: false, // Disabled - not used
    gridAutoColumns: true,
    gridAutoFlow: true,
    gridAutoRows: true,
    gridTemplateColumns: true,
    gridTemplateRows: true,
    flexDirection: true,
    flexWrap: true,
    placeContent: true,
    placeItems: true,
    alignContent: true,
    alignItems: true,
    justifyContent: true,
    justifyItems: true,
    gap: true,
    space: true,
    divideWidth: false, // Disabled - not used
    divideColor: false, // Disabled - not used
    divideStyle: false, // Disabled - not used
    divideOpacity: false, // Disabled - not used
    placeSelf: true,
    alignSelf: true,
    justifySelf: true,
    overflow: true,
    overscrollBehavior: true,
    scrollBehavior: true,
    textOverflow: true,
    whitespace: true,
    wordBreak: true,
    borderRadius: true,
    borderWidth: true,
    borderColor: true,
    borderStyle: true,
    borderOpacity: true,
    backgroundColor: true,
    backgroundOpacity: true,
    backgroundImage: true,
    gradientColorStops: true,
    backgroundSize: true,
    backgroundAttachment: true,
    backgroundClip: true,
    backgroundPosition: true,
    backgroundRepeat: true,
    backgroundOrigin: true,
    fill: false, // Disabled - SVG not heavily used
    stroke: false, // Disabled - SVG not heavily used
    strokeWidth: false, // Disabled - SVG not heavily used
    objectFit: true,
    objectPosition: true,
    padding: true,
    textAlign: true,
    textColor: true,
    textOpacity: true,
    textDecoration: true,
    textDecorationColor: true,
    textDecorationStyle: true,
    textDecorationThickness: true,
    textUnderlineOffset: true,
    textTransform: true,
    textIndent: false, // Disabled - not commonly used
    verticalAlign: true,
    fontFamily: true,
    fontSize: true,
    fontWeight: true,
    textRendering: true,
    letterSpacing: true,
    lineHeight: true,
    placeholderColor: true,
    placeholderOpacity: true,
    caretColor: true,
    accentColor: true,
    opacity: true,
    backgroundBlendMode: false, // Disabled - not used
    mixBlendMode: false, // Disabled - not used
    boxShadow: true,
    boxShadowColor: true,
    outlineWidth: true,
    outlineColor: true,
    outlineStyle: true,
    outlineOffset: true,
    ringWidth: true,
    ringColor: true,
    ringOpacity: true,
    ringOffsetWidth: true,
    ringOffsetColor: true,
    blur: true,
    brightness: false, // Disabled - not heavily used
    contrast: false, // Disabled - not heavily used
    dropShadow: true,
    grayscale: false, // Disabled - not used
    hueRotate: false, // Disabled - not used
    invert: false, // Disabled - not used
    saturate: false, // Disabled - not used
    sepia: false, // Disabled - not used
    filter: true,
    backdropBlur: true,
    backdropBrightness: false, // Disabled - not used
    backdropContrast: false, // Disabled - not used
    backdropGrayscale: false, // Disabled - not used
    backdropHueRotate: false, // Disabled - not used
    backdropInvert: false, // Disabled - not used
    backdropOpacity: true,
    backdropSaturate: false, // Disabled - not used
    backdropSepia: false, // Disabled - not used
    backdropFilter: true,
    transitionProperty: true,
    transitionDelay: true,
    transitionDuration: true,
    transitionTimingFunction: true,
    willChange: true,
    content: true,
    forcedColorAdjust: false, // Disabled - niche use case
  },
};
// Professional Theme System for Satisfactory Layout Tool
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Theme type definitions
export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface ThemeColors {
  primary: ColorScale & { DEFAULT: string; foreground: string };
  secondary: ColorScale & { DEFAULT: string; foreground: string };
  accent: ColorScale & { DEFAULT: string; foreground: string };
  neutral: ColorScale & { DEFAULT: string; foreground: string };
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
    overlay: string;
    inset: string;
  };
  foreground: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
    inverse: string;
  };
  border: {
    primary: string;
    secondary: string;
    tertiary: string;
    focus: string;
    error: string;
    success: string;
  };
  semantic: {
    error: { DEFAULT: string; light: string; dark: string; foreground: string };
    warning: { DEFAULT: string; light: string; dark: string; foreground: string };
    success: { DEFAULT: string; light: string; dark: string; foreground: string };
    info: { DEFAULT: string; light: string; dark: string; foreground: string };
  };
}

export interface ThemeSpacing {
  px: string;
  0: string;
  0.5: string;
  1: string;
  1.5: string;
  2: string;
  2.5: string;
  3: string;
  3.5: string;
  4: string;
  5: string;
  6: string;
  7: string;
  8: string;
  9: string;
  10: string;
  11: string;
  12: string;
  14: string;
  16: string;
  20: string;
  24: string;
  28: string;
  32: string;
  36: string;
  40: string;
  44: string;
  48: string;
  52: string;
  56: string;
  60: string;
  64: string;
  72: string;
  80: string;
  96: string;
}

export interface ThemeTypography {
  fonts: {
    sans: string;
    serif: string;
    mono: string;
    display: string;
  };
  sizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
    '6xl': string;
    '7xl': string;
    '8xl': string;
    '9xl': string;
  };
  weights: {
    thin: number;
    extralight: number;
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
    black: number;
  };
  lineHeights: {
    none: number;
    tight: number;
    snug: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
  letterSpacing: {
    tighter: string;
    tight: string;
    normal: string;
    wide: string;
    wider: string;
    widest: string;
  };
}

export interface ThemeEffects {
  shadows: {
    none: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    inner: string;
    'glow-sm': string;
    'glow-md': string;
    'glow-lg': string;
    'elevation-1': string;
    'elevation-2': string;
    'elevation-3': string;
    'elevation-4': string;
    'elevation-5': string;
  };
  blur: {
    none: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  borderRadius: {
    none: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    full: string;
  };
}

export interface ThemeAnimation {
  durations: {
    instant: string;
    fast: string;
    normal: string;
    slow: string;
    slower: string;
  };
  easings: {
    linear: string;
    in: string;
    out: string;
    inOut: string;
    spring: string;
    bounce: string;
    smooth: string;
  };
  transitions: {
    all: string;
    colors: string;
    opacity: string;
    shadow: string;
    transform: string;
    property: string;
  };
}

export interface Theme {
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  effects: ThemeEffects;
  animation: ThemeAnimation;
}

// Light theme definition
export const lightTheme: Theme = {
  name: 'Satisfactory Light',
  mode: 'light',
  colors: {
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#fa9549',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#431407',
      DEFAULT: '#fa9549',
      foreground: '#ffffff'
    },
    secondary: {
      50: '#f0f4ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#5e668b',
      600: '#4c5d8b',
      700: '#3f4e7a',
      800: '#334266',
      900: '#2a3654',
      950: '#1e2438',
      DEFAULT: '#5e668b',
      foreground: '#ffffff'
    },
    accent: {
      50: '#fef3c7',
      100: '#fee68a',
      200: '#fcd34d',
      300: '#fbbf24',
      400: '#f59e0b',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#451a03',
      DEFAULT: '#f97316',
      foreground: '#ffffff'
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
      DEFAULT: '#737373',
      foreground: '#ffffff'
    },
    background: {
      primary: '#ffffff',
      secondary: '#fafafa',
      tertiary: '#f5f5f5',
      elevated: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
      inset: '#f9fafb'
    },
    foreground: {
      primary: '#171717',
      secondary: '#525252',
      tertiary: '#737373',
      disabled: '#a3a3a3',
      inverse: '#ffffff'
    },
    border: {
      primary: 'rgba(0, 0, 0, 0.1)',
      secondary: 'rgba(0, 0, 0, 0.06)',
      tertiary: 'rgba(0, 0, 0, 0.03)',
      focus: '#fa9549',
      error: '#ef4444',
      success: '#10b981'
    },
    semantic: {
      error: { 
        DEFAULT: '#ef4444', 
        light: '#fca5a5', 
        dark: '#991b1b',
        foreground: '#ffffff'
      },
      warning: { 
        DEFAULT: '#f59e0b', 
        light: '#fcd34d', 
        dark: '#92400e',
        foreground: '#ffffff'
      },
      success: { 
        DEFAULT: '#10b981', 
        light: '#6ee7b7', 
        dark: '#064e3b',
        foreground: '#ffffff'
      },
      info: { 
        DEFAULT: '#3b82f6', 
        light: '#93c5fd', 
        dark: '#1e3a8a',
        foreground: '#ffffff'
      }
    }
  },
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    11: '2.75rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem'
  },
  typography: {
    fonts: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
      mono: 'JetBrains Mono, SF Mono, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      display: 'Orbitron, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    },
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
      '7xl': '4.5rem',
      '8xl': '6rem',
      '9xl': '8rem'
    },
    weights: {
      thin: 100,
      extralight: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900
    },
    lineHeights: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    }
  },
  effects: {
    shadows: {
      none: 'none',
      xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      'glow-sm': '0 0 10px rgba(250, 149, 73, 0.3)',
      'glow-md': '0 0 20px rgba(250, 149, 73, 0.4)',
      'glow-lg': '0 0 40px rgba(250, 149, 73, 0.5)',
      'elevation-1': '0 2px 4px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.04)',
      'elevation-2': '0 4px 8px rgba(0, 0, 0, 0.08), 0 0 2px rgba(0, 0, 0, 0.04)',
      'elevation-3': '0 8px 16px rgba(0, 0, 0, 0.1), 0 0 4px rgba(0, 0, 0, 0.04)',
      'elevation-4': '0 16px 32px rgba(0, 0, 0, 0.12), 0 0 8px rgba(0, 0, 0, 0.04)',
      'elevation-5': '0 24px 48px rgba(0, 0, 0, 0.14), 0 0 12px rgba(0, 0, 0, 0.04)'
    },
    blur: {
      none: '0',
      xs: '2px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      '2xl': '24px',
      '3xl': '40px'
    },
    borderRadius: {
      none: '0',
      xs: '0.125rem',
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      '3xl': '1.5rem',
      full: '9999px'
    }
  },
  animation: {
    durations: {
      instant: '0ms',
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms'
    },
    easings: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)'
    },
    transitions: {
      all: 'all var(--duration-normal) var(--easing-smooth)',
      colors: 'background-color var(--duration-normal) var(--easing-smooth), border-color var(--duration-normal) var(--easing-smooth), color var(--duration-normal) var(--easing-smooth)',
      opacity: 'opacity var(--duration-normal) var(--easing-smooth)',
      shadow: 'box-shadow var(--duration-normal) var(--easing-smooth)',
      transform: 'transform var(--duration-normal) var(--easing-smooth)',
      property: 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform'
    }
  }
};

// Dark theme definition
export const darkTheme: Theme = {
  ...lightTheme,
  name: 'Satisfactory Dark',
  mode: 'dark',
  colors: {
    ...lightTheme.colors,
    background: {
      primary: '#0a0b0d',
      secondary: '#0f1114',
      tertiary: '#1a1d24',
      elevated: '#1e2128',
      overlay: 'rgba(0, 0, 0, 0.7)',
      inset: '#050607'
    },
    foreground: {
      primary: '#f5f5f5',
      secondary: '#d4d4d4',
      tertiary: '#a3a3a3',
      disabled: '#525252',
      inverse: '#171717'
    },
    border: {
      primary: 'rgba(255, 255, 255, 0.1)',
      secondary: 'rgba(255, 255, 255, 0.06)',
      tertiary: 'rgba(255, 255, 255, 0.03)',
      focus: '#fa9549',
      error: '#ef4444',
      success: '#10b981'
    }
  },
  effects: {
    ...lightTheme.effects,
    shadows: {
      ...lightTheme.effects.shadows,
      xs: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      sm: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
      'elevation-1': '0 2px 4px rgba(0, 0, 0, 0.2), 0 0 1px rgba(0, 0, 0, 0.1)',
      'elevation-2': '0 4px 8px rgba(0, 0, 0, 0.3), 0 0 2px rgba(0, 0, 0, 0.15)',
      'elevation-3': '0 8px 16px rgba(0, 0, 0, 0.4), 0 0 4px rgba(0, 0, 0, 0.2)',
      'elevation-4': '0 16px 32px rgba(0, 0, 0, 0.5), 0 0 8px rgba(0, 0, 0, 0.25)',
      'elevation-5': '0 24px 48px rgba(0, 0, 0, 0.6), 0 0 12px rgba(0, 0, 0, 0.3)'
    }
  }
};

// High contrast theme for accessibility
export const highContrastTheme: Theme = {
  ...darkTheme,
  name: 'High Contrast',
  mode: 'dark',
  colors: {
    ...darkTheme.colors,
    primary: {
      ...darkTheme.colors.primary,
      DEFAULT: '#ffb366',
      500: '#ffb366'
    },
    background: {
      primary: '#000000',
      secondary: '#0a0a0a',
      tertiary: '#141414',
      elevated: '#1a1a1a',
      overlay: 'rgba(0, 0, 0, 0.9)',
      inset: '#000000'
    },
    foreground: {
      primary: '#ffffff',
      secondary: '#f0f0f0',
      tertiary: '#e0e0e0',
      disabled: '#808080',
      inverse: '#000000'
    },
    border: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      tertiary: 'rgba(255, 255, 255, 0.5)',
      focus: '#ffb366',
      error: '#ff6b6b',
      success: '#51cf66'
    }
  }
};

// Theme store
interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'high-contrast') => void;
  customColors: Partial<ThemeColors>;
  setCustomColors: (colors: Partial<ThemeColors>) => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: darkTheme,
      
      setTheme: (theme) => {
        set({ theme });
        applyThemeToDocument(theme);
      },
      
      toggleTheme: () => {
        const current = get().theme;
        const newTheme = current.mode === 'light' ? darkTheme : lightTheme;
        set({ theme: newTheme });
        applyThemeToDocument(newTheme);
      },
      
      setThemeMode: (mode) => {
        let newTheme: Theme;
        switch (mode) {
          case 'light':
            newTheme = lightTheme;
            break;
          case 'dark':
            newTheme = darkTheme;
            break;
          case 'high-contrast':
            newTheme = highContrastTheme;
            break;
          default:
            newTheme = darkTheme;
        }
        set({ theme: newTheme });
        applyThemeToDocument(newTheme);
      },
      
      customColors: {},
      
      setCustomColors: (colors) => {
        const current = get().theme;
        const customTheme = {
          ...current,
          colors: {
            ...current.colors,
            ...colors
          }
        };
        set({ theme: customTheme, customColors: colors });
        applyThemeToDocument(customTheme);
      },
      
      resetTheme: () => {
        const defaultTheme = darkTheme;
        set({ theme: defaultTheme, customColors: {} });
        applyThemeToDocument(defaultTheme);
      }
    }),
    {
      name: 'satisfactory-theme',
      partialize: (state) => ({
        theme: state.theme,
        customColors: state.customColors
      })
    }
  )
);

// Apply theme to document
function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  
  // Set theme mode
  root.setAttribute('data-theme', theme.mode);
  
  // Apply CSS variables
  const cssVars: Record<string, string> = {
    // Colors
    '--color-primary': theme.colors.primary.DEFAULT,
    '--color-primary-foreground': theme.colors.primary.foreground,
    '--color-secondary': theme.colors.secondary.DEFAULT,
    '--color-secondary-foreground': theme.colors.secondary.foreground,
    '--color-accent': theme.colors.accent.DEFAULT,
    '--color-accent-foreground': theme.colors.accent.foreground,
    
    // Backgrounds
    '--bg-primary': theme.colors.background.primary,
    '--bg-secondary': theme.colors.background.secondary,
    '--bg-tertiary': theme.colors.background.tertiary,
    '--bg-elevated': theme.colors.background.elevated,
    '--bg-overlay': theme.colors.background.overlay,
    '--bg-inset': theme.colors.background.inset,
    
    // Foregrounds
    '--fg-primary': theme.colors.foreground.primary,
    '--fg-secondary': theme.colors.foreground.secondary,
    '--fg-tertiary': theme.colors.foreground.tertiary,
    '--fg-disabled': theme.colors.foreground.disabled,
    '--fg-inverse': theme.colors.foreground.inverse,
    
    // Borders
    '--border-primary': theme.colors.border.primary,
    '--border-secondary': theme.colors.border.secondary,
    '--border-tertiary': theme.colors.border.tertiary,
    '--border-focus': theme.colors.border.focus,
    '--border-error': theme.colors.border.error,
    '--border-success': theme.colors.border.success,
    
    // Semantic colors
    '--color-error': theme.colors.semantic.error.DEFAULT,
    '--color-warning': theme.colors.semantic.warning.DEFAULT,
    '--color-success': theme.colors.semantic.success.DEFAULT,
    '--color-info': theme.colors.semantic.info.DEFAULT,
    
    // Typography
    '--font-sans': theme.typography.fonts.sans,
    '--font-serif': theme.typography.fonts.serif,
    '--font-mono': theme.typography.fonts.mono,
    '--font-display': theme.typography.fonts.display,
    
    // Animation
    '--duration-instant': theme.animation.durations.instant,
    '--duration-fast': theme.animation.durations.fast,
    '--duration-normal': theme.animation.durations.normal,
    '--duration-slow': theme.animation.durations.slow,
    '--duration-slower': theme.animation.durations.slower,
    
    '--easing-linear': theme.animation.easings.linear,
    '--easing-in': theme.animation.easings.in,
    '--easing-out': theme.animation.easings.out,
    '--easing-in-out': theme.animation.easings.inOut,
    '--easing-spring': theme.animation.easings.spring,
    '--easing-bounce': theme.animation.easings.bounce,
    '--easing-smooth': theme.animation.easings.smooth,
    
    // Effects
    '--shadow-xs': theme.effects.shadows.xs,
    '--shadow-sm': theme.effects.shadows.sm,
    '--shadow-md': theme.effects.shadows.md,
    '--shadow-lg': theme.effects.shadows.lg,
    '--shadow-xl': theme.effects.shadows.xl,
    '--shadow-2xl': theme.effects.shadows['2xl'],
    '--shadow-inner': theme.effects.shadows.inner,
    '--shadow-glow-sm': theme.effects.shadows['glow-sm'],
    '--shadow-glow-md': theme.effects.shadows['glow-md'],
    '--shadow-glow-lg': theme.effects.shadows['glow-lg'],
    
    // Border radius
    '--radius-none': theme.effects.borderRadius.none,
    '--radius-xs': theme.effects.borderRadius.xs,
    '--radius-sm': theme.effects.borderRadius.sm,
    '--radius-md': theme.effects.borderRadius.md,
    '--radius-lg': theme.effects.borderRadius.lg,
    '--radius-xl': theme.effects.borderRadius.xl,
    '--radius-2xl': theme.effects.borderRadius['2xl'],
    '--radius-3xl': theme.effects.borderRadius['3xl'],
    '--radius-full': theme.effects.borderRadius.full,
    
    // Blur
    '--blur-none': theme.effects.blur.none,
    '--blur-xs': theme.effects.blur.xs,
    '--blur-sm': theme.effects.blur.sm,
    '--blur-md': theme.effects.blur.md,
    '--blur-lg': theme.effects.blur.lg,
    '--blur-xl': theme.effects.blur.xl,
    '--blur-2xl': theme.effects.blur['2xl'],
    '--blur-3xl': theme.effects.blur['3xl']
  };
  
  // Apply all CSS variables
  Object.entries(cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  // Apply color scale variables
  Object.entries(theme.colors.primary).forEach(([key, value]) => {
    if (key !== 'DEFAULT' && key !== 'foreground') {
      root.style.setProperty(`--color-primary-${key}`, value);
    }
  });
  
  Object.entries(theme.colors.secondary).forEach(([key, value]) => {
    if (key !== 'DEFAULT' && key !== 'foreground') {
      root.style.setProperty(`--color-secondary-${key}`, value);
    }
  });
  
  Object.entries(theme.colors.neutral).forEach(([key, value]) => {
    if (key !== 'DEFAULT' && key !== 'foreground') {
      root.style.setProperty(`--color-neutral-${key}`, value);
    }
  });
  
  // Apply spacing variables
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });
  
  // Apply typography size variables
  Object.entries(theme.typography.sizes).forEach(([key, value]) => {
    root.style.setProperty(`--text-${key}`, value);
  });
  
  // Update meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme.colors.background.primary);
  }
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  const store = useThemeStore.getState();
  applyThemeToDocument(store.theme);
}
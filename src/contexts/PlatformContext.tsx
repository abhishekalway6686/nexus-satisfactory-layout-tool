import React, { createContext, useContext, useEffect, useState } from 'react';
import { getPlatformInfo, Platform, PlatformFeatures, PlatformKeys, PlatformMeasurements } from '../utils/platformDetection';

interface PlatformContextValue {
  platform: Platform;
  isHighDPI: boolean;
  dpr: number;
  features: {
    supportsBackdropFilter: boolean;
    supportsVibrancy: boolean;
    supportsNativeMenuBar: boolean;
    supportsGPUAcceleration: boolean;
  };
  keys: {
    modifierKey: string;
    deleteKey: string;
    optionKey: string;
  };
  measurements: {
    titleBarHeight: number;
    scrollbarWidth: number;
    contextMenuOffset: { x: number; y: number };
  };
}

const defaultContext: PlatformContextValue = {
  platform: 'web',
  isHighDPI: false,
  dpr: 1,
  features: {
    supportsBackdropFilter: false,
    supportsVibrancy: false,
    supportsNativeMenuBar: false,
    supportsGPUAcceleration: false,
  },
  keys: {
    modifierKey: 'ctrl',
    deleteKey: 'del',
    optionKey: 'alt',
  },
  measurements: {
    titleBarHeight: 0,
    scrollbarWidth: 15,
    contextMenuOffset: { x: 0, y: 0 },
  },
};

const PlatformContext = createContext<PlatformContextValue>(defaultContext);

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
};

interface PlatformProviderProps {
  children: React.ReactNode;
}

export const PlatformProvider: React.FC<PlatformProviderProps> = ({ children }) => {
  const [platformContext, setPlatformContext] = useState<PlatformContextValue>(defaultContext);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const initializePlatform = async () => {
      const info = await getPlatformInfo();
      
      const context: PlatformContextValue = {
        platform: info.platform,
        isHighDPI: info.isHighDPI,
        dpr: info.dpr,
        features: {
          supportsBackdropFilter: await PlatformFeatures.supportsBackdropFilter(),
          supportsVibrancy: await PlatformFeatures.supportsVibrancy(),
          supportsNativeMenuBar: await PlatformFeatures.supportsNativeMenuBar(),
          supportsGPUAcceleration: await PlatformFeatures.supportsGPUAcceleration(),
        },
        keys: {
          modifierKey: await PlatformKeys.modifierKey(),
          deleteKey: await PlatformKeys.deleteKey(),
          optionKey: await PlatformKeys.optionKey(),
        },
        measurements: {
          titleBarHeight: await PlatformMeasurements.getTitleBarHeight(),
          scrollbarWidth: await PlatformMeasurements.getScrollbarWidth(),
          contextMenuOffset: await PlatformMeasurements.getContextMenuOffset(),
        },
      };

      setPlatformContext(context);
      setLoaded(true);

      // Apply platform data attributes to document
      document.documentElement.setAttribute('data-platform', info.platform);
      document.documentElement.setAttribute('data-high-dpi', String(info.isHighDPI));
      document.documentElement.setAttribute('data-dpr', String(info.dpr));
    };

    initializePlatform();

    // Listen for DPR changes
    const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const handleDPRChange = () => {
      initializePlatform();
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDPRChange);
    } else {
      mediaQuery.addListener(handleDPRChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDPRChange);
      } else {
        mediaQuery.removeListener(handleDPRChange);
      }
    };
  }, []);

  if (!loaded) {
    return null; // Or a loading spinner
  }

  return (
    <PlatformContext.Provider value={platformContext}>
      {children}
    </PlatformContext.Provider>
  );
};

// Platform-aware hooks
export const usePlatformShortcut = (baseKey: string): string => {
  const { keys } = usePlatform();
  
  return baseKey
    .replace(/mod\+/gi, `${keys.modifierKey}+`)
    .replace(/opt\+/gi, `${keys.optionKey}+`)
    .replace(/del/gi, keys.deleteKey);
};

export const usePlatformStyles = () => {
  const { platform, isHighDPI } = usePlatform();
  
  return {
    getScrollbarStyles: () => {
      if (platform === 'macos') {
        return {
          scrollbarWidth: 'none' as const,
          msOverflowStyle: 'none' as const,
          WebkitScrollbar: { display: 'none' },
        };
      }
      return {};
    },
    
    getFocusStyles: () => {
      const focusColors = {
        windows: '#0078d4',
        macos: '#007aff',
        linux: '#ff7700',
        web: '#0066cc',
      };
      
      return {
        outline: `2px solid ${focusColors[platform]}`,
        outlineOffset: '2px',
      };
    },
    
    getElevationStyles: (level: number = 1) => {
      const shadows = {
        windows: [
          'none',
          '0 2px 4px rgba(0, 0, 0, 0.1)',
          '0 4px 8px rgba(0, 0, 0, 0.15)',
          '0 8px 16px rgba(0, 0, 0, 0.2)',
        ],
        macos: [
          'none',
          '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)',
          '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
          '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
        ],
        linux: [
          'none',
          '0 3px 5px rgba(0, 0, 0, 0.15)',
          '0 6px 10px rgba(0, 0, 0, 0.2)',
          '0 12px 20px rgba(0, 0, 0, 0.25)',
        ],
        web: [
          'none',
          '0 2px 4px rgba(0, 0, 0, 0.1)',
          '0 4px 8px rgba(0, 0, 0, 0.15)',
          '0 8px 16px rgba(0, 0, 0, 0.2)',
        ],
      };
      
      const levelIndex = Math.min(Math.max(level, 0), 3);
      return {
        boxShadow: shadows[platform][levelIndex],
      };
    },
    
    getAnimationDuration: (base: number) => {
      // Platform-specific animation speed preferences
      const multipliers = {
        windows: 1.0,
        macos: 1.2, // Slightly slower, more elegant
        linux: 0.9, // Slightly faster
        web: 1.0,
      };
      
      return base * multipliers[platform];
    },
  };
};
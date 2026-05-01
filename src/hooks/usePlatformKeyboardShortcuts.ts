import { useEffect, useCallback } from 'react';
import { usePlatform } from '../contexts/PlatformContext';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

export interface PlatformShortcut {
  keys: string[];
  handler: (event: KeyboardEvent) => void;
  description: string;
  platforms?: Array<'windows' | 'macos' | 'linux' | 'web'>;
}

export const usePlatformKeyboardShortcuts = (shortcuts: PlatformShortcut[]) => {
  const { platform, keys } = usePlatform();
  const baseRegisterShortcut = useKeyboardShortcuts();

  // Convert platform-agnostic keys to platform-specific
  const convertKeys = useCallback((keyCombo: string): string => {
    return keyCombo
      .replace(/mod\+/gi, `${keys.modifierKey}+`)
      .replace(/opt\+/gi, `${keys.optionKey}+`)
      .replace(/del/gi, keys.deleteKey);
  }, [keys]);

  useEffect(() => {
    const activeShortcuts = shortcuts.filter(shortcut => {
      // Check if shortcut is applicable to current platform
      if (shortcut.platforms && !shortcut.platforms.includes(platform)) {
        return false;
      }
      return true;
    });

    // Register each shortcut with platform-specific keys
    const unregisterCallbacks = activeShortcuts.map(shortcut => {
      const platformKeys = shortcut.keys.map(convertKeys);
      
      // Create a wrapped handler that checks platform-specific conditions
      const wrappedHandler = (event: KeyboardEvent) => {
        // Platform-specific behavior adjustments
        if (platform === 'macos') {
          // On macOS, Cmd+Q is system quit, don't override
          if (event.metaKey && event.key === 'q') {
            return;
          }
        }

        // Call the original handler
        shortcut.handler(event);
      };

      // Register all key combinations for this shortcut
      return platformKeys.map(keyCombo => 
        baseRegisterShortcut(keyCombo, wrappedHandler)
      );
    }).flat();

    // Cleanup
    return () => {
      unregisterCallbacks.forEach(unregister => unregister());
    };
  }, [shortcuts, platform, convertKeys, baseRegisterShortcut]);
};

// Common cross-platform shortcuts
export const commonShortcuts: PlatformShortcut[] = [
  // File operations
  {
    keys: ['mod+n'],
    handler: () => console.log('New file'),
    description: 'New layout',
  },
  {
    keys: ['mod+o'],
    handler: () => console.log('Open file'),
    description: 'Open layout',
  },
  {
    keys: ['mod+s'],
    handler: () => console.log('Save file'),
    description: 'Save layout',
  },
  {
    keys: ['mod+shift+s'],
    handler: () => console.log('Save as'),
    description: 'Save layout as',
  },
  
  // Edit operations
  {
    keys: ['mod+z'],
    handler: () => console.log('Undo'),
    description: 'Undo',
  },
  {
    keys: ['mod+shift+z', 'mod+y'],
    handler: () => console.log('Redo'),
    description: 'Redo',
    platforms: ['windows', 'linux', 'web'],
  },
  {
    keys: ['mod+shift+z'],
    handler: () => console.log('Redo'),
    description: 'Redo',
    platforms: ['macos'],
  },
  
  // Selection
  {
    keys: ['mod+a'],
    handler: () => console.log('Select all'),
    description: 'Select all',
  },
  {
    keys: ['mod+d'],
    handler: () => console.log('Duplicate'),
    description: 'Duplicate selection',
  },
  {
    keys: ['del', 'backspace'],
    handler: () => console.log('Delete'),
    description: 'Delete selection',
  },
  
  // View operations
  {
    keys: ['mod+0'],
    handler: () => console.log('Reset zoom'),
    description: 'Reset zoom',
  },
  {
    keys: ['mod+=', 'mod+plus'],
    handler: () => console.log('Zoom in'),
    description: 'Zoom in',
  },
  {
    keys: ['mod+-', 'mod+minus'],
    handler: () => console.log('Zoom out'),
    description: 'Zoom out',
  },
  
  // Tools
  {
    keys: ['v'],
    handler: () => console.log('Select tool'),
    description: 'Select tool',
  },
  {
    keys: ['b'],
    handler: () => console.log('Building tool'),
    description: 'Building tool',
  },
  {
    keys: ['c'],
    handler: () => console.log('Conveyor tool'),
    description: 'Conveyor tool',
  },
  {
    keys: ['p'],
    handler: () => console.log('Pipe tool'),
    description: 'Pipe tool',
  },
  {
    keys: ['r'],
    handler: () => console.log('Railway tool'),
    description: 'Railway tool',
  },
  
  // Navigation
  {
    keys: ['space'],
    handler: () => console.log('Pan mode'),
    description: 'Pan mode (hold)',
  },
  {
    keys: ['f'],
    handler: () => console.log('Fit to screen'),
    description: 'Fit content to screen',
  },
  
  // Platform-specific
  {
    keys: ['f11'],
    handler: () => console.log('Toggle fullscreen'),
    description: 'Toggle fullscreen',
    platforms: ['windows', 'linux'],
  },
  {
    keys: ['mod+ctrl+f'],
    handler: () => console.log('Toggle fullscreen'),
    description: 'Toggle fullscreen',
    platforms: ['macos'],
  },
];

// Get human-readable shortcut labels
export const getShortcutLabel = (keys: string, platform: string): string => {
  const isMac = platform === 'macos';
  
  return keys
    .replace(/mod\+/gi, isMac ? '⌘' : 'Ctrl+')
    .replace(/opt\+/gi, isMac ? '⌥' : 'Alt+')
    .replace(/shift\+/gi, isMac ? '⇧' : 'Shift+')
    .replace(/ctrl\+/gi, isMac ? '⌃' : 'Ctrl+')
    .replace(/del/gi, isMac ? '⌫' : 'Del')
    .replace(/backspace/gi, isMac ? '⌫' : 'Backspace')
    .replace(/enter/gi, isMac ? '⏎' : 'Enter')
    .replace(/space/gi, isMac ? 'Space' : 'Space')
    .replace(/plus/gi, '+')
    .replace(/minus/gi, '-')
    .toUpperCase();
};
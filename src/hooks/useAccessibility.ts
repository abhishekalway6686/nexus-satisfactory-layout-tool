import { useEffect, useRef, useCallback, useState } from 'react';
import { create } from 'zustand';

// Accessibility store
interface AccessibilityStore {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardNavigationActive: boolean;
  announcements: string[];
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setLargeText: (enabled: boolean) => void;
  setScreenReaderMode: (enabled: boolean) => void;
  setKeyboardNavigationActive: (active: boolean) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

export const useAccessibilityStore = create<AccessibilityStore>((set) => ({
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  screenReaderMode: false,
  keyboardNavigationActive: false,
  announcements: [],
  
  setHighContrast: (enabled) => {
    set({ highContrast: enabled });
    document.documentElement.classList.toggle('high-contrast', enabled);
    localStorage.setItem('highContrast', String(enabled));
  },
  
  setReducedMotion: (enabled) => {
    set({ reducedMotion: enabled });
    document.documentElement.classList.toggle('reduce-motion', enabled);
    localStorage.setItem('reducedMotion', String(enabled));
  },
  
  setLargeText: (enabled) => {
    set({ largeText: enabled });
    document.documentElement.classList.toggle('large-text', enabled);
    localStorage.setItem('largeText', String(enabled));
  },
  
  setScreenReaderMode: (enabled) => {
    set({ screenReaderMode: enabled });
    document.documentElement.classList.toggle('screen-reader', enabled);
    localStorage.setItem('screenReaderMode', String(enabled));
  },
  
  setKeyboardNavigationActive: (active) => {
    set({ keyboardNavigationActive: active });
    document.documentElement.classList.toggle('keyboard-nav', active);
  },
  
  announce: (message, priority = 'polite') => {
    set((state) => ({ announcements: [...state.announcements, message] }));
    
    // Create live region announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
      set((state) => ({
        announcements: state.announcements.filter((a) => a !== message)
      }));
    }, 1000);
  }
}));

// Initialize accessibility preferences
export function initializeAccessibility() {
  const store = useAccessibilityStore.getState();
  
  // Load saved preferences
  const highContrast = localStorage.getItem('highContrast') === 'true';
  const reducedMotion = localStorage.getItem('reducedMotion') === 'true';
  const largeText = localStorage.getItem('largeText') === 'true';
  const screenReaderMode = localStorage.getItem('screenReaderMode') === 'true';
  
  // Apply preferences
  if (highContrast) store.setHighContrast(true);
  if (reducedMotion) store.setReducedMotion(true);
  if (largeText) store.setLargeText(true);
  if (screenReaderMode) store.setScreenReaderMode(true);
  
  // Check system preferences
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
  
  if (prefersReducedMotion && !localStorage.getItem('reducedMotion')) {
    store.setReducedMotion(true);
  }
  
  if (prefersHighContrast && !localStorage.getItem('highContrast')) {
    store.setHighContrast(true);
  }
  
  // Detect keyboard navigation
  let lastInteraction: 'mouse' | 'keyboard' = 'mouse';
  
  document.addEventListener('mousedown', () => {
    lastInteraction = 'mouse';
    store.setKeyboardNavigationActive(false);
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      lastInteraction = 'keyboard';
      store.setKeyboardNavigationActive(true);
    }
  });
}

// Focus trap hook
export function useFocusTrap(active = true) {
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (!active || !ref.current) return;
    
    const element = ref.current;
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input[type="text"]:not([disabled])',
      'input[type="radio"]:not([disabled])',
      'input[type="checkbox"]:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    const focusableElements = element.querySelectorAll(focusableSelector);
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // Focus first element
    firstFocusable?.focus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };
    
    element.addEventListener('keydown', handleKeyDown);
    
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);
  
  return ref;
}

// Skip navigation hook
export function useSkipNavigation() {
  const skipToMain = useCallback(() => {
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main) {
      (main as HTMLElement).tabIndex = -1;
      (main as HTMLElement).focus();
    }
  }, []);
  
  const skipToNav = useCallback(() => {
    const nav = document.querySelector('nav') || document.querySelector('[role="navigation"]');
    if (nav) {
      (nav as HTMLElement).tabIndex = -1;
      (nav as HTMLElement).focus();
    }
  }, []);
  
  return { skipToMain, skipToNav };
}

// Live announcer hook
export function useAnnounce() {
  const announce = useAccessibilityStore((state) => state.announce);
  return announce;
}

// Focus management hook
export function useFocusManagement() {
  const previousFocus = useRef<HTMLElement | null>(null);
  
  const saveFocus = useCallback(() => {
    previousFocus.current = document.activeElement as HTMLElement;
  }, []);
  
  const restoreFocus = useCallback(() => {
    if (previousFocus.current) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  }, []);
  
  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
    }
  }, []);
  
  return { saveFocus, restoreFocus, focusElement };
}

// Keyboard shortcuts hook
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    preventDefault?: boolean;
  }
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { ctrl = false, shift = false, alt = false, preventDefault = true } = options || {};
      
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        e.ctrlKey === ctrl &&
        e.shiftKey === shift &&
        e.altKey === alt
      ) {
        if (preventDefault) {
          e.preventDefault();
        }
        callback();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, callback, options]);
}

// ARIA live region hook
export function useAriaLive() {
  const ref = useRef<HTMLDivElement>(null);
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (ref.current) {
      ref.current.setAttribute('aria-live', priority);
      ref.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (ref.current) {
          ref.current.textContent = '';
        }
      }, 1000);
    }
  }, []);
  
  return { ref, announce };
}

// Focus visible hook
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const handleFocus = () => {
      const keyboardNavActive = useAccessibilityStore.getState().keyboardNavigationActive;
      setIsFocusVisible(keyboardNavActive);
    };
    
    const handleBlur = () => {
      setIsFocusVisible(false);
    };
    
    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);
    
    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, []);
  
  return { ref, isFocusVisible };
}

// Roving tabindex hook
export function useRovingTabIndex(items: HTMLElement[]) {
  const [activeIndex, setActiveIndex] = useState(0);
  
  useEffect(() => {
    items.forEach((item, index) => {
      item.tabIndex = index === activeIndex ? 0 : -1;
    });
  }, [items, activeIndex]);
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key;
    const currentIndex = items.findIndex((item) => item === document.activeElement);
    
    let nextIndex = currentIndex;
    
    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }
    
    setActiveIndex(nextIndex);
    items[nextIndex]?.focus();
  }, [items]);
  
  return { activeIndex, handleKeyDown };
}
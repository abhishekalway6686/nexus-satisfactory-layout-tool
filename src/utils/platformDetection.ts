// Platform detection utilities
import { platform, arch } from '@tauri-apps/plugin-os';
import { isTauriEnvironment } from '../tauri/environment';

export type Platform = 'windows' | 'macos' | 'linux' | 'web';
export type Architecture = 'x64' | 'arm64' | 'x86' | 'unknown';

interface PlatformInfo {
  platform: Platform;
  architecture: Architecture;
  isDesktop: boolean;
  isMobile: boolean;
  isHighDPI: boolean;
  dpr: number; // Device pixel ratio
}

// Cached platform info
let cachedPlatformInfo: PlatformInfo | null = null;

export async function getPlatformInfo(): Promise<PlatformInfo> {
  if (cachedPlatformInfo) {
    return cachedPlatformInfo;
  }

  const info: PlatformInfo = {
    platform: 'web',
    architecture: 'unknown',
    isDesktop: true,
    isMobile: false,
    isHighDPI: window.devicePixelRatio > 1,
    dpr: window.devicePixelRatio || 1,
  };

  if (isTauriEnvironment()) {
    try {
      const platformName = await platform();
      const archName = await arch();

      // Map Tauri platform names to our types
      switch (platformName as string) {
        case 'win32':
        case 'windows':
          info.platform = 'windows';
          break;
        case 'darwin':
        case 'macos':
          info.platform = 'macos';
          break;
        case 'linux':
          info.platform = 'linux';
          break;
      }

      // Map architecture
      switch (archName as string) {
        case 'x86_64':
        case 'x64':
          info.architecture = 'x64';
          break;
        case 'aarch64':
        case 'arm64':
          info.architecture = 'arm64';
          break;
        case 'i686':
        case 'x86':
          info.architecture = 'x86';
          break;
      }
    } catch (error) {
      console.warn('Failed to detect platform via Tauri:', error);
      // Fallback to browser detection
      detectFromBrowser(info);
    }
  } else {
    detectFromBrowser(info);
  }

  // Check for mobile devices
  info.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  info.isDesktop = !info.isMobile;

  cachedPlatformInfo = info;
  return info;
}

function detectFromBrowser(info: PlatformInfo): void {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();

  if (platform.includes('win')) {
    info.platform = 'windows';
  } else if (platform.includes('mac')) {
    info.platform = 'macos';
  } else if (platform.includes('linux')) {
    info.platform = 'linux';
  }

  // Detect architecture from user agent
  if (userAgent.includes('x64') || userAgent.includes('x86_64')) {
    info.architecture = 'x64';
  } else if (userAgent.includes('arm64') || userAgent.includes('aarch64')) {
    info.architecture = 'arm64';
  } else if (userAgent.includes('x86') || userAgent.includes('i686')) {
    info.architecture = 'x86';
  }
}

// Platform-specific feature detection
export const PlatformFeatures = {
  supportsBackdropFilter: async () => {
    const info = await getPlatformInfo();
    // Backdrop filter is well supported on macOS, limited on Windows/Linux
    return info.platform === 'macos' || info.platform === 'web';
  },

  supportsVibrancy: async () => {
    const info = await getPlatformInfo();
    // Window vibrancy effects are only available on macOS
    return info.platform === 'macos' && isTauriEnvironment();
  },

  supportsNativeMenuBar: async () => {
    const info = await getPlatformInfo();
    // macOS has native menu bar, Windows/Linux use custom
    return info.platform === 'macos' && isTauriEnvironment();
  },

  supportsGPUAcceleration: async () => {
    // Check for WebGL2 support as indicator of GPU acceleration
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  },

  getPathSeparator: async () => {
    const info = await getPlatformInfo();
    return info.platform === 'windows' ? '\\' : '/';
  },

  getLineEnding: async () => {
    const info = await getPlatformInfo();
    return info.platform === 'windows' ? '\r\n' : '\n';
  },
};

// Platform-specific keyboard shortcuts
export const PlatformKeys = {
  modifierKey: async () => {
    const info = await getPlatformInfo();
    return info.platform === 'macos' ? 'cmd' : 'ctrl';
  },

  deleteKey: async () => {
    const info = await getPlatformInfo();
    return info.platform === 'macos' ? 'delete' : 'del';
  },

  optionKey: async () => {
    const info = await getPlatformInfo();
    return info.platform === 'macos' ? 'option' : 'alt';
  },
};

// Platform-specific UI measurements
export const PlatformMeasurements = {
  getTitleBarHeight: async () => {
    const info = await getPlatformInfo();
    if (!isTauriEnvironment()) return 0;

    // Platform-specific title bar heights
    switch (info.platform) {
      case 'windows':
        return 32;
      case 'macos':
        return 28; // Traffic light buttons area
      case 'linux':
        return 30;
      default:
        return 0;
    }
  },

  getScrollbarWidth: async () => {
    const info = await getPlatformInfo();
    
    // Create a temporary element to measure scrollbar
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll';
    (outer.style as any).msOverflowStyle = 'scrollbar';
    document.body.appendChild(outer);

    const inner = document.createElement('div');
    outer.appendChild(inner);

    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    outer.parentNode?.removeChild(outer);

    // macOS has overlay scrollbars by default
    if (info.platform === 'macos' && scrollbarWidth === 0) {
      return 0;
    }

    return scrollbarWidth || 15; // Default fallback
  },

  getContextMenuOffset: async () => {
    const info = await getPlatformInfo();
    
    // Platform-specific context menu positioning adjustments
    switch (info.platform) {
      case 'windows':
        return { x: 2, y: 2 };
      case 'macos':
        return { x: 0, y: 0 };
      case 'linux':
        return { x: 1, y: 1 };
      default:
        return { x: 0, y: 0 };
    }
  },
};
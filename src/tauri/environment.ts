// Cached result to avoid repeated detection
let _tauriEnvironmentCached: boolean | null = null;
let _httpBridgeAvailableCached: boolean | null = null;

// Force browser mode flag - when true, always use HTTP bridge even if Tauri is available
const FORCE_BROWSER_MODE = true;

// Environment detection and feature flags
export function isTauriEnvironment(): boolean {
  // Force browser mode - always return false to use HTTP bridge
  if (FORCE_BROWSER_MODE) {
    return false;
  }
  
  // Use cached result if available
  if (_tauriEnvironmentCached !== null) {
    return _tauriEnvironmentCached;
  }
  
  const hasWindow = typeof window !== 'undefined';
  
  if (!hasWindow) {
    _tauriEnvironmentCached = false;
    return false;
  }
  
  // Tauri v2 uses different detection methods - try all of them
  const hasTauriLegacy = '__TAURI__' in window;
  const hasTauriV2 = '__TAURI_INTERNALS__' in window;
  
  // Try to detect via actual Tauri API availability
  let hasTauriAPI = false;
  try {
    hasTauriAPI = typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';
  } catch (e) {
    hasTauriAPI = false;
  }
  
  // Alternative: Check for Tauri invoke function availability
  let hasInvokeAPI = false;
  try {
    hasInvokeAPI = typeof (window as any).__TAURI_INTERNALS__?.invoke === 'function';
  } catch (e) {
    hasInvokeAPI = false;
  }
  
  // Check if we're in Tauri context by looking for specific window properties
  const hasTauriContext = (window as any).navigator?.userAgent?.includes?.('Tauri') || 
                         (window as any).__TAURI_IPC__ !== undefined ||
                         typeof (window as any).ipc !== 'undefined';
  
  const isTauri = hasTauriLegacy || hasTauriV2 || hasTauriAPI || hasInvokeAPI || hasTauriContext;
  
  // Debug logging
  console.log('🔍 Environment Debug:', {
    hasWindow,
    hasTauriLegacy,
    hasTauriV2,
    hasTauriAPI,
    hasInvokeAPI,
    hasTauriContext,
    isTauri,
    windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('tauri')),
    allWindowKeys: Object.keys(window).slice(0, 30), // More keys for debugging
    tauriLegacyValue: (window as any).__TAURI__,
    tauriInternalsValue: typeof (window as any).__TAURI_INTERNALS__,
    tauriIPC: typeof (window as any).__TAURI_IPC__,
    userAgent: navigator?.userAgent,
    location: window?.location?.protocol
  });
  
  // Cache the result
  _tauriEnvironmentCached = isTauri;
  return isTauri;
}

export function isWebEnvironment(): boolean {
  return !isTauriEnvironment();
}

// Clear cached environment detection (useful for testing)
export function clearEnvironmentCache(): void {
  _tauriEnvironmentCached = null;
  _httpBridgeAvailableCached = null;
}

// HTTP Bridge environment detection
export async function isHttpBridgeAvailable(): Promise<boolean> {
  if (_httpBridgeAvailableCached !== null) {
    return _httpBridgeAvailableCached;
  }
  
  try {
    const { isHttpBridgeAvailable } = await import('../utils/httpBridge');
    _httpBridgeAvailableCached = await isHttpBridgeAvailable();
    
    if (_httpBridgeAvailableCached) {
      console.log('🌐 HTTP Bridge to Rust backend is available');
    }
    
    return _httpBridgeAvailableCached;
  } catch (error) {
    console.warn('HTTP Bridge detection failed:', error);
    _httpBridgeAvailableCached = false;
    return false;
  }
}

// Check if ANY Rust backend is available (Tauri OR HTTP Bridge)
export async function isRustBackendAvailable(): Promise<boolean> {
  return isTauriEnvironment() || (await isHttpBridgeAvailable());
}

// Feature flags for progressive enhancement
export const Features = {
  nativeFileDialogs: isTauriEnvironment(),
  nativeMenus: isTauriEnvironment(),
  performanceMonitoring: isTauriEnvironment(),
  spatialIndexing: isTauriEnvironment(),
  bulkOperations: isTauriEnvironment(),
};

// Performance settings based on environment (async initialization)
let _performanceConfig: any = null;

export const getPerformanceConfig = async () => {
  if (_performanceConfig === null) {
    const hasRustBackend = await isRustBackendAvailable();
    _performanceConfig = {
      // Use Rust calculations for heavy operations when ANY Rust backend is available
      useNativeCalculations: hasRustBackend,
      // Batch size for bulk operations
      batchSize: hasRustBackend ? 1000 : 100,
      // Debounce delays
      saveDebounceMs: hasRustBackend ? 500 : 1000,
      // Spatial query optimization
      spatialQueryThreshold: hasRustBackend ? 10000 : 1000,
      // HTTP bridge specific settings
      useHttpBridge: !isTauriEnvironment() && (await isHttpBridgeAvailable()),
      useTauriDirect: isTauriEnvironment(),
    };
    
    console.log('🔧 Performance config initialized:', _performanceConfig);
  }
  
  return _performanceConfig;
};

// Legacy sync version for backwards compatibility (will be phased out)
export const PerformanceConfig = {
  // Use Rust calculations for heavy operations in Tauri
  useNativeCalculations: isTauriEnvironment(),
  // Batch size for bulk operations
  batchSize: isTauriEnvironment() ? 1000 : 100,
  // Debounce delays
  saveDebounceMs: isTauriEnvironment() ? 500 : 1000,
  // Spatial query optimization
  spatialQueryThreshold: isTauriEnvironment() ? 10000 : 1000,
};
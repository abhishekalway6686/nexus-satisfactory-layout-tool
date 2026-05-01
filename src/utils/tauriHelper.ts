// Tauri helper with conditional import support
export let tauriInvoke: any = null;

// Initialize Tauri invoke function if available
const initTauri = async () => {
  try {
    // Check if we're in a Tauri environment
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      // Dynamic import - uses Function constructor to avoid TypeScript static analysis
      // This is necessary because the @tauri-apps/api may not be available in browser-only builds
      const importFn = new Function('specifier', 'return import(specifier)');
      const tauriModule = await importFn('@tauri-apps/api/tauri');
      tauriInvoke = tauriModule.invoke;
      console.log('[Tauri Helper] Tauri API initialized successfully');
    } else {
      console.log('[Tauri Helper] Not in Tauri environment, using fallback');
    }
  } catch (error) {
    console.warn('[Tauri Helper] Failed to initialize Tauri API:', error);
  }
};

// Export helper function
export const getTauriInvoke = async () => {
  if (tauriInvoke === null) {
    await initTauri();
  }
  return tauriInvoke;
};

// Check if Tauri is available
export const isTauriAvailable = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};
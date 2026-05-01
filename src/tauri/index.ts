// Re-export all Tauri integration functions
export * from './commands';
export * from './commandsExtended';
export * from './events';
export * from './environment';

// Import for initialization
import { testRustConnection } from './commands';

// Initialize Tauri integration
export async function initializeTauri() {
  const { isTauriEnvironment } = await import('./environment');
  
  if (!isTauriEnvironment()) {
    console.warn('Not running in Tauri environment');
    return;
  }

  const { setupEventListeners } = await import('./events');
  
  try {
    // Test connection to Rust backend
    const result = await testRustConnection();
    console.log('Tauri backend connected:', result);
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Tauri initialization complete');
  } catch (error) {
    console.error('Failed to initialize Tauri:', error);
  }
}
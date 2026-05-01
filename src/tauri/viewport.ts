import { invoke } from "@tauri-apps/api/tauri";
import type { 
  ViewportBounds, 
  ViewportConfig, 
  SpatialQueryResult, 
  ViewportMetrics,
  DEFAULT_VIEWPORT_CONFIG
} from "../types/viewport";

/**
 * High-performance viewport system for eliminating canvas dragging lag
 * 
 * This system uses Rust backend with:
 * - R-tree spatial indexing for O(log N) queries instead of O(N)
 * - SIMD-accelerated coordinate transformations  
 * - Predictive caching for smooth panning
 * - Sub-millisecond response times for 10,000+ objects
 */
export class ViewportSystem {
  private initialized = false;
  
  /**
   * Initialize the Rust viewport system with configuration
   */
  async init(config: ViewportConfig = DEFAULT_VIEWPORT_CONFIG): Promise<void> {
    await invoke("init_viewport_system", { config });
    this.initialized = true;
  }
  
  /**
   * Update viewport bounds and get visible objects
   * This is the main method called on canvas drag/pan operations
   */
  async updateViewport(bounds: ViewportBounds): Promise<SpatialQueryResult[]> {
    if (!this.initialized) {
      await this.init();
    }
    
    return await invoke<SpatialQueryResult[]>("update_viewport_bounds", { bounds });
  }
  
  /**
   * Get performance metrics for monitoring
   */
  async getMetrics(): Promise<ViewportMetrics> {
    return await invoke<ViewportMetrics>("get_viewport_metrics");
  }
  
  /**
   * Check if viewport system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Global viewport system instance
export const viewportSystem = new ViewportSystem();

/**
 * Hook for React components to use the viewport system
 */
export function useViewportSystem() {
  return {
    viewportSystem,
    updateViewport: (bounds: ViewportBounds) => viewportSystem.updateViewport(bounds),
    getMetrics: () => viewportSystem.getMetrics(),
    isInitialized: () => viewportSystem.isInitialized(),
  };
}


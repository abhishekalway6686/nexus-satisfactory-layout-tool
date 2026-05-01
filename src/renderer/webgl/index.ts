/**
 * WebGL Renderer - Main exports for the WebGL rendering system
 */

// Core exports
export { WebGLRenderer } from './WebGLRenderer';
export { WebGLContext } from './core/WebGLContext';
export { ShaderManager } from './core/ShaderManager';
export { BufferManager } from './core/BufferManager';
export { TextureManager } from './core/TextureManager';
export { LayerSystem } from './core/LayerSystem';
export { TransformSystem } from './core/TransformSystem';
export { RenderBatch } from './core/RenderBatch';
export { PerformanceMonitor } from './core/PerformanceMonitor';

// Event system exports
export { EventSystem } from './events/EventSystem';

// Type exports
export * from './types';

// Utility function to check WebGL support
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!context;
  } catch (error) {
    return false;
  }
}

// Utility function to get WebGL info
export function getWebGLInfo(): {
  supported: boolean;
  version: 'WebGL2' | 'WebGL1' | 'None';
  vendor?: string;
  renderer?: string;
  maxTextureSize?: number;
} {
  try {
    const canvas = document.createElement('canvas');
    let gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
    let version: 'WebGL2' | 'WebGL1' | 'None' = 'None';
    
    if (gl) {
      version = 'WebGL2';
    } else {
      gl = canvas.getContext('webgl') as any;
      if (gl) {
        version = 'WebGL1';
      }
    }
    
    if (!gl) {
      return { supported: false, version: 'None' };
    }
    
    return {
      supported: true,
      version,
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
    };
  } catch (error) {
    return { supported: false, version: 'None' };
  }
}

// Factory function to create a WebGL renderer
export function createWebGLRenderer(
  canvas: HTMLCanvasElement,
  config?: Partial<import('./types').WebGLRendererConfig>
): WebGLRenderer | null {
  try {
    return new WebGLRenderer(canvas, config);
  } catch (error) {
    console.error('Failed to create WebGL renderer:', error);
    return null;
  }
}
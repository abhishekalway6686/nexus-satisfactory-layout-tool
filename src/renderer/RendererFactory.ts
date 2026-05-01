/**
 * Renderer Factory - Creates and manages renderer instances
 * Handles switching between Konva and WebGL renderers
 */

import { RendererInterface } from './RendererInterface';
import { KonvaRendererAdapter } from './konva/KonvaRendererAdapter';
import { WebGLRendererAdapter } from './webgl/WebGLRendererAdapter';
import { isWebGLSupported, getWebGLInfo } from './webgl';

export type RendererType = 'konva' | 'webgl';

export interface RendererFactoryConfig {
  container: HTMLElement;
  width: number;
  height: number;
  preferredRenderer?: RendererType;
  fallbackToKonva?: boolean;
}

export class RendererFactory {
  private static instance: RendererFactory | null = null;
  private currentRenderer: RendererInterface | null = null;
  private currentType: RendererType | null = null;
  private config: RendererFactoryConfig | null = null;

  // Singleton pattern
  public static getInstance(): RendererFactory {
    if (!RendererFactory.instance) {
      RendererFactory.instance = new RendererFactory();
    }
    return RendererFactory.instance;
  }

  private constructor() {
    // Private constructor for singleton
  }

  public async createRenderer(config: RendererFactoryConfig): Promise<RendererInterface> {
    this.config = config;
    
    const targetType = config.preferredRenderer || 'konva';
    const fallback = config.fallbackToKonva !== false;
    
    // Dispose existing renderer if switching types
    if (this.currentRenderer && this.currentType !== targetType) {
      await this.disposeCurrentRenderer();
    }

    // Try to create the preferred renderer
    let renderer: RendererInterface | null = null;
    
    try {
      if (targetType === 'webgl') {
        renderer = await this.createWebGLRenderer(config);
      } else {
        renderer = await this.createKonvaRenderer(config);
      }
    } catch (error) {
      console.error(`Failed to create ${targetType} renderer:`, error);
      
      if (fallback && targetType === 'webgl') {
        console.log('Falling back to Konva renderer');
        try {
          renderer = await this.createKonvaRenderer(config);
        } catch (fallbackError) {
          console.error('Fallback to Konva also failed:', fallbackError);
          throw new Error('Failed to create any renderer');
        }
      } else {
        throw error;
      }
    }

    if (!renderer) {
      throw new Error(`Failed to create ${targetType} renderer`);
    }

    this.currentRenderer = renderer;
    this.currentType = renderer.getType();
    
    console.log(`Created ${this.currentType} renderer`);
    return renderer;
  }

  private async createKonvaRenderer(config: RendererFactoryConfig): Promise<KonvaRendererAdapter> {
    // Ensure container is a div for Konva
    let container = config.container;
    if (container.tagName !== 'DIV') {
      const div = document.createElement('div');
      div.style.width = `${config.width}px`;
      div.style.height = `${config.height}px`;
      div.style.position = 'relative';
      
      container.appendChild(div);
      container = div;
    }

    const renderer = new KonvaRendererAdapter(container as HTMLDivElement, config.width, config.height);
    await renderer.initialize();
    return renderer;
  }

  private async createWebGLRenderer(config: RendererFactoryConfig): Promise<WebGLRendererAdapter> {
    // Check WebGL support first
    if (!isWebGLSupported()) {
      throw new Error('WebGL is not supported on this device/browser');
    }

    const webglInfo = getWebGLInfo();
    console.log('WebGL Info:', webglInfo);

    // Create canvas for WebGL
    let canvas: HTMLCanvasElement;
    if (config.container.tagName === 'CANVAS') {
      canvas = config.container as HTMLCanvasElement;
    } else {
      canvas = document.createElement('canvas');
      canvas.width = config.width;
      canvas.height = config.height;
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      
      // Clear container and add canvas
      config.container.innerHTML = '';
      config.container.appendChild(canvas);
    }

    const renderer = new WebGLRendererAdapter(canvas);
    await renderer.initialize();
    return renderer;
  }

  public getCurrentRenderer(): RendererInterface | null {
    return this.currentRenderer;
  }

  public getCurrentType(): RendererType | null {
    return this.currentType;
  }

  public async switchRenderer(newType: RendererType): Promise<RendererInterface> {
    if (!this.config) {
      throw new Error('No renderer configuration available for switching');
    }

    if (this.currentType === newType) {
      return this.currentRenderer!;
    }

    console.log(`Switching from ${this.currentType} to ${newType} renderer`);

    // Save current state if needed
    const currentState = this.saveRendererState();

    // Create new renderer
    const newConfig = { ...this.config, preferredRenderer: newType };
    const newRenderer = await this.createRenderer(newConfig);

    // Restore state if possible
    if (currentState) {
      await this.restoreRendererState(newRenderer, currentState);
    }

    return newRenderer;
  }

  private saveRendererState(): any {
    if (!this.currentRenderer) return null;

    // Extract current state (shapes, layers, transform, etc.)
    const state = {
      transform: this.currentRenderer.getTransform(),
      // Add more state properties as needed
    };

    return state;
  }

  private async restoreRendererState(renderer: RendererInterface, state: any): Promise<void> {
    if (!state) return;

    // Restore transform
    if (state.transform) {
      renderer.setTransform(state.transform);
    }

    // Add more state restoration as needed
  }

  public async disposeCurrentRenderer(): Promise<void> {
    if (this.currentRenderer) {
      this.currentRenderer.dispose();
      this.currentRenderer = null;
      this.currentType = null;
    }
  }

  public isWebGLAvailable(): boolean {
    return isWebGLSupported();
  }

  public getWebGLCapabilities(): {
    supported: boolean;
    version: 'WebGL2' | 'WebGL1' | 'None';
    vendor?: string;
    renderer?: string;
    maxTextureSize?: number;
  } {
    return getWebGLInfo();
  }

  public getRecommendedRenderer(): RendererType {
    // Logic to determine the best renderer for the current environment
    const webglInfo = this.getWebGLCapabilities();
    
    if (!webglInfo.supported) {
      return 'konva';
    }

    // Consider performance indicators
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    
    if (!gl) {
      return 'konva';
    }

    // Check for known problematic renderers
    const renderer = gl.getParameter(gl.RENDERER).toLowerCase();
    const vendor = gl.getParameter(gl.VENDOR).toLowerCase();
    
    // Some Intel integrated graphics have issues with complex WebGL
    if (renderer.includes('intel') && renderer.includes('hd')) {
      return 'konva';
    }

    // For mobile devices, be more conservative
    if (this.isMobileDevice()) {
      return 'konva';
    }

    // For desktop with decent GPU, prefer WebGL
    return 'webgl';
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  public async benchmarkRenderers(): Promise<{
    konva: { fps: number; frameTime: number };
    webgl: { fps: number; frameTime: number };
    recommendation: RendererType;
  }> {
    if (!this.config) {
      throw new Error('No configuration available for benchmarking');
    }

    const results = {
      konva: { fps: 0, frameTime: 0 },
      webgl: { fps: 0, frameTime: 0 },
      recommendation: 'konva' as RendererType
    };

    try {
      // Benchmark Konva
      const konvaRenderer = await this.createKonvaRenderer(this.config);
      await this.runBenchmark(konvaRenderer);
      const konvaStats = konvaRenderer.getStats();
      results.konva = { fps: konvaStats.fps, frameTime: konvaStats.frameTime };
      konvaRenderer.dispose();

      // Benchmark WebGL if supported
      if (this.isWebGLAvailable()) {
        const webglRenderer = await this.createWebGLRenderer(this.config);
        await this.runBenchmark(webglRenderer);
        const webglStats = webglRenderer.getStats();
        results.webgl = { fps: webglStats.fps, frameTime: webglStats.frameTime };
        webglRenderer.dispose();
      }

      // Determine recommendation
      if (results.webgl.fps > results.konva.fps * 1.2) {
        results.recommendation = 'webgl';
      } else {
        results.recommendation = 'konva';
      }

    } catch (error) {
      console.error('Benchmarking failed:', error);
      results.recommendation = 'konva';
    }

    return results;
  }

  private async runBenchmark(renderer: RendererInterface): Promise<void> {
    // Simple benchmark - render some shapes for a few frames
    const frameCount = 60;
    let currentFrame = 0;

    return new Promise<void>((resolve) => {
      // Add some test shapes
      for (let i = 0; i < 100; i++) {
        renderer.addRect({
          id: `bench_rect_${i}`,
          x: Math.random() * 800,
          y: Math.random() * 600,
          width: 20,
          height: 20,
          fill: '#ff6b6b'
        });
      }

      const renderFrame = () => {
        renderer.render();
        currentFrame++;

        if (currentFrame >= frameCount) {
          resolve();
        } else {
          requestAnimationFrame(renderFrame);
        }
      };

      requestAnimationFrame(renderFrame);
    });
  }

  public dispose(): void {
    this.disposeCurrentRenderer();
    RendererFactory.instance = null;
  }
}
/**
 * WebGL Renderer - Core WebGL rendering engine for the Satisfactory layout tool
 * Provides GPU-accelerated rendering as an alternative to Konva
 */

import { WebGLContext } from './core/WebGLContext';
import { ShaderManager } from './core/ShaderManager';
import { BufferManager } from './core/BufferManager';
import { TextureManager } from './core/TextureManager';
import { LayerSystem } from './core/LayerSystem';
import { EventSystem } from './events/EventSystem';
import { TransformSystem } from './core/TransformSystem';
import { RenderBatch } from './core/RenderBatch';
import { PerformanceMonitor } from './core/PerformanceMonitor';
import { WebGLRendererConfig, RenderContext, RenderStats } from './types';

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private context: WebGLContext;
  private shaderManager: ShaderManager;
  private bufferManager: BufferManager;
  private textureManager: TextureManager;
  private layerSystem: LayerSystem;
  private eventSystem: EventSystem;
  private transformSystem: TransformSystem;
  private renderBatch: RenderBatch;
  private performanceMonitor: PerformanceMonitor;
  
  private config: WebGLRendererConfig;
  private isInitialized = false;
  private animationFrameId: number | null = null;
  private renderStats: RenderStats;

  constructor(canvas: HTMLCanvasElement, config: Partial<WebGLRendererConfig> = {}) {
    this.canvas = canvas;
    this.config = {
      antialias: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
      enablePerformanceMonitoring: true,
      maxTextureSize: 2048,
      enableInstancing: true,
      enableBatching: true,
      ...config
    };

    this.renderStats = {
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      bufferMemory: 0,
      textureMemory: 0,
      fps: 0
    };

    this.initializeRenderer();
  }

  private async initializeRenderer(): Promise<void> {
    try {
      // Initialize WebGL context
      this.context = new WebGLContext(this.canvas, this.config);
      await this.context.initialize();

      // Initialize core systems
      this.shaderManager = new ShaderManager(this.context);
      this.bufferManager = new BufferManager(this.context);
      this.textureManager = new TextureManager(this.context);
      this.transformSystem = new TransformSystem();
      this.renderBatch = new RenderBatch(this.context, this.bufferManager);
      
      // Initialize higher-level systems
      this.layerSystem = new LayerSystem(this.renderBatch);
      this.eventSystem = new EventSystem(this.canvas, this.transformSystem);
      
      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor = new PerformanceMonitor();
      }

      // Load default shaders
      await this.shaderManager.loadShaders();
      
      // Set up initial GL state
      this.setupInitialGLState();
      
      this.isInitialized = true;
      
      console.log('WebGL Renderer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebGL Renderer:', error);
      throw error;
    }
  }

  private setupInitialGLState(): void {
    const gl = this.context.gl;
    
    // Enable blending for alpha compositing
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Enable depth testing if needed
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    // Set clear color
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
  }

  public setViewport(x: number, y: number, width: number, height: number): void {
    if (!this.isInitialized) return;
    
    this.context.gl.viewport(x, y, width, height);
    this.transformSystem.setViewportSize(width, height);
  }

  public setTransform(scale: number, x: number, y: number): void {
    if (!this.isInitialized) return;
    
    this.transformSystem.setTransform(scale, x, y);
  }

  public render(renderContext: RenderContext): void {
    if (!this.isInitialized) return;

    const startTime = performance.now();
    
    // Start performance monitoring
    if (this.performanceMonitor) {
      this.performanceMonitor.startFrame();
    }

    // Clear the canvas
    this.clear();

    // Update transform matrices
    this.transformSystem.updateMatrices();

    // Reset render batch for this frame
    this.renderBatch.reset();

    // Render all layers in order
    this.layerSystem.render(renderContext, this.transformSystem);

    // Flush any remaining batched operations
    this.renderBatch.flush();

    // End performance monitoring
    if (this.performanceMonitor) {
      this.performanceMonitor.endFrame();
      this.renderStats = this.performanceMonitor.getStats();
    }

    this.renderStats.frameTime = performance.now() - startTime;
  }

  public clear(): void {
    if (!this.isInitialized) return;
    
    const gl = this.context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  public startRenderLoop(renderCallback: () => RenderContext): void {
    if (!this.isInitialized) return;

    const renderFrame = () => {
      const renderContext = renderCallback();
      this.render(renderContext);
      this.animationFrameId = requestAnimationFrame(renderFrame);
    };

    this.animationFrameId = requestAnimationFrame(renderFrame);
  }

  public stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resize(width: number, height: number): void {
    if (!this.isInitialized) return;

    this.canvas.width = width;
    this.canvas.height = height;
    this.setViewport(0, 0, width, height);
  }

  public getStats(): RenderStats {
    return { ...this.renderStats };
  }

  public getContext(): WebGLContext {
    return this.context;
  }

  public getLayerSystem(): LayerSystem {
    return this.layerSystem;
  }

  public getEventSystem(): EventSystem {
    return this.eventSystem;
  }

  public getTransformSystem(): TransformSystem {
    return this.transformSystem;
  }

  public isWebGLSupported(): boolean {
    return this.context?.isSupported() ?? false;
  }

  public dispose(): void {
    this.stopRenderLoop();
    
    if (this.textureManager) {
      this.textureManager.dispose();
    }
    
    if (this.bufferManager) {
      this.bufferManager.dispose();
    }
    
    if (this.shaderManager) {
      this.shaderManager.dispose();
    }
    
    if (this.eventSystem) {
      this.eventSystem.dispose();
    }
    
    this.isInitialized = false;
  }
}
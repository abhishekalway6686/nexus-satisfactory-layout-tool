/**
 * WebGL Context - Manages WebGL context creation and validation
 */

import { WebGLRendererConfig } from '../types';

export class WebGLContext {
  public gl: WebGL2RenderingContext | WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private config: WebGLRendererConfig;
  private extensions: Map<string, any> = new Map();
  private isWebGL2: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: WebGLRendererConfig) {
    this.canvas = canvas;
    this.config = config;
  }

  public async initialize(): Promise<void> {
    // Try WebGL2 first, fallback to WebGL1
    this.gl = this.canvas.getContext('webgl2', {
      antialias: this.config.antialias,
      preserveDrawingBuffer: this.config.preserveDrawingBuffer,
      powerPreference: this.config.powerPreference,
      failIfMajorPerformanceCaveat: this.config.failIfMajorPerformanceCaveat
    }) as WebGL2RenderingContext;

    if (this.gl) {
      this.isWebGL2 = true;
      console.log('WebGL2 context created');
    } else {
      // Fallback to WebGL1
      this.gl = this.canvas.getContext('webgl', {
        antialias: this.config.antialias,
        preserveDrawingBuffer: this.config.preserveDrawingBuffer,
        powerPreference: this.config.powerPreference,
        failIfMajorPerformanceCaveat: this.config.failIfMajorPerformanceCaveat
      }) as WebGLRenderingContext;

      if (!this.gl) {
        throw new Error('WebGL not supported');
      }
      
      this.isWebGL2 = false;
      console.log('WebGL1 context created');
    }

    // Load useful extensions
    await this.loadExtensions();
    
    // Log context information
    this.logContextInfo();
  }

  private async loadExtensions(): Promise<void> {
    const extensionNames = [
      // WebGL1 extensions
      'OES_vertex_array_object',
      'WEBGL_lose_context',
      'OES_texture_float',
      'OES_texture_half_float',
      'WEBGL_depth_texture',
      'OES_element_index_uint',
      'ANGLE_instanced_arrays',
      'WEBGL_draw_buffers',
      
      // WebGL2 extensions (if available)
      'EXT_color_buffer_float',
      'EXT_disjoint_timer_query_webgl2',
      'EXT_texture_filter_anisotropic',
      'WEBGL_multi_draw'
    ];

    for (const name of extensionNames) {
      try {
        const extension = this.gl.getExtension(name);
        if (extension) {
          this.extensions.set(name, extension);
          console.log(`Loaded extension: ${name}`);
        }
      } catch (error) {
        // Extension not available, that's okay
      }
    }
  }

  private logContextInfo(): void {
    const gl = this.gl;
    
    console.log('WebGL Context Info:');
    console.log(`  Version: ${this.isWebGL2 ? 'WebGL2' : 'WebGL1'}`);
    console.log(`  Vendor: ${gl.getParameter(gl.VENDOR)}`);
    console.log(`  Renderer: ${gl.getParameter(gl.RENDERER)}`);
    console.log(`  WebGL Version: ${gl.getParameter(gl.VERSION)}`);
    console.log(`  GLSL Version: ${gl.getParameter(gl.SHADING_LANGUAGE_VERSION)}`);
    console.log(`  Max Texture Size: ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`);
    console.log(`  Max Vertex Attributes: ${gl.getParameter(gl.MAX_VERTEX_ATTRIBS)}`);
    console.log(`  Max Texture Units: ${gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)}`);
    
    if (this.isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      console.log(`  Max 3D Texture Size: ${gl2.getParameter(gl2.MAX_3D_TEXTURE_SIZE)}`);
      console.log(`  Max Array Texture Layers: ${gl2.getParameter(gl2.MAX_ARRAY_TEXTURE_LAYERS)}`);
    }
    
    console.log(`  Extensions loaded: ${this.extensions.size}`);
  }

  public isSupported(): boolean {
    return !!this.gl;
  }

  public isWebGL2Context(): boolean {
    return this.isWebGL2;
  }

  public getExtension(name: string): any {
    return this.extensions.get(name);
  }

  public hasExtension(name: string): boolean {
    return this.extensions.has(name);
  }

  public checkFramebufferStatus(): boolean {
    const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
      console.error('Framebuffer not complete:', this.getFramebufferStatusString(status));
      return false;
    }
    return true;
  }

  private getFramebufferStatusString(status: number): string {
    const gl = this.gl;
    switch (status) {
      case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        return 'FRAMEBUFFER_INCOMPLETE_ATTACHMENT';
      case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        return 'FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT';
      case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        return 'FRAMEBUFFER_INCOMPLETE_DIMENSIONS';
      case gl.FRAMEBUFFER_UNSUPPORTED:
        return 'FRAMEBUFFER_UNSUPPORTED';
      default:
        return `Unknown status: ${status}`;
    }
  }

  public validateGLError(operation: string): boolean {
    const error = this.gl.getError();
    if (error !== this.gl.NO_ERROR) {
      console.error(`WebGL Error during ${operation}:`, this.getErrorString(error));
      return false;
    }
    return true;
  }

  private getErrorString(error: number): string {
    const gl = this.gl;
    switch (error) {
      case gl.INVALID_ENUM:
        return 'INVALID_ENUM';
      case gl.INVALID_VALUE:
        return 'INVALID_VALUE';
      case gl.INVALID_OPERATION:
        return 'INVALID_OPERATION';
      case gl.INVALID_FRAMEBUFFER_OPERATION:
        return 'INVALID_FRAMEBUFFER_OPERATION';
      case gl.OUT_OF_MEMORY:
        return 'OUT_OF_MEMORY';
      case gl.CONTEXT_LOST_WEBGL:
        return 'CONTEXT_LOST_WEBGL';
      default:
        return `Unknown error: ${error}`;
    }
  }

  public getMaxTextureSize(): number {
    return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
  }

  public getMaxVertexAttributes(): number {
    return this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);
  }

  public getMaxTextureUnits(): number {
    return this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS);
  }

  public createVertexArray(): WebGLVertexArrayObject | null {
    if (this.isWebGL2) {
      return (this.gl as WebGL2RenderingContext).createVertexArray();
    } else {
      const extension = this.getExtension('OES_vertex_array_object');
      return extension ? extension.createVertexArrayOES() : null;
    }
  }

  public bindVertexArray(vao: WebGLVertexArrayObject | null): void {
    if (this.isWebGL2) {
      (this.gl as WebGL2RenderingContext).bindVertexArray(vao);
    } else {
      const extension = this.getExtension('OES_vertex_array_object');
      if (extension) {
        extension.bindVertexArrayOES(vao);
      }
    }
  }

  public deleteVertexArray(vao: WebGLVertexArrayObject): void {
    if (this.isWebGL2) {
      (this.gl as WebGL2RenderingContext).deleteVertexArray(vao);
    } else {
      const extension = this.getExtension('OES_vertex_array_object');
      if (extension) {
        extension.deleteVertexArrayOES(vao);
      }
    }
  }

  public drawElementsInstanced(mode: number, count: number, type: number, offset: number, instanceCount: number): void {
    if (this.isWebGL2) {
      (this.gl as WebGL2RenderingContext).drawElementsInstanced(mode, count, type, offset, instanceCount);
    } else {
      const extension = this.getExtension('ANGLE_instanced_arrays');
      if (extension) {
        extension.drawElementsInstancedANGLE(mode, count, type, offset, instanceCount);
      }
    }
  }

  public vertexAttribDivisor(index: number, divisor: number): void {
    if (this.isWebGL2) {
      (this.gl as WebGL2RenderingContext).vertexAttribDivisor(index, divisor);
    } else {
      const extension = this.getExtension('ANGLE_instanced_arrays');
      if (extension) {
        extension.vertexAttribDivisorANGLE(index, divisor);
      }
    }
  }

  public dispose(): void {
    const loseContext = this.getExtension('WEBGL_lose_context');
    if (loseContext) {
      loseContext.loseContext();
    }
  }
}
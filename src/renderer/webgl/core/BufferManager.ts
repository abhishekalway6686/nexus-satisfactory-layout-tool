/**
 * Buffer Manager - Handles WebGL buffer creation, management, and optimizations
 */

import { WebGLContext } from './WebGLContext';
import { BufferData } from '../types';

export class BufferManager {
  private context: WebGLContext;
  private buffers: Map<string, BufferData> = new Map();
  private totalMemory: number = 0;

  constructor(context: WebGLContext) {
    this.context = context;
  }

  public createBuffer(
    id: string,
    data: ArrayBuffer,
    type: 'vertex' | 'index' | 'uniform' = 'vertex',
    usage: 'static' | 'dynamic' | 'stream' = 'static'
  ): BufferData | null {
    const gl = this.context.gl;
    
    // Delete existing buffer if it exists
    this.deleteBuffer(id);

    const buffer = gl.createBuffer();
    if (!buffer) {
      console.error(`Failed to create buffer: ${id}`);
      return null;
    }

    // Determine WebGL buffer type
    let glType: number;
    switch (type) {
      case 'vertex':
        glType = gl.ARRAY_BUFFER;
        break;
      case 'index':
        glType = gl.ELEMENT_ARRAY_BUFFER;
        break;
      case 'uniform':
        glType = this.context.isWebGL2Context() 
          ? (gl as WebGL2RenderingContext).UNIFORM_BUFFER 
          : gl.ARRAY_BUFFER;
        break;
      default:
        glType = gl.ARRAY_BUFFER;
    }

    // Determine WebGL usage pattern
    let glUsage: number;
    switch (usage) {
      case 'static':
        glUsage = gl.STATIC_DRAW;
        break;
      case 'dynamic':
        glUsage = gl.DYNAMIC_DRAW;
        break;
      case 'stream':
        glUsage = gl.STREAM_DRAW;
        break;
      default:
        glUsage = gl.STATIC_DRAW;
    }

    // Bind and upload data
    gl.bindBuffer(glType, buffer);
    gl.bufferData(glType, data, glUsage);

    // Validate
    if (!this.context.validateGLError(`Creating buffer ${id}`)) {
      gl.deleteBuffer(buffer);
      return null;
    }

    const bufferData: BufferData = {
      id,
      buffer,
      type,
      usage,
      size: data.byteLength,
      data: usage !== 'static' ? data : undefined // Keep data for dynamic buffers
    };

    this.buffers.set(id, bufferData);
    this.totalMemory += data.byteLength;

    console.log(`Created buffer ${id}: ${data.byteLength} bytes (${type}, ${usage})`);
    return bufferData;
  }

  public updateBuffer(id: string, data: ArrayBuffer, offset: number = 0): boolean {
    const bufferData = this.buffers.get(id);
    if (!bufferData) {
      console.error(`Buffer not found: ${id}`);
      return false;
    }

    const gl = this.context.gl;
    let glType: number;

    switch (bufferData.type) {
      case 'vertex':
        glType = gl.ARRAY_BUFFER;
        break;
      case 'index':
        glType = gl.ELEMENT_ARRAY_BUFFER;
        break;
      case 'uniform':
        glType = this.context.isWebGL2Context() 
          ? (gl as WebGL2RenderingContext).UNIFORM_BUFFER 
          : gl.ARRAY_BUFFER;
        break;
      default:
        glType = gl.ARRAY_BUFFER;
    }

    gl.bindBuffer(glType, bufferData.buffer);

    if (offset + data.byteLength <= bufferData.size) {
      // Partial update
      gl.bufferSubData(glType, offset, data);
    } else {
      // Full replacement
      let glUsage: number;
      switch (bufferData.usage) {
        case 'static':
          glUsage = gl.STATIC_DRAW;
          break;
        case 'dynamic':
          glUsage = gl.DYNAMIC_DRAW;
          break;
        case 'stream':
          glUsage = gl.STREAM_DRAW;
          break;
        default:
          glUsage = gl.DYNAMIC_DRAW;
      }

      gl.bufferData(glType, data, glUsage);
      
      // Update size tracking
      this.totalMemory = this.totalMemory - bufferData.size + data.byteLength;
      bufferData.size = data.byteLength;
    }

    // Update stored data for dynamic buffers
    if (bufferData.usage !== 'static') {
      bufferData.data = data;
    }

    return this.context.validateGLError(`Updating buffer ${id}`);
  }

  public bindBuffer(id: string, target?: number): boolean {
    const bufferData = this.buffers.get(id);
    if (!bufferData) {
      console.error(`Buffer not found: ${id}`);
      return false;
    }

    const gl = this.context.gl;
    let glType = target;

    if (!glType) {
      switch (bufferData.type) {
        case 'vertex':
          glType = gl.ARRAY_BUFFER;
          break;
        case 'index':
          glType = gl.ELEMENT_ARRAY_BUFFER;
          break;
        case 'uniform':
          glType = this.context.isWebGL2Context() 
            ? (gl as WebGL2RenderingContext).UNIFORM_BUFFER 
            : gl.ARRAY_BUFFER;
          break;
        default:
          glType = gl.ARRAY_BUFFER;
      }
    }

    gl.bindBuffer(glType, bufferData.buffer);
    return this.context.validateGLError(`Binding buffer ${id}`);
  }

  public deleteBuffer(id: string): boolean {
    const bufferData = this.buffers.get(id);
    if (!bufferData) {
      return false;
    }

    this.context.gl.deleteBuffer(bufferData.buffer);
    this.totalMemory -= bufferData.size;
    this.buffers.delete(id);

    console.log(`Deleted buffer ${id}`);
    return true;
  }

  public getBuffer(id: string): BufferData | undefined {
    return this.buffers.get(id);
  }

  public hasBuffer(id: string): boolean {
    return this.buffers.has(id);
  }

  public getTotalMemory(): number {
    return this.totalMemory;
  }

  public getBufferCount(): number {
    return this.buffers.size;
  }

  public getBufferList(): BufferData[] {
    return Array.from(this.buffers.values());
  }

  // Helper methods for common buffer types
  public createVertexBuffer(
    id: string, 
    vertices: Float32Array, 
    usage: 'static' | 'dynamic' | 'stream' = 'static'
  ): BufferData | null {
    return this.createBuffer(id, vertices.buffer, 'vertex', usage);
  }

  public createIndexBuffer(
    id: string, 
    indices: Uint16Array | Uint32Array, 
    usage: 'static' | 'dynamic' | 'stream' = 'static'
  ): BufferData | null {
    return this.createBuffer(id, indices.buffer, 'index', usage);
  }

  public updateVertexBuffer(id: string, vertices: Float32Array, offset: number = 0): boolean {
    return this.updateBuffer(id, vertices.buffer, offset);
  }

  public updateIndexBuffer(id: string, indices: Uint16Array | Uint32Array, offset: number = 0): boolean {
    return this.updateBuffer(id, indices.buffer, offset);
  }

  // Instanced rendering helpers
  public createInstanceBuffer(
    id: string,
    instanceData: Float32Array,
    usage: 'static' | 'dynamic' | 'stream' = 'dynamic'
  ): BufferData | null {
    return this.createVertexBuffer(id, instanceData, usage);
  }

  public updateInstanceBuffer(id: string, instanceData: Float32Array): boolean {
    return this.updateVertexBuffer(id, instanceData);
  }

  // Batch operations
  public createBufferBatch(buffers: Array<{
    id: string;
    data: ArrayBuffer;
    type?: 'vertex' | 'index' | 'uniform';
    usage?: 'static' | 'dynamic' | 'stream';
  }>): boolean {
    let success = true;
    
    for (const bufferSpec of buffers) {
      const result = this.createBuffer(
        bufferSpec.id,
        bufferSpec.data,
        bufferSpec.type || 'vertex',
        bufferSpec.usage || 'static'
      );
      
      if (!result) {
        success = false;
        console.error(`Failed to create buffer in batch: ${bufferSpec.id}`);
      }
    }

    return success;
  }

  public deleteBufferBatch(ids: string[]): boolean {
    let success = true;
    
    for (const id of ids) {
      if (!this.deleteBuffer(id)) {
        success = false;
      }
    }

    return success;
  }

  // Memory management
  public compactMemory(): void {
    // For WebGL, we can't directly compact memory, but we can:
    // 1. Identify unused buffers
    // 2. Recreate buffers to reduce fragmentation
    console.log('Buffer memory compaction requested - not implemented for WebGL');
  }

  public getMemoryStats(): {
    totalMemory: number;
    bufferCount: number;
    averageBufferSize: number;
    memoryByType: Record<string, number>;
    memoryByUsage: Record<string, number>;
  } {
    const memoryByType: Record<string, number> = {};
    const memoryByUsage: Record<string, number> = {};

    for (const buffer of this.buffers.values()) {
      memoryByType[buffer.type] = (memoryByType[buffer.type] || 0) + buffer.size;
      memoryByUsage[buffer.usage] = (memoryByUsage[buffer.usage] || 0) + buffer.size;
    }

    return {
      totalMemory: this.totalMemory,
      bufferCount: this.buffers.size,
      averageBufferSize: this.buffers.size > 0 ? this.totalMemory / this.buffers.size : 0,
      memoryByType,
      memoryByUsage
    };
  }

  public dispose(): void {
    const gl = this.context.gl;
    
    for (const bufferData of this.buffers.values()) {
      gl.deleteBuffer(bufferData.buffer);
    }
    
    this.buffers.clear();
    this.totalMemory = 0;
    
    console.log('BufferManager disposed');
  }
}
/**
 * GPU Compute Manager - Orchestrates WebGPU and WebGL compute operations
 * Provides unified interface for GPU-accelerated calculations with automatic fallbacks
 */

export interface ComputeDevice {
  readonly type: 'webgpu' | 'webgl2' | 'unsupported';
  readonly supported: boolean;
  readonly capabilities: ComputeCapabilities;
}

export interface ComputeCapabilities {
  readonly maxWorkgroupSize: number;
  readonly maxStorageBufferSize: number;
  readonly supportsFloatTextures: boolean;
  readonly supportsSIMD: boolean;
  readonly supportsAtomics: boolean;
  readonly maxComputeUnitsPerGroup: number;
}

export interface ComputeBuffer {
  readonly id: string;
  readonly size: number;
  readonly usage: 'input' | 'output' | 'uniform';
  dispose(): void;
}

export interface ComputeKernel {
  readonly name: string;
  readonly device: ComputeDevice;
  execute(workgroups: { x: number; y?: number; z?: number }, buffers: ComputeBuffer[]): Promise<ArrayBuffer>;
  dispose(): void;
}

export class GPUComputeManager {
  private device: ComputeDevice | null = null;
  private webgpuDevice: GPUDevice | null = null;
  private webglContext: WebGL2RenderingContext | null = null;
  private kernels = new Map<string, ComputeKernel>();
  private buffers = new Map<string, ComputeBuffer>();

  // Promise caching to prevent race conditions
  private initPromise: Promise<boolean> | null = null;

  async initialize(): Promise<boolean> {
    // Return cached promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized successfully
    if (this.device !== null && this.device.supported) {
      return true;
    }

    // Start initialization and cache the promise
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<boolean> {
    try {
      // Try WebGPU first (best performance)
      if (await this.initializeWebGPU()) {
        console.log('✅ GPU Compute: WebGPU initialized successfully');
        return true;
      }

      // Fallback to WebGL2 compute
      if (await this.initializeWebGL2()) {
        console.log('✅ GPU Compute: WebGL2 compute initialized successfully');
        return true;
      }

      console.warn('⚠️ GPU Compute: No supported compute backends available, using CPU fallback');
      this.device = {
        type: 'unsupported',
        supported: false,
        capabilities: {
          maxWorkgroupSize: 0,
          maxStorageBufferSize: 0,
          supportsFloatTextures: false,
          supportsSIMD: false,
          supportsAtomics: false,
          maxComputeUnitsPerGroup: 0
        }
      };
      return false;
    } catch (error) {
      console.error('❌ GPU Compute initialization failed:', error);
      this.device = {
        type: 'unsupported',
        supported: false,
        capabilities: {
          maxWorkgroupSize: 0,
          maxStorageBufferSize: 0,
          supportsFloatTextures: false,
          supportsSIMD: false,
          supportsAtomics: false,
          maxComputeUnitsPerGroup: 0
        }
      };
      return false;
    }
  }

  private async initializeWebGPU(): Promise<boolean> {
    try {
      if (!('gpu' in navigator)) {
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        return false;
      }

      const device = await adapter.requestDevice();
      this.webgpuDevice = device;

      const limits = adapter.limits;
      this.device = {
        type: 'webgpu',
        supported: true,
        capabilities: {
          maxWorkgroupSize: limits.maxComputeWorkgroupSizeX || 256,
          maxStorageBufferSize: limits.maxStorageBufferBindingSize || 128 * 1024 * 1024,
          supportsFloatTextures: true,
          supportsSIMD: true,
          supportsAtomics: true,
          maxComputeUnitsPerGroup: limits.maxComputeInvocationsPerWorkgroup || 256
        }
      };

      return true;
    } catch (error) {
      console.warn('WebGPU initialization failed:', error);
      return false;
    }
  }

  private async initializeWebGL2(): Promise<boolean> {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', {
        antialias: false,
        preserveDrawingBuffer: false
      });

      if (!gl) {
        return false;
      }

      // Check for required extensions
      const transformFeedback = gl.getExtension('EXT_transform_feedback');
      const textureFloat = gl.getExtension('EXT_color_buffer_float');
      
      if (!transformFeedback) {
        console.warn('WebGL2: Transform feedback not supported');
        return false;
      }

      this.webglContext = gl;
      
      // Get WebGL limits
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const maxVertexUniformVectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);

      this.device = {
        type: 'webgl2',
        supported: true,
        capabilities: {
          maxWorkgroupSize: 1024, // Simulated through vertex shader invocations
          maxStorageBufferSize: maxTextureSize * maxTextureSize * 4, // RGBA32F texture
          supportsFloatTextures: !!textureFloat,
          supportsSIMD: false,
          supportsAtomics: false,
          maxComputeUnitsPerGroup: maxVertexUniformVectors
        }
      };

      return true;
    } catch (error) {
      console.warn('WebGL2 initialization failed:', error);
      return false;
    }
  }

  getDevice(): ComputeDevice | null {
    return this.device;
  }

  // Check if initialization is complete (safe synchronous check)
  isInitialized(): boolean {
    return this.initPromise !== null && this.device !== null;
  }

  // Check if GPU is supported (only call after initialization)
  isSupported(): boolean {
    if (!this.isInitialized()) {
      console.warn('⚠️ GPU Compute: isSupported() called before initialization complete');
      return false;
    }
    return this.device?.supported ?? false;
  }

  // Method for compute modules to wait for initialization
  async waitForInitialization(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }
    // If no init in progress, trigger it
    return this.initialize();
  }

  async createBuffer(size: number, usage: 'input' | 'output' | 'uniform', data?: ArrayBuffer): Promise<ComputeBuffer> {
    if (!this.isSupported()) {
      throw new Error('GPU Compute not supported');
    }

    const id = `buffer_${Date.now()}_${Math.random()}`;

    if (this.device!.type === 'webgpu' && this.webgpuDevice) {
      return await this.createWebGPUBuffer(id, size, usage, data);
    } else if (this.device!.type === 'webgl2' && this.webglContext) {
      return await this.createWebGL2Buffer(id, size, usage, data);
    }

    throw new Error(`Unsupported device type: ${this.device!.type}`);
  }

  private async createWebGPUBuffer(id: string, size: number, usage: 'input' | 'output' | 'uniform', data?: ArrayBuffer): Promise<ComputeBuffer> {
    const device = this.webgpuDevice!;
    
    let gpuUsage = GPUBufferUsage.STORAGE;
    if (usage === 'input') {
      gpuUsage |= GPUBufferUsage.COPY_DST;
    } else if (usage === 'output') {
      gpuUsage |= GPUBufferUsage.COPY_SRC;
    } else if (usage === 'uniform') {
      gpuUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
    }

    const buffer = device.createBuffer({
      size,
      usage: gpuUsage,
      mappedAtCreation: !!data
    });

    if (data) {
      new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data));
      buffer.unmap();
    }

    const computeBuffer: ComputeBuffer = {
      id,
      size,
      usage,
      dispose: () => {
        buffer.destroy();
        this.buffers.delete(id);
      }
    };

    // Store internal buffer reference
    (computeBuffer as any)._internal = buffer;
    this.buffers.set(id, computeBuffer);
    
    return computeBuffer;
  }

  private async createWebGL2Buffer(id: string, size: number, usage: 'input' | 'output' | 'uniform', data?: ArrayBuffer): Promise<ComputeBuffer> {
    const gl = this.webglContext!;
    
    // For WebGL2, we'll use texture-based storage for large data
    const pixelCount = Math.ceil(size / 16); // RGBA32F = 16 bytes per pixel
    const textureSize = Math.ceil(Math.sqrt(pixelCount));
    
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Create texture storage
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureSize, textureSize, 0, gl.RGBA, gl.FLOAT, null);
    
    if (data) {
      // Upload data if provided
      const floatData = new Float32Array(data);
      const paddedData = new Float32Array(textureSize * textureSize * 4);
      paddedData.set(floatData);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureSize, textureSize, gl.RGBA, gl.FLOAT, paddedData);
    }

    const computeBuffer: ComputeBuffer = {
      id,
      size,
      usage,
      dispose: () => {
        gl.deleteTexture(texture);
        this.buffers.delete(id);
      }
    };

    // Store internal texture reference and metadata
    (computeBuffer as any)._internal = { texture, textureSize };
    this.buffers.set(id, computeBuffer);
    
    return computeBuffer;
  }

  async createKernel(name: string, shaderSource: string): Promise<ComputeKernel> {
    if (!this.isSupported()) {
      throw new Error('GPU Compute not supported');
    }

    if (this.device!.type === 'webgpu' && this.webgpuDevice) {
      return await this.createWebGPUKernel(name, shaderSource);
    } else if (this.device!.type === 'webgl2' && this.webglContext) {
      return await this.createWebGL2Kernel(name, shaderSource);
    }

    throw new Error(`Unsupported device type: ${this.device!.type}`);
  }

  private async createWebGPUKernel(name: string, computeShader: string): Promise<ComputeKernel> {
    const device = this.webgpuDevice!;
    
    const shaderModule = device.createShaderModule({
      code: computeShader
    });

    const kernel: ComputeKernel = {
      name,
      device: this.device!,
      execute: async (workgroups: { x: number; y?: number; z?: number }, buffers: ComputeBuffer[]): Promise<ArrayBuffer> => {
        // Create bind group layout
        const bindGroupLayoutEntries: GPUBindGroupLayoutEntry[] = buffers.map((buffer, index) => ({
          binding: index,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: buffer.usage === 'uniform' ? 'uniform' : 'storage' as GPUBufferBindingType }
        }));

        const bindGroupLayout = device.createBindGroupLayout({
          entries: bindGroupLayoutEntries
        });

        const pipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [bindGroupLayout]
        });

        const computePipeline = device.createComputePipeline({
          layout: pipelineLayout,
          compute: {
            module: shaderModule,
            entryPoint: 'main'
          }
        });

        // Create bind group
        const bindGroupEntries: GPUBindGroupEntry[] = buffers.map((buffer, index) => ({
          binding: index,
          resource: { buffer: (buffer as any)._internal }
        }));

        const bindGroup = device.createBindGroup({
          layout: bindGroupLayout,
          entries: bindGroupEntries
        });

        // Execute compute pass
        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(workgroups.x, workgroups.y || 1, workgroups.z || 1);
        passEncoder.end();

        // Read back result (assuming first output buffer)
        const outputBuffer = buffers.find(b => b.usage === 'output');
        if (outputBuffer) {
          const readBuffer = device.createBuffer({
            size: outputBuffer.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
          });

          commandEncoder.copyBufferToBuffer(
            (outputBuffer as any)._internal,
            0,
            readBuffer,
            0,
            outputBuffer.size
          );

          device.queue.submit([commandEncoder.finish()]);

          await readBuffer.mapAsync(GPUMapMode.READ);
          const result = readBuffer.getMappedRange();
          const data = new ArrayBuffer(result.byteLength);
          new Uint8Array(data).set(new Uint8Array(result));
          readBuffer.unmap();
          readBuffer.destroy();
          
          return data;
        }

        device.queue.submit([commandEncoder.finish()]);
        return new ArrayBuffer(0);
      },
      dispose: () => {
        // WebGPU resources are automatically cleaned up
        this.kernels.delete(name);
      }
    };

    this.kernels.set(name, kernel);
    return kernel;
  }

  private async createWebGL2Kernel(name: string, fragmentShader: string): Promise<ComputeKernel> {
    const gl = this.webglContext!;
    
    // Create vertex shader for fullscreen quad
    const vertexShaderSource = `#version 300 es
      precision highp float;
      
      in vec2 a_position;
      out vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = (a_position + 1.0) * 0.5;
      }
    `;

    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShaderCompiled = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShaderCompiled);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`WebGL2 kernel compilation failed: ${info}`);
    }

    const kernel: ComputeKernel = {
      name,
      device: this.device!,
      execute: async (workgroups: { x: number; y?: number; z?: number }, buffers: ComputeBuffer[]): Promise<ArrayBuffer> => {
        gl.useProgram(program);

        // Set up framebuffer for output
        const outputBuffer = buffers.find(b => b.usage === 'output');
        if (!outputBuffer) {
          throw new Error('No output buffer provided');
        }

        const { textureSize } = (outputBuffer as any)._internal;
        
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, (outputBuffer as any)._internal.texture, 0);

        gl.viewport(0, 0, textureSize, textureSize);

        // Bind input textures
        buffers.forEach((buffer, index) => {
          if (buffer.usage === 'input') {
            gl.activeTexture(gl.TEXTURE0 + index);
            gl.bindTexture(gl.TEXTURE_2D, (buffer as any)._internal.texture);
            const location = gl.getUniformLocation(program, `u_input${index}`);
            gl.uniform1i(location, index);
          }
        });

        // Draw fullscreen quad
        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -1, -1,  1, -1,  -1, 1,  1, 1
        ]), gl.STATIC_DRAW);

        const positionAttribute = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionAttribute);
        gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Read back result
        const pixels = new Float32Array(textureSize * textureSize * 4);
        gl.readPixels(0, 0, textureSize, textureSize, gl.RGBA, gl.FLOAT, pixels);

        // Cleanup
        gl.deleteFramebuffer(framebuffer);
        gl.deleteBuffer(quadBuffer);

        return pixels.buffer;
      },
      dispose: () => {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShaderCompiled);
        this.kernels.delete(name);
      }
    };

    this.kernels.set(name, kernel);
    return kernel;
  }

  private compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${info}`);
    }

    return shader;
  }

  async readBuffer(buffer: ComputeBuffer): Promise<ArrayBuffer> {
    if (!this.isSupported()) {
      throw new Error('GPU Compute not supported');
    }

    if (this.device!.type === 'webgpu' && this.webgpuDevice) {
      const device = this.webgpuDevice;
      const readBuffer = device.createBuffer({
        size: buffer.size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      });

      const commandEncoder = device.createCommandEncoder();
      commandEncoder.copyBufferToBuffer(
        (buffer as any)._internal,
        0,
        readBuffer,
        0,
        buffer.size
      );

      device.queue.submit([commandEncoder.finish()]);

      await readBuffer.mapAsync(GPUMapMode.READ);
      const result = readBuffer.getMappedRange();
      const data = new ArrayBuffer(result.byteLength);
      new Uint8Array(data).set(new Uint8Array(result));
      readBuffer.unmap();
      readBuffer.destroy();
      
      return data;
    } else if (this.device!.type === 'webgl2' && this.webglContext) {
      const gl = this.webglContext;
      const { texture, textureSize } = (buffer as any)._internal;
      
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

      const pixels = new Float32Array(textureSize * textureSize * 4);
      gl.readPixels(0, 0, textureSize, textureSize, gl.RGBA, gl.FLOAT, pixels);

      gl.deleteFramebuffer(framebuffer);
      
      return pixels.buffer.slice(0, buffer.size);
    }

    throw new Error(`Unsupported device type: ${this.device!.type}`);
  }

  dispose(): void {
    // Dispose all kernels
    for (const kernel of this.kernels.values()) {
      kernel.dispose();
    }
    this.kernels.clear();

    // Dispose all buffers
    for (const buffer of this.buffers.values()) {
      buffer.dispose();
    }
    this.buffers.clear();

    // Cleanup device resources
    if (this.webgpuDevice) {
      this.webgpuDevice.destroy();
      this.webgpuDevice = null;
    }

    this.webglContext = null;
    this.device = null;
    this.initPromise = null;
  }

  getStats(): {
    device: ComputeDevice | null;
    kernelCount: number;
    bufferCount: number;
    totalBufferSize: number;
  } {
    const totalBufferSize = Array.from(this.buffers.values())
      .reduce((sum, buffer) => sum + buffer.size, 0);

    return {
      device: this.device,
      kernelCount: this.kernels.size,
      bufferCount: this.buffers.size,
      totalBufferSize
    };
  }
}

// Singleton instance with Promise caching
let computeManager: GPUComputeManager | null = null;
let initPromise: Promise<GPUComputeManager> | null = null;

export async function getGPUComputeManager(): Promise<GPUComputeManager> {
  // Return existing manager if fully initialized
  if (computeManager && computeManager.isInitialized()) {
    return computeManager;
  }

  // Return in-flight initialization promise if exists
  if (initPromise) {
    return initPromise;
  }

  // Start initialization
  initPromise = (async () => {
    computeManager = new GPUComputeManager();
    await computeManager.initialize();
    return computeManager;
  })();

  return initPromise;
}

// Safe synchronous check
export function isGPUComputeInitialized(): boolean {
  return computeManager?.isInitialized() ?? false;
}

// Check if GPU compute is available (only call after initialization)
export function isGPUComputeAvailable(): boolean {
  if (!isGPUComputeInitialized()) {
    // Don't warn here - this is expected to be called before init
    return false;
  }
  return computeManager!.isSupported();
}
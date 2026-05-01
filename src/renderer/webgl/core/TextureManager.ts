/**
 * Texture Manager - Handles WebGL texture creation, management, and atlasing
 */

import { WebGLContext } from './WebGLContext';
import { TextureData } from '../types';

interface TextureAtlas {
  id: string;
  texture: WebGLTexture;
  width: number;
  height: number;
  used: boolean[][];
  regions: Map<string, {
    x: number;
    y: number;
    width: number;
    height: number;
    u1: number;
    v1: number;
    u2: number;
    v2: number;
  }>;
}

export class TextureManager {
  private context: WebGLContext;
  private textures: Map<string, TextureData> = new Map();
  private atlases: Map<string, TextureAtlas> = new Map();
  private totalMemory: number = 0;
  private maxTextureSize: number;

  constructor(context: WebGLContext) {
    this.context = context;
    this.maxTextureSize = context.getMaxTextureSize();
  }

  public createTexture(
    id: string,
    width: number,
    height: number,
    data?: ArrayBufferView,
    format: number = WebGL2RenderingContext.RGBA,
    type: number = WebGL2RenderingContext.UNSIGNED_BYTE
  ): TextureData | null {
    const gl = this.context.gl;

    // Delete existing texture if it exists
    this.deleteTexture(id);

    const texture = gl.createTexture();
    if (!texture) {
      console.error(`Failed to create texture: ${id}`);
      return null;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Upload texture data
    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, data || null);

    if (!this.context.validateGLError(`Creating texture ${id}`)) {
      gl.deleteTexture(texture);
      return null;
    }

    const textureData: TextureData = {
      id,
      texture,
      width,
      height,
      format,
      type,
      mipMaps: false,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR
    };

    this.textures.set(id, textureData);
    this.totalMemory += this.calculateTextureMemory(width, height, format, type);

    console.log(`Created texture ${id}: ${width}x${height}`);
    return textureData;
  }

  public createTextureFromImage(id: string, image: HTMLImageElement | HTMLCanvasElement): TextureData | null {
    const gl = this.context.gl;

    const texture = gl.createTexture();
    if (!texture) {
      console.error(`Failed to create texture from image: ${id}`);
      return null;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Upload image data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Use mipmaps if the image is a power of 2
    if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    if (!this.context.validateGLError(`Creating texture from image ${id}`)) {
      gl.deleteTexture(texture);
      return null;
    }

    const textureData: TextureData = {
      id,
      texture,
      width: image.width,
      height: image.height,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      mipMaps: this.isPowerOf2(image.width) && this.isPowerOf2(image.height),
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR
    };

    this.textures.set(id, textureData);
    this.totalMemory += this.calculateTextureMemory(image.width, image.height, gl.RGBA, gl.UNSIGNED_BYTE);

    return textureData;
  }

  public createTextureAtlas(id: string, width: number, height: number): TextureAtlas | null {
    // Create a texture atlas for packing multiple smaller textures
    const textureData = this.createTexture(id, width, height);
    if (!textureData) {
      return null;
    }

    const atlas: TextureAtlas = {
      id,
      texture: textureData.texture,
      width,
      height,
      used: Array(height).fill(null).map(() => Array(width).fill(false)),
      regions: new Map()
    };

    this.atlases.set(id, atlas);
    return atlas;
  }

  public addToAtlas(
    atlasId: string, 
    regionId: string, 
    image: HTMLImageElement | HTMLCanvasElement,
    padding: number = 1
  ): { u1: number, v1: number, u2: number, v2: number } | null {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) {
      console.error(`Atlas not found: ${atlasId}`);
      return null;
    }

    // Find available space in atlas
    const pos = this.findAtlasSpace(atlas, image.width + padding * 2, image.height + padding * 2);
    if (!pos) {
      console.warn(`No space in atlas ${atlasId} for ${regionId} (${image.width}x${image.height})`);
      return null;
    }

    const gl = this.context.gl;
    gl.bindTexture(gl.TEXTURE_2D, atlas.texture);

    // Upload image to atlas at position
    gl.texSubImage2D(
      gl.TEXTURE_2D, 
      0, 
      pos.x + padding, 
      pos.y + padding, 
      gl.RGBA, 
      gl.UNSIGNED_BYTE, 
      image
    );

    // Mark space as used
    this.markAtlasSpaceUsed(atlas, pos.x, pos.y, image.width + padding * 2, image.height + padding * 2);

    // Calculate UV coordinates
    const u1 = (pos.x + padding) / atlas.width;
    const v1 = (pos.y + padding) / atlas.height;
    const u2 = (pos.x + padding + image.width) / atlas.width;
    const v2 = (pos.y + padding + image.height) / atlas.height;

    const region = {
      x: pos.x + padding,
      y: pos.y + padding,
      width: image.width,
      height: image.height,
      u1, v1, u2, v2
    };

    atlas.regions.set(regionId, region);

    console.log(`Added ${regionId} to atlas ${atlasId} at (${pos.x}, ${pos.y})`);
    return { u1, v1, u2, v2 };
  }

  private findAtlasSpace(atlas: TextureAtlas, width: number, height: number): { x: number, y: number } | null {
    // Simple first-fit algorithm
    for (let y = 0; y <= atlas.height - height; y++) {
      for (let x = 0; x <= atlas.width - width; x++) {
        if (this.isAtlasSpaceAvailable(atlas, x, y, width, height)) {
          return { x, y };
        }
      }
    }
    return null;
  }

  private isAtlasSpaceAvailable(atlas: TextureAtlas, x: number, y: number, width: number, height: number): boolean {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        if (atlas.used[y + dy] && atlas.used[y + dy][x + dx]) {
          return false;
        }
      }
    }
    return true;
  }

  private markAtlasSpaceUsed(atlas: TextureAtlas, x: number, y: number, width: number, height: number): void {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        atlas.used[y + dy][x + dx] = true;
      }
    }
  }

  public bindTexture(id: string, unit: number = 0): boolean {
    const textureData = this.textures.get(id);
    if (!textureData) {
      console.error(`Texture not found: ${id}`);
      return false;
    }

    const gl = this.context.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, textureData.texture);

    return true;
  }

  public deleteTexture(id: string): boolean {
    const textureData = this.textures.get(id);
    if (!textureData) {
      return false;
    }

    this.context.gl.deleteTexture(textureData.texture);
    this.totalMemory -= this.calculateTextureMemory(
      textureData.width, 
      textureData.height, 
      textureData.format, 
      textureData.type
    );
    this.textures.delete(id);

    // Remove from atlas if it was part of one
    for (const atlas of this.atlases.values()) {
      if (atlas.regions.has(id)) {
        atlas.regions.delete(id);
      }
    }

    console.log(`Deleted texture ${id}`);
    return true;
  }

  public getTexture(id: string): TextureData | undefined {
    return this.textures.get(id);
  }

  public hasTexture(id: string): boolean {
    return this.textures.has(id);
  }

  public getAtlas(id: string): TextureAtlas | undefined {
    return this.atlases.get(id);
  }

  public getAtlasRegion(atlasId: string, regionId: string) {
    const atlas = this.atlases.get(atlasId);
    return atlas?.regions.get(regionId);
  }

  private calculateTextureMemory(width: number, height: number, format: number, type: number): number {
    let bytesPerPixel = 4; // Default RGBA
    
    // Simplified calculation - WebGL format/type combinations are complex
    if (format === WebGL2RenderingContext.RGB) {
      bytesPerPixel = 3;
    } else if (format === WebGL2RenderingContext.LUMINANCE) {
      bytesPerPixel = 1;
    } else if (format === WebGL2RenderingContext.LUMINANCE_ALPHA) {
      bytesPerPixel = 2;
    }

    if (type === WebGL2RenderingContext.FLOAT) {
      bytesPerPixel *= 4;
    } else if (type === WebGL2RenderingContext.HALF_FLOAT) {
      bytesPerPixel *= 2;
    }

    return width * height * bytesPerPixel;
  }

  private isPowerOf2(value: number): boolean {
    return (value & (value - 1)) === 0;
  }

  public getTotalMemory(): number {
    return this.totalMemory;
  }

  public getTextureCount(): number {
    return this.textures.size;
  }

  public getAtlasCount(): number {
    return this.atlases.size;
  }

  public getMemoryStats(): {
    totalMemory: number;
    textureCount: number;
    atlasCount: number;
    averageTextureSize: number;
    largestTexture: { id: string; size: number } | null;
  } {
    let largestTexture: { id: string; size: number } | null = null;
    let largestSize = 0;

    for (const texture of this.textures.values()) {
      const size = this.calculateTextureMemory(texture.width, texture.height, texture.format, texture.type);
      if (size > largestSize) {
        largestSize = size;
        largestTexture = { id: texture.id, size };
      }
    }

    return {
      totalMemory: this.totalMemory,
      textureCount: this.textures.size,
      atlasCount: this.atlases.size,
      averageTextureSize: this.textures.size > 0 ? this.totalMemory / this.textures.size : 0,
      largestTexture
    };
  }

  // Utility methods for common texture operations
  public createColorTexture(id: string, color: { r: number, g: number, b: number, a: number }): TextureData | null {
    const data = new Uint8Array([
      Math.floor(color.r * 255),
      Math.floor(color.g * 255),
      Math.floor(color.b * 255),
      Math.floor(color.a * 255)
    ]);

    return this.createTexture(id, 1, 1, data);
  }

  public createTextTexture(id: string, text: string, fontSize: number = 16, color: string = '#000000'): TextureData | null {
    // Create a canvas for text rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set font and measure text
    ctx.font = `${fontSize}px Arial`;
    const metrics = ctx.measureText(text);
    const width = Math.ceil(metrics.width) + 4; // Add padding
    const height = fontSize + 4; // Add padding

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Configure context
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Clear and draw text
    ctx.clearRect(0, 0, width, height);
    ctx.fillText(text, 2, 2);

    return this.createTextureFromImage(id, canvas);
  }

  public dispose(): void {
    const gl = this.context.gl;
    
    // Delete all textures
    for (const textureData of this.textures.values()) {
      gl.deleteTexture(textureData.texture);
    }
    
    this.textures.clear();
    this.atlases.clear();
    this.totalMemory = 0;
    
    console.log('TextureManager disposed');
  }
}
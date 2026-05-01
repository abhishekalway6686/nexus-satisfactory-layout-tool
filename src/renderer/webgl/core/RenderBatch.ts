/**
 * Render Batch - Batches rendering operations for efficient GPU utilization
 */

import { WebGLContext } from './WebGLContext';
import { BufferManager } from './BufferManager';
import { Matrix4, RectRenderable, CircleRenderable, LineRenderable, PathRenderable, TextRenderable, ArrowRenderable, RingRenderable, ArcRenderable, ImageRenderable } from '../types';

interface BatchEntry {
  type: string;
  renderable: any;
  modelMatrix: Matrix4;
}

interface VertexData {
  positions: Float32Array;
  colors: Float32Array;
  texCoords?: Float32Array;
  indices: Uint16Array | Uint32Array;
  vertexCount: number;
  indexCount: number;
}

export class RenderBatch {
  private context: WebGLContext;
  private bufferManager: BufferManager;
  private batches: Map<string, BatchEntry[]> = new Map();
  private globalOpacity: number = 1.0;
  
  // Batch limits
  private maxVerticesPerBatch: number = 65536;
  private maxIndicesPerBatch: number = 98304; // 1.5 * maxVertices

  constructor(context: WebGLContext, bufferManager: BufferManager) {
    this.context = context;
    this.bufferManager = bufferManager;
  }

  public reset(): void {
    // Clear all batches for the new frame
    for (const batch of this.batches.values()) {
      batch.length = 0;
    }
  }

  public setGlobalOpacity(opacity: number): void {
    this.globalOpacity = Math.max(0, Math.min(1, opacity));
  }

  // Add methods for each renderable type
  public addRect(rect: RectRenderable, modelMatrix: Matrix4): void {
    this.addToBatch('rect', { renderable: rect, modelMatrix });
  }

  public addCircle(circle: CircleRenderable, modelMatrix: Matrix4): void {
    this.addToBatch('circle', { renderable: circle, modelMatrix });
  }

  public addLine(line: LineRenderable, modelMatrix: Matrix4): void {
    this.addToBatch('line', { renderable: line, modelMatrix });
  }

  public addPath(path: PathRenderable, modelMatrix: Matrix4): void {
    this.addToBatch('path', { renderable: path, modelMatrix });
  }

  public addText(text: TextRenderable, modelMatrix: Matrix4): void {
    this.addToBatch('text', { renderable: text, modelMatrix });
  }

  public addArrow(arrow: ArrowRenderable, modelMatrix: Matrix4): void {
    this.addToBatch('arrow', { renderable: arrow, modelMatrix });
  }

  public addRing(ring: RingRenderable, modelMatrix: Matrix4): void {
    this.addToBatch('ring', { renderable: ring, modelMatrix });
  }

  public addArc(arc: ArcRenderable, modelMatrix: Matrix4): void {
    this.addToBatch('arc', { renderable: arc, modelMatrix });
  }

  public addImage(image: ImageRenderable, modelMatrix: Matrix4): void {
    this.addToBatch('image', { renderable: image, modelMatrix });
  }

  private addToBatch(type: string, entry: { renderable: any; modelMatrix: Matrix4 }): void {
    if (!this.batches.has(type)) {
      this.batches.set(type, []);
    }

    const batch = this.batches.get(type)!;
    batch.push({
      type,
      renderable: entry.renderable,
      modelMatrix: entry.modelMatrix
    });

    // Check if we need to flush this batch type
    if (this.shouldFlushBatch(type, batch)) {
      this.flushBatch(type);
    }
  }

  private shouldFlushBatch(type: string, batch: BatchEntry[]): boolean {
    // Estimate vertex count for this batch type
    const estimatedVertices = this.estimateVertexCount(type, batch.length);
    return estimatedVertices >= this.maxVerticesPerBatch;
  }

  private estimateVertexCount(type: string, count: number): number {
    switch (type) {
      case 'rect':
        return count * 4; // 4 vertices per rectangle
      case 'circle':
        return count * 32; // Approximate circle with 32 segments
      case 'line':
        return count * 2; // 2 vertices per line segment (simplified)
      case 'text':
        return count * 4; // 4 vertices per character (simplified)
      default:
        return count * 4; // Default estimate
    }
  }

  public flush(): void {
    // Flush all batch types
    for (const type of this.batches.keys()) {
      this.flushBatch(type);
    }
  }

  private flushBatch(type: string): void {
    const batch = this.batches.get(type);
    if (!batch || batch.length === 0) {
      return;
    }

    // Generate vertex data for this batch
    const vertexData = this.generateVertexData(type, batch);
    if (!vertexData) {
      console.warn(`Failed to generate vertex data for batch type: ${type}`);
      batch.length = 0;
      return;
    }

    // Render the batch
    this.renderBatch(type, vertexData);

    // Clear the batch
    batch.length = 0;
  }

  private generateVertexData(type: string, batch: BatchEntry[]): VertexData | null {
    switch (type) {
      case 'rect':
        return this.generateRectVertexData(batch);
      case 'circle':
        return this.generateCircleVertexData(batch);
      case 'line':
        return this.generateLineVertexData(batch);
      case 'text':
        return this.generateTextVertexData(batch);
      default:
        console.warn(`Vertex data generation not implemented for type: ${type}`);
        return null;
    }
  }

  private generateRectVertexData(batch: BatchEntry[]): VertexData {
    const vertexCount = batch.length * 4;
    const indexCount = batch.length * 6;
    
    const positions = new Float32Array(vertexCount * 2);
    const colors = new Float32Array(vertexCount * 4);
    const indices = new Uint16Array(indexCount);

    let vertexIndex = 0;
    let indexIndex = 0;

    for (let i = 0; i < batch.length; i++) {
      const entry = batch[i];
      const rect = entry.renderable as RectRenderable;
      
      // Calculate rectangle corners
      const halfWidth = rect.width * 0.5;
      const halfHeight = rect.height * 0.5;
      
      const corners = [
        [-halfWidth, -halfHeight], // Bottom-left
        [halfWidth, -halfHeight],  // Bottom-right
        [halfWidth, halfHeight],   // Top-right
        [-halfWidth, halfHeight]   // Top-left
      ];

      // Transform corners by model matrix
      const m = entry.modelMatrix.elements;
      
      for (let j = 0; j < 4; j++) {
        const [x, y] = corners[j];
        
        // Apply transformation
        const tx = m[0] * x + m[4] * y + m[12];
        const ty = m[1] * x + m[5] * y + m[13];
        
        // Set position
        positions[vertexIndex * 2] = tx;
        positions[vertexIndex * 2 + 1] = ty;
        
        // Set color (with global opacity)
        const color = rect.fill?.color || rect.color;
        colors[vertexIndex * 4] = color.r;
        colors[vertexIndex * 4 + 1] = color.g;
        colors[vertexIndex * 4 + 2] = color.b;
        colors[vertexIndex * 4 + 3] = color.a * rect.opacity * this.globalOpacity;
        
        vertexIndex++;
      }

      // Set indices for two triangles
      const baseIndex = i * 4;
      indices[indexIndex++] = baseIndex;
      indices[indexIndex++] = baseIndex + 1;
      indices[indexIndex++] = baseIndex + 2;
      indices[indexIndex++] = baseIndex;
      indices[indexIndex++] = baseIndex + 2;
      indices[indexIndex++] = baseIndex + 3;
    }

    return {
      positions,
      colors,
      indices,
      vertexCount,
      indexCount
    };
  }

  private generateCircleVertexData(batch: BatchEntry[]): VertexData {
    const segments = 32;
    const vertexCount = batch.length * (segments + 1); // Center + circumference
    const indexCount = batch.length * segments * 3; // Triangles from center
    
    const positions = new Float32Array(vertexCount * 2);
    const colors = new Float32Array(vertexCount * 4);
    const indices = new Uint16Array(indexCount);

    let vertexIndex = 0;
    let indexIndex = 0;

    for (let i = 0; i < batch.length; i++) {
      const entry = batch[i];
      const circle = entry.renderable as CircleRenderable;
      const m = entry.modelMatrix.elements;
      
      // Center vertex
      const centerX = m[12];
      const centerY = m[13];
      positions[vertexIndex * 2] = centerX;
      positions[vertexIndex * 2 + 1] = centerY;
      
      const color = circle.fill?.color || circle.color;
      colors[vertexIndex * 4] = color.r;
      colors[vertexIndex * 4 + 1] = color.g;
      colors[vertexIndex * 4 + 2] = color.b;
      colors[vertexIndex * 4 + 3] = color.a * circle.opacity * this.globalOpacity;
      
      const centerIndex = vertexIndex;
      vertexIndex++;

      // Circumference vertices
      for (let j = 0; j < segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        const x = Math.cos(angle) * circle.radius;
        const y = Math.sin(angle) * circle.radius;
        
        // Transform point
        const tx = m[0] * x + m[4] * y + m[12];
        const ty = m[1] * x + m[5] * y + m[13];
        
        positions[vertexIndex * 2] = tx;
        positions[vertexIndex * 2 + 1] = ty;
        
        colors[vertexIndex * 4] = color.r;
        colors[vertexIndex * 4 + 1] = color.g;
        colors[vertexIndex * 4 + 2] = color.b;
        colors[vertexIndex * 4 + 3] = color.a * circle.opacity * this.globalOpacity;
        
        vertexIndex++;
      }

      // Generate indices for triangles
      for (let j = 0; j < segments; j++) {
        indices[indexIndex++] = centerIndex;
        indices[indexIndex++] = centerIndex + 1 + j;
        indices[indexIndex++] = centerIndex + 1 + ((j + 1) % segments);
      }
    }

    return {
      positions,
      colors,
      indices,
      vertexCount,
      indexCount
    };
  }

  private generateLineVertexData(batch: BatchEntry[]): VertexData {
    // Simplified line rendering - each line becomes a thin rectangle
    let totalVertices = 0;
    let totalIndices = 0;

    // Count total vertices and indices needed
    for (const entry of batch) {
      const line = entry.renderable as LineRenderable;
      if (line.points.length >= 2) {
        const segments = line.points.length - 1;
        totalVertices += segments * 4; // 4 vertices per segment
        totalIndices += segments * 6; // 6 indices per segment
      }
    }

    const positions = new Float32Array(totalVertices * 2);
    const colors = new Float32Array(totalVertices * 4);
    const indices = new Uint16Array(totalIndices);

    let vertexIndex = 0;
    let indexIndex = 0;

    for (const entry of batch) {
      const line = entry.renderable as LineRenderable;
      const m = entry.modelMatrix.elements;
      const strokeWidth = line.stroke.width * 0.5;

      for (let i = 0; i < line.points.length - 1; i++) {
        const p1 = line.points[i];
        const p2 = line.points[i + 1];

        // Calculate perpendicular vector
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) continue;

        const nx = -dy / length * strokeWidth;
        const ny = dx / length * strokeWidth;

        // Four corners of the line segment rectangle
        const corners = [
          [p1.x + nx, p1.y + ny],
          [p1.x - nx, p1.y - ny],
          [p2.x - nx, p2.y - ny],
          [p2.x + nx, p2.y + ny]
        ];

        const baseIndex = vertexIndex;

        // Transform and set vertices
        for (const [x, y] of corners) {
          const tx = m[0] * x + m[4] * y + m[12];
          const ty = m[1] * x + m[5] * y + m[13];
          
          positions[vertexIndex * 2] = tx;
          positions[vertexIndex * 2 + 1] = ty;
          
          colors[vertexIndex * 4] = line.stroke.color.r;
          colors[vertexIndex * 4 + 1] = line.stroke.color.g;
          colors[vertexIndex * 4 + 2] = line.stroke.color.b;
          colors[vertexIndex * 4 + 3] = line.stroke.color.a * line.opacity * this.globalOpacity;
          
          vertexIndex++;
        }

        // Set indices
        indices[indexIndex++] = baseIndex;
        indices[indexIndex++] = baseIndex + 1;
        indices[indexIndex++] = baseIndex + 2;
        indices[indexIndex++] = baseIndex;
        indices[indexIndex++] = baseIndex + 2;
        indices[indexIndex++] = baseIndex + 3;
      }
    }

    return {
      positions,
      colors,
      indices,
      vertexCount: totalVertices,
      indexCount: totalIndices
    };
  }

  private generateTextVertexData(batch: BatchEntry[]): VertexData {
    // Simplified text rendering - each character becomes a textured quad
    // This is a placeholder implementation
    const vertexCount = batch.length * 4;
    const indexCount = batch.length * 6;
    
    const positions = new Float32Array(vertexCount * 2);
    const colors = new Float32Array(vertexCount * 4);
    const texCoords = new Float32Array(vertexCount * 2);
    const indices = new Uint16Array(indexCount);

    let vertexIndex = 0;
    let indexIndex = 0;

    for (let i = 0; i < batch.length; i++) {
      const entry = batch[i];
      const text = entry.renderable as TextRenderable;
      const m = entry.modelMatrix.elements;
      
      // Simplified: treat each text as a single quad
      const width = text.fontSize * text.text.length * 0.6; // Rough estimate
      const height = text.fontSize;
      
      const corners = [
        [-width * 0.5, -height * 0.5, 0, 0],
        [width * 0.5, -height * 0.5, 1, 0],
        [width * 0.5, height * 0.5, 1, 1],
        [-width * 0.5, height * 0.5, 0, 1]
      ];

      for (let j = 0; j < 4; j++) {
        const [x, y, u, v] = corners[j];
        
        const tx = m[0] * x + m[4] * y + m[12];
        const ty = m[1] * x + m[5] * y + m[13];
        
        positions[vertexIndex * 2] = tx;
        positions[vertexIndex * 2 + 1] = ty;
        
        texCoords[vertexIndex * 2] = u;
        texCoords[vertexIndex * 2 + 1] = v;
        
        const color = text.fill?.color || { r: 0, g: 0, b: 0, a: 1 };
        colors[vertexIndex * 4] = color.r;
        colors[vertexIndex * 4 + 1] = color.g;
        colors[vertexIndex * 4 + 2] = color.b;
        colors[vertexIndex * 4 + 3] = color.a * text.opacity * this.globalOpacity;
        
        vertexIndex++;
      }

      const baseIndex = i * 4;
      indices[indexIndex++] = baseIndex;
      indices[indexIndex++] = baseIndex + 1;
      indices[indexIndex++] = baseIndex + 2;
      indices[indexIndex++] = baseIndex;
      indices[indexIndex++] = baseIndex + 2;
      indices[indexIndex++] = baseIndex + 3;
    }

    return {
      positions,
      colors,
      texCoords,
      indices,
      vertexCount,
      indexCount
    };
  }

  private renderBatch(type: string, vertexData: VertexData): void {
    // This is where the actual WebGL rendering happens
    // For now, this is a placeholder that would use the shader manager
    // and buffer manager to actually draw to the screen
    
    // The implementation would:
    // 1. Select appropriate shader program
    // 2. Upload vertex data to buffers
    // 3. Set uniforms
    // 4. Draw arrays/elements
    
    console.log(`Rendering batch of type ${type}: ${vertexData.vertexCount} vertices, ${vertexData.indexCount} indices`);
  }

  public getBatchStats(): {
    totalBatches: number;
    batchTypes: Record<string, number>;
    totalRenderables: number;
  } {
    const batchTypes: Record<string, number> = {};
    let totalRenderables = 0;

    for (const [type, batch] of this.batches) {
      batchTypes[type] = batch.length;
      totalRenderables += batch.length;
    }

    return {
      totalBatches: this.batches.size,
      batchTypes,
      totalRenderables
    };
  }

  public dispose(): void {
    this.reset();
    console.log('RenderBatch disposed');
  }
}
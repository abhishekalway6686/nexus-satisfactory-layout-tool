/**
 * WebGL Adapter - GPU-accelerated rendering bridge for the renderer abstraction
 * Provides high-performance WebGL rendering while maintaining React component compatibility
 */

import React, { ReactNode, useEffect, useRef } from 'react';
import { 
  RendererAdapter, 
  AdapterStageProps, 
  AdapterLayerProps, 
  AdapterGroupProps,
  AdapterRectProps,
  AdapterCircleProps,
  AdapterLineProps,
  AdapterTextProps,
  BatchedOperation
} from './RendererAdapter';
import { RendererInterface } from '../RendererInterface';

// WebGL-specific interfaces
interface WebGLRenderItem {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'text' | 'group';
  props: any;
  transform: {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  };
  visible: boolean;
  layer: string;
  zIndex: number;
}

interface GPUBatch {
  type: 'rect' | 'circle' | 'line';
  items: WebGLRenderItem[];
  buffer: Float32Array;
  vertexCount: number;
  dirty: boolean;
}

export class WebGLAdapter extends RendererAdapter {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private renderItems: Map<string, WebGLRenderItem> = new Map();
  private batches: Map<string, GPUBatch> = new Map();
  private shaderPrograms: Map<string, WebGLProgram> = new Map();
  private animationFrameId: number | null = null;
  private needsRedraw: boolean = true;

  constructor(renderer: RendererInterface) {
    super(renderer);
    this.enableInstancedRendering({
      enabled: true,
      maxInstances: 10000,
      bufferSize: 8192,
      updateFrequency: 8 // Higher frequency for smoother GPU updates
    });
  }

  createStage(props: AdapterStageProps): ReactNode {
    const { width, height, events, children } = props;

    return (
      <div style={{ position: 'relative', width, height }}>
        <canvas
          ref={this.setupCanvas}
          width={width}
          height={height}
          style={{ position: 'absolute', top: 0, left: 0 }}
          onWheel={events?.onWheel}
          onMouseDown={events?.onPointerDown}
          onMouseMove={events?.onPointerMove}
          onMouseUp={events?.onPointerUp}
          onTouchStart={events?.onPointerDown}
          onTouchMove={events?.onPointerMove}
          onTouchEnd={events?.onPointerUp}
          onContextMenu={events?.onContextMenu}
        />
        {/* Overlay for React children that need DOM interaction */}
        <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          {children}
        </div>
      </div>
    );
  }

  createLayer(props: AdapterLayerProps): ReactNode {
    // For WebGL, layers are virtual - we handle them in the render loop
    // Return a fragment to maintain React structure
    return <>{props.children}</>;
  }

  createGroup(props: AdapterGroupProps): ReactNode {
    const { children, id, ...groupProps } = props;
    
    // Register group with GPU renderer
    this.addRenderItem({
      id: id || `group-${Math.random()}`,
      type: 'group',
      props: groupProps,
      transform: {
        x: groupProps.x || 0,
        y: groupProps.y || 0,
        rotation: groupProps.rotation || 0,
        scaleX: groupProps.scaleX || 1,
        scaleY: groupProps.scaleY || 1
      },
      visible: groupProps.visible !== false,
      layer: 'default',
      zIndex: groupProps.zIndex || 0
    });

    // Return children for React tree
    return <>{children}</>;
  }

  createRect(props: AdapterRectProps): ReactNode {
    const { id, ...rectProps } = props;
    
    this.addRenderItem({
      id: id || `rect-${Math.random()}`,
      type: 'rect',
      props: rectProps,
      transform: {
        x: rectProps.x || 0,
        y: rectProps.y || 0,
        rotation: rectProps.rotation || 0,
        scaleX: rectProps.scaleX || 1,
        scaleY: rectProps.scaleY || 1
      },
      visible: rectProps.visible !== false,
      layer: 'default',
      zIndex: rectProps.zIndex || 0
    });

    // Return null - rendered by GPU
    return null;
  }

  createCircle(props: AdapterCircleProps): ReactNode {
    const { id, ...circleProps } = props;
    
    this.addRenderItem({
      id: id || `circle-${Math.random()}`,
      type: 'circle',
      props: circleProps,
      transform: {
        x: circleProps.x || 0,
        y: circleProps.y || 0,
        rotation: circleProps.rotation || 0,
        scaleX: circleProps.scaleX || 1,
        scaleY: circleProps.scaleY || 1
      },
      visible: circleProps.visible !== false,
      layer: 'default',
      zIndex: circleProps.zIndex || 0
    });

    return null;
  }

  createLine(props: AdapterLineProps): ReactNode {
    const { id, ...lineProps } = props;
    
    this.addRenderItem({
      id: id || `line-${Math.random()}`,
      type: 'line',
      props: lineProps,
      transform: {
        x: lineProps.x || 0,
        y: lineProps.y || 0,
        rotation: lineProps.rotation || 0,
        scaleX: lineProps.scaleX || 1,
        scaleY: lineProps.scaleY || 1
      },
      visible: lineProps.visible !== false,
      layer: 'default',
      zIndex: lineProps.zIndex || 0
    });

    return null;
  }

  createText(props: AdapterTextProps): ReactNode {
    // Text rendering in WebGL is complex, fallback to DOM for now
    const { id, events, ...textProps } = props;
    
    return (
      <div
        style={{
          position: 'absolute',
          left: textProps.x,
          top: textProps.y,
          fontSize: textProps.fontSize,
          fontFamily: textProps.fontFamily,
          color: textProps.fill,
          transform: `rotate(${textProps.rotation || 0}deg) scale(${textProps.scaleX || 1}, ${textProps.scaleY || 1})`,
          pointerEvents: events ? 'auto' : 'none',
          userSelect: 'none'
        }}
        onClick={events?.onClick}
        onMouseDown={events?.onPointerDown}
        onMouseUp={events?.onPointerUp}
      >
        {textProps.text}
      </div>
    );
  }

  // WebGL-specific methods
  private setupCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;

    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!this.gl) {
      console.error('WebGL not supported, falling back to Konva');
      return;
    }

    this.initializeWebGL();
    this.startRenderLoop();
  };

  private initializeWebGL(): void {
    if (!this.gl) return;

    // Initialize WebGL state
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.clearColor(0, 0, 0, 0);

    // Create shader programs
    this.createShaderPrograms();
    
    // Initialize batches
    this.initializeBatches();
  }

  private createShaderPrograms(): void {
    if (!this.gl) return;

    // Simple vertex shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;
      
      uniform mat3 u_transform;
      uniform vec2 u_resolution;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        vec3 position = u_transform * vec3(a_position, 1.0);
        vec2 clipSpace = ((position.xy / u_resolution) * 2.0) - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        
        v_texCoord = a_texCoord;
        v_color = a_color;
      }
    `;

    // Simple fragment shader
    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = v_color;
      }
    `;

    const program = this.createProgram(vertexShaderSource, fragmentShaderSource);
    if (program) {
      this.shaderPrograms.set('basic', program);
    }
  }

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program linking error:', this.gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  private initializeBatches(): void {
    const batchTypes = ['rect', 'circle', 'line'] as const;
    
    batchTypes.forEach(type => {
      this.batches.set(type, {
        type,
        items: [],
        buffer: new Float32Array(this.instancedConfig.bufferSize),
        vertexCount: 0,
        dirty: true
      });
    });
  }

  private addRenderItem(item: WebGLRenderItem): void {
    this.renderItems.set(item.id, item);
    this.markBatchDirty(item.type);
    this.needsRedraw = true;
  }

  private markBatchDirty(type: string): void {
    const batch = this.batches.get(type);
    if (batch) {
      batch.dirty = true;
    }
  }

  private startRenderLoop(): void {
    const render = () => {
      if (this.needsRedraw) {
        this.renderFrame();
        this.needsRedraw = false;
      }
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  private renderFrame(): void {
    if (!this.gl || !this.canvas) return;

    // Clear the canvas
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Update dirty batches
    this.updateBatches();

    // Render each batch
    this.batches.forEach(batch => {
      if (batch.items.length > 0) {
        this.renderBatch(batch);
      }
    });
  }

  private updateBatches(): void {
    this.batches.forEach(batch => {
      if (!batch.dirty) return;

      // Clear and rebuild batch
      batch.items = [];
      
      // Collect items of this type
      this.renderItems.forEach(item => {
        if (item.type === batch.type && item.visible) {
          batch.items.push(item);
        }
      });

      // Sort by z-index
      batch.items.sort((a, b) => a.zIndex - b.zIndex);

      // Update vertex buffer
      this.updateBatchBuffer(batch);
      
      batch.dirty = false;
    });
  }

  private updateBatchBuffer(batch: GPUBatch): void {
    // Simplified buffer update - in practice, you'd create proper vertex data
    // for each shape type (rects, circles, lines)
    let bufferIndex = 0;
    
    batch.items.forEach(item => {
      // Add vertex data to buffer based on item type and properties
      // This is simplified - real implementation would handle geometry properly
      const vertices = this.generateVerticesForItem(item);
      
      for (let i = 0; i < vertices.length && bufferIndex < batch.buffer.length; i++) {
        batch.buffer[bufferIndex++] = vertices[i];
      }
    });

    batch.vertexCount = bufferIndex / 6; // Assuming 6 components per vertex (x, y, u, v, r, g, b, a)
  }

  private generateVerticesForItem(item: WebGLRenderItem): number[] {
    // Simplified vertex generation - real implementation would handle each shape type
    switch (item.type) {
      case 'rect':
        return this.generateRectVertices(item);
      case 'circle':
        return this.generateCircleVertices(item);
      case 'line':
        return this.generateLineVertices(item);
      default:
        return [];
    }
  }

  private generateRectVertices(item: WebGLRenderItem): number[] {
    const { width, height, fill } = item.props;
    const { x, y } = item.transform;
    
    // Convert color to RGBA
    const color = this.parseColor(fill || '#000000');
    
    // Generate quad vertices (2 triangles)
    return [
      // Triangle 1
      x, y, 0, 0, ...color,
      x + width, y, 1, 0, ...color,
      x, y + height, 0, 1, ...color,
      // Triangle 2
      x + width, y, 1, 0, ...color,
      x + width, y + height, 1, 1, ...color,
      x, y + height, 0, 1, ...color
    ];
  }

  private generateCircleVertices(item: WebGLRenderItem): number[] {
    // Simplified circle generation - would use triangle fan or instanced quads in practice
    const { radius, fill } = item.props;
    const { x, y } = item.transform;
    const color = this.parseColor(fill || '#000000');
    
    const segments = Math.max(8, Math.floor(radius / 2));
    const vertices: number[] = [];
    
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;
      
      // Center point
      vertices.push(x, y, 0.5, 0.5, ...color);
      // First edge point
      vertices.push(
        x + Math.cos(angle1) * radius,
        y + Math.sin(angle1) * radius,
        0.5 + Math.cos(angle1) * 0.5,
        0.5 + Math.sin(angle1) * 0.5,
        ...color
      );
      // Second edge point
      vertices.push(
        x + Math.cos(angle2) * radius,
        y + Math.sin(angle2) * radius,
        0.5 + Math.cos(angle2) * 0.5,
        0.5 + Math.sin(angle2) * 0.5,
        ...color
      );
    }
    
    return vertices;
  }

  private generateLineVertices(item: WebGLRenderItem): number[] {
    // Simplified line generation - would use line strips or thick lines in practice
    const { points, stroke, strokeWidth } = item.props;
    const color = this.parseColor(stroke || '#000000');
    const width = strokeWidth || 1;
    
    const vertices: number[] = [];
    
    for (let i = 0; i < points.length - 2; i += 2) {
      const x1 = points[i];
      const y1 = points[i + 1];
      const x2 = points[i + 2];
      const y2 = points[i + 3];
      
      // Generate thick line as quad
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / length * width * 0.5;
      const ny = dx / length * width * 0.5;
      
      // Quad vertices
      vertices.push(
        x1 + nx, y1 + ny, 0, 0, ...color,
        x1 - nx, y1 - ny, 1, 0, ...color,
        x2 + nx, y2 + ny, 0, 1, ...color,
        x1 - nx, y1 - ny, 1, 0, ...color,
        x2 - nx, y2 - ny, 1, 1, ...color,
        x2 + nx, y2 + ny, 0, 1, ...color
      );
    }
    
    return vertices;
  }

  private parseColor(colorStr: string): number[] {
    // Simple color parsing - would use more robust parser in practice
    if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = hex.length > 6 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return [r, g, b, a];
    }
    return [0, 0, 0, 1]; // Default to black
  }

  private renderBatch(batch: GPUBatch): void {
    if (!this.gl || !this.canvas) return;

    const program = this.shaderPrograms.get('basic');
    if (!program) return;

    this.gl.useProgram(program);

    // Set uniforms
    const transformLocation = this.gl.getUniformLocation(program, 'u_transform');
    const resolutionLocation = this.gl.getUniformLocation(program, 'u_resolution');

    if (transformLocation) {
      const transform = new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
      ]);
      this.gl.uniformMatrix3fv(transformLocation, false, transform);
    }

    if (resolutionLocation) {
      this.gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
    }

    // Create and bind vertex buffer
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, batch.buffer, this.gl.DYNAMIC_DRAW);

    // Set up attributes
    const positionLocation = this.gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = this.gl.getAttribLocation(program, 'a_texCoord');
    const colorLocation = this.gl.getAttribLocation(program, 'a_color');

    const stride = 6 * 4; // 6 floats per vertex * 4 bytes per float

    if (positionLocation >= 0) {
      this.gl.enableVertexAttribArray(positionLocation);
      this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, stride, 0);
    }

    if (texCoordLocation >= 0) {
      this.gl.enableVertexAttribArray(texCoordLocation);
      this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, stride, 2 * 4);
    }

    if (colorLocation >= 0) {
      this.gl.enableVertexAttribArray(colorLocation);
      this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, stride, 4 * 4);
    }

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLES, 0, batch.vertexCount);

    // Cleanup
    this.gl.deleteBuffer(buffer);
  }

  // GPU-specific performance optimizations
  protected processBatchedOperations(type: string, operations: BatchedOperation[]): void {
    // For WebGL, batch all operations and update GPU buffers efficiently
    operations.forEach(op => {
      switch (op.type) {
        case 'add':
          this.addRenderItem({
            id: op.id,
            type: op.shapeType as any,
            props: op.props,
            transform: {
              x: op.props.x || 0,
              y: op.props.y || 0,
              rotation: op.props.rotation || 0,
              scaleX: op.props.scaleX || 1,
              scaleY: op.props.scaleY || 1
            },
            visible: op.props.visible !== false,
            layer: 'default',
            zIndex: op.props.zIndex || 0
          });
          break;
        case 'update':
          const item = this.renderItems.get(op.id);
          if (item && op.props) {
            Object.assign(item.props, op.props);
            Object.assign(item.transform, {
              x: op.props.x !== undefined ? op.props.x : item.transform.x,
              y: op.props.y !== undefined ? op.props.y : item.transform.y,
              rotation: op.props.rotation !== undefined ? op.props.rotation : item.transform.rotation,
              scaleX: op.props.scaleX !== undefined ? op.props.scaleX : item.transform.scaleX,
              scaleY: op.props.scaleY !== undefined ? op.props.scaleY : item.transform.scaleY
            });
            this.markBatchDirty(item.type);
          }
          break;
        case 'remove':
          const removedItem = this.renderItems.get(op.id);
          if (removedItem) {
            this.renderItems.delete(op.id);
            this.markBatchDirty(removedItem.type);
          }
          break;
      }
    });

    this.needsRedraw = true;
  }

  // WebGL-specific methods
  getWebGLStats() {
    const baseStats = this.getStats();
    
    return {
      ...baseStats,
      webglSpecific: {
        renderItems: this.renderItems.size,
        batches: this.batches.size,
        glContext: !!this.gl,
        shaderPrograms: this.shaderPrograms.size,
        totalVertices: Array.from(this.batches.values()).reduce((sum, batch) => sum + batch.vertexCount, 0)
      }
    };
  }

  setViewport(x: number, y: number, scale: number): void {
    // Update WebGL viewport transform
    // This would be handled by updating the transform uniform
    this.needsRedraw = true;
  }

  dispose(): void {
    super.dispose();

    // Stop render loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Cleanup WebGL resources
    if (this.gl) {
      this.shaderPrograms.forEach(program => {
        this.gl!.deleteProgram(program);
      });
      this.shaderPrograms.clear();
    }

    // Clear render data
    this.renderItems.clear();
    this.batches.clear();
    
    this.canvas = null;
    this.gl = null;
  }
}

// React hook for WebGL-specific features
export function useWebGLAdapter(adapter: RendererAdapter | null) {
  if (!adapter || adapter.getRendererType() !== 'webgl') {
    return null;
  }

  const webglAdapter = adapter as WebGLAdapter;

  return {
    getWebGLStats: webglAdapter.getWebGLStats.bind(webglAdapter),
    setViewport: webglAdapter.setViewport.bind(webglAdapter)
  };
}
/**
 * Renderer Adapter - Bridge between React components and renderer backends
 * Provides a unified interface for components to work with both Konva and WebGL renderers
 */

import { ReactNode } from 'react';
import { RendererInterface, BaseShapeProps, RectProps, CircleProps, LineProps, TextProps } from '../RendererInterface';

// Common shape configuration
export interface ShapeEventHandlers {
  onPointerDown?: (e: any) => void;
  onPointerMove?: (e: any) => void;
  onPointerUp?: (e: any) => void;
  onClick?: (e: any) => void;
  onMouseEnter?: (e: any) => void;
  onMouseLeave?: (e: any) => void;
  onDragStart?: (e: any) => void;
  onDragMove?: (e: any) => void;
  onDragEnd?: (e: any) => void;
}

export interface AdapterShapeProps extends BaseShapeProps {
  draggable?: boolean;
  listening?: boolean;
  name?: string;
  perfectDrawEnabled?: boolean;
  shadowEnabled?: boolean;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffset?: { x: number; y: number };
  filters?: any[];
  cache?: boolean;
  events?: ShapeEventHandlers;
}

export interface AdapterRectProps extends RectProps, AdapterShapeProps {}
export interface AdapterCircleProps extends CircleProps, AdapterShapeProps {}
export interface AdapterLineProps extends LineProps, AdapterShapeProps {}
export interface AdapterTextProps extends TextProps, AdapterShapeProps {}

export interface AdapterGroupProps extends AdapterShapeProps {
  children: ReactNode;
  clipFunc?: (ctx: any) => void;
}

// Layer configuration
export interface AdapterLayerProps {
  id: string;
  visible?: boolean;
  opacity?: number;
  listening?: boolean;
  children: ReactNode;
  hitGraphEnabled?: boolean;
  imageSmoothingEnabled?: boolean;
}

// Stage configuration
export interface AdapterStageProps {
  width: number;
  height: number;
  container?: HTMLElement;
  scale?: { x: number; y: number };
  x?: number;
  y?: number;
  draggable?: boolean;
  children: ReactNode;
  events?: {
    onWheel?: (e: any) => void;
    onPointerDown?: (e: any) => void;
    onPointerMove?: (e: any) => void;
    onPointerUp?: (e: any) => void;
    onContextMenu?: (e: any) => void;
  };
}

// Performance and batching interfaces
export interface BatchedOperation {
  type: 'add' | 'update' | 'remove';
  shapeType: 'rect' | 'circle' | 'line' | 'text' | 'group';
  id: string;
  props?: any;
}

export interface LODConfig {
  lowDetail: number;    // Scale threshold for low detail
  mediumDetail: number; // Scale threshold for medium detail
  highDetail: number;   // Scale threshold for high detail
}

export interface InstancedRenderingConfig {
  enabled: boolean;
  maxInstances: number;
  bufferSize: number;
  updateFrequency: number; // How often to batch updates (ms)
}

// Main adapter interface
export abstract class RendererAdapter {
  protected renderer: RendererInterface;
  protected batchedOperations: BatchedOperation[] = [];
  protected batchTimer: number | null = null;
  protected lodConfig: LODConfig = {
    lowDetail: 0.5,
    mediumDetail: 1.0,
    highDetail: 2.0
  };
  protected instancedConfig: InstancedRenderingConfig = {
    enabled: false,
    maxInstances: 1000,
    bufferSize: 4096,
    updateFrequency: 16
  };

  constructor(renderer: RendererInterface) {
    this.renderer = renderer;
  }

  // Abstract methods that implementations must provide
  abstract createStage(props: AdapterStageProps): ReactNode;
  abstract createLayer(props: AdapterLayerProps): ReactNode;
  abstract createGroup(props: AdapterGroupProps): ReactNode;
  abstract createRect(props: AdapterRectProps): ReactNode;
  abstract createCircle(props: AdapterCircleProps): ReactNode;
  abstract createLine(props: AdapterLineProps): ReactNode;
  abstract createText(props: AdapterTextProps): ReactNode;

  // Performance methods
  enableInstancedRendering(config?: Partial<InstancedRenderingConfig>): void {
    this.instancedConfig = { ...this.instancedConfig, ...config, enabled: true };
  }

  disableInstancedRendering(): void {
    this.instancedConfig.enabled = false;
  }

  setLODConfig(config: Partial<LODConfig>): void {
    this.lodConfig = { ...this.lodConfig, ...config };
  }

  getCurrentLOD(scale: number): 'low' | 'medium' | 'high' {
    if (scale >= this.lodConfig.highDetail) return 'high';
    if (scale >= this.lodConfig.mediumDetail) return 'medium';
    return 'low';
  }

  // Batching operations for performance
  batchOperation(operation: BatchedOperation): void {
    this.batchedOperations.push(operation);
    
    if (this.batchTimer === null) {
      this.batchTimer = window.setTimeout(() => {
        this.flushBatchedOperations();
      }, this.instancedConfig.updateFrequency);
    }
  }

  flushBatchedOperations(): void {
    if (this.batchedOperations.length === 0) return;

    // Group operations by type for optimal processing
    const groupedOps = this.groupOperationsByType(this.batchedOperations);
    
    // Process each group
    Object.entries(groupedOps).forEach(([type, operations]) => {
      this.processBatchedOperations(type as any, operations);
    });

    this.batchedOperations = [];
    this.batchTimer = null;
  }

  private groupOperationsByType(operations: BatchedOperation[]): Record<string, BatchedOperation[]> {
    return operations.reduce((groups, op) => {
      const key = `${op.type}_${op.shapeType}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(op);
      return groups;
    }, {} as Record<string, BatchedOperation[]>);
  }

  private processBatchedOperations(type: string, operations: BatchedOperation[]): void {
    // Default implementation - subclasses can override for renderer-specific optimizations
    operations.forEach(op => {
      switch (op.type) {
        case 'add':
          this.addShapeToRenderer(op.shapeType, op.props);
          break;
        case 'update':
          this.renderer.updateShape(op.id, op.props);
          break;
        case 'remove':
          this.renderer.removeShape(op.id);
          break;
      }
    });
  }

  private addShapeToRenderer(shapeType: string, props: any): void {
    switch (shapeType) {
      case 'rect':
        this.renderer.addRect(props);
        break;
      case 'circle':
        this.renderer.addCircle(props);
        break;
      case 'line':
        this.renderer.addLine(props);
        break;
      case 'text':
        this.renderer.addText(props);
        break;
    }
  }

  // Utility methods
  getRenderer(): RendererInterface {
    return this.renderer;
  }

  getRendererType(): 'konva' | 'webgl' {
    return this.renderer.getType();
  }

  isGPURenderer(): boolean {
    return this.renderer.getType() === 'webgl';
  }

  getStats() {
    return this.renderer.getStats();
  }

  // Coordinate conversion helpers
  screenToWorld(screenPoint: { x: number; y: number }) {
    return this.renderer.screenToWorld(screenPoint);
  }

  worldToScreen(worldPoint: { x: number; y: number }) {
    return this.renderer.worldToScreen(worldPoint);
  }

  // Event handling helpers
  setupEventListeners(element: any, events: ShapeEventHandlers): void {
    Object.entries(events).forEach(([eventName, handler]) => {
      if (handler && element) {
        element.on(eventName.replace('on', '').toLowerCase(), handler);
      }
    });
  }

  dispose(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.flushBatchedOperations();
  }
}

// Factory function for creating appropriate adapter
export function createRendererAdapter(renderer: RendererInterface): RendererAdapter {
  const rendererType = renderer.getType();
  
  switch (rendererType) {
    case 'konva':
      // Dynamic import to avoid circular dependencies
      return import('./KonvaAdapter').then(module => new module.KonvaAdapter(renderer));
    case 'webgl':
      return import('./WebGLAdapter').then(module => new module.WebGLAdapter(renderer));
    default:
      throw new Error(`Unsupported renderer type: ${rendererType}`);
  }
}

// Hook for using renderer adapter in components
export function useRendererAdapter(renderer: RendererInterface | null): RendererAdapter | null {
  if (!renderer) return null;
  
  // Note: In practice, you'd want to memoize this and handle async creation
  // This is simplified for the interface definition
  return createRendererAdapter(renderer) as any;
}
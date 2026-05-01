/**
 * Konva Adapter - React-Konva bridge for the renderer abstraction
 * Provides seamless integration between React components and Konva renderer
 */

import React, { ReactNode } from 'react';
import { Stage, Layer, Group, Rect, Circle, Line, Text } from 'react-konva';
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

export class KonvaAdapter extends RendererAdapter {
  private stageRef: any = null;
  private layerRefs: Map<string, any> = new Map();

  constructor(renderer: RendererInterface) {
    super(renderer);
  }

  createStage(props: AdapterStageProps): ReactNode {
    const { events, children, ...stageProps } = props;

    return (
      <Stage
        ref={(ref) => { this.stageRef = ref; }}
        {...stageProps}
        onWheel={events?.onWheel}
        onMouseDown={events?.onPointerDown}
        onMouseMove={events?.onPointerMove}
        onMouseUp={events?.onPointerUp}
        onTouchStart={events?.onPointerDown}
        onTouchMove={events?.onPointerMove}
        onTouchEnd={events?.onPointerUp}
        onContextMenu={events?.onContextMenu}
      >
        {children}
      </Stage>
    );
  }

  createLayer(props: AdapterLayerProps): ReactNode {
    const { children, id, ...layerProps } = props;

    return (
      <Layer
        ref={(ref) => { 
          if (ref) this.layerRefs.set(id, ref); 
          else this.layerRefs.delete(id);
        }}
        {...layerProps}
      >
        {children}
      </Layer>
    );
  }

  createGroup(props: AdapterGroupProps): ReactNode {
    const { children, events, ...groupProps } = props;

    const groupElement = (
      <Group
        {...groupProps}
        ref={(ref) => {
          if (ref && events) {
            this.setupEventListeners(ref, events);
          }
        }}
      >
        {children}
      </Group>
    );

    return groupElement;
  }

  createRect(props: AdapterRectProps): ReactNode {
    const { events, ...rectProps } = props;

    return (
      <Rect
        {...rectProps}
        ref={(ref) => {
          if (ref && events) {
            this.setupEventListeners(ref, events);
          }
        }}
      />
    );
  }

  createCircle(props: AdapterCircleProps): ReactNode {
    const { events, ...circleProps } = props;

    return (
      <Circle
        {...circleProps}
        ref={(ref) => {
          if (ref && events) {
            this.setupEventListeners(ref, events);
          }
        }}
      />
    );
  }

  createLine(props: AdapterLineProps): ReactNode {
    const { events, ...lineProps } = props;

    return (
      <Line
        {...lineProps}
        ref={(ref) => {
          if (ref && events) {
            this.setupEventListeners(ref, events);
          }
        }}
      />
    );
  }

  createText(props: AdapterTextProps): ReactNode {
    const { events, ...textProps } = props;

    return (
      <Text
        {...textProps}
        ref={(ref) => {
          if (ref && events) {
            this.setupEventListeners(ref, events);
          }
        }}
      />
    );
  }

  // Konva-specific optimizations
  protected processBatchedOperations(type: string, operations: BatchedOperation[]): void {
    // For Konva, we can use the layer's batchDraw for better performance
    const affectedLayers = new Set<string>();

    operations.forEach(op => {
      super.addShapeToRenderer(op.shapeType, op.props);
      
      // Track which layers need redrawing
      const layerId = this.getLayerIdForShape(op.id);
      if (layerId) affectedLayers.add(layerId);
    });

    // Batch redraw affected layers
    affectedLayers.forEach(layerId => {
      const layer = this.layerRefs.get(layerId);
      if (layer) {
        layer.batchDraw();
      }
    });
  }

  private getLayerIdForShape(shapeId: string): string | null {
    // In a real implementation, you'd track shape-to-layer mapping
    // For now, return a default layer ID
    return 'main-layer';
  }

  // Konva-specific performance optimizations
  enablePixelRatio(ratio?: number): void {
    if (this.stageRef) {
      this.stageRef.pixelRatio(ratio || window.devicePixelRatio);
    }
  }

  enableCaching(layerId: string): void {
    const layer = this.layerRefs.get(layerId);
    if (layer) {
      layer.cache();
    }
  }

  disableCaching(layerId: string): void {
    const layer = this.layerRefs.get(layerId);
    if (layer) {
      layer.clearCache();
    }
  }

  // Hit detection optimizations
  enableHitGraph(layerId: string, enabled: boolean = true): void {
    const layer = this.layerRefs.get(layerId);
    if (layer) {
      layer.hitGraphEnabled(enabled);
    }
  }

  // Konva-specific transformations
  setViewport(x: number, y: number, scale: number): void {
    if (this.stageRef) {
      this.stageRef.x(x);
      this.stageRef.y(y);
      this.stageRef.scaleX(scale);
      this.stageRef.scaleY(scale);
      this.stageRef.batchDraw();
    }
  }

  getViewport(): { x: number; y: number; scale: number } {
    if (this.stageRef) {
      return {
        x: this.stageRef.x(),
        y: this.stageRef.y(),
        scale: this.stageRef.scaleX()
      };
    }
    return { x: 0, y: 0, scale: 1 };
  }

  // Performance monitoring for Konva
  getKonvaStats() {
    const baseStats = this.getStats();
    
    return {
      ...baseStats,
      konvaSpecific: {
        stageRef: !!this.stageRef,
        layerCount: this.layerRefs.size,
        pixelRatio: this.stageRef?.pixelRatio() || 1,
        imageOptimization: this.stageRef?.imageSmoothingEnabled() !== false
      }
    };
  }

  // Cleanup
  dispose(): void {
    super.dispose();
    
    // Clear layer references
    this.layerRefs.clear();
    this.stageRef = null;
  }
}

// React hook for Konva-specific features
export function useKonvaAdapter(adapter: RendererAdapter | null) {
  if (!adapter || adapter.getRendererType() !== 'konva') {
    return null;
  }

  const konvaAdapter = adapter as KonvaAdapter;

  return {
    enablePixelRatio: konvaAdapter.enablePixelRatio.bind(konvaAdapter),
    enableCaching: konvaAdapter.enableCaching.bind(konvaAdapter),
    disableCaching: konvaAdapter.disableCaching.bind(konvaAdapter),
    enableHitGraph: konvaAdapter.enableHitGraph.bind(konvaAdapter),
    setViewport: konvaAdapter.setViewport.bind(konvaAdapter),
    getViewport: konvaAdapter.getViewport.bind(konvaAdapter),
    getKonvaStats: konvaAdapter.getKonvaStats.bind(konvaAdapter)
  };
}
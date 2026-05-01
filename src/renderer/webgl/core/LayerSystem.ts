/**
 * Layer System - Manages rendering layers with proper depth sorting and compositing
 */

import { RenderLayer, RenderContext, Renderable } from '../types';
import { RenderBatch } from './RenderBatch';
import { TransformSystem } from './TransformSystem';

interface LayerRenderState {
  layer: RenderLayer;
  renderables: Renderable[];
  needsSort: boolean;
  lastFrameCount: number;
}

export class LayerSystem {
  private renderBatch: RenderBatch;
  private layers: Map<string, LayerRenderState> = new Map();
  private sortedLayers: LayerRenderState[] = [];
  private needsLayerSort: boolean = true;
  private frameCount: number = 0;

  constructor(renderBatch: RenderBatch) {
    this.renderBatch = renderBatch;
  }

  public addLayer(layer: RenderLayer): void {
    const layerState: LayerRenderState = {
      layer: { ...layer },
      renderables: [],
      needsSort: true,
      lastFrameCount: 0
    };

    this.layers.set(layer.id, layerState);
    this.needsLayerSort = true;

    console.log(`Added layer: ${layer.id} (z-index: ${layer.zIndex})`);
  }

  public removeLayer(layerId: string): boolean {
    const removed = this.layers.delete(layerId);
    if (removed) {
      this.needsLayerSort = true;
      console.log(`Removed layer: ${layerId}`);
    }
    return removed;
  }

  public updateLayer(layerId: string, updates: Partial<RenderLayer>): boolean {
    const layerState = this.layers.get(layerId);
    if (!layerState) {
      console.error(`Layer not found: ${layerId}`);
      return false;
    }

    // Update layer properties
    Object.assign(layerState.layer, updates);

    // Check if z-index changed
    if (updates.zIndex !== undefined) {
      this.needsLayerSort = true;
    }

    // Check if renderables list changed
    if (updates.renderables !== undefined) {
      layerState.needsSort = true;
    }

    return true;
  }

  public setLayerVisible(layerId: string, visible: boolean): boolean {
    return this.updateLayer(layerId, { visible });
  }

  public setLayerOpacity(layerId: string, opacity: number): boolean {
    return this.updateLayer(layerId, { opacity: Math.max(0, Math.min(1, opacity)) });
  }

  public getLayer(layerId: string): RenderLayer | undefined {
    const layerState = this.layers.get(layerId);
    return layerState ? { ...layerState.layer } : undefined;
  }

  public render(renderContext: RenderContext, transformSystem: TransformSystem): void {
    this.frameCount++;

    // Update layers from render context
    this.updateLayersFromContext(renderContext);

    // Sort layers by z-index if needed
    if (this.needsLayerSort) {
      this.sortLayers();
    }

    // Render each layer in order
    for (const layerState of this.sortedLayers) {
      if (!layerState.layer.visible || layerState.layer.opacity <= 0) {
        continue;
      }

      this.renderLayer(layerState, renderContext, transformSystem);
    }
  }

  private updateLayersFromContext(renderContext: RenderContext): void {
    // Update layer states from render context
    for (const layer of renderContext.layers) {
      let layerState = this.layers.get(layer.id);
      
      if (!layerState) {
        // Create new layer if it doesn't exist
        this.addLayer(layer);
        layerState = this.layers.get(layer.id);
        if (!layerState) continue;
      } else {
        // Update existing layer
        const hasChanges = 
          layerState.layer.visible !== layer.visible ||
          layerState.layer.opacity !== layer.opacity ||
          layerState.layer.zIndex !== layer.zIndex ||
          !this.arraysEqual(layerState.layer.renderables, layer.renderables);

        if (hasChanges) {
          layerState.layer = { ...layer };
          layerState.needsSort = true;
          
          if (layerState.layer.zIndex !== layer.zIndex) {
            this.needsLayerSort = true;
          }
        }
      }

      // Update renderables for this layer
      this.updateLayerRenderables(layerState, renderContext.renderables);
    }

    // Remove layers that are no longer in the context
    const contextLayerIds = new Set(renderContext.layers.map(l => l.id));
    for (const layerId of this.layers.keys()) {
      if (!contextLayerIds.has(layerId)) {
        this.removeLayer(layerId);
      }
    }
  }

  private updateLayerRenderables(layerState: LayerRenderState, allRenderables: Map<string, Renderable>): void {
    // Only update if layer has changed since last frame
    if (layerState.lastFrameCount === this.frameCount && !layerState.needsSort) {
      return;
    }

    const newRenderables: Renderable[] = [];

    for (const renderableId of layerState.layer.renderables) {
      const renderable = allRenderables.get(renderableId);
      if (renderable && renderable.visible) {
        newRenderables.push(renderable);
      }
    }

    // Sort renderables by z-index within the layer
    newRenderables.sort((a, b) => a.zIndex - b.zIndex);

    layerState.renderables = newRenderables;
    layerState.needsSort = false;
    layerState.lastFrameCount = this.frameCount;
  }

  private sortLayers(): void {
    this.sortedLayers = Array.from(this.layers.values())
      .sort((a, b) => a.layer.zIndex - b.layer.zIndex);
    
    this.needsLayerSort = false;
  }

  private renderLayer(layerState: LayerRenderState, renderContext: RenderContext, transformSystem: TransformSystem): void {
    const layer = layerState.layer;

    // Set up layer blending if opacity < 1
    if (layer.opacity < 1) {
      this.renderBatch.setGlobalOpacity(layer.opacity);
    }

    // Render all renderables in this layer
    for (const renderable of layerState.renderables) {
      this.renderRenderable(renderable, transformSystem);
    }

    // Reset opacity
    if (layer.opacity < 1) {
      this.renderBatch.setGlobalOpacity(1.0);
    }

    // Flush batch for this layer to maintain proper depth ordering
    this.renderBatch.flush();
  }

  private renderRenderable(renderable: Renderable, transformSystem: TransformSystem): void {
    // Create model matrix for this renderable
    const modelMatrix = transformSystem.createModelMatrix(
      renderable.position,
      renderable.rotation,
      renderable.scale
    );

    // Dispatch to appropriate renderer based on type
    switch (renderable.type) {
      case 'rect':
        this.renderBatch.addRect(renderable as any, modelMatrix);
        break;
      case 'circle':
        this.renderBatch.addCircle(renderable as any, modelMatrix);
        break;
      case 'line':
        this.renderBatch.addLine(renderable as any, modelMatrix);
        break;
      case 'path':
        this.renderBatch.addPath(renderable as any, modelMatrix);
        break;
      case 'text':
        this.renderBatch.addText(renderable as any, modelMatrix);
        break;
      case 'arrow':
        this.renderBatch.addArrow(renderable as any, modelMatrix);
        break;
      case 'ring':
        this.renderBatch.addRing(renderable as any, modelMatrix);
        break;
      case 'arc':
        this.renderBatch.addArc(renderable as any, modelMatrix);
        break;
      case 'image':
        this.renderBatch.addImage(renderable as any, modelMatrix);
        break;
      case 'group':
        // Groups are handled differently - they don't render directly
        this.renderGroup(renderable as any, transformSystem);
        break;
      default:
        console.warn(`Unknown renderable type: ${renderable.type}`);
    }
  }

  private renderGroup(group: any, transformSystem: TransformSystem): void {
    // Groups contain child renderables that should be rendered with the group's transform
    // This is a simplified implementation - in practice, you'd want to handle nested transforms
    console.warn('Group rendering not fully implemented');
  }

  private arraysEqual<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // Layer management utilities
  public getLayers(): RenderLayer[] {
    return Array.from(this.layers.values()).map(state => ({ ...state.layer }));
  }

  public getLayerCount(): number {
    return this.layers.size;
  }

  public getVisibleLayerCount(): number {
    return Array.from(this.layers.values()).filter(state => state.layer.visible).length;
  }

  public getRenderableCountForLayer(layerId: string): number {
    const layerState = this.layers.get(layerId);
    return layerState ? layerState.renderables.length : 0;
  }

  public getTotalRenderableCount(): number {
    return Array.from(this.layers.values())
      .reduce((total, state) => total + state.renderables.length, 0);
  }

  // Layer ordering utilities
  public moveLayerUp(layerId: string): boolean {
    const layerState = this.layers.get(layerId);
    if (!layerState) return false;

    // Find the next higher z-index
    let nextZIndex = layerState.layer.zIndex + 1;
    for (const otherState of this.layers.values()) {
      if (otherState.layer.zIndex > layerState.layer.zIndex && 
          otherState.layer.zIndex < nextZIndex) {
        nextZIndex = otherState.layer.zIndex + 1;
      }
    }

    layerState.layer.zIndex = nextZIndex;
    this.needsLayerSort = true;
    return true;
  }

  public moveLayerDown(layerId: string): boolean {
    const layerState = this.layers.get(layerId);
    if (!layerState) return false;

    // Find the next lower z-index
    let nextZIndex = layerState.layer.zIndex - 1;
    for (const otherState of this.layers.values()) {
      if (otherState.layer.zIndex < layerState.layer.zIndex && 
          otherState.layer.zIndex > nextZIndex) {
        nextZIndex = otherState.layer.zIndex - 1;
      }
    }

    layerState.layer.zIndex = nextZIndex;
    this.needsLayerSort = true;
    return true;
  }

  public moveLayerToTop(layerId: string): boolean {
    const layerState = this.layers.get(layerId);
    if (!layerState) return false;

    // Find the highest z-index and add 1
    let maxZIndex = layerState.layer.zIndex;
    for (const otherState of this.layers.values()) {
      maxZIndex = Math.max(maxZIndex, otherState.layer.zIndex);
    }

    layerState.layer.zIndex = maxZIndex + 1;
    this.needsLayerSort = true;
    return true;
  }

  public moveLayerToBottom(layerId: string): boolean {
    const layerState = this.layers.get(layerId);
    if (!layerState) return false;

    // Find the lowest z-index and subtract 1
    let minZIndex = layerState.layer.zIndex;
    for (const otherState of this.layers.values()) {
      minZIndex = Math.min(minZIndex, otherState.layer.zIndex);
    }

    layerState.layer.zIndex = minZIndex - 1;
    this.needsLayerSort = true;
    return true;
  }

  // Performance and debugging utilities
  public getLayerStats(): {
    totalLayers: number;
    visibleLayers: number;
    totalRenderables: number;
    layerDetails: Array<{
      id: string;
      zIndex: number;
      visible: boolean;
      opacity: number;
      renderableCount: number;
    }>;
  } {
    const layerDetails = Array.from(this.layers.values()).map(state => ({
      id: state.layer.id,
      zIndex: state.layer.zIndex,
      visible: state.layer.visible,
      opacity: state.layer.opacity,
      renderableCount: state.renderables.length
    }));

    return {
      totalLayers: this.layers.size,
      visibleLayers: this.getVisibleLayerCount(),
      totalRenderables: this.getTotalRenderableCount(),
      layerDetails
    };
  }

  public clearAllLayers(): void {
    this.layers.clear();
    this.sortedLayers = [];
    this.needsLayerSort = true;
    console.log('Cleared all layers');
  }

  public dispose(): void {
    this.clearAllLayers();
    console.log('LayerSystem disposed');
  }
}
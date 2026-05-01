/**
 * WebGL Renderer Adapter - Implements RendererInterface for WebGL
 * Provides a consistent interface for the WebGL-based rendering
 */

import { WebGLRenderer } from './WebGLRenderer';
import { 
  RendererInterface, 
  BaseShapeProps, 
  RectProps, 
  CircleProps, 
  LineProps, 
  TextProps, 
  ImageProps,
  LayerInterface,
  TransformInterface,
  ViewportInterface,
  PointerEventData,
  WheelEventData
} from '../RendererInterface';
import { 
  Vector2, 
  RenderContext, 
  RenderLayer, 
  Renderable, 
  RectRenderable, 
  CircleRenderable, 
  LineRenderable, 
  TextRenderable, 
  ImageRenderable,
  Color
} from './types';

export class WebGLRendererAdapter implements RendererInterface {
  private renderer: WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private renderables: Map<string, Renderable> = new Map();
  private layers: Map<string, RenderLayer> = new Map();
  private currentTransform: TransformInterface = { scale: 1, x: 0, y: 0 };
  private currentViewport: ViewportInterface = { x: 0, y: 0, width: 800, height: 600 };
  private eventListeners: Map<string, ((event: any) => void)[]> = new Map();
  private isRenderLoopActive: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new WebGLRenderer(canvas);
    this.setupEventHandlers();
  }

  public async initialize(): Promise<void> {
    // WebGL renderer initialization is async
    await new Promise<void>((resolve) => {
      // Wait for renderer to be ready
      const checkReady = () => {
        if (this.renderer.isWebGLSupported()) {
          resolve();
        } else {
          setTimeout(checkReady, 10);
        }
      };
      checkReady();
    });
    
    console.log('WebGL renderer initialized');
    this.startRenderLoop();
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderer.resize(width, height);
    this.currentViewport.width = width;
    this.currentViewport.height = height;
  }

  public render(): void {
    const renderContext: RenderContext = {
      viewport: this.currentViewport,
      transform: this.currentTransform,
      layers: Array.from(this.layers.values()),
      renderables: this.renderables
    };

    this.renderer.render(renderContext);
  }

  public clear(): void {
    this.renderer.clear();
    this.renderables.clear();
    this.layers.clear();
  }

  public setViewport(viewport: ViewportInterface): void {
    this.currentViewport = { ...viewport };
    this.renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
  }

  public setTransform(transform: TransformInterface): void {
    this.currentTransform = { ...transform };
    this.renderer.setTransform(transform.scale, transform.x, transform.y);
  }

  public getTransform(): TransformInterface {
    return { ...this.currentTransform };
  }

  public screenToWorld(screenPoint: Vector2): Vector2 {
    return this.renderer.getTransformSystem().screenToWorld(screenPoint);
  }

  public worldToScreen(worldPoint: Vector2): Vector2 {
    return this.renderer.getTransformSystem().worldToScreen(worldPoint);
  }

  // Shape management
  public addRect(props: RectProps): void {
    const rect: RectRenderable = {
      id: props.id,
      type: 'rect',
      visible: props.visible !== false,
      position: { x: props.x, y: props.y, z: props.z || 0 },
      rotation: props.rotation || 0,
      scale: { x: props.scaleX || 1, y: props.scaleY || 1 },
      color: this.parseColor(props.fill || '#ffffff'),
      opacity: props.opacity || 1,
      zIndex: props.zIndex || 0,
      width: props.width,
      height: props.height,
      cornerRadius: props.cornerRadius,
      stroke: props.stroke ? {
        color: this.parseColor(props.stroke),
        width: props.strokeWidth || 1
      } : undefined,
      fill: props.fill ? {
        type: 'solid',
        color: this.parseColor(props.fill)
      } : undefined
    };

    this.renderables.set(props.id, rect);
    this.ensureLayerExists(rect.zIndex);
    this.addToLayer(rect.id, rect.zIndex);
  }

  public addCircle(props: CircleProps): void {
    const circle: CircleRenderable = {
      id: props.id,
      type: 'circle',
      visible: props.visible !== false,
      position: { x: props.x, y: props.y, z: props.z || 0 },
      rotation: props.rotation || 0,
      scale: { x: props.scaleX || 1, y: props.scaleY || 1 },
      color: this.parseColor(props.fill || '#ffffff'),
      opacity: props.opacity || 1,
      zIndex: props.zIndex || 0,
      radius: props.radius,
      stroke: props.stroke ? {
        color: this.parseColor(props.stroke),
        width: props.strokeWidth || 1
      } : undefined,
      fill: props.fill ? {
        type: 'solid',
        color: this.parseColor(props.fill)
      } : undefined
    };

    this.renderables.set(props.id, circle);
    this.ensureLayerExists(circle.zIndex);
    this.addToLayer(circle.id, circle.zIndex);
  }

  public addLine(props: LineProps): void {
    const points: Vector2[] = [];
    for (let i = 0; i < props.points.length; i += 2) {
      points.push({ x: props.points[i], y: props.points[i + 1] });
    }

    const line: LineRenderable = {
      id: props.id,
      type: 'line',
      visible: props.visible !== false,
      position: { x: props.x, y: props.y, z: props.z || 0 },
      rotation: props.rotation || 0,
      scale: { x: props.scaleX || 1, y: props.scaleY || 1 },
      color: this.parseColor(props.stroke),
      opacity: props.opacity || 1,
      zIndex: props.zIndex || 0,
      points,
      stroke: {
        color: this.parseColor(props.stroke),
        width: props.strokeWidth,
        lineCap: props.lineCap,
        lineJoin: props.lineJoin,
        dashArray: props.dash
      }
    };

    this.renderables.set(props.id, line);
    this.ensureLayerExists(line.zIndex);
    this.addToLayer(line.id, line.zIndex);
  }

  public addText(props: TextProps): void {
    const text: TextRenderable = {
      id: props.id,
      type: 'text',
      visible: props.visible !== false,
      position: { x: props.x, y: props.y, z: props.z || 0 },
      rotation: props.rotation || 0,
      scale: { x: props.scaleX || 1, y: props.scaleY || 1 },
      color: this.parseColor(props.fill || '#000000'),
      opacity: props.opacity || 1,
      zIndex: props.zIndex || 0,
      text: props.text,
      fontSize: props.fontSize,
      fontFamily: props.fontFamily || 'Arial',
      fontWeight: props.fontWeight,
      fontStyle: props.fontStyle,
      textAlign: props.align,
      textBaseline: props.verticalAlign,
      fill: props.fill ? {
        type: 'solid',
        color: this.parseColor(props.fill)
      } : undefined
    };

    this.renderables.set(props.id, text);
    this.ensureLayerExists(text.zIndex);
    this.addToLayer(text.id, text.zIndex);
  }

  public addImage(props: ImageProps): void {
    // For WebGL, we need to create a texture from the image
    // This is a simplified implementation
    const image: ImageRenderable = {
      id: props.id,
      type: 'image',
      visible: props.visible !== false,
      position: { x: props.x, y: props.y, z: props.z || 0 },
      rotation: props.rotation || 0,
      scale: { x: props.scaleX || 1, y: props.scaleY || 1 },
      color: { r: 1, g: 1, b: 1, a: 1 },
      opacity: props.opacity || 1,
      zIndex: props.zIndex || 0,
      imageId: `texture_${props.id}`, // This would reference a texture
      width: props.width,
      height: props.height,
      crop: props.crop
    };

    // In a full implementation, we would upload the image to a texture here
    this.renderables.set(props.id, image);
    this.ensureLayerExists(image.zIndex);
    this.addToLayer(image.id, image.zIndex);
  }

  public updateShape(id: string, props: Partial<BaseShapeProps>): void {
    const renderable = this.renderables.get(id);
    if (!renderable) return;

    if (props.x !== undefined) renderable.position.x = props.x;
    if (props.y !== undefined) renderable.position.y = props.y;
    if (props.z !== undefined) renderable.position.z = props.z;
    if (props.rotation !== undefined) renderable.rotation = props.rotation;
    if (props.scaleX !== undefined) renderable.scale.x = props.scaleX;
    if (props.scaleY !== undefined) renderable.scale.y = props.scaleY;
    if (props.visible !== undefined) renderable.visible = props.visible;
    if (props.opacity !== undefined) renderable.opacity = props.opacity;
    if (props.zIndex !== undefined) {
      const oldZIndex = renderable.zIndex;
      renderable.zIndex = props.zIndex;
      
      // Move to appropriate layer
      this.removeFromLayer(id, oldZIndex);
      this.ensureLayerExists(props.zIndex);
      this.addToLayer(id, props.zIndex);
    }
  }

  public removeShape(id: string): void {
    const renderable = this.renderables.get(id);
    if (renderable) {
      this.removeFromLayer(id, renderable.zIndex);
      this.renderables.delete(id);
    }
  }

  public getShape(id: string): BaseShapeProps | null {
    const renderable = this.renderables.get(id);
    if (!renderable) return null;

    return {
      id: renderable.id,
      x: renderable.position.x,
      y: renderable.position.y,
      z: renderable.position.z,
      rotation: renderable.rotation,
      scaleX: renderable.scale.x,
      scaleY: renderable.scale.y,
      visible: renderable.visible,
      opacity: renderable.opacity,
      zIndex: renderable.zIndex
    };
  }

  // Layer management
  public addLayer(layer: LayerInterface): void {
    const renderLayer: RenderLayer = {
      id: layer.id,
      name: layer.id,
      visible: layer.visible,
      opacity: layer.opacity,
      zIndex: layer.zIndex,
      renderables: [...layer.children]
    };

    this.layers.set(layer.id, renderLayer);
  }

  public removeLayer(layerId: string): void {
    this.layers.delete(layerId);
  }

  public updateLayer(layerId: string, props: Partial<LayerInterface>): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    if (props.visible !== undefined) layer.visible = props.visible;
    if (props.opacity !== undefined) layer.opacity = props.opacity;
    if (props.zIndex !== undefined) layer.zIndex = props.zIndex;
  }

  public setLayerOrder(layerIds: string[]): void {
    layerIds.forEach((layerId, index) => {
      const layer = this.layers.get(layerId);
      if (layer) {
        layer.zIndex = index;
      }
    });
  }

  private ensureLayerExists(zIndex: number): void {
    const layerId = `layer_${zIndex}`;
    if (!this.layers.has(layerId)) {
      const layer: RenderLayer = {
        id: layerId,
        name: `Layer ${zIndex}`,
        visible: true,
        opacity: 1,
        zIndex,
        renderables: []
      };
      this.layers.set(layerId, layer);
    }
  }

  private addToLayer(renderableId: string, zIndex: number): void {
    const layerId = `layer_${zIndex}`;
    const layer = this.layers.get(layerId);
    if (layer && !layer.renderables.includes(renderableId)) {
      layer.renderables.push(renderableId);
    }
  }

  private removeFromLayer(renderableId: string, zIndex: number): void {
    const layerId = `layer_${zIndex}`;
    const layer = this.layers.get(layerId);
    if (layer) {
      const index = layer.renderables.indexOf(renderableId);
      if (index > -1) {
        layer.renderables.splice(index, 1);
      }
    }
  }

  private parseColor(colorString: string): Color {
    // Simple color parsing - in a full implementation this would be more robust
    if (colorString.startsWith('#')) {
      const hex = colorString.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
    
    // Default to white
    return { r: 1, g: 1, b: 1, a: 1 };
  }

  // Event handling
  public addEventListener(type: string, listener: (event: any) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  public removeEventListener(type: string, listener: (event: any) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(type: string, event: any): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in ${type} event listener:`, error);
        }
      });
    }
  }

  private setupEventHandlers(): void {
    const eventSystem = this.renderer.getEventSystem();
    
    eventSystem.addEventListener('pointerdown', (e) => {
      const event: PointerEventData = {
        type: 'pointerdown',
        pointerId: e.pointerId,
        position: e.position,
        worldPosition: e.worldPosition,
        button: e.button,
        buttons: e.buttons,
        target: e.target?.id
      };
      this.emit('pointerdown', event);
    });

    eventSystem.addEventListener('pointermove', (e) => {
      const event: PointerEventData = {
        type: 'pointermove',
        pointerId: e.pointerId,
        position: e.position,
        worldPosition: e.worldPosition,
        button: e.button,
        buttons: e.buttons,
        target: e.target?.id
      };
      this.emit('pointermove', event);
    });

    eventSystem.addEventListener('pointerup', (e) => {
      const event: PointerEventData = {
        type: 'pointerup',
        pointerId: e.pointerId,
        position: e.position,
        worldPosition: e.worldPosition,
        button: e.button,
        buttons: e.buttons,
        target: e.target?.id
      };
      this.emit('pointerup', event);
    });

    eventSystem.addEventListener('wheel', (e) => {
      const event: WheelEventData = {
        type: 'wheel',
        position: e.position,
        worldPosition: e.worldPosition,
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaZ: e.deltaZ
      };
      this.emit('wheel', event);
    });
  }

  public getIntersection(position: Vector2): string | null {
    const hitResult = this.renderer.getEventSystem().performHitTest(position, this.screenToWorld(position));
    return hitResult.renderable?.id || null;
  }

  private startRenderLoop(): void {
    if (this.isRenderLoopActive) return;
    
    this.isRenderLoopActive = true;
    this.renderer.startRenderLoop(() => ({
      viewport: this.currentViewport,
      transform: this.currentTransform,
      layers: Array.from(this.layers.values()),
      renderables: this.renderables
    }));
  }

  private stopRenderLoop(): void {
    this.isRenderLoopActive = false;
    this.renderer.stopRenderLoop();
  }

  public getStats(): {
    fps: number;
    frameTime: number;
    drawCalls: number;
    memory: number;
  } {
    const stats = this.renderer.getStats();
    return {
      fps: stats.fps,
      frameTime: stats.frameTime,
      drawCalls: stats.drawCalls,
      memory: stats.bufferMemory + stats.textureMemory
    };
  }

  public isSupported(): boolean {
    return this.renderer.isWebGLSupported();
  }

  public getType(): 'konva' | 'webgl' {
    return 'webgl';
  }

  public dispose(): void {
    this.stopRenderLoop();
    this.renderer.dispose();
    this.renderables.clear();
    this.layers.clear();
    this.eventListeners.clear();
    console.log('WebGL renderer disposed');
  }
}
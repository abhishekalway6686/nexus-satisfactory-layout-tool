/**
 * Konva Renderer Adapter - Implements RendererInterface for Konva
 * Provides a consistent interface for the existing Konva-based rendering
 */

import Konva from 'konva';
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
import { Vector2 } from '../webgl/types';

export class KonvaRendererAdapter implements RendererInterface {
  private stage: Konva.Stage;
  private container: HTMLDivElement;
  private layers: Map<string, Konva.Layer> = new Map();
  private shapes: Map<string, Konva.Node> = new Map();
  private currentTransform: TransformInterface = { scale: 1, x: 0, y: 0 };
  private eventListeners: Map<string, ((event: any) => void)[]> = new Map();
  
  // Performance tracking
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;

  constructor(container: HTMLDivElement, width: number, height: number) {
    this.container = container;
    this.stage = new Konva.Stage({
      container,
      width,
      height,
      draggable: false
    });

    this.setupEventHandlers();
    this.startPerformanceTracking();
  }

  public async initialize(): Promise<void> {
    // Konva doesn't need async initialization
    console.log('Konva renderer initialized');
  }

  public resize(width: number, height: number): void {
    this.stage.width(width);
    this.stage.height(height);
    this.stage.batchDraw();
  }

  public render(): void {
    this.stage.batchDraw();
    this.updatePerformanceStats();
  }

  public clear(): void {
    this.stage.destroyChildren();
    this.layers.clear();
    this.shapes.clear();
  }

  public setViewport(viewport: ViewportInterface): void {
    this.stage.x(viewport.x);
    this.stage.y(viewport.y);
    this.stage.width(viewport.width);
    this.stage.height(viewport.height);
  }

  public setTransform(transform: TransformInterface): void {
    this.currentTransform = { ...transform };
    this.stage.scale({ x: transform.scale, y: transform.scale });
    this.stage.x(transform.x);
    this.stage.y(transform.y);
    this.stage.batchDraw();
  }

  public getTransform(): TransformInterface {
    return { ...this.currentTransform };
  }

  public screenToWorld(screenPoint: Vector2): Vector2 {
    const transform = this.stage.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(screenPoint);
  }

  public worldToScreen(worldPoint: Vector2): Vector2 {
    const transform = this.stage.getAbsoluteTransform();
    return transform.point(worldPoint);
  }

  // Shape management
  public addRect(props: RectProps): void {
    const rect = new Konva.Rect({
      id: props.id,
      x: props.x,
      y: props.y,
      width: props.width,
      height: props.height,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
      cornerRadius: props.cornerRadius,
      rotation: props.rotation || 0,
      scaleX: props.scaleX || 1,
      scaleY: props.scaleY || 1,
      visible: props.visible !== false,
      opacity: props.opacity || 1,
      listening: true,
      draggable: true
    });

    this.addShapeToLayer(rect, props.zIndex || 0);
    this.shapes.set(props.id, rect);
  }

  public addCircle(props: CircleProps): void {
    const circle = new Konva.Circle({
      id: props.id,
      x: props.x,
      y: props.y,
      radius: props.radius,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
      rotation: props.rotation || 0,
      scaleX: props.scaleX || 1,
      scaleY: props.scaleY || 1,
      visible: props.visible !== false,
      opacity: props.opacity || 1,
      listening: true,
      draggable: true
    });

    this.addShapeToLayer(circle, props.zIndex || 0);
    this.shapes.set(props.id, circle);
  }

  public addLine(props: LineProps): void {
    const line = new Konva.Line({
      id: props.id,
      x: props.x,
      y: props.y,
      points: props.points,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
      lineCap: props.lineCap,
      lineJoin: props.lineJoin,
      dash: props.dash,
      rotation: props.rotation || 0,
      scaleX: props.scaleX || 1,
      scaleY: props.scaleY || 1,
      visible: props.visible !== false,
      opacity: props.opacity || 1,
      listening: true
    });

    this.addShapeToLayer(line, props.zIndex || 0);
    this.shapes.set(props.id, line);
  }

  public addText(props: TextProps): void {
    const text = new Konva.Text({
      id: props.id,
      x: props.x,
      y: props.y,
      text: props.text,
      fontSize: props.fontSize,
      fontFamily: props.fontFamily || 'Arial',
      fontStyle: props.fontStyle,
      fontWeight: props.fontWeight,
      fill: props.fill,
      align: props.align,
      verticalAlign: props.verticalAlign,
      rotation: props.rotation || 0,
      scaleX: props.scaleX || 1,
      scaleY: props.scaleY || 1,
      visible: props.visible !== false,
      opacity: props.opacity || 1,
      listening: true,
      draggable: true
    });

    this.addShapeToLayer(text, props.zIndex || 0);
    this.shapes.set(props.id, text);
  }

  public addImage(props: ImageProps): void {
    const konvaImage = new Konva.Image({
      id: props.id,
      x: props.x,
      y: props.y,
      image: props.image,
      width: props.width,
      height: props.height,
      crop: props.crop,
      rotation: props.rotation || 0,
      scaleX: props.scaleX || 1,
      scaleY: props.scaleY || 1,
      visible: props.visible !== false,
      opacity: props.opacity || 1,
      listening: true,
      draggable: true
    });

    this.addShapeToLayer(konvaImage, props.zIndex || 0);
    this.shapes.set(props.id, konvaImage);
  }

  public updateShape(id: string, props: Partial<BaseShapeProps>): void {
    const shape = this.shapes.get(id);
    if (!shape) return;

    shape.setAttrs({
      x: props.x !== undefined ? props.x : shape.x(),
      y: props.y !== undefined ? props.y : shape.y(),
      rotation: props.rotation !== undefined ? props.rotation : shape.rotation(),
      scaleX: props.scaleX !== undefined ? props.scaleX : shape.scaleX(),
      scaleY: props.scaleY !== undefined ? props.scaleY : shape.scaleY(),
      visible: props.visible !== undefined ? props.visible : shape.visible(),
      opacity: props.opacity !== undefined ? props.opacity : shape.opacity()
    });

    shape.getLayer()?.batchDraw();
  }

  public removeShape(id: string): void {
    const shape = this.shapes.get(id);
    if (shape) {
      shape.destroy();
      this.shapes.delete(id);
    }
  }

  public getShape(id: string): BaseShapeProps | null {
    const shape = this.shapes.get(id);
    if (!shape) return null;

    return {
      id: shape.id(),
      x: shape.x(),
      y: shape.y(),
      rotation: shape.rotation(),
      scaleX: shape.scaleX(),
      scaleY: shape.scaleY(),
      visible: shape.visible(),
      opacity: shape.opacity(),
      zIndex: shape.zIndex()
    };
  }

  // Layer management
  public addLayer(layer: LayerInterface): void {
    if (this.layers.has(layer.id)) return;

    const konvaLayer = new Konva.Layer({
      id: layer.id,
      visible: layer.visible,
      opacity: layer.opacity
    });

    this.stage.add(konvaLayer);
    this.layers.set(layer.id, konvaLayer);

    // Set z-index by reordering layers
    this.updateLayerOrder();
  }

  public removeLayer(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.destroy();
      this.layers.delete(layerId);
    }
  }

  public updateLayer(layerId: string, props: Partial<LayerInterface>): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    if (props.visible !== undefined) layer.visible(props.visible);
    if (props.opacity !== undefined) layer.opacity(props.opacity);
    
    if (props.zIndex !== undefined) {
      this.updateLayerOrder();
    }

    layer.batchDraw();
  }

  public setLayerOrder(layerIds: string[]): void {
    for (let i = 0; i < layerIds.length; i++) {
      const layer = this.layers.get(layerIds[i]);
      if (layer) {
        layer.zIndex(i);
      }
    }
  }

  private addShapeToLayer(shape: Konva.Node, zIndex: number): void {
    // Find or create appropriate layer
    let targetLayer = this.getLayerForZIndex(zIndex);
    if (!targetLayer) {
      targetLayer = new Konva.Layer();
      this.stage.add(targetLayer);
    }

    targetLayer.add(shape);
    targetLayer.batchDraw();
  }

  private getLayerForZIndex(zIndex: number): Konva.Layer | null {
    // Simple strategy: use main layer for now
    const layers = this.stage.getLayers();
    return layers.length > 0 ? layers[0] : null;
  }

  private updateLayerOrder(): void {
    // Sort layers by their logical z-index
    // This is a simplified implementation
    this.stage.getLayers().forEach((layer, index) => {
      layer.zIndex(index);
    });
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
    // Pointer events
    this.stage.on('pointerdown', (e) => {
      const pos = this.stage.getPointerPosition();
      if (!pos) return;

      const event: PointerEventData = {
        type: 'pointerdown',
        pointerId: 0, // Konva doesn't provide pointer ID
        position: pos,
        worldPosition: this.screenToWorld(pos),
        button: 0, // Simplified
        buttons: 1,
        target: e.target?.id()
      };

      this.emit('pointerdown', event);
    });

    this.stage.on('pointermove', (e) => {
      const pos = this.stage.getPointerPosition();
      if (!pos) return;

      const event: PointerEventData = {
        type: 'pointermove',
        pointerId: 0,
        position: pos,
        worldPosition: this.screenToWorld(pos),
        button: 0,
        buttons: 1,
        target: e.target?.id()
      };

      this.emit('pointermove', event);
    });

    this.stage.on('pointerup', (e) => {
      const pos = this.stage.getPointerPosition();
      if (!pos) return;

      const event: PointerEventData = {
        type: 'pointerup',
        pointerId: 0,
        position: pos,
        worldPosition: this.screenToWorld(pos),
        button: 0,
        buttons: 0,
        target: e.target?.id()
      };

      this.emit('pointerup', event);
    });

    // Wheel events
    this.stage.on('wheel', (e) => {
      const pos = this.stage.getPointerPosition();
      if (!pos) return;

      const event: WheelEventData = {
        type: 'wheel',
        position: pos,
        worldPosition: this.screenToWorld(pos),
        deltaX: e.evt.deltaX,
        deltaY: e.evt.deltaY,
        deltaZ: e.evt.deltaZ
      };

      this.emit('wheel', event);
    });
  }

  public getIntersection(position: Vector2): string | null {
    const shape = this.stage.getIntersection(position);
    return shape ? shape.id() : null;
  }

  private startPerformanceTracking(): void {
    let lastTime = performance.now();
    
    const trackFrame = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      
      this.lastFrameTime = deltaTime;
      this.frameCount++;
      
      // Update FPS every second
      if (this.frameCount % 60 === 0) {
        this.fps = Math.round(1000 / deltaTime);
      }
      
      lastTime = currentTime;
      requestAnimationFrame(trackFrame);
    };
    
    requestAnimationFrame(trackFrame);
  }

  private updatePerformanceStats(): void {
    // Performance stats are updated in the tracking loop
  }

  public getStats(): {
    fps: number;
    frameTime: number;
    drawCalls: number;
    memory: number;
  } {
    return {
      fps: this.fps,
      frameTime: this.lastFrameTime,
      drawCalls: this.shapes.size, // Approximation
      memory: 0 // Not available in Konva
    };
  }

  public isSupported(): boolean {
    return true; // Konva/Canvas is universally supported
  }

  public getType(): 'konva' | 'webgl' {
    return 'konva';
  }

  public dispose(): void {
    this.stage.destroy();
    this.layers.clear();
    this.shapes.clear();
    this.eventListeners.clear();
    console.log('Konva renderer disposed');
  }
}
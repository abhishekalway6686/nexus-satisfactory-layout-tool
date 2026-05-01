/**
 * Renderer Interface - Abstract interface for different rendering backends
 * Allows components to work with both Konva and WebGL renderers
 */

import { Vector2, Vector3 } from './webgl/types';

// Common shape properties
export interface BaseShapeProps {
  id: string;
  x: number;
  y: number;
  z?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}

export interface RectProps extends BaseShapeProps {
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export interface CircleProps extends BaseShapeProps {
  radius: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface LineProps extends BaseShapeProps {
  points: number[];
  stroke: string;
  strokeWidth: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  dash?: number[];
}

export interface TextProps extends BaseShapeProps {
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontStyle?: string;
  fontWeight?: string;
  fill?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

export interface ImageProps extends BaseShapeProps {
  image: HTMLImageElement | HTMLCanvasElement;
  width: number;
  height: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Layer interface
export interface LayerInterface {
  id: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
  children: string[];
}

// Event interfaces
export interface PointerEventData {
  type: 'pointerdown' | 'pointermove' | 'pointerup';
  pointerId: number;
  position: Vector2;
  worldPosition: Vector2;
  button: number;
  buttons: number;
  target?: string; // Renderable ID
}

export interface WheelEventData {
  type: 'wheel';
  position: Vector2;
  worldPosition: Vector2;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
}

// Transform interface
export interface TransformInterface {
  scale: number;
  x: number;
  y: number;
}

export interface ViewportInterface {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Main renderer interface
export interface RendererInterface {
  // Initialization
  initialize(): Promise<void>;
  resize(width: number, height: number): void;
  dispose(): void;

  // Rendering
  render(): void;
  clear(): void;
  
  // Transform management
  setViewport(viewport: ViewportInterface): void;
  setTransform(transform: TransformInterface): void;
  getTransform(): TransformInterface;
  
  // Coordinate conversion
  screenToWorld(screenPoint: Vector2): Vector2;
  worldToScreen(worldPoint: Vector2): Vector2;

  // Shape management
  addRect(props: RectProps): void;
  addCircle(props: CircleProps): void;
  addLine(props: LineProps): void;
  addText(props: TextProps): void;
  addImage(props: ImageProps): void;
  
  updateShape(id: string, props: Partial<BaseShapeProps>): void;
  removeShape(id: string): void;
  getShape(id: string): BaseShapeProps | null;
  
  // Layer management
  addLayer(layer: LayerInterface): void;
  removeLayer(layerId: string): void;
  updateLayer(layerId: string, props: Partial<LayerInterface>): void;
  setLayerOrder(layerIds: string[]): void;
  
  // Event handling
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
  
  // Hit testing
  getIntersection(position: Vector2): string | null;
  
  // Performance
  getStats(): {
    fps: number;
    frameTime: number;
    drawCalls: number;
    memory: number;
  };
  
  // Capabilities
  isSupported(): boolean;
  getType(): 'konva' | 'webgl';
}
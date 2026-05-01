/**
 * WebGL Renderer Types - Type definitions for the WebGL rendering system
 */

// Configuration
export interface WebGLRendererConfig {
  antialias: boolean;
  preserveDrawingBuffer: boolean;
  powerPreference: 'default' | 'high-performance' | 'low-power';
  failIfMajorPerformanceCaveat: boolean;
  enablePerformanceMonitoring: boolean;
  maxTextureSize: number;
  enableInstancing: boolean;
  enableBatching: boolean;
}

// Render context passed to each frame
export interface RenderContext {
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  transform: {
    scale: number;
    x: number;
    y: number;
  };
  layers: RenderLayer[];
  renderables: Map<string, Renderable>;
}

// Layer definition
export interface RenderLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
  renderables: string[]; // IDs of renderables in this layer
}

// Base renderable object
export interface Renderable {
  id: string;
  type: RenderableType;
  visible: boolean;
  position: Vector3;
  rotation: number;
  scale: Vector2;
  color: Color;
  opacity: number;
  zIndex: number;
  userData?: any;
}

// Specific renderable types
export type RenderableType = 
  | 'rect' 
  | 'circle' 
  | 'line' 
  | 'path' 
  | 'text' 
  | 'arrow' 
  | 'ring' 
  | 'arc'
  | 'image'
  | 'group';

export interface RectRenderable extends Renderable {
  type: 'rect';
  width: number;
  height: number;
  cornerRadius?: number;
  stroke?: StrokeStyle;
  fill?: FillStyle;
}

export interface CircleRenderable extends Renderable {
  type: 'circle';
  radius: number;
  stroke?: StrokeStyle;
  fill?: FillStyle;
}

export interface LineRenderable extends Renderable {
  type: 'line';
  points: Vector2[];
  stroke: StrokeStyle;
  closed?: boolean;
}

export interface PathRenderable extends Renderable {
  type: 'path';
  path: PathCommand[];
  stroke?: StrokeStyle;
  fill?: FillStyle;
}

export interface TextRenderable extends Renderable {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  textBaseline?: 'top' | 'middle' | 'bottom';
  fill?: FillStyle;
}

export interface ArrowRenderable extends Renderable {
  type: 'arrow';
  points: Vector2[];
  pointerLength: number;
  pointerWidth: number;
  stroke: StrokeStyle;
  fill?: FillStyle;
}

export interface RingRenderable extends Renderable {
  type: 'ring';
  innerRadius: number;
  outerRadius: number;
  stroke?: StrokeStyle;
  fill?: FillStyle;
}

export interface ArcRenderable extends Renderable {
  type: 'arc';
  radius: number;
  angle: number;
  clockwise: boolean;
  stroke?: StrokeStyle;
  fill?: FillStyle;
}

export interface ImageRenderable extends Renderable {
  type: 'image';
  imageId: string;
  width: number;
  height: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface GroupRenderable extends Renderable {
  type: 'group';
  children: string[]; // IDs of child renderables
}

// Styling
export interface StrokeStyle {
  color: Color;
  width: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  dashArray?: number[];
  dashOffset?: number;
}

export interface FillStyle {
  type: 'solid' | 'gradient';
  color?: Color;
  gradient?: Gradient;
}

export interface Gradient {
  type: 'linear' | 'radial';
  stops: GradientStop[];
  start?: Vector2;
  end?: Vector2;
  center?: Vector2;
  radius?: number;
}

export interface GradientStop {
  offset: number;
  color: Color;
}

// Path commands
export type PathCommand = 
  | MoveToCommand
  | LineToCommand
  | CurveToCommand
  | QuadraticCurveToCommand
  | ArcToCommand
  | ClosePathCommand;

export interface MoveToCommand {
  type: 'moveTo';
  x: number;
  y: number;
}

export interface LineToCommand {
  type: 'lineTo';
  x: number;
  y: number;
}

export interface CurveToCommand {
  type: 'curveTo';
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
  x: number;
  y: number;
}

export interface QuadraticCurveToCommand {
  type: 'quadraticCurveTo';
  cpx: number;
  cpy: number;
  x: number;
  y: number;
}

export interface ArcToCommand {
  type: 'arcTo';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  radius: number;
}

export interface ClosePathCommand {
  type: 'closePath';
}

// Math types
export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Matrix3 {
  elements: Float32Array; // 3x3 matrix in column-major order
}

export interface Matrix4 {
  elements: Float32Array; // 4x4 matrix in column-major order
}

export interface Color {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1
}

// Event types
export interface PointerEvent {
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel';
  pointerId: number;
  position: Vector2;
  worldPosition: Vector2;
  button: number;
  buttons: number;
  pressure: number;
  target?: Renderable;
  timestamp: number;
}

export interface WheelEvent {
  type: 'wheel';
  position: Vector2;
  worldPosition: Vector2;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  deltaMode: number;
  timestamp: number;
}

export interface KeyboardEvent {
  type: 'keydown' | 'keyup';
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  repeat: boolean;
  timestamp: number;
}

// Shader types
export interface ShaderProgram {
  id: string;
  program: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation>;
  attributes: Map<string, number>;
}

export interface UniformValue {
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat3' | 'mat4' | 'int' | 'bool' | 'texture2D';
  value: number | Float32Array | WebGLTexture | boolean;
}

// Buffer types
export interface BufferData {
  id: string;
  buffer: WebGLBuffer;
  type: 'vertex' | 'index' | 'uniform';
  usage: 'static' | 'dynamic' | 'stream';
  size: number;
  data?: ArrayBuffer;
}

// Texture types
export interface TextureData {
  id: string;
  texture: WebGLTexture;
  width: number;
  height: number;
  format: number;
  type: number;
  mipMaps: boolean;
  wrapS: number;
  wrapT: number;
  minFilter: number;
  magFilter: number;
}

// Performance monitoring
export interface RenderStats {
  frameTime: number;
  drawCalls: number;
  triangles: number;
  bufferMemory: number;
  textureMemory: number;
  fps: number;
}

export interface PerformanceProfile {
  name: string;
  samples: number[];
  average: number;
  min: number;
  max: number;
  total: number;
}

// Hit testing
export interface HitTestResult {
  hit: boolean;
  renderable?: Renderable;
  position: Vector2;
  worldPosition: Vector2;
  distance: number;
}

// Drag and drop
export interface DragState {
  isDragging: boolean;
  target?: Renderable;
  startPosition: Vector2;
  startWorldPosition: Vector2;
  currentPosition: Vector2;
  currentWorldPosition: Vector2;
  deltaPosition: Vector2;
  deltaWorldPosition: Vector2;
  constraints?: DragConstraints;
}

export interface DragConstraints {
  axis?: 'x' | 'y';
  bounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  snap?: {
    grid?: Vector2;
    points?: Vector2[];
    threshold: number;
  };
}

// Animation
export interface AnimationCurve {
  keyframes: Keyframe[];
  interpolation: 'linear' | 'cubic' | 'step';
}

export interface Keyframe {
  time: number;
  value: number | Vector2 | Vector3 | Vector4 | Color;
  inTangent?: Vector2;
  outTangent?: Vector2;
}

export interface Animation {
  id: string;
  target: string; // Renderable ID
  property: string;
  curve: AnimationCurve;
  duration: number;
  loop: boolean;
  pingPong: boolean;
  startTime: number;
  endTime: number;
}
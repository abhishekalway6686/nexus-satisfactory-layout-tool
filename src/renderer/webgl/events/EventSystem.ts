/**
 * Event System - Handles input events and hit testing for WebGL renderer
 * Provides Konva-compatible event handling
 */

import { PointerEvent, WheelEvent, KeyboardEvent, HitTestResult, DragState, DragConstraints, Renderable } from '../types';
import { TransformSystem } from '../core/TransformSystem';

type EventListener<T> = (event: T) => void;

interface EventListeners {
  pointerdown: EventListener<PointerEvent>[];
  pointermove: EventListener<PointerEvent>[];
  pointerup: EventListener<PointerEvent>[];
  pointercancel: EventListener<PointerEvent>[];
  wheel: EventListener<WheelEvent>[];
  keydown: EventListener<KeyboardEvent>[];
  keyup: EventListener<KeyboardEvent>[];
}

export class EventSystem {
  private canvas: HTMLCanvasElement;
  private transformSystem: TransformSystem;
  private listeners: EventListeners;
  private renderables: Map<string, Renderable> = new Map();
  
  // Drag state
  private dragState: DragState = {
    isDragging: false,
    startPosition: { x: 0, y: 0 },
    startWorldPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    currentWorldPosition: { x: 0, y: 0 },
    deltaPosition: { x: 0, y: 0 },
    deltaWorldPosition: { x: 0, y: 0 }
  };

  // Hit testing cache
  private hitTestCache: Map<string, { bounds: DOMRect; timestamp: number }> = new Map();
  private hitTestCacheTimeout: number = 100; // ms

  constructor(canvas: HTMLCanvasElement, transformSystem: TransformSystem) {
    this.canvas = canvas;
    this.transformSystem = transformSystem;
    
    this.listeners = {
      pointerdown: [],
      pointermove: [],
      pointerup: [],
      pointercancel: [],
      wheel: [],
      keydown: [],
      keyup: []
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Pointer events
    this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('pointercancel', this.handlePointerCancel.bind(this));
    
    // Wheel events
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    
    // Keyboard events (on document for global capture)
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Prevent context menu on canvas
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public setRenderables(renderables: Map<string, Renderable>): void {
    this.renderables = renderables;
    this.invalidateHitTestCache();
  }

  public addEventListener<T extends keyof EventListeners>(
    type: T, 
    listener: EventListeners[T][0]
  ): void {
    this.listeners[type].push(listener);
  }

  public removeEventListener<T extends keyof EventListeners>(
    type: T, 
    listener: EventListeners[T][0]
  ): void {
    const index = this.listeners[type].indexOf(listener);
    if (index > -1) {
      this.listeners[type].splice(index, 1);
    }
  }

  private emit<T extends keyof EventListeners>(type: T, event: Parameters<EventListeners[T][0]>[0]): void {
    this.listeners[type].forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in ${type} event listener:`, error);
      }
    });
  }

  private handlePointerDown(nativeEvent: globalThis.PointerEvent): void {
    const position = this.getEventPosition(nativeEvent);
    const worldPosition = this.transformSystem.screenToWorld(position);
    const hitResult = this.performHitTest(position, worldPosition);

    const event: PointerEvent = {
      type: 'pointerdown',
      pointerId: nativeEvent.pointerId,
      position,
      worldPosition,
      button: nativeEvent.button,
      buttons: nativeEvent.buttons,
      pressure: nativeEvent.pressure,
      target: hitResult.renderable,
      timestamp: performance.now()
    };

    // Start drag if target is draggable
    if (hitResult.renderable) {
      this.startDrag(event);
    }

    this.emit('pointerdown', event);
  }

  private handlePointerMove(nativeEvent: globalThis.PointerEvent): void {
    const position = this.getEventPosition(nativeEvent);
    const worldPosition = this.transformSystem.screenToWorld(position);
    const hitResult = this.performHitTest(position, worldPosition);

    const event: PointerEvent = {
      type: 'pointermove',
      pointerId: nativeEvent.pointerId,
      position,
      worldPosition,
      button: nativeEvent.button,
      buttons: nativeEvent.buttons,
      pressure: nativeEvent.pressure,
      target: hitResult.renderable,
      timestamp: performance.now()
    };

    // Update drag state
    if (this.dragState.isDragging) {
      this.updateDrag(event);
    }

    this.emit('pointermove', event);
  }

  private handlePointerUp(nativeEvent: globalThis.PointerEvent): void {
    const position = this.getEventPosition(nativeEvent);
    const worldPosition = this.transformSystem.screenToWorld(position);
    const hitResult = this.performHitTest(position, worldPosition);

    const event: PointerEvent = {
      type: 'pointerup',
      pointerId: nativeEvent.pointerId,
      position,
      worldPosition,
      button: nativeEvent.button,
      buttons: nativeEvent.buttons,
      pressure: nativeEvent.pressure,
      target: hitResult.renderable,
      timestamp: performance.now()
    };

    // End drag
    if (this.dragState.isDragging) {
      this.endDrag(event);
    }

    this.emit('pointerup', event);
  }

  private handlePointerCancel(nativeEvent: globalThis.PointerEvent): void {
    const position = this.getEventPosition(nativeEvent);
    const worldPosition = this.transformSystem.screenToWorld(position);

    const event: PointerEvent = {
      type: 'pointercancel',
      pointerId: nativeEvent.pointerId,
      position,
      worldPosition,
      button: nativeEvent.button,
      buttons: nativeEvent.buttons,
      pressure: nativeEvent.pressure,
      timestamp: performance.now()
    };

    // Cancel drag
    if (this.dragState.isDragging) {
      this.cancelDrag();
    }

    this.emit('pointercancel', event);
  }

  private handleWheel(nativeEvent: globalThis.WheelEvent): void {
    nativeEvent.preventDefault(); // Prevent page scroll
    
    const position = this.getEventPosition(nativeEvent);
    const worldPosition = this.transformSystem.screenToWorld(position);

    const event: WheelEvent = {
      type: 'wheel',
      position,
      worldPosition,
      deltaX: nativeEvent.deltaX,
      deltaY: nativeEvent.deltaY,
      deltaZ: nativeEvent.deltaZ,
      deltaMode: nativeEvent.deltaMode,
      timestamp: performance.now()
    };

    this.emit('wheel', event);
  }

  private handleKeyDown(nativeEvent: globalThis.KeyboardEvent): void {
    // Only handle if canvas has focus or is focused element
    if (!this.isCanvasFocused()) return;

    const event: KeyboardEvent = {
      type: 'keydown',
      key: nativeEvent.key,
      code: nativeEvent.code,
      ctrlKey: nativeEvent.ctrlKey,
      shiftKey: nativeEvent.shiftKey,
      altKey: nativeEvent.altKey,
      metaKey: nativeEvent.metaKey,
      repeat: nativeEvent.repeat,
      timestamp: performance.now()
    };

    this.emit('keydown', event);
  }

  private handleKeyUp(nativeEvent: globalThis.KeyboardEvent): void {
    if (!this.isCanvasFocused()) return;

    const event: KeyboardEvent = {
      type: 'keyup',
      key: nativeEvent.key,
      code: nativeEvent.code,
      ctrlKey: nativeEvent.ctrlKey,
      shiftKey: nativeEvent.shiftKey,
      altKey: nativeEvent.altKey,
      metaKey: nativeEvent.metaKey,
      repeat: nativeEvent.repeat,
      timestamp: performance.now()
    };

    this.emit('keyup', event);
  }

  private getEventPosition(event: MouseEvent | globalThis.PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (event.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  private isCanvasFocused(): boolean {
    return document.activeElement === this.canvas || 
           this.canvas.contains(document.activeElement);
  }

  // Hit testing implementation
  public performHitTest(screenPosition: { x: number; y: number }, worldPosition: { x: number; y: number }): HitTestResult {
    let closestRenderable: Renderable | undefined;
    let minDistance = Infinity;

    // Test renderables in reverse z-index order (front to back)
    const sortedRenderables = Array.from(this.renderables.values())
      .filter(r => r.visible)
      .sort((a, b) => b.zIndex - a.zIndex);

    for (const renderable of sortedRenderables) {
      const distance = this.testRenderableHit(renderable, worldPosition);
      if (distance >= 0 && distance < minDistance) {
        closestRenderable = renderable;
        minDistance = distance;
      }
    }

    return {
      hit: !!closestRenderable,
      renderable: closestRenderable,
      position: screenPosition,
      worldPosition,
      distance: closestRenderable ? minDistance : Infinity
    };
  }

  private testRenderableHit(renderable: Renderable, worldPosition: { x: number; y: number }): number {
    // Simple bounding box hit test for now
    // In a full implementation, this would handle different shape types properly
    
    const dx = worldPosition.x - renderable.position.x;
    const dy = worldPosition.y - renderable.position.y;
    
    switch (renderable.type) {
      case 'rect': {
        const rect = renderable as any; // RectRenderable
        const halfWidth = (rect.width * renderable.scale.x) / 2;
        const halfHeight = (rect.height * renderable.scale.y) / 2;
        
        if (Math.abs(dx) <= halfWidth && Math.abs(dy) <= halfHeight) {
          return Math.sqrt(dx * dx + dy * dy);
        }
        return -1;
      }
      
      case 'circle': {
        const circle = renderable as any; // CircleRenderable
        const radius = circle.radius * Math.max(renderable.scale.x, renderable.scale.y);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
          return distance;
        }
        return -1;
      }
      
      default:
        // Default to point distance for other types
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= 10 ? distance : -1; // 10 pixel tolerance
    }
  }

  // Drag and drop implementation
  private startDrag(event: PointerEvent): void {
    if (!event.target) return;

    this.dragState = {
      isDragging: true,
      target: event.target,
      startPosition: { ...event.position },
      startWorldPosition: { ...event.worldPosition },
      currentPosition: { ...event.position },
      currentWorldPosition: { ...event.worldPosition },
      deltaPosition: { x: 0, y: 0 },
      deltaWorldPosition: { x: 0, y: 0 }
    };

    // Set pointer capture
    this.canvas.setPointerCapture(event.pointerId);
  }

  private updateDrag(event: PointerEvent): void {
    if (!this.dragState.isDragging || !this.dragState.target) return;

    const deltaPosition = {
      x: event.position.x - this.dragState.currentPosition.x,
      y: event.position.y - this.dragState.currentPosition.y
    };

    const deltaWorldPosition = {
      x: event.worldPosition.x - this.dragState.currentWorldPosition.x,
      y: event.worldPosition.y - this.dragState.currentWorldPosition.y
    };

    this.dragState.currentPosition = { ...event.position };
    this.dragState.currentWorldPosition = { ...event.worldPosition };
    this.dragState.deltaPosition = deltaPosition;
    this.dragState.deltaWorldPosition = deltaWorldPosition;

    // Apply constraints
    const constrainedDelta = this.applyDragConstraints(deltaWorldPosition);

    // Update target position
    if (constrainedDelta.x !== 0 || constrainedDelta.y !== 0) {
      this.dragState.target.position.x += constrainedDelta.x;
      this.dragState.target.position.y += constrainedDelta.y;
    }
  }

  private endDrag(event: PointerEvent): void {
    if (this.dragState.isDragging) {
      // Release pointer capture
      this.canvas.releasePointerCapture(event.pointerId);
      
      this.dragState.isDragging = false;
      this.dragState.target = undefined;
    }
  }

  private cancelDrag(): void {
    if (this.dragState.isDragging && this.dragState.target) {
      // Reset target to original position
      this.dragState.target.position.x = this.dragState.startWorldPosition.x;
      this.dragState.target.position.y = this.dragState.startWorldPosition.y;
      
      this.dragState.isDragging = false;
      this.dragState.target = undefined;
    }
  }

  private applyDragConstraints(delta: { x: number; y: number }): { x: number; y: number } {
    if (!this.dragState.constraints) {
      return delta;
    }

    const constraints = this.dragState.constraints;
    const constrainedDelta = { ...delta };

    // Axis constraints
    if (constraints.axis === 'x') {
      constrainedDelta.y = 0;
    } else if (constraints.axis === 'y') {
      constrainedDelta.x = 0;
    }

    // Bounds constraints
    if (constraints.bounds && this.dragState.target) {
      const newX = this.dragState.target.position.x + constrainedDelta.x;
      const newY = this.dragState.target.position.y + constrainedDelta.y;

      if (newX < constraints.bounds.left) {
        constrainedDelta.x = constraints.bounds.left - this.dragState.target.position.x;
      } else if (newX > constraints.bounds.right) {
        constrainedDelta.x = constraints.bounds.right - this.dragState.target.position.x;
      }

      if (newY < constraints.bounds.top) {
        constrainedDelta.y = constraints.bounds.top - this.dragState.target.position.y;
      } else if (newY > constraints.bounds.bottom) {
        constrainedDelta.y = constraints.bounds.bottom - this.dragState.target.position.y;
      }
    }

    // Snap constraints
    if (constraints.snap && this.dragState.target) {
      const newPos = {
        x: this.dragState.target.position.x + constrainedDelta.x,
        y: this.dragState.target.position.y + constrainedDelta.y
      };

      // Grid snapping
      if (constraints.snap.grid) {
        const snappedX = Math.round(newPos.x / constraints.snap.grid.x) * constraints.snap.grid.x;
        const snappedY = Math.round(newPos.y / constraints.snap.grid.y) * constraints.snap.grid.y;
        
        if (Math.abs(newPos.x - snappedX) <= constraints.snap.threshold) {
          constrainedDelta.x = snappedX - this.dragState.target.position.x;
        }
        
        if (Math.abs(newPos.y - snappedY) <= constraints.snap.threshold) {
          constrainedDelta.y = snappedY - this.dragState.target.position.y;
        }
      }

      // Point snapping
      if (constraints.snap.points) {
        for (const point of constraints.snap.points) {
          const distance = Math.sqrt(
            Math.pow(newPos.x - point.x, 2) + Math.pow(newPos.y - point.y, 2)
          );
          
          if (distance <= constraints.snap.threshold) {
            constrainedDelta.x = point.x - this.dragState.target.position.x;
            constrainedDelta.y = point.y - this.dragState.target.position.y;
            break;
          }
        }
      }
    }

    return constrainedDelta;
  }

  public setDragConstraints(constraints: DragConstraints | undefined): void {
    this.dragState.constraints = constraints;
  }

  public getDragState(): DragState {
    return { ...this.dragState };
  }

  private invalidateHitTestCache(): void {
    this.hitTestCache.clear();
  }

  public dispose(): void {
    // Remove event listeners
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvas.removeEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvas.removeEventListener('pointerup', this.handlePointerUp.bind(this));
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel.bind(this));
    this.canvas.removeEventListener('wheel', this.handleWheel.bind(this));
    
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));

    // Clear state
    this.listeners = {
      pointerdown: [],
      pointermove: [],
      pointerup: [],
      pointercancel: [],
      wheel: [],
      keydown: [],
      keyup: []
    };
    
    this.renderables.clear();
    this.hitTestCache.clear();
    
    console.log('EventSystem disposed');
  }
}
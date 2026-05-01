/**
 * Transform System - Handles coordinate transformations and matrix calculations
 */

import { Matrix4, Vector2, Vector3 } from '../types';

export class TransformSystem {
  private viewMatrix: Matrix4;
  private projectionMatrix: Matrix4;
  private mvpMatrix: Matrix4;
  private inverseViewMatrix: Matrix4;
  private inverseProjectionMatrix: Matrix4;
  private inverseMvpMatrix: Matrix4;

  private viewportWidth: number = 1;
  private viewportHeight: number = 1;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  private isDirty: boolean = true;

  constructor() {
    this.viewMatrix = this.createIdentityMatrix();
    this.projectionMatrix = this.createIdentityMatrix();
    this.mvpMatrix = this.createIdentityMatrix();
    this.inverseViewMatrix = this.createIdentityMatrix();
    this.inverseProjectionMatrix = this.createIdentityMatrix();
    this.inverseMvpMatrix = this.createIdentityMatrix();
  }

  public setViewportSize(width: number, height: number): void {
    if (this.viewportWidth !== width || this.viewportHeight !== height) {
      this.viewportWidth = width;
      this.viewportHeight = height;
      this.isDirty = true;
    }
  }

  public setTransform(scale: number, x: number, y: number): void {
    if (this.scale !== scale || this.offsetX !== x || this.offsetY !== y) {
      this.scale = scale;
      this.offsetX = x;
      this.offsetY = y;
      this.isDirty = true;
    }
  }

  public updateMatrices(): void {
    if (!this.isDirty) return;

    this.updateProjectionMatrix();
    this.updateViewMatrix();
    this.updateMvpMatrix();
    this.updateInverseMatrices();

    this.isDirty = false;
  }

  private updateProjectionMatrix(): void {
    // Create orthographic projection matrix
    // Convert from screen coordinates to normalized device coordinates
    const left = 0;
    const right = this.viewportWidth;
    const bottom = this.viewportHeight;
    const top = 0;
    const near = -1000;
    const far = 1000;

    this.projectionMatrix = this.createOrthographicMatrix(left, right, bottom, top, near, far);
  }

  private updateViewMatrix(): void {
    // Create view matrix that handles zoom and pan
    // The view matrix transforms world coordinates to camera coordinates
    this.viewMatrix = this.createIdentityMatrix();
    
    // Apply scale (zoom)
    this.scaleMatrix(this.viewMatrix, this.scale, this.scale, 1);
    
    // Apply translation (pan)
    this.translateMatrix(this.viewMatrix, this.offsetX, this.offsetY, 0);
  }

  private updateMvpMatrix(): void {
    this.mvpMatrix = this.multiplyMatrices(this.projectionMatrix, this.viewMatrix);
  }

  private updateInverseMatrices(): void {
    this.inverseViewMatrix = this.invertMatrix(this.viewMatrix);
    this.inverseProjectionMatrix = this.invertMatrix(this.projectionMatrix);
    this.inverseMvpMatrix = this.invertMatrix(this.mvpMatrix);
  }

  // Matrix creation helpers
  private createIdentityMatrix(): Matrix4 {
    return {
      elements: new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ])
    };
  }

  private createOrthographicMatrix(
    left: number, right: number, 
    bottom: number, top: number, 
    near: number, far: number
  ): Matrix4 {
    const matrix = this.createIdentityMatrix();
    const elements = matrix.elements;

    const rl = right - left;
    const tb = top - bottom;
    const fn = far - near;

    elements[0] = 2 / rl;
    elements[5] = 2 / tb;
    elements[10] = -2 / fn;
    elements[12] = -(right + left) / rl;
    elements[13] = -(top + bottom) / tb;
    elements[14] = -(far + near) / fn;

    return matrix;
  }

  private scaleMatrix(matrix: Matrix4, x: number, y: number, z: number): void {
    const elements = matrix.elements;
    
    elements[0] *= x;
    elements[1] *= x;
    elements[2] *= x;
    elements[3] *= x;
    
    elements[4] *= y;
    elements[5] *= y;
    elements[6] *= y;
    elements[7] *= y;
    
    elements[8] *= z;
    elements[9] *= z;
    elements[10] *= z;
    elements[11] *= z;
  }

  private translateMatrix(matrix: Matrix4, x: number, y: number, z: number): void {
    const elements = matrix.elements;
    
    elements[12] += elements[0] * x + elements[4] * y + elements[8] * z;
    elements[13] += elements[1] * x + elements[5] * y + elements[9] * z;
    elements[14] += elements[2] * x + elements[6] * y + elements[10] * z;
    elements[15] += elements[3] * x + elements[7] * y + elements[11] * z;
  }

  private multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4 {
    const result = this.createIdentityMatrix();
    const ae = a.elements;
    const be = b.elements;
    const re = result.elements;

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        re[i * 4 + j] = 
          ae[i * 4 + 0] * be[0 * 4 + j] +
          ae[i * 4 + 1] * be[1 * 4 + j] +
          ae[i * 4 + 2] * be[2 * 4 + j] +
          ae[i * 4 + 3] * be[3 * 4 + j];
      }
    }

    return result;
  }

  private invertMatrix(matrix: Matrix4): Matrix4 {
    const m = matrix.elements;
    const inv = new Float32Array(16);

    inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + 
             m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];

    inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - 
             m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];

    inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + 
             m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];

    inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - 
              m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];

    inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - 
             m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];

    inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + 
             m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];

    inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - 
             m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];

    inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + 
              m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];

    inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + 
             m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];

    inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - 
             m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];

    inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + 
              m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];

    inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - 
              m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];

    inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - 
             m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];

    inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + 
             m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];

    inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - 
              m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];

    inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + 
              m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

    const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

    if (det === 0) {
      console.warn('Matrix is not invertible');
      return this.createIdentityMatrix();
    }

    const detInv = 1.0 / det;
    for (let i = 0; i < 16; i++) {
      inv[i] *= detInv;
    }

    return { elements: inv };
  }

  // Coordinate transformation methods
  public screenToWorld(screenPoint: Vector2): Vector2 {
    // Convert screen coordinates to world coordinates
    // Screen point is in pixels, return world coordinates
    
    // First convert to normalized device coordinates (-1 to 1)
    const ndcX = (screenPoint.x / this.viewportWidth) * 2 - 1;
    const ndcY = (screenPoint.y / this.viewportHeight) * 2 - 1;
    
    // Apply inverse MVP transformation
    const clipPoint = { x: ndcX, y: ndcY, z: 0, w: 1 };
    const worldPoint = this.transformPoint(clipPoint, this.inverseMvpMatrix);
    
    return { x: worldPoint.x, y: worldPoint.y };
  }

  public worldToScreen(worldPoint: Vector2): Vector2 {
    // Convert world coordinates to screen coordinates
    const clipPoint = this.transformPoint(
      { x: worldPoint.x, y: worldPoint.y, z: 0, w: 1 }, 
      this.mvpMatrix
    );
    
    // Convert from normalized device coordinates to screen coordinates
    const screenX = (clipPoint.x + 1) * 0.5 * this.viewportWidth;
    const screenY = (clipPoint.y + 1) * 0.5 * this.viewportHeight;
    
    return { x: screenX, y: screenY };
  }

  private transformPoint(point: { x: number; y: number; z: number; w: number }, matrix: Matrix4): Vector3 {
    const m = matrix.elements;
    const x = point.x, y = point.y, z = point.z, w = point.w;
    
    const rx = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    const ry = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    const rz = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    const rw = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    
    // Perspective divide
    if (rw !== 0) {
      return { x: rx / rw, y: ry / rw, z: rz / rw };
    }
    
    return { x: rx, y: ry, z: rz };
  }

  // Getters for matrices
  public getViewMatrix(): Matrix4 {
    this.updateMatrices();
    return this.viewMatrix;
  }

  public getProjectionMatrix(): Matrix4 {
    this.updateMatrices();
    return this.projectionMatrix;
  }

  public getMvpMatrix(): Matrix4 {
    this.updateMatrices();
    return this.mvpMatrix;
  }

  public getInverseViewMatrix(): Matrix4 {
    this.updateMatrices();
    return this.inverseViewMatrix;
  }

  public getInverseProjectionMatrix(): Matrix4 {
    this.updateMatrices();
    return this.inverseProjectionMatrix;
  }

  public getInverseMvpMatrix(): Matrix4 {
    this.updateMatrices();
    return this.inverseMvpMatrix;
  }

  // Getters for transform parameters
  public getScale(): number {
    return this.scale;
  }

  public getOffset(): Vector2 {
    return { x: this.offsetX, y: this.offsetY };
  }

  public getViewportSize(): Vector2 {
    return { x: this.viewportWidth, y: this.viewportHeight };
  }

  // Utility methods
  public getVisibleBounds(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } {
    const topLeft = this.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.screenToWorld({ 
      x: this.viewportWidth, 
      y: this.viewportHeight 
    });

    return {
      left: topLeft.x,
      right: bottomRight.x,
      top: topLeft.y,
      bottom: bottomRight.y
    };
  }

  public isPointVisible(worldPoint: Vector2, margin: number = 0): boolean {
    const bounds = this.getVisibleBounds();
    return worldPoint.x >= bounds.left - margin &&
           worldPoint.x <= bounds.right + margin &&
           worldPoint.y >= bounds.top - margin &&
           worldPoint.y <= bounds.bottom + margin;
  }

  public createModelMatrix(position: Vector3, rotation: number, scale: Vector2): Matrix4 {
    const matrix = this.createIdentityMatrix();
    
    // Apply transformations in order: Scale -> Rotate -> Translate
    this.scaleMatrix(matrix, scale.x, scale.y, 1);
    
    if (rotation !== 0) {
      this.rotateMatrix(matrix, rotation);
    }
    
    this.translateMatrix(matrix, position.x, position.y, position.z);
    
    return matrix;
  }

  private rotateMatrix(matrix: Matrix4, angle: number): void {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const elements = matrix.elements;
    
    const m11 = elements[0] * c + elements[4] * s;
    const m12 = elements[1] * c + elements[5] * s;
    const m13 = elements[2] * c + elements[6] * s;
    const m14 = elements[3] * c + elements[7] * s;
    
    elements[4] = elements[4] * c - elements[0] * s;
    elements[5] = elements[5] * c - elements[1] * s;
    elements[6] = elements[6] * c - elements[2] * s;
    elements[7] = elements[7] * c - elements[3] * s;
    
    elements[0] = m11;
    elements[1] = m12;
    elements[2] = m13;
    elements[3] = m14;
  }
}
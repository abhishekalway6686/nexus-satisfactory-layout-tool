/**
 * Shader Manager - Handles compilation, linking, and management of WebGL shaders
 */

import { WebGLContext } from './WebGLContext';
import { ShaderProgram, UniformValue } from '../types';

interface ShaderSource {
  vertex: string;
  fragment: string;
}

export class ShaderManager {
  private context: WebGLContext;
  private programs: Map<string, ShaderProgram> = new Map();
  private currentProgram: ShaderProgram | null = null;

  constructor(context: WebGLContext) {
    this.context = context;
  }

  public async loadShaders(): Promise<void> {
    // Load default shaders for basic shapes
    await this.loadShader('basic', this.getBasicShaderSource());
    await this.loadShader('textured', this.getTexturedShaderSource());
    await this.loadShader('instanced', this.getInstancedShaderSource());
    await this.loadShader('text', this.getTextShaderSource());
    await this.loadShader('line', this.getLineShaderSource());
    await this.loadShader('circle', this.getCircleShaderSource());
  }

  public async loadShader(id: string, source: ShaderSource): Promise<void> {
    const gl = this.context.gl;

    // Compile vertex shader
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, source.vertex);
    if (!vertexShader) {
      throw new Error(`Failed to compile vertex shader for ${id}`);
    }

    // Compile fragment shader
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, source.fragment);
    if (!fragmentShader) {
      gl.deleteShader(vertexShader);
      throw new Error(`Failed to compile fragment shader for ${id}`);
    }

    // Link program
    const program = this.linkProgram(vertexShader, fragmentShader);
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error(`Failed to link shader program for ${id}`);
    }

    // Get uniform and attribute locations
    const uniforms = this.getUniformLocations(program);
    const attributes = this.getAttributeLocations(program);

    const shaderProgram: ShaderProgram = {
      id,
      program,
      uniforms,
      attributes
    };

    this.programs.set(id, shaderProgram);

    // Clean up individual shaders
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    console.log(`Loaded shader program: ${id}`);
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.context.gl;
    const shader = gl.createShader(type);
    
    if (!shader) {
      return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      console.error('Shader compilation error:', error);
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private linkProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    const gl = this.context.gl;
    const program = gl.createProgram();
    
    if (!program) {
      return null;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      console.error('Program linking error:', error);
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  private getUniformLocations(program: WebGLProgram): Map<string, WebGLUniformLocation> {
    const gl = this.context.gl;
    const uniforms = new Map<string, WebGLUniformLocation>();
    
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    
    for (let i = 0; i < uniformCount; i++) {
      const uniformInfo = gl.getActiveUniform(program, i);
      if (uniformInfo) {
        const location = gl.getUniformLocation(program, uniformInfo.name);
        if (location) {
          uniforms.set(uniformInfo.name, location);
        }
      }
    }

    return uniforms;
  }

  private getAttributeLocations(program: WebGLProgram): Map<string, number> {
    const gl = this.context.gl;
    const attributes = new Map<string, number>();
    
    const attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    
    for (let i = 0; i < attributeCount; i++) {
      const attributeInfo = gl.getActiveAttrib(program, i);
      if (attributeInfo) {
        const location = gl.getAttribLocation(program, attributeInfo.name);
        if (location !== -1) {
          attributes.set(attributeInfo.name, location);
        }
      }
    }

    return attributes;
  }

  public useProgram(id: string): boolean {
    const program = this.programs.get(id);
    if (!program) {
      console.error(`Shader program not found: ${id}`);
      return false;
    }

    if (this.currentProgram !== program) {
      this.context.gl.useProgram(program.program);
      this.currentProgram = program;
    }

    return true;
  }

  public setUniform(name: string, value: UniformValue): boolean {
    if (!this.currentProgram) {
      console.error('No shader program is currently active');
      return false;
    }

    const location = this.currentProgram.uniforms.get(name);
    if (!location) {
      // Uniform might not exist or be optimized out
      return false;
    }

    const gl = this.context.gl;

    switch (value.type) {
      case 'float':
        gl.uniform1f(location, value.value as number);
        break;
      case 'vec2':
        const vec2 = value.value as Float32Array;
        gl.uniform2fv(location, vec2);
        break;
      case 'vec3':
        const vec3 = value.value as Float32Array;
        gl.uniform3fv(location, vec3);
        break;
      case 'vec4':
        const vec4 = value.value as Float32Array;
        gl.uniform4fv(location, vec4);
        break;
      case 'mat3':
        const mat3 = value.value as Float32Array;
        gl.uniformMatrix3fv(location, false, mat3);
        break;
      case 'mat4':
        const mat4 = value.value as Float32Array;
        gl.uniformMatrix4fv(location, false, mat4);
        break;
      case 'int':
        gl.uniform1i(location, value.value as number);
        break;
      case 'bool':
        gl.uniform1i(location, value.value ? 1 : 0);
        break;
      case 'texture2D':
        // Texture binding is handled elsewhere
        gl.uniform1i(location, value.value as number);
        break;
    }

    return true;
  }

  public getProgram(id: string): ShaderProgram | undefined {
    return this.programs.get(id);
  }

  public getCurrentProgram(): ShaderProgram | null {
    return this.currentProgram;
  }

  private getBasicShaderSource(): ShaderSource {
    return {
      vertex: `
        attribute vec2 a_position;
        attribute vec4 a_color;
        
        uniform mat4 u_mvpMatrix;
        
        varying vec4 v_color;
        
        void main() {
          gl_Position = u_mvpMatrix * vec4(a_position, 0.0, 1.0);
          v_color = a_color;
        }
      `,
      fragment: `
        precision mediump float;
        
        varying vec4 v_color;
        
        void main() {
          gl_FragColor = v_color;
        }
      `
    };
  }

  private getTexturedShaderSource(): ShaderSource {
    return {
      vertex: `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        attribute vec4 a_color;
        
        uniform mat4 u_mvpMatrix;
        
        varying vec2 v_texCoord;
        varying vec4 v_color;
        
        void main() {
          gl_Position = u_mvpMatrix * vec4(a_position, 0.0, 1.0);
          v_texCoord = a_texCoord;
          v_color = a_color;
        }
      `,
      fragment: `
        precision mediump float;
        
        uniform sampler2D u_texture;
        
        varying vec2 v_texCoord;
        varying vec4 v_color;
        
        void main() {
          vec4 texColor = texture2D(u_texture, v_texCoord);
          gl_FragColor = texColor * v_color;
        }
      `
    };
  }

  private getInstancedShaderSource(): ShaderSource {
    return {
      vertex: `
        attribute vec2 a_position;
        attribute vec4 a_color;
        attribute mat4 a_instanceMatrix;
        
        uniform mat4 u_viewMatrix;
        uniform mat4 u_projectionMatrix;
        
        varying vec4 v_color;
        
        void main() {
          gl_Position = u_projectionMatrix * u_viewMatrix * a_instanceMatrix * vec4(a_position, 0.0, 1.0);
          v_color = a_color;
        }
      `,
      fragment: `
        precision mediump float;
        
        varying vec4 v_color;
        
        void main() {
          gl_FragColor = v_color;
        }
      `
    };
  }

  private getTextShaderSource(): ShaderSource {
    return {
      vertex: `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        
        uniform mat4 u_mvpMatrix;
        
        varying vec2 v_texCoord;
        
        void main() {
          gl_Position = u_mvpMatrix * vec4(a_position, 0.0, 1.0);
          v_texCoord = a_texCoord;
        }
      `,
      fragment: `
        precision mediump float;
        
        uniform sampler2D u_texture;
        uniform vec4 u_color;
        
        varying vec2 v_texCoord;
        
        void main() {
          float alpha = texture2D(u_texture, v_texCoord).a;
          gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
        }
      `
    };
  }

  private getLineShaderSource(): ShaderSource {
    return {
      vertex: `
        attribute vec2 a_position;
        attribute vec4 a_color;
        attribute float a_width;
        
        uniform mat4 u_mvpMatrix;
        uniform vec2 u_resolution;
        
        varying vec4 v_color;
        varying float v_width;
        
        void main() {
          gl_Position = u_mvpMatrix * vec4(a_position, 0.0, 1.0);
          v_color = a_color;
          v_width = a_width;
          
          // Calculate line thickness in screen space
          gl_PointSize = a_width;
        }
      `,
      fragment: `
        precision mediump float;
        
        varying vec4 v_color;
        varying float v_width;
        
        void main() {
          gl_FragColor = v_color;
        }
      `
    };
  }

  private getCircleShaderSource(): ShaderSource {
    return {
      vertex: `
        attribute vec2 a_position;
        attribute vec2 a_center;
        attribute float a_radius;
        attribute vec4 a_color;
        
        uniform mat4 u_mvpMatrix;
        
        varying vec2 v_center;
        varying float v_radius;
        varying vec4 v_color;
        varying vec2 v_position;
        
        void main() {
          gl_Position = u_mvpMatrix * vec4(a_position, 0.0, 1.0);
          v_center = a_center;
          v_radius = a_radius;
          v_color = a_color;
          v_position = a_position;
        }
      `,
      fragment: `
        precision mediump float;
        
        varying vec2 v_center;
        varying float v_radius;
        varying vec4 v_color;
        varying vec2 v_position;
        
        void main() {
          float distance = length(v_position - v_center);
          if (distance > v_radius) {
            discard;
          }
          gl_FragColor = v_color;
        }
      `
    };
  }

  public dispose(): void {
    this.programs.forEach(program => {
      this.context.gl.deleteProgram(program.program);
    });
    this.programs.clear();
    this.currentProgram = null;
  }
}
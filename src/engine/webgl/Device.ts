import { EngineError } from '../types'
import type { GLContext, TextureFormat } from './context'
import { Program } from './Program'
import { DoubleTarget, Target } from './Target'
import baseVertex from '../shaders/base.vert.glsl?raw'

// One owner for every GL resource; covers partial initialization and React StrictMode cleanup.
export class Device {
  private readonly resources = new Set<{ dispose(): void }>()
  private readonly vertices: WebGLBuffer
  private readonly indices: WebGLBuffer

  constructor(readonly context: GLContext) {
    const { gl } = context
    const vertices = gl.createBuffer()
    const indices = gl.createBuffer()
    if (!vertices || !indices) {
      gl.deleteBuffer(vertices)
      gl.deleteBuffer(indices)
      throw new EngineError('initialization', 'Could not allocate geometry')
    }
    this.vertices = vertices
    this.indices = indices
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW,
    )
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices)
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      gl.STATIC_DRAW,
    )
  }

  track(resource: { dispose(): void }): void {
    this.resources.add(resource)
  }

  program(
    fragment: string,
    keywords: readonly string[] = [],
    vertex = baseVertex,
  ): Program {
    const program = new Program(this.context.gl, vertex, fragment, keywords)
    this.resources.add(program)
    return program
  }

  target(
    width: number,
    height: number,
    format: TextureFormat = this.context.rgba,
    filter?: number,
    type = this.context.halfFloat,
  ): Target {
    const { gl, capabilities } = this.context
    const target = new Target(
      gl,
      width,
      height,
      format,
      type,
      filter ?? (capabilities.linearFiltering ? gl.LINEAR : gl.NEAREST),
    )
    this.resources.add(target)
    return target
  }

  doubleTarget(
    width: number,
    height: number,
    format: TextureFormat,
    filter?: number,
  ): DoubleTarget {
    return new DoubleTarget(
      this.target(width, height, format, filter),
      this.target(width, height, format, filter),
    )
  }

  release(resource: Target | Program | DoubleTarget): void {
    if (resource instanceof DoubleTarget) {
      this.release(resource.read)
      this.release(resource.write)
    } else {
      resource.dispose()
      this.resources.delete(resource)
    }
  }

  blit = (target: Target | null): void => {
    const { gl } = this.context
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.fbo ?? null)
    gl.viewport(
      0,
      0,
      target?.width ?? gl.drawingBufferWidth,
      target?.height ?? gl.drawingBufferHeight,
    )
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
  }

  dispose(): void {
    for (const resource of this.resources) resource.dispose()
    this.resources.clear()
    this.context.gl.deleteBuffer(this.vertices)
    this.context.gl.deleteBuffer(this.indices)
  }
}

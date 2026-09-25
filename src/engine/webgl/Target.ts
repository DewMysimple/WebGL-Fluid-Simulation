import { EngineError, type GL } from '../types'
import type { TextureFormat } from './context'

export class Target {
  readonly texture: WebGLTexture
  readonly fbo: WebGLFramebuffer
  readonly texelSizeX: number
  readonly texelSizeY: number
  private disposed = false

  constructor(
    private readonly gl: GL,
    readonly width: number,
    readonly height: number,
    format: TextureFormat,
    type: number,
    filter: number,
  ) {
    const texture = gl.createTexture()
    const framebuffer = gl.createFramebuffer()
    if (!texture || !framebuffer) {
      gl.deleteTexture(texture)
      gl.deleteFramebuffer(framebuffer)
      throw new EngineError(
        'initialization',
        'Could not allocate render target',
      )
    }
    this.texture = texture
    this.fbo = framebuffer
    this.texelSizeX = 1 / width
    this.texelSizeY = 1 / height
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      format.internalFormat,
      width,
      height,
      0,
      format.format,
      type,
      null,
    )
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    )
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      this.dispose()
      throw new EngineError('initialization', 'Incomplete framebuffer')
    }
    gl.viewport(0, 0, width, height)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  attach(unit: number): number {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit)
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
    return unit
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.gl.deleteTexture(this.texture)
    this.gl.deleteFramebuffer(this.fbo)
  }
}

export class DoubleTarget {
  constructor(
    public read: Target,
    public write: Target,
  ) {}
  get texelSizeX(): number {
    return this.read.texelSizeX
  }
  get texelSizeY(): number {
    return this.read.texelSizeY
  }
  swap(): void {
    ;[this.read, this.write] = [this.write, this.read]
  }
  dispose(): void {
    this.read.dispose()
    this.write.dispose()
  }
}

import { EngineError, type Capabilities, type GL } from '../types'

export interface TextureFormat {
  internalFormat: number
  format: number
}
export interface GLContext {
  gl: GL
  capabilities: Capabilities
  halfFloat: number
  rgba: TextureFormat
  rg: TextureFormat
  r: TextureFormat
}

function probe(
  gl: GL,
  internalFormat: number,
  format: number,
  type: number,
): TextureFormat | null {
  const texture = gl.createTexture()
  const framebuffer = gl.createFramebuffer()
  if (!texture || !framebuffer) {
    gl.deleteTexture(texture)
    gl.deleteFramebuffer(framebuffer)
    return null
  }
  try {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    )
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
      ? { internalFormat, format }
      : null
  } finally {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.deleteFramebuffer(framebuffer)
    gl.deleteTexture(texture)
  }
}

export function createContext(canvas: HTMLCanvasElement): GLContext {
  const options: WebGLContextAttributes = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
  }
  const gl2 = canvas.getContext('webgl2', options)
  const gl = gl2 || canvas.getContext('webgl', options)
  if (!gl) throw new EngineError('unsupported', 'WebGL is unavailable')
  let halfFloat: number
  let linearFiltering: boolean
  if (gl2) {
    if (!gl2.getExtension('EXT_color_buffer_float'))
      throw new EngineError(
        'unsupported',
        'Float render targets are unavailable',
      )
    halfFloat = gl2.HALF_FLOAT
    // Half-float textures are filterable in WebGL 2 without OES_texture_float_linear.
    linearFiltering = true
  } else {
    const ext = gl.getExtension('OES_texture_half_float')
    if (!ext)
      throw new EngineError(
        'unsupported',
        'Half-float textures are unavailable',
      )
    halfFloat = ext.HALF_FLOAT_OES
    gl.getExtension('EXT_color_buffer_half_float')
    linearFiltering = !!gl.getExtension('OES_texture_half_float_linear')
  }
  const rgba = probe(gl, gl2 ? gl2.RGBA16F : gl.RGBA, gl.RGBA, halfFloat)
  if (!rgba)
    throw new EngineError(
      'unsupported',
      'No renderable half-float texture format',
    )
  const rg = gl2 ? probe(gl, gl2.RG16F, gl2.RG, halfFloat) || rgba : rgba
  const r = gl2 ? probe(gl, gl2.R16F, gl2.RED, halfFloat) || rg : rgba
  gl.clearColor(0, 0, 0, 0)
  return {
    gl,
    halfFloat,
    rgba,
    rg,
    r,
    capabilities: {
      version: gl2 ? 2 : 1,
      linearFiltering,
      maxTextureSize: Math.min(
        gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
        4096,
      ),
    },
  }
}

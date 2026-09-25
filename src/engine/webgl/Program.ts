import { EngineError, type GL } from '../types'

export class Program {
  private readonly handle: WebGLProgram
  private readonly uniforms = new Map<string, WebGLUniformLocation>()
  private disposed = false

  constructor(
    private readonly gl: GL,
    vertex: string,
    fragment: string,
    keywords: readonly string[] = [],
  ) {
    const shaders: WebGLShader[] = []
    const attached = new Set<WebGLShader>()
    let linked = false
    const program = gl.createProgram()
    if (!program)
      throw new EngineError(
        'initialization',
        'Could not allocate shader program',
      )
    this.handle = program
    try {
      for (const [type, source] of [
        [gl.VERTEX_SHADER, vertex],
        [gl.FRAGMENT_SHADER, fragment],
      ] as const) {
        const shader = gl.createShader(type)
        if (!shader)
          throw new EngineError('initialization', 'Could not allocate shader')
        shaders.push(shader)
        gl.shaderSource(
          shader,
          keywords.map((k) => `#define ${k}\n`).join('') + source,
        )
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          throw new EngineError(
            'initialization',
            gl.getShaderInfoLog(shader) || 'Shader compilation failed',
          )
        }
        gl.attachShader(program, shader)
        attached.add(shader)
      }
      gl.bindAttribLocation(program, 0, 'aPosition')
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new EngineError(
          'initialization',
          gl.getProgramInfoLog(program) || 'Shader linking failed',
        )
      }
      const count = gl.getProgramParameter(
        program,
        gl.ACTIVE_UNIFORMS,
      ) as number
      for (let i = 0; i < count; i++) {
        const info = gl.getActiveUniform(program, i)
        if (info) {
          const location = gl.getUniformLocation(program, info.name)
          if (location !== null) this.uniforms.set(info.name, location)
        }
      }
      linked = true
    } finally {
      for (const shader of shaders) {
        if (attached.has(shader)) gl.detachShader(program, shader)
        gl.deleteShader(shader)
      }
      if (!linked) gl.deleteProgram(program)
    }
  }

  bind(): void {
    this.gl.useProgram(this.handle)
  }
  // Optional keyword uniforms may legitimately be optimized out.
  uniform(name: string): WebGLUniformLocation | null {
    return this.uniforms.get(name) ?? null
  }
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.gl.deleteProgram(this.handle)
  }
}

export type GL = WebGLRenderingContext | WebGL2RenderingContext
export interface Color {
  r: number
  g: number
  b: number
}
export interface Size {
  width: number
  height: number
}
export interface Splat {
  x: number
  y: number
  dx: number
  dy: number
  color: Color
}
export type EngineErrorCode =
  'unsupported' | 'contextLost' | 'initialization' | 'capture'
export class EngineError extends Error {
  constructor(
    public readonly code: EngineErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'EngineError'
  }
}
export interface Capabilities {
  version: 1 | 2
  linearFiltering: boolean
  maxTextureSize: number
}

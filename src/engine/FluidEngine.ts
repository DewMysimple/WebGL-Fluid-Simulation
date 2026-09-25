import {
  adaptConfig,
  hexToColor,
  sanitizeConfig,
  type FluidConfig,
} from './config'
import {
  EngineError,
  type Capabilities,
  type EngineErrorCode,
  type Splat,
} from './types'
import { createContext } from './webgl/context'
import { Device } from './webgl/Device'
import { createSolver, type Solver } from './solver'
import { createRenderer, type Renderer } from './renderer'
import { bindPointerInput } from './input'
import { randomColor } from './math'
import { capture } from './capture'

export interface EngineStatus {
  capabilities: Capabilities | null
  error: EngineErrorCode | null
}
interface Runtime {
  device: Device
  solver: Solver
  renderer: Renderer
}

/** Imperative GPU boundary. No React imports or per-frame React state updates. */
export class FluidEngine {
  private runtime: Runtime | null = null
  private config: FluidConfig
  private requestedConfig: FluidConfig
  private readonly events = new AbortController()
  private readonly unbindInput: () => void
  private readonly pending = new Map<number, Splat>()
  private frame = 0
  private previousTime = 0
  private disposed = false

  constructor(
    private readonly canvas: HTMLCanvasElement,
    initialConfig: FluidConfig,
    private readonly onStatus: (status: EngineStatus) => void,
  ) {
    this.requestedConfig = sanitizeConfig(initialConfig)
    this.config = this.requestedConfig
    this.unbindInput = bindPointerInput(
      canvas,
      () => this.config,
      (id, splat) => {
        // Coalesce input between frames; browser event frequency does not grow the queue.
        const previous = this.pending.get(id)
        this.pending.set(
          id,
          previous
            ? {
                ...splat,
                dx: previous.dx + splat.dx,
                dy: previous.dy + splat.dy,
              }
            : splat,
        )
      },
    )
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault()
        this.stop()
        this.releaseRuntime()
        this.onStatus({ capabilities: null, error: 'contextLost' })
      },
      { signal: this.events.signal },
    )
    canvas.addEventListener('webglcontextrestored', () => this.initialize(), {
      signal: this.events.signal,
    })
    document.addEventListener(
      'visibilitychange',
      () => {
        this.stop()
        if (!document.hidden && this.runtime) this.start()
      },
      { signal: this.events.signal },
    )
    this.initialize()
  }

  private initialize(): void {
    if (this.disposed) return
    let device: Device | undefined
    try {
      this.resizeCanvas()
      device = new Device(createContext(this.canvas))
      this.config = adaptConfig(
        this.requestedConfig,
        device.context.capabilities.linearFiltering,
      )
      const solver = createSolver(device, this.config)
      const renderer = createRenderer(device, solver, this.config)
      this.runtime = { device, solver, renderer }
      this.randomSplats(12)
      this.onStatus({ capabilities: device.context.capabilities, error: null })
      if (!document.hidden) this.start()
    } catch (error) {
      device?.dispose()
      this.runtime = null
      this.report(error)
    }
  }

  setConfig(next: FluidConfig): void {
    this.requestedConfig = sanitizeConfig(next)
    if (!this.runtime) return
    try {
      this.config = adaptConfig(
        this.requestedConfig,
        this.runtime.device.context.capabilities.linearFiltering,
      )
      this.runtime.solver.setConfig(this.config)
      this.runtime.renderer.setConfig(this.config)
    } catch (error) {
      this.fail(error)
    }
  }

  randomSplats(amount = 12): void {
    if (!this.runtime) return
    const { solver } = this.runtime
    for (let i = 0; i < Math.min(50, amount); i++) {
      solver.splat(
        Math.random(),
        Math.random(),
        1000 * (Math.random() - 0.5),
        1000 * (Math.random() - 0.5),
        this.config.colorful
          ? randomColor(1.5)
          : hexToColor(this.config.inkColor, 1.5),
      )
    }
  }

  clear(): void {
    this.pending.clear()
    this.runtime?.solver.clear()
  }

  async capture(): Promise<Blob> {
    if (!this.runtime) throw new EngineError('capture', 'Engine is unavailable')
    return capture(this.runtime.device, this.runtime.renderer, this.config)
  }

  private resizeCanvas(): boolean {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.floor(this.canvas.clientWidth * ratio))
    const height = Math.max(1, Math.floor(this.canvas.clientHeight * ratio))
    if (this.canvas.width === width && this.canvas.height === height)
      return false
    this.canvas.width = width
    this.canvas.height = height
    return true
  }

  private tick = (time: number): void => {
    if (this.disposed || !this.runtime) return
    const dt = Math.min(Math.max((time - this.previousTime) / 1000, 0), 1 / 60)
    this.previousTime = time
    try {
      const { solver, renderer } = this.runtime
      if (this.resizeCanvas()) {
        solver.resize()
        renderer.resize()
      }
      for (const { x, y, dx, dy, color } of this.pending.values())
        solver.splat(x, y, dx, dy, color)
      this.pending.clear()
      if (!this.config.paused) solver.step(dt)
      renderer.render()
      this.frame = requestAnimationFrame(this.tick)
    } catch (error) {
      this.fail(error)
    }
  }

  private start(): void {
    this.stop()
    this.previousTime = performance.now()
    this.frame = requestAnimationFrame(this.tick)
  }
  private stop(): void {
    cancelAnimationFrame(this.frame)
    this.frame = 0
  }
  private releaseRuntime(): void {
    this.runtime?.device.dispose()
    this.runtime = null
    this.pending.clear()
  }
  private report(error: unknown): void {
    console.error('Fluid engine:', error)
    this.onStatus({
      capabilities: null,
      error: error instanceof EngineError ? error.code : 'initialization',
    })
  }
  private fail(error: unknown): void {
    this.stop()
    this.releaseRuntime()
    this.report(error)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    this.events.abort()
    this.unbindInput()
    this.releaseRuntime()
  }
}

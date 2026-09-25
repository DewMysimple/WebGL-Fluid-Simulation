import { useEffect, useRef, useState } from 'react'
import { FluidEngine, type EngineStatus, type FluidConfig } from '../../engine'

export function useFluidEngine(config: FluidConfig) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<FluidEngine | null>(null)
  const initialConfig = useRef(config)
  const [status, setStatus] = useState<EngineStatus>({
    capabilities: null,
    error: null,
  })
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new FluidEngine(canvas, initialConfig.current, setStatus)
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])
  useEffect(() => {
    engineRef.current?.setConfig(config)
  }, [config])
  return { canvasRef, engineRef, status }
}

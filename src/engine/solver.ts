/*
MIT License

Copyright (c) 2017 Pavel Dobryakov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import type { FluidConfig } from './config'
import type { Color } from './types'
import { resolution } from './math'
import type { Device } from './webgl/Device'
import type { DoubleTarget } from './webgl/Target'
import copySource from './shaders/copy.frag.glsl?raw'
import clearSource from './shaders/clear.frag.glsl?raw'
import splatSource from './shaders/splat.frag.glsl?raw'
import advectionSource from './shaders/advection.frag.glsl?raw'
import divergenceSource from './shaders/divergence.frag.glsl?raw'
import curlSource from './shaders/curl.frag.glsl?raw'
import vorticitySource from './shaders/vorticity.frag.glsl?raw'
import pressureSource from './shaders/pressure.frag.glsl?raw'
import gradientSubtractSource from './shaders/gradient-subtract.frag.glsl?raw'

export function createSolver(device: Device, initialConfig: FluidConfig) {
  const { gl, capabilities, rgba, rg, r } = device.context
  const { blit } = device
  let config = initialConfig
  const copyProgram = device.program(copySource)
  const clearProgram = device.program(clearSource)
  const splatProgram = device.program(splatSource)
  const advectionProgram = device.program(
    advectionSource,
    capabilities.linearFiltering ? [] : ['MANUAL_FILTERING'],
  )
  const divergenceProgram = device.program(divergenceSource)
  const curlProgram = device.program(curlSource)
  const vorticityProgram = device.program(vorticitySource)
  const pressureProgram = device.program(pressureSource)
  const gradientSubtractProgram = device.program(gradientSubtractSource)
  const size = (base: number) =>
    resolution(
      base,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      capabilities.maxTextureSize,
    )
  let sim = size(config.simResolution)
  let ink = size(config.dyeResolution)
  let dye = device.doubleTarget(ink.width, ink.height, rgba)
  let velocity = device.doubleTarget(sim.width, sim.height, rg)
  let divergence = device.target(sim.width, sim.height, r, gl.NEAREST)
  let curl = device.target(sim.width, sim.height, r, gl.NEAREST)
  let pressure = device.doubleTarget(sim.width, sim.height, r, gl.NEAREST)

  function copy(from: DoubleTarget, to: DoubleTarget) {
    copyProgram.bind()
    gl.uniform1i(copyProgram.uniform('uTexture'), from.read.attach(0))
    blit(to.read)
    device.release(from)
    return to
  }

  function resize() {
    gl.disable(gl.BLEND)
    const nextSim = size(config.simResolution)
    const nextInk = size(config.dyeResolution)
    if (nextInk.width !== ink.width || nextInk.height !== ink.height) {
      dye = copy(dye, device.doubleTarget(nextInk.width, nextInk.height, rgba))
      ink = nextInk
    }
    if (nextSim.width !== sim.width || nextSim.height !== sim.height) {
      velocity = copy(
        velocity,
        device.doubleTarget(nextSim.width, nextSim.height, rg),
      )
      device.release(divergence)
      device.release(curl)
      device.release(pressure)
      sim = nextSim
      divergence = device.target(sim.width, sim.height, r, gl.NEAREST)
      curl = device.target(sim.width, sim.height, r, gl.NEAREST)
      pressure = device.doubleTarget(sim.width, sim.height, r, gl.NEAREST)
    }
  }

  function clear() {
    gl.clearColor(0, 0, 0, 0)
    for (const target of [
      dye.read,
      dye.write,
      velocity.read,
      velocity.write,
      pressure.read,
      pressure.write,
      divergence,
      curl,
    ]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
  }

  function step(dt: number) {
    gl.disable(gl.BLEND)

    curlProgram.bind()
    gl.uniform2f(
      curlProgram.uniform('texelSize'),
      velocity.texelSizeX,
      velocity.texelSizeY,
    )
    gl.uniform1i(curlProgram.uniform('uVelocity'), velocity.read.attach(0))
    blit(curl)

    vorticityProgram.bind()
    gl.uniform2f(
      vorticityProgram.uniform('texelSize'),
      velocity.texelSizeX,
      velocity.texelSizeY,
    )
    gl.uniform1i(vorticityProgram.uniform('uVelocity'), velocity.read.attach(0))
    gl.uniform1i(vorticityProgram.uniform('uCurl'), curl.attach(1))
    gl.uniform1f(vorticityProgram.uniform('curl'), config.curl)
    gl.uniform1f(vorticityProgram.uniform('dt'), dt)
    blit(velocity.write)
    velocity.swap()

    divergenceProgram.bind()
    gl.uniform2f(
      divergenceProgram.uniform('texelSize'),
      velocity.texelSizeX,
      velocity.texelSizeY,
    )
    gl.uniform1i(
      divergenceProgram.uniform('uVelocity'),
      velocity.read.attach(0),
    )
    blit(divergence)

    clearProgram.bind()
    gl.uniform1i(clearProgram.uniform('uTexture'), pressure.read.attach(0))
    gl.uniform1f(clearProgram.uniform('value'), config.pressure)
    blit(pressure.write)
    pressure.swap()

    pressureProgram.bind()
    gl.uniform2f(
      pressureProgram.uniform('texelSize'),
      velocity.texelSizeX,
      velocity.texelSizeY,
    )
    gl.uniform1i(pressureProgram.uniform('uDivergence'), divergence.attach(0))
    for (let i = 0; i < config.pressureIterations; i++) {
      gl.uniform1i(
        pressureProgram.uniform('uPressure'),
        pressure.read.attach(1),
      )
      blit(pressure.write)
      pressure.swap()
    }

    gradientSubtractProgram.bind()
    gl.uniform2f(
      gradientSubtractProgram.uniform('texelSize'),
      velocity.texelSizeX,
      velocity.texelSizeY,
    )
    gl.uniform1i(
      gradientSubtractProgram.uniform('uPressure'),
      pressure.read.attach(0),
    )
    gl.uniform1i(
      gradientSubtractProgram.uniform('uVelocity'),
      velocity.read.attach(1),
    )
    blit(velocity.write)
    velocity.swap()

    advectionProgram.bind()
    gl.uniform2f(
      advectionProgram.uniform('texelSize'),
      velocity.texelSizeX,
      velocity.texelSizeY,
    )
    if (!capabilities.linearFiltering)
      gl.uniform2f(
        advectionProgram.uniform('dyeTexelSize'),
        velocity.texelSizeX,
        velocity.texelSizeY,
      )
    const velocityId = velocity.read.attach(0)
    gl.uniform1i(advectionProgram.uniform('uVelocity'), velocityId)
    gl.uniform1i(advectionProgram.uniform('uSource'), velocityId)
    gl.uniform1f(advectionProgram.uniform('dt'), dt)
    gl.uniform1f(
      advectionProgram.uniform('dissipation'),
      config.velocityDissipation,
    )
    blit(velocity.write)
    velocity.swap()

    if (!capabilities.linearFiltering)
      gl.uniform2f(
        advectionProgram.uniform('dyeTexelSize'),
        dye.texelSizeX,
        dye.texelSizeY,
      )
    gl.uniform1i(advectionProgram.uniform('uVelocity'), velocity.read.attach(0))
    gl.uniform1i(advectionProgram.uniform('uSource'), dye.read.attach(1))
    gl.uniform1f(
      advectionProgram.uniform('dissipation'),
      config.densityDissipation,
    )
    blit(dye.write)
    dye.swap()
  }

  function splat(x: number, y: number, dx: number, dy: number, color: Color) {
    gl.disable(gl.BLEND)
    splatProgram.bind()
    gl.uniform1i(splatProgram.uniform('uTarget'), velocity.read.attach(0))
    gl.uniform1f(
      splatProgram.uniform('aspectRatio'),
      gl.drawingBufferWidth / gl.drawingBufferHeight,
    )
    gl.uniform2f(splatProgram.uniform('point'), x, y)
    gl.uniform3f(splatProgram.uniform('color'), dx, dy, 0.0)
    gl.uniform1f(
      splatProgram.uniform('radius'),
      correctRadius(config.splatRadius / 100.0),
    )
    blit(velocity.write)
    velocity.swap()

    gl.uniform1i(splatProgram.uniform('uTarget'), dye.read.attach(0))
    gl.uniform3f(splatProgram.uniform('color'), color.r, color.g, color.b)
    blit(dye.write)
    dye.swap()
  }

  function correctRadius(radius: number) {
    const aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight
    if (aspectRatio > 1) radius *= aspectRatio
    return radius
  }

  return {
    step,
    splat,
    resize,
    clear,
    get dye() {
      return dye
    },
    setConfig(next: FluidConfig) {
      config = next
      resize()
    },
  }
}

export type Solver = ReturnType<typeof createSolver>

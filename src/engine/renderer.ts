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

import { hexToColor, type FluidConfig } from './config'
import type { Color } from './types'
import { resolution } from './math'
import type { Solver } from './solver'
import type { Device } from './webgl/Device'
import type { Target } from './webgl/Target'
import displaySource from './shaders/display.frag.glsl?raw'
import blurVertex from './shaders/blur.vert.glsl?raw'
import { createDithering } from './webgl/dithering'
import blurSource from './shaders/blur.frag.glsl?raw'
import colorSource from './shaders/color.frag.glsl?raw'
import checkerboardSource from './shaders/checkerboard.frag.glsl?raw'
import bloomPrefilterSource from './shaders/bloom-prefilter.frag.glsl?raw'
import bloomBlurSource from './shaders/bloom-blur.frag.glsl?raw'
import bloomFinalSource from './shaders/bloom-final.frag.glsl?raw'
import sunraysMaskSource from './shaders/sunrays-mask.frag.glsl?raw'
import sunraysSource from './shaders/sunrays.frag.glsl?raw'

export function createRenderer(
  device: Device,
  solver: Solver,
  initialConfig: FluidConfig,
) {
  const { gl, capabilities } = device.context
  const { blit } = device
  let config = initialConfig
  const blurProgram = device.program(blurSource, [], blurVertex)
  const colorProgram = device.program(colorSource)
  const checkerboardProgram = device.program(checkerboardSource)
  const bloomPrefilterProgram = device.program(bloomPrefilterSource)
  const bloomBlurProgram = device.program(bloomBlurSource)
  const bloomFinalProgram = device.program(bloomFinalSource)
  const sunraysMaskProgram = device.program(sunraysMaskSource)
  const sunraysProgram = device.program(sunraysSource)
  const ditheringTexture = createDithering(device)
  const keywords = () =>
    [
      config.shading ? 'SHADING' : '',
      config.bloom ? 'BLOOM' : '',
      config.sunrays ? 'SUNRAYS' : '',
    ].filter(Boolean)
  let keywordKey = keywords().join(',')
  let displayMaterial = device.program(displaySource, keywords())
  let bloom: Target
  let sunrays: Target
  let sunraysTemp: Target
  let bloomFramebuffers: Target[] = []
  let sizeKey = ''
  function resize() {
    const nextKey = [
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      config.bloomResolution,
      config.sunraysResolution,
      config.bloomIterations,
    ].join(',')
    if (nextKey === sizeKey) return
    sizeKey = nextKey
    for (const target of [bloom, sunrays, sunraysTemp, ...bloomFramebuffers])
      if (target) device.release(target)
    const b = resolution(
      config.bloomResolution,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      capabilities.maxTextureSize,
    )
    const s = resolution(
      config.sunraysResolution,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      capabilities.maxTextureSize,
    )
    bloom = device.target(b.width, b.height)
    sunrays = device.target(s.width, s.height)
    sunraysTemp = device.target(s.width, s.height)
    bloomFramebuffers = []
    for (let i = 0; i < config.bloomIterations; i++) {
      const w = b.width >> (i + 1)
      const h = b.height >> (i + 1)
      if (w < 2 || h < 2) break
      bloomFramebuffers.push(device.target(w, h))
    }
  }
  resize()

  function render(target: Target | null = null) {
    if (config.bloom) applyBloom(solver.dye.read, bloom)
    if (config.sunrays) {
      applySunrays(solver.dye.read, solver.dye.write, sunrays)
      blur(sunrays, sunraysTemp, 1)
    }

    if (target == null || !config.transparent) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.enable(gl.BLEND)
    } else {
      gl.disable(gl.BLEND)
    }

    if (!config.transparent) drawColor(target, hexToColor(config.background))
    if (target == null && config.transparent) drawCheckerboard(target)
    drawDisplay(target)
  }

  function drawColor(target: Target | null, color: Color) {
    colorProgram.bind()
    gl.uniform4f(colorProgram.uniform('color'), color.r, color.g, color.b, 1)
    blit(target)
  }

  function drawCheckerboard(target: Target | null) {
    checkerboardProgram.bind()
    gl.uniform1f(
      checkerboardProgram.uniform('aspectRatio'),
      gl.drawingBufferWidth / gl.drawingBufferHeight,
    )
    blit(target)
  }

  function drawDisplay(target: Target | null) {
    const width = target == null ? gl.drawingBufferWidth : target.width
    const height = target == null ? gl.drawingBufferHeight : target.height

    displayMaterial.bind()
    if (config.shading)
      gl.uniform2f(
        displayMaterial.uniform('texelSize'),
        1.0 / width,
        1.0 / height,
      )
    gl.uniform1i(displayMaterial.uniform('uTexture'), solver.dye.read.attach(0))
    if (config.bloom) {
      gl.uniform1i(displayMaterial.uniform('uBloom'), bloom.attach(1))
      gl.uniform1i(
        displayMaterial.uniform('uDithering'),
        ditheringTexture.attach(2),
      )
      const scale = {
        x: width / ditheringTexture.width,
        y: height / ditheringTexture.height,
      }
      gl.uniform2f(displayMaterial.uniform('ditherScale'), scale.x, scale.y)
    }
    if (config.sunrays)
      gl.uniform1i(displayMaterial.uniform('uSunrays'), sunrays.attach(3))
    blit(target)
  }

  function applyBloom(source: Target, destination: Target) {
    if (bloomFramebuffers.length < 2) return

    let last = destination

    gl.disable(gl.BLEND)
    bloomPrefilterProgram.bind()
    const knee = config.bloomThreshold * config.bloomSoftKnee + 0.0001
    const curve0 = config.bloomThreshold - knee
    const curve1 = knee * 2
    const curve2 = 0.25 / knee
    gl.uniform3f(bloomPrefilterProgram.uniform('curve'), curve0, curve1, curve2)
    gl.uniform1f(
      bloomPrefilterProgram.uniform('threshold'),
      config.bloomThreshold,
    )
    gl.uniform1i(bloomPrefilterProgram.uniform('uTexture'), source.attach(0))
    blit(last)

    bloomBlurProgram.bind()
    for (let i = 0; i < bloomFramebuffers.length; i++) {
      const dest = bloomFramebuffers[i]
      gl.uniform2f(
        bloomBlurProgram.uniform('texelSize'),
        last.texelSizeX,
        last.texelSizeY,
      )
      gl.uniform1i(bloomBlurProgram.uniform('uTexture'), last.attach(0))
      blit(dest)
      last = dest
    }

    gl.blendFunc(gl.ONE, gl.ONE)
    gl.enable(gl.BLEND)

    for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
      const baseTex = bloomFramebuffers[i]
      gl.uniform2f(
        bloomBlurProgram.uniform('texelSize'),
        last.texelSizeX,
        last.texelSizeY,
      )
      gl.uniform1i(bloomBlurProgram.uniform('uTexture'), last.attach(0))
      gl.viewport(0, 0, baseTex.width, baseTex.height)
      blit(baseTex)
      last = baseTex
    }

    gl.disable(gl.BLEND)
    bloomFinalProgram.bind()
    gl.uniform2f(
      bloomFinalProgram.uniform('texelSize'),
      last.texelSizeX,
      last.texelSizeY,
    )
    gl.uniform1i(bloomFinalProgram.uniform('uTexture'), last.attach(0))
    gl.uniform1f(bloomFinalProgram.uniform('intensity'), config.bloomIntensity)
    blit(destination)
  }

  function applySunrays(source: Target, mask: Target, destination: Target) {
    gl.disable(gl.BLEND)
    sunraysMaskProgram.bind()
    gl.uniform1i(sunraysMaskProgram.uniform('uTexture'), source.attach(0))
    blit(mask)

    sunraysProgram.bind()
    gl.uniform1f(sunraysProgram.uniform('weight'), config.sunraysWeight)
    gl.uniform1i(sunraysProgram.uniform('uTexture'), mask.attach(0))
    blit(destination)
  }

  function blur(target: Target, temp: Target, iterations: number) {
    blurProgram.bind()
    for (let i = 0; i < iterations; i++) {
      gl.uniform2f(blurProgram.uniform('texelSize'), target.texelSizeX, 0.0)
      gl.uniform1i(blurProgram.uniform('uTexture'), target.attach(0))
      blit(temp)

      gl.uniform2f(blurProgram.uniform('texelSize'), 0.0, target.texelSizeY)
      gl.uniform1i(blurProgram.uniform('uTexture'), temp.attach(0))
      blit(target)
    }
  }

  return {
    render,
    resize,
    setConfig(next: FluidConfig) {
      config = next
      const nextKey = keywords().join(',')
      if (keywordKey !== nextKey) {
        const program = device.program(displaySource, keywords())
        device.release(displayMaterial)
        displayMaterial = program
        keywordKey = nextKey
      }
      resize()
    },
  }
}

export type Renderer = ReturnType<typeof createRenderer>

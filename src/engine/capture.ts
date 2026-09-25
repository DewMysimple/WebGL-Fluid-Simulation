import type { FluidConfig } from './config'
import type { Renderer } from './renderer'
import type { Device } from './webgl/Device'
import { EngineError } from './types'
import { resolution } from './math'

// WebGL pixels start at the lower left; ImageData starts at the upper left.
export function flipPixels(
  source: Uint8Array,
  width: number,
  height: number,
  unpremultiply = false,
): Uint8ClampedArray<ArrayBuffer> {
  const output = new Uint8ClampedArray(source.length)
  const stride = width * 4
  for (let y = 0; y < height; y++) {
    output.set(
      source.subarray(y * stride, (y + 1) * stride),
      (height - y - 1) * stride,
    )
  }
  if (unpremultiply) {
    for (let i = 0; i < output.length; i += 4) {
      const alpha = output[i + 3] / 255
      if (alpha > 0)
        for (let channel = 0; channel < 3; channel++)
          output[i + channel] /= alpha
    }
  }
  return output
}

export async function capture(
  device: Device,
  renderer: Renderer,
  config: FluidConfig,
): Promise<Blob> {
  const { gl, capabilities } = device.context
  const { width, height } = resolution(
    config.captureResolution,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight,
    capabilities.maxTextureSize,
  )
  const target = device.target(
    width,
    height,
    { internalFormat: gl.RGBA, format: gl.RGBA },
    gl.NEAREST,
    gl.UNSIGNED_BYTE,
  )
  try {
    renderer.render(target)
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
    const pixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context)
      throw new EngineError('capture', 'Could not create capture canvas')
    context.putImageData(
      new ImageData(
        flipPixels(pixels, width, height, config.transparent),
        width,
        height,
      ),
      0,
      0,
    )
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new EngineError('capture', 'PNG encoding failed'))
      }, 'image/png'),
    )
  } finally {
    device.release(target)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }
}

import type { Device } from './Device'
import ditheringUrl from '../../assets/dithering.png'

export function createDithering(device: Device) {
  const { gl } = device.context
  const target = device.target(
    1,
    1,
    { internalFormat: gl.RGBA, format: gl.RGBA },
    gl.LINEAR,
    gl.UNSIGNED_BYTE,
  )
  let width = 1
  let height = 1
  let disposed = false
  const image = new Image()
  image.onload = () => {
    if (disposed) return
    width = image.width
    height = image.height
    target.attach(0)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
  }
  device.track({
    dispose() {
      disposed = true
      image.onload = null
    },
  })
  image.src = ditheringUrl
  return {
    get width() {
      return width
    },
    get height() {
      return height
    },
    attach: (unit: number) => target.attach(unit),
  }
}

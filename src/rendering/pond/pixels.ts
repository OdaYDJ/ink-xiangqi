/**
 * Pixel-art primitives for the V3 pond: colours, ordered dithering, value
 * noise and a small software canvas that writes straight into ImageData, so
 * every sprite has crisp, hand-placed-looking pixels (no anti-aliasing).
 */

export type RGB = readonly [number, number, number]

export const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
export const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k]

/** 4×4 Bayer matrix, as thresholds in (0, 1). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
export const bayer = (x: number, y: number) => BAYER[((y & 3) << 2) | (x & 3)]

/**
 * A colour from a ramp, dithered: `v` in [0, 1] falls between two steps and the
 * Bayer threshold decides which one this pixel takes. `soft` narrows the dithered
 * band, so most pixels are solid clusters and only the seams are checkered.
 */
export function ramp(r: readonly RGB[], v: number, x: number, y: number, soft = 0.6): RGB {
  const f = clamp(v) * (r.length - 1)
  const i = Math.floor(f)
  if (i >= r.length - 1) return r[r.length - 1]
  const frac = f - i
  // Squeeze the transition toward the middle: wide solid areas, a narrow dithered seam.
  const t = clamp((frac - 0.5) / soft + 0.5)
  return r[t > bayer(x, y) ? i + 1 : i]
}

/** mulberry32: a small deterministic PRNG from an integer seed. */
export function rng(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Smooth value noise in [0, 1]. */
export function noise(x: number, y: number, seed = 0): number {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed)
  const c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed)
  return lerp(lerp(a, b, u), lerp(c, d, u), v)
}

export function fbm(x: number, y: number, seed = 0, octaves = 4): number {
  let v = 0, amp = 0.5, total = 0
  for (let i = 0; i < octaves; i++) {
    v += amp * noise(x, y, seed + i * 31)
    total += amp
    x = x * 2.03 + 1.7
    y = y * 2.03 + 9.2
    amp *= 0.5
  }
  return v / total
}

export const white = (x: number, y: number, seed = 0) => hash(x, y, seed)

/**
 * A small software canvas. Pixels are written with `put` (source-over blending),
 * then `flush` copies them to the backing <canvas> for drawImage.
 */
export class PixelCanvas {
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  readonly img: ImageData
  readonly data: Uint8ClampedArray

  constructor(readonly w: number, readonly h: number, canvas?: HTMLCanvasElement) {
    this.canvas = canvas ?? document.createElement('canvas')
    this.canvas.width = Math.max(1, w)
    this.canvas.height = Math.max(1, h)
    this.ctx = this.canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false
    this.img = this.ctx.createImageData(Math.max(1, w), Math.max(1, h))
    this.data = this.img.data
  }

  put(x: number, y: number, c: RGB, a = 255) {
    x |= 0
    y |= 0
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return
    const i = (y * this.w + x) * 4
    const d = this.data
    if (a >= 255 || d[i + 3] === 0) {
      d[i] = c[0]
      d[i + 1] = c[1]
      d[i + 2] = c[2]
      d[i + 3] = a >= 255 ? 255 : a
      return
    }
    const t = a / 255
    d[i] = d[i] + (c[0] - d[i]) * t
    d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * t
    d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * t
    d[i + 3] = Math.min(255, d[i + 3] + a * (1 - d[i + 3] / 255))
  }

  alphaAt(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0
    return this.data[(y * this.w + x) * 4 + 3]
  }

  flush() {
    this.ctx.putImageData(this.img, 0, 0)
    return this
  }
}

/** The size of one art pixel in CSS pixels: small pixels on big screens, never below 2. */
export function pixelSize(vw: number, vh: number): number {
  return clamp(Math.round(Math.min(vw, vh) / 300), 2, 4)
}

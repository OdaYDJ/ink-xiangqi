import { BRONZE, JADE, WOOD } from './palette'
import { PixelCanvas, clamp, fbm, noise, ramp, white, type RGB } from './pixels'

/**
 * A carved frame of dark, aged wood with a bronze inlay, a band of fret
 * carving, bronze 回纹 corner plates and small jade studs mid-rail, around a
 * translucent surface (the water shows through the board, as in a pond).
 * Drawn pixel by pixel at the pond's pixel size so both read as one picture.
 */
export interface FrameStyle {
  /** Frame width in art pixels. */
  thickness: number
  surface: RGB
  /** Surface opacity, 0–255: low for the board (water shows through), high for text panels. */
  surfaceAlpha: number
  seed?: number
  /** Corner plates and mid-rail studs. */
  ornaments?: boolean
}

/** 回紋: a squared spiral, the unit of the key-fret border. */
const KEY_FRET = [
  '1111111',
  '0000001',
  '1111101',
  '1000101',
  '1011101',
  '1000001',
  '1111111',
]

/** A meander for the carved band, repeating along the rail. */
const MEANDER = ['111010', '001010', '101110']

export function paintFrame(w: number, h: number, style: FrameStyle, canvas?: HTMLCanvasElement): PixelCanvas {
  const pc = new PixelCanvas(w, h, canvas)
  const T = Math.max(4, Math.round(style.thickness))
  const seed = style.seed ?? 5
  const inlay = Math.max(2, Math.round(T * 0.4))
  const bandFrom = inlay + 2, bandTo = T - 3
  const plate = Math.round(T * 1.5)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dl = x, dt = y, dr = w - 1 - x, db = h - 1 - y
      const d = Math.min(dl, dt, dr, db)

      if (d >= T) {
        // The surface: translucent, darker where the frame's edge shades it (top and left).
        const shade = clamp(1 - (Math.min(dl, dt) - T) / 3)
        const a = clamp(style.surfaceAlpha + shade * 70 + (noise(x * 0.3, y * 0.3, seed) - 0.5) * 16, 0, 255)
        pc.put(x, y, shade > 0 ? WOOD[0] : style.surface, a)
        continue
      }

      const side = d === dt ? 1 : d === dl ? 0 : d === db ? 3 : 2
      const lit = side < 2
      const along = side === 0 || side === 2 ? y : x
      let c: RGB
      if (d === 0) c = WOOD[0]
      else if (d === 1) c = lit ? WOOD[6] : WOOD[1]
      else if (d === T - 1) c = WOOD[0]
      else if (d === T - 2) c = lit ? WOOD[1] : WOOD[5]
      else if (d === inlay) c = lit ? BRONZE[5] : BRONZE[4]
      else if (d === inlay + 1) c = BRONZE[2]
      else {
        const grain = fbm(along * 0.07 + side * 40, d * 0.8, seed + side, 3)
        const streak = Math.sin(along * 0.11 + grain * 7) * 0.5 + 0.5
        let v = 0.42 + (grain - 0.5) * 0.5 + streak * 0.12 + (lit ? 0.08 : -0.06)
        if (d >= bandFrom && d <= bandTo && bandTo - bandFrom >= 2) {
          // The recessed band, carved with a running meander.
          v -= 0.1
          const row = MEANDER[Math.min(2, Math.floor(((d - bandFrom) / (bandTo - bandFrom + 1)) * 3))]
          if (row[((along % 6) + 6) % 6] === '1') v -= 0.16
        }
        if (white(x, y, seed) > 0.985) v -= 0.2
        if (white(x, y, seed + 1) > 0.992) v += 0.2
        c = ramp(WOOD, v, x, y)
      }
      pc.put(x, y, c)
    }
  }

  if (style.ornaments !== false) {
    // Bronze corner plates, engraved with 回紋 (mirrored to each corner).
    for (const [cx, cy, fx, fy] of [[0, 0, 1, 1], [w - 1, 0, -1, 1], [0, h - 1, 1, -1], [w - 1, h - 1, -1, -1]]) {
      for (let j = 0; j < plate; j++) {
        for (let i = 0; i < plate; i++) {
          const x = cx + i * fx, y = cy + j * fy
          const edge = i === 0 || j === 0 || i === plate - 1 || j === plate - 1
          const inner = plate - 4
          let c: RGB
          if (edge) c = i === plate - 1 || j === plate - 1 ? BRONZE[1] : BRONZE[0]
          else if (i === 1 || j === 1) c = BRONZE[6]
          else if (inner >= 7 && i >= 2 && j >= 2 && i < plate - 2 && j < plate - 2) {
            const bi = Math.floor(((i - 2) / inner) * 7), bj = Math.floor(((j - 2) / inner) * 7)
            c = KEY_FRET[bj][bi] === '1' ? BRONZE[5] : BRONZE[2]
          } else {
            c = ramp(BRONZE, 0.55 + (fbm(x * 0.4, y * 0.4, seed + 7, 2) - 0.5) * 0.4, x, y)
          }
          pc.put(x, y, c)
        }
      }
      // A rivet at the plate's inner corner.
      pc.put(cx + (plate - 3) * fx, cy + (plate - 3) * fy, BRONZE[6])
    }
    // Jade studs set in bronze at the middle of each rail.
    const r = Math.max(2, Math.round(T * 0.32))
    const mid = Math.round(T / 2)
    for (const [sx, sy] of [[w / 2, mid], [w / 2, h - 1 - mid], [mid, h / 2], [w - 1 - mid, h / 2]]) {
      for (let j = -r - 1; j <= r + 1; j++) {
        for (let i = -r - 1; i <= r + 1; i++) {
          const k = Math.abs(i) + Math.abs(j)
          if (k > r + 1) continue
          const x = Math.round(sx + i), y = Math.round(sy + j)
          if (k === r + 1) pc.put(x, y, i + j < 0 ? BRONZE[5] : BRONZE[1])
          else if (k === r) pc.put(x, y, BRONZE[3])
          else pc.put(x, y, ramp(JADE, 0.7 - (i + j) / (r * 2.5), x, y))
        }
      }
    }
  }
  return pc.flush()
}

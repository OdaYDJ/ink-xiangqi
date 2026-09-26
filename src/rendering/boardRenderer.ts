import { colOf, rowOf, ROWS, COLS } from '../game/board'
import { createRng } from '../game/randomizer'
import { SOLDIER_COLS } from '../game/validator'

/**
 * Board geometry. Intersections are mathematically exact; only the painted
 * strokes get a little brush irregularity.
 */
export const CELL = 64
export const MARGIN = 60
export const WIDTH = MARGIN * 2 + CELL * (COLS - 1)
export const HEIGHT = MARGIN * 2 + CELL * (ROWS - 1)

export const pointX = (col: number) => MARGIN + col * CELL
export const pointY = (row: number) => MARGIN + row * CELL
export const pointOf = (s: number) => ({ x: pointX(colOf(s)), y: pointY(rowOf(s)) })

/** Nearest intersection to an SVG coordinate, or null if the tap was too far from any point. */
export function pointAt(x: number, y: number): number | null {
  const col = Math.round((x - MARGIN) / CELL)
  const row = Math.round((y - MARGIN) / CELL)
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null
  const dx = x - pointX(col), dy = y - pointY(row)
  return dx * dx + dy * dy <= (CELL * 0.55) ** 2 ? row * COLS + col : null
}

export interface Stroke {
  d: string
  width: number
  opacity: number
}

const rng = createRng('ink-board-strokes')

/** A straight line drawn as a gently bowed brush stroke. */
function brushLine(x1: number, y1: number, x2: number, y2: number, width = 1.3): Stroke {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const nx = -(y2 - y1) / len, ny = (x2 - x1) / len
  const bow = (rng() - 0.5) * Math.min(1.6, len / 120)
  const t = 0.35 + rng() * 0.3
  const cx = x1 + (x2 - x1) * t + nx * bow
  const cy = y1 + (y2 - y1) * t + ny * bow
  return {
    d: `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    width: width * (0.85 + rng() * 0.3),
    opacity: 0.78 + rng() * 0.2,
  }
}

function buildGrid(): Stroke[] {
  const strokes: Stroke[] = []
  const left = pointX(0), right = pointX(COLS - 1)
  const top = pointY(0), bottom = pointY(ROWS - 1)

  for (let r = 0; r < ROWS; r++) strokes.push(brushLine(left, pointY(r), right, pointY(r)))
  for (let c = 0; c < COLS; c++) {
    if (c === 0 || c === COLS - 1) strokes.push(brushLine(pointX(c), top, pointX(c), bottom))
    else {
      // Inner files stop at the river.
      strokes.push(brushLine(pointX(c), top, pointX(c), pointY(4)))
      strokes.push(brushLine(pointX(c), pointY(5), pointX(c), bottom))
    }
  }
  // Palaces.
  for (const [r0, r1] of [[0, 2], [7, 9]]) {
    strokes.push(brushLine(pointX(3), pointY(r0), pointX(5), pointY(r1), 1.1))
    strokes.push(brushLine(pointX(5), pointY(r0), pointX(3), pointY(r1), 1.1))
  }
  return strokes
}

/** Traditional corner marks on the cannon and soldier points. */
function buildMarkers(): Stroke[] {
  const points: [number, number][] = []
  for (const r of [3, 6]) for (const c of SOLDIER_COLS) points.push([r, c])
  for (const r of [2, 7]) for (const c of [1, 7]) points.push([r, c])

  const gap = 5, arm = 10
  const strokes: Stroke[] = []
  for (const [r, c] of points) {
    const x = pointX(c), y = pointY(r)
    for (const sx of [-1, 1]) {
      if ((sx < 0 && c === 0) || (sx > 0 && c === COLS - 1)) continue
      for (const sy of [-1, 1]) {
        const px = x + sx * gap, py = y + sy * gap
        strokes.push({
          d: `M${px + sx * arm} ${py}L${px} ${py}L${px} ${py + sy * arm}`,
          width: 0.9,
          opacity: 0.55,
        })
      }
    }
  }
  return strokes
}

/** Outer frame, a little heavier, like the first stroke laid down. */
function buildFrame(): Stroke[] {
  const o = 9
  const l = pointX(0) - o, r = pointX(COLS - 1) + o, t = pointY(0) - o, b = pointY(ROWS - 1) + o
  return [
    brushLine(l, t, r, t, 2.4),
    brushLine(r, t, r, b, 2.4),
    brushLine(r, b, l, b, 2.4),
    brushLine(l, b, l, t, 2.4),
  ]
}

export const GRID_STROKES = buildGrid()
export const MARKER_STROKES = buildMarkers()
export const FRAME_STROKES = buildFrame()
export const RIVER_Y = (pointY(4) + pointY(5)) / 2

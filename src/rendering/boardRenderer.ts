import { colOf, rowOf, ROWS, COLS } from '../game/board'
import { createRng } from '../game/randomizer'
import { SOLDIER_COLS } from '../game/validator'
import { brushOutline, calligraphicLine, smoothNoise, taper, wobblyLine, type Pt } from './brush'

/**
 * Board geometry. Intersections are mathematically exact; the painted strokes
 * are filled brush outlines centred on those exact lines.
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
  opacity: number
}

const rng = createRng('ink-board-brush')

/** One deliberate brush line between two exact points. */
function line(a: Pt, b: Pt, base: number, opacity = 0.86): Stroke {
  const jitter = 0.88 + rng() * 0.24
  // Occasionally paint right-to-left / bottom-to-top, so the heavy "landing" end varies.
  const [p, q] = rng() < 0.3 ? [b, a] : [a, b]
  return {
    d: brushOutline(wobblyLine(p, q, rng, 0.45), calligraphicLine(base, jitter)),
    opacity: opacity * (0.9 + rng() * 0.1),
  }
}

const P = (col: number, row: number): Pt => ({ x: pointX(col), y: pointY(row) })

function buildGrid(): Stroke[] {
  const strokes: Stroke[] = []
  for (let r = 0; r < ROWS; r++) strokes.push(line(P(0, r), P(COLS - 1, r), 1.7))
  for (let c = 0; c < COLS; c++) {
    if (c === 0 || c === COLS - 1) strokes.push(line(P(c, 0), P(c, ROWS - 1), 1.8))
    else {
      // Inner files stop at the river.
      strokes.push(line(P(c, 0), P(c, 4), 1.6))
      strokes.push(line(P(c, 5), P(c, ROWS - 1), 1.6))
    }
  }
  for (const [r0, r1] of [[0, 2], [7, 9]]) {
    strokes.push(line(P(3, r0), P(5, r1), 1.25, 0.7))
    strokes.push(line(P(5, r0), P(3, r1), 1.25, 0.7))
  }
  return strokes
}

/** The small corner ticks on the cannon and soldier points, as quick brush flicks. */
function buildMarkers(): Stroke[] {
  const points: [number, number][] = []
  for (const r of [3, 6]) for (const c of SOLDIER_COLS) points.push([r, c])
  for (const r of [2, 7]) for (const c of [1, 7]) points.push([r, c])

  const gap = 5, arm = 9
  const strokes: Stroke[] = []
  for (const [r, c] of points) {
    const x = pointX(c), y = pointY(r)
    for (const sx of [-1, 1]) {
      if ((sx < 0 && c === 0) || (sx > 0 && c === COLS - 1)) continue
      for (const sy of [-1, 1]) {
        const corner = { x: x + sx * gap, y: y + sy * gap }
        const pts = [
          { x: corner.x + sx * arm, y: corner.y },
          corner,
          { x: corner.x, y: corner.y + sy * arm },
        ]
        strokes.push({ d: brushOutline(pts, (t) => 1.1 * (1 - 0.5 * t)), opacity: 0.5 })
      }
    }
  }
  return strokes
}

/** Outer frame: four heavier strokes, painted with a drier brush. */
function buildFrame(): Stroke[] {
  const o = 10
  const l = pointX(0) - o, r = pointX(COLS - 1) + o, t = pointY(0) - o, b = pointY(ROWS - 1) + o
  const side = (a: Pt, c: Pt) => ({
    d: brushOutline(wobblyLine(a, c, rng, 0.9), calligraphicLine(4.2, 0.9 + rng() * 0.2)),
    opacity: 0.9,
  })
  return [
    side({ x: l - 3, y: t }, { x: r + 2, y: t }),
    side({ x: r, y: t - 3 }, { x: r, y: b + 2 }),
    side({ x: r + 3, y: b }, { x: l - 2, y: b }),
    side({ x: l, y: b + 3 }, { x: l, y: t - 2 }),
  ]
}

/** A few faint horizontal water strokes drifting through the river. */
function buildRiver(): Stroke[] {
  const y0 = pointY(4), y1 = pointY(5)
  const strokes: Stroke[] = []
  // Kept clear of the 楚河 / 漢界 characters (centred on files c and g).
  const lanes = [
    { x: pointX(0) + 4, len: 62, y: 0.34 },
    { x: pointX(3) + 12, len: 104, y: 0.26 },
    { x: pointX(3) + 40, len: 70, y: 0.74 },
    { x: pointX(7) + 20, len: 56, y: 0.68 },
  ]
  for (const lane of lanes) {
    const y = y0 + (y1 - y0) * lane.y
    const wave = smoothNoise(rng, 4)
    const pts = Array.from({ length: 13 }, (_, i) => ({ x: lane.x + (lane.len * i) / 12, y: y + wave(i / 12) * 2.2 }))
    strokes.push({ d: brushOutline(pts, taper(1.4, 0.1)), opacity: 0.16 })
  }
  return strokes
}

export const GRID_STROKES = buildGrid()
export const MARKER_STROKES = buildMarkers()
export const FRAME_STROKES = buildFrame()
export const RIVER_STROKES = buildRiver()
export const RIVER_Y = (pointY(4) + pointY(5)) / 2
export const RIVER_TOP = pointY(4)
export const RIVER_BOTTOM = pointY(5)

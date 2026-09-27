import { createRng } from '../game/randomizer'
import { brushOutline, smoothNoise, wobblyLine, type Pt } from './brush'

/**
 * Shapes for the ink that answers each move: blots that spread into the paper,
 * a brush sweep along the path, a brushed circle (圓相) around the landing point,
 * droplets for captures. Every shape comes from a seeded rng, so each move has
 * its own marks while the vocabulary stays the same.
 * All shapes are centred on the origin unless they take explicit points.
 */

const f = (n: number) => n.toFixed(1)

/** A smooth closed curve through the points (Catmull-Rom as cubic Béziers). */
function closedCurve(pts: Pt[]): string {
  const n = pts.length
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
    d += `C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`
  }
  return d + 'Z'
}

const polyline = (pts: Pt[]) => 'M' + pts.map((p) => `${f(p.x)} ${f(p.y)}`).join('L')

/** An irregular blot: a circle whose radius wanders, the way ink creeps unevenly through paper fibres. */
export function inkBlot(rng: () => number, radius: number, roughness = 1, points = 26): string {
  const harmonics = [2, 3, 4, 5, 7, 9].map((k) => ({ k, a: (rng() * 0.17 * roughness) / Math.sqrt(k - 1), p: rng() * Math.PI * 2 }))
  const pts: Pt[] = []
  for (let i = 0; i < points; i++) {
    const th = (i / points) * Math.PI * 2
    let r = 1 + (rng() - 0.5) * 0.06 * roughness
    for (const h of harmonics) r += h.a * Math.sin(h.k * th + h.p)
    pts.push({ x: Math.cos(th) * radius * r, y: Math.sin(th) * radius * r })
  }
  return closedCurve(pts)
}

export interface BrushMark {
  /** Filled outline of the mark. */
  d: string
  /** Its centre line, for revealing the mark in the direction it was written. */
  line: string
  /** Widest point, so a reveal mask can cover it. */
  width: number
}

/**
 * The trace of a brush swept from a to b: pressed where it sets off, lifting and
 * drying toward the end. Kept clear of the pieces at both ends.
 */
export function brushSweep(rng: () => number, a: Pt, b: Pt, clear: number): BrushMark | null {
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  if (len < clear * 2.2) return null
  const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len
  const start = { x: a.x + ux * clear * 0.25, y: a.y + uy * clear * 0.25 }
  const end = { x: b.x - ux * clear * 0.9, y: b.y - uy * clear * 0.9 }
  const pts = wobblyLine(start, end, rng, 1.2 + len * 0.012, 5)
  const width = clear * (0.62 + rng() * 0.18)
  const grain = smoothNoise(rng, 5)
  const profile = (t: number) => width * (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.2 + 0.06)), 0.55)) * (1 - 0.5 * t) * (1 + 0.12 * grain(t))
  return { d: brushOutline(pts, profile), line: polyline(pts), width }
}

/** A brushed circle (圓相): most of a turn, pressed at the start, thinning and lifting at the tail. */
export function enso(rng: () => number, radius: number, width: number): BrushMark {
  const start = rng() * Math.PI * 2
  const span = (1.6 + rng() * 0.25) * Math.PI
  const dir = rng() < 0.5 ? 1 : -1
  const wobble = smoothNoise(rng, 5)
  const n = 44
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const th = start + dir * span * t
    const r = radius * (1 + 0.03 * wobble(t) + 0.045 * t)
    pts.push({ x: Math.cos(th) * r, y: Math.sin(th) * r })
  }
  const profile = (t: number) => width * (0.5 + 0.65 * Math.exp(-t * 7) + 0.2 * Math.sin(Math.PI * t)) * (t > 0.82 ? Math.max(0.08, 1 - (t - 0.82) * 5) : 1)
  return { d: brushOutline(pts, profile), line: polyline(pts), width: width * 1.4 }
}

export interface Droplet {
  d: string
  /** Where it lands, relative to the capture point. */
  x: number
  y: number
  /** Direction of flight, in degrees: droplets stretch along it. */
  angle: number
  delay: number
}

/** Ink thrown outward by a capture: irregular, stretched droplets, fewer and smaller the farther they fly. */
export function droplets(rng: () => number, count: number, reach: number): Droplet[] {
  const base = rng() * Math.PI * 2
  return Array.from({ length: count }, (_, i) => {
    const a = base + (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.9
    const dist = reach * (0.7 + rng() * 0.55)
    const size = (1 + rng() * 2.4) * (1.25 - dist / reach / 2)
    return {
      d: inkBlot(rng, size, 1.6, 10),
      x: Math.cos(a) * dist,
      y: Math.sin(a) * dist,
      angle: (a * 180) / Math.PI,
      delay: Math.round(rng() * 90),
    }
  })
}

export interface MoveInk {
  sweep: BrushMark | null
  /** Dense ink right under the piece. */
  core: string
  /** The lighter wash that keeps spreading. */
  wash: string
  /** A faint, wide stain: the paper answering the move. */
  far: string
  halo: BrushMark
  drops: Droplet[]
  /** Small, per-move differences in timing, strength, spread and turn. */
  jitter: { delay: number; alpha: number; spread: number; turn: number }
}

/** Everything drawn for one move. `seed` should differ per move (and per game). */
export function moveInk(seed: string, from: Pt, to: Pt, capture: boolean, pieceRadius: number): MoveInk {
  const rng = createRng(seed)
  const r = pieceRadius
  return {
    sweep: brushSweep(rng, from, to, r),
    core: inkBlot(rng, r * (capture ? 1.15 : 0.98), capture ? 1.5 : 1.2),
    wash: inkBlot(rng, r * (capture ? 1.6 : 1.35), 1.35),
    far: inkBlot(rng, r * 2.4, 1.1, 22),
    halo: enso(rng, r + 6.5, capture ? 3 : 2.3),
    drops: capture ? droplets(rng, 7 + Math.floor(rng() * 4), r * 1.9) : [],
    jitter: {
      delay: Math.round(rng() * 50),
      alpha: 0.85 + rng() * 0.3,
      spread: 0.9 + rng() * 0.25,
      turn: Math.round(rng() * 360),
    },
  }
}

/** The cinnabar mark around a General in check: a stain and a brushed circle, the same for that square. */
export function checkInk(square: number, pieceRadius: number) {
  const rng = createRng(`check-${square}`)
  return { stain: inkBlot(rng, pieceRadius * 1.35, 1.2), ring: enso(rng, pieceRadius + 7, 2.6) }
}

/** The closing wash for a finished game: a slow bloom and a few drifting motes. */
export function finaleInk(seed: string) {
  const rng = createRng(seed)
  return {
    bloom: inkBlot(rng, 70, 1.4, 30),
    veil: inkBlot(rng, 62, 1.1, 30),
    motes: Array.from({ length: 9 }, () => {
      const a = rng() * Math.PI * 2
      const d = 30 + rng() * 38
      return { d: inkBlot(rng, 0.8 + rng() * 1.6, 1.4, 8), x: Math.cos(a) * d, y: Math.sin(a) * d, dx: Math.cos(a) * (8 + rng() * 10), dy: Math.sin(a) * (8 + rng() * 10) - 4, delay: Math.round(600 + rng() * 700) }
    }),
  }
}

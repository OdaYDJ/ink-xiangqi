/**
 * Brush geometry: turns a centre line into a filled outline whose width
 * varies along its length, the way a calligraphy brush presses and lifts.
 */
export interface Pt {
  x: number
  y: number
}

const f = (n: number) => n.toFixed(1)

export function brushOutline(pts: Pt[], width: (t: number) => number): string {
  const n = pts.length
  const lengths = [0]
  for (let i = 1; i < n; i++) lengths.push(lengths[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  const total = lengths[n - 1] || 1

  const left: Pt[] = []
  const right: Pt[] = []
  const tangents: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const tx = (b.x - a.x) / len, ty = (b.y - a.y) / len
    tangents.push({ x: tx, y: ty })
    const w = width(lengths[i] / total) / 2
    left.push({ x: pts[i].x - ty * w, y: pts[i].y + tx * w })
    right.push({ x: pts[i].x + ty * w, y: pts[i].y - tx * w })
  }

  // Rounded caps: a quadratic bulge past each end.
  const w0 = width(0) / 2, w1 = width(1) / 2
  const t0 = tangents[0], t1 = tangents[n - 1]
  const startCap = { x: pts[0].x - t0.x * w0 * 1.4, y: pts[0].y - t0.y * w0 * 1.4 }
  const endCap = { x: pts[n - 1].x + t1.x * w1 * 1.4, y: pts[n - 1].y + t1.y * w1 * 1.4 }

  let d = `M${f(left[0].x)} ${f(left[0].y)}`
  for (let i = 1; i < n; i++) d += `L${f(left[i].x)} ${f(left[i].y)}`
  d += `Q${f(endCap.x)} ${f(endCap.y)} ${f(right[n - 1].x)} ${f(right[n - 1].y)}`
  for (let i = n - 2; i >= 0; i--) d += `L${f(right[i].x)} ${f(right[i].y)}`
  d += `Q${f(startCap.x)} ${f(startCap.y)} ${f(left[0].x)} ${f(left[0].y)}Z`
  return d
}

/** Smooth 1-D value noise in [-1, 1], deterministic for a given rng. */
export function smoothNoise(rng: () => number, knots = 6): (t: number) => number {
  const values = Array.from({ length: knots + 1 }, () => rng() * 2 - 1)
  return (t: number) => {
    const x = Math.min(0.9999, Math.max(0, t)) * knots
    const i = Math.floor(x)
    const u = x - i
    const s = u * u * (3 - 2 * u)
    return values[i] * (1 - s) + values[i + 1] * s
  }
}

/** Samples a straight segment into points with a tiny wobble that vanishes at both ends. */
export function wobblyLine(a: Pt, b: Pt, rng: () => number, amplitude: number, step = 10): Pt[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  const n = Math.max(2, Math.ceil(len / step))
  const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len
  const noise = smoothNoise(rng, Math.max(2, Math.round(len / 90)))
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const off = noise(t) * amplitude * Math.sin(Math.PI * t)
    pts.push({ x: a.x + (b.x - a.x) * t + nx * off, y: a.y + (b.y - a.y) * t + ny * off })
  }
  return pts
}

/** Samples a quadratic curve. */
export function curve(a: Pt, c: Pt, b: Pt, n = 16): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
  })
}

/** Width profile of a deliberate line: pressed start, slight thinning, small press and lift at the end. */
export const calligraphicLine = (base: number, jitter = 1) => (t: number) => {
  const press = 0.42 * Math.exp(-t * 16)
  const finish = 0.16 * Math.exp(-(1 - t) * 18)
  const belly = -0.08 * Math.sin(Math.PI * t)
  const lift = t > 0.975 ? 1 - (t - 0.975) * 14 : 1
  return base * jitter * (0.92 + press + finish + belly) * lift
}

/** Leaf / petal shape: thin at both ends, full a third of the way along. */
export const leafWidth = (max: number) => (t: number) => max * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.9)

/** Branch: heavy at the base, tapering to a fine tip. */
export const taper = (base: number, tip = 0.15) => (t: number) => base * (tip + (1 - tip) * Math.pow(1 - t, 0.8))

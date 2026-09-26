import { createRng } from '../game/randomizer'
import { brushOutline, curve, leafWidth, smoothNoise, taper, type Pt } from './brush'

/**
 * A faint monochrome landscape painted procedurally (seeded, so it never
 * changes between visits): mountains fading into mist, water, a few trees
 * and birds, plus a bamboo stand and a plum branch for the corners.
 */
export interface InkShape {
  d: string
  opacity: number
  /** 'ink' or 'cinnabar' (plum blossoms only). */
  tone?: 'ink' | 'cinnabar'
}

const rng = createRng('ink-landscape-1')

/* ——— Mountains ——— */

export interface Ridge {
  d: string
  /** Top of the ridge, used to place the mist gradient. */
  top: number
  base: number
  opacity: number
}

function ridge(width: number, baseY: number, height: number, peaks: [number, number, number][], depth: number, opacity: number): Ridge {
  const rough = smoothNoise(rng, 40)
  const detail = smoothNoise(rng, 120)
  let d = `M0 ${baseY + depth}`
  let top = Infinity
  for (let x = 0; x <= width; x += 6) {
    let h = 0
    // Each peak: [centre x, height factor, spread].
    for (const [cx, k, spread] of peaks) h = Math.max(h, k * Math.exp(-(((x - cx) / spread) ** 2)))
    const t = x / width
    const y = baseY - height * h * (1 + 0.22 * rough(t)) - 9 * detail(t) * (0.2 + h)
    top = Math.min(top, y)
    d += `L${x} ${y.toFixed(1)}`
  }
  d += `L${width} ${baseY + depth}Z`
  return { d, top, base: baseY + depth, opacity }
}

export const LANDSCAPE_WIDTH = 1600
export const LANDSCAPE_HEIGHT = 900

export const RIDGES: Ridge[] = [
  // Far range: tall, pale, mostly lost in mist.
  ridge(LANDSCAPE_WIDTH, 430, 250, [[180, 0.75, 120], [330, 1, 90], [470, 0.62, 140], [1180, 0.8, 110], [1320, 1.05, 80], [1480, 0.7, 140]], 160, 0.07),
  // Middle range.
  ridge(LANDSCAPE_WIDTH, 520, 170, [[90, 0.9, 80], [205, 0.55, 50], [300, 0.75, 70], [1230, 0.6, 70], [1340, 0.45, 45], [1460, 1, 85]], 140, 0.09),
  // Near hills at the edges, low and a little darker.
  ridge(LANDSCAPE_WIDTH, 640, 90, [[60, 1, 160], [1540, 0.9, 170]], 120, 0.11),
]

/** Moss dots (米點) along the near ridge crests: a few dozen soft marks. */
export const MOSS_DOTS: { x: number; y: number; r: number; opacity: number }[] = (() => {
  const dots = []
  for (const [cx, spread, y] of [[330, 70, 250], [1320, 60, 255], [1450, 80, 380], [90, 70, 380]] as const) {
    for (let i = 0; i < 16; i++) {
      dots.push({
        x: cx + (rng() - 0.5) * spread * 2,
        y: y + rng() * 50,
        r: 2 + rng() * 4,
        opacity: 0.04 + rng() * 0.05,
      })
    }
  }
  return dots
})()

/** Distant trees on the near hills: a thin trunk and a few leaf blots. */
export const TREES: InkShape[] = (() => {
  const shapes: InkShape[] = []
  const tree = (x: number, y: number, h: number) => {
    shapes.push({ d: brushOutline(curve({ x, y }, { x: x + 2, y: y - h / 2 }, { x: x - 1, y: y - h }), taper(2.2, 0.3)), opacity: 0.22 })
    // Foliage as clustered moss dots rather than strokes.
    for (let i = 0; i < 14; i++) {
      const a = rng() * Math.PI * 2
      const rr = Math.sqrt(rng()) * h * 0.32
      const r = 1.6 + rng() * 2.2
      shapes.push({ d: circlePath(x + Math.cos(a) * rr, y - h * 0.78 + Math.sin(a) * rr * 0.8, r), opacity: 0.1 + rng() * 0.1 })
    }
  }
  tree(1470, 612, 34)
  tree(1492, 618, 26)
  tree(1512, 610, 40)
  tree(64, 606, 30)
  tree(86, 612, 22)
  return shapes
})()

/** Water: long, faint horizontal strokes below the mountains. */
export const WATER: InkShape[] = (() => {
  const shapes: InkShape[] = []
  const rows = [
    [120, 700, 260], [60, 736, 180], [1210, 690, 300], [1300, 728, 200], [1380, 760, 140], [180, 772, 120],
  ]
  for (const [x, y, len] of rows) {
    const wave = smoothNoise(rng, 5)
    const pts = Array.from({ length: 21 }, (_, i) => ({ x: x + (len * i) / 20, y: y + wave(i / 20) * 2.5 }))
    shapes.push({ d: brushOutline(pts, taper(1.6, 0.1)), opacity: 0.1 })
  }
  return shapes
})()

/** A small skein of birds, far away. */
export const BIRDS: InkShape[] = [
  [1180, 170, 1], [1206, 158, 0.8], [1226, 182, 0.9], [1252, 168, 0.7],
].map(([x, y, s]) => {
  const w = 9 * s
  const pts = [
    { x: x - w, y: y + 1 }, { x: x - w * 0.45, y: y - w * 0.35 }, { x, y },
    { x: x + w * 0.45, y: y - w * 0.4 }, { x: x + w, y: y - 1 },
  ]
  return { d: brushOutline(pts, (t) => 1.6 * s * (0.4 + Math.sin(Math.PI * t) * 0.6)), opacity: 0.38 }
})

/* ——— Bamboo (drawn in its own 400×700 frame, anchored bottom-left) ——— */

export const BAMBOO_WIDTH = 400
export const BAMBOO_HEIGHT = 700

export const BAMBOO: InkShape[] = (() => {
  const shapes: InkShape[] = []
  // Stems: segments separated by small gaps, with a darker node mark.
  const stem = (x0: number, lean: number, height: number, w: number, opacity: number) => {
    const segments = 5
    let y = BAMBOO_HEIGHT + 10
    const seg = height / segments
    for (let i = 0; i < segments; i++) {
      const x = x0 + lean * (BAMBOO_HEIGHT - y)
      const y2 = y - seg * (0.92 - i * 0.03)
      const x2 = x0 + lean * (BAMBOO_HEIGHT - y2)
      const segW = w * (1 - i * 0.12)
      shapes.push({
        d: brushOutline(curve({ x, y }, { x: (x + x2) / 2 + 1.5, y: (y + y2) / 2 }, { x: x2, y: y2 + 5 }, 8), (t) => segW * (1.08 - 0.12 * Math.sin(Math.PI * t))),
        opacity,
      })
      // Node: a short, slightly curved dark mark across the joint.
      shapes.push({
        d: brushOutline(curve({ x: x2 - segW * 0.8, y: y2 + 3 }, { x: x2, y: y2 + 0.5 }, { x: x2 + segW * 0.8, y: y2 + 3 }, 6), leafWidth(2.4)),
        opacity: opacity + 0.15,
      })
      y = y2
    }
    return { x: x0 + lean * (BAMBOO_HEIGHT - y), y }
  }
  // Leaves in 个 / 介 clusters: a short twig from the stem, then three or four
  // blades hanging from its tip at slightly different points, each drooping.
  const cluster = (x: number, y: number, twigAngle: number, leafAngles: number[], length: number, opacity: number) => {
    const ta = (twigAngle * Math.PI) / 180
    const twigLen = 26 + rng() * 14
    const tip = { x: x + Math.cos(ta) * twigLen, y: y + Math.sin(ta) * twigLen }
    shapes.push({ d: brushOutline(curve({ x, y }, { x: (x + tip.x) / 2, y: (y + tip.y) / 2 - 3 }, tip, 8), taper(2.2, 0.4)), opacity: opacity * 0.8 })
    leafAngles.forEach((deg, i) => {
      const a = ((deg + (rng() - 0.5) * 10) * Math.PI) / 180
      const len = length * (0.7 + rng() * 0.5)
      const start = { x: tip.x - Math.cos(ta) * i * 5, y: tip.y - Math.sin(ta) * i * 5 }
      const end = { x: start.x + Math.cos(a) * len, y: start.y + Math.sin(a) * len + len * 0.18 }
      const bend = { x: start.x + Math.cos(a) * len * 0.45, y: start.y + Math.sin(a) * len * 0.45 - len * 0.08 }
      shapes.push({ d: brushOutline(curve(start, bend, end, 14), leafWidth(len * 0.12)), opacity: opacity * (0.75 + rng() * 0.45) })
    })
  }
  const tipA = stem(96, 0.05, 560, 9, 0.42)
  const tipB = stem(150, -0.07, 430, 7, 0.3)
  cluster(tipA.x, tipA.y + 12, -30, [20, 55, 95], 78, 0.5)
  cluster(tipA.x + 2, tipA.y + 120, 200, [110, 145, 170, 80], 72, 0.46)
  cluster(tipA.x + 6, tipA.y + 250, -15, [30, 70], 64, 0.4)
  cluster(tipB.x, tipB.y + 10, 210, [120, 160, 95], 60, 0.32)
  cluster(tipB.x + 2, tipB.y + 110, -20, [40, 75, 15], 56, 0.3)
  return shapes
})()

/* ——— Plum branch (in its own 520×360 frame, anchored top-right) ——— */

export const PLUM_WIDTH = 520
export const PLUM_HEIGHT = 360

export const PLUM: InkShape[] = (() => {
  const shapes: InkShape[] = []
  // Plum branches are angular: straight-ish segments with sharp turns.
  const branch = (pts: Pt[], w: number, opacity: number) => shapes.push({ d: brushOutline(pts, taper(w, 0.2)), opacity })
  branch([{ x: 540, y: 40 }, { x: 430, y: 70 }, { x: 350, y: 60 }, { x: 250, y: 118 }, { x: 170, y: 126 }], 11, 0.55)
  branch([{ x: 350, y: 62 }, { x: 318, y: 130 }, { x: 330, y: 200 }], 5, 0.5)
  branch([{ x: 250, y: 118 }, { x: 214, y: 176 }, { x: 180, y: 190 }], 4, 0.45)
  branch([{ x: 430, y: 70 }, { x: 410, y: 20 }], 4, 0.45)
  branch([{ x: 170, y: 126 }, { x: 120, y: 110 }], 2.5, 0.45)

  // Blossoms: five faded-cinnabar petals, ink stamens. Buds: a single dot.
  const blossom = (x: number, y: number, r: number, rot: number) => {
    for (let i = 0; i < 5; i++) {
      const a = rot + (i * 2 * Math.PI) / 5
      const cx = x + Math.cos(a) * r * 0.62, cy = y + Math.sin(a) * r * 0.62
      shapes.push({ d: circlePath(cx, cy, r * 0.52), opacity: 0.32, tone: 'cinnabar' })
    }
    for (let i = 0; i < 5; i++) {
      const a = rot + 0.3 + (i * 2 * Math.PI) / 5
      shapes.push({ d: circlePath(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, 0.9), opacity: 0.6 })
    }
  }
  blossom(318, 132, 12, 0.2)
  blossom(214, 172, 10, 1.1)
  blossom(252, 104, 11, 0.6)
  blossom(128, 112, 8, 0.4)
  blossom(410, 26, 9, 0.9)
  for (const [x, y] of [[330, 196], [182, 190], [362, 58], [168, 134]]) {
    shapes.push({ d: circlePath(x, y, 3.2), opacity: 0.45, tone: 'cinnabar' })
  }
  return shapes
})()


function circlePath(cx: number, cy: number, r: number): string {
  return `M${(cx - r).toFixed(1)} ${cy.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0Z`
}

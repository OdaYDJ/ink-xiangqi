import { createRng } from '../game/randomizer'
import { brushOutline, curve, leafWidth, smoothNoise, taper, type Pt } from './brush'

/**
 * A faint monochrome landscape painted procedurally (seeded, so it never
 * changes between visits): mountains fading into mist, water, a few trees
 * and birds, plus a bamboo stand and a hanging bamboo spray for the corners.
 */
export interface InkShape {
  d: string
  opacity: number
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

/* ——— Bamboo, shared brushwork ——— */

/** A cluster of leaves on one twig. `pivot` is where the twig joins the stalk: the leaves flutter around it. */
export interface LeafCluster {
  pivot: Pt
  shapes: InkShape[]
  /** Pale back leaves (淡墨) move a little less than dense front ones (濃墨). */
  depth: 'back' | 'front'
}

/** A bamboo plant: stalks that sway together from `root`, and leaf clusters that flutter on their own. */
export interface BambooPlant {
  root: Pt
  stalks: InkShape[]
  clusters: LeafCluster[]
}

export const plantShapes = (p: BambooPlant): InkShape[] => [...p.stalks, ...p.clusters.flatMap((c) => c.shapes)]

/**
 * Leaves in 个 / 介 clusters: a short twig, then blades hanging from its tip
 * at slightly different points, each drooping under its own weight.
 */
function bambooCluster(
  x: number, y: number, twigAngle: number, leafAngles: number[], length: number, opacity: number,
): LeafCluster {
  const shapes: InkShape[] = []
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
  return { pivot: { x, y }, shapes, depth: opacity <= 0.22 ? 'back' : 'front' }
}

/**
 * A bamboo culm along a gentle curve, painted as separate segments with a
 * small gap and a darker node mark at each joint. Returns the joint points.
 */
function bambooCulm(shapes: InkShape[], from: Pt, bendAt: Pt, to: Pt, segments: number, width: number, opacity: number): Pt[] {
  const path = curve(from, bendAt, to, segments * 12)
  const joints: Pt[] = []
  for (let i = 0; i < segments; i++) {
    const a = path[i * 12], b = path[(i + 1) * 12]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len
    const w = width * (1 - (i / segments) * 0.45)
    // Stop a few pixels short of the joint: the white gap is how bamboo reads.
    const end = { x: b.x - ux * 4, y: b.y - uy * 4 }
    const pts = path.slice(i * 12, (i + 1) * 12).concat([end])
    shapes.push({ d: brushOutline(pts, (t) => w * (1.08 - 0.12 * Math.sin(Math.PI * t))), opacity })
    if (i < segments - 1) {
      const nx = -uy, ny = ux
      shapes.push({
        d: brushOutline(
          curve({ x: b.x - nx * w * 0.8, y: b.y - ny * w * 0.8 }, { x: b.x - ux * 2, y: b.y - uy * 2 }, { x: b.x + nx * w * 0.8, y: b.y + ny * w * 0.8 }, 6),
          leafWidth(2.4),
        ),
        opacity: opacity + 0.15,
      })
    }
    joints.push(b)
  }
  return joints
}

/* ——— Bamboo stand (in its own 400×700 frame, anchored bottom-left) ——— */

export const BAMBOO_WIDTH = 400
export const BAMBOO_HEIGHT = 700

export const BAMBOO: BambooPlant = (() => {
  const stalks: InkShape[] = []
  const a = bambooCulm(stalks, { x: 96, y: 710 }, { x: 106, y: 430 }, { x: 124, y: 160 }, 5, 9, 0.42)
  const b = bambooCulm(stalks, { x: 150, y: 710 }, { x: 138, y: 480 }, { x: 118, y: 290 }, 4, 7, 0.3)
  const tipA = a[a.length - 1], tipB = b[b.length - 1]
  // Pale leaves first (淡墨, further back), then the dense front leaves (濃墨).
  const clusters = [
    bambooCluster(a[3].x, a[3].y - 30, -40, [10, 40, 75], 66, 0.2),
    bambooCluster(b[2].x, b[2].y, 215, [150, 175, 125], 58, 0.18),
    bambooCluster(tipA.x, tipA.y + 12, -30, [20, 55, 95], 78, 0.5),
    bambooCluster(a[3].x + 2, a[3].y, 200, [110, 145, 170, 80], 72, 0.46),
    bambooCluster(a[2].x + 6, a[2].y, -15, [30, 70], 64, 0.4),
    bambooCluster(tipB.x, tipB.y + 10, 210, [120, 160, 95], 60, 0.32),
    bambooCluster(b[1].x + 2, b[1].y, -20, [40, 75, 15], 56, 0.3),
  ]
  // Both stalks grow from just below the bottom edge.
  return { root: { x: 122, y: 710 }, stalks, clusters }
})()

/* ——— Hanging bamboo spray (in its own 520×380 frame, anchored top-right) ———
   A branch leans in from beyond the top-right corner and its leaves hang down
   into the empty paper, answering the stand in the lower-left. */

export const SPRAY_WIDTH = 520

export const BAMBOO_SPRAY: BambooPlant = (() => {
  const stalks: InkShape[] = []
  // The branch bows under the weight of its leaves.
  const main = bambooCulm(stalks, { x: 570, y: -34 }, { x: 440, y: 78 }, { x: 236, y: 132 }, 4, 7, 0.44)
  const side = bambooCulm(stalks, main[1], { x: 360, y: 58 }, { x: 262, y: 44 }, 2, 3.4, 0.34)
  const tip = main[main.length - 1]

  const clusters = [
    // 淡墨: pale leaves behind, giving depth.
    bambooCluster(main[1].x, main[1].y, 80, [55, 85, 115], 72, 0.2),
    bambooCluster(side[0].x, side[0].y, 150, [125, 160], 60, 0.18),
    bambooCluster(tip.x + 20, tip.y - 6, 150, [100, 130], 64, 0.2),
    // 濃墨: dense front leaves, hanging in 个 / 介 groups.
    bambooCluster(tip.x, tip.y, 172, [112, 138, 162, 92], 92, 0.56),
    bambooCluster(main[2].x, main[2].y, 112, [78, 104, 128], 80, 0.5),
    bambooCluster(main[0].x, main[0].y, 96, [72, 98], 66, 0.36),
    bambooCluster(side[1].x, side[1].y, 196, [138, 164, 118], 66, 0.38),
  ]
  // The branch enters from beyond the top-right corner and swings from there.
  return { root: { x: SPRAY_WIDTH, y: 0 }, stalks, clusters }
})()

/** Bounding box of painted shapes, read from their path coordinates. */
function boundsOf(shapes: InkShape[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const { d } of shapes) {
    const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    for (let i = 0; i + 1 < nums.length; i += 2) {
      minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i])
      minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1])
    }
  }
  return { minX, minY, maxX, maxY }
}

/**
 * The spray's frame, fitted tightly around the painted leaves so nothing is
 * cropped. Only the top and right edges cut the branch, which is meant to
 * enter from beyond the corner.
 */
export const SPRAY_VIEWBOX = (() => {
  const b = boundsOf(plantShapes(BAMBOO_SPRAY))
  const x = Math.floor(b.minX - 6)
  const height = Math.ceil(b.maxY + 6)
  return { x, y: 0, width: SPRAY_WIDTH - x, height }
})()

function circlePath(cx: number, cy: number, r: number): string {
  return `M${(cx - r).toFixed(1)} ${cy.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0Z`
}

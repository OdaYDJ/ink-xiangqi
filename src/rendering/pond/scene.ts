import { createKoi, formSchool, PATTERNS, renderKoi, startle, updateKoi, type Bounds, type Koi } from './koi'
import { BLOSSOM, CAUSTIC, GLINT, LANTERN_GLOW, RIPPLE, SHADOW, WATER } from './palette'
import { PixelCanvas, clamp, fbm, pixelSize, ramp, rng, white, type RGB } from './pixels'
import {
  bambooFrames, drawBigLeaf, drawBlossomBranch, drawBlossomShrub, drawBud, drawGround, drawLantern, drawRock, drawTuft,
  lotusSprite, padSprite,
} from './sprites'

/**
 * The living pond behind V3, as layers composed on one low-resolution canvas
 * (upscaled with crisp pixels by CSS), plus a blurred foreground canvas:
 *
 *   background   the pond bed (depth, pebbles, sunlit shallows) and the banks
 *   midground    stones, reeds, lanterns, flowering shrubs, bamboo
 *   interactive  koi, caustic light, ripples, glints, lily pads, petals, bubbles
 *   foreground   large leaves and blossoming branches close to the eye (own canvas)
 *
 * The composition is rebuilt around the content whenever the screen changes:
 * banks and plants go where there is free space, so a phone gets a narrow
 * frame of water and an ultrawide monitor an expansive garden, while the
 * board stays the anchor. Nothing decorative is ever placed over the content.
 */

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

interface Rect { x0: number; y0: number; x1: number; y1: number }
/** The lantern's pixel unit, and the smallest bank that holds it: small and in scale with the stones around it. */
const LANTERN_U = 2
const LANTERN_MIN_R = 44
type ClusterKind = 'bamboo' | 'blossom' | 'lantern' | 'rocks'
interface Cluster { x: number; y: number; r: number; kind: ClusterKind; corner: boolean }
interface Pad { x: number; y: number; sprite: HTMLCanvasElement; ox: number; oy: number; r: number; phase: number; flower: HTMLCanvasElement | null; fx: number; fy: number }
interface Ripple { x: number; y: number; age: number; life: number; r: number; a: number; rings: number }
interface Glint { x: number; y: number; age: number; life: number }
interface Petal { x: number; y: number; vx: number; vy: number; age: number; life: number; tone: RGB; turn: number }
interface Bubble { x: number; y: number; age: number; life: number; vx: number; vy: number }

const TAU = Math.PI * 2
const CAUSTIC_TILE = 96
const CAUSTIC_FRAMES = 12

const distToRect = (x: number, y: number, r: Rect) => {
  const dx = Math.max(r.x0 - x, 0, x - r.x1)
  const dy = Math.max(r.y0 - y, 0, y - r.y1)
  return Math.hypot(dx, dy)
}

/** A seamless, looping tile of caustic light: the bright seams between slowly shifting cells. */
function causticTiles(): HTMLCanvasElement[] {
  const T = CAUSTIC_TILE, G = 8, cell = T / G
  const R = rng(91)
  const seeds = Array.from({ length: G * G }, () => [R(), R(), R() * TAU, R() * TAU, 0.25 + R() * 0.2])
  const out: HTMLCanvasElement[] = []
  for (let f = 0; f < CAUSTIC_FRAMES; f++) {
    const t = (f / CAUSTIC_FRAMES) * TAU
    const pts = seeds.map(([sx, sy, px, py, amp]) => [
      0.5 + amp * Math.sin(t + px) + (sx - 0.5) * 0.4,
      0.5 + amp * Math.cos(t + py) + (sy - 0.5) * 0.4,
    ])
    const pc = new PixelCanvas(T, T)
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        // A gentle periodic warp, so the net never looks like cells.
        const wx = x + 3 * Math.sin((y / T) * TAU * 2 + t) + 1.5 * Math.sin((y / T) * TAU * 5 - t)
        const wy = y + 3 * Math.cos((x / T) * TAU * 2 - t) + 1.5 * Math.cos((x / T) * TAU * 5 + t)
        const cx = Math.floor(wx / cell), cy = Math.floor(wy / cell)
        let f1 = 1e9, f2 = 1e9
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const gx = cx + i, gy = cy + j
            const p = pts[(((gy % G) + G) % G) * G + (((gx % G) + G) % G)]
            const d = Math.hypot(wx - (gx + p[0]) * cell, wy - (gy + p[1]) * cell)
            if (d < f1) { f2 = f1; f1 = d } else if (d < f2) f2 = d
          }
        }
        const edge = f2 - f1
        if (edge < 0.8) pc.put(x, y, CAUSTIC, 44)
        else if (edge < 1.9) pc.put(x, y, CAUSTIC, 16)
      }
    }
    out.push(pc.flush().canvas)
  }
  return out
}

export class PondEngine {
  private ctx: CanvasRenderingContext2D
  private nearCtx: CanvasRenderingContext2D
  private px = 3
  private W = 1
  private H = 1
  private bed: PixelCanvas | null = null
  private mid: PixelCanvas | null = null
  private light: HTMLCanvasElement = document.createElement('canvas')
  private lightMask: HTMLCanvasElement = document.createElement('canvas')
  private sunMap = new Float32Array(1)
  private fishCanvas: PixelCanvas | null = null
  private fishBuf: Uint32Array = new Uint32Array(1)
  private tiles: HTMLCanvasElement[] | null = null
  private clusters: Cluster[] = []
  private keep: Rect[] = []
  private pads: Pad[] = []
  private bamboo: { canvases: HTMLCanvasElement[]; x: number; y: number; phase: number }[] = []
  private lanterns: { x: number; y: number; r: number }[] = []
  private petalSources: { x: number; y: number }[] = []
  private fish: Koi[] = []
  private ripples: Ripple[] = []
  private glints: Glint[] = []
  private petals: Petal[] = []
  private bubbles: Bubble[] = []
  private bounds: Bounds = { w: 1, h: 1, landmarks: [] }
  private rand = rng(Date.now() & 0xffff)
  private time = 0
  private nextRipple = 1
  private nextSchool = 12
  private frame = 0
  private last = 0
  private running = false
  private readonly still: boolean
  private readonly minFrame: number

  constructor(private main: HTMLCanvasElement, private near: HTMLCanvasElement) {
    this.ctx = main.getContext('2d', { alpha: false })!
    this.nearCtx = near.getContext('2d')!
    this.still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.minFrame = window.matchMedia('(pointer: coarse)').matches ? 40 : 32
  }

  /** Recompose the pond for this viewport, keeping clear of the given boxes (CSS pixels). */
  layout(vw: number, vh: number, avoid: Box[]) {
    const oldPx = this.px, oldW = this.W, oldH = this.H
    const px = (this.px = pixelSize(vw, vh))
    const W = (this.W = Math.ceil(vw / px))
    const H = (this.H = Math.ceil(vh / px))
    for (const c of [this.main, this.near]) {
      c.width = W
      c.height = H
      c.style.width = `${W * px}px`
      c.style.height = `${H * px}px`
    }
    this.ctx.imageSmoothingEnabled = false
    this.light.width = this.lightMask.width = W
    this.light.height = this.lightMask.height = H
    this.keep = avoid.map((b) => ({ x0: b.left / px - 3, y0: b.top / px - 3, x1: b.right / px + 3, y1: b.bottom / px + 3 }))
    this.tiles ??= causticTiles()

    const seed = 7 + ((W * 31 + H * 17) % 997)
    this.compose(seed)
    this.paintBed(seed)
    this.paintForeground(seed)
    this.fishCanvas = new PixelCanvas(W, H)
    this.fishBuf = new Uint32Array(this.fishCanvas.data.buffer)
    this.bounds = {
      w: W, h: H,
      landmarks: [...this.pads.map((p) => ({ x: p.x, y: p.y, r: p.r })), ...this.clusters.map((c) => ({ x: c.x, y: c.y, r: c.r * 0.8 }))],
    }
    this.populate(oldPx, oldW, oldH)
    this.ripples = []
    this.petals = this.petals.filter((p) => p.x < W && p.y < H)
    this.render(0)
  }

  // ——— Composition ———

  private freeRadius(x: number, y: number) {
    let r = Infinity
    for (const k of this.keep) r = Math.min(r, distToRect(x, y, k))
    return r
  }

  private compose(seed: number) {
    const { W, H } = this
    const R = rng(seed)
    const small = Math.min(W, H)
    const mid = new PixelCanvas(W, H)
    this.mid = mid
    this.clusters = []
    this.pads = []
    this.bamboo = []
    this.lanterns = []
    this.petalSources = []

    // Banks: corners first, then along the edges, each as large as the free space there allows.
    const anchors: { x: number; y: number; corner: boolean }[] = [
      { x: -2, y: -2, corner: true }, { x: W + 2, y: -2, corner: true }, { x: -2, y: H + 2, corner: true }, { x: W + 2, y: H + 2, corner: true },
    ]
    for (let i = 1; i < 4; i++) {
      anchors.push({ x: -small * 0.04, y: (H * i) / 4 + (R() - 0.5) * H * 0.1, corner: false })
      anchors.push({ x: W + small * 0.04, y: (H * i) / 4 + (R() - 0.5) * H * 0.1, corner: false })
    }
    for (let i = 1; i < 5; i++) {
      anchors.push({ x: (W * i) / 5 + (R() - 0.5) * W * 0.08, y: -small * 0.04, corner: false })
      anchors.push({ x: (W * i) / 5 + (R() - 0.5) * W * 0.08, y: H + small * 0.04, corner: false })
    }
    const cornerKinds: ClusterKind[] = ['bamboo', 'blossom', 'lantern', 'bamboo']
    let lanternPlaced = false
    anchors.forEach((a, i) => {
      let r = this.freeRadius(a.x, a.y) - 3
      for (const c of this.clusters) r = Math.min(r, Math.hypot(c.x - a.x, c.y - a.y) - c.r * 0.55)
      r = Math.min(r, small * (a.corner ? 0.3 : 0.2))
      if (r < Math.max(12, small * 0.05)) return
      let kind: ClusterKind = a.corner ? cornerKinds[i] : R() < 0.45 ? 'rocks' : R() < 0.5 ? 'blossom' : 'bamboo'
      if (kind === 'lantern' && (lanternPlaced || r < LANTERN_MIN_R)) kind = 'rocks'
      if (!lanternPlaced && !a.corner && r >= LANTERN_MIN_R && a.x < 0) kind = 'lantern'
      if (kind === 'lantern') lanternPlaced = true
      this.clusters.push({ x: a.x, y: a.y, r, kind, corner: a.corner })
    })

    // Background of each bank: the earth and moss. Then the midground on top: stones, plants, lanterns.
    for (const [i, c] of this.clusters.entries()) drawGround(mid, c.x, c.y, c.r * 0.72, seed + i * 13)
    for (const [i, c] of this.clusters.entries()) {
      const s = seed + i * 101
      const toWater = Math.atan2(H / 2 - c.y, W / 2 - c.x)
      const count = 2 + Math.floor(R() * 3)
      for (let j = 0; j < count; j++) {
        const a = toWater + (R() - 0.5) * 1.9
        const d = c.r * (0.45 + R() * 0.3)
        const rx = c.r * (0.14 + R() * 0.16)
        drawRock(mid, Math.round(c.x + Math.cos(a) * d), Math.round(c.y + Math.sin(a) * d), rx, rx * (0.72 + R() * 0.2), s + j)
      }
      for (let j = 0; j < 3 + Math.floor(R() * 4); j++) {
        const a = toWater + (R() - 0.5) * 2.4
        const d = c.r * (0.2 + R() * 0.55)
        drawTuft(mid, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, Math.max(4, c.r * 0.12), s + 40 + j)
      }
      if (c.kind === 'blossom') {
        const sx = c.x + Math.cos(toWater) * c.r * 0.12, sy = c.y + Math.sin(toWater) * c.r * 0.12
        this.petalSources.push(...drawBlossomShrub(mid, sx, sy, c.r * 0.5, s + 7))
      } else if (c.kind === 'lantern') {
        // Wholly on screen: its roof is 11 units wide, and it stands 15 units tall above its base.
        const u = LANTERN_U
        const lx = clamp(Math.round(c.x + Math.cos(toWater) * c.r * 0.34), 7 * u, W - 7 * u)
        const ly = clamp(Math.round(c.y + Math.sin(toWater) * c.r * 0.34 + c.r * 0.2), 16 * u, H - 3 * u)
        drawRock(mid, lx, ly + u, 6 * u, 3.6 * u, s + 3, 0.7)
        const glow = drawLantern(mid, lx, ly, u)
        this.lanterns.push({ x: glow.x, y: glow.y, r: u * 12 })
      } else if (c.kind === 'bamboo') {
        const f = bambooFrames({ x: c.x, y: c.y, angle: toWater + (R() - 0.5) * 0.4, height: c.r * 0.82, seed: s + 5 })
        this.bamboo.push({ ...f, phase: R() * TAU })
      }
    }
    mid.flush()

    // Lily pads in open water, in loose groups, mostly near the banks.
    const area = W * H - this.keep.reduce((s, k) => s + Math.max(0, (Math.min(W, k.x1) - Math.max(0, k.x0)) * (Math.min(H, k.y1) - Math.max(0, k.y0))), 0)
    const groups = clamp(Math.round(area / 7000), 2, 16)
    const base = clamp(small / 30, 4, 11)
    const blocked = (x: number, y: number, r: number) =>
      x < r * 0.3 || y < r * 0.3 || x > W - r * 0.3 || y > H - r * 0.3 ||
      this.freeRadius(x, y) < r + 2 ||
      this.clusters.some((c) => Math.hypot(c.x - x, c.y - y) < c.r * 0.82 + r) ||
      this.pads.some((p) => Math.hypot(p.x - x, p.y - y) < (p.r + r) * 0.92)
    for (let g = 0; g < groups; g++) {
      let best: { x: number; y: number } | null = null, bestScore = -Infinity
      for (let t = 0; t < 28; t++) {
        const x = R() * W, y = R() * H
        if (blocked(x, y, base)) continue
        const near = this.clusters.reduce((m, c) => Math.min(m, Math.hypot(c.x - x, c.y - y) - c.r), small)
        const score = -near * 0.6 + R() * small * 0.5
        if (score > bestScore) { bestScore = score; best = { x, y } }
      }
      if (!best) continue
      const n = 1 + Math.floor(R() * 4)
      const flowerAt = R() < 0.45 ? Math.floor(R() * n) : -1
      const budAt = R() < 0.3 ? Math.floor(R() * n) : -1
      for (let j = 0; j < n; j++) {
        const r = base * (0.65 + R() * 0.7)
        const a = R() * TAU, d = j === 0 ? 0 : base * (1.4 + R() * 1.4)
        const x = best.x + Math.cos(a) * d, y = best.y + Math.sin(a) * d
        if (blocked(x, y, r)) continue
        const sprite = padSprite(r, seed + g * 17 + j)
        if (j === budAt) drawBud(sprite, sprite.w / 2 + (R() - 0.5) * r * 0.6, sprite.h / 2 + (R() - 0.5) * r * 0.6, r * 0.8, R() * TAU)
        sprite.flush()
        const flower = j === flowerAt ? lotusSprite(Math.max(3.5, r * 0.62), seed + g * 5 + j).canvas : null
        this.pads.push({
          x, y, r, sprite: sprite.canvas, ox: -Math.floor(sprite.w / 2) + 1, oy: -Math.floor(sprite.h / 2) + 1, phase: R() * TAU,
          flower, fx: (R() - 0.5) * r * 0.5, fy: (R() - 0.5) * r * 0.5,
        })
      }
    }
  }

  /** The pond bed: depth, sunlit shallows by the banks, pebbles and soft shadows. Also the map of where light falls. */
  private paintBed(seed: number) {
    const { W, H } = this
    const bed = new PixelCanvas(W, H)
    const sun = new Float32Array(W * H)
    const mask = new PixelCanvas(W, H)
    const small = Math.min(W, H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let shallow = 0
        for (const c of this.clusters) shallow = Math.max(shallow, clamp(1 - (Math.hypot(c.x - x, c.y - y) - c.r * 0.7) / (c.r * 0.8 + small * 0.08)))
        const sx = x / W - 0.6, sy = y / H + 0.08
        const s = Math.exp(-(sx * sx * 1.6 + sy * sy * 2.2) * 2.4)
        const broad = fbm(x * 0.022, y * 0.022, seed, 4)
        const fine = fbm(x * 0.14, y * 0.14, seed + 3, 2)
        const ex = Math.min(x, W - x) / small, ey = Math.min(y, H - y) / small
        const edge = clamp(1 - Math.min(ex, ey) * 5)
        let v = 0.2 + shallow * 0.36 + s * 0.3 + (broad - 0.5) * 0.4 + (fine - 0.5) * 0.08 - edge * 0.12
        // Pebbles in the shallows, weed shadows in the deep.
        const w = white(x, y, seed)
        if (w > 0.992 - shallow * 0.03) v += 0.12
        else if (w < 0.006 + shallow * 0.01) v -= 0.1
        if (fbm(x * 0.06, y * 0.2, seed + 9, 3) > 0.68 && shallow < 0.6) v -= 0.07
        bed.put(x, y, ramp(WATER, v, x, y, 0.5))
        const patches = clamp((fbm(x * 0.035 + 7, y * 0.035, seed + 21, 3) - 0.38) * 3)
        const light = clamp((0.12 + s * 0.6 + shallow * 0.3) * patches + (broad - 0.5) * 0.3 - edge * 0.3)
        sun[y * W + x] = light
        mask.put(x, y, [255, 255, 255], Math.round(light * 255))
      }
    }
    this.bed = bed.flush()
    this.sunMap = sun
    mask.flush()
    const m = this.lightMask.getContext('2d')!
    m.clearRect(0, 0, W, H)
    m.drawImage(mask.canvas, 0, 0)
  }

  /** Close to the eye: a few big leaves and blossoming branches in the corners — only where there is room. */
  private paintForeground(seed: number) {
    const { W, H } = this
    const pc = new PixelCanvas(W, H)
    const R = rng(seed + 55)
    const small = Math.min(W, H)
    if (small >= 200) {
      for (const c of this.clusters) {
        if (!c.corner || c.r < 30) continue
        const toWater = Math.atan2(H / 2 - c.y, W / 2 - c.x)
        const room = this.freeRadius(c.x, c.y)
        if (c.kind === 'blossom' || c.kind === 'lantern') {
          drawBlossomBranch(pc, c.x - Math.cos(toWater) * 4, c.y - Math.sin(toWater) * 4, toWater + (R() - 0.5) * 0.5, Math.min(room * 0.75, c.r * 1.05), seed + 3)
        } else {
          const r = Math.min(room * 0.42, c.r * 0.5)
          drawBigLeaf(pc, Math.round(c.x + Math.cos(toWater) * r * 0.25), Math.round(c.y + Math.sin(toWater) * r * 0.25), Math.round(r), seed + 9)
        }
      }
    }
    pc.flush()
    this.nearCtx.clearRect(0, 0, W, H)
    this.nearCtx.drawImage(pc.canvas, 0, 0)
  }

  /** Enough koi for the water there is: fewer on a phone, a whole shoal on a wide screen. Existing fish carry over. */
  private populate(oldPx: number, oldW: number, oldH: number) {
    const { W, H, rand } = this
    const small = Math.min(W, H)
    const length = clamp(small / 10, 15, 36)
    const want = clamp(Math.round((W * H) / 11000), 5, 18)
    for (const k of this.fish) {
      k.x *= W / Math.max(1, oldW)
      k.y *= H / Math.max(1, oldH)
      if (oldPx !== this.px) k.length *= oldPx / this.px
      k.length = clamp(k.length, length * 0.7, length * 1.25)
      k.trail = []
      k.trail.push(k.x - Math.cos(k.heading) * k.length * 1.3, k.y - Math.sin(k.heading) * k.length * 1.3, k.x, k.y)
    }
    this.fish = this.fish.slice(0, want)
    for (const k of this.fish) if (k.leader && !this.fish.includes(k.leader)) { k.leader = null; k.mode = 'cruise' }
    while (this.fish.length < want) {
      const i = this.fish.length
      this.fish.push(createKoi(rand, this.bounds, length, PATTERNS[i % PATTERNS.length], 3 + i * 17))
    }
    if (this.fish.length >= 6 && !this.fish.some((k) => k.mode === 'follow')) this.school()
  }

  private school() {
    const free = this.fish.filter((k) => k.mode === 'cruise' && !this.fish.some((f) => f.leader === k))
    if (free.length < 3) return
    const leader = free[Math.floor(this.rand() * free.length)]
    const others = free.filter((k) => k !== leader).sort((a, b) => Math.hypot(a.x - leader.x, a.y - leader.y) - Math.hypot(b.x - leader.x, b.y - leader.y))
    formSchool(leader, others.slice(0, this.rand() < 0.5 ? 1 : 2), this.rand)
  }

  // ——— Events ———

  /** A piece landed on the board at this screen point: rings spread, bubbles rise, nearby fish dart away. */
  splash(clientX: number, clientY: number, strength: number) {
    const x = clientX / this.px, y = clientY / this.px
    const L = clamp(Math.min(this.W, this.H) / 10, 15, 36)
    for (let i = 0; i < (strength > 1 ? 3 : 2); i++) {
      this.ripples.push({ x, y, age: -i * 0.22, life: 2 + strength * 0.6, r: L * (1.1 + strength * 0.5 + i * 0.25), a: 0.5 + strength * 0.15, rings: 2 })
    }
    for (let i = 0; i < 3 + strength * 3; i++) {
      this.bubbles.push({ x: x + (this.rand() - 0.5) * L * 0.8, y: y + (this.rand() - 0.5) * L * 0.8, age: -this.rand() * 0.4, life: 0.8 + this.rand() * 1.2, vx: (this.rand() - 0.5) * 3, vy: (this.rand() - 0.5) * 3 })
    }
    startle(this.fish, x, y, L * (3 + strength), this.rand)
  }

  // ——— The loop ———

  start() {
    if (this.running) return
    this.running = true
    if (this.still) {
      this.time = 6
      this.render(0)
      return
    }
    this.last = performance.now()
    const tick = (now: number) => {
      if (!this.running) return
      this.frame = requestAnimationFrame(tick)
      const elapsed = now - this.last
      if (elapsed < this.minFrame) return
      this.last = now
      this.render(Math.min(0.1, elapsed / 1000))
    }
    this.frame = requestAnimationFrame(tick)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.frame)
  }

  private update(dt: number) {
    const { rand, W, H } = this
    this.time += dt
    for (const k of this.fish) {
      updateKoi(k, dt, this.bounds, rand)
      // A faint wake behind fish swimming near the surface.
      k.wake -= dt
      if (k.wake <= 0) {
        k.wake = 1.3 + rand() * 1.8
        if (k.depth < 0.55 && k.speed > k.length * 0.18 && k.x > 0 && k.y > 0 && k.x < W && k.y < H) {
          this.ripples.push({ x: k.x, y: k.y, age: 0, life: 1.6, r: k.length * 0.5, a: 0.28, rings: 1 })
        }
      }
    }
    this.nextSchool -= dt
    if (this.nextSchool <= 0) {
      this.school()
      this.nextSchool = 18 + rand() * 24
    }
    // Ambient rings: an insect, a drop from a leaf, a pad settling.
    this.nextRipple -= dt
    if (this.nextRipple <= 0) {
      this.nextRipple = 1.6 + rand() * 3
      const pad = this.pads.length && rand() < 0.35 ? this.pads[Math.floor(rand() * this.pads.length)] : null
      const x = pad ? pad.x + Math.cos(rand() * TAU) * pad.r * 1.1 : rand() * W
      const y = pad ? pad.y + Math.sin(rand() * TAU) * pad.r * 1.1 : rand() * H
      this.ripples.push({ x, y, age: 0, life: 2.6, r: 5 + rand() * 9, a: 0.4, rings: 2 })
    }
    // Sun glints in the bright water.
    const wantGlints = Math.round((W * H) / 9000)
    while (this.glints.length < wantGlints) {
      const x = Math.floor(rand() * W), y = Math.floor(rand() * H)
      if (this.sunMap[y * W + x] > 0.45 + rand() * 0.4) this.glints.push({ x, y, age: -rand() * 3, life: 0.5 + rand() * 0.9 })
      else break
    }
    // Petals: some fall from the flowering shrubs, others drift in on the current.
    const wantPetals = clamp(Math.round((W * H) / 14000), 3, 16)
    if (this.petals.length < wantPetals && rand() < dt * 0.6) this.spawnPetal()
    const flow = this.time * 0.013
    const cur = { x: Math.cos(flow) * 1.3 + 0.9, y: Math.sin(flow * 0.7) * 0.8 + 0.4 }
    for (const p of this.petals) {
      p.age += dt
      p.x += (p.vx + cur.x + Math.sin(p.age * 0.8 + p.turn) * 0.6) * dt
      p.y += (p.vy + cur.y + Math.cos(p.age * 0.6 + p.turn) * 0.5) * dt
      p.vx *= 1 - dt * 0.5
      p.vy *= 1 - dt * 0.5
    }
    this.petals = this.petals.filter((p) => p.age < p.life && p.x > -6 && p.y > -6 && p.x < W + 6 && p.y < H + 6)
    for (const b of this.bubbles) {
      b.age += dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (b.age >= b.life && b.age - dt < b.life) this.ripples.push({ x: b.x, y: b.y, age: 0, life: 0.9, r: 3, a: 0.45, rings: 1 })
    }
    this.bubbles = this.bubbles.filter((b) => b.age < b.life)
    for (const r of this.ripples) r.age += dt
    this.ripples = this.ripples.filter((r) => r.age < r.life)
    for (const g of this.glints) g.age += dt
    this.glints = this.glints.filter((g) => g.age < g.life)
    // Now and then a pale bubble or two escapes a fish.
    if (rand() < dt * 0.25 && this.fish.length) {
      const k = this.fish[Math.floor(rand() * this.fish.length)]
      if (k.x > 0 && k.y > 0 && k.x < W && k.y < H) this.bubbles.push({ x: k.x, y: k.y, age: 0, life: 1 + rand(), vx: (rand() - 0.5) * 2, vy: (rand() - 0.5) * 2 })
    }
  }

  private spawnPetal() {
    const { rand, W, H } = this
    const tone = BLOSSOM[1 + Math.floor(rand() * 3)]
    const fromShrub = this.petalSources.length && rand() < 0.6
    if (fromShrub) {
      const s = this.petalSources[Math.floor(rand() * this.petalSources.length)]
      const a = rand() * TAU
      const p = { x: s.x + Math.cos(a) * 6, y: s.y + Math.sin(a) * 6, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, age: 0, life: 40 + rand() * 40, tone, turn: rand() * TAU }
      this.petals.push(p)
      // It lands with the smallest ring.
      this.ripples.push({ x: p.x, y: p.y, age: 0, life: 1.2, r: 3, a: 0.35, rings: 1 })
    } else {
      this.petals.push({ x: rand() < 0.5 ? -4 : rand() * W, y: rand() < 0.5 ? rand() * H : -4, vx: 0, vy: 0, age: 0, life: 60 + rand() * 60, tone, turn: rand() * TAU })
    }
  }

  private render(dt: number) {
    if (!this.bed || !this.mid || !this.fishCanvas || !this.tiles) return
    this.update(dt)
    const { ctx, W, H, time } = this
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    // Background: the bed.
    ctx.drawImage(this.bed.canvas, 0, 0)

    // Koi and their shadows, under the surface.
    renderKoi(this.fish, this.fishBuf, W, H, time)
    this.fishCanvas.flush()
    ctx.drawImage(this.fishCanvas.canvas, 0, 0)

    // Caustic light over bed and fish: two drifting layers, stepped like sprite animation, masked to where the sun reaches.
    const lc = this.light.getContext('2d')!
    lc.globalCompositeOperation = 'source-over'
    lc.clearRect(0, 0, W, H)
    const T = CAUSTIC_TILE
    const step = Math.floor(time * 7)
    for (const [i, speed] of [[0, 1], [5, -0.7]] as const) {
      const tile = this.tiles[(step + i) % CAUSTIC_FRAMES]
      const pat = lc.createPattern(tile, 'repeat')!
      const ox = Math.round(time * 1.6 * speed + i * 23) % T
      const oy = Math.round(time * 0.9 * speed + i * 41) % T
      lc.save()
      lc.globalAlpha = i ? 0.55 : 1
      lc.translate(ox - T, oy - T)
      lc.fillStyle = pat
      lc.fillRect(0, 0, W + 2 * T, H + 2 * T)
      lc.restore()
    }
    lc.globalAlpha = 1
    lc.globalCompositeOperation = 'destination-in'
    lc.drawImage(this.lightMask, 0, 0)
    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(this.light, 0, 0)
    ctx.globalCompositeOperation = 'source-over'

    this.drawRipples()
    this.drawGlints()
    this.drawBubbles()

    // Lily pads bob a pixel now and then; lotus flowers ride on them.
    for (const p of this.pads) {
      const bx = Math.round(p.x + Math.sin(time * 0.35 + p.phase) * 0.7)
      const by = Math.round(p.y + Math.cos(time * 0.27 + p.phase) * 0.7)
      ctx.drawImage(p.sprite, bx + p.ox, by + p.oy)
      if (p.flower) ctx.drawImage(p.flower, Math.round(bx + p.fx - p.flower.width / 2), Math.round(by + p.fy - p.flower.height / 2))
    }
    this.drawPetals()

    // Midground: banks, stones, shrubs, lanterns; bamboo sways through its frames.
    ctx.drawImage(this.mid.canvas, 0, 0)
    for (const b of this.bamboo) {
      const f = Math.round(((Math.sin(time * 0.55 + b.phase) + Math.sin(time * 0.9 + b.phase * 2) * 0.3) / 1.3 * 0.5 + 0.5) * (b.canvases.length - 1))
      ctx.drawImage(b.canvases[clamp(f, 0, b.canvases.length - 1)], b.x, b.y)
    }
    // Lantern light: a warm pool that breathes like a flame.
    for (const l of this.lanterns) {
      const flicker = 0.75 + 0.15 * Math.sin(time * 3.1) + 0.1 * Math.sin(time * 7.3 + 1)
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 1.4)
      g.addColorStop(0, `rgba(${LANTERN_GLOW.join(',')},${0.5 * flicker})`)
      g.addColorStop(0.35, `rgba(${LANTERN_GLOW.join(',')},${0.16 * flicker})`)
      g.addColorStop(1, 'rgba(255,207,122,0)')
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = g
      ctx.fillRect(l.x - l.r * 1.4, l.y - l.r * 1.4, l.r * 2.8, l.r * 2.8)
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  private drawRipples() {
    const { ctx } = this
    for (const r of this.ripples) {
      if (r.age < 0) continue
      const k = r.age / r.life
      const ease = 1 - Math.pow(1 - k, 2.2)
      const fade = (1 - k) * (1 - k) * r.a
      for (let ring = 0; ring < r.rings; ring++) {
        const rad = r.r * ease * (1 - ring * 0.42)
        if (rad < 1) continue
        const n = Math.max(8, Math.ceil(rad * TAU))
        // The crest catches light on the side toward the sun; a faint trough sits just outside it.
        ctx.beginPath()
        const trough = new Path2D()
        const seen = new Set<number>()
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU
          const x = Math.round(r.x + Math.cos(a) * rad), y = Math.round(r.y + Math.sin(a) * rad)
          const key = x * 8192 + y
          if (seen.has(key)) continue
          seen.add(key)
          if (Math.cos(a) * -0.6 + Math.sin(a) * -0.8 > -0.3) ctx.rect(x, y, 1, 1)
          else trough.rect(x + (Math.cos(a) > 0 ? 1 : 0), y + (Math.sin(a) > 0 ? 1 : 0), 1, 1)
        }
        ctx.fillStyle = `rgba(${RIPPLE.join(',')},${fade * (ring ? 0.6 : 1)})`
        ctx.fill()
        ctx.fillStyle = `rgba(${SHADOW.join(',')},${fade * 0.55})`
        ctx.fill(trough)
      }
    }
  }

  private drawGlints() {
    const { ctx } = this
    ctx.fillStyle = `rgb(${GLINT.join(',')})`
    for (const g of this.glints) {
      if (g.age < 0) continue
      const k = Math.sin((g.age / g.life) * Math.PI)
      ctx.globalAlpha = k * 0.85
      ctx.fillRect(g.x, g.y, 1, 1)
      if (k > 0.75) {
        ctx.globalAlpha = (k - 0.75) * 2
        ctx.fillRect(g.x - 1, g.y, 1, 1)
        ctx.fillRect(g.x + 1, g.y, 1, 1)
        ctx.fillRect(g.x, g.y - 1, 1, 1)
        ctx.fillRect(g.x, g.y + 1, 1, 1)
      }
    }
    ctx.globalAlpha = 1
  }

  private drawBubbles() {
    const { ctx } = this
    for (const b of this.bubbles) {
      if (b.age < 0) continue
      const k = b.age / b.life
      ctx.globalAlpha = 0.75 * Math.sin(k * Math.PI)
      ctx.fillStyle = `rgb(${RIPPLE.join(',')})`
      ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1)
      ctx.fillStyle = `rgb(${GLINT.join(',')})`
      if (k > 0.3) ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 1, 1)
    }
    ctx.globalAlpha = 1
  }

  private drawPetals() {
    const { ctx } = this
    for (const p of this.petals) {
      const fade = Math.min(1, p.age / 1.5, (p.life - p.age) / 4)
      ctx.globalAlpha = clamp(fade)
      const x = Math.round(p.x), y = Math.round(p.y)
      const o = Math.floor(((p.age * 0.3 + p.turn) % TAU) / (TAU / 4))
      ctx.fillStyle = `rgba(${SHADOW.join(',')},0.35)`
      ctx.fillRect(x + 1, y + 1, o % 2 ? 1 : 2, o % 2 ? 2 : 1)
      ctx.fillStyle = `rgb(${p.tone.join(',')})`
      ctx.fillRect(x, y, o % 2 ? 1 : 2, o % 2 ? 2 : 1)
      if (o > 1) {
        ctx.fillStyle = `rgb(${BLOSSOM[3].join(',')})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
    ctx.globalAlpha = 1
  }

  /** Copies the current frame, so a caller can cross-fade to a new composition. */
  snapshot(target: HTMLCanvasElement) {
    target.width = this.main.width
    target.height = this.main.height
    target.style.width = this.main.style.width
    target.style.height = this.main.style.height
    target.getContext('2d')!.drawImage(this.main, 0, 0)
  }

  get pixel() {
    return this.px
  }
}

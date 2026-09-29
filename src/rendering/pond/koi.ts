import { KOI, SHADOW, WATER_TINT } from './palette'
import { clamp, mix, noise, scale, type RGB } from './pixels'

/**
 * Koi: a little flocking simulation and a software rasteriser.
 *
 * Each fish remembers the path its head has travelled; the body is laid along
 * that path, so it bends through every curve the fish swims, and a travelling
 * wave on top of it swings the tail. Bodies are rasterised pixel by pixel into
 * a shared buffer (crisp silhouettes, patterned scales, eyes, flapping fins).
 */

export type KoiPattern = 'kohaku' | 'orange' | 'hariwake' | 'showa' | 'asagi' | 'ogon' | 'tancho'
export const PATTERNS: KoiPattern[] = ['kohaku', 'orange', 'hariwake', 'showa', 'asagi', 'kohaku', 'ogon', 'tancho', 'orange', 'showa']

type Mode = 'cruise' | 'pause' | 'circle' | 'follow' | 'flee' | 'leave'

export interface Koi {
  x: number
  y: number
  heading: number
  speed: number
  target: number
  turn: number
  turnTarget: number
  phase: number
  length: number
  /** 0 = just under the surface, 1 = near the bed. */
  depth: number
  pattern: KoiPattern
  seed: number
  mode: Mode
  timer: number
  wander: number
  wake: number
  leader: Koi | null
  offset: { back: number; side: number }
  orbit: { x: number; y: number; r: number; dir: number } | null
  trail: number[]
}

export interface Bounds {
  w: number
  h: number
  /** Things worth circling: lily pads and stones. */
  landmarks: { x: number; y: number; r: number }[]
}

const TAU = Math.PI * 2
const wrap = (a: number) => {
  while (a > Math.PI) a -= TAU
  while (a < -Math.PI) a += TAU
  return a
}

export function createKoi(rand: () => number, b: Bounds, length: number, pattern: KoiPattern, seed: number, inside = true): Koi {
  const k: Koi = {
    x: 0, y: 0, heading: 0, speed: 0, target: 0, turn: 0, turnTarget: 0, phase: rand() * 10,
    length: length * (0.75 + rand() * 0.45), depth: 0.2 + rand() * 0.7, pattern, seed,
    mode: 'cruise', timer: 3 + rand() * 6, wander: 0, wake: rand() * 2, leader: null,
    offset: { back: 0, side: 0 }, orbit: null, trail: [],
  }
  if (inside) {
    k.x = b.w * (0.1 + rand() * 0.8)
    k.y = b.h * (0.1 + rand() * 0.8)
    k.heading = rand() * TAU
  } else enterFromEdge(k, rand, b)
  k.speed = k.target = cruiseSpeed(k, rand)
  resetTrail(k)
  return k
}

const cruiseSpeed = (k: Koi, rand: () => number) => k.length * (0.22 + rand() * 0.28)

function resetTrail(k: Koi) {
  k.trail = []
  const n = 24
  for (let i = n; i >= 0; i--) {
    const d = (i / n) * k.length * 1.3
    k.trail.push(k.x - Math.cos(k.heading) * d, k.y - Math.sin(k.heading) * d)
  }
}

/** Re-enter the pond from a random edge, heading in: fish disappear behind the scenery and come back elsewhere. */
function enterFromEdge(k: Koi, rand: () => number, b: Bounds) {
  const side = Math.floor(rand() * 4)
  const m = k.length * 1.2
  if (side === 0) { k.x = -m; k.y = rand() * b.h }
  else if (side === 1) { k.x = b.w + m; k.y = rand() * b.h }
  else if (side === 2) { k.x = rand() * b.w; k.y = -m }
  else { k.x = rand() * b.w; k.y = b.h + m }
  const tx = b.w * (0.25 + rand() * 0.5), ty = b.h * (0.25 + rand() * 0.5)
  k.heading = Math.atan2(ty - k.y, tx - k.x) + (rand() - 0.5) * 0.6
  k.mode = 'cruise'
  k.timer = 5 + rand() * 6
  resetTrail(k)
}

/** A fish swims away from a disturbance (a piece landing on the board above it). */
export function startle(fish: Koi[], x: number, y: number, radius: number, rand: () => number) {
  for (const k of fish) {
    const d = Math.hypot(k.x - x, k.y - y)
    if (d > radius) continue
    k.mode = 'flee'
    k.timer = 0.9 + rand() * 0.8
    k.heading += wrap(Math.atan2(k.y - y, k.x - x) - k.heading) * 0.5
    k.turnTarget = wrap(Math.atan2(k.y - y, k.x - x) - k.heading) * 2.5
    k.target = k.length * (1.4 + rand() * 0.6)
  }
}

export function updateKoi(k: Koi, dt: number, b: Bounds, rand: () => number) {
  k.timer -= dt
  const steer = (angle: number, gain: number, max = 1.1) => {
    k.turnTarget = clamp(wrap(angle - k.heading) * gain, -max, max)
  }

  switch (k.mode) {
    case 'cruise': {
      k.wander -= dt
      if (k.wander <= 0) {
        k.turnTarget = (rand() - 0.5) * 0.7
        k.wander = 1.5 + rand() * 3
      }
      // Stay in the pond: past the margin, curve gently back toward the middle.
      const m = k.length * 1.5
      if (k.x < m || k.x > b.w - m || k.y < m || k.y > b.h - m) {
        steer(Math.atan2(b.h / 2 - k.y + (rand() - 0.5) * b.h * 0.3, b.w / 2 - k.x), 0.9, 0.7)
      }
      if (k.timer <= 0) chooseNext(k, b, rand)
      break
    }
    case 'pause':
      k.turnTarget *= 0.9
      if (k.timer <= 0) {
        k.mode = 'cruise'
        k.target = cruiseSpeed(k, rand)
        k.timer = 4 + rand() * 6
      }
      break
    case 'circle': {
      const o = k.orbit!
      const a = Math.atan2(k.y - o.y, k.x - o.x)
      const d = Math.hypot(k.x - o.x, k.y - o.y)
      steer(a + o.dir * (Math.PI / 2) + clamp((d - o.r) / o.r, -0.6, 0.6) * o.dir, 1.6, 1.2)
      if (k.timer <= 0) { k.mode = 'cruise'; k.orbit = null; k.timer = 4 + rand() * 5 }
      break
    }
    case 'follow': {
      const l = k.leader!
      const tx = l.x - Math.cos(l.heading) * k.offset.back - Math.sin(l.heading) * k.offset.side
      const ty = l.y - Math.sin(l.heading) * k.offset.back + Math.cos(l.heading) * k.offset.side
      const d = Math.hypot(tx - k.x, ty - k.y)
      steer(Math.atan2(ty - k.y, tx - k.x), 1.4, 1.3)
      k.target = clamp(l.speed * (0.7 + d / (k.length * 2)), 0, k.length * 1.4)
      if (k.timer <= 0 || l.mode === 'leave') { k.mode = 'cruise'; k.leader = null; k.timer = 3 + rand() * 5 }
      break
    }
    case 'flee':
      k.turnTarget *= 0.96
      if (k.timer <= 0) { k.mode = 'cruise'; k.target = cruiseSpeed(k, rand); k.timer = 3 + rand() * 4 }
      break
    case 'leave': {
      const m = k.length * 1.4
      if (k.x < -m || k.x > b.w + m || k.y < -m || k.y > b.h + m) {
        if (k.timer <= 0) {
          enterFromEdge(k, rand, b)
          k.speed = k.target = cruiseSpeed(k, rand)
        }
        return
      }
      break
    }
  }

  k.turn += (k.turnTarget - k.turn) * Math.min(1, dt * 2)
  k.speed += (k.target - k.speed) * Math.min(1, dt * (k.mode === 'flee' ? 4 : 1.2))
  // Fish turn more tightly when slow, like real koi drifting round a pad.
  k.heading = wrap(k.heading + k.turn * dt * (0.6 + 0.4 * clamp(k.speed / k.length)))
  k.x += Math.cos(k.heading) * k.speed * dt
  k.y += Math.sin(k.heading) * k.speed * dt
  // The tail beats faster when the fish swims faster, and lazily when it drifts.
  k.phase += dt * (0.9 + (k.speed / k.length) * 2.6)

  const hx = k.trail[k.trail.length - 2], hy = k.trail[k.trail.length - 1]
  if (Math.hypot(k.x - hx, k.y - hy) > 0.5) {
    k.trail.push(k.x, k.y)
    if (k.trail.length > 90) k.trail.splice(0, 2)
  }
}

function chooseNext(k: Koi, b: Bounds, rand: () => number) {
  const r = rand()
  if (r < 0.16) {
    k.mode = 'pause'
    k.target = k.length * 0.03
    k.timer = 2 + rand() * 3
  } else if (r < 0.34 && b.landmarks.length) {
    // Circle the nearest pad or stone for a while.
    let best = b.landmarks[0], bd = Infinity
    for (const l of b.landmarks) {
      const d = Math.hypot(l.x - k.x, l.y - k.y)
      if (d < bd) { bd = d; best = l }
    }
    if (bd < k.length * 8) {
      k.mode = 'circle'
      k.orbit = { x: best.x, y: best.y, r: best.r + k.length * 0.9, dir: rand() > 0.5 ? 1 : -1 }
      k.timer = 5 + rand() * 6
      k.target = cruiseSpeed(k, rand) * 0.75
    } else k.timer = 3
  } else if (r < 0.44) {
    // Swim out of view; it will come back from another edge.
    k.mode = 'leave'
    k.timer = 1 + rand() * 4
    const edges = [Math.PI, 0, -Math.PI / 2, Math.PI / 2]
    k.turnTarget = clamp(wrap(edges[Math.floor(rand() * 4)] - k.heading), -0.6, 0.6)
  } else {
    k.timer = 4 + rand() * 6
    k.target = cruiseSpeed(k, rand)
  }
}

/** Two or three fish swimming together: the others fall in behind a leader. */
export function formSchool(leader: Koi, followers: Koi[], rand: () => number) {
  followers.forEach((f, i) => {
    f.mode = 'follow'
    f.leader = leader
    f.timer = 10 + rand() * 14
    f.offset = { back: leader.length * (0.8 + i * 0.7), side: (i % 2 ? 1 : -1) * leader.length * (0.35 + rand() * 0.3) }
  })
}

// ——— Rendering ———

const SPINE = 10

/** Points along the body, head first, following the path already swum, with the tail's wave on top. */
function spine(k: Koi): Float32Array {
  const out = new Float32Array(SPINE * 2)
  const total = k.length * 1.08
  const t = k.trail
  let seg = t.length - 2
  let acc = 0
  let px = k.x, py = k.y
  for (let i = 0; i < SPINE; i++) {
    const want = (i / (SPINE - 1)) * total
    while (seg >= 2) {
      const qx = t[seg - 2], qy = t[seg - 1]
      const len = Math.hypot(px - qx, py - qy)
      if (acc + len >= want) {
        const f = len > 0 ? (want - acc) / len : 0
        out[i * 2] = px + (qx - px) * f
        out[i * 2 + 1] = py + (qy - py) * f
        break
      }
      acc += len
      px = qx
      py = qy
      seg -= 2
    }
    if (seg < 2) {
      out[i * 2] = px - Math.cos(k.heading) * (want - acc)
      out[i * 2 + 1] = py - Math.sin(k.heading) * (want - acc)
    }
  }
  // The swimming wave: grows toward the tail, travels backward.
  for (let i = 1; i < SPINE; i++) {
    const s = i / (SPINE - 1)
    const ax = out[i * 2 - 2] - out[i * 2], ay = out[i * 2 - 1] - out[i * 2 + 1]
    const l = Math.hypot(ax, ay) || 1
    const amp = k.length * 0.075 * Math.pow(s, 1.6) * Math.sin(k.phase * TAU * 0.55 - s * 3.2)
    out[i * 2] += (-ay / l) * amp
    out[i * 2 + 1] += (ax / l) * amp
  }
  return out
}

/** Body half-width along the fish, in units of length: a rounded head, full shoulders, a slim wrist. */
function halfWidth(s: number): number {
  if (s <= 0.8) {
    const u = s / 0.8
    const p = u < 0.3 ? 0.45 + 0.55 * Math.sin((u / 0.3) * (Math.PI / 2)) : 1 - 0.76 * Math.pow((u - 0.3) / 0.7, 1.25)
    return 0.15 * p
  }
  // The tail fin fans out behind the wrist.
  const f = (s - 0.8) / 0.2
  return 0.15 * (0.24 + 0.95 * Math.pow(f, 0.8))
}

function patternColor(k: Koi, s: number, u: number): RGB {
  const n = noise(s * 5.5 + k.seed * 0.37, u * 1.6 + k.seed, k.seed)
  const m = noise(s * 3.2 + 11, u * 2 + k.seed * 0.11, k.seed + 5)
  switch (k.pattern) {
    case 'kohaku':
      return n > 0.52 || (s < 0.12 && m > 0.35) ? KOI.red : KOI.white
    case 'orange':
      return n > 0.45 ? KOI.orange : KOI.white
    case 'hariwake':
      return n > 0.5 ? KOI.gold : KOI.cream
    case 'showa':
      return m > 0.58 ? KOI.black : n > 0.4 ? KOI.orange : s < 0.1 ? KOI.black : KOI.white
    case 'asagi': {
      if (Math.abs(u) > 0.72) return KOI.orange
      return mix(KOI.slate, KOI.white, Math.abs(u) * 0.35)
    }
    case 'ogon':
      return KOI.gold
    case 'tancho':
      return s > 0.03 && s < 0.13 && Math.abs(u) < 0.55 ? KOI.red : KOI.white
  }
}

const pack = (c: RGB, a: number) =>
  (((a & 255) << 24) | ((Math.round(c[2]) & 255) << 16) | ((Math.round(c[1]) & 255) << 8) | (Math.round(c[0]) & 255)) >>> 0

/**
 * Draws every fish into `buf` (a W×H Uint32 view of ImageData, little-endian ABGR):
 * all the shadows on the bed first, then the fish from deepest to shallowest.
 */
export function renderKoi(fish: Koi[], buf: Uint32Array, w: number, h: number, time: number) {
  buf.fill(0)
  const shaded = fish.map((k) => ({ k, px: rasterise(k, w, h, time) }))
  const shadow = pack(SHADOW, 78)
  for (const { k, px } of shaded) {
    const ox = Math.round(1 + (1 - k.depth) * 2.5), oy = Math.round(2 + (1 - k.depth) * 3)
    for (let i = 0; i < px.idx.length; i++) {
      const p = px.idx[i]
      const x = (p % w) + ox, y = ((p / w) | 0) + oy
      if (x < w && y < h) {
        const j = y * w + x
        if (buf[j] === 0) buf[j] = shadow
      }
    }
  }
  shaded.sort((a, b) => b.k.depth - a.k.depth)
  for (const { px } of shaded) {
    for (let i = 0; i < px.idx.length; i++) {
      const c = px.col[i]
      const a = c >>> 24
      const j = px.idx[i]
      if (a === 255 || (buf[j] >>> 24) < 100) buf[j] = c
      else {
        // A translucent fin over another fish: blend.
        const d = buf[j]
        const t = a / 255
        const r = (d & 255) + ((c & 255) - (d & 255)) * t
        const g = ((d >> 8) & 255) + (((c >> 8) & 255) - ((d >> 8) & 255)) * t
        const bb = ((d >> 16) & 255) + (((c >> 16) & 255) - ((d >> 16) & 255)) * t
        buf[j] = pack([r, g, bb], 255)
      }
    }
  }
}

function rasterise(k: Koi, w: number, h: number, time: number): { idx: number[]; col: number[] } {
  const sp = spine(k)
  const L = k.length
  const idx: number[] = []
  const col: number[] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < SPINE; i++) {
    minX = Math.min(minX, sp[i * 2]); maxX = Math.max(maxX, sp[i * 2])
    minY = Math.min(minY, sp[i * 2 + 1]); maxY = Math.max(maxY, sp[i * 2 + 1])
  }
  const pad = L * 0.26
  const x0 = Math.max(0, Math.floor(minX - pad)), x1 = Math.min(w - 1, Math.ceil(maxX + pad))
  const y0 = Math.max(0, Math.floor(minY - pad)), y1 = Math.min(h - 1, Math.ceil(maxY + pad))
  if (x0 > x1 || y0 > y1) return { idx, col }

  const tint = 0.1 + k.depth * 0.26
  const flap = 0.55 + 0.45 * Math.sin(k.phase * TAU * 0.35)
  const metallic = k.pattern === 'ogon' || k.pattern === 'hariwake'

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const qx = x + 0.5, qy = y + 0.5
      // Nearest point on the spine polyline.
      let best = Infinity, bs = 0, side = 0, beyond = false
      for (let i = 0; i < SPINE - 1; i++) {
        const ax = sp[i * 2], ay = sp[i * 2 + 1], bx = sp[i * 2 + 2], by = sp[i * 2 + 3]
        const dx = bx - ax, dy = by - ay
        const ll = dx * dx + dy * dy || 1
        const raw = ((qx - ax) * dx + (qy - ay) * dy) / ll
        const t = clamp(raw)
        const cx = ax + dx * t - qx, cy = ay + dy * t - qy
        const d = cx * cx + cy * cy
        if (d < best) {
          best = d
          bs = (i + t) / (SPINE - 1)
          side = dx * (qy - ay) - dy * (qx - ax)
          beyond = i === SPINE - 2 && raw > 1
        }
      }
      const dist = Math.sqrt(best)
      const hw = halfWidth(bs) * L
      const u = (side < 0 ? -1 : 1) * (dist / Math.max(0.01, hw))
      const au = Math.abs(u)

      // The tail ends square (then forked), not in a rounded cap.
      if (beyond) continue
      let c: RGB | null = null
      let a = 255
      if (bs <= 0.8 && au <= 1) {
        c = patternColor(k, bs, u)
        // Round the body: darker along the flanks, a sheen down the back.
        if (au > 0.72) c = scale(c, 0.74)
        else if (au < 0.22 && bs > 0.08 && bs < 0.7) c = scale(c, 1.1)
        if (metallic && ((x * 7 + y * 13 + Math.floor(time * 3)) % 23) === 0) c = scale(c, 1.25)
        if (k.pattern === 'asagi' && au < 0.72 && ((x + y) & 1) === 0 && ((x - y) & 3) === 0) c = scale(c, 0.85)
      } else if (bs > 0.8 && au <= 1) {
        // Tail fin: translucent, forked at its end.
        const f = (bs - 0.8) / 0.2
        if (!(f > 0.55 && au < (f - 0.55) * 1.6)) {
          c = mix(patternColor(k, 0.78, u * 0.4), KOI.white, 0.35)
          a = 175 - Math.round(f * 55)
        }
      } else if (bs > 0.16 && bs < 0.3 && au > 1 && dist < hw + L * 0.11 * flap) {
        // Pectoral fins, sweeping.
        c = mix(patternColor(k, 0.2, u), KOI.white, 0.45)
        a = 150
      }
      if (!c) continue
      c = mix(c, WATER_TINT, tint)
      idx.push(y * w + x)
      col.push(pack(c, a))
    }
  }

  // Eyes: one dark pixel each side of the head.
  const hx = sp[0], hy = sp[1], nx = sp[2] - hx, ny = sp[3] - hy
  const nl = Math.hypot(nx, ny) || 1
  const ex = hx + (nx / nl) * L * 0.07, ey = hy + (ny / nl) * L * 0.07
  const ew = halfWidth(0.07) * L * 0.62
  if (L >= 13) {
    for (const s of [-1, 1]) {
      const px = Math.floor(ex - (ny / nl) * ew * s), py = Math.floor(ey + (nx / nl) * ew * s)
      if (px >= 0 && py >= 0 && px < w && py < h) {
        idx.push(py * w + px)
        col.push(pack(mix(KOI.eye, WATER_TINT, tint * 0.6), 255))
      }
    }
  }
  return { idx, col }
}

/** Where a fish's head is, for the ripples it leaves. */
export const headOf = (k: Koi) => ({ x: k.x, y: k.y })

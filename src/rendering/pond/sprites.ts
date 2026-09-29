import {
  BAMBOO, BARK, BLOSSOM, GROUND, LANTERN_GLOW, LEAF, LOTUS, LOTUS_HEART, MOSS, PAD, RIPPLE, SHADOW, STONE,
} from './palette'
import { PixelCanvas, bayer, clamp, fbm, noise, ramp, rng, scale, white, type RGB } from './pixels'

/**
 * Procedural pixel sprites for the pond, lit from the upper left like the rest
 * of the scene. Each draws into a PixelCanvas at a given centre; sprites that
 * move (pads, bamboo) are drawn into their own small canvases.
 */

const LIGHT = (() => {
  const v = [-0.55, -0.7, 0.46]
  const l = Math.hypot(v[0], v[1], v[2])
  return v.map((c) => c / l) as [number, number, number]
})()

const wrap = (a: number) => {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}

/** A mossy boulder at the water's edge: a contact shadow on the water, a thin line of foam, then the stone. */
export function drawRock(pc: PixelCanvas, cx: number, cy: number, rx: number, ry: number, seed: number, mossy = 0.55) {
  const edge = (x: number, y: number) => {
    const a = Math.atan2(y / ry, x / rx)
    return 1 + (fbm(Math.cos(a) * 1.4 + 5, Math.sin(a) * 1.4 + 5, seed, 3) - 0.5) * 0.55
  }
  const pad = 5
  const x0 = Math.floor(-rx - pad), x1 = Math.ceil(rx + pad), y0 = Math.floor(-ry - pad), y1 = Math.ceil(ry + pad)
  const inside = (x: number, y: number) => Math.hypot(x / rx, y / ry) / edge(x, y)
  // Water around the stone: shadow cast down-right, foam along the waterline.
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = inside(x, y)
      if (d <= 1) continue
      const px = cx + x, py = cy + y
      if (inside(x - 2, y - 3) <= 1) pc.put(px, py, SHADOW, 105)
      else if (inside(x - 1, y - 1.5) <= 1) pc.put(px, py, SHADOW, 60)
      if (d < 1 + 1.6 / Math.min(rx, ry) && white(px, py, seed) > 0.25) pc.put(px, py, RIPPLE, y > 0 ? 95 : 55)
    }
  }
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const e = edge(x, y)
      const d = Math.hypot(x / rx, y / ry) / e
      if (d > 1) continue
      const px = cx + x, py = cy + y
      const nx = x / rx / e, ny = y / ry / e
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) * 0.9
      const diff = clamp(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2])
      const tex = fbm(px * 0.22, py * 0.22, seed + 3, 3)
      // Facets: a coarse noise quantised by the ramp gives chiselled planes.
      const facet = noise(px * 0.12, py * 0.12, seed + 9)
      let v = 0.08 + diff * 0.7 + (tex - 0.5) * 0.35 + (facet - 0.5) * 0.18
      if (d > 0.9 && (nx + ny > 0)) v -= 0.25
      const mossHere = ny < 0.25 - nx * 0.2 && fbm(px * 0.18, py * 0.18, seed + 17, 3) > 0.62 - mossy * 0.3 && d < 0.94
      const c = mossHere ? ramp(MOSS, v + 0.1, px, py) : ramp(STONE, v, px, py)
      pc.put(px, py, d > 0.965 ? STONE[0] : c)
    }
  }
}

/** The bank behind the stones: dark earth under moss and grass, wet and dark where it meets the water. */
export function drawGround(pc: PixelCanvas, cx: number, cy: number, r: number, seed: number) {
  const x0 = Math.floor(cx - r * 1.2), x1 = Math.ceil(cx + r * 1.2), y0 = Math.floor(cy - r * 1.2), y1 = Math.ceil(cy + r * 1.2)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy
      const a = Math.atan2(dy, dx)
      const e = r * (0.86 + 0.28 * fbm(Math.cos(a) * 1.8 + 3, Math.sin(a) * 1.8 + 3, seed, 3))
      const d = Math.hypot(dx, dy)
      if (d > e + 3) continue
      if (d > e) {
        pc.put(x, y, SHADOW, 90)
        continue
      }
      const tex = fbm(x * 0.2, y * 0.2, seed + 4, 3)
      const grass = fbm(x * 0.09, y * 0.09, seed + 8, 3)
      const rim = d > e - 2
      let c: RGB
      if (rim) c = GROUND[0]
      else if (grass > 0.52) c = ramp(MOSS, (grass - 0.5) * 1.6 + (tex - 0.5) * 0.6 + 0.1, x, y)
      else c = ramp(GROUND, tex * 1.1, x, y)
      // Blades of grass: short light strokes scattered over the moss.
      if (!rim && grass > 0.55 && white(x, y, seed) > 0.93) c = MOSS[5]
      pc.put(x, y, c)
    }
  }
}

/** A tuft of reeds or grass seen from above: blades fanning from one point. */
export function drawTuft(pc: PixelCanvas, cx: number, cy: number, size: number, seed: number) {
  const R = rng(seed)
  const blades = 5 + Math.floor(R() * 5)
  for (let b = 0; b < blades; b++) {
    const a = -Math.PI / 2 + (R() - 0.5) * 2.4
    const len = size * (0.6 + R() * 0.6)
    const bend = (R() - 0.5) * 0.6
    const col = LEAF[2 + Math.floor(R() * 4)]
    for (let t = 0; t < len; t += 0.6) {
      const k = t / len
      const ang = a + bend * k
      const x = cx + Math.cos(ang) * t, y = cy + Math.sin(ang) * t
      pc.put(x, y, k > 0.8 ? scale(col, 1.15) : col)
    }
  }
}

/** A lily pad in its own canvas: a notched disc with radial veins, a curled rim and a soft shadow. */
export function padSprite(r: number, seed: number): PixelCanvas {
  const size = Math.ceil(r * 2) + 7
  const pc = new PixelCanvas(size, size)
  const c = Math.floor(size / 2) - 1
  const R = rng(seed)
  const notch = R() * Math.PI * 2
  const hue = R() * 0.12 - 0.04
  const shape = (x: number, y: number) => {
    const d = Math.hypot(x, y)
    const a = Math.atan2(y, x)
    const e = r * (0.95 + 0.08 * noise(Math.cos(a) * 2 + 4, Math.sin(a) * 2 + 4, seed))
    const inNotch = Math.abs(wrap(a - notch)) < 0.26 && d > r * 0.1
    return { d: d / e, a, inside: d <= e && !inNotch }
  }
  for (let y = -c; y < size - c; y++)
    for (let x = -c; x < size - c; x++) if (!shape(x, y).inside && shape(x - 1, y - 2).inside) pc.put(c + x, c + y, SHADOW, 95)
  for (let y = -c; y < size - c; y++) {
    for (let x = -c; x < size - c; x++) {
      const s = shape(x, y)
      if (!s.inside) continue
      const lightSide = (-x - y) / (r * 1.4)
      let v = 0.5 + lightSide * 0.18 + (noise(x * 0.35, y * 0.35, seed + 2) - 0.5) * 0.22 + hue
      const vein = Math.abs(wrap((s.a - notch) * 9) ) < 0.55 && s.d > 0.2 && s.d < 0.85
      if (vein) v += 0.14
      if (s.d > 0.84) v += lightSide > 0 ? 0.22 : -0.2
      if (s.d < 0.12) v += 0.25
      const col = s.d > 0.97 ? PAD[0] : ramp(PAD, v, x + c, y + c)
      pc.put(c + x, c + y, col)
    }
  }
  return pc.flush()
}

/** A lotus flower opened flat on the water, seen from above: two rings of petals round a golden heart. */
export function lotusSprite(r: number, seed: number): PixelCanvas {
  const size = Math.ceil(r * 2) + 6
  const pc = new PixelCanvas(size, size)
  const c = Math.floor(size / 2)
  const rot = rng(seed)() * Math.PI
  const petal = (a: number, k: number) => 0.55 + 0.45 * Math.pow(Math.abs(Math.cos(4 * a)), 0.55) * k
  for (let y = -c; y < size - c; y++) {
    for (let x = -c; x < size - c; x++) {
      const d = Math.hypot(x, y) / r
      const a = Math.atan2(y, x)
      const outer = petal(a + rot, 1)
      const inner = petal(a + rot + Math.PI / 8, 1) * 0.66
      const lit = (-x - y) / (r * 2.2)
      let col: RGB | null = null
      if (d < 0.27) {
        col = ramp(LOTUS_HEART, 0.5 + lit + (white(x, y, seed) > 0.7 ? 0.35 : 0), x, y)
      } else if (d < inner) {
        const k = d / inner
        col = ramp(LOTUS, 0.95 - k * 0.35 + lit * 0.4, x, y)
        if (Math.abs(Math.cos(4 * (a + rot + Math.PI / 8))) < 0.2) col = LOTUS[2]
      } else if (d < outer) {
        const k = d / outer
        col = ramp(LOTUS, 0.85 - k * 0.6 + lit * 0.4, x, y)
        if (Math.abs(Math.cos(4 * (a + rot))) < 0.18) col = LOTUS[1]
      } else if (Math.hypot(x - 1, y - 2) / r < petal(Math.atan2(y - 2, x - 1) + rot, 1)) {
        pc.put(c + x, c + y, SHADOW, 90)
      }
      if (col) pc.put(c + x, c + y, col)
    }
  }
  return pc.flush()
}

/** A closed lotus bud lying on its pad. */
export function drawBud(pc: PixelCanvas, cx: number, cy: number, len: number, angle: number) {
  const ca = Math.cos(angle), sa = Math.sin(angle)
  for (let t = 0; t <= len; t += 0.5) {
    const k = t / len
    const w = Math.sin(Math.PI * Math.min(1, k * 1.25)) * len * 0.3
    for (let s = -w; s <= w; s += 0.5) {
      const x = cx + ca * t - sa * s, y = cy + sa * t + ca * s
      const col = k < 0.2 ? LEAF[3] : ramp(LOTUS, 0.35 + k * 0.5 - s / (len * 0.6), Math.round(x), Math.round(y))
      pc.put(x, y, col)
    }
  }
}

/** One lance-shaped leaf with a lighter midrib. */
function drawLeaf(pc: PixelCanvas, x0: number, y0: number, angle: number, len: number, width: number, pal: readonly RGB[], lit: number) {
  const ca = Math.cos(angle), sa = Math.sin(angle)
  for (let t = 0; t <= len; t += 0.45) {
    const k = t / len
    const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.08)), 0.75)
    for (let s = -w; s <= w; s += 0.45) {
      const x = x0 + ca * t - sa * s, y = y0 + sa * t + ca * s
      const edge = Math.abs(s) > w - 0.6
      const v = 0.45 + lit * 0.3 + (s < 0 ? 0.12 : -0.08) + (Math.abs(s) < 0.4 ? 0.18 : 0) - (edge ? 0.2 : 0)
      pc.put(x, y, ramp(pal, v, Math.round(x), Math.round(y)))
    }
  }
}

export interface BambooSpec {
  /** Where the stalks rise from (often off-screen) and the direction they lean. */
  x: number
  y: number
  angle: number
  height: number
  seed: number
}

/**
 * A stand of bamboo leaning in from the bank, rendered as a few sway frames:
 * the leaves turn a little about their twigs from frame to frame. Returns the frames and where to draw them.
 */
export function bambooFrames(spec: BambooSpec, frames = 5): { canvases: HTMLCanvasElement[]; x: number; y: number } {
  const R0 = rng(spec.seed)
  const stalks = Array.from({ length: 2 + Math.floor(R0() * 2) }, () => ({
    off: (R0() - 0.5) * spec.height * 0.25,
    angle: spec.angle + (R0() - 0.5) * 0.35,
    len: spec.height * (0.7 + R0() * 0.35),
    width: 1.5 + R0() * 1.2,
  }))
  const pad = spec.height * 0.45
  const minX = Math.floor(spec.x - spec.height - pad), minY = Math.floor(spec.y - spec.height - pad)
  const size = Math.ceil((spec.height + pad) * 2)
  const canvases: HTMLCanvasElement[] = []
  for (let f = 0; f < frames; f++) {
    const sway = (f / (frames - 1) - 0.5) * 0.16
    const pc = new PixelCanvas(size, size)
    const R = rng(spec.seed + 7)
    for (const st of stalks) {
      const bx = spec.x - minX + Math.cos(st.angle + Math.PI / 2) * st.off
      const by = spec.y - minY + Math.sin(st.angle + Math.PI / 2) * st.off
      const a = st.angle + sway * 0.25
      const ca = Math.cos(a), sa = Math.sin(a)
      // The culm, with a highlight down one side and a node ring every so often.
      for (let t = 0; t < st.len; t += 0.5) {
        const node = (t + 40 + st.off) % 11 < 0.8
        for (let s = -st.width; s <= st.width; s += 0.5) {
          const x = bx + ca * t - sa * s, y = by + sa * t + ca * s
          const v = node ? 0.2 : 0.45 - s / st.width * 0.3
          pc.put(x, y, ramp(BAMBOO, v, Math.round(x), Math.round(y)))
        }
      }
      // Twigs with sprays of leaves along the upper culm.
      const sprays = 3 + Math.floor(R() * 3)
      for (let i = 0; i < sprays; i++) {
        const t = st.len * (0.35 + 0.65 * (i + R() * 0.5) / sprays)
        const tx = bx + ca * t, ty = by + sa * t
        const leaves = 3 + Math.floor(R() * 3)
        const side = i % 2 ? 1 : -1
        for (let l = 0; l < leaves; l++) {
          const la = a + side * (0.5 + R() * 0.9) + (l - leaves / 2) * 0.35 + sway * (1 + l * 0.3)
          drawLeaf(pc, tx, ty, la, spec.height * (0.16 + R() * 0.1), 1.2 + R() * 0.9, BAMBOO, R() - 0.3)
        }
      }
    }
    canvases.push(pc.flush().canvas)
  }
  return { canvases, x: minX, y: minY }
}

/** A flowering shrub on the bank (plum / cherry): dark foliage starred with pale blossoms. */
export function drawBlossomShrub(pc: PixelCanvas, cx: number, cy: number, r: number, seed: number): { x: number; y: number }[] {
  const R = rng(seed)
  // Foliage: a few overlapping leafy lobes.
  const lobes = 4 + Math.floor(R() * 3)
  for (let i = 0; i < lobes; i++) {
    const a = R() * Math.PI * 2, d = R() * r * 0.45
    const lx = cx + Math.cos(a) * d, ly = cy + Math.sin(a) * d, lr = r * (0.4 + R() * 0.3)
    for (let y = -lr; y <= lr; y++) {
      for (let x = -lr; x <= lr; x++) {
        const k = Math.hypot(x, y) / lr
        const e = 0.8 + 0.3 * noise((lx + x) * 0.3, (ly + y) * 0.3, seed + i)
        if (k > e) continue
        const v = 0.35 + (-x - y) / lr * 0.2 + (noise((lx + x) * 0.5, (ly + y) * 0.5, seed) - 0.5) * 0.5
        pc.put(lx + x, ly + y, ramp(LEAF, v, Math.round(lx + x), Math.round(ly + y)))
      }
    }
  }
  // Blossoms: five-pixel stars, a darker heart.
  const flowers: { x: number; y: number }[] = []
  const n = Math.round(r * r * 0.08)
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r * 0.85
    const fx = Math.round(cx + Math.cos(a) * d), fy = Math.round(cy + Math.sin(a) * d)
    const tone = R() > 0.5 ? 2 : 3
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) pc.put(fx + dx, fy + dy, BLOSSOM[tone])
    pc.put(fx, fy, R() > 0.5 ? BLOSSOM[0] : LOTUS_HEART[1])
    flowers.push({ x: fx, y: fy })
  }
  return flowers
}

/**
 * A stone lantern (石燈籠) on the bank: plinth, post, a lit chamber and a pagoda roof.
 * `u` is its pixel unit. Returns the centre of the glowing window.
 */
export function drawLantern(pc: PixelCanvas, cx: number, baseY: number, u: number): { x: number; y: number } {
  // Rows from the ground up: [width, height, kind] in units.
  const rows: [number, number, 'stone' | 'dark' | 'window' | 'roof'][] = [
    [8, 1, 'dark'], [7, 1, 'stone'], [3, 3, 'stone'], [7, 1, 'stone'], [6, 3, 'window'], [7, 1, 'stone'],
    [11, 1, 'roof'], [9, 1, 'roof'], [7, 1, 'roof'], [4, 1, 'roof'], [2, 1, 'stone'], [1, 1, 'stone'],
  ]
  // A shadow on the ground, cast down-right.
  for (let y = 0; y < 3 * u; y++) for (let x = -4 * u; x < 7 * u; x++) pc.put(cx + x + 2 * u, baseY - y + 2 * u, SHADOW, 80)
  let y = baseY
  let glow = { x: cx, y: baseY }
  for (const [w, h, kind] of rows) {
    const half = (w * u) / 2
    for (let j = 0; j < h * u; j++) {
      y--
      for (let x = -half; x < half; x++) {
        const k = (x + half) / (w * u)
        const px = Math.round(cx + x), py = y
        let col: RGB
        if (kind === 'window' && k > 0.2 && k < 0.8 && j > 0 && j < h * u - 1) {
          col = LANTERN_GLOW
          glow = { x: cx, y: py }
        } else if (kind === 'roof') col = ramp(STONE, 0.75 - k * 0.55 + (j === 0 ? -0.2 : 0), px, py)
        else if (kind === 'dark') col = STONE[1]
        else col = ramp(STONE, 0.7 - k * 0.5, px, py)
        if (k < 0.08 || k > 0.92) col = scale(col, 0.8)
        pc.put(px, py, col)
      }
    }
  }
  // Moss creeping up the plinth.
  for (let i = 0; i < 6 * u; i++) pc.put(cx - 4 * u + Math.floor(white(i, 3, u) * 8 * u), baseY - 1 - Math.floor(white(i, 9, u) * 2 * u), MOSS[3])
  return glow
}

/** A large lotus leaf close to the eye, for the foreground (blurred by CSS). */
export function drawBigLeaf(pc: PixelCanvas, cx: number, cy: number, r: number, seed: number) {
  const notch = rng(seed)() * Math.PI * 2
  for (let y = -r - 2; y <= r + 2; y++) {
    for (let x = -r - 2; x <= r + 2; x++) {
      const d = Math.hypot(x, y)
      const a = Math.atan2(y, x)
      const e = r * (0.93 + 0.1 * noise(Math.cos(a) * 3, Math.sin(a) * 3, seed))
      if (d > e || (Math.abs(wrap(a - notch)) < 0.2 && d > r * 0.08)) continue
      const k = d / e
      const vein = Math.abs(wrap((a - notch) * 11)) < 0.4 && k > 0.12
      const cup = 1 - Math.abs(k - 0.55) * 1.2
      let v = 0.35 + cup * 0.25 + (-x - y) / r * 0.15 + (vein ? 0.12 : 0)
      if (k > 0.9) v -= 0.18
      pc.put(cx + x, cy + y, ramp(LEAF, v, cx + x, cy + y))
    }
  }
}

/** A flowering branch reaching in from the frame, for the foreground. */
export function drawBlossomBranch(pc: PixelCanvas, x0: number, y0: number, angle: number, len: number, seed: number) {
  const R = rng(seed)
  const branch = (x: number, y: number, a: number, l: number, w: number, depth: number) => {
    let px = x, py = y
    for (let t = 0; t < l; t += 0.5) {
      a += (R() - 0.5) * 0.08
      px += Math.cos(a) * 0.5
      py += Math.sin(a) * 0.5
      const ww = w * (1 - (t / l) * 0.6)
      for (let s = -ww; s <= ww; s += 0.5) pc.put(px - Math.sin(a) * s, py + Math.cos(a) * s, BARK[s < 0 ? 2 : 1])
      if (depth < 2 && R() < 0.035) branch(px, py, a + (R() > 0.5 ? 0.7 : -0.7), l * 0.45, ww * 0.7, depth + 1)
      if (t > l * 0.25 && R() < 0.22) {
        const fx = px + (R() - 0.5) * 6, fy = py + (R() - 0.5) * 6
        const fr = 1.2 + R() * 1.4
        for (let yy = -fr - 1; yy <= fr + 1; yy++)
          for (let xx = -fr - 1; xx <= fr + 1; xx++) {
            const k = Math.hypot(xx, yy) / fr
            if (k > 1.15) continue
            const col = k < 0.35 ? LOTUS_HEART[1] : ramp(BLOSSOM, 0.9 - k * 0.5 + bayer(xx & 3, yy & 3) * 0.1, fx + xx, fy + yy)
            pc.put(fx + xx, fy + yy, col)
          }
      }
    }
  }
  branch(x0, y0, angle, len, 1.8, 0)
}

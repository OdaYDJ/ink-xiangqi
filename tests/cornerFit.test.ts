import { describe, expect, it } from 'vitest'
import { fitCorner, type Box } from '../src/rendering/cornerFit'

const box = (left: number, top: number, right: number, bottom: number): Box => ({ left, top, right, bottom })
const overlaps = (vw: number, w: number, h: number, r: Box, gap = 0) => r.right > vw - w - gap && r.top < h + gap

describe('fitCorner', () => {
  const aspect = 1.6

  it('grows with the window when nothing is in the way', () => {
    const small = fitCorner({ viewportWidth: 800, viewportHeight: 600, aspect, avoid: [] })
    const large = fitCorner({ viewportWidth: 1600, viewportHeight: 1000, aspect, avoid: [] })
    expect(large.width).toBeGreaterThan(small.width)
    expect(large.width).toBeLessThanOrEqual(480)
  })

  it('follows the smaller dimension on wide, short windows', () => {
    const wideShort = fitCorner({ viewportWidth: 2400, viewportHeight: 500, aspect, avoid: [] })
    expect(wideShort.height).toBeLessThanOrEqual(500 * 0.46 + 0.01)
  })

  it('never covers content it can avoid', () => {
    const cases = [
      { vw: 1440, vh: 900, avoid: [box(800, 200, 1080, 700)] },
      { vw: 1280, vh: 720, avoid: [box(760, 150, 1180, 650)] },
      { vw: 1024, vh: 768, avoid: [box(300, 60, 900, 740)] },
    ]
    for (const { vw, vh, avoid } of cases) {
      const f = fitCorner({ viewportWidth: vw, viewportHeight: vh, aspect, avoid })
      if (f.crowded) continue
      for (const r of avoid) expect(overlaps(vw, f.width, f.height, r)).toBe(false)
    }
  })

  it('shrinks toward the minimum and reports crowding when there is no room', () => {
    const f = fitCorner({ viewportWidth: 390, viewportHeight: 844, aspect, avoid: [box(10, 20, 380, 820)] })
    expect(f.width).toBe(120)
    expect(f.crowded).toBe(true)
  })

  it('applies a final scale for a lighter accent', () => {
    const full = fitCorner({ viewportWidth: 1440, viewportHeight: 900, aspect, avoid: [] })
    const lighter = fitCorner({ viewportWidth: 1440, viewportHeight: 900, aspect, avoid: [], scale: 0.9 })
    expect(lighter.width).toBeCloseTo(full.width * 0.9)
  })
})

import { useEffect, useMemo, useState, type CSSProperties, type RefObject } from 'react'
import { COLS, ROWS } from '../game/board'
import { createRng } from '../game/randomizer'
import { SOLDIER_COLS } from '../game/validator'
import { MARGIN, WIDTH, pointX, pointY } from '../rendering/boardRenderer'
import { PIECE_RADIUS } from '../rendering/pieceRenderer'
import { PIXEL_GLYPHS } from '../rendering/pixelGlyphs'

/**
 * V3 board parts: the lacquer and bronze materials, the inlaid bronze grid,
 * and the water's answer to each move. The wooden frame itself is a pixel-art
 * canvas behind the SVG (see CarvedPanel).
 */

const L = (x0: number, y0: number, x1: number, y1: number) => `M${x0} ${y0}L${x1} ${y1}`

const GRID = (() => {
  const d: string[] = []
  for (let r = 0; r < ROWS; r++) d.push(L(pointX(0), pointY(r), pointX(COLS - 1), pointY(r)))
  for (let c = 0; c < COLS; c++) {
    if (c === 0 || c === COLS - 1) d.push(L(pointX(c), pointY(0), pointX(c), pointY(ROWS - 1)))
    else d.push(L(pointX(c), pointY(0), pointX(c), pointY(4)), L(pointX(c), pointY(5), pointX(c), pointY(ROWS - 1)))
  }
  return d.join('')
})()

const PALACE = [[0, 2], [7, 9]]
  .map(([a, b]) => L(pointX(3), pointY(a), pointX(5), pointY(b)) + L(pointX(5), pointY(a), pointX(3), pointY(b)))
  .join('')

/** Corner brackets on the cannon and soldier points. */
const MARKERS = (() => {
  const points: [number, number][] = []
  for (const r of [3, 6]) for (const c of SOLDIER_COLS) points.push([r, c])
  for (const r of [2, 7]) for (const c of [1, 7]) points.push([r, c])
  const gap = 4.5, arm = 9
  const d: string[] = []
  for (const [r, c] of points) {
    const x = pointX(c), y = pointY(r)
    for (const sx of [-1, 1]) {
      if ((sx < 0 && c === 0) || (sx > 0 && c === COLS - 1)) continue
      for (const sy of [-1, 1]) d.push(`M${x + sx * (gap + arm)} ${y + sy * gap}H${x + sx * gap}V${y + sy * (gap + arm)}`)
    }
  }
  return d.join('')
})()

const BORDER = 9
const OUTER = `M${MARGIN - BORDER} ${MARGIN - BORDER}H${pointX(COLS - 1) + BORDER}V${pointY(ROWS - 1) + BORDER}H${MARGIN - BORDER}Z`

/** 雲紋: a cloud scroll between 楚河 and 漢界. */
const CLOUD =
  'M-4 0C-4 -7 -16 -7 -16 0C-16 5 -9 6 -9 1C-9 -2 -12 -2 -12 0' +
  'M4 0C4 7 16 7 16 0C16 -5 9 -6 9 -1C9 2 12 2 12 0' +
  'M-4 0H4M-16 0H-27M16 0H27M-31 0h1M30 0h1'

const RIVER_Y = (pointY(4) + pointY(5)) / 2
/** River lettering: each character's distance from its word's centre. */
const RIVER_CHAR_GAP = 22

/** Board units per pixel of the 12 px pixel glyphs, by design, and the range the snapped size may take. */
export const GLYPH_PX = 2.5
const GLYPH_PX_RANGE: [number, number] = [2.15, 3.2]

/**
 * The glyph scale for the board as it is drawn now: as near GLYPH_PX as possible while one pixel of
 * the font covers a whole number of screen pixels. Then every stroke of every character is exactly
 * as wide as every other, instead of some rounding to 2 screen pixels and some to 3, which blurs
 * dense characters (象, 傌, 將). Re-measured when the board resizes and on browser zoom.
 */
export function useGlyphScale(ref: RefObject<SVGSVGElement | null>): number {
  const [scale, setScale] = useState(GLYPH_PX)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const devicePerUnit = (el.getBoundingClientRect().width / WIDTH) * (window.devicePixelRatio || 1)
      if (!devicePerUnit) return
      const ideal = GLYPH_PX * devicePerUnit
      const fits = [Math.floor(ideal), Math.ceil(ideal)]
        .filter((k) => k >= 1)
        .map((k) => k / devicePerUnit)
        .filter((s) => s >= GLYPH_PX_RANGE[0] && s <= GLYPH_PX_RANGE[1])
        .sort((a, b) => Math.abs(a - GLYPH_PX) - Math.abs(b - GLYPH_PX))
      const next = fits[0] ?? GLYPH_PX
      setScale((prev) => (Math.abs(prev - next) < 1e-4 ? prev : next))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    // Browser zoom and moving to a screen of another density change devicePixelRatio: both fire resize.
    window.addEventListener('resize', measure)
    measure()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref])
  return scale
}

export function LacquerDefs() {
  return (
    <>
      <radialGradient id="v3-red" cx="0.36" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#c85a40" />
        <stop offset="0.55" stopColor="#9c2f22" />
        <stop offset="1" stopColor="#661a13" />
      </radialGradient>
      <radialGradient id="v3-black" cx="0.36" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#3b4240" />
        <stop offset="0.55" stopColor="#1b2020" />
        <stop offset="1" stopColor="#0a0c0c" />
      </radialGradient>
      {/* Lettering: bright, nearly flat golds, so the lower strokes stay as legible as the upper ones. */}
      <linearGradient id="v3-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff2c8" />
        <stop offset="0.55" stopColor="#f3d690" />
        <stop offset="1" stopColor="#e2bc70" />
      </linearGradient>
      <linearGradient id="v3-bronze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4e0aa" />
        <stop offset="0.55" stopColor="#dfc182" />
        <stop offset="1" stopColor="#c8a462" />
      </linearGradient>
      <radialGradient id="v3-sheen">
        <stop offset="0" stopColor="#fff8e6" stopOpacity="0.26" />
        <stop offset="1" stopColor="#fff8e6" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="v3-halo">
        <stop offset="0.5" stopColor="#f2d58e" stopOpacity="0.32" />
        <stop offset="1" stopColor="#f2d58e" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="v3-flash">
        <stop offset="0" stopColor="#e9f7ea" stopOpacity="0.5" />
        <stop offset="1" stopColor="#e9f7ea" stopOpacity="0" />
      </radialGradient>
      <filter id="v3-glow" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="1.8" />
      </filter>
      <filter id="v3-soft" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.4" />
      </filter>
    </>
  )
}

/** The grid, inlaid in bronze: a soft glow beneath, an engraved shadow, then the metal line. */
export function BronzeGrid({ glyphPx = GLYPH_PX }: { glyphPx?: number }) {
  const layer = (d: string, cls: string) => (
    <>
      <path className={`v3-grid__glow ${cls}`} d={d} filter="url(#v3-glow)" />
      <path className={`v3-grid__cut ${cls}`} d={d} transform="translate(0.8 1.1)" />
      <path className={`v3-grid__line ${cls}`} d={d} />
    </>
  )
  return (
    <g className="board__ink v3-grid">
      <rect className="v3-river" x={pointX(0)} y={pointY(4)} width={pointX(COLS - 1) - pointX(0)} height={pointY(5) - pointY(4)} />
      {layer(OUTER, 'v3-grid--outer')}
      {layer(GRID, '')}
      {layer(PALACE, 'v3-grid--palace')}
      {layer(MARKERS, 'v3-grid--marker')}
      <g className="v3-river__words" aria-hidden="true">
        {/* 楚河 漢界 in the same pixel script as the pieces, each character centred on its own point. */}
        {([[2, '楚河'], [6, '漢界']] as const).flatMap(([c, w]) =>
          [...w].map((ch, i) => {
            const x = pointX(c) + (i ? 1 : -1) * RIVER_CHAR_GAP
            return (
              <g key={ch} transform={`translate(${x} ${RIVER_Y})`}>
                {/* Light lettering: single-pixel strokes with no shadow, in a pale, translucent gold. */}
                <path className="v3-river__text" d={PIXEL_GLYPHS[ch]} transform={`scale(${glyphPx})`} />
              </g>
            )
          }),
        )}
        <g transform={`translate(${pointX(4)} ${RIVER_Y})`}>
          <path className="v3-cloud v3-grid__cut" d={CLOUD} transform="translate(0.7 1)" />
          <path className="v3-cloud v3-grid__line" d={CLOUD} />
        </g>
      </g>
    </g>
  )
}

interface Mote { dx: number; dy: number; delay: number; size: number; tone: 'gold' | 'jade' }

/** A move answered by the water: rings spread from the landing point, a pale flash, and a few glowing motes drift up and away. */
export function usePondFx(key: number, capture: boolean) {
  return useMemo(() => {
    if (!key) return null
    const rand = createRng(`pond-fx-${key}-${capture}`)
    const count = capture ? 14 : 7
    const motes: Mote[] = Array.from({ length: count }, () => {
      const a = rand() * Math.PI * 2
      const d = PIECE_RADIUS * (capture ? 1.1 + rand() * 1.1 : 0.9 + rand() * 0.6)
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d - rand() * 10, delay: Math.round(rand() * 160), size: 1.6 + rand() * 1.8, tone: rand() < 0.6 ? 'gold' : 'jade' }
    })
    const drops = capture
      ? Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + rand() * 0.5
          const d = PIECE_RADIUS * (1.5 + rand() * 0.7)
          return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, delay: Math.round(rand() * 60) }
        })
      : []
    return { motes, drops }
  }, [key, capture])
}

type Fx = NonNullable<ReturnType<typeof usePondFx>>

export function PondFxUnder({ at, from, capture, style }: { at: { x: number; y: number }; from: { x: number; y: number }; capture: boolean; style?: CSSProperties }) {
  const R = PIECE_RADIUS
  return (
    <g className={`v3fx${capture ? ' v3fx--capture' : ''}`} style={style} aria-hidden="true">
      <path className="v3fx-wake" d={L(from.x, from.y, at.x, at.y)} pathLength={1} />
      <g transform={`translate(${at.x} ${at.y})`}>
        <circle className="v3fx-flash" r={R * (capture ? 2.1 : 1.6)} fill="url(#v3-flash)" />
        {Array.from({ length: capture ? 3 : 2 }, (_, i) => (
          <circle key={i} className="v3fx-ring" r={R} style={{ animationDelay: `calc(var(--fx-land) + ${i * 170}ms)` }} />
        ))}
      </g>
    </g>
  )
}

export function PondFxOver({ fx, at, capture, style }: { fx: Fx; at: { x: number; y: number }; capture: boolean; style?: CSSProperties }) {
  return (
    <g className={`v3fx${capture ? ' v3fx--capture' : ''}`} style={style} aria-hidden="true">
      <g transform={`translate(${at.x} ${at.y})`}>
        {fx.drops.map((d, i) => (
          <circle
            key={`d${i}`}
            className="v3fx-drop"
            r={1.7}
            style={{ '--dx': `${d.dx.toFixed(1)}px`, '--dy': `${d.dy.toFixed(1)}px`, animationDelay: `calc(var(--fx-land) + ${d.delay}ms)` } as CSSProperties}
          />
        ))}
        {fx.motes.map((m, i) => (
          <rect
            key={i}
            className={`v3fx-mote v3fx-mote--${m.tone}`}
            x={-m.size / 2}
            y={-m.size / 2}
            width={m.size}
            height={m.size}
            style={{ '--dx': `${m.dx.toFixed(1)}px`, '--dy': `${m.dy.toFixed(1)}px`, animationDelay: `calc(var(--fx-land) + ${m.delay}ms)` } as CSSProperties}
          />
        ))}
      </g>
    </g>
  )
}

import { useId } from 'react'
import { PIXEL_GLYPHS } from '../rendering/pixelGlyphs'
import { SEAL_GLYPHS } from '../rendering/sealGlyphs'

interface SealProps {
  /** One, two or four characters. Two are stacked vertically; four read right-to-left in two columns (or one column, with layout="column"). */
  text: string
  /** Rendered height in CSS pixels. */
  size?: number
  /** 'carved' (白文): paper-coloured characters cut into cinnabar. 'raised' (朱文): cinnabar characters and border. */
  variant?: 'carved' | 'raised'
  className?: string
  title?: string
  /**
   * 'type': set in the Song typeface. 'outline': drawn from the outlines in SEAL_GLYPHS
   * (when it has every character), each centred on its exact ink, with a fine border to match.
   * 'pixel': one character from PIXEL_GLYPHS, drawn crisp on the pixel grid (V3).
   */
  script?: 'type' | 'outline' | 'pixel'
  /** For outlined seals: 'column' sets every character in one vertical line, read top to bottom. */
  layout?: 'grid' | 'column'
}

/** Outlined seals: border stroke, its inset, the space between border and characters, and one character's size, in stamp units. */
const FINE = { border: 3, inset: 4, pad: 3.4, glyph: 17 }

/** Height (px) of the game's 棋 seal: outlined seals copy its texture as it appears on screen. */
const TEXTURE_SIZE = 30

/** Centres of the character cells: the inner area split evenly, so the text block sits exactly in the middle. */
const cellCentres = (count: number, from: number, to: number) =>
  Array.from({ length: count }, (_, i) => from + ((to - from) * (i + 0.5)) / count)

/**
 * A cinnabar seal impression with slightly irregular edges and patchy,
 * imperfect stamping. Every instance gets its own noise seed.
 */
export default function Seal({ text, size = 48, variant = 'carved', className = '', title, script = 'type', layout = 'grid' }: SealProps) {
  const id = 'seal' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const chars = [...text]
  if (script === 'pixel' && chars.length === 1 && chars[0] in PIXEL_GLYPHS) {
    return <PixelSeal char={chars[0]} size={size} variant={variant} className={className} title={title} />
  }
  const seed = chars.reduce((s, c) => s + c.charCodeAt(0), 0) % 97
  const outline = script === 'outline' && chars.every((c) => c in SEAL_GLYPHS) && chars.length !== 3
  const column = outline && (layout === 'column' || chars.length === 2)

  const edge = outline ? FINE.inset + FINE.border / 2 : 0
  const w = column ? 2 * (edge + FINE.pad) + FINE.glyph : chars.length === 2 ? 62 : 100
  const h = 100
  const inset = outline ? FINE.inset : 5
  // Outlined seals scale their grain with their size, so the stamping looks as coarse as the small 棋 seal's.
  const k = outline ? size / TEXTURE_SIZE : 1

  // Glyph positions for typeset seals: [x, y, font size].
  const glyphs: [string, number, number, number][] =
    chars.length === 1
      ? [[chars[0], 50, 53, 70]]
      : chars.length === 2
        ? [[chars[0], 31, 29, 40], [chars[1], 31, 73, 40]]
        : [[chars[0], 73, 29, 40], [chars[1], 73, 73, 40], [chars[2], 27, 29, 40], [chars[3], 27, 73, 40]]

  return (
    <svg
      className={`seal seal--${variant} ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      width={(size * w) / h}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency={0.045 * k} numOctaves="2" seed={seed} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale={3.2 / k} result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency={0.55 * k} numOctaves="2" seed={seed + 3} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 3.9" result="holes" />
          <feComposite in="shape" in2="holes" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>
        {variant === 'carved' ? (
          <rect className="seal__ground" x="3" y="3" width={w - 6} height={h - 6} rx={4 / k} />
        ) : (
          <rect
            className="seal__border"
            x={inset} y={inset} width={w - 2 * inset} height={h - 2 * inset}
            rx={outline ? 1.5 : 3} fill="none" strokeWidth={outline ? FINE.border : 5}
          />
        )}
        {outline
          ? outlineLayout(chars, w, h, edge, column).map(({ c, x, y, scale }, i) => {
              const [x0, y0, x1, y1] = SEAL_GLYPHS[c].box
              // Put the centre of the ink, not of the em box, on the centre of the cell.
              const transform = `translate(${x} ${y}) scale(${scale}) translate(${-(x0 + x1) / 2} ${-(y0 + y1) / 2})`
              return <path key={i} className="seal__glyph" d={SEAL_GLYPHS[c].d} transform={transform} />
            })
          : glyphs.map(([c, x, y, fs]) => (
              <text key={`${c}${x}${y}`} className="seal__glyph" x={x} y={y} fontSize={fs} textAnchor="middle" dominantBaseline="central">
                {c}
              </text>
            ))}
      </g>
    </svg>
  )
}

/**
 * Cells for outlined characters, read in columns from right to left, top to bottom.
 * One scale for every character (set by the largest), so they keep their natural proportions.
 */
function outlineLayout(chars: string[], w: number, h: number, edge: number, column: boolean) {
  const rows = column ? chars.length : chars.length === 1 ? 1 : 2
  const cols = Math.ceil(chars.length / rows)
  const xs = cellCentres(cols, edge, w - edge).reverse()
  const ys = cellCentres(rows, edge, h - edge)
  const largest = Math.max(...chars.map((c) => {
    const [x0, y0, x1, y1] = SEAL_GLYPHS[c].box
    return Math.max(x1 - x0, y1 - y0)
  }))
  // A lone character keeps a wider margin of red around it, like a carved single-character seal.
  const fill = chars.length === 1 ? 0.8 : 1
  const cell = column ? FINE.glyph : (Math.min((w - 2 * edge) / cols, (h - 2 * edge) / rows) - 2 * FINE.pad) * fill
  const scale = cell / largest
  return chars.map((c, i) => ({ c, x: xs[Math.floor(i / rows)], y: ys[i % rows], scale }))
}

/** The pixel seal's grid: 17 pixels square, so an 11-pixel glyph sits inside a one-pixel border with a pixel of air all round. */
const GRID = 17
const P = 100 / GRID

/**
 * A seal drawn as pixel art, for V3: a square with its corner pixels knocked off, a one-pixel
 * border inset by a pixel, and the character from the pixel font, centred on its visual centre.
 * No ink texture: every edge falls on the grid, like the type around it.
 */
function PixelSeal({ char, size, variant, className, title }: { char: string; size: number; variant: 'carved' | 'raised'; className: string; title?: string }) {
  const a = P, b = 100 - P
  const ground = `M${a} 0H${b}V${a}H100V${b}H${b}V100H${a}V${b}H0V${a}H${a}Z`
  const ring = `M${a} ${a}H${b}V${b}H${a}Z M${2 * P} ${2 * P}V${100 - 2 * P}H${100 - 2 * P}V${2 * P}Z`
  return (
    <svg
      className={`seal seal--${variant} seal--pixel ${className}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {variant === 'carved' && <path className="seal__ground" d={ground} />}
      {/* The border takes the glyph's colour: paper cut into the red (carved), or red on paper (raised). */}
      <path className="seal__glyph" d={ring} fillRule="evenodd" />
      <path className="seal__glyph" d={PIXEL_GLYPHS[char]} transform={`translate(50 50) scale(${P})`} />
    </svg>
  )
}

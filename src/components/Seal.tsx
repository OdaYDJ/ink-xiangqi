import { useId } from 'react'

interface SealProps {
  /** One, two or four characters. Two are stacked vertically; four read right-to-left in two columns. */
  text: string
  /** Rendered height in CSS pixels. */
  size?: number
  /** 'carved' (白文): paper-coloured characters cut into cinnabar. 'raised' (朱文): cinnabar characters and border. */
  variant?: 'carved' | 'raised'
  className?: string
  title?: string
}

/**
 * A cinnabar seal impression with slightly irregular edges and patchy,
 * imperfect stamping. Every instance gets its own noise seed.
 */
export default function Seal({ text, size = 48, variant = 'carved', className = '', title }: SealProps) {
  const id = 'seal' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const chars = [...text]
  const seed = chars.reduce((s, c) => s + c.charCodeAt(0), 0) % 97
  const tall = chars.length === 2
  const w = tall ? 62 : 100
  const h = 100

  // Glyph positions: [x, y, font size].
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
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed={seed} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.2" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed={seed + 3} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 3.9" result="holes" />
          <feComposite in="shape" in2="holes" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>
        {variant === 'carved' ? (
          <rect className="seal__ground" x="3" y="3" width={w - 6} height={h - 6} rx="4" />
        ) : (
          <rect className="seal__border" x="5" y="5" width={w - 10} height={h - 10} rx="3" fill="none" strokeWidth="5" />
        )}
        {glyphs.map(([c, x, y, fs]) => (
          <text key={`${c}${x}${y}`} className="seal__glyph" x={x} y={y} fontSize={fs} textAnchor="middle" dominantBaseline="central">
            {c}
          </text>
        ))}
      </g>
    </svg>
  )
}

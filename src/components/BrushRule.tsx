import { useId, useMemo } from 'react'
import { createRng } from '../game/randomizer'
import { brushOutline, smoothNoise, type Pt } from '../rendering/brush'

const HEIGHT = 22
const BASELINE = 11.5

/**
 * One horizontal brush stroke (橫畫), painted in three movements:
 *   起筆 — the brush lands at a slant, leaving a dense, angled head;
 *   行筆 — it travels along a faint arc, thinning slightly as ink is spent;
 *   收筆 — a small press, then the tip lifts away into a fine tail.
 * Ink thins from head to tail, and the last stretch breaks into dry-brush
 * streaks (飛白) where the brush ran short.
 */
function paintStroke(seed: string, width: number) {
  const rng = createRng(seed)
  const wobble = smoothNoise(rng, 5)
  const pulse = smoothNoise(rng, 7)
  const x0 = 9
  const x1 = width - 5

  // Centre line: rising slightly left to right (左低右高), a gentle bow, a tremor that vanishes
  // at the ends, and a small lift as the brush leaves the paper.
  const n = 48
  const spine: Pt[] = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const rise = 1.6 * (0.5 - t)
    const bow = -1.1 * Math.sin(Math.PI * t)
    const tremor = 0.35 * wobble(t) * Math.sin(Math.PI * t)
    const lift = t > 0.86 ? -1.6 * ((t - 0.86) / 0.14) ** 2 : 0
    return { x: x0 + (x1 - x0) * t, y: BASELINE + rise + bow + tremor + lift }
  })

  const profile = (t: number) => {
    const head = 1.5 * Math.exp(-(((t - 0.025) / 0.04) ** 2)) // the pressed landing
    const press = 0.45 * Math.exp(-(((t - 0.8) / 0.05) ** 2)) // brief press before lifting
    const travel = 3.4 - 1.0 * Math.sin(Math.PI * Math.min(1, t / 0.85)) // thins mid-stroke
    const exit = t > 0.8 ? 1 - 0.93 * ((t - 0.8) / 0.2) ** 1.5 : 1 // lifts to a fine tip
    return (travel + head + press) * exit * (1 + 0.1 * pulse(t))
  }

  // The landing: a slanted, slightly squashed dab where the brush first touches down.
  const hx = x0 + 1.6, hy = BASELINE + 0.1
  const angle = (-32 * Math.PI) / 180
  const head = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2
    // Flattened on the lower edge so it reads as a slanted wedge, not a dot.
    const rx = 3.9 * (1 + 0.08 * Math.sin(a * 3)), ry = Math.sin(a) > 0 ? 1.7 : 2.5
    const px = Math.cos(a) * rx, py = Math.sin(a) * ry
    return `${i ? 'L' : 'M'}${(hx + px * Math.cos(angle) - py * Math.sin(angle)).toFixed(2)} ${(hy + px * Math.sin(angle) + py * Math.cos(angle)).toFixed(2)}`
  }).join('') + 'Z'

  return { body: brushOutline(spine, profile), head }
}

interface BrushRuleProps {
  seed?: string
  width?: number
}

export default function BrushRule({ seed = 'rule', width = 180 }: BrushRuleProps) {
  const id = 'rule' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const { body, head } = useMemo(() => paintStroke(seed, width), [seed, width])
  const white = (opacity: number, offset: string) => <stop offset={offset} stopColor="#fff" stopOpacity={opacity} />

  return (
    <svg className="brush-rule" viewBox={`0 0 ${width} ${HEIGHT}`} width={width} height={HEIGHT} aria-hidden="true">
      <defs>
        {/* Ink density: loaded at the head, spent by the tail (applied as a mask over solid ink). */}
        <linearGradient id={`${id}-ink`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
          {white(0.8, '0')}
          {white(0.7, '0.3')}
          {white(0.56, '0.7')}
          {white(0.42, '1')}
        </linearGradient>
        <mask id={`${id}-ink-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={HEIGHT}>
          <rect width={width} height={HEIGHT} fill={`url(#${id}-ink)`} />
        </mask>
        {/* Cross-fade from wet ink to dry brush over the last third. */}
        <linearGradient id={`${id}-wet`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
          {white(1, '0.52')}
          {white(0, '0.74')}
        </linearGradient>
        <linearGradient id={`${id}-dry`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
          {white(0, '0.5')}
          {white(1, '0.7')}
        </linearGradient>
        <mask id={`${id}-wet-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={HEIGHT}>
          <rect width={width} height={HEIGHT} fill={`url(#${id}-wet)`} />
        </mask>
        <mask id={`${id}-dry-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={HEIGHT}>
          <rect width={width} height={HEIGHT} fill={`url(#${id}-dry)`} />
        </mask>
        {/* Fibrous edges where ink bleeds into the paper. */}
        <filter id={`${id}-edge`} x="-5%" y="-40%" width="110%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.2" />
        </filter>
        {/* 飛白: horizontal streaks of bare paper, running along the stroke. */}
        <filter id={`${id}-dry-brush`} x="-5%" y="-40%" width="110%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.95" numOctaves="2" seed="11" result="streaks" />
          <feColorMatrix in="streaks" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5.5 0 0 0 3.6" result="bristles" />
          <feComposite in="shape" in2="bristles" operator="in" />
        </filter>
      </defs>

      <g className="brush-rule__ink" mask={`url(#${id}-ink-mask)`}>
        <g mask={`url(#${id}-wet-mask)`} filter={`url(#${id}-edge)`}>
          <path d={head} />
          <path d={body} />
        </g>
        <g mask={`url(#${id}-dry-mask)`} filter={`url(#${id}-dry-brush)`}>
          <path d={body} />
        </g>
      </g>
    </svg>
  )
}

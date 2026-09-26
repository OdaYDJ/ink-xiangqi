import { useEffect, useState, type CSSProperties } from 'react'
import { fitCorner, type CornerFit } from '../rendering/cornerFit'
import {
  BAMBOO, BAMBOO_HEIGHT, BAMBOO_SPRAY, BAMBOO_WIDTH, BIRDS, LANDSCAPE_HEIGHT, LANDSCAPE_WIDTH, MOSS_DOTS, RIDGES,
  SPRAY_VIEWBOX, TREES, WATER, type BambooPlant, type InkShape,
} from '../rendering/landscape'

/** Flutter periods (seconds) for successive leaf clusters: close but never equal, so they drift in and out of phase. */
const FLUTTER_PERIODS = [4.3, 5.2, 3.8, 4.9, 5.7, 4.5, 3.6]

/**
 * A bamboo plant in the wind. The stalks sway together around the plant's
 * root; every leaf cluster also flutters around its own twig, each on its own
 * period and phase, so the motion never looks mechanical.
 */
function Bamboo({ plant, sway, swayPeriod, flutter }: { plant: BambooPlant; sway: number; swayPeriod: number; flutter: number }) {
  const origin = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` })
  return (
    <g
      className="bamboo-sway"
      style={{ ...origin(plant.root.x, plant.root.y), '--amp': `${sway}deg`, animationDuration: `${swayPeriod}s` } as CSSProperties}
    >
      {paint(plant.stalks)}
      {plant.clusters.map((c, i) => (
        <g
          key={i}
          className="bamboo-flutter"
          style={{
            ...origin(c.pivot.x, c.pivot.y),
            '--amp': `${c.depth === 'back' ? flutter * 0.6 : flutter}deg`,
            animationDuration: `${FLUTTER_PERIODS[i % FLUTTER_PERIODS.length]}s`,
            animationDelay: `${-i * 1.7}s`,
          } as CSSProperties}
        >
          {paint(c.shapes)}
        </g>
      ))}
    </g>
  )
}

/** The blocks of each screen the corner bamboo must leave readable. */
const CONTENT_BLOCKS = '.menu__frontispiece, .menu__choices, .game__inscription, .board-wrap, .game__colophon > *'
const SPRAY_ASPECT = SPRAY_VIEWBOX.width / SPRAY_VIEWBOX.height

/**
 * Keeps the top-right bamboo in proportion to the window and clear of the
 * content, re-measuring whenever the window or the content changes size.
 */
function useCornerSpray(): CornerFit | null {
  const [fit, setFit] = useState<CornerFit | null>(null)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const avoid = [...document.querySelectorAll(CONTENT_BLOCKS)].map((el) => el.getBoundingClientRect())
        const next = fitCorner({
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          aspect: SPRAY_ASPECT,
          avoid,
          gap: Math.max(16, Math.min(40, window.innerWidth * 0.025)),
          // A light accent: about a quarter of the width at most, never dominating the corner.
          maxWidth: 440,
          widthShare: 0.27,
          heightShare: 0.42,
          scale: 0.9,
          minWidth: Math.min(130, window.innerWidth * 0.3),
        })
        setFit((prev) =>
          prev && Math.abs(prev.width - next.width) < 1 && prev.crowded === next.crowded ? prev : next,
        )
      })
    }

    const resize = new ResizeObserver(measure)
    const observeBlocks = () => {
      resize.disconnect()
      resize.observe(document.documentElement)
      document.querySelectorAll(CONTENT_BLOCKS).forEach((el) => resize.observe(el))
      measure()
    }
    // Screens swap (menu ⇄ game) and blocks appear or disappear: re-attach and re-measure.
    const root = document.querySelector('.app') ?? document.body
    const mutations = new MutationObserver(observeBlocks)
    mutations.observe(root, { childList: true, subtree: true })
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    observeBlocks()

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  return fit
}

const paint = (shapes: InkShape[]) =>
  shapes.map((s, i) => (
    <path key={i} d={s.d} className="ink-fill" fillOpacity={s.opacity} />
  ))

/**
 * The painting behind the game: mountains dissolving into mist, water,
 * birds, and — on wider screens — a bamboo stand and a hanging bamboo spray at the edges.
 * `spreadKey` replays the "ink spreading into paper" entrance when it changes.
 */
export default function Landscape({ spreadKey }: { spreadKey: string }) {
  const spray = useCornerSpray()
  return (
    <div className="landscape" aria-hidden="true" key={spreadKey}>
      <svg
        className="landscape__range"
        viewBox={`0 0 ${LANDSCAPE_WIDTH} ${LANDSCAPE_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {RIDGES.map((r, i) => (
            <linearGradient key={i} id={`mist-${i}`} gradientUnits="userSpaceOnUse" x1="0" y1={r.top} x2="0" y2={r.base}>
              <stop offset="0" style={{ stopColor: 'var(--ink-wash)' }} stopOpacity={r.opacity} />
              <stop offset="0.35" style={{ stopColor: 'var(--ink-wash)' }} stopOpacity={r.opacity * 0.7} />
              <stop offset="1" style={{ stopColor: 'var(--ink-wash)' }} stopOpacity="0" />
            </linearGradient>
          ))}
          <filter id="wash-edge" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="22" result="d" />
            <feGaussianBlur in="d" stdDeviation="3" />
          </filter>
          <filter id="fog" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.0025 0.012" numOctaves="3" seed="9" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.4 0 0 0 -0.75" result="a" />
            <feFlood style={{ floodColor: 'var(--paper)' }} result="c" />
            <feComposite in="c" in2="a" operator="in" result="patch" />
            <feComposite in="patch" in2="SourceAlpha" operator="in" result="fogged" />
            <feGaussianBlur in="fogged" stdDeviation="5" />
          </filter>
          <linearGradient id="fog-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="0.62" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="fog-mask" maskContentUnits="userSpaceOnUse">
            <rect x="0" y="340" width={LANDSCAPE_WIDTH} height="320" fill="url(#fog-fade)" />
          </mask>
          <filter id="moss" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>

        <g filter="url(#wash-edge)">
          {RIDGES.map((r, i) => <path key={i} d={r.d} fill={`url(#mist-${i})`} />)}
        </g>
        <g filter="url(#moss)">
          {MOSS_DOTS.map((m, i) => <circle key={i} cx={m.x} cy={m.y} r={m.r} className="ink-fill" fillOpacity={m.opacity} />)}
        </g>
        {/* Drifting mist over the lower slopes. */}
        <g mask="url(#fog-mask)">
          <rect x="0" y="340" width={LANDSCAPE_WIDTH} height="320" filter="url(#fog)" />
        </g>
        <g filter="url(#moss)">{paint(TREES)}</g>
        <g>{paint(WATER)}</g>
        <g className="landscape__birds">{paint(BIRDS)}</g>
      </svg>

      <svg className="landscape__bamboo" viewBox={`0 0 ${BAMBOO_WIDTH} ${BAMBOO_HEIGHT}`} preserveAspectRatio="xMinYMax meet">
        {/* Rooted in the ground: a slow, small sway. */}
        <Bamboo plant={BAMBOO} sway={0.7} swayPeriod={9} flutter={2.6} />
      </svg>
      <svg
        className={`landscape__spray${spray?.crowded ? ' is-crowded' : ''}`}
        viewBox={`${SPRAY_VIEWBOX.x} ${SPRAY_VIEWBOX.y} ${SPRAY_VIEWBOX.width} ${SPRAY_VIEWBOX.height}`}
        preserveAspectRatio="xMaxYMin meet"
        style={spray ? { width: spray.width, height: spray.height } : { visibility: 'hidden' }}
      >
        {/* Hanging from the corner: a longer lever, so it swings a little more. */}
        <Bamboo plant={BAMBOO_SPRAY} sway={1.1} swayPeriod={7.4} flutter={3} />
      </svg>
    </div>
  )
}

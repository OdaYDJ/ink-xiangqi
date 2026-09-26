import {
  BAMBOO, BAMBOO_HEIGHT, BAMBOO_SPRAY, BAMBOO_WIDTH, BIRDS, LANDSCAPE_HEIGHT, LANDSCAPE_WIDTH, MOSS_DOTS, RIDGES,
  SPRAY_HEIGHT, SPRAY_WIDTH, TREES, WATER, type InkShape,
} from '../rendering/landscape'

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
        {paint(BAMBOO)}
      </svg>
      <svg className="landscape__spray" viewBox={`0 0 ${SPRAY_WIDTH} ${SPRAY_HEIGHT}`} preserveAspectRatio="xMaxYMin meet">
        {paint(BAMBOO_SPRAY)}
      </svg>
    </div>
  )
}

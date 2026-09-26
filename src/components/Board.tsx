import { useMemo, useRef, type PointerEvent } from 'react'
import type { Move } from '../game/move'
import type { PieceCode } from '../game/piece'
import { createRng } from '../game/randomizer'
import {
  FRAME_STROKES, GRID_STROKES, HEIGHT, MARGIN, MARKER_STROKES, RIVER_BOTTOM, RIVER_STROKES, RIVER_TOP, RIVER_Y, WIDTH,
  pointAt, pointOf, pointX, type Stroke,
} from '../rendering/boardRenderer'
import { PIECE_RADIUS } from '../rendering/pieceRenderer'
import Piece from './Piece'
import '../styles/board.css'
import '../styles/pieces.css'

export interface PieceView {
  id: number
  square: number
  code: PieceCode
}

interface BoardProps {
  pieces: PieceView[]
  /** Pieces captured on the last move, drawn while they dissolve. */
  ghosts?: PieceView[]
  selected?: number | null
  targets?: number[]
  lastMove?: Move | null
  /** Increments with every move; keys the landing ripple and capture splash. */
  moveKey?: number
  lastWasCapture?: boolean
  checkSquare?: number | null
  interactive?: boolean
  onPointClick?: (square: number) => void
}

const paint = (list: Stroke[]) => list.map((s, i) => <path key={i} d={s.d} fillOpacity={s.opacity} />)

/** A few ink droplets thrown outward from a capture, different for every move. */
function splash(moveKey: number) {
  const rng = createRng(`splash-${moveKey}`)
  return Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + rng() * 0.8
    const dist = PIECE_RADIUS * (1.05 + rng() * 0.55)
    return { x: Math.cos(a) * dist, y: Math.sin(a) * dist, r: 1.2 + rng() * 2.6, delay: rng() * 80 }
  })
}

export default function Board({
  pieces, ghosts = [], selected = null, targets = [], lastMove = null, moveKey = 0, lastWasCapture = false,
  checkSquare = null, interactive = false, onPointClick,
}: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const occupied = new Set(pieces.map((p) => p.square))
  const drops = useMemo(() => splash(moveKey), [moveKey])

  const handlePointer = (e: PointerEvent<SVGSVGElement>) => {
    if (!interactive || !onPointClick || !svgRef.current) return
    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) return
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    const square = pointAt(pt.x, pt.y)
    if (square !== null) onPointClick(square)
  }

  const landing = lastMove ? pointOf(lastMove.to) : null

  return (
    <svg
      ref={svgRef}
      className={`board${interactive ? ' is-interactive' : ''}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Xiangqi board"
      onPointerDown={handlePointer}
    >
      <defs>
        {/* Fine irregularity on every brush edge. */}
        <filter id="brush-edge" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.3" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.3" />
        </filter>
        {/* Dry brush (飛白): the frame breaks up where the brush ran short of ink. */}
        <filter id="dry-brush" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.25" numOctaves="2" seed="8" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.12" numOctaves="2" seed="5" result="streak" />
          <feColorMatrix in="streak" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4 0 0 0 3.3" result="holes" />
          <feComposite in="shape" in2="holes" operator="in" />
        </filter>
        <filter id="paper-wash" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="26" result="shape" />
          <feGaussianBlur in="shape" stdDeviation="7" />
        </filter>
        <filter id="piece-edge" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
        </filter>
        <filter id="piece-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id="ink-blot" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
        <pattern id="piece-grain" width="96" height="96" patternUnits="userSpaceOnUse" x="-48" y="-48">
          <filter id="grain-noise" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.75 0.22" numOctaves="3" seed="6" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0.9 -0.35" />
          </filter>
          <rect width="96" height="96" filter="url(#grain-noise)" />
        </pattern>
        <radialGradient id="ink-halo">
          <stop offset="0.55" style={{ stopColor: 'var(--ink)' }} stopOpacity="0.16" />
          <stop offset="1" style={{ stopColor: 'var(--ink)' }} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="river-mist" x1="0" y1={RIVER_TOP} x2="0" y2={RIVER_BOTTOM} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--ink-wash)' }} stopOpacity="0" />
          <stop offset="0.5" style={{ stopColor: 'var(--ink-wash)' }} stopOpacity="0.07" />
          <stop offset="1" style={{ stopColor: 'var(--ink-wash)' }} stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect
        className="board__wash"
        x={MARGIN - 40} y={MARGIN - 40} width={WIDTH - 2 * MARGIN + 80} height={HEIGHT - 2 * MARGIN + 80}
        filter="url(#paper-wash)"
      />

      <g className="board__ink">
        <g className="board__river" aria-hidden="true">
          <rect x={pointX(0)} y={RIVER_TOP} width={pointX(8) - pointX(0)} height={RIVER_BOTTOM - RIVER_TOP} fill="url(#river-mist)" filter="url(#paper-wash)" />
          <g className="board__water" filter="url(#brush-edge)">{paint(RIVER_STROKES)}</g>
          <text x={pointX(2)} y={RIVER_Y} dominantBaseline="central" textAnchor="middle">楚河</text>
          <text x={pointX(6)} y={RIVER_Y} dominantBaseline="central" textAnchor="middle">漢界</text>
        </g>
        <g className="board__frame" filter="url(#dry-brush)">{paint(FRAME_STROKES)}</g>
        <g className="board__grid" filter="url(#brush-edge)">{paint(GRID_STROKES)}</g>
        <g className="board__markers">{paint(MARKER_STROKES)}</g>
      </g>

      {lastMove && (
        <g className="board__last-move" aria-hidden="true">
          <circle className="last-move__from" {...center(lastMove.from)} r={5} filter="url(#ink-blot)" />
        </g>
      )}

      {landing && moveKey > 0 && (
        <g key={moveKey} className="board__effects" aria-hidden="true" style={{ transform: `translate(${landing.x}px, ${landing.y}px)` }}>
          <circle className="ink-ripple" r={PIECE_RADIUS + 2} />
          {lastWasCapture &&
            drops.map((d, i) => (
              <circle
                key={i}
                className="ink-drop"
                cx={d.x}
                cy={d.y}
                r={d.r}
                filter="url(#ink-blot)"
                style={{ animationDelay: `${d.delay}ms` }}
              />
            ))}
        </g>
      )}

      <g className="board__ghosts">
        {ghosts.map((p) => <Piece key={p.id} code={p.code} square={p.square} captured />)}
      </g>

      <g className="board__pieces">
        {pieces.map((p) => (
          <Piece
            key={p.id}
            code={p.code}
            square={p.square}
            selected={p.square === selected}
            inCheck={p.square === checkSquare}
          />
        ))}
      </g>

      <g className="board__targets" aria-hidden="true">
        {targets.map((t) =>
          occupied.has(t) ? (
            <circle key={t} className="target target--capture" {...center(t)} r={PIECE_RADIUS + 4} filter="url(#brush-edge)" />
          ) : (
            <circle key={t} className="target target--move" {...center(t)} r={5.5} filter="url(#ink-blot)" />
          ),
        )}
      </g>
    </svg>
  )
}

const center = (s: number) => {
  const { x, y } = pointOf(s)
  return { cx: x, cy: y }
}

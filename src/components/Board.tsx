import { useId, useMemo, useRef, type CSSProperties, type PointerEvent } from 'react'
import type { Move } from '../game/move'
import type { PieceCode } from '../game/piece'
import {
  FRAME_STROKES, GRID_STROKES, HEIGHT, MARGIN, MARKER_STROKES, RIVER_BOTTOM, RIVER_STROKES, RIVER_TOP, RIVER_Y, WIDTH,
  pointAt, pointOf, pointX, type Stroke,
} from '../rendering/boardRenderer'
import { PIECE_RADIUS } from '../rendering/pieceRenderer'
import { MOVE_MS } from '../rendering/animations'
import { moveInk, type BrushMark } from '../rendering/inkFx'
import { useLocale } from '../i18n/locale'
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
  /** The number of moves played; the ink effects play whenever it goes up (not on undo). */
  moveKey?: number
  lastWasCapture?: boolean
  checkSquare?: number | null
  interactive?: boolean
  onPointClick?: (square: number) => void
}

const paint = (list: Stroke[]) => list.map((s, i) => <path key={i} d={s.d} fillOpacity={s.opacity} />)

/**
 * A brush mark revealed in the direction it was written: a mask whose centre-line
 * stroke is drawn on (stroke-dashoffset), uncovering the filled outline beneath.
 */
function WrittenMark({ id, mark, className, region, filter }: { id: string; mark: BrushMark; className: string; region: [number, number, number, number]; filter?: string }) {
  const [x, y, w, h] = region
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
        <path className={`fx-reveal ${className}-reveal`} d={mark.line} pathLength={1} fill="none" stroke="#fff" strokeWidth={mark.width * 2.8} strokeLinecap="round" strokeLinejoin="round" />
      </mask>
      <g className={className} mask={`url(#${id})`}>
        <path d={mark.d} filter={filter} />
      </g>
    </>
  )
}

/**
 * Which move the ink should answer: the current one if the game just moved
 * forward, none after an undo, a restart or on first display.
 */
function useForwardMove(moveKey: number): number {
  const seen = useRef({ key: moveKey, fx: 0 })
  if (moveKey > seen.current.key) seen.current = { key: moveKey, fx: moveKey }
  else if (moveKey < seen.current.key) seen.current = { key: moveKey, fx: 0 }
  return seen.current.fx === moveKey && moveKey > 0 ? moveKey : 0
}

export default function Board({
  pieces, ghosts = [], selected = null, targets = [], lastMove = null, moveKey = 0, lastWasCapture = false,
  checkSquare = null, interactive = false, onPointClick,
}: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { t } = useLocale()
  const occupied = new Set(pieces.map((p) => p.square))
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  // A different hand every game: the same move never leaves quite the same marks.
  const gameSeed = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const fxKey = useForwardMove(moveKey)
  const fx = useMemo(
    () => (fxKey && lastMove ? moveInk(`${gameSeed}-${fxKey}-${lastMove.from}-${lastMove.to}`, pointOf(lastMove.from), pointOf(lastMove.to), lastWasCapture, PIECE_RADIUS) : null),
    [fxKey, lastMove, lastWasCapture, gameSeed],
  )

  const handlePointer = (e: PointerEvent<SVGSVGElement>) => {
    if (!interactive || !onPointClick || !svgRef.current) return
    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) return
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    const square = pointAt(pt.x, pt.y)
    if (square !== null) onPointClick(square)
  }

  const landing = fx && lastMove ? pointOf(lastMove.to) : null
  const fxStyle = fx
    ? ({
        '--fx-land': `${Math.round(MOVE_MS * 0.8) + fx.jitter.delay}ms`,
        '--fx-alpha': fx.jitter.alpha.toFixed(2),
        '--fx-spread': fx.jitter.spread.toFixed(2),
        '--fx-turn': `${fx.jitter.turn}deg`,
      } as CSSProperties)
    : undefined

  return (
    <svg
      ref={svgRef}
      className={`board${interactive ? ' is-interactive' : ''}`}
      style={{ '--move-ms': `${MOVE_MS}ms` } as CSSProperties}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={t.boardLabel}
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
        {/* Ink entering paper: ragged, fibrous edges that feather out. */}
        <filter id="ink-bleed" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="2" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="6" result="d" />
          <feGaussianBlur in="d" stdDeviation="1" />
        </filter>
        {/* A brush dragged across the sheet: frayed along its sides, softly feathered. */}
        <filter id="ink-sweep" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.5 0.08" numOctaves="2" seed="21" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" result="d" />
          <feGaussianBlur in="d" stdDeviation="1.6" />
        </filter>
        {/* A thin wash, far softer: the paper taking up water around the ink. */}
        <filter id="ink-wash" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="13" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="14" result="d" />
          <feGaussianBlur in="d" stdDeviation="4" />
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

      <g className="board__ghosts">
        {ghosts.map((p) => <Piece key={p.id} code={p.code} square={p.square} captured />)}
      </g>

      {/* Ink under the pieces: the brush's path, and the ink the landing piece presses into the paper
          (over the captured piece, which it absorbs). */}
      {fx && landing && (
        <g key={`under-${fxKey}`} className={`fx${lastWasCapture ? ' fx--capture' : ''}`} style={fxStyle} aria-hidden="true">
          {fx.sweep && <WrittenMark id={`${uid}-sweep-${fxKey}`} mark={fx.sweep} className="fx-sweep" region={[0, 0, WIDTH, HEIGHT]} filter="url(#ink-sweep)" />}
          <g transform={`translate(${landing.x} ${landing.y})`}>
            <path className="fx-far" d={fx.far} filter="url(#ink-wash)" />
            <path className="fx-wash" d={fx.wash} filter="url(#ink-wash)" />
            <path className="fx-core" d={fx.core} filter="url(#ink-bleed)" />
          </g>
        </g>
      )}

      <g className="board__pieces">
        {pieces.map((p) => (
          <Piece
            key={p.id}
            code={p.code}
            square={p.square}
            selected={p.square === selected}
            inCheck={p.square === checkSquare}
            land={fx && p.square === lastMove?.to ? fxKey : undefined}
            impact={lastWasCapture}
          />
        ))}
      </g>

      {/* Ink over the pieces: a brushed circle written round the landing point, and a capture's droplets. */}
      {fx && landing && (
        <g key={`over-${fxKey}`} className={`fx${lastWasCapture ? ' fx--capture' : ''}`} style={fxStyle} aria-hidden="true">
          <g transform={`translate(${landing.x} ${landing.y})`}>
            <WrittenMark id={`${uid}-halo-${fxKey}`} mark={fx.halo} className="fx-halo" region={[-70, -70, 140, 140]} filter="url(#brush-edge)" />
            {fx.drops.map((d, i) => (
              <g key={i} className="fx-drop" style={{ '--dx': `${d.x.toFixed(1)}px`, '--dy': `${d.y.toFixed(1)}px`, animationDelay: `calc(var(--fx-land) + ${d.delay}ms)` } as CSSProperties}>
                <path d={d.d} transform={`rotate(${d.angle.toFixed(0)}) scale(1.8 1)`} filter="url(#ink-blot)" />
              </g>
            ))}
          </g>
        </g>
      )}

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

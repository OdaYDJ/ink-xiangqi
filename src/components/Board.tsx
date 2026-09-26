import { useRef, type PointerEvent } from 'react'
import type { Move } from '../game/move'
import type { PieceCode } from '../game/piece'
import {
  FRAME_STROKES, GRID_STROKES, HEIGHT, MARGIN, MARKER_STROKES, RIVER_Y, WIDTH, pointAt, pointOf, pointX,
  type Stroke,
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
  checkSquare?: number | null
  interactive?: boolean
  onPointClick?: (square: number) => void
}

const strokes = (list: Stroke[]) =>
  list.map((s, i) => <path key={i} d={s.d} strokeWidth={s.width} strokeOpacity={s.opacity} />)

export default function Board({
  pieces, ghosts = [], selected = null, targets = [], lastMove = null, checkSquare = null,
  interactive = false, onPointClick,
}: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const occupied = new Set(pieces.map((p) => p.square))

  const handlePointer = (e: PointerEvent<SVGSVGElement>) => {
    if (!interactive || !onPointClick || !svgRef.current) return
    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) return
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    const square = pointAt(pt.x, pt.y)
    if (square !== null) onPointClick(square)
  }

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
        <filter id="ink-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" />
        </filter>
        <filter id="ink-wash" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" result="shape" />
          <feGaussianBlur in="shape" stdDeviation="6" />
        </filter>
      </defs>

      <rect
        className="board__wash"
        x={MARGIN - 34} y={MARGIN - 34} width={WIDTH - 2 * MARGIN + 68} height={HEIGHT - 2 * MARGIN + 68}
        filter="url(#ink-wash)"
      />

      <g className="board__ink" filter="url(#ink-rough)">
        <g className="board__frame">{strokes(FRAME_STROKES)}</g>
        <g className="board__grid">{strokes(GRID_STROKES)}</g>
        <g className="board__markers">{strokes(MARKER_STROKES)}</g>
      </g>

      <g className="board__river" aria-hidden="true">
        <text x={pointX(2)} y={RIVER_Y} dominantBaseline="central" textAnchor="middle">楚 河</text>
        <text x={pointX(6)} y={RIVER_Y} dominantBaseline="central" textAnchor="middle">漢 界</text>
      </g>

      {lastMove && (
        <g className="board__last-move" aria-hidden="true">
          <circle className="last-move__from" {...center(lastMove.from)} r={6} />
          <circle className="last-move__to" {...center(lastMove.to)} r={PIECE_RADIUS + 6} />
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
            <circle key={t} className="target target--capture" {...center(t)} r={PIECE_RADIUS + 4} />
          ) : (
            <circle key={t} className="target target--move" {...center(t)} r={5.5} />
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

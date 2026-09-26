import type { PieceCode } from '../game/piece'
import { pointOf } from '../rendering/boardRenderer'
import { PIECE_RADIUS, pieceLook } from '../rendering/pieceRenderer'

interface PieceProps {
  code: PieceCode
  square: number
  selected?: boolean
  captured?: boolean
  inCheck?: boolean
}

const R = PIECE_RADIUS

/**
 * A carved piece: a softly shadowed disc (warm paper for Red, charcoal ink
 * for Black) with grain, an engraved ring and a calligraphic character.
 * Filters and patterns are defined once in <Board>.
 */
export default function Piece({ code, square, selected, captured, inCheck }: PieceProps) {
  const { char, side } = pieceLook(code)
  const { x, y } = pointOf(square)
  const classes = ['piece', `piece--${side}`, selected && 'is-selected', captured && 'is-captured', inCheck && 'is-checked']
  return (
    <g className={classes.filter(Boolean).join(' ')} style={{ transform: `translate(${x}px, ${y}px)` }}>
      {inCheck && <circle className="piece__check" r={R + 7} filter="url(#brush-edge)" />}
      {selected && <circle className="piece__halo" r={R + 15} fill="url(#ink-halo)" />}
      <ellipse className="piece__shadow" cx={1.5} cy={3.2} rx={R} ry={R * 0.96} filter="url(#piece-shadow)" />
      <g className="piece__body">
        <g filter="url(#piece-edge)">
          <circle className="piece__disc" r={R} />
          <circle className="piece__grain" r={R} fill="url(#piece-grain)" />
        </g>
        <circle className="piece__groove-light" r={R - 5} cy={0.9} />
        <circle className="piece__groove" r={R - 5} />
        <text className="piece__char" dominantBaseline="central" textAnchor="middle" y={1}>
          {char}
        </text>
      </g>
    </g>
  )
}

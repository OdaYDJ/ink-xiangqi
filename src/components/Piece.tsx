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

export default function Piece({ code, square, selected, captured, inCheck }: PieceProps) {
  const { char, side } = pieceLook(code)
  const { x, y } = pointOf(square)
  const classes = ['piece', `piece--${side}`, selected && 'is-selected', captured && 'is-captured', inCheck && 'is-checked']
  return (
    <g className={classes.filter(Boolean).join(' ')} style={{ transform: `translate(${x}px, ${y}px)` }}>
      <g className="piece__body">
        {inCheck && <circle className="piece__check" r={PIECE_RADIUS + 5} />}
        {selected && <circle className="piece__ripple" r={PIECE_RADIUS} />}
        <circle className="piece__bleed" r={PIECE_RADIUS + 0.8} cx={0.8} cy={1.2} />
        <circle className="piece__disc" r={PIECE_RADIUS} />
        <circle className="piece__ring" r={PIECE_RADIUS - 4.5} />
        <text className="piece__char" dominantBaseline="central" textAnchor="middle" y={1}>
          {char}
        </text>
      </g>
    </g>
  )
}

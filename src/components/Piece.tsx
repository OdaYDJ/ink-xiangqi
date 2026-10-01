import { useId, useMemo } from 'react'
import type { PieceCode } from '../game/piece'
import { pointOf } from '../rendering/boardRenderer'
import { checkInk } from '../rendering/inkFx'
import { PIECE_RADIUS, pieceLook } from '../rendering/pieceRenderer'
import { PIXEL_GLYPHS } from '../rendering/pixelGlyphs'
import { GLYPH_PX } from './BoardV3'
import { UI_VERSION } from '../theme'

interface PieceProps {
  code: PieceCode
  square: number
  selected?: boolean
  captured?: boolean
  inCheck?: boolean
  /** Set (to the move number) on the piece that just moved: it glides, lands with weight and settles. */
  land?: number
  /** The landing was a capture: a heavier impact. */
  impact?: boolean
  /** V3: board units per glyph pixel, snapped by the board to whole screen pixels (see useGlyphScale). */
  glyphPx?: number
  /** The character is turned to face the player across the board (two players at one table). */
  flipped?: boolean
}

const R = PIECE_RADIUS
const V3 = UI_VERSION === 'v3'

/**
 * The cinnabar mark of check: a stain soaking into the paper under the General
 * and a circle brushed round it, pressed in like a seal. It stays, quietly, for as long as the check lasts.
 */
function CheckMark({ square }: { square: number }) {
  const id = 'check' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const ink = useMemo(() => checkInk(square, R), [square])
  return (
    <g className="piece__check" aria-hidden="true">
      <path className="piece__check-stain" d={ink.stain} filter="url(#ink-wash)" />
      <mask id={id} maskUnits="userSpaceOnUse" x={-60} y={-60} width={120} height={120}>
        <path className="fx-reveal piece__check-reveal" d={ink.ring.line} pathLength={1} fill="none" stroke="#fff" strokeWidth={ink.ring.width * 2.8} strokeLinecap="round" />
      </mask>
      <g className="piece__check-ring" mask={`url(#${id})`}>
        <path d={ink.ring.d} filter="url(#brush-edge)" />
      </g>
    </g>
  )
}

/**
 * A carved piece: a softly shadowed disc (warm paper for Red, charcoal ink
 * for Black) with grain, an engraved ring and a calligraphic character.
 * Filters and patterns are defined once in <Board>.
 */
export default function Piece({ code, square, selected, captured, inCheck, land, impact, glyphPx = GLYPH_PX, flipped }: PieceProps) {
  const { char, side } = pieceLook(code)
  const turn = flipped ? ' rotate(180)' : ''
  const { x, y } = pointOf(square)
  const classes = [
    'piece', `piece--${side}`, selected && 'is-selected', captured && 'is-captured', inCheck && 'is-checked',
    land && 'is-landing', land && impact && 'is-impact',
  ]
  return (
    <g className={classes.filter(Boolean).join(' ')} style={{ transform: `translate(${x}px, ${y}px)` }}>
      {inCheck && <CheckMark square={square} />}
      {selected && <circle className="piece__halo" r={R + 15} fill={V3 ? 'url(#v3-halo)' : 'url(#ink-halo)'} />}
      {selected && V3 && <circle className="piece__select-ring" r={R + 3} />}
      {/* Keyed by the move, so the landing plays afresh each time this piece moves. */}
      <g key={`shadow-${land ?? 0}`} className="piece__lift-shadow">
        <ellipse className="piece__shadow" cx={1.5} cy={3.2} rx={R} ry={R * 0.96} filter="url(#piece-shadow)" />
      </g>
      <g key={`body-${land ?? 0}`} className="piece__lift">
        {V3 ? (
          // Carved and lacquered: the disc's edge (its thickness), a satin sheen, an inlaid gold ring, engraved lettering.
          <g className="piece__body">
            <circle className="piece__side" r={R} cy={2.8} />
            <circle className="piece__disc" r={R} />
            <circle className="piece__grain" r={R} fill="url(#piece-grain)" />
            <circle className="piece__rim" r={R - 1.4} />
            <circle className="piece__groove-light" r={R - 5} cy={0.9} />
            <circle className="piece__groove" r={R - 5} />
            <ellipse className="piece__sheen" cx={-R * 0.28} cy={-R * 0.36} rx={R * 0.66} ry={R * 0.44} fill="url(#v3-sheen)" />
            {/* Pixel glyphs pre-centred on their visual centre (see pixelGlyphs.ts): the same optical
                middle for every character, at any size, with no dependence on font metrics. */}
            {/* A crisp shadow exactly one glyph pixel below the character: it darkens the one-pixel gaps
                inside dense characters, so their strokes stay apart. It stays below even when the character is turned. */}
            <path className="piece__char piece__char--cut" d={PIXEL_GLYPHS[char]} transform={`translate(0 ${glyphPx})${turn} scale(${glyphPx})`} />
            <path className="piece__char" d={PIXEL_GLYPHS[char]} transform={`${turn} scale(${glyphPx})`} />
          </g>
        ) : (
          <g className="piece__body">
            <g filter="url(#piece-edge)">
              <circle className="piece__disc" r={R} />
              <circle className="piece__grain" r={R} fill="url(#piece-grain)" />
            </g>
            <circle className="piece__groove-light" r={R - 5} cy={0.9} />
            <circle className="piece__groove" r={R - 5} />
            <text className="piece__char" dominantBaseline="central" textAnchor="middle" y={1} transform={turn || undefined}>
              {char}
            </text>
          </g>
        )}
      </g>
    </g>
  )
}

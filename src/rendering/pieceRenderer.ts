import { pieceChar, sideOf, type PieceCode, type Side } from '../game/piece'
import { CELL } from './boardRenderer'

export const PIECE_RADIUS = CELL * 0.42

export interface PieceLook {
  char: string
  side: Side
}

export const pieceLook = (code: PieceCode): PieceLook => ({ char: pieceChar(code), side: sideOf(code)! })

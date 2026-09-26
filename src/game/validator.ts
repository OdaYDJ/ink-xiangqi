import { colOf, inPalace, rankToRow, rowOf, SIZE, sq, type Board } from './board'
import {
  ADVISOR, CANNON, GENERAL, INVENTORY, PIECE_NAMES, PIECE_TYPES, SOLDIER,
  sideOf, typeOf, type PieceType, type Side,
} from './piece'
import { hasLegalMove, isInCheck } from './rules'

/** Starting-rank rules shared by the randomizer and the validator (ranks count from each side's back rank). */
export const BACK_RANK = 0
export const CANNON_RANK = 2
export const SOLDIER_RANK = 3
export const SOLDIER_COLS = [0, 2, 4, 6, 8]
export const PALACE_COLS = [3, 4, 5]

/** Every square a piece type may occupy at the start of a game. */
export function startingSquares(side: Side, type: PieceType): number[] {
  const rank = (r: number, cols: number[]) => cols.map((c) => sq(rankToRow(side, r), c))
  const all = [0, 1, 2, 3, 4, 5, 6, 7, 8]
  switch (type) {
    case GENERAL:
    case ADVISOR:
      return rank(BACK_RANK, PALACE_COLS)
    case CANNON:
      return rank(CANNON_RANK, all)
    case SOLDIER:
      return rank(SOLDIER_RANK, SOLDIER_COLS)
    default:
      return rank(BACK_RANK, all.filter((c) => !PALACE_COLS.includes(c)))
  }
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Checks that a starting board is a fair, playable Xiangqi formation:
 * standard inventory, every piece on an allowed starting point, and nobody
 * already in check (which also forbids facing Generals).
 */
export function validateFormation(board: Board): ValidationResult {
  const errors: string[] = []
  if (board.length !== SIZE) errors.push(`Board must have ${SIZE} points`)

  for (const side of ['red', 'black'] as Side[]) {
    const counts = new Map<PieceType, number>()
    board.forEach((p, s) => {
      if (sideOf(p) !== side) return
      const type = typeOf(p)
      counts.set(type, (counts.get(type) ?? 0) + 1)
      if (!startingSquares(side, type).includes(s)) {
        errors.push(`${side} ${PIECE_NAMES[type]} on invalid starting point (${rowOf(s)},${colOf(s)})`)
      }
      if ((type === GENERAL || type === ADVISOR) && !inPalace(side, rowOf(s), colOf(s))) {
        errors.push(`${side} ${PIECE_NAMES[type]} outside the palace`)
      }
    })
    for (const type of PIECE_TYPES) {
      const n = counts.get(type) ?? 0
      if (n !== INVENTORY[type]) errors.push(`${side} has ${n} ${PIECE_NAMES[type]}(s), expected ${INVENTORY[type]}`)
    }
  }

  if (errors.length === 0) {
    if (isInCheck(board, 'red')) errors.push('red starts in check (or Generals face each other)')
    if (isInCheck(board, 'black')) errors.push('black starts in check (or Generals face each other)')
    if (!hasLegalMove(board, 'red')) errors.push('red has no legal move')
  }
  return { valid: errors.length === 0, errors }
}

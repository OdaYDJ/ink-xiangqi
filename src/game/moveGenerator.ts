import { COLS, inPalace, onBoard, onOwnSide, sq } from './board'
import type { Board } from './board'
import { encodeMove } from './move'
import { ADVISOR, CANNON, CHARIOT, ELEPHANT, GENERAL, HORSE, SOLDIER, type Side } from './piece'

const ORTHOGONAL = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const
const DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const
/** Horse jumps paired with the "leg" square that must be empty. */
const HORSE_JUMPS = [
  [-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0],
  [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1],
] as const

/**
 * Generates pseudo-legal moves (piece movement rules only, ignoring whether
 * the mover's own General is left in check) as encoded integers.
 */
export function generatePseudoMoves(board: Board, side: Side, out: number[] = []): number[] {
  const own = side === 'red' ? 1 : -1
  for (let from = 0; from < 90; from++) {
    const p = board[from]
    if (p === 0 || Math.sign(p) !== own) continue
    pieceMoves(board, from, side, out)
  }
  return out
}

/** Pseudo-legal moves for the piece standing on `from`. */
export function pieceMoves(board: Board, from: number, side: Side, out: number[] = []): number[] {
  const p = board[from]
  const own = side === 'red' ? 1 : -1
  const row = Math.floor(from / COLS)
  const col = from % COLS
  const add = (r: number, c: number) => {
    const to = sq(r, c)
    const target = board[to]
    if (target === 0 || Math.sign(target) !== own) out.push(encodeMove(from, to))
  }

  switch (Math.abs(p)) {
    case GENERAL:
      for (const [dr, dc] of ORTHOGONAL) {
        const r = row + dr, c = col + dc
        if (inPalace(side, r, c)) add(r, c)
      }
      break

    case ADVISOR:
      for (const [dr, dc] of DIAGONAL) {
        const r = row + dr, c = col + dc
        if (inPalace(side, r, c)) add(r, c)
      }
      break

    case ELEPHANT:
      for (const [dr, dc] of DIAGONAL) {
        const r = row + 2 * dr, c = col + 2 * dc
        if (!onBoard(r, c) || !onOwnSide(side, r)) continue
        if (board[sq(row + dr, col + dc)] !== 0) continue // elephant eye blocked
        add(r, c)
      }
      break

    case HORSE:
      for (const [dr, dc, lr, lc] of HORSE_JUMPS) {
        const r = row + dr, c = col + dc
        if (!onBoard(r, c)) continue
        if (board[sq(row + lr, col + lc)] !== 0) continue // horse leg blocked
        add(r, c)
      }
      break

    case CHARIOT:
      for (const [dr, dc] of ORTHOGONAL) {
        let r = row + dr, c = col + dc
        while (onBoard(r, c)) {
          const target = board[sq(r, c)]
          if (target === 0) out.push(encodeMove(from, sq(r, c)))
          else {
            if (Math.sign(target) !== own) out.push(encodeMove(from, sq(r, c)))
            break
          }
          r += dr
          c += dc
        }
      }
      break

    case CANNON:
      for (const [dr, dc] of ORTHOGONAL) {
        let r = row + dr, c = col + dc
        let screened = false
        while (onBoard(r, c)) {
          const target = board[sq(r, c)]
          if (!screened) {
            if (target === 0) out.push(encodeMove(from, sq(r, c)))
            else screened = true
          } else if (target !== 0) {
            if (Math.sign(target) !== own) out.push(encodeMove(from, sq(r, c)))
            break
          }
          r += dr
          c += dc
        }
      }
      break

    case SOLDIER: {
      const forward = side === 'red' ? -1 : 1
      if (onBoard(row + forward, col)) add(row + forward, col)
      if (!onOwnSide(side, row)) {
        if (col > 0) add(row, col - 1)
        if (col < COLS - 1) add(row, col + 1)
      }
      break
    }
  }
  return out
}

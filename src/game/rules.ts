import { COLS, onBoard, sq, type Board } from './board'
import { moveFrom, moveTo } from './move'
import { generatePseudoMoves, pieceMoves } from './moveGenerator'
import { CANNON, CHARIOT, GENERAL, HORSE, SOLDIER, type Side } from './piece'

export function findGeneral(board: Board, side: Side): number {
  const g = side === 'red' ? GENERAL : -GENERAL
  // Generals live in the palaces, so only scan those rows.
  const rows = side === 'red' ? [7, 8, 9] : [0, 1, 2]
  for (const r of rows) for (let c = 3; c <= 5; c++) if (board[sq(r, c)] === g) return sq(r, c)
  return -1
}

const ORTHOGONAL = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const
/** [dr, dc] from the General to an attacking horse, then the horse's leg relative to the General. */
const HORSE_ATTACKS = [
  [-2, -1, -1, -1], [-2, 1, -1, 1], [2, -1, 1, -1], [2, 1, 1, 1],
  [-1, -2, -1, -1], [1, -2, 1, -1], [-1, 2, -1, 1], [1, 2, 1, 1],
] as const

/**
 * Is `side`'s General attacked? Includes the "flying General" rule: two
 * Generals on the same file with nothing between them count as check.
 */
export function isInCheck(board: Board, side: Side): boolean {
  const g = findGeneral(board, side)
  if (g < 0) return true
  const enemy = side === 'red' ? -1 : 1
  const row = Math.floor(g / COLS)
  const col = g % COLS

  // Chariots, cannons and the facing General along ranks and files.
  for (const [dr, dc] of ORTHOGONAL) {
    let r = row + dr, c = col + dc
    let screens = 0
    while (onBoard(r, c)) {
      const p = board[sq(r, c)]
      if (p !== 0) {
        if (screens === 0) {
          if (p === enemy * CHARIOT || p === enemy * GENERAL) return true
          screens = 1
        } else {
          if (p === enemy * CANNON) return true
          break
        }
      }
      r += dr
      c += dc
    }
  }

  // Horses (the leg is the square next to the horse, diagonal to the General).
  for (const [dr, dc, lr, lc] of HORSE_ATTACKS) {
    const r = row + dr, c = col + dc
    if (!onBoard(r, c) || board[sq(r, c)] !== enemy * HORSE) continue
    if (board[sq(row + lr, col + lc)] === 0) return true
  }

  // Soldiers: an enemy soldier attacks from "behind" the General (its forward
  // direction) or from the side. Palaces are always across the river from the
  // enemy's start, so any soldier beside the General has crossed and may strike sideways.
  const soldier = enemy * SOLDIER
  const behind = side === 'red' ? row - 1 : row + 1
  if (onBoard(behind, col) && board[sq(behind, col)] === soldier) return true
  if (col > 0 && board[sq(row, col - 1)] === soldier) return true
  if (col < COLS - 1 && board[sq(row, col + 1)] === soldier) return true

  return false
}

/** Plays an encoded move in place and returns the captured piece (for unmaking). */
export function makeMove(board: Board, m: number): number {
  const from = moveFrom(m), to = moveTo(m)
  const captured = board[to]
  board[to] = board[from]
  board[from] = 0
  return captured
}

export function unmakeMove(board: Board, m: number, captured: number): void {
  const from = moveFrom(m), to = moveTo(m)
  board[from] = board[to]
  board[to] = captured
}

/** A move is legal when it follows piece rules and doesn't leave the mover in check. */
export function isLegalAfter(board: Board, m: number, side: Side): boolean {
  const captured = makeMove(board, m)
  const ok = !isInCheck(board, side)
  unmakeMove(board, m, captured)
  return ok
}

export function generateLegalMoves(board: Board, side: Side): number[] {
  const work = board.slice()
  return generatePseudoMoves(work, side).filter((m) => isLegalAfter(work, m, side))
}

export function legalMovesFrom(board: Board, from: number, side: Side): number[] {
  const work = board.slice()
  const p = work[from]
  if (p === 0 || (p > 0) !== (side === 'red')) return []
  return pieceMoves(work, from, side).filter((m) => isLegalAfter(work, m, side))
}

export function hasLegalMove(board: Board, side: Side): boolean {
  const work = board.slice()
  for (const m of generatePseudoMoves(work, side)) if (isLegalAfter(work, m, side)) return true
  return false
}

/** Counts leaf nodes of the legal move tree — the standard move-generator correctness check. */
export function perft(board: Board, side: Side, depth: number): number {
  if (depth === 0) return 1
  const next: Side = side === 'red' ? 'black' : 'red'
  let nodes = 0
  for (const m of generatePseudoMoves(board, side)) {
    const captured = makeMove(board, m)
    if (!isInCheck(board, side)) nodes += depth === 1 ? 1 : perft(board, next, depth - 1)
    unmakeMove(board, m, captured)
  }
  return nodes
}

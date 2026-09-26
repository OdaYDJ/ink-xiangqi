import { colOf, rowOf } from './board'
import type { MoveRecord } from './move'
import { ADVISOR, ELEPHANT, HORSE, pieceChar, sideOf, typeOf } from './piece'

const CN_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/**
 * Traditional Chinese move notation, e.g. 炮二平五 or 馬8進7.
 * Red counts files 一…九 from its right (screen right to left); Black counts
 * 1…9 from its own right (screen left to right) with Arabic numerals.
 * `board` is the position *before* the move (needed for 前/後 disambiguation).
 */
export function chineseNotation(board: ArrayLike<number>, move: MoveRecord): string {
  const { from, to, piece } = move
  const red = sideOf(piece) === 'red'
  const num = (n: number) => (red ? CN_DIGITS[n] : String(n))
  const file = (col: number) => (red ? 9 - col : col + 1)

  const fromRow = rowOf(from), toRow = rowOf(to)
  const fromCol = colOf(from), toCol = colOf(to)
  const forward = red ? fromRow - toRow : toRow - fromRow
  const type = typeOf(piece)
  const diagonal = type === HORSE || type === ELEPHANT || type === ADVISOR

  let action: string
  let target: string
  if (forward === 0) {
    action = '平'
    target = num(file(toCol))
  } else {
    action = forward > 0 ? '進' : '退'
    target = diagonal ? num(file(toCol)) : num(Math.abs(forward))
  }

  // Same-type pieces sharing the file: name by position (front first, from the mover's view).
  const sameFile: number[] = []
  for (let r = 0; r < 10; r++) if (board[r * 9 + fromCol] === piece) sameFile.push(r)
  if (!red) sameFile.reverse() // Black's front is further down the screen
  let prefix = pieceChar(piece) + num(file(fromCol))
  if (sameFile.length > 1) {
    const index = sameFile.indexOf(fromRow)
    const labels = sameFile.length === 2 ? ['前', '後'] : sameFile.length === 3 ? ['前', '中', '後'] : ['一', '二', '三', '四', '五']
    prefix = labels[index] + pieceChar(piece)
  }
  return prefix + action + target
}

/** Notation for every move of a game, replayed from its initial board. */
export function gameNotation(initialBoard: ArrayLike<number>, history: MoveRecord[]): string[] {
  const board = Array.from(initialBoard)
  return history.map((m) => {
    const text = chineseNotation(board, m)
    board[m.to] = board[m.from]
    board[m.from] = 0
    return text
  })
}

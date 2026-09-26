import { fenToPiece, pieceChar, pieceToFen, type PieceCode, type Side } from './piece'

/**
 * The board is a flat array of 90 intersections, row-major.
 * Row 0 is Black's back rank (top of the screen), row 9 is Red's back rank.
 * The river lies between rows 4 and 5.
 */
export const COLS = 9
export const ROWS = 10
export const SIZE = COLS * ROWS

export type Board = PieceCode[]

export const sq = (row: number, col: number): number => row * COLS + col
export const rowOf = (s: number): number => Math.floor(s / COLS)
export const colOf = (s: number): number => s % COLS
export const onBoard = (row: number, col: number): boolean =>
  row >= 0 && row < ROWS && col >= 0 && col < COLS

export const inPalace = (side: Side, row: number, col: number): boolean =>
  col >= 3 && col <= 5 && (side === 'red' ? row >= 7 && row <= 9 : row >= 0 && row <= 2)

/** True when `row` lies on `side`'s own half of the river. */
export const onOwnSide = (side: Side, row: number): boolean => (side === 'red' ? row >= 5 : row <= 4)

/** Rows counted from each side's own back rank (0 = back rank, 3 = soldier rank). */
export const rankToRow = (side: Side, rank: number): number => (side === 'red' ? ROWS - 1 - rank : rank)

export const emptyBoard = (): Board => new Array<PieceCode>(SIZE).fill(0)

export const CLASSIC_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR'

/** Parses the board part of a Xiangqi FEN string (rows listed from Black's side). */
export function parseFen(fen: string): Board {
  const rows = fen.trim().split(' ')[0].split('/')
  if (rows.length !== ROWS) throw new Error(`FEN must have ${ROWS} rows: ${fen}`)
  const board = emptyBoard()
  rows.forEach((line, row) => {
    let col = 0
    for (const ch of line) {
      if (/\d/.test(ch)) {
        col += Number(ch)
        continue
      }
      const p = fenToPiece(ch)
      if (p === null || col >= COLS) throw new Error(`Bad FEN row "${line}"`)
      board[sq(row, col++)] = p
    }
    if (col !== COLS) throw new Error(`FEN row "${line}" has ${col} columns`)
  })
  return board
}

export function toFen(board: Board): string {
  const rows: string[] = []
  for (let row = 0; row < ROWS; row++) {
    let line = ''
    let gap = 0
    for (let col = 0; col < COLS; col++) {
      const p = board[sq(row, col)]
      if (p === 0) gap++
      else {
        if (gap) line += gap
        gap = 0
        line += pieceToFen(p)
      }
    }
    rows.push(gap ? line + gap : line)
  }
  return rows.join('/')
}

/** Human-readable board, handy in tests and the console. */
export function boardToString(board: Board): string {
  const lines: string[] = []
  for (let row = 0; row < ROWS; row++) {
    if (row === 5) lines.push('   ～～～～ 楚河  漢界 ～～～～')
    let line = `${ROWS - 1 - row}  `
    for (let col = 0; col < COLS; col++) line += pieceChar(board[sq(row, col)]) + ' '
    lines.push(line.trimEnd())
  }
  lines.push('   a  b  c  d  e  f  g  h  i')
  return lines.join('\n')
}

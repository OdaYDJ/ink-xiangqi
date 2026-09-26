import { colOf, rowOf } from './board'
import type { MoveRecord } from './move'
import { ADVISOR, CANNON, CHARIOT, ELEPHANT, GENERAL, HORSE, SOLDIER, sideOf, typeOf, type PieceType, type Side } from './piece'

/** A move described the way Xiangqi players say it, independent of language. */
export interface MoveDescription {
  side: Side
  type: PieceType
  /** File counted from the mover's own right, 1–9. */
  file: number
  /** When several same pieces share the file: this piece's position from the front, and how many there are. */
  tandem: { index: number; count: number } | null
  action: 'advance' | 'retreat' | 'traverse'
  /** Destination file for traverses and diagonal movers, otherwise the number of steps. */
  target: number
}

/** `board` is the position before the move (needed to tell tandem pieces apart). */
export function describeMove(board: ArrayLike<number>, move: MoveRecord): MoveDescription {
  const { from, to, piece } = move
  const side = sideOf(piece)!
  const red = side === 'red'
  const file = (col: number) => (red ? 9 - col : col + 1)
  const forward = red ? rowOf(from) - rowOf(to) : rowOf(to) - rowOf(from)
  const type = typeOf(piece)
  const diagonal = type === HORSE || type === ELEPHANT || type === ADVISOR

  const sameFile: number[] = []
  for (let r = 0; r < 10; r++) if (board[r * 9 + colOf(from)] === piece) sameFile.push(r)
  if (!red) sameFile.reverse() // Black's front is further down the screen

  return {
    side,
    type,
    file: file(colOf(from)),
    tandem: sameFile.length > 1 ? { index: sameFile.indexOf(rowOf(from)), count: sameFile.length } : null,
    action: forward === 0 ? 'traverse' : forward > 0 ? 'advance' : 'retreat',
    target: forward === 0 || diagonal ? file(colOf(to)) : Math.abs(forward),
  }
}

export type ChineseScript = 'traditional' | 'simplified'

const CN_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const PIECES: Record<ChineseScript, Record<Side, Record<PieceType, string>>> = {
  traditional: {
    red: { [GENERAL]: '帥', [ADVISOR]: '仕', [ELEPHANT]: '相', [HORSE]: '傌', [CHARIOT]: '俥', [CANNON]: '炮', [SOLDIER]: '兵' },
    black: { [GENERAL]: '將', [ADVISOR]: '士', [ELEPHANT]: '象', [HORSE]: '馬', [CHARIOT]: '車', [CANNON]: '砲', [SOLDIER]: '卒' },
  },
  simplified: {
    red: { [GENERAL]: '帅', [ADVISOR]: '仕', [ELEPHANT]: '相', [HORSE]: '马', [CHARIOT]: '车', [CANNON]: '炮', [SOLDIER]: '兵' },
    black: { [GENERAL]: '将', [ADVISOR]: '士', [ELEPHANT]: '象', [HORSE]: '马', [CHARIOT]: '车', [CANNON]: '炮', [SOLDIER]: '卒' },
  },
}
const ACTIONS: Record<ChineseScript, Record<MoveDescription['action'], string>> = {
  traditional: { advance: '進', retreat: '退', traverse: '平' },
  simplified: { advance: '进', retreat: '退', traverse: '平' },
}
const TANDEM: Record<ChineseScript, string[][]> = {
  traditional: [[], [], ['前', '後'], ['前', '中', '後'], ['一', '二', '三', '四'], ['一', '二', '三', '四', '五']],
  simplified: [[], [], ['前', '后'], ['前', '中', '后'], ['一', '二', '三', '四'], ['一', '二', '三', '四', '五']],
}

/**
 * Chinese notation, e.g. 炮二平五 / 馬8進7. Red counts files with Chinese
 * numerals, Black with Arabic numerals, each from its own right.
 */
export function formatChinese(m: MoveDescription, script: ChineseScript = 'traditional'): string {
  const num = (n: number) => (m.side === 'red' ? CN_DIGITS[n] : String(n))
  const piece = PIECES[script][m.side][m.type]
  const prefix = m.tandem ? TANDEM[script][m.tandem.count][m.tandem.index] + piece : piece + num(m.file)
  return prefix + ACTIONS[script][m.action] + num(m.target)
}

const WXF_LETTERS: Record<PieceType, string> = {
  [GENERAL]: 'K', [ADVISOR]: 'A', [ELEPHANT]: 'E', [HORSE]: 'H', [CHARIOT]: 'R', [CANNON]: 'C', [SOLDIER]: 'P',
}

/**
 * WXF notation, the usual English format: piece letter, file, then
 * + (advance), - (retreat) or . (traverse), then the target — e.g. C2.5, H8+7.
 * Two pieces on one file are written with + (front) or - (rear) instead of the file.
 */
export function formatWxf(m: MoveDescription): string {
  let file = String(m.file)
  if (m.tandem) file = m.tandem.count === 2 ? (m.tandem.index === 0 ? '+' : '-') : String(m.tandem.index + 1)
  const op = m.action === 'advance' ? '+' : m.action === 'retreat' ? '-' : '.'
  return WXF_LETTERS[m.type] + file + op + m.target
}

/** Traditional Chinese notation for one move (board = position before the move). */
export const chineseNotation = (board: ArrayLike<number>, move: MoveRecord) => formatChinese(describeMove(board, move))

/** Every move of a game described, replayed from its initial board. */
export function describeGame(initialBoard: ArrayLike<number>, history: MoveRecord[]): MoveDescription[] {
  const board = Array.from(initialBoard)
  return history.map((m) => {
    const d = describeMove(board, m)
    board[m.to] = board[m.from]
    board[m.from] = 0
    return d
  })
}

export const gameNotation = (initialBoard: ArrayLike<number>, history: MoveRecord[]) =>
  describeGame(initialBoard, history).map((d) => formatChinese(d))

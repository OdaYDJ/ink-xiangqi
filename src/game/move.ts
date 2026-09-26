import { colOf, rowOf, ROWS } from './board'
import type { PieceCode } from './piece'

export interface Move {
  from: number
  to: number
}

export interface MoveRecord extends Move {
  piece: PieceCode
  captured: PieceCode
}

/** Compact integer form used inside the engine and the AI search. */
export const encodeMove = (from: number, to: number): number => from | (to << 7)
export const moveFrom = (m: number): number => m & 127
export const moveTo = (m: number): number => m >> 7
export const decodeMove = (m: number): Move => ({ from: moveFrom(m), to: moveTo(m) })

const square = (s: number) => 'abcdefghi'[colOf(s)] + (ROWS - 1 - rowOf(s))

/** ICCS coordinate notation, e.g. "h2e2" (files a–i from Red's left, ranks 0–9 from Red's side). */
export const moveToString = (m: Move): string => square(m.from) + square(m.to)

export function parseMove(text: string): Move {
  const m = /^([a-i])(\d)-?([a-i])(\d)$/.exec(text.trim())
  if (!m) throw new Error(`Bad move "${text}"`)
  const s = (file: string, rank: string) => (ROWS - 1 - Number(rank)) * 9 + 'abcdefghi'.indexOf(file)
  return { from: s(m[1], m[2]), to: s(m[3], m[4]) }
}

import { emptyBoard, type Board } from '../src/game/board'
import { parseMove } from '../src/game/move'
import { fenToPiece } from '../src/game/piece'

/** Square index from ICCS notation, e.g. "e0" (Red's General) or "e9" (Black's). */
export const at = (name: string): number => parseMove(name + 'a0').from

/** Build a board from { square: FEN letter }, e.g. { e0: 'K', e9: 'k', a0: 'R' }. */
export function setup(pieces: Record<string, string>): Board {
  const board = emptyBoard()
  for (const [s, ch] of Object.entries(pieces)) board[at(s)] = fenToPiece(ch)!
  return board
}

export const names = (squares: number[]): string[] =>
  squares
    .map((s) => 'abcdefghi'[s % 9] + (9 - Math.floor(s / 9)))
    .sort()

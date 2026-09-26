import { moveFrom, moveTo } from '../game/move'
import { PIECE_VALUE } from './evaluate'

export type OrderingLevel = 'none' | 'captures' | 'full'

const MAX_PLY = 64

/** Killer moves (quiet moves that caused a cutoff at the same ply) and history heuristic. */
export class MoveOrderer {
  readonly killers = new Int32Array(MAX_PLY * 2)
  readonly history = new Int32Array(90 * 90)

  addKiller(ply: number, m: number): void {
    if (ply >= MAX_PLY || this.killers[ply * 2] === m) return
    this.killers[ply * 2 + 1] = this.killers[ply * 2]
    this.killers[ply * 2] = m
  }

  addHistory(m: number, depth: number): void {
    const i = moveFrom(m) * 90 + moveTo(m)
    this.history[i] += depth * depth
    if (this.history[i] > 1 << 24) for (let k = 0; k < this.history.length; k++) this.history[k] >>= 1
  }

  /**
   * Sorts moves in place: hash move, then captures by MVV-LVA (most valuable
   * victim, least valuable attacker), then killers, then history score.
   */
  order(board: ArrayLike<number>, moves: number[], level: OrderingLevel, ply: number, ttMove = 0): number[] {
    if (level === 'none') return moves
    const scores = new Map<number, number>()
    for (const m of moves) {
      const victim = board[moveTo(m)]
      let s = 0
      if (m === ttMove) s = 1 << 30
      else if (victim !== 0) {
        const attacker = Math.abs(board[moveFrom(m)])
        s = (1 << 26) + (PIECE_VALUE[Math.abs(victim)] || 2000) * 16 - (PIECE_VALUE[attacker] || 0)
      } else if (level === 'full') {
        if (ply < MAX_PLY && m === this.killers[ply * 2]) s = 1 << 25
        else if (ply < MAX_PLY && m === this.killers[ply * 2 + 1]) s = (1 << 25) - 1
        else s = this.history[moveFrom(m) * 90 + moveTo(m)]
      }
      scores.set(m, s)
    }
    return moves.sort((a, b) => scores.get(b)! - scores.get(a)!)
  }
}

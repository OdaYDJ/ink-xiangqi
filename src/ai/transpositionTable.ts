import { createRng } from '../game/randomizer'

/**
 * Zobrist hashing with two independent 32-bit keys: `lo` indexes the table,
 * `hi` verifies the entry (a 64-bit key without BigInt overhead).
 */
const PIECE_SLOTS = 15 // piece codes -7..7
const rng = createRng('ink-zobrist')
const rand32 = () => (rng() * 4294967296) | 0

export const ZOBRIST_LO = Int32Array.from({ length: PIECE_SLOTS * 90 }, rand32)
export const ZOBRIST_HI = Int32Array.from({ length: PIECE_SLOTS * 90 }, rand32)
export const SIDE_LO = rand32()
export const SIDE_HI = rand32()

export const zobristIndex = (piece: number, square: number) => (piece + 7) * 90 + square

export function hashBoard(board: ArrayLike<number>, blackToMove: boolean): [number, number] {
  let lo = 0, hi = 0
  for (let s = 0; s < 90; s++) {
    const p = board[s]
    if (p !== 0) {
      lo ^= ZOBRIST_LO[zobristIndex(p, s)]
      hi ^= ZOBRIST_HI[zobristIndex(p, s)]
    }
  }
  if (blackToMove) {
    lo ^= SIDE_LO
    hi ^= SIDE_HI
  }
  return [lo, hi]
}

export const TT_EXACT = 1
export const TT_LOWER = 2 // score is at least this (fail-high)
export const TT_UPPER = 3 // score is at most this (fail-low)

export interface TTHit {
  depth: number
  flag: number
  score: number
  move: number
}

export class TranspositionTable {
  private readonly mask: number
  private readonly keys: Int32Array
  private readonly depths: Int8Array
  private readonly flags: Uint8Array
  private readonly scores: Int32Array
  private readonly moves: Int32Array

  constructor(bits = 19) {
    const size = 1 << bits
    this.mask = size - 1
    this.keys = new Int32Array(size)
    this.depths = new Int8Array(size)
    this.flags = new Uint8Array(size)
    this.scores = new Int32Array(size)
    this.moves = new Int32Array(size)
  }

  probe(lo: number, hi: number): TTHit | null {
    const i = lo & this.mask
    if (this.flags[i] === 0 || this.keys[i] !== hi) return null
    return { depth: this.depths[i], flag: this.flags[i], score: this.scores[i], move: this.moves[i] }
  }

  store(lo: number, hi: number, depth: number, flag: number, score: number, move: number): void {
    const i = lo & this.mask
    // Depth-preferred replacement, but always replace entries from other positions.
    if (this.flags[i] !== 0 && this.keys[i] === hi && this.depths[i] > depth) return
    this.keys[i] = hi
    this.depths[i] = depth
    this.flags[i] = flag
    this.scores[i] = score
    this.moves[i] = move
  }

  clear(): void {
    this.flags.fill(0)
  }
}

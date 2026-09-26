import { CLASSIC_FEN, emptyBoard, parseFen, type Board } from './board'
import {
  ADVISOR, CANNON, CHARIOT, ELEPHANT, GENERAL, HORSE, SOLDIER,
  makePiece, type PieceType, type Side,
} from './piece'
import { startingSquares, validateFormation } from './validator'

export type GameMode = 'classic' | 'random'

export interface Formation {
  mode: GameMode
  /** Null for the classic formation. */
  seed: string | null
  board: Board
}

export const SEED_PREFIX = 'INK-'

/** Seeds are case-insensitive; `ink-7f3a92` and `INK-7F3A92` are the same formation. */
export const normalizeSeed = (seed: string): string => seed.trim().toUpperCase()

/** A fresh seed like "INK-7F3A92". Uses the browser's crypto when available. */
export function randomSeed(): string {
  const n = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
    : Math.floor(Math.random() * 2 ** 32)
  return SEED_PREFIX + (n & 0xffffff).toString(16).toUpperCase().padStart(6, '0')
}

/** Hashes a string to a 32-bit integer (FNV-1a followed by an avalanche mix). */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

/** Small, fast, deterministic PRNG (mulberry32). Returns floats in [0, 1). */
export function createRng(seed: string): () => number {
  let a = hashSeed(normalizeSeed(seed))
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Places one side's army with constrained randomness:
 * - General and both Advisors share the three palace points of the back rank
 *   (Advisors outside the palace could never move);
 * - Elephants, Horses and Chariots shuffle across the six remaining back-rank points;
 * - Cannons take two random points on the cannon rank;
 * - Soldiers keep their five traditional points.
 */
function placeSide(board: Board, side: Side, rng: () => number): void {
  const put = (squares: number[], types: PieceType[]) =>
    types.forEach((t, i) => (board[squares[i]] = makePiece(side, t)))

  put(shuffle(startingSquares(side, GENERAL), rng), [GENERAL, ADVISOR, ADVISOR])
  put(shuffle(startingSquares(side, HORSE), rng), [ELEPHANT, ELEPHANT, HORSE, HORSE, CHARIOT, CHARIOT])
  put(shuffle(startingSquares(side, CANNON), rng), [CANNON, CANNON])
  put(startingSquares(side, SOLDIER), [SOLDIER, SOLDIER, SOLDIER, SOLDIER, SOLDIER])
}

const MAX_ATTEMPTS = 1000

/**
 * Deterministically generates a valid random formation from a seed.
 * Candidates that fail validation (e.g. facing Generals) are discarded and the
 * same RNG stream continues, so a seed always yields the same board.
 */
export function generateFormation(seed: string): Formation {
  const normalized = normalizeSeed(seed)
  const rng = createRng(normalized)
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const board = emptyBoard()
    placeSide(board, 'red', rng)
    placeSide(board, 'black', rng)
    if (validateFormation(board).valid) return { mode: 'random', seed: normalized, board }
  }
  throw new Error(`Could not generate a valid formation for seed ${normalized}`)
}

export function classicFormation(): Formation {
  return { mode: 'classic', seed: null, board: parseFen(CLASSIC_FEN) }
}

export function createFormation(mode: GameMode, seed: string = randomSeed()): Formation {
  return mode === 'classic' ? classicFormation() : generateFormation(seed)
}

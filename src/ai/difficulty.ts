import type { GameState } from '../game/gameState'
import { Searcher, type SearchOptions, type SearchResult } from './minimax'

export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

/** Traditional titles for each level: beginner, player, national master. */
export const DIFFICULTY_TITLES: Record<Difficulty, string> = {
  easy: '初學',
  medium: '棋手',
  hard: '國手',
}

/**
 * Easy:   plain minimax, depth 2, material + position, noisy root choice.
 * Medium: alpha-beta to depth 4 with capture ordering, quiescence and the full evaluation.
 * Hard:   iterative deepening + alpha-beta + TT + killer/history ordering, time-limited.
 */
export const PROFILES: Record<Difficulty, Omit<SearchOptions, 'rng'>> = {
  easy: {
    maxDepth: 2, timeMs: 100, alphaBeta: false, iterative: false, useTT: false,
    ordering: 'none', quiescence: false, evaluation: 'basic', noise: 60, blunderChance: 0.25,
  },
  medium: {
    maxDepth: 4, timeMs: 500, alphaBeta: true, iterative: true, useTT: false,
    ordering: 'captures', quiescence: true, evaluation: 'full', noise: 0, blunderChance: 0,
  },
  hard: {
    maxDepth: 32, timeMs: 2000, alphaBeta: true, iterative: true, useTT: true,
    ordering: 'full', quiescence: true, evaluation: 'full', noise: 0, blunderChance: 0,
  },
}

/** Picks a move for the side to move. Pure function of the (serializable) game state. */
export function chooseMove(
  state: GameState,
  difficulty: Difficulty,
  overrides: Partial<SearchOptions> = {},
): SearchResult {
  if (state.status !== 'playing') return { move: null, score: 0, depth: 0, nodes: 0, elapsedMs: 0 }
  // Replay the game to give the search every earlier position (for repetition draws).
  const boards = [state.initialBoard.slice()]
  for (const m of state.history) {
    const b = boards[boards.length - 1].slice()
    b[m.to] = b[m.from]
    b[m.from] = 0
    boards.push(b)
  }
  boards.pop() // the last one is the current board
  const searcher = new Searcher(state.board, state.turn, { ...PROFILES[difficulty], ...overrides }, boards)
  return searcher.search()
}

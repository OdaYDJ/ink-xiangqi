import { describe, expect, it } from 'vitest'
import { chooseMove, DIFFICULTIES, type Difficulty } from '../src/ai/difficulty'
import { evaluateBasic, evaluateFull } from '../src/ai/evaluate'
import { MATE } from '../src/ai/minimax'
import { CLASSIC_FEN, parseFen } from '../src/game/board'
import { applyMove, createGame, isLegalMove, type GameState } from '../src/game/gameState'
import { moveToString, parseMove } from '../src/game/move'
import { createRng, generateFormation } from '../src/game/randomizer'
import { setup } from './helpers'

const fast = { timeMs: 150 } // keep the suite quick; depth limits still apply

describe('evaluation', () => {
  it('is symmetric: the classic start is balanced', () => {
    expect(evaluateBasic(parseFen(CLASSIC_FEN))).toBe(0)
    expect(evaluateFull(parseFen(CLASSIC_FEN))).toBe(0)
  })
  it('prefers having more material', () => {
    const board = parseFen(CLASSIC_FEN)
    board[0] = 0 // remove a black chariot
    expect(evaluateBasic(board)).toBeGreaterThan(400)
    expect(evaluateFull(board)).toBeGreaterThan(400)
  })
})

describe.each(DIFFICULTIES)('%s AI', (difficulty: Difficulty) => {
  it('finds mate in one', () => {
    // Red chariot to i9 mates (a8 chariot covers rank 8, d0 General covers the d-file).
    const g = createGame(setup({ d0: 'K', e9: 'k', a8: 'R', i7: 'R', a3: 'p' }))
    const r = chooseMove(g, difficulty, { ...fast, rng: createRng('t') })
    expect(moveToString(r.move!)).toBe('i7i9')
    expect(r.score).toBeGreaterThan(MATE - 100)
  })

  it('recognizes check and escapes it', () => {
    // Black General on e9 is checked by the e5 chariot; any legal reply must resolve the check.
    const g = createGame(setup({ d0: 'K', e9: 'k', e5: 'R', a9: 'r' }), 'black')
    expect(g.inCheck).toBe(true)
    const r = chooseMove(g, difficulty, { ...fast, rng: createRng('t') })
    const after = applyMove(g, r.move!)
    expect(after.history.at(-1)!.piece).toBeLessThan(0)
  })

  it('takes a free chariot', () => {
    const g = createGame(setup({ d0: 'K', f9: 'k', b2: 'R', b7: 'r' }))
    const r = chooseMove(g, difficulty, { ...fast, noise: 0, blunderChance: 0 })
    expect(moveToString(r.move!)).toBe('b2b7')
  })

  it('returns no move once the game is over', () => {
    const mated = applyMove(createGame(setup({ d0: 'K', e9: 'k', a8: 'R', i7: 'R' })), parseMove('i7i9'))
    expect(chooseMove(mated, difficulty).move).toBeNull()
  })
})

describe('AI self-play', () => {
  /** Plays AI vs AI, asserting every move is legal for the side to move. */
  function selfPlay(state: GameState, red: Difficulty, black: Difficulty, plies: number) {
    for (let i = 0; i < plies && state.status === 'playing'; i++) {
      const mover = state.turn
      const r = chooseMove(state, mover === 'red' ? red : black, { timeMs: 40, rng: createRng(`p${i}`) })
      expect(r.move).not.toBeNull()
      expect(isLegalMove(state, r.move!)).toBe(true)
      const piece = state.board[r.move!.from]
      expect(piece).not.toBe(0) // never moves a captured / missing piece
      expect(piece > 0).toBe(mover === 'red') // respects turn order
      state = applyMove(state, r.move!)
    }
    return state
  }

  it('only ever plays legal moves on random formations', () => {
    for (const seed of ['INK-7F3A92', 'INK-000001', 'INK-ABCDEF']) {
      selfPlay(createGame(generateFormation(seed).board), 'easy', 'medium', 30)
    }
  }, 60000)

  it('medium beats easy more often than not (material after 40 plies)', () => {
    let score = 0
    for (const seed of ['INK-100000', 'INK-200000', 'INK-300000', 'INK-400000']) {
      const end = selfPlay(createGame(generateFormation(seed).board), 'easy', 'medium', 40)
      if (end.status === 'checkmate' || end.status === 'stalemate') score += end.winner === 'black' ? 5000 : -5000
      else score -= evaluateBasic(end.board) // black's advantage
    }
    expect(score).toBeGreaterThan(0)
  }, 120000)
})

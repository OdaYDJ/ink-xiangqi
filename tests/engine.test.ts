import { describe, expect, it } from 'vitest'
import { CLASSIC_FEN, parseFen, toFen } from '../src/game/board'
import { applyMove, createGame, legalMoves, legalTargets, undoMoves } from '../src/game/gameState'
import { parseMove } from '../src/game/move'
import { generateLegalMoves, isInCheck, legalMovesFrom, perft } from '../src/game/rules'
import { moveTo } from '../src/game/move'
import { at, names, setup } from './helpers'

/** Legal destinations for the piece on `from`, as sorted ICCS squares. */
const targets = (pieces: Record<string, string>, from: string, turn: 'red' | 'black' = 'red') =>
  names(legalMovesFrom(setup(pieces), at(from), turn).map(moveTo))

// Generals tucked into palace corners on different files so they never face each other.
const KINGS = { d0: 'K', f9: 'k' }

describe('board', () => {
  it('round-trips FEN', () => {
    expect(toFen(parseFen(CLASSIC_FEN))).toBe(CLASSIC_FEN)
  })
})

describe('perft (classic position)', () => {
  // Reference values for the standard Xiangqi start position.
  it.each([
    [1, 44],
    [2, 1920],
    [3, 79666],
  ])('depth %i = %i', (depth, nodes) => {
    expect(perft(parseFen(CLASSIC_FEN), 'red', depth)).toBe(nodes)
  })
})

describe('General', () => {
  it('moves one point orthogonally inside the palace', () => {
    expect(targets({ e1: 'K', e9: 'k', e5: 'P' }, 'e1')).toEqual(['d1', 'e0', 'e2', 'f1'])
  })
  it('cannot leave the palace', () => {
    expect(targets({ d2: 'K', f9: 'k' }, 'd2')).toEqual(['d1', 'e2'])
  })
  it('cannot step onto a file facing the enemy General (flying General)', () => {
    expect(targets({ d0: 'K', e9: 'k' }, 'd0')).toEqual(['d1'])
  })
})

describe('Flying General', () => {
  it('facing Generals on an open file is check', () => {
    expect(isInCheck(setup({ e0: 'K', e9: 'k' }), 'red')).toBe(true)
    expect(isInCheck(setup({ e0: 'K', e9: 'k' }), 'black')).toBe(true)
  })
  it('a piece between the Generals blocks it', () => {
    expect(isInCheck(setup({ e0: 'K', e9: 'k', e5: 'P' }), 'red')).toBe(false)
  })
  it('the only blocker between Generals is pinned to the file', () => {
    expect(targets({ e0: 'K', e9: 'k', e4: 'R' }, 'e4')).toEqual(['e1', 'e2', 'e3', 'e5', 'e6', 'e7', 'e8', 'e9'])
  })
})

describe('Advisor', () => {
  it('moves one point diagonally', () => {
    expect(targets({ d9: 'k', e0: 'K', e5: 'P', e1: 'A' }, 'e1')).toEqual(['d0', 'd2', 'f0', 'f2'])
  })
  it('cannot leave the palace', () => {
    expect(targets({ ...KINGS, f0: 'A' }, 'f0')).toEqual(['e1'])
  })
})

describe('Elephant', () => {
  it('moves two points diagonally', () => {
    expect(targets({ ...KINGS, e2: 'B' }, 'e2')).toEqual(['c0', 'c4', 'g0', 'g4'])
  })
  it('is blocked when its eye is occupied', () => {
    expect(targets({ ...KINGS, e2: 'B', d3: 'P', f1: 'p' }, 'e2')).toEqual(['c0', 'g4'])
  })
  it('cannot cross the river', () => {
    expect(targets({ ...KINGS, c4: 'B' }, 'c4')).toEqual(['a2', 'e2'])
    expect(targets({ d9: 'k', f0: 'K', c5: 'b' }, 'c5', 'black')).toEqual(['a7', 'e7'])
  })
})

describe('Horse', () => {
  it('moves in an L-shape', () => {
    expect(targets({ ...KINGS, e4: 'N' }, 'e4')).toEqual(['c3', 'c5', 'd2', 'd6', 'f2', 'f6', 'g3', 'g5'])
  })
  it('is blocked at the horse leg', () => {
    // Leg above (e5) blocks d6/f6; leg to the left (d4) blocks c3/c5.
    expect(targets({ ...KINGS, e4: 'N', e5: 'P', d4: 'p' }, 'e4')).toEqual(['d2', 'f2', 'g3', 'g5'])
  })
  it('a blocked leg also prevents check', () => {
    expect(isInCheck(setup({ e0: 'K', f9: 'k', d2: 'n' }), 'red')).toBe(true)
    expect(isInCheck(setup({ e0: 'K', f9: 'k', d2: 'n', d1: 'A' }), 'red')).toBe(false)
  })
})

describe('Chariot', () => {
  it('slides until blocked and captures the first enemy piece', () => {
    expect(targets({ ...KINGS, a0: 'R', a3: 'P', c0: 'n' }, 'a0')).toEqual(['a1', 'a2', 'b0', 'c0'])
  })
})

describe('Cannon', () => {
  it('moves like a chariot when not capturing', () => {
    expect(targets({ ...KINGS, b2: 'C', b5: 'p' }, 'b2')).toEqual(
      ['a2', 'b0', 'b1', 'b3', 'b4', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2', 'i2'].sort(),
    )
  })
  it('captures only by jumping exactly one screen', () => {
    // b5 is the screen, b8 is capturable; b9 behind it is not. The adjacent b3 cannot be taken directly.
    const t = targets({ ...KINGS, b2: 'C', b3: 'p', b8: 'r', b9: 'n' }, 'b2')
    expect(t).toContain('b8')
    expect(t).not.toContain('b3')
    expect(t).not.toContain('b9')
  })
  it('cannot capture its own piece over a screen', () => {
    expect(targets({ ...KINGS, b2: 'C', b3: 'P', b5: 'P' }, 'b2')).not.toContain('b5')
  })
  it('gives check through a screen', () => {
    expect(isInCheck(setup({ e0: 'K', d9: 'k', e5: 'c', e3: 'P' }), 'red')).toBe(true)
    expect(isInCheck(setup({ e0: 'K', d9: 'k', e5: 'c' }), 'red')).toBe(false)
  })
})

describe('Soldier', () => {
  it('only moves forward before crossing the river', () => {
    expect(targets({ ...KINGS, c3: 'P' }, 'c3')).toEqual(['c4'])
    expect(targets({ d0: 'K', f9: 'k', c6: 'p' }, 'c6', 'black')).toEqual(['c5'])
  })
  it('moves forward or sideways after crossing, never backward', () => {
    expect(targets({ ...KINGS, c5: 'P' }, 'c5')).toEqual(['b5', 'c6', 'd5'])
    expect(targets({ d0: 'K', f9: 'k', c4: 'p' }, 'c4', 'black')).toEqual(['b4', 'c3', 'd4'])
  })
  it('on the last rank it can only move sideways', () => {
    expect(targets({ ...KINGS, a9: 'P' }, 'a9')).toEqual(['b9'])
  })
})

describe('game state', () => {
  const play = (moves: string[], fen = CLASSIC_FEN) =>
    moves.reduce((s, m) => applyMove(s, parseMove(m)), createGame(parseFen(fen)))

  it('starts with Red to move and 44 legal moves', () => {
    const g = createGame(parseFen(CLASSIC_FEN))
    expect(g.turn).toBe('red')
    expect(legalMoves(g)).toHaveLength(44)
    expect(g.status).toBe('playing')
  })

  it('switches turns and rejects moving out of turn', () => {
    const g = play(['h2e2'])
    expect(g.turn).toBe('black')
    expect(() => applyMove(g, parseMove('e3e4'))).toThrow()
  })

  it('rejects illegal moves', () => {
    const g = createGame(parseFen(CLASSIC_FEN))
    expect(() => applyMove(g, parseMove('a0a5'))).toThrow() // chariot through its own soldier
    expect(() => applyMove(g, parseMove('b0b2'))).toThrow() // not a horse move
  })

  it('records captures', () => {
    // Central cannon takes the centre soldier.
    const g = play(['h2e2', 'h9g7', 'e2e6'])
    const last = g.history[g.history.length - 1]
    expect(last.captured).toBe(-7)
    expect(g.board[at('e6')]).toBe(6)
    expect(g.quietPlies).toBe(0)
  })

  it('detects check', () => {
    const g = applyMove(createGame(setup({ d0: 'K', f9: 'k', a8: 'R' })), parseMove('a8f8'))
    expect(g.turn).toBe('black')
    expect(g.inCheck).toBe(true)
    expect(g.status).toBe('playing') // the General can capture the chariot
    expect(names(legalMoves(g).map((m) => m.to))).toEqual(['e9', 'f8'])
  })

  it('detects checkmate (double chariot)', () => {
    const g = createGame(setup({ d0: 'K', e9: 'k', a8: 'R', i7: 'R' }), 'red')
    const mated = applyMove(g, parseMove('i7i9'))
    expect(mated.inCheck).toBe(true)
    expect(mated.status).toBe('checkmate')
    expect(mated.winner).toBe('red')
    expect(legalMoves(mated)).toHaveLength(0)
    expect(() => applyMove(mated, parseMove('e9e8'))).toThrow()
  })

  it('a player with no legal moves loses even when not in check', () => {
    // e8 is covered by the a8 chariot, f9 by the f4 chariot, d9 would face the red General.
    const g = createGame(setup({ d0: 'K', e9: 'k', a8: 'R', f4: 'R' }), 'black')
    expect(g.inCheck).toBe(false)
    expect(g.status).toBe('stalemate')
    expect(g.winner).toBe('red')
  })

  it('undo restores earlier positions', () => {
    const g = play(['h2e2', 'h9g7', 'e2e6'])
    const back = undoMoves(g, 2)
    expect(back.history).toHaveLength(1)
    expect(back.turn).toBe('black')
    expect(toFen(back.board)).toBe(toFen(play(['h2e2']).board))
  })

  it('declares a draw on threefold repetition', () => {
    const shuffle = ['b0c2', 'b9c7', 'c2b0', 'c7b9']
    const g = play([...shuffle, ...shuffle])
    expect(g.status).toBe('draw')
    expect(g.drawReason).toBe('repetition')
  })

  it('every generated move from the start is legal for applyMove', () => {
    const g = createGame(parseFen(CLASSIC_FEN))
    for (const m of legalMoves(g)) expect(() => applyMove(g, m)).not.toThrow()
    expect(legalTargets(g, at('b0')).length).toBe(2)
    expect(generateLegalMoves(g.board, 'black')).toHaveLength(44)
  })
})

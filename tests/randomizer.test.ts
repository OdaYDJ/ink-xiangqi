import { describe, expect, it } from 'vitest'
import { CLASSIC_FEN, colOf, rowOf, toFen } from '../src/game/board'
import { createGame } from '../src/game/gameState'
import {
  ADVISOR, CANNON, GENERAL, INVENTORY, PIECE_TYPES, SOLDIER, sideOf, typeOf, type Side,
} from '../src/game/piece'
import {
  classicFormation, createFormation, createRng, generateFormation, normalizeSeed, randomSeed,
} from '../src/game/randomizer'
import { isInCheck } from '../src/game/rules'
import { findFreeMaterial, SOLDIER_COLS, validateFormation } from '../src/game/validator'

const RUNS = 3000
const seeds = Array.from({ length: RUNS }, (_, i) => `INK-${i.toString(16).toUpperCase().padStart(6, '0')}`)
const formations = seeds.map(generateFormation)

/** Rank counted from `side`'s own back rank. */
const rank = (side: Side, s: number) => (side === 'red' ? 9 - rowOf(s) : rowOf(s))

describe('classic formation', () => {
  it('is the standard starting position and passes validation', () => {
    const f = classicFormation()
    expect(toFen(f.board)).toBe(CLASSIC_FEN)
    expect(validateFormation(f.board)).toEqual({ valid: true, errors: [] })
    expect(createFormation('classic').seed).toBeNull()
  })
})

describe(`random formations (${RUNS} seeds)`, () => {
  it('all pass validation', () => {
    const bad = formations.filter((f) => !validateFormation(f.board).valid)
    expect(bad.map((f) => f.seed)).toEqual([])
  })

  it('have the correct piece counts, including exactly one General per side', () => {
    for (const f of formations) {
      for (const side of ['red', 'black'] as Side[]) {
        for (const type of PIECE_TYPES) {
          const n = f.board.filter((p) => sideOf(p) === side && typeOf(p) === type).length
          expect(n).toBe(INVENTORY[type])
        }
      }
      expect(f.board.filter((p) => p !== 0)).toHaveLength(32)
    }
  })

  it('keep every piece on a valid starting point', () => {
    for (const f of formations) {
      f.board.forEach((p, s) => {
        if (!p) return
        const side = sideOf(p)!
        const type = typeOf(p)
        const r = rank(side, s)
        const c = colOf(s)
        if (type === GENERAL || type === ADVISOR) {
          expect(r).toBe(0)
          expect(c).toBeGreaterThanOrEqual(3)
          expect(c).toBeLessThanOrEqual(5)
        } else if (type === SOLDIER) {
          expect(r).toBe(3)
          expect(SOLDIER_COLS).toContain(c)
        } else if (type === CANNON) {
          expect(r).toBe(2)
        } else {
          expect(r).toBe(0)
          expect([3, 4, 5]).not.toContain(c)
        }
      })
    }
  })

  it('never start in check or with facing Generals', () => {
    for (const f of formations) {
      expect(isInCheck(f.board, 'red')).toBe(false)
      expect(isInCheck(f.board, 'black')).toBe(false)
      expect(createGame(f.board).status).toBe('playing')
    }
  })

  it('never hand either side free material on move one', () => {
    for (const f of formations) expect(findFreeMaterial(f.board)).toBeNull()
  })

  it('are deterministic per seed', () => {
    for (const seed of seeds.slice(0, 200)) {
      expect(generateFormation(seed).board).toEqual(generateFormation(seed).board)
    }
    expect(generateFormation('ink-7f3a92 ').board).toEqual(generateFormation('INK-7F3A92').board)
    expect(normalizeSeed(' ink-7f3a92')).toBe('INK-7F3A92')
  })

  it('actually vary between seeds', () => {
    const distinct = new Set(formations.map((f) => toFen(f.board)))
    expect(distinct.size).toBeGreaterThan(RUNS * 0.99)
    // The General should visit every palace point on the back rank.
    const generalCols = new Set(formations.map((f) => colOf(f.board.indexOf(GENERAL))))
    expect([...generalCols].sort()).toEqual([3, 4, 5])
  })
})

describe('validator', () => {
  it('rejects wrong inventories and misplaced pieces', () => {
    const board = classicFormation().board.slice()
    board[board.indexOf(-SOLDIER)] = 0
    expect(validateFormation(board).valid).toBe(false)

    const moved = classicFormation().board.slice()
    const g = moved.indexOf(GENERAL)
    moved[g - 9] = GENERAL // General stepped forward off the back rank
    moved[g] = 0
    expect(validateFormation(moved).errors.join()).toMatch(/General/)
  })
})

describe('fairness check', () => {
  it('flags facing chariots on an open file', () => {
    const board = classicFormation().board.slice()
    // Clear the a-file soldiers so the corner chariots face each other.
    board[3 * 9] = 0
    board[6 * 9] = 0
    expect(findFreeMaterial(board)).toBe('red')
  })
  it('accepts the classic position', () => {
    expect(findFreeMaterial(classicFormation().board)).toBeNull()
  })
})

describe('seeds', () => {
  it('look like INK-XXXXXX', () => {
    for (let i = 0; i < 50; i++) expect(randomSeed()).toMatch(/^INK-[0-9A-F]{6}$/)
  })
  it('rng is deterministic and in [0, 1)', () => {
    const a = createRng('x'), b = createRng('x')
    for (let i = 0; i < 100; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

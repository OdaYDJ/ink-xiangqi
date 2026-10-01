import { describe, expect, it } from 'vitest'
import { INK_COLORS, randomInk, seedLabel, toSeed } from '../src/game/inkColors'
import { createFormation, createRng, generateFormation } from '../src/game/randomizer'
import { validateFormation } from '../src/game/validator'

describe('game names (局號)', () => {
  it('every name deals a valid, reproducible formation', () => {
    for (const ink of INK_COLORS) {
      const f = generateFormation(ink.zh)
      expect(validateFormation(f.board).valid).toBe(true)
      expect(f.board).toEqual(generateFormation(ink.zh).board)
    }
  })

  it('the Chinese and English names are the same formation', () => {
    for (const ink of INK_COLORS) {
      expect(toSeed(ink.en)).toBe(ink.zh)
      expect(toSeed(ink.en.toUpperCase())).toBe(ink.zh)
      expect(generateFormation(toSeed(ink.en)).board).toEqual(generateFormation(ink.zh).board)
    }
  })

  it('shows each name in the reader’s language, and leaves free text alone', () => {
    expect(seedLabel('寒江獨釣', 'en')).toBe('Lone Angler')
    expect(seedLabel('寒江獨釣', 'zh')).toBe('寒江獨釣')
    expect(seedLabel('我的一局', 'en')).toBe('我的一局')
    expect(toSeed('Evening Rain')).toBe('Evening Rain')
  })

  it('draws a different name each time', () => {
    const rng = createRng('draws')
    let current = randomInk(undefined, rng)
    for (let i = 0; i < 100; i++) {
      const next = randomInk(current, rng)
      expect(next).not.toBe(current)
      expect(INK_COLORS.map((c) => c.zh)).toContain(next)
      current = next
    }
    expect(randomInk('Lone Angler', () => 0)).not.toBe('寒江獨釣')
  })

  it('random formations are named by a game name, and old INK- codes still replay', () => {
    const f = createFormation('random')
    expect(INK_COLORS.map((c) => c.zh)).toContain(f.seed)
    expect(validateFormation(generateFormation('INK-7F3A92').board).valid).toBe(true)
  })
})

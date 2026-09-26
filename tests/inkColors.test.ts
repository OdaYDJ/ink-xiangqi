import { describe, expect, it } from 'vitest'
import { INK_COLORS, randomInk, seedLabel, toSeed } from '../src/game/inkColors'
import { createFormation, createRng, generateFormation } from '../src/game/randomizer'
import { validateFormation } from '../src/game/validator'

describe('ink colours (墨色)', () => {
  it('every ink deals a valid, reproducible formation', () => {
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

  it('shows each ink in the reader’s language, and leaves free text alone', () => {
    expect(seedLabel('焦墨', 'en')).toBe('Scorched Ink')
    expect(seedLabel('焦墨', 'zh')).toBe('焦墨')
    expect(seedLabel('我的一局', 'en')).toBe('我的一局')
    expect(toSeed('Evening Rain')).toBe('Evening Rain')
  })

  it('draws a different ink each time', () => {
    const rng = createRng('draws')
    let current = randomInk(undefined, rng)
    for (let i = 0; i < 100; i++) {
      const next = randomInk(current, rng)
      expect(next).not.toBe(current)
      expect(INK_COLORS.map((c) => c.zh)).toContain(next)
      current = next
    }
    expect(randomInk('Scorched Ink', () => 0)).not.toBe('焦墨')
  })

  it('random formations are named by an ink, and old INK- codes still replay', () => {
    const f = createFormation('random')
    expect(INK_COLORS.map((c) => c.zh)).toContain(f.seed)
    expect(validateFormation(generateFormation('INK-7F3A92').board).valid).toBe(true)
  })
})

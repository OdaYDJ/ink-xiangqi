/**
 * The ink colours (墨色) that name random formations.
 *
 * A formation's seed is the ink's Chinese name — the canonical key — so 焦墨
 * and "Scorched Ink" deal the same board in either language. Anything else a
 * player types is used as-is.
 */
export interface InkColor {
  /** Canonical seed and Chinese display name. */
  zh: string
  en: string
}

export const INK_COLORS: readonly InkColor[] = [
  // 墨分五色: the five tones of ink.
  { zh: '焦墨', en: 'Scorched Ink' },
  { zh: '濃墨', en: 'Dense Ink' },
  { zh: '重墨', en: 'Heavy Ink' },
  { zh: '淡墨', en: 'Light Ink' },
  { zh: '清墨', en: 'Clear Ink' },
  // Inks and the ways they are laid down.
  { zh: '松煙', en: 'Pine Soot' },
  { zh: '油煙', en: 'Oil Soot' },
  { zh: '宿墨', en: 'Aged Ink' },
  { zh: '潑墨', en: 'Splashed Ink' },
  { zh: '破墨', en: 'Broken Ink' },
  { zh: '積墨', en: 'Layered Ink' },
  { zh: '枯墨', en: 'Dry Ink' },
]

const byName = new Map<string, InkColor>()
for (const ink of INK_COLORS) {
  byName.set(ink.zh, ink)
  byName.set(ink.en.toLowerCase(), ink)
}

const find = (text: string) => byName.get(text.trim()) ?? byName.get(text.trim().toLowerCase())

/** The seed for what the player sees or typed: an ink's canonical name, or the text itself. */
export const toSeed = (text: string): string => find(text)?.zh ?? text

/** How a seed reads in the current language: an ink's localized name, or the seed itself. */
export const seedLabel = (seed: string, locale: 'en' | 'zh'): string => {
  const ink = find(seed)
  return ink ? ink[locale] : seed
}

/** A random ink colour's seed, different from `current` when possible. */
export function randomInk(current?: string, random: () => number = Math.random): string {
  const exclude = current ? toSeed(current) : null
  const choices = INK_COLORS.filter((ink) => ink.zh !== exclude)
  return choices[Math.floor(random() * choices.length)].zh
}

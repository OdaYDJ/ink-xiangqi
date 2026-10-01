/**
 * The game names (局號) that name random formations: four-character poetic phrases.
 *
 * A formation's seed is the name's Chinese form — the canonical key — so 寒江獨釣
 * and "Lone Angler" deal the same board in either language. Anything else a
 * player types is used as-is.
 */
export interface InkColor {
  /** Canonical seed and Chinese display name. */
  zh: string
  en: string
}

export const INK_COLORS: readonly InkColor[] = [
  // Rivers, hills and night, after the Tang poets.
  { zh: '寒江獨釣', en: 'Lone Angler' },
  { zh: '楓橋夜泊', en: 'Maple Bridge' },
  { zh: '空山新雨', en: 'Fresh Rain' },
  { zh: '明月松間', en: 'Pine Moon' },
  { zh: '清泉石上', en: 'Rock Spring' },
  { zh: '曲徑通幽', en: 'Winding Path' },
  { zh: '秋水長天', en: 'Autumn Sky' },
  { zh: '落霞孤鶩', en: 'Last Light' },
  { zh: '月落烏啼', en: 'Moonset' },
  // Water, cloud and the garden by the pond.
  { zh: '行雲流水', en: 'Cloud Drift' },
  { zh: '高山流水', en: 'Hill Stream' },
  { zh: '煙雨江南', en: 'Misty South' },
  { zh: '疏影暗香', en: 'Plum Shade' },
  { zh: '竹林聽雨', en: 'Bamboo Rain' },
  { zh: '一葦渡江', en: 'Reed Ferry' },
  { zh: '魚戲蓮葉', en: 'Lotus Koi' },
]

const byName = new Map<string, InkColor>()
for (const ink of INK_COLORS) {
  byName.set(ink.zh, ink)
  byName.set(ink.en.toLowerCase(), ink)
}

const find = (text: string) => byName.get(text.trim()) ?? byName.get(text.trim().toLowerCase())

/** The seed for what the player sees or typed: a game name's canonical form, or the text itself. */
export const toSeed = (text: string): string => find(text)?.zh ?? text

/** How a seed reads in the current language: a game name in that language, or the seed itself. */
export const seedLabel = (seed: string, locale: 'en' | 'zh'): string => {
  const ink = find(seed)
  return ink ? ink[locale] : seed
}

/** A random game name's seed, different from `current` when possible. */
export function randomInk(current?: string, random: () => number = Math.random): string {
  const exclude = current ? toSeed(current) : null
  const choices = INK_COLORS.filter((ink) => ink.zh !== exclude)
  return choices[Math.floor(random() * choices.length)].zh
}

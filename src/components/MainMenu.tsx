import { useState, type FormEvent } from 'react'
import type { Difficulty } from '../ai/difficulty'
import { useLocale } from '../i18n/locale'
import { normalizeSeed, randomSeed, type GameMode } from '../game/randomizer'
import BrushRule from './BrushRule'
import Couplet from './Couplet'
import DifficultySelector from './DifficultySelector'
import LanguageToggle from './LanguageToggle'
import Seal from './Seal'

export type Opponent = Difficulty | 'human'

export interface GameConfig {
  mode: GameMode
  seed: string
  opponent: Opponent
  /** Optional custom start position (Xiangqi FEN), used for debugging and shared puzzles. */
  fen?: string
}

interface MainMenuProps {
  initialMode: GameMode
  /** The 墨局 field. Kept by the app so it survives trips to the game and back. */
  seed: string
  onSeedChange: (seed: string) => void
  onStart: (config: GameConfig) => void
}

/** Seeds are INK-XXXXXX codes or free-form names: any letters (including Chinese), digits, spaces, “-” or “·”. */
const SEED_PATTERN = /^[\p{L}\p{N}\- ·]{1,32}$/u
const MODES: GameMode[] = ['random', 'classic']

export default function MainMenu({ initialMode, seed, onSeedChange: setSeed, onStart }: MainMenuProps) {
  const { t } = useLocale()
  const [mode, setMode] = useState<GameMode>(initialMode)
  const [draws, setDraws] = useState(0)
  const cleanSeed = normalizeSeed(seed)
  const seedError = cleanSeed !== '' && !SEED_PATTERN.test(cleanSeed)

  // The small shuffle mark draws a different ink-style name; the field is otherwise left exactly as the player set it.
  const drawInkName = () => {
    const choices = t.inkNames.filter((n) => n !== seed)
    setSeed(choices[Math.floor(Math.random() * choices.length)])
    setDraws((n) => n + 1)
  }

  const start = (opponent: Opponent) => {
    if (seedError) return
    onStart({ mode, opponent, seed: cleanSeed || randomSeed() })
  }

  return (
    <section className="menu screen">
      <div className="menu__frontispiece">
        <div className="menu__title-block">
          <h1 className="menu__title" lang="zh-Hant" aria-label={`墨弈 · ${t.subtitle}`}>墨弈</h1>
          <Couplet className="menu__couplet" />
          <div className="menu__signature">
            <p className="menu__subtitle">{t.subtitle}</p>
            <Seal text="墨弈" size={40} variant="raised" />
          </div>
        </div>
        {t.coupletTranslation && <p className="menu__translation">{t.coupletTranslation}</p>}
      </div>

      <div className="menu__choices">
        <p className="label">{t.playLabel}</p>
        <DifficultySelector onSelect={start} />

        <BrushRule seed="menu-rule" width={164} />

        <div className="menu__modes" role="radiogroup" aria-label={t.formationLabel}>
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              className={`quiet-button menu__mode${mode === m ? ' is-active' : ''}`}
              onClick={() => setMode(m)}
            >
              {t.modes[m]}
            </button>
          ))}
        </div>

        {mode === 'random' && (
          <form className="menu__seed" onSubmit={(e: FormEvent) => e.preventDefault()}>
            <label htmlFor="seed">{t.seed}</label>
            <span className="menu__seed-field">
              <input
                id="seed"
                key={draws}
                className={`menu__seed-input${draws > 0 ? ' is-drawn' : ''}`}
                value={seed}
                placeholder={t.seedPlaceholder}
                spellCheck={false}
                autoComplete="off"
                maxLength={32}
                aria-invalid={seedError}
                aria-describedby={seedError ? 'seed-error' : undefined}
                onChange={(e) => setSeed(e.target.value)}
              />
              <button
                type="button"
                className={`menu__seed-draw${draws > 0 ? ' is-drawn' : ''}`}
                onClick={drawInkName}
                title={t.seedDraw}
                aria-label={t.seedDraw}
              >
                <svg key={draws} viewBox="0 0 20 20" width="19" height="19" aria-hidden="true">
                  <path d="M2.5 6H5.5C9.5 6 10.5 14 14.5 14H17" />
                  <path d="M2.5 14H5.5C9.5 14 10.5 6 14.5 6H17" />
                  <path d="M14.8 3.8L17.2 6L14.8 8.2" />
                  <path d="M14.8 11.8L17.2 14L14.8 16.2" />
                </svg>
              </button>
            </span>
          </form>
        )}
        {seedError && <p id="seed-error" className="menu__error">{t.seedError}</p>}

        <button type="button" className="quiet-button menu__local" onClick={() => start('human')}>
          {t.twoPlayers}
        </button>
        <LanguageToggle className="menu__language" />
      </div>
    </section>
  )
}

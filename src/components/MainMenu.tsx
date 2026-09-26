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
  initialSeed: string | null
  onStart: (config: GameConfig) => void
}

const SEED_PATTERN = /^[A-Z0-9-]{1,24}$/
const MODES: GameMode[] = ['random', 'classic']

export default function MainMenu({ initialMode, initialSeed, onStart }: MainMenuProps) {
  const { t } = useLocale()
  const [mode, setMode] = useState<GameMode>(initialMode)
  const [seed, setSeed] = useState(initialSeed ?? '')
  const cleanSeed = normalizeSeed(seed)
  const seedError = cleanSeed !== '' && !SEED_PATTERN.test(cleanSeed)

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

        <BrushRule seed="menu-rule" width={150} />

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
            <input
              id="seed"
              value={seed}
              placeholder={t.seedPlaceholder}
              spellCheck={false}
              autoComplete="off"
              maxLength={24}
              aria-invalid={seedError}
              aria-describedby={seedError ? 'seed-error' : undefined}
              onChange={(e) => setSeed(e.target.value)}
            />
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

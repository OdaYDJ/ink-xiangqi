import { useState, type FormEvent } from 'react'
import type { Difficulty } from '../ai/difficulty'
import { useLocale } from '../i18n/locale'
import { randomInk, seedLabel, toSeed } from '../game/inkColors'
import { normalizeSeed, type GameMode } from '../game/randomizer'
import DifficultySelector from './DifficultySelector'
import LanguageToggle from './LanguageToggle'
import CarvedPanel from './CarvedPanel'
import { UI_VERSION } from '../theme'

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
  /** The 局號 field (a canonical game name or free text). Kept by the app so it survives trips to the game and back. */
  seed: string
  onSeedChange: (seed: string) => void
  onStart: (config: GameConfig) => void
}

/** Seeds are INK-XXXXXX codes or free-form names: any letters (including Chinese), digits, spaces, “-” or “·”. */
const SEED_PATTERN = /^[\p{L}\p{N}\- ·]{1,32}$/u
const MODES: GameMode[] = ['random', 'classic']

export default function MainMenu({ initialMode, seed, onSeedChange: setSeed, onStart }: MainMenuProps) {
  const { t, locale } = useLocale()
  const [mode, setMode] = useState<GameMode>(initialMode)
  const [draws, setDraws] = useState(0)
  const cleanSeed = normalizeSeed(seed)
  const seedError = cleanSeed !== '' && !SEED_PATTERN.test(cleanSeed)

  // The small shuffle mark draws a different game name; the field is otherwise left exactly as the player set it.
  const drawInkName = () => {
    setSeed(randomInk(seed))
    setDraws((n) => n + 1)
  }

  const start = (opponent: Opponent) => {
    if (seedError) return
    onStart({ mode, opponent, seed: cleanSeed ? toSeed(cleanSeed) : randomInk() })
  }

  return (
    <section className="menu screen">
      <div className="menu__frontispiece">
        <div className="menu__title-block">
          <h1 className="menu__title" lang="zh-Hant" aria-label={`象奇 · ${t.subtitle}`}>象奇</h1>
          <p className="menu__subtitle" lang="en" aria-hidden="true">{t.subtitle}</p>
        </div>
      </div>

      <div className="menu__choices">
        {UI_VERSION === 'v3' && <CarvedPanel className="menu__panel" thickness={7} surface="#0b2624" surfaceAlpha={205} seed={3} />}
        <section className="menu__section" aria-labelledby="menu-play">
          <p className="label" id="menu-play">{t.playLabel}</p>
          <DifficultySelector onSelect={start} />
        </section>

        <section className="menu__section" aria-labelledby="menu-formation">
          <p className="label" id="menu-formation">{t.formationLabel}</p>
          <div className="menu__modes" role="radiogroup" aria-labelledby="menu-formation">
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
                  value={seedLabel(seed, locale)}
                  placeholder={t.seedPlaceholder}
                  spellCheck={false}
                  autoComplete="off"
                  maxLength={32}
                  aria-invalid={seedError}
                  aria-describedby={seedError ? 'seed-error' : undefined}
                  onChange={(e) => setSeed(toSeed(e.target.value))}
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
        </section>

        <footer className="menu__footer">
          <button type="button" className="quiet-button menu__local" onClick={() => start('human')}>
            {/* The short name stands in on narrow screens (CSS shows one; the hidden one is not read out). */}
            <span className="menu__local-full">{t.twoPlayers}</span>
            <span className="menu__local-short">{t.meta.twoPlayers}</span>
          </button>
          <span className="menu__footer-dot" aria-hidden="true" />
          <LanguageToggle className="menu__language" />
        </footer>
      </div>
    </section>
  )
}

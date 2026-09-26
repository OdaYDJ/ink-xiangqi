import { useState, type FormEvent } from 'react'
import type { Difficulty } from '../ai/difficulty'
import { normalizeSeed, randomSeed, type GameMode } from '../game/randomizer'
import BrushRule from './BrushRule'
import DifficultySelector from './DifficultySelector'
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

const MODES: { mode: GameMode; title: string; label: string }[] = [
  { mode: 'random', title: '奇局', label: 'Random' },
  { mode: 'classic', title: '古局', label: 'Classic' },
]

export default function MainMenu({ initialMode, initialSeed, onStart }: MainMenuProps) {
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
      <div className="menu__title-block">
        <h1 className="menu__title" lang="zh-Hant">墨弈</h1>
        <div className="menu__signature">
          <p className="menu__subtitle">Ink Xiangqi</p>
          <Seal text="墨弈" size={44} variant="raised" title="墨弈 seal" />
        </div>
      </div>

      <div className="menu__choices">
        <p className="label">
          <span lang="zh-Hant">對弈</span> Play against
        </p>
        <DifficultySelector onSelect={start} />

        <BrushRule seed="menu-rule" width={150} />

        <div className="menu__modes" role="radiogroup" aria-label="Starting formation">
          {MODES.map(({ mode: m, title, label }) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              className={`quiet-button menu__mode${mode === m ? ' is-active' : ''}`}
              onClick={() => setMode(m)}
            >
              <span lang="zh-Hant">{title}</span> {label}
            </button>
          ))}
        </div>

        {mode === 'random' && (
          <form className="menu__seed" onSubmit={(e: FormEvent) => e.preventDefault()}>
            <label htmlFor="seed">Seed</label>
            <input
              id="seed"
              value={seed}
              placeholder="drawn at random"
              spellCheck={false}
              autoComplete="off"
              maxLength={24}
              aria-invalid={seedError}
              aria-describedby={seedError ? 'seed-error' : undefined}
              onChange={(e) => setSeed(e.target.value)}
            />
          </form>
        )}
        {seedError && <p id="seed-error" className="menu__error">Seeds use letters, digits and “-”.</p>}

        <button type="button" className="quiet-button menu__local" onClick={() => start('human')}>
          <span lang="zh-Hant">雙人</span> Two players, one board
        </button>
      </div>
    </section>
  )
}

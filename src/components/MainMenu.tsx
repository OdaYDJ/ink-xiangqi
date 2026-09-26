import { useState, type FormEvent } from 'react'
import type { Difficulty } from '../ai/difficulty'
import { normalizeSeed, randomSeed, type GameMode } from '../game/randomizer'
import DifficultySelector from './DifficultySelector'

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
      <h1 className="menu__title">墨弈</h1>
      <p className="menu__subtitle">Ink Xiangqi</p>

      <hr className="brush-rule" />

      <p className="menu__label">Play</p>
      <DifficultySelector onSelect={start} />

      <hr className="brush-rule" />

      <div className="menu__mode" role="radiogroup" aria-label="Formation">
        {(['random', 'classic'] as GameMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            className={`ink-button menu__mode-option${mode === m ? ' is-active' : ''}`}
            onClick={() => setMode(m)}
          >
            {m === 'random' ? 'Random Xiangqi' : 'Classic'}
          </button>
        ))}
      </div>

      {mode === 'random' && (
        <form className="menu__seed" onSubmit={(e: FormEvent) => e.preventDefault()}>
          <label htmlFor="seed">Seed</label>
          <input
            id="seed"
            value={seed}
            placeholder="random"
            spellCheck={false}
            autoComplete="off"
            maxLength={24}
            aria-invalid={seedError}
            onChange={(e) => setSeed(e.target.value)}
          />
        </form>
      )}
      {seedError && <p className="menu__error">Seeds use letters, digits and “-”.</p>}

      <button type="button" className="ink-button menu__local" onClick={() => start('human')}>
        Pass &amp; play
      </button>
    </section>
  )
}

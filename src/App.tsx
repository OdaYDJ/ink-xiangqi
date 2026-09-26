import { useState } from 'react'
import Game from './components/Game'
import MainMenu, { type GameConfig } from './components/MainMenu'
import { parseFen } from './game/board'
import { createGame } from './game/gameState'
import { normalizeSeed, randomSeed, type GameMode } from './game/randomizer'

const load = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — preferences just won't persist */
  }
}

/** A shared link like …/ink-xiangqi/?seed=INK-7F3A92 opens the menu with that formation. */
const urlSeed = (() => {
  const s = new URLSearchParams(window.location.search).get('seed')
  return s ? normalizeSeed(s) : null
})()

/** …/?fen=<xiangqi fen> opens a pass-and-play game from that position (debugging, puzzles). */
const urlGame = ((): GameConfig | null => {
  const fen = new URLSearchParams(window.location.search).get('fen')
  if (!fen) return null
  try {
    const board = parseFen(fen)
    return createGame(board) && { mode: 'classic', seed: '', opponent: 'human', fen }
  } catch {
    return null
  }
})()

export default function App() {
  const [config, setConfig] = useState<GameConfig | null>(urlGame)
  const [soundOn, setSoundOn] = useState(load('ink.sound') !== 'off')
  const initialMode: GameMode = urlSeed ? 'random' : load('ink.mode') === 'classic' ? 'classic' : 'random'

  const start = (c: GameConfig) => {
    save('ink.mode', c.mode)
    setConfig(c)
  }

  const toggleSound = () => {
    save('ink.sound', soundOn ? 'off' : 'on')
    setSoundOn(!soundOn)
  }

  return (
    <main className="app">
      {config ? (
        <Game
          config={config}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          onNewFormation={() => setConfig({ ...config, seed: randomSeed() })}
          onMenu={() => setConfig(null)}
        />
      ) : (
        <MainMenu initialMode={initialMode} initialSeed={urlSeed} onStart={start} />
      )}
    </main>
  )
}

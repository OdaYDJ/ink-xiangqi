import { useEffect, useState } from 'react'
import Game from './components/Game'
import Landscape from './components/Landscape'
import WaterScene from './components/WaterScene'
import PondScene from './components/PondScene'
import MusicControl from './components/MusicControl'
import { music } from './audio/musicController'
import { initSfx } from './audio/sfx'
import { useLocale } from './i18n/locale'
import MainMenu, { type GameConfig } from './components/MainMenu'
import { parseFen } from './game/board'
import { createGame } from './game/gameState'
import { randomInk, toSeed } from './game/inkColors'
import { normalizeSeed, type GameMode } from './game/randomizer'
import { UI_VERSION } from './theme'

const Scene = { v1: Landscape, v2: WaterScene, v3: PondScene }[UI_VERSION]

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

/** A shared link like …/ink-xiangqi/?seed=焦墨 (or ?seed=Scorched%20Ink) opens the menu with that formation. */
const urlSeed = (() => {
  const s = new URLSearchParams(window.location.search).get('seed')
  return s ? toSeed(normalizeSeed(s)) : null
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
  const { locale } = useLocale()
  const [config, setConfig] = useState<GameConfig | null>(urlGame)
  const [menuSeed, setMenuSeed] = useState(urlSeed ?? '')

  // One music element for the whole app; it waits for the first interaction before making a sound.
  useEffect(() => music.init(), [])
  useEffect(() => initSfx(), [])
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
    <main className={`app ui-${UI_VERSION} lang-${locale} ${config ? 'is-playing' : 'is-menu'}`}>
      <Scene spreadKey={config ? `game-${config.seed}-${config.opponent}` : 'menu'} />
      {config ? (
        <Game
          config={config}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          onNewFormation={() => setConfig({ ...config, seed: randomInk(config.seed) })}
          onMenu={() => setConfig(null)}
        />
      ) : (
        <MainMenu initialMode={initialMode} seed={menuSeed} onSeedChange={setMenuSeed} onStart={start} />
      )}
      <MusicControl />
    </main>
  )
}

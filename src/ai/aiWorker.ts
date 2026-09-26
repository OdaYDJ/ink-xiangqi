/// <reference lib="webworker" />
import type { GameState } from '../game/gameState'
import { chooseMove, type Difficulty } from './difficulty'

export interface AiRequest {
  id: number
  state: GameState
  difficulty: Difficulty
}

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, state, difficulty } = e.data
  try {
    const result = chooseMove(state, difficulty)
    self.postMessage({ id, result })
  } catch (err) {
    self.postMessage({ id, error: String(err) })
  }
}

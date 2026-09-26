import type { GameState } from '../game/gameState'
import { chooseMove, type Difficulty } from './difficulty'
import type { SearchResult } from './minimax'

interface Pending {
  state: GameState
  difficulty: Difficulty
  resolve: (r: SearchResult) => void
  reject: (e: Error) => void
}

const onMainThread = (state: GameState, difficulty: Difficulty) =>
  new Promise<SearchResult>((resolve) => setTimeout(() => resolve(chooseMove(state, difficulty)), 0))

/**
 * Runs the AI in a Web Worker so the board stays responsive while it thinks.
 * If the worker can't be created or crashes, requests run on the main thread instead.
 */
export class AiClient {
  private worker: Worker | null = null
  private nextId = 1
  private pending = new Map<number, Pending>()

  constructor() {
    try {
      this.worker = new Worker(new URL('./aiWorker.ts', import.meta.url), { type: 'module' })
      this.worker.onmessage = (e) => {
        const { id, result, error } = e.data
        const p = this.pending.get(id)
        if (!p) return
        this.pending.delete(id)
        if (error) p.reject(new Error(error))
        else p.resolve(result)
      }
      this.worker.onerror = () => this.fallBack()
    } catch {
      this.worker = null
    }
  }

  requestMove(state: GameState, difficulty: Difficulty): Promise<SearchResult> {
    if (!this.worker) return onMainThread(state, difficulty)
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { state, difficulty, resolve, reject })
      this.worker!.postMessage({ id, state, difficulty })
    })
  }

  private fallBack() {
    this.worker?.terminate()
    this.worker = null
    for (const p of this.pending.values()) onMainThread(p.state, p.difficulty).then(p.resolve, p.reject)
    this.pending.clear()
  }

  dispose() {
    this.worker?.terminate()
    this.worker = null
    this.pending.clear()
  }
}

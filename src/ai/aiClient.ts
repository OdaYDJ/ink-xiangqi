import type { GameState } from '../game/gameState'
import { chooseMove, type Difficulty } from './difficulty'
import type { SearchResult } from './minimax'

/**
 * Runs the AI in a Web Worker so the board stays responsive while it thinks.
 * Falls back to the main thread where workers are unavailable.
 */
export class AiClient {
  private worker: Worker | null = null
  private nextId = 1
  private pending = new Map<number, { resolve: (r: SearchResult) => void; reject: (e: Error) => void }>()

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
    if (!this.worker) return new Promise((resolve) => setTimeout(() => resolve(chooseMove(state, difficulty)), 0))
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.worker!.postMessage({ id, state, difficulty })
    })
  }

  /** Worker failed to load (e.g. blocked): answer queued requests on the main thread. */
  private fallBack() {
    this.worker?.terminate()
    this.worker = null
    this.pending.forEach((p) => p.reject(new Error('AI worker unavailable')))
    this.pending.clear()
  }

  dispose() {
    this.worker?.terminate()
    this.worker = null
    this.pending.clear()
  }
}

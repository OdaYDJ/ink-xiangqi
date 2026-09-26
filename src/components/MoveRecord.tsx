import { useMemo } from 'react'
import type { MoveRecord as Move } from '../game/move'
import { gameNotation } from '../game/notation'
import type { Board } from '../game/board'

interface MoveRecordProps {
  initialBoard: Board
  history: Move[]
  /** How many recent moves to show. */
  limit?: number
}

/** The game record in Chinese notation, written like a colophon beside the painting. */
export default function MoveRecord({ initialBoard, history, limit = 16 }: MoveRecordProps) {
  const lines = useMemo(() => gameNotation(initialBoard, history), [initialBoard, history])
  const start = Math.max(0, lines.length - limit)
  if (lines.length === 0) return <p className="record record--empty">譜</p>
  return (
    <ol className="record" aria-label="Move record" start={start + 1}>
      {lines.slice(start).map((text, i) => {
        const ply = start + i
        return (
          <li key={ply} className={`record__move ${history[ply].piece > 0 ? 'is-red' : 'is-black'}${ply === lines.length - 1 ? ' is-latest' : ''}`}>
            {text}
          </li>
        )
      })}
    </ol>
  )
}

import { useMemo } from 'react'
import type { Board } from '../game/board'
import type { MoveRecord as Move } from '../game/move'
import { describeGame, formatChinese, formatWxf } from '../game/notation'
import { useLocale } from '../i18n/locale'

interface MoveRecordProps {
  initialBoard: Board
  history: Move[]
  /** How many recent moves to show. */
  limit?: number
}

/**
 * The game record, written like a colophon beside the painting:
 * traditional Chinese notation (炮二平五) or WXF for English (C2.5).
 */
export default function MoveRecord({ initialBoard, history, limit = 16 }: MoveRecordProps) {
  const { locale, t } = useLocale()
  const lines = useMemo(() => {
    const moves = describeGame(initialBoard, history)
    return moves.map((d) => (locale === 'zh' ? formatChinese(d, 'traditional') : formatWxf(d)))
  }, [initialBoard, history, locale])
  const start = Math.max(0, lines.length - limit)

  if (lines.length === 0) return <p className="record record--empty">{t.emptyRecord}</p>
  return (
    <ol className="record" aria-label={t.recordLabel} start={start + 1}>
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

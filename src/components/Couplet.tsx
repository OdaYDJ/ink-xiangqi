import { COUPLET, COUPLET_COLUMNS } from '../i18n/strings'

/** 一墨染，万象生；一局落，乾坤开 — brushed as two vertical columns, read right to left. */
export default function Couplet({ className = '' }: { className?: string }) {
  return (
    <p className={`couplet ${className}`} lang="zh-Hans" aria-label={COUPLET.join('')}>
      {COUPLET_COLUMNS.map((line) => (
        <span key={line} className="couplet__line" aria-hidden="true">
          {line}
        </span>
      ))}
    </p>
  )
}

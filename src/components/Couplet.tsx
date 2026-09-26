import { COUPLET, COUPLET_COLUMNS } from '../i18n/strings'

/** 一墨染，萬象生；一局落，乾坤開 — brushed as two vertical columns, read right to left. */
export default function Couplet({ className = '' }: { className?: string }) {
  return (
    <p className={`couplet ${className}`} lang="zh-Hant" aria-label={COUPLET.join('')}>
      {COUPLET_COLUMNS.map((line) => (
        <span key={line} className="couplet__line" aria-hidden="true">
          {line}
        </span>
      ))}
    </p>
  )
}

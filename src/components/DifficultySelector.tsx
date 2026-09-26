import { DIFFICULTIES, type Difficulty } from '../ai/difficulty'
import { useLocale } from '../i18n/locale'

interface DifficultySelectorProps {
  onSelect: (difficulty: Difficulty) => void
}

export default function DifficultySelector({ onSelect }: DifficultySelectorProps) {
  const { t } = useLocale()
  return (
    <ul className="difficulty">
      {DIFFICULTIES.map((d) => (
        <li key={d}>
          <button type="button" className="difficulty__option" onClick={() => onSelect(d)}>
            <span className="difficulty__title">{t.difficulty[d]}</span>
            <span className="difficulty__hint">{t.difficultyHint[d]}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

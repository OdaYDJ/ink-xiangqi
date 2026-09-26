import { DIFFICULTIES, DIFFICULTY_LABELS, DIFFICULTY_TITLES, type Difficulty } from '../ai/difficulty'

interface DifficultySelectorProps {
  onSelect: (difficulty: Difficulty) => void
}

export default function DifficultySelector({ onSelect }: DifficultySelectorProps) {
  return (
    <ul className="difficulty">
      {DIFFICULTIES.map((d) => (
        <li key={d}>
          <button type="button" className="difficulty__option" onClick={() => onSelect(d)}>
            <span className="difficulty__title" lang="zh-Hant">{DIFFICULTY_TITLES[d]}</span>
            <span className="difficulty__label">{DIFFICULTY_LABELS[d]}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

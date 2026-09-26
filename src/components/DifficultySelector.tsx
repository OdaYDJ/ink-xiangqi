import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from '../ai/difficulty'

interface DifficultySelectorProps {
  onSelect: (difficulty: Difficulty) => void
}

export default function DifficultySelector({ onSelect }: DifficultySelectorProps) {
  return (
    <ul className="difficulty">
      {DIFFICULTIES.map((d) => (
        <li key={d}>
          <button type="button" className="ink-button difficulty__option" onClick={() => onSelect(d)}>
            {DIFFICULTY_LABELS[d]}
          </button>
        </li>
      ))}
    </ul>
  )
}

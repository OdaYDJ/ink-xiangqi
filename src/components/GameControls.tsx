import { useLocale } from '../i18n/locale'
import LanguageToggle from './LanguageToggle'

interface GameControlsProps {
  canUndo: boolean
  soundOn: boolean
  onUndo: () => void
  onRestart: () => void
  onNewFormation: (() => void) | null
  onToggleSound: () => void
  onMenu: () => void
}

/** Quiet text controls, set like the small print of a colophon. */
export default function GameControls({
  canUndo, soundOn, onUndo, onRestart, onNewFormation, onToggleSound, onMenu,
}: GameControlsProps) {
  const { t } = useLocale()
  const c = t.controls
  return (
    <nav className="controls" aria-label={c.label}>
      <button type="button" className="quiet-button" onClick={onUndo} disabled={!canUndo} title={c.undoTitle}>
        {c.undo}
      </button>
      <button type="button" className="quiet-button" onClick={onRestart} title={c.restartTitle}>
        {c.restart}
      </button>
      {onNewFormation && (
        <button type="button" className="quiet-button" onClick={onNewFormation} title={c.newFormationTitle}>
          {c.newFormation}
        </button>
      )}
      <button type="button" className="quiet-button" onClick={onToggleSound} aria-pressed={soundOn}>
        {soundOn ? c.soundOn : c.soundOff}
      </button>
      <LanguageToggle />
      <button type="button" className="quiet-button" onClick={onMenu}>
        {c.menu}
      </button>
    </nav>
  )
}

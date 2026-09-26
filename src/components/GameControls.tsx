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
  return (
    <nav className="controls" aria-label="Game controls">
      <button type="button" className="quiet-button" onClick={onUndo} disabled={!canUndo} title="Take back your last move">
        Undo
      </button>
      <button type="button" className="quiet-button" onClick={onRestart} title="Replay this formation from the start">
        Restart
      </button>
      {onNewFormation && (
        <button type="button" className="quiet-button" onClick={onNewFormation} title="Deal a new random formation">
          New formation
        </button>
      )}
      <button type="button" className="quiet-button" onClick={onToggleSound} aria-pressed={soundOn}>
        {soundOn ? 'Sound on' : 'Sound off'}
      </button>
      <button type="button" className="quiet-button" onClick={onMenu}>
        Menu
      </button>
    </nav>
  )
}

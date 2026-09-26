interface GameControlsProps {
  canUndo: boolean
  soundOn: boolean
  onUndo: () => void
  onRestart: () => void
  onNewFormation: (() => void) | null
  onToggleSound: () => void
  onMenu: () => void
}

export default function GameControls({
  canUndo, soundOn, onUndo, onRestart, onNewFormation, onToggleSound, onMenu,
}: GameControlsProps) {
  return (
    <nav className="controls" aria-label="Game controls">
      <button type="button" className="ink-button" onClick={onUndo} disabled={!canUndo} title="Take back your last move">
        <span aria-hidden="true">↶</span> Undo
      </button>
      <button type="button" className="ink-button" onClick={onRestart} title="Replay this formation">
        Restart
      </button>
      {onNewFormation && (
        <button type="button" className="ink-button" onClick={onNewFormation} title="New random formation">
          New
        </button>
      )}
      <button
        type="button"
        className="ink-button"
        onClick={onToggleSound}
        aria-pressed={soundOn}
        title={soundOn ? 'Mute' : 'Sound on'}
      >
        {soundOn ? '聲' : '靜'}
      </button>
      <button type="button" className="ink-button" onClick={onMenu}>
        Menu
      </button>
    </nav>
  )
}

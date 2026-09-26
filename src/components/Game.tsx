import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AiClient } from '../ai/aiClient'
import { DIFFICULTY_LABELS } from '../ai/difficulty'
import {
  applyMove, createGame, legalTargets, undoMoves, type GameState,
} from '../game/gameState'
import { opponent, PIECE_NAMES, sideOf, typeOf, type Side } from '../game/piece'
import { findGeneral } from '../game/rules'
import { parseFen } from '../game/board'
import { createFormation, type Formation } from '../game/randomizer'
import type { Move } from '../game/move'
import { moveToString } from '../game/move'
import { AI_MIN_DELAY_MS, CAPTURE_FADE_MS, MOVE_MS } from '../rendering/animations'
import { playCaptureSound, playMoveSound } from '../rendering/sound'
import Board, { type PieceView } from './Board'
import GameControls from './GameControls'
import type { GameConfig } from './MainMenu'

interface GameProps {
  config: GameConfig
  soundOn: boolean
  onToggleSound: () => void
  onNewFormation: () => void
  onMenu: () => void
}

const HUMAN: Side = 'red'

/** Gives every piece a stable id (its starting square) so moves can animate. */
function trackPieces(state: GameState): PieceView[] {
  const ids = state.initialBoard.map((p, s) => (p ? s : -1))
  for (const m of state.history) {
    ids[m.to] = ids[m.from]
    ids[m.from] = -1
  }
  return state.board.flatMap((code, square) => (code ? [{ id: ids[square], square, code }] : []))
}

function describeMove(state: GameState): string {
  const m = state.history.at(-1)
  if (!m) return ''
  const who = sideOf(m.piece) === 'red' ? 'Red' : 'Black'
  const capture = m.captured ? `, takes ${PIECE_NAMES[typeOf(m.captured)]}` : ''
  return `${who} ${PIECE_NAMES[typeOf(m.piece)]} ${moveToString(m)}${capture}.`
}

export default function Game({ config, soundOn, onToggleSound, onNewFormation, onMenu }: GameProps) {
  const formation: Formation = useMemo(
    () => (config.fen ? { mode: 'classic', seed: null, board: parseFen(config.fen) } : createFormation(config.mode, config.seed)),
    [config],
  )
  const [game, setGame] = useState(() => createGame(formation.board))
  const [selected, setSelected] = useState<number | null>(null)
  const [ghost, setGhost] = useState<PieceView | null>(null)
  const [thinking, setThinking] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const ai = useRef<AiClient | null>(null)
  const soundRef = useRef(soundOn)
  soundRef.current = soundOn

  const vsAi = config.opponent !== 'human'
  const aiSide: Side | null = vsAi ? opponent(HUMAN) : null
  const pieces = useMemo(() => trackPieces(game), [game])

  useEffect(() => {
    ai.current = new AiClient()
    return () => ai.current?.dispose()
  }, [])

  // New formation / restart.
  useEffect(() => {
    setGame(createGame(formation.board))
    setSelected(null)
    setGhost(null)
  }, [formation])

  const play = useCallback((state: GameState, move: Move) => {
    const next = applyMove(state, move)
    const record = next.history.at(-1)!
    if (record.captured) {
      const victim = trackPieces(state).find((p) => p.square === move.to)!
      setGhost(victim)
      window.setTimeout(() => setGhost((g) => (g === victim ? null : g)), CAPTURE_FADE_MS + MOVE_MS)
    }
    if (soundRef.current) window.setTimeout(record.captured ? playCaptureSound : playMoveSound, MOVE_MS * 0.8)
    setSelected(null)
    setGame(next)
  }, [])

  // Let the AI answer whenever it is its turn.
  useEffect(() => {
    if (!aiSide || game.turn !== aiSide || game.status !== 'playing' || config.opponent === 'human') return
    let cancelled = false
    setThinking(true)
    setAiError(null)
    const started = performance.now()
    ai.current!
      .requestMove(game, config.opponent)
      .then((result) => {
        const wait = Math.max(0, AI_MIN_DELAY_MS + MOVE_MS - (performance.now() - started))
        window.setTimeout(() => {
          if (cancelled) return
          setThinking(false)
          if (result.move) play(game, result.move)
        }, wait)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setThinking(false)
        setAiError(err.message)
      })
    return () => {
      cancelled = true
      setThinking(false)
    }
  }, [game, aiSide, config.opponent, play])

  const humanTurn = game.status === 'playing' && !thinking && (vsAi ? game.turn === HUMAN : true)
  const targets = useMemo(
    () => (selected !== null && humanTurn ? legalTargets(game, selected) : []),
    [game, selected, humanTurn],
  )

  const handlePoint = (square: number) => {
    if (!humanTurn) return
    if (selected !== null && targets.includes(square)) {
      play(game, { from: selected, to: square })
      return
    }
    const piece = game.board[square]
    if (piece && sideOf(piece) === game.turn && square !== selected) setSelected(square)
    else setSelected(null)
  }

  const undo = () => {
    // Against the AI, take back the AI's reply and your own move together.
    const plies = vsAi ? (game.turn === HUMAN ? 2 : 1) : 1
    setGame(undoMoves(game, Math.min(plies, game.history.length)))
    setSelected(null)
    setGhost(null)
  }

  const restart = () => {
    setGame(createGame(formation.board))
    setSelected(null)
    setGhost(null)
  }

  const last = game.history.at(-1) ?? null
  const checkSquare = game.inCheck && game.status !== 'draw' ? findGeneral(game.board, game.turn) : null
  const canUndo = !thinking && (vsAi ? game.history.some((m) => sideOf(m.piece) === HUMAN) : game.history.length > 0)

  return (
    <section className="game screen">
      <header className="game__header">
        <button type="button" className="game__title" onClick={onMenu} aria-label="Back to menu">墨弈</button>
      </header>

      <div className="board-wrap">
        <Board
          pieces={pieces}
          ghosts={ghost ? [ghost] : []}
          selected={selected}
          targets={targets}
          lastMove={last}
          checkSquare={checkSquare}
          interactive={humanTurn}
          onPointClick={handlePoint}
        />
        {game.status !== 'playing' && <GameOver game={game} vsAi={vsAi} />}
      </div>

      <p className="status" aria-live="polite">
        <StatusLine game={game} thinking={thinking} vsAi={vsAi} error={aiError} />
        <span className="visually-hidden">{describeMove(game)}</span>
      </p>

      <p className="game__meta">
        {vsAi ? `AI · ${DIFFICULTY_LABELS[config.opponent as keyof typeof DIFFICULTY_LABELS]}` : 'Pass & play'}
        <span className="game__dot">·</span>
        {formation.seed ? <span className="game__seed" title="Formation seed">{formation.seed}</span> : config.fen ? 'Custom position' : 'Classic'}
      </p>

      <GameControls
        canUndo={canUndo}
        soundOn={soundOn}
        onUndo={undo}
        onRestart={restart}
        onNewFormation={config.mode === 'random' ? onNewFormation : null}
        onToggleSound={onToggleSound}
        onMenu={onMenu}
      />
    </section>
  )
}

function StatusLine({ game, thinking, vsAi, error }: { game: GameState; thinking: boolean; vsAi: boolean; error: string | null }) {
  if (error) return <>The AI stumbled ({error}). Try Undo or Restart.</>
  if (game.status !== 'playing') return null
  const name = (s: Side) => (vsAi ? (s === HUMAN ? 'Your' : 'AI') : s === 'red' ? 'Red' : 'Black')
  if (thinking) return <span className="status__thinking">Thinking</span>
  return (
    <>
      {game.inCheck && <span className="status__check">將軍 · Check · </span>}
      {vsAi && game.turn === HUMAN ? 'Your move' : `${name(game.turn)} to move`}
    </>
  )
}

function GameOver({ game, vsAi }: { game: GameState; vsAi: boolean }) {
  let glyph = '和'
  let text = game.drawReason === 'repetition' ? 'Draw by repetition' : 'Draw'
  if (game.winner) {
    const humanWon = game.winner === HUMAN
    glyph = vsAi ? (humanWon ? '勝' : '負') : '勝'
    const how = game.status === 'checkmate' ? 'Checkmate' : 'No moves left'
    text = vsAi ? `${how} · ${humanWon ? 'You win' : 'The AI wins'}` : `${how} · ${game.winner === 'red' ? 'Red' : 'Black'} wins`
  }
  return (
    <div className="game-over" role="status">
      <span className={`game-over__glyph${game.winner && game.winner !== HUMAN && vsAi ? ' is-loss' : ''}`}>{glyph}</span>
      <span className="game-over__text">{text}</span>
    </div>
  )
}

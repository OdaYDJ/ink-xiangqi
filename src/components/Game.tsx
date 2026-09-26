import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AiClient } from '../ai/aiClient'
import { DIFFICULTY_LABELS, DIFFICULTY_TITLES } from '../ai/difficulty'
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
import MoveRecord from './MoveRecord'
import Seal from './Seal'
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
  const level = config.opponent === 'human' ? null : config.opponent

  return (
    <section className="game screen">
      <aside className="game__inscription">
        <button type="button" className="game__title" onClick={onMenu} aria-label="墨弈 — back to menu" lang="zh-Hant">
          墨弈
        </button>
        <p className="game__verse" lang="zh-Hant" aria-hidden="true">觀棋不語真君子</p>
        <Seal text="棋" size={30} className="game__seal" />
      </aside>

      <div className="board-wrap">
        <Board
          pieces={pieces}
          ghosts={ghost ? [ghost] : []}
          selected={selected}
          targets={targets}
          lastMove={last}
          moveKey={game.history.length}
          lastWasCapture={!!last?.captured}
          checkSquare={checkSquare}
          interactive={humanTurn}
          onPointClick={handlePoint}
        />
        {game.status !== 'playing' && <GameOver game={game} vsAi={vsAi} />}
      </div>

      <aside className="game__colophon">
        <p className="status" aria-live="polite">
          <StatusLine game={game} thinking={thinking} vsAi={vsAi} error={aiError} />
          <span className="visually-hidden">{describeMove(game)}</span>
        </p>
        <p className="game__meta">
          {level ? (
            <>
              <span lang="zh-Hant">{DIFFICULTY_TITLES[level]}</span> {DIFFICULTY_LABELS[level]}
            </>
          ) : (
            'Two players'
          )}
          <span className="game__dot" aria-hidden="true">·</span>
          {formation.seed ? (
            <span className="game__seed" title="Formation seed — share it to replay this layout">{formation.seed}</span>
          ) : config.fen ? 'Custom position' : 'Classic'}
        </p>
        <MoveRecord initialBoard={game.initialBoard} history={game.history} />
        <GameControls
          canUndo={canUndo}
          soundOn={soundOn}
          onUndo={undo}
          onRestart={restart}
          onNewFormation={config.mode === 'random' && !config.fen ? onNewFormation : null}
          onToggleSound={onToggleSound}
          onMenu={onMenu}
        />
      </aside>
    </section>
  )
}

function StatusLine({ game, thinking, vsAi, error }: { game: GameState; thinking: boolean; vsAi: boolean; error: string | null }) {
  if (error) return <>The computer couldn’t find a move ({error}). Undo or restart to continue.</>
  if (game.status !== 'playing') return <GameResultText game={game} vsAi={vsAi} />
  if (thinking) return <span className="status__thinking">Thinking</span>
  const name = (s: Side) => (s === 'red' ? 'Red' : 'Black')
  return (
    <>
      {game.inCheck && (
        <span className="status__check">
          <span lang="zh-Hant">將軍</span> Check ·{' '}
        </span>
      )}
      {vsAi ? (game.turn === HUMAN ? 'Your move' : 'Their move') : `${name(game.turn)} to move`}
    </>
  )
}

function GameResultText({ game, vsAi }: { game: GameState; vsAi: boolean }) {
  if (!game.winner) return <>{game.drawReason === 'repetition' ? 'Drawn by repetition' : 'Drawn'}</>
  const how = game.status === 'checkmate' ? 'Checkmate' : 'No moves left'
  const who = vsAi ? (game.winner === HUMAN ? 'you win' : 'the computer wins') : `${game.winner === 'red' ? 'Red' : 'Black'} wins`
  return <>{how} · {who}</>
}

function GameOver({ game, vsAi }: { game: GameState; vsAi: boolean }) {
  const glyph = !game.winner ? '和' : vsAi && game.winner !== HUMAN ? '負' : '勝'
  return (
    <div className="game-over" role="status">
      <Seal text={glyph} size={112} className="game-over__seal" title={glyph} />
      <span className="game-over__text"><GameResultText game={game} vsAi={vsAi} /></span>
    </div>
  )
}

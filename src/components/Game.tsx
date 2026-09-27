import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AiClient } from '../ai/aiClient'
import {
  applyMove, createGame, legalTargets, undoMoves, type GameState,
} from '../game/gameState'
import { opponent, sideOf, type Side } from '../game/piece'
import { findGeneral } from '../game/rules'
import { parseFen } from '../game/board'
import { seedLabel } from '../game/inkColors'
import { describeMove as describeNotation, formatChinese, formatWxf } from '../game/notation'
import { useLocale } from '../i18n/locale'
import type { Outcome, Strings } from '../i18n/strings'
import { createFormation, type Formation } from '../game/randomizer'
import type { Move } from '../game/move'
import { AI_MIN_DELAY_MS, CAPTURE_FADE_MS, MOVE_MS } from '../rendering/animations'
import { finaleInk } from '../rendering/inkFx'
import { playCaptureSound, playMoveSound } from '../audio/sfx'
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

/** Spoken summary of the last move for screen readers, in the reader's language. */
function announceLastMove(state: GameState, t: Strings, zh: boolean): string {
  const m = state.history.at(-1)
  if (!m) return ''
  const board = state.board.slice()
  board[m.from] = m.piece
  board[m.to] = m.captured
  const d = describeNotation(board, m)
  return t.announce(sideOf(m.piece)!, zh ? formatChinese(d, 'traditional') : formatWxf(d))
}

export default function Game({ config, soundOn, onToggleSound, onNewFormation, onMenu }: GameProps) {
  const { t, locale } = useLocale()
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
        <button type="button" className="game__title" onClick={onMenu} aria-label={`墨弈 · ${t.backToMenu}`} lang="zh-Hant">
          墨弈
        </button>
        {/* The verse and its seal: one vertical line beside the title on wide screens; on narrow ones,
            a two-line couplet left of the title, with the seal after it. */}
        <div className="game__verse-block">
          <p className="game__verse" lang="zh-Hant">
            <span className="game__verse-line">一墨入山水，</span>
            <span className="game__verse-line">一局落乾坤。</span>
          </p>
          <Seal text="棋" size={30} script="outline" className="game__seal" />
        </div>
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
        {game.status !== 'playing' && <GameOver game={game} vsAi={vsAi} t={t} />}
      </div>

      <aside className="game__colophon">
        <div className="game__info">
          <p className="status" aria-live="polite">
            <StatusLine game={game} thinking={thinking} vsAi={vsAi} error={aiError} t={t} />
            <span className="visually-hidden">{announceLastMove(game, t, locale === 'zh')}</span>
          </p>
          <p className="game__meta">
            {level ? t.difficulty[level] : t.meta.twoPlayers}
            <span className="game__dot" aria-hidden="true">·</span>
            {formation.seed ? (
              <span className="game__seed" title={t.meta.seedTitle}>{seedLabel(formation.seed, locale)}</span>
            ) : config.fen ? t.meta.custom : t.meta.classic}
          </p>
        </div>
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

function outcomeOf(game: GameState, vsAi: boolean): Outcome {
  if (!game.winner) return { kind: 'draw', reason: game.drawReason }
  return {
    kind: 'win',
    how: game.status === 'checkmate' ? 'checkmate' : 'stalemate',
    winner: game.winner,
    you: vsAi ? (game.winner === HUMAN ? 'won' : 'lost') : null,
  }
}

interface StatusProps {
  game: GameState
  thinking: boolean
  vsAi: boolean
  error: string | null
  t: Strings
}

function StatusLine({ game, thinking, vsAi, error, t }: StatusProps) {
  if (error) return <>{t.aiError(error)}</>
  if (game.status !== 'playing') return <>{t.outcome(outcomeOf(game, vsAi))}</>
  if (thinking) return <span className="status__thinking">{t.status.thinking}</span>
  return (
    <>
      {game.inCheck && <span className="status__check">{t.status.check} · </span>}
      {vsAi ? (game.turn === HUMAN ? t.status.yourMove : t.status.theirMove) : t.status.toMove(game.turn)}
    </>
  )
}

/**
 * 7. The close of a game, like finishing a painting: ink spreads slowly from the centre, a wash of paper
 * rises over it so the verdict can be read, a few motes drift off — then the seal is pressed and the words appear.
 */
function GameOver({ game, vsAi, t }: { game: GameState; vsAi: boolean; t: Strings }) {
  const glyph = !game.winner ? '和' : vsAi && game.winner !== HUMAN ? '負' : '勝'
  const ink = useMemo(() => finaleInk(`finale-${game.history.length}-${glyph}`), [game.history.length, glyph])
  return (
    <div className="game-over" role="status">
      <svg className="game-over__ink" viewBox="-100 -100 200 200" aria-hidden="true">
        <defs>
          <filter id="finale-bleed" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="17" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="12" result="d" />
            <feGaussianBlur in="d" stdDeviation="3.5" />
          </filter>
        </defs>
        <path className="game-over__bloom" d={ink.bloom} filter="url(#finale-bleed)" />
        <path className="game-over__veil" d={ink.veil} filter="url(#finale-bleed)" />
        {ink.motes.map((m, i) => (
          <g key={i} transform={`translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})`}>
            <path
              className="game-over__mote"
              d={m.d}
              style={{ '--dx': `${m.dx.toFixed(1)}px`, '--dy': `${m.dy.toFixed(1)}px`, animationDelay: `${m.delay}ms` } as CSSProperties}
            />
          </g>
        ))}
      </svg>
      <Seal text={glyph} size={112} script="outline" className="game-over__seal" title={glyph} />
      <span className="game-over__text">{t.outcome(outcomeOf(game, vsAi))}</span>
    </div>
  )
}

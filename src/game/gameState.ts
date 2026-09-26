import { toFen, type Board } from './board'
import { decodeMove, encodeMove, type Move, type MoveRecord } from './move'
import { opponent, type Side } from './piece'
import { generateLegalMoves, isInCheck, legalMovesFrom } from './rules'

export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw'
export type DrawReason = 'repetition' | 'no-progress'

/** Everything needed to describe a game. Plain JSON — safe to save, share or replay. */
export interface GameState {
  initialBoard: Board
  board: Board
  turn: Side
  history: MoveRecord[]
  status: GameStatus
  winner: Side | null
  drawReason: DrawReason | null
  inCheck: boolean
  /** Plies since the last capture. */
  quietPlies: number
  /** Position keys (FEN + side to move) seen so far, for repetition detection. */
  positions: string[]
}

/** 60 full moves without a capture is declared a draw. */
export const NO_PROGRESS_LIMIT = 120
export const REPETITION_LIMIT = 3

const positionKey = (board: Board, turn: Side) => `${toFen(board)} ${turn === 'red' ? 'w' : 'b'}`

export function createGame(initialBoard: Board, turn: Side = 'red'): GameState {
  const state: GameState = {
    initialBoard: initialBoard.slice(),
    board: initialBoard.slice(),
    turn,
    history: [],
    status: 'playing',
    winner: null,
    drawReason: null,
    inCheck: false,
    quietPlies: 0,
    positions: [positionKey(initialBoard, turn)],
  }
  return resolveStatus(state)
}

function resolveStatus(state: GameState): GameState {
  state.inCheck = isInCheck(state.board, state.turn)
  if (generateLegalMoves(state.board, state.turn).length === 0) {
    // In Xiangqi a player with no legal moves loses, whether in check or not.
    state.status = state.inCheck ? 'checkmate' : 'stalemate'
    state.winner = opponent(state.turn)
    return state
  }
  const key = state.positions[state.positions.length - 1]
  if (state.positions.filter((p) => p === key).length >= REPETITION_LIMIT) {
    state.status = 'draw'
    state.drawReason = 'repetition'
  } else if (state.quietPlies >= NO_PROGRESS_LIMIT) {
    state.status = 'draw'
    state.drawReason = 'no-progress'
  }
  return state
}

export function isLegalMove(state: GameState, move: Move): boolean {
  if (state.status !== 'playing') return false
  const m = encodeMove(move.from, move.to)
  return legalMovesFrom(state.board, move.from, state.turn).includes(m)
}

/** Returns the new state after `move`, or throws if the move is illegal. Never mutates `state`. */
export function applyMove(state: GameState, move: Move): GameState {
  if (!isLegalMove(state, move)) throw new Error(`Illegal move ${move.from}→${move.to}`)
  const board = state.board.slice()
  const piece = board[move.from]
  const captured = board[move.to]
  board[move.to] = piece
  board[move.from] = 0
  const turn = opponent(state.turn)
  const next: GameState = {
    ...state,
    board,
    turn,
    history: [...state.history, { from: move.from, to: move.to, piece, captured }],
    quietPlies: captured ? 0 : state.quietPlies + 1,
    positions: [...state.positions, positionKey(board, turn)],
  }
  return resolveStatus(next)
}

/** Rebuilds the game with the last `plies` moves taken back. */
export function undoMoves(state: GameState, plies: number): GameState {
  const keep = state.history.slice(0, Math.max(0, state.history.length - plies))
  const firstTurn: Side = state.history.length % 2 === 0 ? state.turn : opponent(state.turn)
  return keep.reduce((s, m) => applyMove(s, m), createGame(state.initialBoard, firstTurn))
}

export function legalMoves(state: GameState): Move[] {
  if (state.status !== 'playing') return []
  return generateLegalMoves(state.board, state.turn).map(decodeMove)
}

export function legalTargets(state: GameState, from: number): number[] {
  if (state.status !== 'playing') return []
  return legalMovesFrom(state.board, from, state.turn).map((m) => decodeMove(m).to)
}

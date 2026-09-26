import type { Board } from '../game/board'
import { decodeMove, moveFrom, moveTo, type Move } from '../game/move'
import { generatePseudoMoves } from '../game/moveGenerator'
import type { Side } from '../game/piece'
import { isInCheck } from '../game/rules'
import { evaluateBasic, evaluateFull } from './evaluate'
import { MoveOrderer, type OrderingLevel } from './moveOrdering'
import {
  SIDE_HI, SIDE_LO, TT_EXACT, TT_LOWER, TT_UPPER, TranspositionTable, ZOBRIST_HI, ZOBRIST_LO,
  hashBoard, zobristIndex,
} from './transpositionTable'

export const MATE = 100000
const INF = 1 << 30
const MAX_PLY = 64

export interface SearchOptions {
  /** Deepest full-width iteration. */
  maxDepth: number
  /** Soft time budget; the search always finishes depth 1. */
  timeMs: number
  alphaBeta: boolean
  /** Search depth 1, 2, 3… keeping the best completed result (otherwise only maxDepth). */
  iterative: boolean
  useTT: boolean
  ordering: OrderingLevel
  /** Resolve captures at the leaves so the AI doesn't stop mid-exchange. */
  quiescence: boolean
  evaluation: 'basic' | 'full'
  /** Random noise (score units) added to root moves, for a more human, beatable opponent. */
  noise: number
  /** Chance to play the second-best move when it is within `noise` of the best. */
  blunderChance: number
  rng?: () => number
}

export interface SearchResult {
  move: Move | null
  score: number
  depth: number
  nodes: number
  elapsedMs: number
}

/** Shared across searches so Hard keeps what it learned between moves. */
const sharedTT = new TranspositionTable()

/**
 * Negamax search over a private copy of the board. Operates purely on game
 * data — no UI involvement — so it runs the same in tests, the main thread or a Web Worker.
 */
export class Searcher {
  private readonly board: number[]
  private side: Side
  private lo: number
  private hi: number
  /** Hashes of earlier positions (game history + current search path), for repetition draws. */
  private readonly path: number[] = []
  private readonly orderer = new MoveOrderer()
  private readonly tt: TranspositionTable | null
  private readonly evaluate: (b: ArrayLike<number>) => number
  private nodes = 0
  private deadline = 0
  private aborted = false
  private canAbort = false

  constructor(board: Board, side: Side, private readonly opts: SearchOptions, history: Board[] = []) {
    this.board = board.slice()
    this.side = side
    ;[this.lo, this.hi] = hashBoard(this.board, side === 'black')
    this.tt = opts.useTT ? sharedTT : null
    this.evaluate = opts.evaluation === 'full' ? evaluateFull : evaluateBasic
    // History positions alternate sides; the one before `board` was the opponent to move.
    history.forEach((b, i) => {
      const blackToMove = (history.length - i) % 2 === 1 ? side === 'red' : side === 'black'
      this.path.push(hashBoard(b, blackToMove)[0])
    })
  }

  search(): SearchResult {
    const start = now()
    this.deadline = start + this.opts.timeMs
    const rootMoves = this.legalMoves()
    if (rootMoves.length === 0) return { move: null, score: -MATE, depth: 0, nodes: 0, elapsedMs: 0 }

    let best = { move: rootMoves[0], score: -INF, depth: 0 }
    let scored: { move: number; score: number }[] = []
    const firstDepth = this.opts.iterative ? 1 : this.opts.maxDepth

    for (let depth = firstDepth; depth <= this.opts.maxDepth; depth++) {
      this.canAbort = depth > firstDepth
      const result = this.searchRoot(rootMoves, depth, best.move)
      if (this.aborted) break
      scored = result
      best = { move: result[0].move, score: result[0].score, depth }
      if (Math.abs(best.score) > MATE - MAX_PLY) break // forced mate found
      if (now() > this.deadline) break
      // Try the previous best first next iteration.
      rootMoves.sort((a, b) => (a === best.move ? -1 : b === best.move ? 1 : 0))
    }

    const move = this.pickWithNoise(scored, best.move)
    return { move: decodeMove(move), score: best.score, depth: best.depth, nodes: this.nodes, elapsedMs: now() - start }
  }

  /** Scores every root move (exactly when noise is used, otherwise with a moving window). */
  private searchRoot(moves: number[], depth: number, pvMove: number) {
    const ordered = this.orderer.order(this.board, moves.slice(), this.opts.ordering, 0, pvMove)
    const results: { move: number; score: number }[] = []
    const exact = this.opts.noise > 0 || !this.opts.alphaBeta
    let alpha = -INF
    for (const m of ordered) {
      const captured = this.make(m)
      const score = -this.negamax(depth - 1, -INF, exact ? INF : -alpha, 1)
      this.unmake(m, captured)
      if (this.aborted) break
      results.push({ move: m, score })
      if (score > alpha) alpha = score
    }
    return results.sort((a, b) => b.score - a.score)
  }

  private pickWithNoise(scored: { move: number; score: number }[], fallback: number): number {
    if (!scored.length || this.opts.noise <= 0) return fallback
    const rng = this.opts.rng ?? Math.random
    const noisy = scored
      .map((s) => ({ ...s, noisy: s.score + (rng() - 0.5) * 2 * this.opts.noise }))
      // Never let noise hide a forced mate, in either direction.
      .map((s) => (Math.abs(s.score) > MATE - MAX_PLY ? { ...s, noisy: s.score } : s))
      .sort((a, b) => b.noisy - a.noisy)
    if (noisy.length > 1 && rng() < this.opts.blunderChance && noisy[0].noisy - noisy[1].noisy < this.opts.noise) {
      return noisy[1].move
    }
    return noisy[0].move
  }

  private negamax(depth: number, alpha: number, beta: number, ply: number): number {
    if ((++this.nodes & 1023) === 0 && this.canAbort && now() > this.deadline) this.aborted = true
    if (this.aborted) return 0
    if (this.isRepetition()) return 0

    const inCheck = isInCheck(this.board, this.side)
    if (inCheck && ply < MAX_PLY / 2 && this.opts.alphaBeta) depth++ // check extension
    if (depth <= 0 || ply >= MAX_PLY) {
      return this.opts.quiescence ? this.quiesce(alpha, beta, ply) : this.staticEval()
    }

    const alphaStart = alpha
    let ttMove = 0
    if (this.tt) {
      const hit = this.tt.probe(this.lo, this.hi)
      if (hit) {
        ttMove = hit.move
        if (hit.depth >= depth) {
          const score = fromTT(hit.score, ply)
          if (hit.flag === TT_EXACT) return score
          if (hit.flag === TT_LOWER && score >= beta) return score
          if (hit.flag === TT_UPPER && score <= alpha) return score
        }
      }
    }

    const moves = this.orderer.order(this.board, generatePseudoMoves(this.board, this.side), this.opts.ordering, ply, ttMove)
    const mover = this.side
    let best = -INF
    let bestMove = 0
    let legal = 0

    for (const m of moves) {
      const captured = this.make(m)
      if (isInCheck(this.board, mover)) {
        this.unmake(m, captured)
        continue
      }
      legal++
      const score = this.opts.alphaBeta
        ? -this.negamax(depth - 1, -beta, -alpha, ply + 1)
        : -this.negamax(depth - 1, -INF, INF, ply + 1)
      this.unmake(m, captured)
      if (this.aborted) return 0

      if (score > best) {
        best = score
        bestMove = m
      }
      if (this.opts.alphaBeta) {
        if (score > alpha) alpha = score
        if (alpha >= beta) {
          if (captured === 0) {
            this.orderer.addKiller(ply, m)
            this.orderer.addHistory(m, depth)
          }
          break
        }
      }
    }

    // No legal move loses in Xiangqi, checkmate or not. Prefer the quickest mate.
    if (legal === 0) return -MATE + ply

    if (this.tt) {
      const flag = best <= alphaStart ? TT_UPPER : best >= beta ? TT_LOWER : TT_EXACT
      this.tt.store(this.lo, this.hi, depth, flag, toTT(best, ply), bestMove)
    }
    return best
  }

  private quiesce(alpha: number, beta: number, ply: number): number {
    if ((++this.nodes & 1023) === 0 && this.canAbort && now() > this.deadline) this.aborted = true
    if (this.aborted) return 0

    const standPat = this.staticEval()
    if (ply >= MAX_PLY) return standPat
    if (standPat >= beta) return standPat
    if (standPat > alpha) alpha = standPat

    const captures = generatePseudoMoves(this.board, this.side).filter((m) => this.board[moveTo(m)] !== 0)
    this.orderer.order(this.board, captures, 'captures', ply)
    const mover = this.side
    for (const m of captures) {
      const captured = this.make(m)
      if (isInCheck(this.board, mover)) {
        this.unmake(m, captured)
        continue
      }
      const score = -this.quiesce(-beta, -alpha, ply + 1)
      this.unmake(m, captured)
      if (this.aborted) return 0
      if (score >= beta) return score
      if (score > alpha) alpha = score
    }
    return alpha
  }

  private staticEval(): number {
    const s = this.evaluate(this.board)
    return this.side === 'red' ? s : -s
  }

  private legalMoves(): number[] {
    const mover = this.side
    return generatePseudoMoves(this.board, mover).filter((m) => {
      const c = this.make(m)
      const ok = !isInCheck(this.board, mover)
      this.unmake(m, c)
      return ok
    })
  }

  private isRepetition(): boolean {
    // Same side to move ⇒ positions two plies apart; a single repeat is scored as a draw.
    for (let i = this.path.length - 2; i >= 0; i -= 2) if (this.path[i] === this.lo) return true
    return false
  }

  private make(m: number): number {
    const from = moveFrom(m), to = moveTo(m)
    const piece = this.board[from]
    const captured = this.board[to]
    this.path.push(this.lo)
    this.lo ^= ZOBRIST_LO[zobristIndex(piece, from)] ^ ZOBRIST_LO[zobristIndex(piece, to)] ^ SIDE_LO
    this.hi ^= ZOBRIST_HI[zobristIndex(piece, from)] ^ ZOBRIST_HI[zobristIndex(piece, to)] ^ SIDE_HI
    if (captured !== 0) {
      this.lo ^= ZOBRIST_LO[zobristIndex(captured, to)]
      this.hi ^= ZOBRIST_HI[zobristIndex(captured, to)]
    }
    this.board[to] = piece
    this.board[from] = 0
    this.side = this.side === 'red' ? 'black' : 'red'
    return captured
  }

  private unmake(m: number, captured: number): void {
    const from = moveFrom(m), to = moveTo(m)
    const piece = this.board[to]
    this.board[from] = piece
    this.board[to] = captured
    this.side = this.side === 'red' ? 'black' : 'red'
    this.path.pop()
    this.lo ^= ZOBRIST_LO[zobristIndex(piece, from)] ^ ZOBRIST_LO[zobristIndex(piece, to)] ^ SIDE_LO
    this.hi ^= ZOBRIST_HI[zobristIndex(piece, from)] ^ ZOBRIST_HI[zobristIndex(piece, to)] ^ SIDE_HI
    if (captured !== 0) {
      this.lo ^= ZOBRIST_LO[zobristIndex(captured, to)]
      this.hi ^= ZOBRIST_HI[zobristIndex(captured, to)]
    }
  }
}

/** Mate scores are stored relative to the node so they stay correct at other plies. */
const toTT = (score: number, ply: number) =>
  score > MATE - MAX_PLY * 2 ? score + ply : score < -MATE + MAX_PLY * 2 ? score - ply : score
const fromTT = (score: number, ply: number) =>
  score > MATE - MAX_PLY * 2 ? score - ply : score < -MATE + MAX_PLY * 2 ? score + ply : score

const now = () => performance.now()

export const clearSearchMemory = () => sharedTT.clear()

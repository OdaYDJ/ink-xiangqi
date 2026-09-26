import { ADVISOR, CANNON, CHARIOT, ELEPHANT, GENERAL, HORSE, SOLDIER } from '../game/piece'

/** Piece values in centipawn-like units. */
export const PIECE_VALUE = [0, 0, 120, 120, 270, 600, 285, 30]
export const GENERAL_VALUE = 10000

/**
 * Position bonuses indexed by [row][col] from Red's point of view
 * (row 0 = the enemy back rank). Black uses the vertically mirrored square.
 * Random formations make opening-specific tables meaningless, so these only
 * encode general principles: advanced soldiers, central/active horses, etc.
 */
const SOLDIER_PST = [
  [0, 3, 6, 9, 12, 9, 6, 3, 0],
  [18, 36, 56, 80, 120, 80, 56, 36, 18],
  [14, 26, 42, 60, 80, 60, 42, 26, 14],
  [10, 20, 30, 34, 40, 34, 30, 20, 10],
  [6, 12, 18, 18, 20, 18, 18, 12, 6],
  [2, 0, 8, 0, 8, 0, 8, 0, 2],
  [0, 0, -2, 0, 4, 0, -2, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
]
const HORSE_PST = [
  [4, 8, 16, 12, 4, 12, 16, 8, 4],
  [4, 10, 28, 16, 8, 16, 28, 10, 4],
  [12, 14, 16, 20, 18, 20, 16, 14, 12],
  [8, 24, 18, 24, 20, 24, 18, 24, 8],
  [6, 16, 14, 18, 16, 18, 14, 16, 6],
  [4, 12, 16, 14, 12, 14, 16, 12, 4],
  [2, 6, 8, 6, 10, 6, 8, 6, 2],
  [4, 2, 8, 8, 4, 8, 8, 2, 4],
  [0, 2, 4, 4, -2, 4, 4, 2, 0],
  [0, -4, 0, 0, 0, 0, 0, -4, 0],
]
const CHARIOT_PST = [
  [14, 14, 12, 18, 16, 18, 12, 14, 14],
  [16, 20, 18, 24, 26, 24, 18, 20, 16],
  [12, 12, 12, 18, 18, 18, 12, 12, 12],
  [12, 18, 16, 22, 22, 22, 16, 18, 12],
  [12, 14, 12, 18, 18, 18, 12, 14, 12],
  [12, 16, 14, 20, 20, 20, 14, 16, 12],
  [6, 10, 8, 14, 14, 14, 8, 10, 6],
  [4, 8, 6, 14, 12, 14, 6, 8, 4],
  [8, 4, 8, 16, 8, 16, 8, 4, 8],
  [-2, 10, 6, 14, 12, 14, 6, 10, -2],
]
const CANNON_PST = [
  [6, 4, 0, -10, -12, -10, 0, 4, 6],
  [2, 2, 0, -4, -14, -4, 0, 2, 2],
  [2, 2, 0, -10, -8, -10, 0, 2, 2],
  [0, 0, -2, 4, 10, 4, -2, 0, 0],
  [0, 0, 0, 2, 8, 2, 0, 0, 0],
  [-2, 0, 4, 2, 6, 2, 4, 0, -2],
  [0, 0, 0, 2, 4, 2, 0, 0, 0],
  [4, 0, 8, 6, 10, 6, 8, 0, 4],
  [0, 2, 4, 6, 6, 6, 4, 2, 0],
  [0, 0, 2, 6, 6, 6, 2, 0, 0],
]
const ZERO_PST = Array.from({ length: 10 }, () => new Array(9).fill(0))

const TABLES = [ZERO_PST, ZERO_PST, ZERO_PST, ZERO_PST, HORSE_PST, CHARIOT_PST, CANNON_PST, SOLDIER_PST]

/** Flattened value+position table: PST_FLAT[type][square] for Red; Black mirrors rows. */
export const PST_FLAT: Int16Array[] = TABLES.map((t, type) => {
  const flat = new Int16Array(90)
  for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) flat[r * 9 + c] = PIECE_VALUE[type] + t[r][c]
  return flat
})

const mirror = (s: number) => (9 - Math.floor(s / 9)) * 9 + (s % 9)

/** Material + piece-square score from Red's perspective. */
export function evaluateBasic(board: ArrayLike<number>): number {
  let score = 0
  for (let s = 0; s < 90; s++) {
    const p = board[s]
    if (p > 0) score += PST_FLAT[p][s]
    else if (p < 0) score -= PST_FLAT[-p][mirror(s)]
  }
  return score
}

/**
 * Richer evaluation for Medium/Hard: adds mobility of the long-range and
 * jumping pieces, General safety (remaining defenders versus attackers that
 * have crossed the river) and a small bonus for pieces bearing on the enemy palace.
 */
export function evaluateFull(board: ArrayLike<number>): number {
  let score = 0
  let redDefenders = 0, blackDefenders = 0
  let redAttackers = 0, blackAttackers = 0

  for (let s = 0; s < 90; s++) {
    const p = board[s]
    if (p === 0) continue
    const type = p > 0 ? p : -p
    const row = (s / 9) | 0
    const col = s % 9
    const red = p > 0
    let v = red ? PST_FLAT[type][s] : PST_FLAT[type][mirror(s)]

    switch (type) {
      case CHARIOT:
        v += 2 * rayMobility(board, row, col)
        break
      case CANNON:
        v += rayMobility(board, row, col)
        break
      case HORSE:
        v += 4 * horseMobility(board, row, col) - 10
        break
      case ADVISOR:
      case ELEPHANT:
        if (red) redDefenders++
        else blackDefenders++
        break
    }
    if (type === CHARIOT || type === HORSE || type === CANNON || type === SOLDIER) {
      const crossed = red ? row <= 4 : row >= 5
      if (crossed) {
        if (red) redAttackers += type === SOLDIER ? 0.5 : 1
        else blackAttackers += type === SOLDIER ? 0.5 : 1
      }
    }
    score += red ? v : -v
  }

  // Each missing defender hurts more the more attackers are across the river.
  score -= (4 - redDefenders) * blackAttackers * 12
  score += (4 - blackDefenders) * redAttackers * 12
  return score
}

function rayMobility(board: ArrayLike<number>, row: number, col: number): number {
  let n = 0
  for (let r = row - 1; r >= 0 && board[r * 9 + col] === 0; r--) n++
  for (let r = row + 1; r < 10 && board[r * 9 + col] === 0; r++) n++
  for (let c = col - 1; c >= 0 && board[row * 9 + c] === 0; c--) n++
  for (let c = col + 1; c < 9 && board[row * 9 + c] === 0; c++) n++
  return n
}

function horseMobility(board: ArrayLike<number>, row: number, col: number): number {
  let n = 0
  if (row > 1 && board[(row - 1) * 9 + col] === 0) n += (col > 0 ? 1 : 0) + (col < 8 ? 1 : 0)
  if (row < 8 && board[(row + 1) * 9 + col] === 0) n += (col > 0 ? 1 : 0) + (col < 8 ? 1 : 0)
  if (col > 1 && board[row * 9 + col - 1] === 0) n += (row > 0 ? 1 : 0) + (row < 9 ? 1 : 0)
  if (col < 7 && board[row * 9 + col + 1] === 0) n += (row > 0 ? 1 : 0) + (row < 9 ? 1 : 0)
  return n
}

export const isGeneral = (p: number) => p === GENERAL || p === -GENERAL

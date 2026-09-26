/**
 * Pieces are encoded as small signed integers so boards stay plain JSON and
 * the AI can copy/compare them cheaply: positive = red, negative = black.
 */
export type Side = 'red' | 'black'

export const EMPTY = 0
export const GENERAL = 1
export const ADVISOR = 2
export const ELEPHANT = 3
export const HORSE = 4
export const CHARIOT = 5
export const CANNON = 6
export const SOLDIER = 7

export type PieceType = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type PieceCode = number

export const PIECE_TYPES: PieceType[] = [GENERAL, ADVISOR, ELEPHANT, HORSE, CHARIOT, CANNON, SOLDIER]

export const INVENTORY: Record<PieceType, number> = {
  [GENERAL]: 1,
  [ADVISOR]: 2,
  [ELEPHANT]: 2,
  [HORSE]: 2,
  [CHARIOT]: 2,
  [CANNON]: 2,
  [SOLDIER]: 5,
}

export const PIECE_NAMES: Record<PieceType, string> = {
  [GENERAL]: 'General',
  [ADVISOR]: 'Advisor',
  [ELEPHANT]: 'Elephant',
  [HORSE]: 'Horse',
  [CHARIOT]: 'Chariot',
  [CANNON]: 'Cannon',
  [SOLDIER]: 'Soldier',
}

const RED_CHARS: Record<PieceType, string> = {
  [GENERAL]: '帥', [ADVISOR]: '仕', [ELEPHANT]: '相', [HORSE]: '傌',
  [CHARIOT]: '俥', [CANNON]: '炮', [SOLDIER]: '兵',
}
const BLACK_CHARS: Record<PieceType, string> = {
  [GENERAL]: '將', [ADVISOR]: '士', [ELEPHANT]: '象', [HORSE]: '馬',
  [CHARIOT]: '車', [CANNON]: '砲', [SOLDIER]: '卒',
}

/** FEN letters (uppercase = red), following the common Xiangqi FEN convention. */
const FEN_LETTERS: Record<PieceType, string> = {
  [GENERAL]: 'k', [ADVISOR]: 'a', [ELEPHANT]: 'b', [HORSE]: 'n',
  [CHARIOT]: 'r', [CANNON]: 'c', [SOLDIER]: 'p',
}

export const makePiece = (side: Side, type: PieceType): PieceCode => (side === 'red' ? type : -type)
export const typeOf = (p: PieceCode): PieceType => Math.abs(p) as PieceType
export const sideOf = (p: PieceCode): Side | null => (p > 0 ? 'red' : p < 0 ? 'black' : null)
export const sign = (side: Side): 1 | -1 => (side === 'red' ? 1 : -1)
export const opponent = (side: Side): Side => (side === 'red' ? 'black' : 'red')

export const pieceChar = (p: PieceCode): string =>
  p > 0 ? RED_CHARS[typeOf(p)] : p < 0 ? BLACK_CHARS[typeOf(p)] : '·'

export const pieceToFen = (p: PieceCode): string => {
  const l = FEN_LETTERS[typeOf(p)]
  return p > 0 ? l.toUpperCase() : l
}

export const fenToPiece = (ch: string): PieceCode | null => {
  const lower = ch.toLowerCase()
  const type = PIECE_TYPES.find((t) => FEN_LETTERS[t] === lower)
  if (!type) {
    // Accept the alternative letters some tools use (h = horse, e = elephant).
    const alt: Record<string, PieceType> = { h: HORSE, e: ELEPHANT }
    if (!alt[lower]) return null
    return ch === lower ? -alt[lower] : alt[lower]
  }
  return ch === lower ? -type : type
}

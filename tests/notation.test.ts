import { describe, expect, it } from 'vitest'
import { CLASSIC_FEN, parseFen } from '../src/game/board'
import { applyMove, createGame } from '../src/game/gameState'
import { parseMove } from '../src/game/move'
import { gameNotation } from '../src/game/notation'
import { setup } from './helpers'

const notate = (moves: string[], board = parseFen(CLASSIC_FEN)) => {
  const g = moves.reduce((s, m) => applyMove(s, parseMove(m)), createGame(board))
  return gameNotation(g.initialBoard, g.history)
}

describe('Chinese notation', () => {
  it('writes the classic central-cannon opening', () => {
    expect(notate(['h2e2', 'h9g7', 'e2e6', 'b9c7'])).toEqual(['炮二平五', '馬8進7', '炮五進四', '馬2進3'])
  })
  it('uses 退 for retreats and file targets for diagonal movers', () => {
    expect(notate(['h2e2', 'h9g7', 'e2e1', 'g7h9', 'f0e1'].slice(0, 4))).toEqual(['炮二平五', '馬8進7', '炮五退一', '馬7退8'])
    expect(notate(['c0e2'])).toEqual(['相七進五'])
    expect(notate(['h2e2', 'd9e8'])).toEqual(['炮二平五', '士4進5'])
  })
  it('names doubled pieces on one file 前/後', () => {
    const board = setup({ d0: 'K', f9: 'k', a5: 'R', a2: 'R' })
    expect(notate(['a5b5'], board)).toEqual(['前俥平八'])
    expect(notate(['a2b2'], board)).toEqual(['後俥平八'])
  })
})

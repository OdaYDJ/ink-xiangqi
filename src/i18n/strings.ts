import type { Difficulty } from '../ai/difficulty'
import type { GameMode } from '../game/randomizer'
import type { Side } from '../game/piece'

export type Locale = 'en' | 'zh'

/** The game's motto, shown as a couplet in both languages. */
export const COUPLET = ['一墨染，万象生；', '一局落，乾坤开。']
/** Couplet columns as brushed on the page: punctuation gives way to space, as in calligraphy. */
export const COUPLET_COLUMNS = ['一墨染　万象生', '一局落　乾坤开']

export type Outcome =
  | { kind: 'win'; how: 'checkmate' | 'stalemate'; winner: Side; you: 'won' | 'lost' | null }
  | { kind: 'draw'; reason: 'repetition' | 'no-progress' | null }

export interface Strings {
  htmlLang: string
  subtitle: string
  coupletTranslation: string | null
  playLabel: string
  difficulty: Record<Difficulty, string>
  difficultyHint: Record<Difficulty, string>
  modes: Record<GameMode, string>
  formationLabel: string
  seed: string
  seedPlaceholder: string
  seedError: string
  twoPlayers: string
  switchLanguage: string
  switchLanguageLabel: string
  controls: {
    undo: string
    restart: string
    newFormation: string
    soundOn: string
    soundOff: string
    menu: string
    undoTitle: string
    restartTitle: string
    newFormationTitle: string
    label: string
  }
  status: {
    yourMove: string
    theirMove: string
    thinking: string
    toMove: (side: Side) => string
    check: string
  }
  outcome: (o: Outcome) => string
  meta: { twoPlayers: string; classic: string; custom: string; seedTitle: string }
  aiError: (detail: string) => string
  backToMenu: string
  boardLabel: string
  recordLabel: string
  emptyRecord: string
  announce: (side: Side, notation: string) => string
  errorTitle: string
  errorAction: string
}

const side = { red: 'Red', black: 'Black' }

export const STRINGS: Record<Locale, Strings> = {
  en: {
    htmlLang: 'en',
    subtitle: 'Ink Xiangqi',
    coupletTranslation: '“With a stroke of ink, a thousand forms arise; with a single move, the universe unfolds.”',
    playLabel: 'Play against',
    difficulty: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    difficultyHint: { easy: 'plays at ease', medium: 'plans every move', hard: 'sees the whole board' },
    modes: { random: 'Random formation', classic: 'Classic' },
    formationLabel: 'Starting formation',
    seed: 'Seed',
    seedPlaceholder: 'drawn at random',
    seedError: 'Seeds use letters, digits and “-”.',
    twoPlayers: 'Two players, one board',
    switchLanguage: '中文',
    switchLanguageLabel: 'Switch to Chinese',
    controls: {
      undo: 'Undo',
      restart: 'Restart',
      newFormation: 'New formation',
      soundOn: 'Sound on',
      soundOff: 'Sound off',
      menu: 'Menu',
      undoTitle: 'Take back your last move',
      restartTitle: 'Replay this formation from the start',
      newFormationTitle: 'Deal a new random formation',
      label: 'Game controls',
    },
    status: {
      yourMove: 'Your move',
      theirMove: 'Their move',
      thinking: 'Thinking',
      toMove: (s) => `${side[s]} to move`,
      check: 'Check',
    },
    outcome: (o) => {
      if (o.kind === 'draw') {
        return o.reason === 'repetition' ? 'Drawn by repetition' : o.reason === 'no-progress' ? 'Drawn: sixty moves without a capture' : 'Drawn'
      }
      const how = o.how === 'checkmate' ? 'Checkmate' : 'No moves left'
      const who = o.you === 'won' ? 'you win' : o.you === 'lost' ? 'the computer wins' : `${side[o.winner]} wins`
      return `${how} · ${who}`
    },
    meta: { twoPlayers: 'Two players', classic: 'Classic', custom: 'Custom position', seedTitle: 'Formation seed. Share it to replay this layout.' },
    aiError: (d) => `The computer couldn’t find a move (${d}). Undo or restart to continue.`,
    backToMenu: 'Back to menu',
    boardLabel: 'Xiangqi board',
    recordLabel: 'Move record',
    emptyRecord: 'No moves yet',
    announce: (s, n) => `${side[s]} ${n}.`,
    errorTitle: 'The ink ran. Something went wrong.',
    errorAction: 'Start again',
  },

  zh: {
    htmlLang: 'zh-Hant',
    subtitle: '水墨象棋',
    coupletTranslation: null,
    playLabel: '對弈',
    difficulty: { easy: '初學', medium: '棋手', hard: '國手' },
    difficultyHint: { easy: '落子從容', medium: '運籌帷幄', hard: '洞見乾坤' },
    modes: { random: '奇局', classic: '古局' },
    formationLabel: '開局',
    seed: '局號',
    seedPlaceholder: '隨機',
    seedError: '局號只能包含字母、數字和「-」。',
    twoPlayers: '雙人對弈',
    switchLanguage: 'English',
    switchLanguageLabel: '切換為英文',
    controls: {
      undo: '悔棋',
      restart: '重來',
      newFormation: '換局',
      soundOn: '有聲',
      soundOff: '靜音',
      menu: '返回',
      undoTitle: '收回上一步',
      restartTitle: '從頭再下這一局',
      newFormationTitle: '換一個隨機佈局',
      label: '對局操作',
    },
    status: {
      yourMove: '請落子',
      theirMove: '對方落子',
      thinking: '對方思考',
      toMove: (s) => (s === 'red' ? '紅方落子' : '黑方落子'),
      check: '將軍',
    },
    outcome: (o) => {
      if (o.kind === 'draw') return o.reason === 'repetition' ? '重複局面 · 和棋' : o.reason === 'no-progress' ? '六十回合未吃子 · 和棋' : '和棋'
      const how = o.how === 'checkmate' ? '絕殺' : '困斃'
      const who = o.you === 'won' ? '你勝' : o.you === 'lost' ? '電腦勝' : o.winner === 'red' ? '紅方勝' : '黑方勝'
      return `${how} · ${who}`
    },
    meta: { twoPlayers: '雙人', classic: '古局', custom: '自訂局面', seedTitle: '局號，分享後可重現此局' },
    aiError: (d) => `電腦沒能走出一步（${d}）。請悔棋或重來。`,
    backToMenu: '返回首頁',
    boardLabel: '象棋棋盘',
    recordLabel: '棋譜',
    emptyRecord: '譜',
    announce: (s, n) => `${s === 'red' ? '紅方' : '黑方'} ${n}`,
    errorTitle: '墨跡暈開了，出了點問題。',
    errorAction: '重新開始',
  },
}

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
    coupletTranslation: 'One stroke of ink, and all things appear; one game begins, and heaven and earth open.',
    playLabel: 'Play against',
    difficulty: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    difficultyHint: { easy: 'plays loosely', medium: 'reads exchanges', hard: 'thinks deeply' },
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
    htmlLang: 'zh-Hans',
    subtitle: '水墨象棋',
    coupletTranslation: null,
    playLabel: '对弈',
    difficulty: { easy: '初学', medium: '棋手', hard: '国手' },
    difficultyHint: { easy: '落子随意', medium: '善算兑子', hard: '深思远虑' },
    modes: { random: '奇局', classic: '古局' },
    formationLabel: '开局',
    seed: '局号',
    seedPlaceholder: '随机',
    seedError: '局号只能包含字母、数字和“-”。',
    twoPlayers: '双人对弈',
    switchLanguage: 'English',
    switchLanguageLabel: '切换为英文',
    controls: {
      undo: '悔棋',
      restart: '重来',
      newFormation: '换局',
      soundOn: '有声',
      soundOff: '静音',
      menu: '返回',
      undoTitle: '收回上一步',
      restartTitle: '从头再下这一局',
      newFormationTitle: '换一个随机布局',
      label: '对局操作',
    },
    status: {
      yourMove: '请落子',
      theirMove: '对方落子',
      thinking: '对方思考',
      toMove: (s) => (s === 'red' ? '红方落子' : '黑方落子'),
      check: '将军',
    },
    outcome: (o) => {
      if (o.kind === 'draw') return o.reason === 'repetition' ? '重复局面 · 和棋' : o.reason === 'no-progress' ? '六十回合未吃子 · 和棋' : '和棋'
      const how = o.how === 'checkmate' ? '绝杀' : '困毙'
      const who = o.you === 'won' ? '你胜' : o.you === 'lost' ? '电脑胜' : o.winner === 'red' ? '红方胜' : '黑方胜'
      return `${how} · ${who}`
    },
    meta: { twoPlayers: '双人', classic: '古局', custom: '自定局面', seedTitle: '局号，分享后可重现此局' },
    aiError: (d) => `电脑没能走出一步（${d}）。请悔棋或重来。`,
    backToMenu: '返回首页',
    boardLabel: '象棋棋盘',
    recordLabel: '棋谱',
    emptyRecord: '谱',
    announce: (s, n) => `${s === 'red' ? '红方' : '黑方'} ${n}`,
    errorTitle: '墨迹晕开了，出了点问题。',
    errorAction: '重新开始',
  },
}

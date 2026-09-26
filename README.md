# 墨弈 · Ink Xiangqi

> 一墨染，万象生；一局落，乾坤开。
> *With a stroke of ink, a thousand forms arise. With a single move, the universe unfolds.*

**墨弈** is a quiet game of Xiangqi (Chinese chess) that you play inside an ink-wash painting. The board is brushed onto Xuan paper, mist drifts across the river, bamboo moves in the wind at the edges of the page, and a soft pipa melody plays in the background.

The rules are the ones Xiangqi players have always known. What changes is the opening: instead of the fixed traditional line-up, each game can deal a **new starting formation**. Every piece keeps its familiar role and its usual rank, but chariots, horses, elephants, cannons and even the General find new places — so the first moves of each game ask you to read the board afresh.

> Familiar board. Familiar pieces. Unfamiliar formation.

**墨弈**是一款在水墨画中对弈的象棋游戏。棋盘以毛笔画于宣纸之上，楚河汉界间烟云流动，竹影随风轻摇，琵琶声若有若无。规则仍是传统象棋；不同的是开局——每一局都可以得到一个新的布局。棋子职能与所在行列不变，位置却重新排布，每一局都需要重新观局、重新思量。每一种布局都以一种墨色命名（焦墨、濃墨、淡墨、松煙……），同一墨色永远对应同一局面，可以分享给朋友重下同一盘棋。

Play: https://odaydj.github.io/ink-xiangqi/ (once GitHub Pages is enabled)

## How to play

1. **Choose an opponent** — 初學 Easy, 棋手 Medium or 國手 Hard — or 雙人對弈 *Two players, one board* to play a friend on the same device.
2. **Choose a starting formation** — 奇局 *Random* for a newly dealt formation, or 古局 *Classic* for the traditional one. Each random formation is named by an ink colour (墨色 / *Ink seed*); leave it blank for a random ink, tap the shuffle mark to draw one, or type a name to replay a formation someone shared.
3. **Play Red.** Tap a piece to see where it can go, then tap a destination. Standard Xiangqi rules apply throughout, including the flying General and blocked horse legs and elephant eyes.
4. In the game, 悔棋 *Undo* takes back your last move, 重來 *Restart* replays the same formation, and 易墨 *New ink* deals a new one. The move record is kept beside the board, in Chinese notation (炮二平五) or, in English, WXF notation (C2.5).

The whole interface is available in Traditional Chinese and English; switch at any time.

## Features

- Full Xiangqi rules engine (flying General, horse-leg and elephant-eye blocking, palace and river limits, cannon screens, checkmate, stalemate-as-loss, repetition and no-progress draws), verified with perft.
- **Random** and **Classic** formations. Every random formation is named by an ink colour (墨色): the five tones 焦墨 · 濃墨 · 重墨 · 淡墨 · 清墨 and inks such as 松煙 or 潑墨. The same ink always deals the same board, in either language (焦墨 = Scorched Ink). In the menu, tap the shuffle mark beside 墨色 to draw one, or type your own name; in a game, 易墨 draws a new ink. Share one with `?seed=焦墨`.
- Human vs computer at three levels, running in a Web Worker:
  - **Easy** — minimax depth 2, material + position, deliberate randomness
  - **Medium** — alpha-beta, quiescence, mobility / General-safety evaluation (~500 ms)
  - **Hard** — iterative deepening, PVS, transposition table, killer/history ordering (~2 s)
- Pass & play for two people on one device.
- **Two language versions**, switchable at any time (中文 / English on the menu and in the game; remembered, defaults to the browser language, or `?lang=zh` / `?lang=en`). The Chinese version is set in Traditional Chinese with a vertically written colophon and notation like 炮二平五; the English version uses WXF notation (C2.5). The motto 一墨染，万象生；一局落，乾坤开。 appears as a brush regular-script (楷書) couplet to the right of the title in both.
- An ink-painting interface: every board line is a tapered brush stroke on exact geometry, a dry-brush frame, a misty river, carved paper and charcoal pieces, and a procedurally painted landscape (mountains in mist, water, birds, a bamboo stand and a hanging bamboo spray) behind the game.
- A hanging-scroll layout: vertical title and inscription with a carved seal on the left, the game record in Chinese notation (炮二平五, 馬8進7…) and quiet controls on the right; on phones the board comes first.
- Ink-inspired motion: the board spreads into the paper on start, a soft halo marks the selected piece, a ripple marks the landing point, a small splash marks captures, and a seal is stamped when the game ends. Optional quiet sounds; reduced-motion respected.

## Random formations

Each side keeps the standard army (1 General, 2 Advisors, 2 Elephants, 2 Horses, 2 Chariots, 2 Cannons, 5 Soldiers). The randomizer (`src/game/randomizer.ts`) places them under these constraints:

| Pieces | Allowed starting points |
|---|---|
| General + Advisors | the three palace points of the back rank (shuffled) |
| Elephants, Horses, Chariots | the six other back-rank points (shuffled) |
| Cannons | any two points on the cannon rank |
| Soldiers | the five traditional soldier points |

Every candidate must pass `validateFormation` (`src/game/validator.ts`): correct inventory, every piece on an allowed point, no side in check, Generals not facing, and **no free material on move one** (neither side can capture an undefended piece worth more than a soldier, or win material outright). Rejected candidates are redrawn from the same seeded RNG stream, so a seed always produces the same board.

## Background music

A quiet pipa track loops in the background. It starts only after the player's first tap or key press, fades in at about 15% volume, and is controlled by the small ♫ mark in the bottom-right corner (hover or focus it for three volume levels). Mute and volume are remembered.

The game expects the track at `public/audio/pipa-xiangqi.mp3`. If the file is absent, the ♫ control stays hidden and the game is otherwise unaffected.

### Music credit and license

**烟雨江南 · Mist Over Jiangnan** by **RainStreetCat**, from [Pixabay](https://pixabay.com/music/rnb-%E7%83%9F%E9%9B%A8%E6%B1%9F%E5%8D%97-mist-over-jiangnan-428654/).

Used under the [Pixabay Content License](https://pixabay.com/service/license-summary/), which allows use in this game without attribution (credit is given here with thanks). The track is **not** covered by this project's copyright notice below and remains the work of its author. The license does not permit taking the audio file out of the game and distributing it on its own; if you want the track, download it from its Pixabay page.

## Credits

Fonts are loaded from [Google Fonts](https://fonts.google.com/) and are used under the [SIL Open Font License 1.1](https://openfontlicense.org/):

- **Zhi Mang Xing** — the 墨弈 title
- **Ma Shan Zheng** — the couplet
- **LXGW WenKai TC** — piece characters and the river
- **Noto Serif TC** — Chinese text and notation
- **Cormorant Garamond** — English text

The game is built with [React](https://react.dev/), [Vite](https://vite.dev/) and [TypeScript](https://www.typescriptlang.org/), each under its own open-source license.

## Copyright

© 2026 Oda Jin. All rights reserved.

The game's code, artwork (the brushwork, landscape, pieces and seals, which are generated by its own code) and text are the work of the author. No open-source license has been granted yet, so please ask before reusing or redistributing them.

Third-party material keeps its own terms: the background music is covered by the Pixabay Content License (see *Music credit and license*), and the fonts and libraries by their respective licenses (see *Credits*).

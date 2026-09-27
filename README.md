**English** · [简体中文](README.zh-CN.md)

**墨弈** is a quiet game of Xiangqi (Chinese chess) that you play inside an ink-wash painting. The board is brushed onto Xuan paper, mist drifts across the river, bamboo moves in the wind at the edges of the page, and a soft pipa melody plays in the background.

The rules are the ones Xiangqi players have always known. What changes is the opening: instead of the fixed traditional line-up, each game can deal a **new starting formation**. Every piece keeps its familiar role and its usual rank, but chariots, horses, elephants, cannons and even the General find new places — so the first moves of each game ask you to read the board afresh.

> Familiar board. Familiar pieces. Unfamiliar formation.

**Play:** https://odaydj.github.io/ink-xiangqi/ — in the browser, on a computer, tablet or phone. Nothing to install.

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
- **Two language versions**, switchable at any time (中文 / English on the menu and in the game; remembered, defaults to the browser language, or `?lang=zh` / `?lang=en`). The Chinese version is set in Traditional Chinese with a vertically written colophon and notation like 炮二平五; the English version uses WXF notation (C2.5).
- An ink-painting interface: every board line is a tapered brush stroke on exact geometry, a dry-brush frame, a misty river, carved paper and charcoal pieces, and a procedurally painted landscape (mountains in mist, water, birds, a bamboo stand and a hanging bamboo spray) behind the game.
- A hanging-scroll layout: vertical title and inscription with a carved seal on the left, the game record in Chinese notation (炮二平五, 馬8進7…) and quiet controls on the right; on phones the board comes first.
- Ink-inspired motion: the board spreads into the paper on start, a soft halo marks the selected piece, a ripple marks the landing point, a small splash marks captures, and a seal is stamped when the game ends. Optional quiet sounds; reduced-motion respected.

## Random formations

Each side keeps the standard army (1 General, 2 Advisors, 2 Elephants, 2 Horses, 2 Chariots, 2 Cannons, 5 Soldiers). The randomizer (`src/game/randomizer.ts`) places them under these constraints:

The game ends in checkmate, when a side has no legal move (which loses, as in Xiangqi), or in a draw by repetition or by long play without progress.

## Formations named by ink

Every random formation is named by an ink colour (墨色): the five tones 焦墨 · 濃墨 · 重墨 · 淡墨 · 清墨, and inks such as 松煙 or 潑墨. The same ink always deals the same board, in either language (焦墨 = *Scorched Ink*).

- On the title page, leave 墨色 *Ink seed* blank for a random ink, tap the shuffle mark to draw one, or type a name.
- To share a formation, send its name — or a link such as `https://odaydj.github.io/ink-xiangqi/?seed=焦墨` — and your friend can play the very same board.

Random formations are always fair to begin: no side starts in check, the Generals never face each other, and neither side can win material on the first move.

## Languages, sound and settings

- **Two languages.** Switch between 中文 (Traditional Chinese) and English at any time, on the title page or in a game. Your choice is remembered.
- **Music.** The pipa track starts quietly after your first tap. Use the small ♫ mark in the corner to pause it or choose one of three volumes.
- **Move sounds.** Each move plays a single soft water drop over a faint wooden touch; captures sound a little deeper. Turn them off with 有聲 *Sound on* in the game.
- If your device asks for reduced motion, the ink effects are kept still.

Used under the [Pixabay Content License](https://pixabay.com/service/license-summary/), which allows use in this game without attribution (credit is given here with thanks). The track is **not** covered by this project's copyright notice below and remains the work of its author. The license does not permit taking the audio file out of the game and distributing it on its own; if you want the track, download it from its Pixabay page.

## Move sounds

Placing a piece plays a single soft water droplet over a faint wooden touch, with a very short room tail; a capture uses a slightly lower, fuller version. Nothing sounds on selection, hovering, or illegal moves. The in-game *Sound on / off* button toggles them.

The droplet is [“Water Drop Sound”](https://freesound.org/people/metaepitome/sounds/165206/) by **metaepitome** on Freesound, released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (credit given with thanks). It lives at `public/audio/water-drop.wav`; if it is missing, a synthesized droplet is used instead.

## Credits

Fonts are loaded from [Google Fonts](https://fonts.google.com/) and are used under the [SIL Open Font License 1.1](https://openfontlicense.org/):

- **Zhi Mang Xing** — the 墨弈 title
- **Liu Jian Mao Cao** — the 墨弈 title in the ink-and-water design
- **LXGW WenKai TC** — piece characters and the river
- **Noto Serif TC** — Chinese text and notation
- **Cormorant Garamond** — English text

The 中国象棋 seal on the title page is drawn from the outlines of **Noto Serif CJK TC** Black ([Noto CJK](https://github.com/notofonts/noto-cjk), SIL Open Font License 1.1), the same design as the Noto Serif TC used for the other seals.

The game is built with [React](https://react.dev/), [Vite](https://vite.dev/) and [TypeScript](https://www.typescriptlang.org/), each under its own open-source license.

## Copyright

© 2026 Oda Jin. All rights reserved.

The game, its artwork (the brushwork, water, board, pieces and seals, all drawn by the game itself) and its text are the work of the author. No open-source license has been granted, so please ask before reusing or redistributing any part of it.

Third-party material keeps its own terms:

- **Music** — *烟雨江南 · Mist Over Jiangnan* by **RainStreetCat**, from [Pixabay](https://pixabay.com/music/rnb-%E7%83%9F%E9%9B%A8%E6%B1%9F%E5%8D%97-mist-over-jiangnan-428654/), used under the [Pixabay Content License](https://pixabay.com/service/license-summary/) (credit given with thanks). The track is not covered by the copyright above and remains the work of its author; the license does not allow taking the audio out of the game and distributing it on its own — if you would like the track, download it from its Pixabay page.
- **Move sound** — [*Water Drop Sound*](https://freesound.org/people/metaepitome/sounds/165206/) by **metaepitome** on Freesound, released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (credit given with thanks).
- **Fonts**, all under the [SIL Open Font License 1.1](https://openfontlicense.org/):
  - **Liu Jian Mao Cao** — the 墨弈 title
  - **Zhi Mang Xing** — the 墨弈 title in the original design
  - **LXGW WenKai TC** — the pieces, the river and the verse beside the title
  - **Noto Serif TC** and **Noto Serif CJK TC** — Chinese text, notation and the seals
  - **Cormorant Garamond** — English text
- The open-source software the game is built with keeps its own licenses.

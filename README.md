# 墨弈 · Ink Xiangqi

A minimalist, experimental Chinese chess game for the browser: the familiar Xiangqi board and rules, painted like quiet ink on paper, with **seeded random starting formations**.

> Familiar board. Familiar pieces. Unfamiliar formation.

Play: https://odaydj.github.io/ink-xiangqi/ (once GitHub Pages is enabled)

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

The track itself is not in the repository. To add it:

1. Download a track from Pixabay, for example [烟雨江南 · Mist Over Jiangnan](https://pixabay.com/music/rnb-%E7%83%9F%E9%9B%A8%E6%B1%9F%E5%8D%97-mist-over-jiangnan-428654/) (RainStreetCat) or [夜游秦淮](https://pixabay.com/music/ambient-%E5%A4%9C%E6%B8%B8%E7%A7%A6%E6%B7%AE-517931/) (XunLang_Studio). Check the track page and the [Pixabay Content License](https://pixabay.com/service/license-summary/) first.
2. Save it as `public/audio/pipa-xiangqi.mp3`.

Without the file the ♫ control simply stays hidden and the game is unaffected.

## Development

```bash
npm install
npm run dev       # http://localhost:5173/ink-xiangqi/
npm test          # engine, randomizer and AI tests
npm run build     # production build in dist/
npm run preview   # serve dist/ locally
```

Debug helper: `?fen=<Xiangqi FEN>` opens a pass-and-play game from any position, e.g.
`?fen=4k4/R8/8R/9/9/9/9/9/9/3K5`.

## Structure

```
src/game/        rules engine: board, pieces, move generation, game state, randomizer, validator
src/ai/          evaluation, minimax/alpha-beta search, move ordering, TT, difficulty, worker
src/rendering/   board geometry, piece looks, animation timings, synthesized sounds
src/components/  React UI (menu, game, board, pieces, controls)
tests/           Vitest suites
```

The engine and AI never depend on React; game state is plain JSON.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes `dist/` to GitHub Pages. In the repository settings choose **Settings → Pages → Build and deployment → Source → GitHub Actions**. The Vite `base` (`/ink-xiangqi/`) must match the repository name.

## License

TBD.

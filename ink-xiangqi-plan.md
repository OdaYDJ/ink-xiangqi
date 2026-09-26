# 墨弈 · Ink Xiangqi

A minimalist, experimental Chinese chess game for the browser.

**墨弈 (Mò Yì)** reimagines Xiangqi as a quiet digital ink painting: simple 2D graphics, restrained colors, subtle brush-like animations, and randomized starting formations.

The first version is designed to run entirely in the browser and be deployed through **GitHub Pages**.

---

## 1. Project Concept

### Core idea

> **Familiar board. Familiar pieces. Unfamiliar formation.**

Traditional Xiangqi has a fixed starting formation. 墨弈 keeps the familiar Xiangqi board and movement rules while introducing a randomized starting formation.

Each side still has the standard Xiangqi army:

| Piece | Per Side |
|---|---:|
| General | 1 |
| Advisor | 2 |
| Elephant | 2 |
| Horse | 2 |
| Chariot | 2 |
| Cannon | 2 |
| Soldier | 5 |
| **Total** | **16** |

The first experimental mode randomizes eligible starting positions while preserving valid Xiangqi starting constraints.

A deterministic random seed will allow the same formation to be reproduced and shared.

---

# 2. Visual Design

The visual direction is:

> **"Xiangqi reimagined as a quiet digital Chinese ink painting."**

The game should feel:

- Minimal
- Elegant
- Calm
- Modern
- Chinese
- 2D
- Lightweight
- Slightly mysterious

### Avoid

- 3D chess pieces
- Realistic wood textures
- Gold decorations
- Heavy gradients
- Excessive shadows
- Bright UI colors
- Large popups
- Excessive game effects
- Cluttered dashboards

### Prefer

- Warm paper background
- Dark ink
- Cinnabar red
- Thin brush strokes
- Large whitespace
- Subtle animations
- Brush-written Chinese characters
- Simple geometric composition

---

# 3. Color Palette

Use a very limited palette.

```text
Paper          #F4F0E6
Light Paper    #FAF8F1
Dark Ink       #202020
Secondary Ink  #77736B
Cinnabar       #A33A32
```

Cinnabar red should be used sparingly as the primary accent.

The interface should not become a conventional red-and-black game.

---

# 4. Board Design

Use the standard Xiangqi board:

- 9 columns
- 10 rows
- Pieces placed on intersections
- Two palaces
- Central river
- Standard Xiangqi geometry

The board should look like ink painted onto paper rather than a wooden board.

Conceptually:

```text
              黑方

       │     │     │
───────┼─────┼─────┼───────
       │     │     │
       │     │     │
       │     │     │

          楚河
          汉界

       │     │     │
       │     │     │
───────┼─────┼─────┼───────
       │     │     │

              红方
```

The visual strokes may have subtle brush irregularity, but the actual gameplay geometry must remain mathematically precise.

---

# 5. Piece Design

Pieces should be 2D and visually resemble small ink seals or hand-painted Xiangqi pieces.

Example:

```text
      ╭─────╮
      │  將 │
      ╰─────╯
```

The piece border should be subtle.

The Chinese character should be the primary visual element.

### Red side

Use restrained cinnabar treatment.

### Black side

Use dark ink treatment.

Avoid:

- Metallic effects
- 3D bevels
- Strong shadows
- Glowing pieces
- Excessive decoration

---

# 6. Game Modes

## Classic

Standard Xiangqi starting formation.

Useful as a baseline for testing the game engine.

## Random

The primary experimental mode.

Each side receives the normal Xiangqi piece inventory, but eligible starting positions are randomized.

Example:

Traditional:

```text
車 馬 象 士 將 士 象 馬 車
```

Randomized:

```text
象 車 馬 士 將 車 士 馬 象
```

The exact formation is generated from a deterministic random seed.

## Future: Chaos

A more experimental mode may eventually randomize the army itself.

This mode is not required for the first version.

---

# 7. Random Formation System

The initial implementation must use **constrained randomization**.

Do not randomly divide all 32 pieces between the two players.

Each side must retain:

```text
General    × 1
Advisor    × 2
Elephant   × 2
Horse      × 2
Chariot    × 2
Cannon     × 2
Soldier    × 5
```

The randomizer must preserve the structural constraints of the Xiangqi starting position.

Required constraints:

- Exactly one General per side.
- General remains inside the palace.
- Five Soldiers occupy valid Soldier positions.
- Two Cannons occupy valid Cannon positions.
- Remaining pieces occupy valid back-rank positions.
- Every generated formation must pass validation before a game begins.

Create a dedicated randomizer module.

---

# 8. Deterministic Seeds

Every randomized game should have a seed.

Example:

```text
INK-7F3A92
```

The same seed must always generate the same formation.

This enables future features such as:

- Share a formation
- Daily challenge
- Replay
- Debugging
- Reproducible AI tests

Example API:

```ts
generateFormation(seed: string): Formation
```

---

# 9. Xiangqi Rules

Unless explicitly modified by a future game mode, standard Xiangqi movement rules apply.

## General

- Moves one point orthogonally.
- Must remain inside the palace.
- The two Generals cannot directly face each other.

## Advisor

- Moves one point diagonally.
- Must remain inside the palace.

## Elephant

- Moves two points diagonally.
- Cannot cross the river.
- Cannot move when its elephant eye is blocked.

## Horse

- Moves in an L-shape.
- Its movement can be blocked by another piece at the horse's leg.

## Chariot

- Moves horizontally or vertically.
- Cannot jump over pieces.

## Cannon

- Moves like a Chariot when not capturing.
- Requires exactly one intervening piece when capturing.

## Soldier

Before crossing the river:

```text
forward
```

After crossing the river:

```text
forward
left
right
```

Soldiers cannot move backward.

---

# 10. Single-Player AI

The initial game is:

```text
Human vs Computer
```

Three difficulty levels will be available.

## Easy

Use shallow search.

Target:

```text
Minimax depth: 1–2
```

Characteristics:

- Basic material evaluation
- Basic check awareness
- Some controlled randomness
- Fast response

## Medium

Use:

```text
Minimax
Alpha-Beta pruning
Depth approximately 3–5
```

Evaluation should consider:

- Material
- Mobility
- General safety
- Piece activity
- Position
- Check
- Threats

## Hard

Use:

```text
Iterative deepening
Alpha-Beta pruning
Move ordering
Transposition table
```

Use a time budget rather than relying exclusively on a fixed search depth.

Suggested starting budgets:

```text
Easy:     ~100 ms
Medium:   ~500 ms
Hard:     ~1500–3000 ms
```

These values should be adjusted based on browser performance.

---

# 11. AI Architecture

The AI must be independent from React.

```text
GameState
    │
    ├── Move Generator
    │
    ├── Rule Validator
    │
    ├── Evaluator
    │
    └── AI Search
          │
          ├── Easy
          ├── Medium
          └── Hard
```

The AI should operate only on game state and legal moves.

It must never directly manipulate UI components.

---

# 12. Technology

Use:

- React
- TypeScript
- Vite
- CSS
- SVG

No backend is required.

No database is required.

No external server is required.

The game should run entirely in the browser.

Avoid unnecessary dependencies.

---

# 13. GitHub Repository

The GitHub repository has already been created.

The development workflow is:

```text
Local Development
       ↓
Git
       ↓
GitHub main branch
       ↓
GitHub Actions
       ↓
Vite production build
       ↓
dist/
       ↓
GitHub Pages
       ↓
Public game URL
```

The repository should remain a static frontend application.

---

# 14. GitHub Pages Deployment

GitHub Actions must automatically deploy the production build whenever changes are pushed to `main`.

The expected production output is:

```text
dist/
```

The Vite configuration must correctly handle the repository's GitHub Pages base path.

If the repository is:

```text
https://github.com/<username>/ink-xiangqi
```

the application should work at:

```text
https://<username>.github.io/ink-xiangqi/
```

## Vite configuration

`vite.config.ts` should contain:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ink-xiangqi/',
})
```

If the repository name changes, the `base` value must match the repository name.

---

# 15. GitHub Actions

Create:

```text
.github/workflows/deploy.yml
```

Use GitHub Actions to build and deploy the application.

Recommended workflow:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    runs-on: ubuntu-latest

    needs: build

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

In GitHub repository settings:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

Do not manually upload `dist/`.

---

# 16. Development Commands

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Create production build:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

After changes:

```bash
git add .
git commit -m "Describe the change"
git push origin main
```

A successful push to `main` should trigger the GitHub Pages deployment automatically.

---

# 17. Project Structure

Recommended structure:

```text
ink-xiangqi/
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── public/
│   └── ...
│
├── src/
│   │
│   ├── ai/
│   │   ├── minimax.ts
│   │   ├── evaluate.ts
│   │   ├── moveOrdering.ts
│   │   ├── transpositionTable.ts
│   │   └── difficulty.ts
│   │
│   ├── game/
│   │   ├── board.ts
│   │   ├── gameState.ts
│   │   ├── piece.ts
│   │   ├── move.ts
│   │   ├── moveGenerator.ts
│   │   ├── rules.ts
│   │   ├── randomizer.ts
│   │   └── validator.ts
│   │
│   ├── components/
│   │   ├── Board.tsx
│   │   ├── Piece.tsx
│   │   ├── Game.tsx
│   │   ├── MainMenu.tsx
│   │   ├── DifficultySelector.tsx
│   │   └── GameControls.tsx
│   │
│   ├── rendering/
│   │   ├── boardRenderer.ts
│   │   ├── pieceRenderer.ts
│   │   └── animations.ts
│   │
│   ├── styles/
│   │   ├── global.css
│   │   ├── board.css
│   │   └── pieces.css
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

The structure can evolve if there is a strong technical reason, but avoid unnecessary complexity.

---

# 18. UI Structure

## Main Menu

Keep the home screen extremely minimal.

```text
                 墨弈

          ─────────────

                PLAY

             Easy
            Medium
             Hard

          ─────────────

        Random Xiangqi
```

Potential future options:

```text
Classic
Random
Chaos
```

Do not build a large navigation system.

---

# 19. In-Game UI

The board should dominate the screen.

Minimal controls:

```text
                 墨弈

          ┌──────────────┐
          │              │
          │              │
          │    BOARD     │
          │              │
          │              │
          └──────────────┘

        AI: Medium

        Restart     Menu
```

Controls should remain visually secondary to the board.

---

# 20. Interaction

Human interaction:

1. Click a piece.
2. Highlight legal destinations.
3. Click a destination.
4. Animate the move.
5. Resolve capture.
6. Update game state.
7. Trigger AI response.

Illegal moves must be rejected.

Selected pieces should receive a subtle ink-like highlight.

Do not use bright glowing effects.

---

# 21. Animation

Animations should feel like ink rather than conventional game effects.

### Piece Selection

```text
subtle expansion
+
soft ink ripple
```

### Movement

Approximately:

```text
150–250 ms
```

Smooth movement between intersections.

### Capture

The captured piece should subtly fade or dissolve.

Avoid explosions or large particle effects.

### Check

Use a restrained cinnabar pulse around the General.

Do not display a large "CHECK!" popup unless needed for accessibility.

---

# 22. Responsive Design

The game must support:

- Desktop
- Tablet
- Mobile

The board should remain the dominant visual element.

Mobile:

```text
          墨弈

     ┌─────────────┐
     │             │
     │    BOARD    │
     │             │
     └─────────────┘

        Medium

      ↶       ⚙
```

Touch input must work reliably.

No horizontal scrolling.

---

# 23. Audio

Audio is optional.

If implemented, keep it subtle:

- Quiet piece click
- Soft brush sound
- Subtle capture sound

No aggressive game sounds.

Audio should be independently toggleable.

---

# 24. Testing

The game engine must have automated tests.

### Piece Movement

Test:

- General
- Advisor
- Elephant
- Horse
- Chariot
- Cannon
- Soldier

### Special Rules

Test:

- Flying General
- Horse-leg blocking
- Elephant-eye blocking
- Palace restriction
- River restriction
- Cannon capture

### Game State

Test:

- Capture
- Turn switching
- Check
- Checkmate
- Game over

### Randomization

Generate thousands of random formations and verify:

- Correct piece counts
- Correct number of Generals
- Valid General positions
- Valid Soldier positions
- Valid Cannon positions
- Valid back-rank positions
- Deterministic seed behavior

### AI

Verify:

- AI only produces legal moves
- AI never moves a captured piece
- AI respects turn order
- AI recognizes check
- AI can detect checkmate

---

# 25. Development Roadmap

## Phase 0 — Existing GitHub Repository + Deployment

- [ ] Confirm repository name is `ink-xiangqi`
- [ ] Initialize React + TypeScript + Vite locally
- [ ] Connect local project to existing GitHub repository
- [ ] Configure `vite.config.ts`
- [ ] Add GitHub Actions workflow
- [ ] Enable GitHub Pages with GitHub Actions
- [ ] Push first build
- [ ] Verify public GitHub Pages URL

Goal:

> A blank React/Vite application successfully deployed to GitHub Pages.

---

## Phase 1 — Xiangqi Engine

- [ ] Board representation
- [ ] Piece representation
- [ ] Game state
- [ ] Move generation
- [ ] Legal move validation
- [ ] Captures
- [ ] Check
- [ ] Checkmate
- [ ] Flying General

Goal:

> A completely correct Xiangqi rules engine without fancy graphics.

---

## Phase 2 — Random Formation

- [ ] Implement formation generator
- [ ] Implement deterministic seeds
- [ ] Implement formation validation
- [ ] Add automated randomization tests
- [ ] Add Classic formation
- [ ] Add Random formation

Goal:

> Every generated formation is valid and reproducible.

---

## Phase 3 — Visual Design

- [ ] Paper background
- [ ] Ink board
- [ ] River
- [ ] Palace
- [ ] Piece design
- [ ] Chinese typography
- [ ] Minimal color system

Goal:

> The game looks like a digital Chinese ink painting before AI is added.

---

## Phase 4 — Human Gameplay

- [ ] Piece selection
- [ ] Legal move indicators
- [ ] Movement
- [ ] Capture
- [ ] Turn indication
- [ ] Check indication
- [ ] Restart
- [ ] Responsive layout

Goal:

> Human can play a complete randomized Xiangqi game locally.

---

## Phase 5 — Easy AI

- [ ] Basic evaluation
- [ ] Minimax
- [ ] Legal move search
- [ ] Controlled randomness
- [ ] Difficulty selection

Goal:

> Human vs Easy AI.

---

## Phase 6 — Medium AI

- [ ] Alpha-beta pruning
- [ ] Better evaluation
- [ ] Mobility
- [ ] General safety
- [ ] Positional evaluation

Goal:

> Human vs Medium AI.

---

## Phase 7 — Hard AI

- [ ] Iterative deepening
- [ ] Move ordering
- [ ] Transposition table
- [ ] Time-limited search
- [ ] Performance optimization

Goal:

> Human vs Hard AI.

---

## Phase 8 — Polish

- [ ] Ink movement animations
- [ ] Capture effects
- [ ] Selection effects
- [ ] Check effects
- [ ] Menu transitions
- [ ] Optional audio
- [ ] Mobile polish
- [ ] Accessibility
- [ ] Loading states
- [ ] Error handling

Goal:

> A polished public browser game.

---

# 26. Engineering Principles

## Separate logic from presentation

Game rules must never depend on React.

Bad:

```text
React component
    ↓
movement rules
    ↓
AI
```

Good:

```text
Game Engine
    ↓
Game State
    ↓
React Renderer
```

## Keep the first version small

Do not implement initially:

- Multiplayer
- Backend
- Accounts
- Matchmaking
- Leaderboards
- Complicated statistics
- Procedural 3D graphics

The first milestone is:

> **A beautiful, playable, randomized Xiangqi game running on GitHub Pages.**

## Avoid unnecessary dependencies

Prefer native browser capabilities and lightweight React components.

Every dependency should have a clear reason to exist.

## Keep game state serializable

The game should ideally be representable as JSON.

This will make future features easier:

- Replay
- Save/load
- Sharing
- Debugging
- Daily challenges
- Multiplayer

---

# 27. Future Ideas

These are intentionally outside the first version.

### Shared Seeds

Share a formation:

```text
INK-7F3A92
```

Another player enters the same seed and receives the same starting formation.

### Daily Formation

Every day:

```text
墨弈 · Daily
September 26, 2026
```

Everyone receives the same randomized formation.

### Hidden Enemy Pieces

The player knows their own randomized army, while some enemy piece identities remain hidden until discovered.

### Chaos Mode

More aggressive randomization of the army and starting constraints.

### Replay

Save and replay a completed game.

### Online Multiplayer

Potential future implementation.

---

# 28. Current MVP

The first public version should contain only:

```text
                    墨弈

                     │
                     ▼

              Main Menu
                     │
            ┌────────┴────────┐
            │                 │
         Difficulty       Game Mode
            │                 │
            └────────┬────────┘
                     ▼
              Random Formation
                     │
                     ▼
              Xiangqi Board
                     │
              ┌──────┴──────┐
              │             │
            Player          AI
              │             │
              └──────┬──────┘
                     ▼
                 Game Over
```

Required MVP features:

- [ ] Browser-based
- [ ] 2D
- [ ] Minimal ink-painting visual style
- [ ] Xiangqi board
- [ ] Standard Xiangqi pieces
- [ ] Randomized starting formation
- [ ] Human vs computer
- [ ] Easy
- [ ] Medium
- [ ] Hard
- [ ] GitHub Pages deployment

---

# 29. Project Goal

**墨弈** is not intended to be a traditional Xiangqi clone.

It explores a simple question:

> **What happens when the familiar rules of Xiangqi meet an unfamiliar starting formation and a minimalist Chinese ink-painting interface?**

The first goal is not to build a large game.

The first goal is to build a **small, beautiful, playable experiment**.

---

## License

TBD.

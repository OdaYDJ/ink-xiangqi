import Board from './components/Board'
import { generateFormation } from './game/randomizer'

const formation = generateFormation('INK-7F3A92')
const pieces = formation.board.flatMap((code, square) => (code ? [{ id: square, square, code }] : []))

export default function App() {
  return (
    <main className="app">
      <h1 className="title">墨弈</h1>
      <div style={{ width: 'min(92vw, 560px)' }}>
        <Board pieces={pieces} />
      </div>
      <p className="subtitle">{formation.seed}</p>
    </main>
  )
}

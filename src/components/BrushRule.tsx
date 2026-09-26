import { useMemo } from 'react'
import { createRng } from '../game/randomizer'
import { brushOutline, calligraphicLine, wobblyLine } from '../rendering/brush'

/** A single horizontal brush stroke used as a divider. */
export default function BrushRule({ seed = 'rule', width = 180 }: { seed?: string; width?: number }) {
  const d = useMemo(() => {
    const rng = createRng(seed)
    return brushOutline(wobblyLine({ x: 6, y: 6 }, { x: width - 6, y: 6 }, rng, 1.2, 8), calligraphicLine(2.6))
  }, [seed, width])
  return (
    <svg className="brush-rule" viewBox={`0 0 ${width} 12`} width={width} height="12" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

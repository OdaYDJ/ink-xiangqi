import { BAMBOO_SPRAY, SPRAY_VIEWBOX } from '../rendering/landscape'
import { Bamboo, useCornerSpray } from './Landscape'
import WaterCanvas from './WaterCanvas'

/**
 * The V2 painting behind the game: looking down into jade water.
 * The water itself is a shader (see rendering/waterShader.ts) over a CSS wash
 * that stands in when WebGL is unavailable; a branch hangs into the corner,
 * close to the eye and a little out of focus.
 * Unlike V1 it is not replayed on each new game: the water just keeps flowing.
 */
export default function WaterScene(_props: { spreadKey: string }) {
  const spray = useCornerSpray()
  return (
    <div className="landscape water" aria-hidden="true">
      <div className="water__depth" />
      <WaterCanvas />
      <svg
        className={`landscape__spray water__branch${spray?.crowded ? ' is-crowded' : ''}`}
        viewBox={`${SPRAY_VIEWBOX.x} ${SPRAY_VIEWBOX.y} ${SPRAY_VIEWBOX.width} ${SPRAY_VIEWBOX.height}`}
        preserveAspectRatio="xMaxYMin meet"
        style={spray ? { width: spray.width, height: spray.height } : { visibility: 'hidden' }}
      >
        <Bamboo plant={BAMBOO_SPRAY} sway={1.1} swayPeriod={7.4} flutter={3} />
      </svg>
    </div>
  )
}

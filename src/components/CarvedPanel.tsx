import { useEffect, useRef } from 'react'
import { paintFrame } from '../rendering/pond/frame'
import { hex, pixelSize } from '../rendering/pond/pixels'

interface CarvedPanelProps {
  className?: string
  /** Frame width: in art pixels, or as a share of the panel's width (the board scales its frame with itself). */
  thickness: number | { share: number }
  surface?: string
  surfaceAlpha?: number
  ornaments?: boolean
  seed?: number
}

/**
 * A carved wooden frame drawn as pixel art behind its parent (which must be
 * positioned). It redraws at the pond's pixel size whenever it or the window resizes,
 * and tells its parent how wide the frame came out (--carved-frame), so padding can clear it.
 */
export default function CarvedPanel({ className = '', thickness, surface = '#0b2a28', surfaceAlpha = 90, ornaments = true, seed = 5 }: CarvedPanelProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const share = typeof thickness === 'number' ? null : thickness.share
  const fixed = typeof thickness === 'number' ? thickness : null

  useEffect(() => {
    const canvas = ref.current!
    let size = ''
    const draw = () => {
      const r = canvas.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) return
      const px = pixelSize(window.innerWidth, window.innerHeight)
      const w = Math.round(r.width / px), h = Math.round(r.height / px)
      const key = `${w}x${h}`
      if (key === size) return
      size = key
      const t = share !== null ? w * share : fixed!
      paintFrame(w, h, { thickness: t, surface: hex(surface), surfaceAlpha, ornaments, seed }, canvas)
      canvas.parentElement?.style.setProperty('--carved-frame', `${(r.width / w) * Math.round(t)}px`)
    }
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    window.addEventListener('resize', draw)
    draw()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', draw)
    }
  }, [share, fixed, surface, surfaceAlpha, ornaments, seed])

  return <canvas ref={ref} className={`carved ${className}`} aria-hidden="true" />
}

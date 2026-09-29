import { useEffect, useRef } from 'react'
import { PondEngine, type Box } from '../rendering/pond/scene'

/** Fired by the board when a piece lands; the pond answers with rings and startled fish. */
export const SPLASH_EVENT = 'pond:splash'
export interface SplashDetail { x: number; y: number; strength: number }

/** The blocks of each screen the scenery must leave clear. */
const CONTENT_BLOCKS = '.menu__frontispiece, .menu__choices, .board-wrap, .game__colophon > *, .music--corner'

/**
 * V3: a koi pond in a Chinese garden, seen from above, in pixel art.
 * The pond itself is drawn by PondEngine; this component measures the content
 * so the garden can recompose around it, cross-fades between compositions,
 * and layers soft light and mist on top (these stay smooth, not pixelated).
 */
export default function PondScene(_props: { spreadKey: string }) {
  const mainRef = useRef<HTMLCanvasElement>(null)
  const nearRef = useRef<HTMLCanvasElement>(null)
  const fadeRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const main = mainRef.current!, near = nearRef.current!, fade = fadeRef.current!
    const engine = new PondEngine(main, near)
    let signature = ''
    let timer = 0
    let first = true

    const measure = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const vw = window.innerWidth, vh = window.innerHeight
        const boxes: Box[] = [...document.querySelectorAll(CONTENT_BLOCKS)]
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height > 0)
          .map((r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }))
        const next = [vw, vh, ...boxes.flatMap((b) => [b.left, b.top, b.right, b.bottom].map((v) => Math.round(v / 12)))].join(',')
        if (next === signature) return
        signature = next
        if (!first) {
          // Hold the old picture over the new one for a moment, then let it dissolve.
          engine.snapshot(fade)
          fade.classList.remove('is-fading')
          void fade.offsetWidth
          fade.classList.add('is-fading')
        }
        first = false
        engine.layout(vw, vh, boxes)
        main.classList.add('is-ready')
      }, first ? 0 : 140)
    }

    const resize = new ResizeObserver(measure)
    const observeBlocks = () => {
      resize.disconnect()
      resize.observe(document.documentElement)
      document.querySelectorAll(CONTENT_BLOCKS).forEach((el) => resize.observe(el))
      measure()
    }
    const root = document.querySelector('.app') ?? document.body
    const mutations = new MutationObserver(observeBlocks)
    mutations.observe(root, { childList: true, subtree: true })
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    observeBlocks()

    const onSplash = (e: Event) => {
      const d = (e as CustomEvent<SplashDetail>).detail
      engine.splash(d.x, d.y, d.strength)
    }
    const onVisibility = () => (document.hidden ? engine.stop() : engine.start())
    window.addEventListener(SPLASH_EVENT, onSplash)
    document.addEventListener('visibilitychange', onVisibility)
    engine.start()

    return () => {
      engine.stop()
      window.clearTimeout(timer)
      resize.disconnect()
      mutations.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener(SPLASH_EVENT, onSplash)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div className="landscape pond" aria-hidden="true">
      <div className="pond__depth" />
      <canvas ref={mainRef} className="pond__canvas pond__main" />
      <canvas ref={fadeRef} className="pond__canvas pond__fade" />
      {/* Sky and leaves reflected on the surface, and light slanting through the morning haze. */}
      <div className="pond__sheen" />
      <div className="pond__rays" />
      <canvas ref={nearRef} className="pond__canvas pond__near" />
      <div className="pond__mist pond__mist--a" />
      <div className="pond__mist pond__mist--b" />
      <div className="pond__vignette" />
    </div>
  )
}

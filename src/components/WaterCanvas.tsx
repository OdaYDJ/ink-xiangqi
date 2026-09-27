import { useEffect, useRef } from 'react'
import { FRAGMENT, MAX_DROPS, VERTEX } from '../rendering/waterShader'

/** Rendering at a fraction of the screen's pixels: water is soft, and this keeps the GPU cool. Phones get less. */
const TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const MAX_PIXELS = TOUCH ? 500_000 : 1_000_000
/** The water moves slowly: 30 frames a second is plenty on phones, and spares the battery. */
const MIN_FRAME_MS = TOUCH ? 32 : 0
/** Seconds between raindrops, at random within this range. */
const DROP_EVERY: [number, number] = [2.6, 5.2]

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('water shader:', gl.getShaderInfoLog(shader))
    return null
  }
  return shader
}

/**
 * The living water behind V2. If WebGL is unavailable, the canvas stays
 * hidden and the CSS wash beneath it shows instead. Pauses in background
 * tabs; with reduced motion it paints one still frame.
 */
export default function WaterCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!canvas || !gl || gl.isContextLost()) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
    const program = gl.createProgram()
    if (!vs || !fs || !program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    // One triangle covering the screen.
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, 'uRes')
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uDrops = gl.getUniformLocation(program, 'uDrops')

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()
    const now = () => (performance.now() - start) / 1000
    const drops = new Float32Array(MAX_DROPS * 4)
    let next = 0
    let aspect = 1

    const addDrop = (time: number, x = Math.random() * aspect, y = Math.random(), strength = 0.7 + Math.random() * 0.6) => {
      drops.set([x, y, time, strength], next * 4)
      next = (next + 1) % MAX_DROPS
    }

    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      const scale = Math.min(window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / Math.max(1, w * h)))
      canvas.width = Math.max(1, Math.round(w * scale))
      canvas.height = Math.max(1, Math.round(h * scale))
      aspect = w / Math.max(1, h)
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (still) draw(8)
    }

    const draw = (time: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, time)
      gl.uniform4fv(uDrops, drops)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    // A few ripples already spreading when the page opens.
    for (const age of [0.8, 2.6, 4.8]) addDrop(-age)
    // Paint a first frame before showing the canvas, so it never fades in empty
    // (for instance when the page opens in a background tab, where frames wait).
    draw(still ? 8 : now())
    canvas.classList.add('is-ready')

    let frame = 0
    let nextDrop = 1.5
    let last = 0
    const loop = (stamp: number) => {
      frame = requestAnimationFrame(loop)
      if (stamp - last < MIN_FRAME_MS) return
      last = stamp
      const time = now()
      if (time > nextDrop) {
        addDrop(time)
        nextDrop = time + DROP_EVERY[0] + Math.random() * (DROP_EVERY[1] - DROP_EVERY[0])
      }
      draw(time)
    }
    const onVisibility = () => {
      cancelAnimationFrame(frame)
      if (!document.hidden && !still) frame = requestAnimationFrame(loop)
    }
    const onLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(frame)
      canvas.classList.remove('is-ready')
    }

    if (still) draw(8)
    else frame = requestAnimationFrame(loop)
    document.addEventListener('visibilitychange', onVisibility)
    canvas.addEventListener('webglcontextlost', onLost)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.classList.remove('is-ready')
      // Free this run's resources but keep the context alive: React may mount
      // the component again on the same canvas (it does so in development).
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  return <canvas ref={ref} className="water__canvas" />
}

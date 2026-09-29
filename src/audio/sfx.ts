/**
 * Sound effects: 水滴落纸，棋子入局。
 *
 * Each effect is a small recipe of layers played through one shared chain:
 *   a very soft wooden contact → a water splash (a sample) → a faint room tail.
 * The splash leads; the wood is felt more than heard. Everything stays well
 * below the background music.
 *
 * New ink-inspired sounds are added as entries in RECIPES. The sample loads
 * on the player's first gesture (always before their first move); until it
 * has decoded, a synthesized droplet stands in. Where the splash begins and
 * how long it rings are measured from the sample itself (see measureSplash),
 * so the sound lands with the piece whatever silence the file opens with.
 */

export const DROP_SRC = `${import.meta.env.BASE_URL}audio/water-splash.mp3`

export type SfxName = 'move' | 'capture'

interface Recipe {
  /** Wooden contact: band-passed noise tap. */
  wood: { frequency: number; duration: number; gain: number }
  /** Water droplet: the sample, pitched by playbackRate. */
  drop: { rate: number; gain: number; delay: number; brightness: number }
  /** Share of the signal sent to the room tail. */
  tail: number
}

const RECIPES: Record<SfxName, Recipe> = {
  // One piece placed: a clean drop with the faintest touch of wood beneath it.
  move: {
    wood: { frequency: 1100, duration: 0.05, gain: 0.05 },
    drop: { rate: 1, gain: 0.2, delay: 0.012, brightness: 4200 },
    tail: 0.14,
  },
  // A capture: the same gesture, a little lower and fuller.
  capture: {
    wood: { frequency: 650, duration: 0.08, gain: 0.09 },
    drop: { rate: 0.8, gain: 0.27, delay: 0.016, brightness: 3200 },
    tail: 0.2,
  },
}

/** The splash is taken from just before it first reaches this share of its peak… */
const ONSET_LEVEL = 0.3
const PRE_ROLL = 0.02
/** …until it has fallen below this share for good, and never for longer than MAX_LENGTH seconds. */
const END_LEVEL = 0.05
const MAX_LENGTH = 1.1
/** Fades at either end of the excerpt: in, so a cut into rising sound never clicks; out, over this share of it. */
const FADE_IN = 0.01
const FADE_OUT_SHARE = 0.5
const TAIL_SECONDS = 0.7

let ctx: AudioContext | null = null
let dry: GainNode | null = null
let wet: ConvolverNode | null = null
let drop: AudioBuffer | null = null
/** The part of the sample that is the splash: start and length, in seconds. */
let splash = { offset: 0, length: 0.2 }
let loading = false

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    ctx = new Ctx()
    dry = ctx.createGain()
    dry.connect(ctx.destination)
    wet = ctx.createConvolver()
    wet.buffer = roomImpulse(ctx)
    wet.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
  return ctx
}

/** A short, dark, quickly fading room: just enough air for the droplet to settle into. */
function roomImpulse(ac: AudioContext): AudioBuffer {
  const length = Math.floor(ac.sampleRate * TAIL_SECONDS)
  const buffer = ac.createBuffer(2, length, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    let smooth = 0
    for (let i = 0; i < length; i++) {
      smooth += ((Math.random() * 2 - 1) - smooth) * 0.35 // one-pole low-pass: no hiss
      data[i] = smooth * (1 - i / length) ** 4
    }
  }
  return buffer
}

async function loadDrop(): Promise<void> {
  const ac = context()
  if (!ac || drop || loading) return
  loading = true
  try {
    const response = await fetch(DROP_SRC)
    if (!response.ok) throw new Error(response.statusText)
    drop = await ac.decodeAudioData(await response.arrayBuffer())
    splash = measureSplash(drop)
  } catch {
    loading = false // the synthesized droplet carries on; try again on the next sound
  }
}

/**
 * Finds the splash in the sample from its loudness over time (10 ms windows, all channels):
 * it starts a moment before the sound first gets loud, and ends once it has died away.
 */
function measureSplash(buffer: AudioBuffer): { offset: number; length: number } {
  const win = Math.max(1, Math.floor(buffer.sampleRate * 0.01))
  const windows = Math.ceil(buffer.length / win)
  const env = new Float32Array(windows)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < data.length; i++) {
      const w = (i / win) | 0
      const v = Math.abs(data[i])
      if (v > env[w]) env[w] = v
    }
  }
  const peak = env.reduce((m, v) => Math.max(m, v), 0)
  if (peak === 0) return { offset: 0, length: Math.min(MAX_LENGTH, buffer.duration) }
  const onset = env.findIndex((v) => v >= peak * ONSET_LEVEL)
  let end = windows - 1
  while (end > onset && env[end] < peak * END_LEVEL) end--
  const offset = Math.max(0, (onset * win) / buffer.sampleRate - PRE_ROLL)
  const length = Math.min(MAX_LENGTH, ((end + 1) * win) / buffer.sampleRate - offset, buffer.duration - offset)
  return { offset, length }
}

/** Route a layer to the dry output and, more faintly, to the room. */
function out(ac: AudioContext, node: AudioNode, tail: number) {
  node.connect(dry!)
  const send = ac.createGain()
  send.gain.value = tail
  node.connect(send).connect(wet!)
}

function wood(ac: AudioContext, at: number, r: Recipe) {
  const { frequency, duration, gain } = r.wood
  const length = Math.floor(ac.sampleRate * duration)
  const buffer = ac.createBuffer(1, length, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 4
  const source = ac.createBufferSource()
  source.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = frequency
  filter.Q.value = 2.5
  const level = ac.createGain()
  level.gain.value = gain
  source.connect(filter).connect(level)
  out(ac, level, r.tail * 0.5)
  source.start(at)
}

function droplet(ac: AudioContext, at: number, r: Recipe) {
  const { rate, gain, delay, brightness } = r.drop
  const start = at + delay
  const soften = ac.createBiquadFilter()
  soften.type = 'lowpass'
  soften.frequency.value = brightness
  const level = ac.createGain()
  soften.connect(level)
  out(ac, level, r.tail)

  if (drop) {
    const source = ac.createBufferSource()
    source.buffer = drop
    source.playbackRate.value = rate
    // The excerpt plays slower (and so longer) when the recipe lowers its pitch.
    const length = splash.length / rate
    level.gain.setValueAtTime(0, start)
    level.gain.linearRampToValueAtTime(gain, start + FADE_IN)
    level.gain.setValueAtTime(gain, start + length * (1 - FADE_OUT_SHARE))
    level.gain.linearRampToValueAtTime(0, start + length)
    source.connect(soften)
    source.start(start, splash.offset, splash.length)
    return
  }

  // Stand-in droplet: a sine that falls quickly in pitch, the way a drop "plinks".
  const tone = ac.createOscillator()
  tone.type = 'sine'
  tone.frequency.setValueAtTime(1500 * rate, start)
  tone.frequency.exponentialRampToValueAtTime(420 * rate, start + 0.09)
  level.gain.setValueAtTime(0.0001, start)
  level.gain.exponentialRampToValueAtTime(gain * 0.8, start + 0.004)
  level.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)
  tone.connect(soften)
  tone.start(start)
  tone.stop(start + 0.18)
}

export function playSfx(name: SfxName): void {
  const ac = context()
  if (!ac) return
  void loadDrop()
  const recipe = RECIPES[name]
  const at = ac.currentTime + 0.005
  wood(ac, at, recipe)
  droplet(ac, at, recipe)
}

/** Load the splash on the first gesture so the first move already sounds right. Safe to call repeatedly. */
export function initSfx(): () => void {
  if (typeof window === 'undefined') return () => undefined
  const types = ['pointerdown', 'keydown', 'touchstart'] as const
  const onGesture = () => {
    off()
    void loadDrop()
  }
  const off = () => types.forEach((t) => window.removeEventListener(t, onGesture, { capture: true }))
  types.forEach((t) => window.addEventListener(t, onGesture, { capture: true, passive: true }))
  return off
}

export const playMoveSound = () => playSfx('move')
export const playCaptureSound = () => playSfx('capture')

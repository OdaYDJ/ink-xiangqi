/**
 * Background music: one looping track, one audio element for the whole app.
 *
 * Framework-independent so React re-renders never touch playback. The UI
 * subscribes to state changes; the controller owns the element, the gain
 * node and the persisted preferences.
 *
 * Browsers block audible autoplay, so nothing plays until the player's first
 * interaction with the page, and then only with a slow fade-in at low volume.
 */

export const MUSIC_SRC = `${import.meta.env.BASE_URL}audio/pipa-xiangqi.mp3`

/** 'waiting' = enabled, but no user interaction yet; 'unavailable' = the track could not be loaded. */
export type MusicStatus = 'waiting' | 'playing' | 'paused' | 'unavailable'

export interface MusicState {
  enabled: boolean
  volume: number
  status: MusicStatus
}

/** Three quiet levels: the music should never compete with the game. */
export const VOLUME_LEVELS = [0.08, 0.15, 0.26] as const
const DEFAULT_VOLUME = 0.15
const STORAGE_KEY = 'ink.music'
const FADE_IN_MS = 2400
const FADE_OUT_MS = 700

interface Saved {
  enabled: boolean
  volume: number
}

function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (raw && typeof raw.enabled === 'boolean' && typeof raw.volume === 'number') {
      return { enabled: raw.enabled, volume: Math.min(1, Math.max(0, raw.volume)) }
    }
  } catch {
    /* storage unavailable or malformed: fall back to defaults */
  }
  return { enabled: true, volume: DEFAULT_VOLUME }
}

class MusicController {
  private state: MusicState
  private readonly listeners = new Set<() => void>()
  private audio: HTMLAudioElement | null = null
  private context: AudioContext | null = null
  private gain: GainNode | null = null
  private fadeFrame = 0
  private armed = false
  private readonly unarm: (() => void)[] = []

  constructor() {
    const saved = load()
    this.state = { ...saved, status: 'waiting' }
  }

  getState = (): MusicState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Prepares the element (metadata only — the track itself streams on first
   * play) and waits for the first user gesture before making any sound.
   * Safe to call repeatedly: there is only ever one element.
   */
  init(): void {
    if (this.audio || typeof window === 'undefined') return
    const audio = new Audio()
    audio.src = MUSIC_SRC
    audio.loop = true
    audio.preload = 'metadata'
    audio.addEventListener('error', () => this.set({ status: 'unavailable' }))
    this.audio = audio
    this.arm()
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  /** The music button: start (if still waiting), or toggle on / off. */
  toggle = (): void => {
    if (this.state.status === 'unavailable') return
    if (this.state.enabled && this.state.status !== 'playing') {
      void this.play()
      return
    }
    const enabled = !this.state.enabled
    this.set({ enabled })
    this.save()
    if (enabled) void this.play()
    else this.pause()
  }

  setVolume = (volume: number): void => {
    this.set({ volume })
    this.save()
    if (this.state.status === 'playing') this.fadeTo(volume, 400)
  }

  private arm(): void {
    if (this.armed) return
    this.armed = true
    const onFirstGesture = (e: Event) => {
      // Let the music button handle its own clicks (it may be the player's way of saying "no music").
      if ((e.target as Element | null)?.closest?.('[data-music-control]')) return
      this.disarm()
      if (this.state.enabled) void this.play()
    }
    for (const type of ['pointerdown', 'keydown', 'touchstart'] as const) {
      window.addEventListener(type, onFirstGesture, { capture: true, passive: true })
      this.unarm.push(() => window.removeEventListener(type, onFirstGesture, { capture: true }))
    }
  }

  private disarm(): void {
    this.unarm.splice(0).forEach((off) => off())
    this.armed = false
  }

  private async play(): Promise<void> {
    const audio = this.audio
    if (!audio || this.state.status === 'unavailable') return
    this.disarm()
    this.connectGain()
    if (this.context?.state === 'suspended') await this.context.resume().catch(() => undefined)
    this.applyGain(0)
    try {
      await audio.play() // resumes from the current position
    } catch {
      // Autoplay still refused (or the load failed): wait for the next gesture.
      if (!this.isUnavailable()) {
        this.set({ status: 'waiting' })
        this.arm()
      }
      return
    }
    this.set({ status: 'playing' })
    this.fadeTo(this.state.volume, FADE_IN_MS)
  }

  private pause(): void {
    const audio = this.audio
    if (!audio || this.state.status !== 'playing') return
    this.fadeTo(0, FADE_OUT_MS, () => {
      audio.pause() // keeps currentTime, so the next play resumes in place
      if (!this.isUnavailable()) this.set({ status: 'paused' })
    })
  }

  /** Pause quietly in a background tab; pick up again when the player returns. */
  private onVisibility = (): void => {
    if (!this.audio) return
    if (document.hidden && this.state.status === 'playing') this.audio.pause()
    else if (!document.hidden && this.state.status === 'playing' && this.audio.paused) void this.audio.play().catch(() => undefined)
  }

  /**
   * Volume goes through a Web Audio gain node where possible: iOS ignores
   * HTMLMediaElement.volume. The element can only be connected once.
   */
  private connectGain(): void {
    if (this.gain || !this.audio) return
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    try {
      this.context = new Ctx()
      this.gain = this.context.createGain()
      this.context.createMediaElementSource(this.audio).connect(this.gain).connect(this.context.destination)
    } catch {
      this.context = null
      this.gain = null
    }
  }

  private currentGain(): number {
    return this.gain ? this.gain.gain.value : (this.audio?.volume ?? 0)
  }

  private applyGain(v: number): void {
    if (this.gain) this.gain.gain.value = v
    else if (this.audio) this.audio.volume = v
  }

  private fadeTo(target: number, ms: number, done?: () => void): void {
    cancelAnimationFrame(this.fadeFrame)
    const from = this.currentGain()
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const eased = t * t * (3 - 2 * t)
      this.applyGain(from + (target - from) * eased)
      if (t < 1) this.fadeFrame = requestAnimationFrame(step)
      else done?.()
    }
    this.fadeFrame = requestAnimationFrame(step)
  }

  /** Read fresh: the element's error event can flip this while a play() is awaiting. */
  private isUnavailable(): boolean {
    return this.state.status === 'unavailable'
  }

  private set(patch: Partial<MusicState>): void {
    const next = { ...this.state, ...patch }
    if (next.enabled === this.state.enabled && next.volume === this.state.volume && next.status === this.state.status) return
    this.state = next
    this.listeners.forEach((l) => l())
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: this.state.enabled, volume: this.state.volume }))
    } catch {
      /* preference just won't persist */
    }
  }
}

/** The one music controller for the app. */
export const music = new MusicController()

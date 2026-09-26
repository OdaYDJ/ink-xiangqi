/**
 * Quiet synthesized sounds (no audio files): a soft wooden tap for moves and
 * a lower, duller tap for captures. Created lazily after the first user gesture.
 */
let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tap(frequency: number, duration: number, volume: number) {
  const ac = context()
  if (!ac) return
  const length = Math.floor(ac.sampleRate * duration)
  const buffer = ac.createBuffer(1, length, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3

  const source = ac.createBufferSource()
  source.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = frequency
  filter.Q.value = 4
  const gain = ac.createGain()
  gain.gain.value = volume
  source.connect(filter).connect(gain).connect(ac.destination)
  source.start()
}

export const playMoveSound = () => tap(1700, 0.09, 0.5)
export const playCaptureSound = () => {
  tap(700, 0.16, 0.6)
  setTimeout(() => tap(1300, 0.07, 0.25), 40)
}

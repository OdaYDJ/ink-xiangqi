import { useSyncExternalStore } from 'react'
import { music, VOLUME_LEVELS } from '../audio/musicController'
import { useLocale } from '../i18n/locale'

/**
 * A small seal-like mark: fixed in the corner on wide screens, or inline with
 * the game's settings on phones and tablets (CSS shows one or the other). Tap to play or pause the music;
 * hover (or keyboard focus) reveals its name and three ink dots for volume, so it needs no tooltip.
 * Hidden entirely when the track is not available.
 */
export default function MusicControl({ placement = 'corner' }: { placement?: 'corner' | 'inline' }) {
  const { t } = useLocale()
  const state = useSyncExternalStore(music.subscribe, music.getState)
  if (state.status === 'unavailable') return null

  const playing = state.enabled && state.status === 'playing'
  const level = VOLUME_LEVELS.reduce((best, v, i) => (Math.abs(v - state.volume) < Math.abs(VOLUME_LEVELS[best] - state.volume) ? i : best), 0)

  return (
    <div className={`music music--${placement}`} data-music-control>
      <div className="music__panel">
        <span className="music__label">{t.music.label}</span>
        <span className="music__levels" role="radiogroup" aria-label={t.music.volume}>
          {VOLUME_LEVELS.map((v, i) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={i === level}
              aria-label={t.music.levels[i]}
              className={`music__level music__level--${i}${i === level ? ' is-active' : ''}`}
              onClick={() => music.setVolume(v)}
            />
          ))}
        </span>
      </div>
      <button
        type="button"
        className={`music__button${playing ? ' is-playing' : ''}`}
        onClick={(e) => {
          // Keep focus on the mark after a tap, so touch screens reveal the volume dots too (no hover there).
          e.currentTarget.focus()
          music.toggle()
        }}
        aria-pressed={playing}
        aria-label={playing ? t.music.pause : t.music.play}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          {/* Two beamed notes (♫), drawn with a light brush. */}
          <path className="music__beam" d="M9.2 6.4L18.4 4.2V7L9.2 9.2Z" />
          <path className="music__stem" d="M9.6 7.4V16.6M18 5.2V14.6" />
          <ellipse className="music__head" cx="7.4" cy="17" rx="2.5" ry="1.9" transform="rotate(-22 7.4 17)" />
          <ellipse className="music__head" cx="15.8" cy="15" rx="2.5" ry="1.9" transform="rotate(-22 15.8 15)" />
          {!playing && <path className="music__slash" d="M4.5 20.5L20.5 3.5" />}
        </svg>
      </button>
    </div>
  )
}

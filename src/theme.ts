/**
 * Which interface to show.
 *   v1  ink on Xuan paper: mountains in mist (the original look)
 *   v2  ink and watercolour: jade water, dappled light, ripples and foliage
 *   v3  a koi pond in a Chinese garden, in pixel art: a carved wooden board, lacquer pieces
 *
 * Each version only adds a scene component and styles scoped under `.ui-v2` /
 * `.ui-v3`; V1 is left as it was. To revert, change DEFAULT_UI. `?ui=v1`, `?ui=v2`
 * or `?ui=v3` overrides it for one visit, which makes them easy to compare.
 */
export type UiVersion = 'v1' | 'v2' | 'v3'

const DEFAULT_UI: UiVersion = 'v3'

export const UI_VERSION: UiVersion = (() => {
  if (typeof window === 'undefined') return DEFAULT_UI
  const asked = new URLSearchParams(window.location.search).get('ui')
  return asked === 'v1' || asked === 'v2' || asked === 'v3' ? asked : DEFAULT_UI
})()

/** The page background lives on <html>/<body>, outside React: mark the document too. */
if (typeof document !== 'undefined') {
  document.documentElement.classList.add(`ui-${UI_VERSION}`)
  // Match the phone's browser chrome to the water.
  const themeColor = { v1: null, v2: '#124440', v3: '#0f3533' }[UI_VERSION]
  if (themeColor) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor)
}

/**
 * Which interface to show.
 *   v1  ink on Xuan paper: mountains in mist (the original look)
 *   v2  ink and watercolour: jade water, dappled light, ripples and foliage
 *
 * V2 only adds a scene component and styles scoped under `.ui-v2`; V1 is left
 * as it was. To revert, set DEFAULT_UI to 'v1'. `?ui=v1` / `?ui=v2` overrides it
 * for one visit, which makes the two easy to compare.
 */
export type UiVersion = 'v1' | 'v2'

const DEFAULT_UI: UiVersion = 'v2'

export const UI_VERSION: UiVersion = (() => {
  if (typeof window === 'undefined') return DEFAULT_UI
  const asked = new URLSearchParams(window.location.search).get('ui')
  return asked === 'v1' || asked === 'v2' ? asked : DEFAULT_UI
})()

/** The page background lives on <html>/<body>, outside React: mark the document too. */
if (typeof document !== 'undefined') {
  document.documentElement.classList.add(`ui-${UI_VERSION}`)
  // Match the phone's browser chrome to the water.
  if (UI_VERSION === 'v2') document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#124440')
}

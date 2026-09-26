import { Component, type ReactNode } from 'react'
import { STRINGS } from '../i18n/strings'

interface State {
  error: Error | null
}

/** Last line of defence: a quiet message instead of a blank page. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    const t = STRINGS[document.documentElement.lang.startsWith('zh') ? 'zh' : 'en']
    return (
      <section className="menu screen" role="alert">
        <h1 className="menu__title" lang="zh-Hant">墨</h1>
        <p className="menu__subtitle">{t.errorTitle}</p>
        <button type="button" className="quiet-button" onClick={() => window.location.reload()}>
          {t.errorAction}
        </button>
      </section>
    )
  }
}

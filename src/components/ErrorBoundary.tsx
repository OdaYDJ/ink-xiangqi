import { Component, type ReactNode } from 'react'

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
    return (
      <section className="menu screen" role="alert">
        <h1 className="menu__title">墨</h1>
        <p className="menu__subtitle">The ink ran. Something went wrong.</p>
        <button type="button" className="ink-button" onClick={() => window.location.reload()}>
          Start again
        </button>
      </section>
    )
  }
}

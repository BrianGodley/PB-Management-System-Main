// src/components/ErrorBoundary.jsx
//
// Catches render-time crashes anywhere in the page tree so one broken page
// shows a readable error panel (with the actual message + stack) instead of
// white/grey-screening the whole app.
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[ErrorBoundary] caught a render error:', error, info)
  }

  componentDidUpdate(prevProps) {
    // Auto-clear the error when resetKey changes (e.g. the user switches to a
    // different module), so a one-off crash in one section doesn't get stuck.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null, info: null })
    }
  }

  reset = () => this.setState({ error: null, info: null })

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children

    const detail = [error?.stack || '', info?.componentStack || '']
      .filter(Boolean)
      .join('\n\n')

    // Inline mode — contains a crash to one section (e.g. a single estimator
    // module) and shows the error there, leaving the rest of the page intact
    // so unsaved work isn't lost. Includes the message + stack to diagnose.
    if (this.props.inline) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 m-2">
          <p className="text-sm font-bold text-red-800">⚠️ This section hit an error</p>
          <p className="mt-0.5 text-xs text-gray-600">
            The rest of your estimate is safe — nothing else was lost. Try again, or close this
            section and reopen it.
          </p>
          <p className="mt-2 break-words font-mono text-xs text-red-700">
            {error?.name ? `${error.name}: ` : ''}
            {error?.message || String(error)}
          </p>
          {detail && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-semibold text-gray-500 hover:text-gray-700">
                Technical details (for support)
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-gray-900 p-2 text-[11px] leading-relaxed text-gray-200">
                {detail}
              </pre>
            </details>
          )}
          <button
            onClick={this.reset}
            className="mt-3 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
          >
            Try again
          </button>
        </div>
      )
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-2xl rounded-2xl border border-red-200 bg-white p-6 shadow-lg">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-xl">
              ⚠️
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">
                Something went wrong on this page
              </h1>
              <p className="text-xs text-gray-500">Reload to continue.</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Error
            </p>
            <p className="break-words font-mono text-sm text-red-700">
              {error?.name ? `${error.name}: ` : ''}
              {error?.message || String(error)}
            </p>
          </div>

          {detail && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-gray-500 hover:text-gray-700">
                Technical details (for support)
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-[11px] leading-relaxed text-gray-200">
                {detail}
              </pre>
            </details>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              Reload page
            </button>
            <a
              href="/"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Go to home
            </a>
          </div>
        </div>
      </div>
    )
  }
}

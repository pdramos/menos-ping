/**
 * Top-level error boundary - without this, any render/effect error in the
 * tree unmounts the whole app silently, leaving a blank window with no clue
 * why. Shows the real error instead so it can be diagnosed from a screenshot.
 */

import React from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    window.logger?.error('Uncaught render error', { message: error.message, stack: error.stack, info })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen w-screen bg-bg text-white flex items-center justify-center p-8">
          <div className="max-w-2xl bg-panel border border-danger/40 rounded-2xl p-6">
            <h1 className="text-lg font-bold text-danger mb-3">⚠ Ocorreu um erro ao carregar a interface</h1>
            <p className="text-sm text-muted mb-3">
              Tira um print desta mensagem e envia para diagnóstico:
            </p>
            <pre className="text-xs text-left whitespace-pre-wrap break-words bg-bg-2 rounded-lg p-3 overflow-auto max-h-80">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

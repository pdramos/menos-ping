/**
 * React renderer main entry point
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import AppContainer from '@components/AppContainer'
import ErrorBoundary from '@components/ErrorBoundary'
import '@renderer/styles.css'

const root = ReactDOM.createRoot(document.getElementById('app') || document.body)

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppContainer />
    </ErrorBoundary>
  </React.StrictMode>
)

/**
 * React renderer main entry point
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import Dashboard from '@pages/Dashboard'
import '@renderer/styles.css'

const root = ReactDOM.createRoot(document.getElementById('app') || document.body)

root.render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
)

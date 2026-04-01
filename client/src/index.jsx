/** @jsxImportSource solid-js */
/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import './index.css'
import App, { routes } from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'

const root = document.getElementById('root')

if (root) {
  render(() => (
    <AuthProvider>
      <Router root={App}>
        {routes.map(r => <Route path={r.path} component={r.component} />)}
      </Router>
    </AuthProvider>
  ), root)
}

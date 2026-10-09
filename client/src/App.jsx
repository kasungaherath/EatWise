import { useEffect, useState } from 'react'
import eatwiseLogo from './assets/eatwise-logo.png'
import { checkSession, logoutUser } from './auth.js'
import InlineAuth from './components/InlineAuth.jsx'
import WorkspaceView from './components/WorkspaceView.jsx'
import './App.css'
import './Workspace.css'
import './LivingHomepage.css'
import './LivingWorkspace.css'
import './Theme.css'
import './AppEntry.css'
import './Buttons.css'
import './WorkspacePalette.css'
import './Selections.css'
import './FoodPhotos.css'

export default function App() {
  const [route, setRoute] = useState(() =>
    window.location.hash.replace(/^#\/?/, '').startsWith('workspace') ? 'workspace' : 'home',
  )
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [pageVisible, setPageVisible] = useState(true)
  const showingWorkspace = route === 'workspace' && user

  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.colorScheme = 'light'
    try { localStorage.removeItem('eatwise-theme') } catch { /* Storage may be unavailable. */ }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const sessionTimeout = window.setTimeout(() => {
      controller.abort()
      setCheckingSession(false)
    }, 5000)
    checkSession(controller.signal)
      .then((sessionUser) => {
        if (!controller.signal.aborted) setUser(sessionUser)
      })
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(sessionTimeout)
        if (!controller.signal.aborted) setCheckingSession(false)
      })
    return () => {
      window.clearTimeout(sessionTimeout)
      controller.abort()
    }
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '')
      if (hash.startsWith('workspace')) setRoute('workspace')
      else if (hash === '' || hash === 'home') setRoute('home')
      // Workspace section anchors must not change the active screen.
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  function navigate(newRoute) {
    setRoute(newRoute)
    window.location.hash = newRoute === 'home' ? '' : `/${newRoute}`
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  async function handleLogout() {
    await logoutUser()
    setUser(null)
    navigate('home')
  }

  function handleLogin(sessionUser) {
    setUser(sessionUser)
    navigate('workspace')
  }

  return (
    <div className={`app ${showingWorkspace ? 'ew-workspace-shell' : 'ew-app-entry'}`} id="top">
      {showingWorkspace && (
        <div className="ew-alive-canvas ew-alive-fullscreen" aria-hidden="true" data-motion={pageVisible ? 'running' : 'paused'}>
          <div className="ew-alive-aura ew-aura-mint" />
          <div className="ew-alive-aura ew-aura-emerald" />
          <div className="ew-alive-aura ew-aura-lime" />
          <div className="ew-alive-aura ew-aura-cyan" />
          <div className="ew-alive-aura ew-aura-iris" />
          <div className="ew-alive-frost" />
        </div>
      )}
      <header className="ew-header">
        <button className="ew-brand-btn" type="button" onClick={() => navigate('home')} aria-label="EatWise home">
          <span className="ew-logo-frame">
            <img className="ew-logo-image" src={eatwiseLogo} width="1945" height="809" alt="EatWise" />
          </span>
        </button>
      </header>
      <main>
        {showingWorkspace ? (
          <WorkspaceView user={user} onLogout={handleLogout} onGoHome={() => navigate('home')} />
        ) : (
          <div className="ew-entry-content">
            <div className="ew-entry-heading">
              <h1>Your nutrition, simplified.</h1>
              <p>Food quantities that fit your goals.</p>
            </div>
            {checkingSession ? (
              <p className="ew-entry-loading" role="status">Opening EatWise…</p>
            ) : user ? (
              <section className="ew-entry-return" aria-labelledby="welcome-heading">
                <h2 id="welcome-heading">Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}.</h2>
                <p>Your targets and food drafts are in your workspace.</p>
                <button className="ew-login-primary ew-action ew-action--primary" type="button" onClick={() => navigate('workspace')}>Open my workspace</button>
                <button className="ew-entry-logout ew-action ew-action--quiet" type="button" onClick={handleLogout}>Log out</button>
              </section>
            ) : (
              <InlineAuth onLoginSuccess={handleLogin} />
            )}
            <details className="ew-entry-help" id="how-it-works">
              <summary>How EatWise works</summary>
              <ol>
                <li>Add your profile and goal to estimate calorie and macro targets.</li>
                <li>Choose your dietary preferences and foods to avoid.</li>
                <li>Generate food quantities, compare macros, and save a daily draft.</li>
              </ol>
              <p>Nutrition estimates and food drafts are guidance. Matching macros does not establish nutritional completeness or personal suitability.</p>
            </details>
          </div>
        )}
      </main>
    </div>
  )
}

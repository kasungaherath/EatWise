import { useEffect, useRef, useState } from 'react'
import AccountPanel from './components/AccountPanel.jsx'
import eatwiseLogo from './assets/eatwise-logo.png'
import servingBoard from './assets/serving-board.png'
import './App.css'
import './Workspace.css'
import './LivingHomepage.css'
import './LivingWorkspace.css'
import './Theme.css'
const steps = [
  {
    number: '01',
    label: 'YOUR STARTING POINT',
    title: 'Tell us about you.',
    description:
      'Add your measurements, activity level, and goal to get estimated calorie and macro targets.',
  },
  {
    number: '02',
    label: 'YOUR PREFERENCES',
    title: 'Make room for your tastes.',
    description:
      'Set your dietary preferences and foods to avoid. EatWise filters the available catalogue using supported checks.',
  },
  {
    number: '03',
    label: 'YOUR DAILY DRAFT',
    title: 'See the quantities clearly.',
    description:
      'Generate food suggestions, compare their nutrition with your targets, and save a draft to revisit.',
  },
]

function ArrowIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    try { localStorage.setItem('eatwise-theme', theme) } catch { /* Storage may be unavailable. */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101d1a' : '#fafbf7')
  }, [theme])
  const heroRef = useRef(null)
  const workspaceRef = useRef(null)
  const [heroVisible, setHeroVisible] = useState(true)
  const [workspaceVisible, setWorkspaceVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroRef.current) setHeroVisible(entry.isIntersecting)
        if (entry.target === workspaceRef.current) setWorkspaceVisible(entry.isIntersecting)
      })
    })
    if (heroRef.current) observer.observe(heroRef.current)
    if (workspaceRef.current) observer.observe(workspaceRef.current)
    const updateVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  return (
    <div className="app" id="top">
      <header className="ew-header">
        <a className="ew-brand" href="#top" aria-label="EatWise home">
          <span className="ew-logo-frame">
            <img className="ew-logo-image" src={eatwiseLogo} width="1945" height="809" alt="EatWise" />
          </span>
        </a>

        <nav className="ew-nav" aria-label="Main navigation">
          <button className="ew-theme-toggle" type="button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {theme === 'dark' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>
                : <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />}
            </svg>
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <a className="ew-nav-link" href="#how-it-works">
            How it works
          </a>
          <a className="ew-nav-button" href="#eatwise-workspace">
            My workspace
            <ArrowIcon />
          </a>
        </nav>
      </header>

      <main>
        <section
          ref={heroRef}
          className="ew-hero"
          data-motion={!heroVisible || !pageVisible ? 'paused' : 'running'}
          aria-labelledby="ew-hero-title"
        >
          <div className="ew-colour-field" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="ew-hero-content">
            <h1 id="ew-hero-title" className="ew-hero-title">
              Your goals.
              <br />
              Your food.
              <br />
              <span>A clearer plan.</span>
            </h1>

            <p className="ew-hero-description">
              Turn your nutrition targets into simple food quantities.
              EatWise brings AI suggestions and calculated nutrition
              together, so you can see what goes into your day.
            </p>

            <div className="ew-hero-actions">
              <a className="ew-button" href="#eatwise-workspace">
                Build my food plan
                <ArrowIcon />
              </a>

              <a className="ew-text-link" href="#how-it-works">
                See how it works
              </a>
            </div>

            <div className="ew-hero-highlights" aria-label="Features">
              <span>Individual food quantities</span>
              <span>Calorie & macro comparisons</span>
              <span>Saved daily drafts</span>
            </div>
          </div>

          <div className="ew-meal-stage">
            <div className="ew-meal-shadow" aria-hidden="true" />
            <img className="ew-serving-board" src={servingBoard} width="1254" height="1254"
              alt="A sage-green serving board holding a chicken and vegetable meal bowl, a fresh fruit bowl, and a glass of milk"
              fetchPriority="high" />
          </div>
        </section>

        <section
          className="ew-how"
          id="how-it-works"
          aria-labelledby="ew-how-title"
        >
          <div className="ew-section-heading">
            <div>
              <h2 id="ew-how-title">From your goals to your daily draft.</h2>
            </div>
            <p>Three steps to make planning feel more manageable.</p>
          </div>

          <div className="ew-steps">
            {steps.map((step) => (
              <article className="ew-step" key={step.number}>
                <div className="ew-step-top">
                  <span className="ew-step-number">{step.number}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          ref={workspaceRef}
          className="ew-workspace"
          data-motion={!workspaceVisible || !pageVisible ? 'paused' : 'running'}
          id="eatwise-workspace"
          aria-labelledby="ew-workspace-title"
        >
          <div className="ew-section-heading ew-workspace-heading">
            <div>
              <h2 id="ew-workspace-title">Your EatWise workspace.</h2>
            </div>
            <p>
              Manage your profile, explore food suggestions, and keep
              your saved drafts together.
            </p>
          </div>


          <AccountPanel />
        </section>

        <aside className="ew-guidance" aria-label="About your estimates">
          <span className="ew-guidance-label">A little perspective</span>
          <p>
            EatWise provides estimated nutrition and food-plan drafts.
            Matching calorie and macro targets does not establish
            nutritional completeness or personal suitability.
          </p>
        </aside>
      </main>

      <footer className="ew-footer">
        <a className="ew-brand ew-footer-brand" href="#top" aria-label="EatWise home">
          <span className="ew-logo-frame">
            <img className="ew-logo-image" src={eatwiseLogo} width="1945" height="809" alt="EatWise" loading="lazy" />
          </span>
        </a>

        <p>Everyday food. Thoughtful planning.</p>

        <a className="ew-footer-link" href="#top">
          Back to top <span aria-hidden="true">↑</span>
        </a>
      </footer>
    </div>
  )
}

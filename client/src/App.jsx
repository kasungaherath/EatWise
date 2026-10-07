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
  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.colorScheme = 'light'
    try { localStorage.removeItem('eatwise-theme') } catch { /* Storage may be unavailable. */ }
  }, [])

  const [route, setRoute] = useState(() => {
    const hash = window.location.hash.replace(/^#\/?/, '')
    if (hash === 'workspace') return 'workspace'
    return 'home'
  })

  const [user, setUser] = useState(null)
  const [pageVisible, setPageVisible] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    checkSession(controller.signal)
      .then((sessionUser) => {
        if (!controller.signal.aborted && sessionUser) {
          setUser(sessionUser)
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '')
      if (hash === 'workspace' || hash.startsWith('workspace')) {
        setRoute('workspace')
      } else if (hash === '' || hash === 'home') {
        setRoute('home')
      }
      // In-page section anchors (#profile-heading, #purpose, etc.) should never change the active route
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  function navigate(newRoute) {
    setRoute(newRoute)
    if (newRoute === 'home') {
      window.location.hash = ''
    } else {
      window.location.hash = `/${newRoute}`
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleLogout() {
    await logoutUser()
    setUser(null)
    navigate('home')
  }

  return (
    <div className="app" id="top">
      {/* Full-screen alive fluid motion canvas inspired by Gemini */}
      <div
        className="ew-alive-canvas ew-alive-fullscreen"
        aria-hidden="true"
        data-motion={!pageVisible ? 'paused' : 'running'}
      >
        <div className="ew-alive-aura ew-aura-mint" />
        <div className="ew-alive-aura ew-aura-emerald" />
        <div className="ew-alive-aura ew-aura-lime" />
        <div className="ew-alive-aura ew-aura-cyan" />
        <div className="ew-alive-aura ew-aura-iris" />
        <div className="ew-alive-frost" />
      </div>

      <header className="ew-header">
        <button
          className="ew-brand-btn"
          type="button"
          onClick={() => navigate('home')}
          aria-label="EatWise home"
        >
          <span className="ew-logo-frame">
            <img className="ew-logo-image" src={eatwiseLogo} width="1945" height="809" alt="EatWise" />
          </span>
        </button>

        <nav className="ew-nav" aria-label="Main navigation">
          {route === 'home' && (
            <a className="ew-nav-link" href="#how-it-works">
              How it works
            </a>
          )}

          {user && (
            <div className="ew-nav-user-cluster">
              <button
                className="ew-nav-button"
                type="button"
                onClick={() => navigate(route === 'workspace' ? 'home' : 'workspace')}
              >
                <span>{route === 'workspace' ? 'Overview' : 'My workspace'}</span>
                <ArrowIcon />
              </button>
              <button
                className="ew-nav-logout"
                type="button"
                onClick={handleLogout}
                aria-label="Log out"
              >
                Log out
              </button>
            </div>
          )}
        </nav>
      </header>

      <main>
        {route === 'workspace' ? (
          user ? (
            <WorkspaceView
              user={user}
              onLogout={handleLogout}
              onGoHome={() => navigate('home')}
            />
          ) : (
            <div className="ew-workspace-page">
              <div className="ew-workspace-heading-block" style={{ textAlign: 'center', margin: '48px auto' }}>
                <h1 className="ew-workspace-title">Sign in to view your workspace</h1>
                <p className="ew-workspace-subtitle" style={{ margin: '12px auto' }}>
                  Please sign in below to access your nutrition profile, dietary preferences, and saved meal drafts.
                </p>
                <InlineAuth
                  onLoginSuccess={(loggedInUser) => {
                    setUser(loggedInUser)
                    navigate('workspace')
                  }}
                />
              </div>
            </div>
          )
        ) : (
          <>
            <section
              className="ew-hero"
              aria-labelledby="ew-hero-title"
            >
              <div className="ew-hero-content">
                <h1 id="ew-hero-title" className="ew-hero-title">
                  Your goals. Your food.
                  <br />
                  <span className="ew-hero-title-accent">A clearer plan.</span>
                </h1>

                <p className="ew-hero-description">
                  Turn your nutrition targets into simple, personalized food quantities.
                  EatWise brings AI suggestions and calculated nutrition together,
                  so you can clearly see what goes into your day.
                </p>

                {user ? (
                  <div className="ew-hero-authenticated-box">
                    <div className="ew-hero-user-status">
                      <span className="ew-user-status-dot" aria-hidden="true" />
                      <span>Signed in as <strong>{user.name || user.email}</strong></span>
                    </div>
                    <div className="ew-hero-authenticated-actions">
                      <button
                        className="ew-button"
                        type="button"
                        onClick={() => navigate('workspace')}
                      >
                        <span>Open my workspace</span>
                        <ArrowIcon />
                      </button>
                      <button
                        className="ew-hero-secondary-btn"
                        type="button"
                        onClick={handleLogout}
                      >
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <InlineAuth
                    onLoginSuccess={(loggedInUser) => {
                      setUser(loggedInUser)
                      navigate('workspace')
                    }}
                  />
                )}

                <div className="ew-hero-highlights" aria-label="Key features">
                  <span className="ew-hero-pill">
                    <span className="ew-pill-bullet" aria-hidden="true" />
                    Individual food quantities
                  </span>
                  <span className="ew-hero-pill">
                    <span className="ew-pill-bullet" aria-hidden="true" />
                    Calorie & macro comparisons
                  </span>
                  <span className="ew-hero-pill">
                    <span className="ew-pill-bullet" aria-hidden="true" />
                    Saved daily drafts
                  </span>
                </div>

                <a href="#purpose" className="ew-hero-explore-prompt">
                  <span>Explore the purpose of EatWise & how it works</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 5v14M19 12l-7 7-7-7" />
                  </svg>
                </a>
              </div>
            </section>

            {/* Section 1: The Core Philosophy & Purpose */}
            <section className="ew-purpose-section" id="purpose" aria-labelledby="ew-purpose-heading">
              <div className="ew-section-header">
                <h2 id="ew-purpose-heading" className="ew-section-title">
                  The problem with tracking numbers instead of food.
                </h2>
                <p className="ew-section-sub">
                  Calculators tell you to eat 2,150 calories and 130 grams of protein. But you don't eat numbers—you eat food. EatWise bridges the gap between your metabolic science and your actual plate.
                </p>
              </div>

              <div className="ew-purpose-grid">
                <article className="ew-purpose-card">
                  <div className="ew-purpose-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <h3>Plan ahead, not in retrospect</h3>
                  <p>
                    Traditional trackers wait for you to log at 10 PM, only to show you missed your goals. EatWise drafts your entire day in advance so you can buy, cook, and eat with calm certainty.
                  </p>
                </article>

                <article className="ew-purpose-card">
                  <div className="ew-purpose-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                  </div>
                  <h3>Real grams, not abstract formulas</h3>
                  <p>
                    Instead of guessing how many cups of rice or portions of chicken add up to your macros, EatWise calculates exact gram weights and whole portions matched to your body's energy expenditure.
                  </p>
                </article>

                <article className="ew-purpose-card">
                  <div className="ew-purpose-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <h3>Verified science, not AI guesswork</h3>
                  <p>
                    AI suggests appetizing, diverse food combinations that respect your allergies and dietary boundaries. Every nutrient sum is recalculated strictly against validated food data.
                  </p>
                </article>
              </div>
            </section>

            {/* Section 2: Live Purpose Demonstration */}
            <section className="ew-plate-section" id="plate-demo" aria-labelledby="ew-plate-heading">
              <div className="ew-section-header">
                <h2 id="ew-plate-heading" className="ew-section-title">
                  See how targets turn into your day.
                </h2>
                <p className="ew-section-sub">
                  Here is how a real 2,185 kcal active maintenance goal translates into simple, whole food quantities across your day.
                </p>
              </div>

              <div className="ew-plate-showcase">
                <div className="ew-plate-target-bar">
                  <div className="ew-target-badge">
                    <span>Target Goal</span>
                    <strong>2,185 kcal</strong>
                  </div>
                  <div className="ew-target-metric">
                    <span>Protein</span>
                    <strong>125 g</strong>
                  </div>
                  <div className="ew-target-metric">
                    <span>Carbohydrates</span>
                    <strong>245 g</strong>
                  </div>
                  <div className="ew-target-metric">
                    <span>Healthy Fats</span>
                    <strong>72 g</strong>
                  </div>
                  <div className="ew-target-status">
                    <span className="ew-status-dot" aria-hidden="true" />
                    <span>Balanced Calibration</span>
                  </div>
                </div>

                <div className="ew-plate-meals-grid">
                  <article className="ew-plate-meal-card">
                    <div className="ew-meal-header">
                      <span className="ew-meal-time">BREAKFAST</span>
                      <span className="ew-meal-energy">449 kcal · 33g Protein</span>
                    </div>
                    <h4>Rolled Oats & Greek Yogurt Bowl</h4>
                    <ul className="ew-meal-ingredients">
                      <li><span>Rolled oats (with cinnamon)</span> <strong>80 g</strong></li>
                      <li><span>Plain low-fat Greek yogurt</span> <strong>200 g</strong></li>
                      <li><span>Fresh wild blueberries</span> <strong>100 g</strong></li>
                      <li><span>Raw California almonds</span> <strong>15 g</strong></li>
                    </ul>
                  </article>

                  <article className="ew-plate-meal-card">
                    <div className="ew-meal-header">
                      <span className="ew-meal-time">LUNCH</span>
                      <span className="ew-meal-energy">824 kcal · 78g Protein</span>
                    </div>
                    <h4>Herb Chicken, Brown Rice & Greens</h4>
                    <ul className="ew-meal-ingredients">
                      <li><span>Grilled tender chicken breast</span> <strong>220 g</strong></li>
                      <li><span>Steamed brown basmati rice</span> <strong>200 g</strong></li>
                      <li><span>Garden broccoli & zucchini</span> <strong>180 g</strong></li>
                      <li><span>Cold-pressed extra virgin olive oil</span> <strong>18 g</strong></li>
                    </ul>
                  </article>

                  <article className="ew-plate-meal-card">
                    <div className="ew-meal-header">
                      <span className="ew-meal-time">DINNER</span>
                      <span className="ew-meal-energy">509 kcal · 37g Protein</span>
                    </div>
                    <h4>Atlantic Salmon & Sweet Potato</h4>
                    <ul className="ew-meal-ingredients">
                      <li><span>Baked Atlantic salmon fillet</span> <strong>170 g</strong></li>
                      <li><span>Roasted sweet potato wedges</span> <strong>180 g</strong></li>
                      <li><span>Crisp garden salad with lemon</span> <strong>150 g</strong></li>
                      <li><span>Cold-pressed olive oil drizzle</span> <strong>10 g</strong></li>
                    </ul>
                  </article>
                </div>

                <div className="ew-plate-summary-footer">
                  <div className="ew-summary-text">
                    <strong>The Outcome:</strong> Zero tracking fatigue. You buy these ingredients, cook these quantities, and hit your nutrition goals effortlessly.
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: The 4 Foundations of Our Planning Engine */}
            <section className="ew-pillars-section" id="engine" aria-labelledby="ew-pillars-heading">
              <div className="ew-section-header">
                <h2 id="ew-pillars-heading" className="ew-section-title">
                  Built on four foundations of nutritional care.
                </h2>
                <p className="ew-section-sub">
                  Every suggestion and calculation in EatWise is governed by core principles.
                </p>
              </div>

              <div className="ew-pillars-grid">
                <article className="ew-pillar-card">
                  <span className="ew-pillar-num">01</span>
                  <h3>Individual Body Science</h3>
                  <p>
                    Calculates your resting metabolic rate (BMR) and daily expenditure (TDEE) using the validated Mifflin-St Jeor formula, tailored to your measurements and training level.
                  </p>
                </article>

                <article className="ew-pillar-card">
                  <span className="ew-pillar-num">02</span>
                  <h3>Goal-Driven Calibration</h3>
                  <p>
                    Intelligently adapts your caloric targets: controlled deficits for sustainable fat loss, equilibrium for daily vitality, or a modest surplus for muscle hypertrophy.
                  </p>
                </article>

                <article className="ew-pillar-card">
                  <span className="ew-pillar-num">03</span>
                  <h3>Boundary Respect</h3>
                  <p>
                    Full support for vegan, vegetarian, pescatarian, or omnivore preferences, with strict exclusions for allergens, disliked foods, and daily budget parameters.
                  </p>
                </article>

                <article className="ew-pillar-card">
                  <span className="ew-pillar-num">04</span>
                  <h3>Reusable Plan Library</h3>
                  <p>
                    Save your favourite daily combinations into your private library. Revisit your best drafts whenever life gets busy, keeping your nutrition calm and consistent.
                  </p>
                </article>
              </div>
            </section>

            {/* Section 4: Traditional Calorie Tracking vs The EatWise Method */}
            <section className="ew-comparison-section" id="comparison" aria-labelledby="ew-comparison-heading">
              <div className="ew-section-header">
                <h2 id="ew-comparison-heading" className="ew-section-title">
                  Two ways to approach your daily nutrition.
                </h2>
                <p className="ew-section-sub">
                  Why reactive calorie counting fails, and why proactive food planning endures.
                </p>
              </div>

              <div className="ew-comparison-grid">
                <div className="ew-comparison-column ew-comparison-old">
                  <div className="ew-column-badge">TRADITIONAL TRACKING</div>
                  <h3>The Reactive Struggle</h3>
                  <ul className="ew-comparison-list">
                    <li>
                      <span className="ew-cross-mark" aria-hidden="true">✕</span>
                      <span>Log food after you’ve already eaten, creating continuous mental overhead</span>
                    </li>
                    <li>
                      <span className="ew-cross-mark" aria-hidden="true">✕</span>
                      <span>Scan endless commercial barcodes with unverified community nutrition entries</span>
                    </li>
                    <li>
                      <span className="ew-cross-mark" aria-hidden="true">✕</span>
                      <span>End your day 40g short on protein and over on calories with no recovery path</span>
                    </li>
                    <li>
                      <span className="ew-cross-mark" aria-hidden="true">✕</span>
                      <span>Promotes obsessive calorie counting and unsustainable diet burnout</span>
                    </li>
                  </ul>
                </div>

                <div className="ew-comparison-column ew-comparison-new">
                  <div className="ew-column-badge ew-badge-highlight">THE EATWISE METHOD</div>
                  <h3>The Proactive Blueprint</h3>
                  <ul className="ew-comparison-list">
                    <li>
                      <span className="ew-check-mark" aria-hidden="true">✓</span>
                      <span>Set your targets and generate a complete daily draft before you start</span>
                    </li>
                    <li>
                      <span className="ew-check-mark" aria-hidden="true">✓</span>
                      <span>Know the exact gram weights and whole food portions to buy and cook</span>
                    </li>
                    <li>
                      <span className="ew-check-mark" aria-hidden="true">✓</span>
                      <span>Hit your calories and macros reliably with balanced, appetizing plates</span>
                    </li>
                    <li>
                      <span className="ew-check-mark" aria-hidden="true">✓</span>
                      <span>Save successful drafts as reusable blueprints to build long-term habits</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 5: The 3 Simple Workflow Steps */}
            <section
              className="ew-how"
              id="how-it-works"
              aria-labelledby="ew-how-title"
            >
              <div className="ew-section-heading">
                <div>
                  <h2 id="ew-how-title">How it works step by step.</h2>
                </div>
                <p>Three straightforward steps from your goals to a finalized plate.</p>
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

            {/* Scientific Perspective */}
            <aside className="ew-guidance-card" aria-labelledby="ew-perspective-heading">
              <h3 id="ew-perspective-heading">A compass, not a cage.</h3>
              <p>
                EatWise provides estimated nutrition calculations and food-plan drafts designed to foster mindful eating and practical food preparation. Meeting calorie and macro targets is a supportive guide, not a medical guarantee of nutritional completeness or individual health outcomes.
              </p>
            </aside>

            {/* Bottom Call to Action */}
            <section className="ew-bottom-cta-section" aria-labelledby="ew-cta-title">
              <div className="ew-bottom-cta-box">
                <h2 id="ew-cta-title">Ready to see your food quantities clearly?</h2>
                <p>
                  Take the guesswork out of meal planning. Calculate your targets and see your personalized food quantities right now.
                </p>
                <a href="#top" className="ew-button ew-bottom-cta-btn">
                  <span>Go to the login dashboard ↑</span>
                  <ArrowIcon />
                </a>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="ew-footer">
        <button
          className="ew-brand-btn ew-footer-brand"
          type="button"
          onClick={() => navigate('home')}
          aria-label="EatWise home"
        >
          <span className="ew-logo-frame">
            <img className="ew-logo-image" src={eatwiseLogo} width="1945" height="809" alt="EatWise" loading="lazy" />
          </span>
        </button>

        <p>Everyday food. Thoughtful planning.</p>

        <a className="ew-footer-link" href="#top">
          Back to top <span aria-hidden="true">↑</span>
        </a>
      </footer>
    </div>
  )
}

import AccountPanel from './components/AccountPanel.jsx'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="#" aria-label="EatWise home">
          <span className="brand-icon">e</span>
          EatWise
        </a>

        <a className="nav-link" href="#how-it-works">
          How it works
        </a>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">PERSONALIZED NUTRITION</span>

            <h1>
              Eat smarter.
              <br />
              <span>Live your best.</span>
            </h1>

            <p className="hero-description">
              Meal planning built around your body, your lifestyle,
              and the foods you love. Take the guesswork out of
              your next meal.
            </p>

            <a className="primary-button" href="#account">
              Get started <span aria-hidden="true">↗</span>
            </a>

            <p className="hero-note">
              Your preferences. Your pace. Your plan.
            </p>
          </div>

          <div className="meal-preview">
            <div className="preview-header">
              <span className="preview-label">
                A TASTE OF YOUR PLAN
              </span>
              <span className="example-badge">Example</span>
            </div>

            <h2>A little balance, every day.</h2>

            <p className="preview-description">
              Simple ingredients. Meals worth looking forward to.
            </p>

            <div className="meal-list">
              <article className="meal">
                <span className="meal-number">01</span>

                <div>
                  <span className="meal-time">BREAKFAST</span>
                  <h3>Oats & fresh fruit</h3>
                  <p>A fresh start to your morning.</p>
                </div>
              </article>

              <article className="meal">
                <span className="meal-number">02</span>

                <div>
                  <span className="meal-time">LUNCH</span>
                  <h3>Rice & chicken bowl</h3>
                  <p>With a colourful serving of vegetables.</p>
                </div>
              </article>

              <article className="meal">
                <span className="meal-number">03</span>

                <div>
                  <span className="meal-time">DINNER</span>
                  <h3>Lentil & vegetable curry</h3>
                  <p>A comforting finish to your day.</p>
                </div>
              </article>
            </div>

            <p className="preview-footer">
              Illustrative meals — your plan will follow your preferences.
            </p>
          </div>
        </section>

        <AccountPanel />

        <section className="how-section" id="how-it-works">
          <span className="eyebrow">MADE FOR YOUR EVERYDAY</span>

          <h2>A simpler way to plan your meals.</h2>

          <div className="features">
            <article className="feature">
              <span className="feature-number">01 / YOUR PROFILE</span>
              <h3>Start with you</h3>
              <p>
                Share your body measurements, activity level,
                and personal goals.
              </p>
            </article>

            <article className="feature">
              <span className="feature-number">
                02 / YOUR PREFERENCES
              </span>
              <h3>Make it personal</h3>
              <p>
                Choose the foods you enjoy, your dietary preferences,
                and your budget.
              </p>
            </article>

            <article className="feature">
              <span className="feature-number">03 / YOUR MEALS</span>
              <h3>Plan with confidence</h3>
              <p>
                Get meal suggestions with portions and estimated
                nutrition tailored to your needs.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span className="footer-brand">EatWise</span>
        <p>Eat smarter. Reach your goals.</p>
      </footer>
    </div>
  )
}

export default App
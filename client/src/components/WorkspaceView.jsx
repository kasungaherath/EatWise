import { useEffect, useState } from 'react'
import ProfileForm from './ProfileForm.jsx'
import PreferencesForm from './PreferencesForm.jsx'
import NutritionSummary from './NutritionSummary.jsx'
import FoodSuggestions from './FoodSuggestions.jsx'
import SavedFoodPlans from './SavedFoodPlans.jsx'

const WORKSPACE_SECTIONS = [
  { id: 'profile-heading', num: '01', label: 'Personal Profile' },
  { id: 'nutrition-heading', num: '02', label: 'Nutrition Targets' },
  { id: 'preferences-heading', num: '03', label: 'Dietary Preferences' },
  { id: 'food-suggestions-heading', num: '04', label: 'Food Quantity Draft' },
  { id: 'saved-food-plans-heading', num: '05', label: 'Saved Drafts' },
]

export default function WorkspaceView({ user, onLogout, onGoHome }) {
  const [profileRevision, setProfileRevision] = useState(0)
  const [preferencesRevision, setPreferencesRevision] = useState(0)
  const [savedPlansRevision, setSavedPlansRevision] = useState(0)
  const [activeSection, setActiveSection] = useState('profile-heading')

  function scrollToSection(id) {
    setActiveSection(id)
    const headingEl = document.getElementById(id)
    if (headingEl) {
      const card = headingEl.closest('section') || headingEl
      card.scrollIntoView({ behavior: 'smooth', block: 'start' })

      card.classList.remove('ew-section-highlight')
      void card.offsetWidth
      card.classList.add('ew-section-highlight')
      setTimeout(() => {
        card.classList.remove('ew-section-highlight')
      }, 1500)
    }
  }

  useEffect(() => {
    const handleIntersect = (entries) => {
      const visible = entries.find((entry) => entry.isIntersecting)
      if (visible && visible.target) {
        const heading = visible.target.querySelector('h3[id]')
        if (heading && heading.id) {
          setActiveSection(heading.id)
        }
      }
    }

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '-80px 0px -50% 0px',
      threshold: [0.1, 0.4]
    })

    WORKSPACE_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) {
        const card = el.closest('section') || el
        observer.observe(card)
      }
    })

    return () => observer.disconnect()
  }, [profileRevision, preferencesRevision, savedPlansRevision])

  return (
    <div className="ew-workspace ew-workspace-page" id="workspace-screen">
      <div className="ew-workspace-topbar">
        <div className="ew-workspace-user-info">
          <span className="ew-user-avatar" aria-hidden="true">
            {(user.name || user.email || 'U')[0].toUpperCase()}
          </span>
          <div className="ew-user-details">
            <strong>{user.name || 'EatWise Member'}</strong>
            <span>{user.email}</span>
          </div>
          {user.isDemo && (
            <span className="ew-demo-tag">Guest Demo Mode</span>
          )}
        </div>

        <div className="ew-workspace-topbar-actions">
          <button
            className="ew-nav-button"
            type="button"
            onClick={onGoHome}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5m7 7-7-7 7-7" />
            </svg>
            <span>Overview</span>
          </button>

          <button
            className="ew-logout-button"
            type="button"
            onClick={onLogout}
          >
            <span>Log out</span>
          </button>
        </div>
      </div>

      <div className="ew-workspace-heading-block">
        <h1 className="ew-workspace-title">Your EatWise Workspace</h1>
        <p className="ew-workspace-subtitle">
          Manage your personal measurements, calculate targets, set dietary preferences, generate AI food quantities, and save your daily meal drafts.
        </p>

        <nav className="ew-workspace-nav-pills" aria-label="Workspace sections">
          {WORKSPACE_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              className={`ew-workspace-pill ${activeSection === sec.id ? 'is-active' : ''}`}
              onClick={() => scrollToSection(sec.id)}
              aria-current={activeSection === sec.id ? 'true' : undefined}
            >
              <span className="ew-pill-idx">{sec.num}</span>
              <span>{sec.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="ew-workspace-content">
        <ProfileForm
          key={`profile-${user.id}`}
          isDemo={user.isDemo}
          onSaved={() => setProfileRevision((prev) => prev + 1)}
        />

        <NutritionSummary
          key={`nutrition-${user.id}`}
          isDemo={user.isDemo}
          refreshKey={profileRevision}
        />

        <PreferencesForm
          key={`preferences-${user.id}`}
          isDemo={user.isDemo}
          onSaved={() => setPreferencesRevision((prev) => prev + 1)}
        />

        <FoodSuggestions
          key={`suggestions-${user.id}-${profileRevision}-${preferencesRevision}`}
          isDemo={user.isDemo}
          onSaved={() => setSavedPlansRevision((prev) => prev + 1)}
        />

        <SavedFoodPlans
          key={`saved-plans-${user.id}`}
          isDemo={user.isDemo}
          refreshKey={savedPlansRevision}
        />
      </div>

      <aside className="ew-guidance" aria-label="About your estimates">
        <span className="ew-guidance-label">A little perspective</span>
        <p>
          EatWise provides estimated nutrition and food-plan drafts.
          Matching calorie and macro targets does not establish
          nutritional completeness or personal suitability.
        </p>
      </aside>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import ProfileForm from './ProfileForm.jsx'
import PreferencesForm from './PreferencesForm.jsx'
import NutritionSummary from './NutritionSummary.jsx'
import FoodSuggestions from './FoodSuggestions.jsx'
import SavedFoodPlans from './SavedFoodPlans.jsx'
import WorkspaceIcon from './WorkspaceIcon.jsx'

const WORKSPACE_SECTIONS = [
  { id: 'profile-heading', label: 'Profile', icon: 'profile' },
  { id: 'nutrition-heading', label: 'Nutrition targets', icon: 'nutrition' },
  { id: 'preferences-heading', label: 'Preferences', icon: 'preferences' },
  { id: 'food-suggestions-heading', label: 'Food draft', icon: 'foodDraft' },
  { id: 'saved-food-plans-heading', label: 'Saved drafts', icon: 'saved' },
]

export default function WorkspaceView({ user, onLogout, onGoHome }) {
  const [profileRevision, setProfileRevision] = useState(0)
  const [preferencesRevision, setPreferencesRevision] = useState(0)
  const [savedPlansRevision, setSavedPlansRevision] = useState(0)
  const [activeSection, setActiveSection] = useState('profile-heading')
  const navRef = useRef(null)
  const contentRef = useRef(null)

  function scrollToSection(id) {
    const headingEl = document.getElementById(id)
    if (headingEl) {
      const card = headingEl.closest('section') || headingEl
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      card.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' })

      card.classList.remove('ew-section-highlight')
      void card.offsetWidth
      card.classList.add('ew-section-highlight')
      setTimeout(() => {
        card.classList.remove('ew-section-highlight')
      }, 1500)
    }
  }

  useEffect(() => {
    let frame = 0

    function updateActiveSection() {
      frame = 0
      const sections = WORKSPACE_SECTIONS.flatMap(({ id }) => {
        const heading = document.getElementById(id)
        const element = heading?.closest('section')
        return element ? [{ id, top: element.getBoundingClientRect().top }] : []
      })
      if (!sections.length) return

      // Use every section's current position. Intersection callbacks only report
      // changed entries and can leave a tall, still-visible section unselected.
      const activationLine = (navRef.current?.getBoundingClientRect().bottom ?? 68) + 40
      let current = sections[0].id
      for (const section of sections) {
        if (section.top > activationLine) break
        current = section.id
      }

      // The final section may be too short to reach the activation line.
      const atPageEnd = window.scrollY > 0 &&
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      if (atPageEnd) current = sections[sections.length - 1].id
      setActiveSection(current)
    }

    function scheduleUpdate() {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection)
    }

    const resizeObserver = new ResizeObserver(scheduleUpdate)
    if (contentRef.current) resizeObserver.observe(contentRef.current)
    if (navRef.current) resizeObserver.observe(navRef.current)
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    scheduleUpdate()

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [profileRevision, preferencesRevision, savedPlansRevision])

  useEffect(() => {
    const nav = navRef.current
    const activeButton = nav?.querySelector('[aria-current="location"]')
    if (!nav || !activeButton || nav.scrollWidth <= nav.clientWidth) return
    const left = activeButton.offsetLeft - nav.offsetLeft - (nav.clientWidth - activeButton.offsetWidth) / 2
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    nav.scrollTo({ left, behavior: reducedMotion ? 'instant' : 'smooth' })
  }, [activeSection])

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
            className="ew-nav-button ew-action"
            type="button"
            onClick={onGoHome}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5m7 7-7-7 7-7" />
            </svg>
            <span>Overview</span>
          </button>

          <button
            className="ew-logout-button ew-action ew-action--quiet"
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

      </div>

      <nav className="ew-section-nav" aria-label="Workspace sections" ref={navRef}>
        {WORKSPACE_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className="ew-section-button"
            onClick={() => scrollToSection(section.id)}
            aria-label={section.label}
            title={section.label}
            aria-controls={section.id}
            aria-current={activeSection === section.id ? 'location' : undefined}
          >
            <WorkspaceIcon name={section.icon} />
          </button>
        ))}
      </nav>

      <div className="ew-workspace-content" ref={contentRef}>
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

import { useEffect, useState } from 'react'
import {
  DEFAULT_DEMO_NUTRITION,
  getDemoStorage,
} from '../demoWorkspace.js'
import './NutritionSummary.css'
import WorkspaceIcon from './WorkspaceIcon.jsx'
import WorkspaceSectionTitle from './WorkspaceSectionTitle.jsx'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const goalLabels = {
  lose_weight: 'Lose weight',
  maintain_weight: 'Maintain weight',
  gain_muscle: 'Gain muscle',
}

const numberFormat = new Intl.NumberFormat('en', {
  maximumFractionDigits: 1,
})

export default function NutritionSummary({ refreshKey = 0, isDemo = false }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [needsProfile, setNeedsProfile] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadNutrition() {
      setLoading(true)
      setError('')
      setNeedsProfile(false)
      setResult(null)

      if (isDemo) {
        const demoNut = getDemoStorage('nutrition', DEFAULT_DEMO_NUTRITION)
        setResult(demoNut)
        setLoading(false)
        return
      }

      try {
        const response = await fetch(
          `${API_URL}/api/nutrition/me`,
          {
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal,
          }
        )

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 422 || data.message?.includes('profile first')) {
            setNeedsProfile(true)
            return
          }
          throw new Error(
            data.message || 'Unable to load your nutrition estimates.'
          )
        }

        const values = [
          data.estimate?.restingCalories,
          data.estimate?.maintenanceCalories,
          data.targets?.targetCalories,
          data.targets?.macros?.proteinGrams,
          data.targets?.macros?.carbohydrateGrams,
          data.targets?.macros?.fatGrams,
        ]

        if (
          values.some(
            (value) => !Number.isFinite(value) || value <= 0
          )
        ) {
          throw new Error(
            'The server returned incomplete nutrition estimates.'
          )
        }

        if (!controller.signal.aborted) {
          setResult(data)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(
            error instanceof TypeError
              ? 'Cannot connect to EatWise. Check that the backend is running.'
              : error.message
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadNutrition()

    return () => controller.abort()
  }, [refreshKey, retry, isDemo])

  const estimate = result?.estimate
  const targets = result?.targets

  return (
    <section
      className="nutrition-section" data-workspace-section="nutrition"
      aria-labelledby="nutrition-heading"
      aria-busy={loading}
    >
      <div className="nutrition-heading-row">
        <WorkspaceSectionTitle id="nutrition-heading" icon="nutrition">Your nutrition estimates</WorkspaceSectionTitle>
        <span className="nutrition-badge">Estimated</span>
      </div>

      <p className="nutrition-description">
        Based on your last saved profile and selected goal.
      </p>

      {loading && <p role="status">Calculating your estimates…</p>}

      {needsProfile && (
        <div className="nutrition-empty">
          <h4>Profile Measurements Needed</h4>
          <p>
            Complete your measurements in the Personal Profile section above and click "Save profile" to calculate your personalized energy needs, resting calories, and target macros.
          </p>
          <a href="#profile-heading" className="ew-action ew-action--primary">
            Complete Personal Profile
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 12 6-6 6 6M12 6v12" />
            </svg>
          </a>
        </div>
      )}

      {error && (
        <p className="account-message account-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && result && (
        <>
          <div className="nutrition-overview"><div className="nutrition-energy-grid">
            <div className="nutrition-stat">
              <span className="nutrition-label">
                Resting energy
              </span>
              <strong>
                {numberFormat.format(estimate.restingCalories)}
              </strong>
              <span className="nutrition-unit">kcal/day</span>
            </div>

            <div className="nutrition-stat">
              <span className="nutrition-label">
                Estimated maintenance
              </span>
              <strong>
                {numberFormat.format(estimate.maintenanceCalories)}
              </strong>
              <span className="nutrition-unit">kcal/day</span>
            </div>
          </div>

          <div className="nutrition-target">
            <div className="nutrition-target-top">
              <span className="nutrition-label">
                Goal calorie estimate
              </span>
              <span className="nutrition-goal">
                {goalLabels[targets.goal] || 'Your goal'}
              </span>
            </div>

            <p className="nutrition-target-value">
              {numberFormat.format(targets.targetCalories)}
              <span> kcal/day</span>
            </p>

            {Number.isFinite(targets.calorieAdjustmentPercent) && (
              <p className="nutrition-adjustment">
              {targets.calorieAdjustmentPercent === 0
                ? 'Matches your estimated maintenance energy.'
                : `${Math.abs(targets.calorieAdjustmentPercent)}% ${
                    targets.calorieAdjustmentPercent < 0
                      ? 'below'
                      : 'above'
                  } your estimated maintenance energy.`}
              </p>
            )}
          </div>

          </div><h4 className="nutrition-macro-heading">
            Estimated daily macros
          </h4>

          <div className="nutrition-macro-grid">
            <div className="nutrition-stat">
              <span className="nutrition-label">Protein</span>
              <strong>
                {numberFormat.format(targets.macros.proteinGrams)}
                <span className="nutrition-inline-unit"> g</span>
              </strong>
            </div>

            <div className="nutrition-stat">
              <span className="nutrition-label">Carbohydrates</span>
              <strong>
                {numberFormat.format(
                  targets.macros.carbohydrateGrams
                )}
                <span className="nutrition-inline-unit"> g</span>
              </strong>
            </div>

            <div className="nutrition-stat">
              <span className="nutrition-label">Fat</span>
              <strong>
                {numberFormat.format(targets.macros.fatGrams)}
                <span className="nutrition-inline-unit"> g</span>
              </strong>
            </div>
          </div>

          <p className="nutrition-note">
            These estimates use adjustable app defaults and are
            not individualized nutrition prescriptions. Suitability
            needs to be checked before generating a meal plan.
          </p>

          <p className="nutrition-note">
            This feature is not designed for pregnancy,
            breastfeeding, or medical nutrition needs.
          </p>
        </>
      )}

      {!loading && (
        <button
          className="nutrition-refresh ew-action"
          type="button"
          onClick={() => setRetry((current) => current + 1)}
        >
          <WorkspaceIcon name="nutrition" size={20} />
          {error ? 'Try again' : 'Refresh estimates'}
        </button>
      )}
    </section>
  )
}
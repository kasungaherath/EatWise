import { useEffect, useState } from 'react'
import {
  DEFAULT_DEMO_NUTRITION,
  getDemoStorage,
} from '../demoWorkspace.js'
import './NutritionSummary.css'

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
      className="nutrition-section"
      aria-labelledby="nutrition-heading"
      aria-busy={loading}
    >
      <div className="nutrition-heading-row">
        <h3 id="nutrition-heading">Your nutrition estimates</h3>
        <span className="nutrition-badge">Estimated</span>
      </div>

      <p className="nutrition-description">
        Based on your last saved profile and selected goal.
      </p>

      {loading && <p role="status">Calculating your estimates…</p>}

      {needsProfile && (
        <div style={{
          marginTop: '16px',
          padding: '24px',
          background: 'rgba(240, 246, 238, 0.9)',
          borderRadius: '16px',
          border: '1px dashed rgba(56, 123, 84, 0.3)',
          textAlign: 'center'
        }}>
          <h4 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 8px', color: 'var(--ew-ink)' }}>Profile Measurements Needed</h4>
          <p style={{ fontSize: '14px', color: 'var(--ew-muted)', margin: '0 0 16px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
            Complete your measurements in the Personal Profile section above and click "Save profile" to calculate your personalized energy needs, resting calories, and target macros.
          </p>
          <a href="#profile-heading" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '999px',
            background: 'var(--ew-green)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '700',
            textDecoration: 'none'
          }}>
            Complete Personal Profile ↑
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

            <p className="nutrition-adjustment">
              {targets.calorieAdjustmentPercent === 0
                ? 'Matches your estimated maintenance energy.'
                : `${Math.abs(targets.calorieAdjustmentPercent)}% ${
                    targets.calorieAdjustmentPercent < 0
                      ? 'below'
                      : 'above'
                  } your estimated maintenance energy.`}
            </p>
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
          className="nutrition-refresh"
          type="button"
          onClick={() => setRetry((current) => current + 1)}
        >
          {error ? 'Try again' : 'Refresh estimates'}
        </button>
      )}
    </section>
  )
}
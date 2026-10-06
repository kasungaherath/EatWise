import { useEffect, useState } from 'react'
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

export default function NutritionSummary({ refreshKey = 0 }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadNutrition() {
      setLoading(true)
      setError('')
      setResult(null)

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
  }, [refreshKey, retry])

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
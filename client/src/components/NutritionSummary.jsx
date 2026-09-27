import { useEffect, useState } from 'react'
import './NutritionSummary.css'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

export default function NutritionSummary({ refreshKey = 0 }) {
  const [estimate, setEstimate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadEstimate() {
      setLoading(true)
      setError('')
      setEstimate(null)

      try {
        const response = await fetch(`${API_URL}/api/nutrition/me`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(
            data?.message || 'Unable to load your energy estimates.'
          )
        }

        if (
          !data?.estimate ||
          !Number.isFinite(data.estimate.restingCalories) ||
          !Number.isFinite(data.estimate.maintenanceCalories)
        ) {
          throw new Error('The server returned an invalid estimate.')
        }

        if (!controller.signal.aborted) {
          setEstimate(data.estimate)
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

    loadEstimate()

    return () => controller.abort()
  }, [refreshKey, retry])

  return (
    <section
      className="nutrition-section"
      aria-labelledby="nutrition-heading"
      aria-busy={loading}
    >
      <div className="nutrition-heading">
        <h3 id="nutrition-heading">Your energy estimates</h3>
        <span className="nutrition-badge">ESTIMATED</span>
      </div>

      <p className="nutrition-description">
        Based on your last saved profile and activity level.
      </p>

      {loading ? (
        <p className="nutrition-status" role="status">
          Calculating your estimates…
        </p>
      ) : error ? (
        <>
          <p className="account-message account-error" role="alert">
            {error}
          </p>

          <button
            className="nutrition-refresh"
            type="button"
            onClick={() => setRetry((current) => current + 1)}
          >
            Try again
          </button>
        </>
      ) : estimate ? (
        <>
          <div className="nutrition-grid">
            <article className="nutrition-stat">
              <h4>At rest</h4>

              <p className="nutrition-value">
                {estimate.restingCalories.toLocaleString()}
              </p>

              <span className="nutrition-unit">kcal / day</span>

              <p className="nutrition-explanation">
                Estimated energy your body uses at rest.
              </p>
            </article>

            <article className="nutrition-stat nutrition-stat-accent">
              <h4>Maintenance</h4>

              <p className="nutrition-value">
                {estimate.maintenanceCalories.toLocaleString()}
              </p>

              <span className="nutrition-unit">kcal / day</span>

              <p className="nutrition-explanation">
                Estimated daily energy use including activity.
              </p>
            </article>
          </div>

          <p className="nutrition-note">
            These estimates are not yet adjusted for your weight
            or muscle-gain goal. Actual needs vary.
          </p>

          <p className="nutrition-note">
            Not designed for pregnancy, breastfeeding, or medical
            nutrition needs.
          </p>

          <button
            className="nutrition-refresh"
            type="button"
            onClick={() => setRetry((current) => current + 1)}
          >
            Refresh estimates
          </button>
        </>
      ) : null}
    </section>
  )
}
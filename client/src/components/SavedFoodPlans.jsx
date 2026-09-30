import { useEffect, useState } from 'react'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

function displayNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

function displayDate(value) {
  if (typeof value !== 'string') return 'Date unavailable'

  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) return value

  return new Date(year, month - 1, day).toLocaleDateString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  )
}

function matchLabel(status) {
  if (status === 'within_tolerance') {
    return 'Within target tolerances'
  }

  if (status === 'needs_adjustment') {
    return 'Needs adjustment'
  }

  return 'Target matching not assessed'
}

export default function SavedFoodPlans({ refreshKey = 0 }) {
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadDrafts() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${API_URL}/api/food-plans`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Unable to load your saved drafts.'
          )
        }

        if (!Array.isArray(data.drafts)) {
          throw new Error('The server returned an invalid draft list.')
        }

        if (!controller.signal.aborted) {
          setDrafts(data.drafts)
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

    loadDrafts()

    return () => controller.abort()
  }, [refreshKey, retry])

  return (
    <section
      className="profile-section"
      aria-labelledby="saved-food-plans-heading"
    >
      <h3 id="saved-food-plans-heading">Saved food-plan drafts</h3>

      <p className="profile-description">
        Your latest 50 saved drafts. Each keeps the food quantities,
        nutrition totals, and targets recorded when it was saved.
      </p>

      <button
        className="profile-save"
        type="button"
        disabled={loading}
        onClick={() => setRetry((current) => current + 1)}
      >
        {loading ? 'Loading…' : 'Refresh saved drafts'}
      </button>

      {loading ? (
        <p role="status">Loading your saved drafts…</p>
      ) : error ? (
        <p className="account-message account-error" role="alert">
          {error}
        </p>
      ) : drafts.length === 0 ? (
        <p>No saved drafts yet.</p>
      ) : (
        <div>
          {drafts.map((draft) => {
            const snapshot = draft.suggestion
            const calculation = snapshot?.calculation
            const totals = calculation?.totals
            const items = calculation?.items

            return (
              <article className="account-card" key={draft.id}>
                <h4>{draft.title}</h4>

                <p>
                  <time dateTime={draft.planDate}>
                    {displayDate(draft.planDate)}
                  </time>
                  {' · Draft'}
                </p>

                <p>
                  {matchLabel(snapshot?.targetMatch?.status)}
                </p>

                {totals && (
                  <p>
                    {displayNumber(totals.calories)} kcal
                    {' · '}
                    Protein: {displayNumber(totals.proteinGrams)} g
                    {' · '}
                    Carbs: {displayNumber(totals.carbohydrateGrams)} g
                    {' · '}
                    Fat: {displayNumber(totals.fatGrams)} g
                  </p>
                )}

                <details>
                  <summary>View food quantities</summary>

                  {Array.isArray(items) && items.length > 0 ? (
                    <ul>
                      {items.map((item) => (
                        <li key={`${item.foodId}-${item.portionId}`}>
                          <strong>{item.name}</strong>
                          {' — '}
                          {displayNumber(item.quantity)} {item.unit}
                          {' ('}
                          {displayNumber(item.grams)} g edible weight
                          {')'}
                          {item.preparationState
                            ? ` · ${item.preparationState}`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Food quantities are unavailable.</p>
                  )}
                </details>

                <p className="profile-note">
                  These are daily totals. This draft is a saved
                  snapshot and does not update when your profile
                  or preferences change. Target matching does not
                  establish dietary suitability.
                </p>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
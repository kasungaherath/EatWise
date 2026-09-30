import { useEffect, useRef, useState } from 'react'
import SaveFoodPlanForm from './SaveFoodPlanForm'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const nutrients = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'proteinGrams', label: 'Protein', unit: 'g' },
  { key: 'carbohydrateGrams', label: 'Carbohydrates', unit: 'g' },
  { key: 'fatGrams', label: 'Fat', unit: 'g' },
]

function displayNumber(value) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

function targetCheckLabel(values) {
  if (values.withinTolerance === true) return 'Within range'
  if (values.direction === 'below_target') return 'Below target'
  if (values.direction === 'above_target') return 'Above target'
  return 'Not assessed'
}

export default function FoodSuggestions({ onSaved }) {
  const [suggestion, setSuggestion] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [savingDraft, setSavingDraft] = useState(false)
  const requestRef = useRef(null)

  useEffect(() => {
    return () => requestRef.current?.abort()
  }, [])

  async function generateSuggestion() {
    if (requestRef.current || savingDraft) return

    const controller = new AbortController()
    requestRef.current = controller

    setGenerating(true)
    setError('')
    setSuggestion(null)

    try {
      const response = await fetch(
        `${API_URL}/api/food-suggestions/generate`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
          signal: controller.signal,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to generate food suggestions.'
        )
      }

      const result = data.suggestion

      if (
        result?.status !== 'draft' ||
        !Array.isArray(result.calculation?.items) ||
        !result.comparison
      ) {
        throw new Error('The server returned an invalid suggestion.')
      }

      if (!controller.signal.aborted) {
        setSuggestion(result)
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
      if (requestRef.current === controller) {
        requestRef.current = null
      }

      if (!controller.signal.aborted) {
        setGenerating(false)
      }
    }
  }

  return (
    <section
      className="profile-section"
      aria-labelledby="food-suggestions-heading"
    >
      <h3 id="food-suggestions-heading">Your AI food suggestions</h3>

      <p className="profile-description">
        Generate daily food quantities using your saved targets
        and eligible foods. Nutrition totals are calculated from
        our food database.
      </p>

      <button
        className="profile-save"
        type="button"
        onClick={generateSuggestion}
        disabled={generating || savingDraft}
      >
        {generating
          ? 'Generating…'
          : suggestion
            ? 'Generate again'
            : 'Generate food suggestions'}
      </button>

      {generating && (
        <p role="status">
          Preparing your food suggestions. This may take a moment.
        </p>
      )}

      {error && (
        <p className="account-message account-error" role="alert">
          {error}
        </p>
      )}

      {suggestion && (
        <div>
          <h4>Draft quantities for one day</h4>

          <p className="profile-note">
            These are daily totals, not quantities for each meal.
            Serving suitability and nutritional completeness still
            need review. Use the form below to save a copy.
          </p>

          <div className="profile-grid">
            {suggestion.calculation.items.map((item) => (
              <article className="account-card" key={item.foodId}>
                <h4>{item.name}</h4>

                <p>
                  <strong>
                    {displayNumber(item.quantity)} {item.unit}
                  </strong>
                </p>

                <p>
                  Edible weight: {displayNumber(item.grams)} g
                </p>

                <p>Preparation: {item.preparationState}</p>
              </article>
            ))}
          </div>

          <h4>Calculated nutrition compared with your targets</h4>

          {suggestion.targetMatch && (
            <p className="account-message" role="status">
              {suggestion.targetMatch.status === 'within_tolerance'
                ? 'This draft matches your calorie and macro targets within the app’s configured tolerances.'
                : suggestion.targetMatch.status === 'needs_adjustment'
                  ? 'This draft needs adjustment: one or more nutrition totals fall outside the app’s configured tolerances.'
                  : 'Target matching has not been assessed.'}
            </p>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left' }}>
              <caption>
                Daily estimates; difference means actual minus target.
              </caption>

              <thead>
                <tr>
                  <th scope="col">Nutrient</th>
                  <th scope="col">Target</th>
                  <th scope="col">Calculated</th>
                  <th scope="col">Difference</th>
                  <th scope="col">Target check</th>
                </tr>
              </thead>

              <tbody>
                {nutrients.map(({ key, label, unit }) => {
                  const values = suggestion.comparison[key]

                  if (!values) return null

                  return (
                    <tr key={key}>
                      <th scope="row">{label}</th>

                      <td>
                        {displayNumber(values.target)} {unit}
                      </td>

                      <td>
                        {displayNumber(values.actual)} {unit}
                      </td>

                      <td>
                        {values.difference > 0 ? '+' : ''}
                        {displayNumber(values.difference)} {unit}
                      </td>

                      <td>{targetCheckLabel(values)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="profile-note">
            Target checks compare nutrition totals with the app’s
            configured tolerances. They do not establish whether
            this draft is a suitable or complete diet.
          </p>

          <div
            onSubmitCapture={() => setSavingDraft(true)}
          >
            <SaveFoodPlanForm
              suggestion={suggestion}
              onSaved={(draft) => {
                setSavingDraft(false)
                onSaved?.(draft)
              }}
            />
          </div>

          {savingDraft && (
            <button
              type="button"
              className="account-switch"
              onClick={() => setSavingDraft(false)}
            >
              Finished saving or need to generate again?
            </button>
          )}
        </div>
      )}
    </section>
  )
}
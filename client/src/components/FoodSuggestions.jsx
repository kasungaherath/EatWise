import { useCallback, useEffect, useId, useRef, useState } from 'react'
import SaveFoodPlanForm from './SaveFoodPlanForm.jsx'
import { foodDisplayName } from '../foodDisplayName.js'
import { foodImageFor } from '../foodImages.js'
import {
  DEFAULT_DEMO_SUGGESTION,
  getDemoStorage,
  setDemoStorage,
} from '../demoWorkspace.js'
import './FoodSuggestions.css'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const nutrients = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'proteinGrams', label: 'Protein', unit: 'g' },
  { key: 'carbohydrateGrams', label: 'Carbohydrates', unit: 'g' },
  { key: 'fatGrams', label: 'Fat', unit: 'g' },
]

function FoodDraftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11h18a9 9 0 0 1-18 0Zm4 10h10M8 3v4m4-4v4m4-4v4" />
    </svg>
  )
}

function displayNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

function checkLabel(values) {
  if (values.withinTolerance === true) return 'Within range'
  if (values.direction === 'below_target') return 'Below target'
  if (values.direction === 'above_target') return 'Above target'
  return 'Not assessed'
}

function validSuggestion(result) {
  return (
    result?.status === 'draft' &&
    Array.isArray(result.calculation?.items) &&
    result.calculation.items.length > 0 &&
    result.calculation.items.every((item) =>
      nutrients.every(({ key }) =>
        typeof item.nutrition?.[key] === 'number' &&
        Number.isFinite(item.nutrition[key]) && item.nutrition[key] >= 0
      )
    ) &&
    nutrients.every(({ key }) => {
      const row = result.comparison?.[key]

      return (
        row &&
        [row.target, row.actual, row.difference].every(
          (value) =>
            typeof value === 'number' && Number.isFinite(value)
        )
      )
    })
  )
}

export default function FoodSuggestions({ onSaved, isDemo = false }) {
  const [suggestion, setSuggestion] = useState(() =>
    isDemo ? getDemoStorage('suggestion', DEFAULT_DEMO_SUGGESTION) : null
  )
  const [generating, setGenerating] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState('')
  const [expandedFoodId, setExpandedFoodId] = useState(null)
  const foodListId = useId()

  const requestRef = useRef(null)
  const savingRef = useRef(false)

  useEffect(() => {
    return () => requestRef.current?.abort()
  }, [])

  const handleSavingChange = useCallback((value) => {
    savingRef.current = value
    setSavingDraft(value)
  }, [])

  async function generateSuggestion() {
    if (requestRef.current || savingRef.current) return
    setExpandedFoodId(null)

    if (isDemo) {
      setGenerating(true)
      setError('')
      setTimeout(() => {
        setSuggestion(DEFAULT_DEMO_SUGGESTION)
        setDemoStorage('suggestion', DEFAULT_DEMO_SUGGESTION)
        setGenerating(false)
      }, 500)
      return
    }

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          signal: controller.signal,
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Unable to generate suggestions (HTTP ${response.status}).`
        )
      }

      if (!validSuggestion(data?.suggestion)) {
        throw new Error('The server returned an invalid suggestion.')
      }

      if (!controller.signal.aborted) {
        setSuggestion(data.suggestion)
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

  const matchStatus = suggestion?.targetMatch?.status
  const matched = matchStatus === 'within_tolerance'

  const statusText = matched
    ? 'Within target ranges'
    : matchStatus === 'needs_adjustment'
      ? 'Needs adjustment'
      : 'Not assessed'

  return (
    <section
      className="profile-section fs-section" data-workspace-section="food"
      aria-labelledby="food-suggestions-heading"
      aria-busy={generating}
    >
      <div className="fs-heading">
        <div>
          <h3 id="food-suggestions-heading">Food quantities for your goals.</h3>
          <p className="fs-description">
            Get AI-selected foods and daily quantities based on your goal,
            calorie and macro targets, and food preferences. Each food’s
            nutrition is calculated for the quantity shown.
          </p>
        </div>

        <button
          className="fs-generate ew-action ew-action--primary"
          aria-busy={generating}
          type="button"
          onClick={generateSuggestion}
          disabled={generating || savingDraft}
        >
          {generating ? (
            <span className="fs-spinner" aria-hidden="true" />
          ) : (
            <FoodDraftIcon />
          )}

          {generating
            ? 'Generating…'
            : suggestion
              ? 'Generate another draft'
              : 'Generate my draft'}
        </button>
      </div>

      {generating && (
        <div className="fs-loading" role="status">
          <strong>Preparing your daily draft</strong>
          <p>Selecting foods, adjusting quantities, and comparing nutrition.</p>
        </div>
      )}

      {error && (
        <p className="account-message account-error" role="alert">
          {error}
        </p>
      )}

      {!suggestion && !generating && !error && (
        <div className="fs-empty">
          <span className="fs-empty-icon"><FoodDraftIcon /></span>
          <h4>Your next draft starts here.</h4>
          <p>
            Save your profile and preferences, then generate a draft to
            explore your daily food quantities.
          </p>
          <div className="fs-empty-tags">
            <span>Food quantities</span>
            <span>Nutrition comparisons</span>
            <span>Save for later</span>
          </div>
        </div>
      )}

      {suggestion && (
        <div className="fs-result">
          <div className="fs-result-heading">
            <div>
              <h4>Your quantities for one day</h4>
              <p>
                {suggestion.calculation.items.length} foods · Tap a food to see its nutrition.
              </p>
            </div>
            <span className="fs-badge fs-badge-neutral">Draft</span>
          </div>

          <div className="fs-food-list-heading" aria-hidden="true">
            <span>Food</span>
            <span>Daily weight</span>
          </div>
          <ul className="fs-food-list" aria-label="Suggested daily food quantities">
            {suggestion.calculation.items.map((item, index) => {
              const expanded = expandedFoodId === item.foodId
              const nameId = `${foodListId}-food-${index}`
              const panelId = `${nameId}-nutrition`
              const foodName = foodDisplayName(item.name)
              const photo = foodImageFor(foodName)
              const hasPortion = typeof item.unit === 'string' &&
                !['g', 'gram', 'grams'].includes(item.unit.toLowerCase())

              return (
                <li className="fs-food-row" key={item.foodId} data-food-image={photo.key} style={{ '--food-photo-position': photo.position }}>
                  <button
                    className="fs-food-toggle"
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    disabled={generating}
                    onClick={() => setExpandedFoodId(expanded ? null : item.foodId)}
                  >
                    <span className="food-photo fs-food-photo" aria-hidden="true" />
                    <span className="fs-food-name" id={nameId}>{foodName}</span>
                    <span className="fs-food-weight">
                      <strong>{displayNumber(item.grams)}</strong>
                      <span>g</span>
                    </span>
                    <svg className="fs-food-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <div
                    className="fs-food-panel"
                    id={panelId}
                    role="region"
                    aria-labelledby={nameId}
                    hidden={!expanded}
                  >
                    <p className="fs-food-panel-caption">Nutrition for this {displayNumber(item.grams)} g quantity</p>
                    <dl className="fs-food-nutrients">
                      {nutrients.map(({ key, label, unit }) => (
                        <div key={key}>
                          <dt>{label}</dt>
                          <dd>{displayNumber(item.nutrition?.[key])} <span>{unit}</span></dd>
                        </div>
                      ))}
                    </dl>
                    <dl className="fs-food-preparation">
                      {hasPortion && (
                        <div>
                          <dt>Portion</dt>
                          <dd>{displayNumber(item.quantity)} {item.unit}</dd>
                        </div>
                      )}
                      <div>
                        <dt>Preparation</dt>
                        <dd>{item.preparationState || 'Not specified'}</dd>
                      </div>
                    </dl>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="fs-nutrition-heading">
            <div>
              <h4>How this draft compares</h4>
              <p>Calculated totals alongside your saved targets.</p>
            </div>
            <span
              className={`fs-badge ${
                matched
                  ? 'fs-badge-success'
                  : matchStatus === 'needs_adjustment'
                    ? 'fs-badge-warning'
                    : 'fs-badge-neutral'
              }`}
              role="status"
            >
              {statusText}
            </span>
          </div>

          <div
            className="fs-table-scroll"
            role="region"
            aria-label="Daily nutrition comparison; scroll horizontally on small screens"
            tabIndex={0}
          >
            <table className="fs-table">
              <caption>
                Daily estimates. Difference is calculated total minus target.
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
                  const assessed =
                    values.withinTolerance === true ||
                    ['below_target', 'above_target'].includes(values.direction)

                  return (
                    <tr key={key}>
                      <th scope="row">{label}</th>
                      <td>{displayNumber(values.target)} {unit}</td>
                      <td className="fs-actual">
                        {displayNumber(values.actual)} {unit}
                      </td>
                      <td>
                        {values.difference > 0 ? '+' : ''}
                        {displayNumber(values.difference)} {unit}
                      </td>
                      <td>
                        <span
                          className={`fs-badge ${
                            values.withinTolerance
                              ? 'fs-badge-success'
                              : assessed
                                ? 'fs-badge-warning'
                                : 'fs-badge-neutral'
                          }`}
                        >
                          {checkLabel(values)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="fs-review-note">
            These quantities cover one day, not each meal. Target checks
            use the app’s configured tolerances; they do not establish
            nutritional completeness or personal suitability.
          </p>

          <div className="fs-save-panel">
            <SaveFoodPlanForm
              suggestion={suggestion}
              onSavingChange={handleSavingChange}
              onSaved={onSaved}
              isDemo={isDemo}
            />
          </div>
        </div>
      )}
    </section>
  )
}

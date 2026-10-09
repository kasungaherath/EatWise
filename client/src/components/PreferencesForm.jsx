import { useEffect, useState } from 'react'
import {
  DEFAULT_DEMO_PREFERENCES,
  getDemoStorage,
  setDemoStorage,
} from '../demoWorkspace.js'
import './ProfileForm.css'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const emptyPreferences = {
  dietType: '',
  allergies: '',
  avoidedFoods: '',
  dailyBudgetLkr: '',
  mealsPerDay: '3',
}

function toForm(preferences) {
  return {
    dietType: preferences.dietType ?? '',
    allergies: Array.isArray(preferences.allergies)
      ? preferences.allergies.join(', ')
      : '',
    avoidedFoods: Array.isArray(preferences.avoidedFoods)
      ? preferences.avoidedFoods.join(', ')
      : '',
    dailyBudgetLkr:
      preferences.dailyBudgetLkr == null
        ? ''
        : String(preferences.dailyBudgetLkr),
    mealsPerDay: String(preferences.mealsPerDay ?? 3),
  }
}

function parseList(value, label) {
  const items = [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    ),
  ]

  if (items.length > 30) {
    throw new Error(`${label} can contain up to 30 items.`)
  }

  if (items.some((item) => item.length > 80)) {
    throw new Error(
      `Each item in ${label.toLowerCase()} must be 80 characters or fewer.`
    )
  }

  return items
}

async function preferencesRequest(options = {}) {
  let response

  try {
    response = await fetch(`${API_URL}/api/preferences/me`, {
      ...options,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    throw new Error(
      'Cannot connect to EatWise. Check that the backend is running.',
      { cause: error }
    )
  }

  let data

  try {
    data = await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    throw new Error('The server returned an unexpected response.', { cause: error })
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || 'Unable to process your food preferences.'
    )
  }

  if (!Object.hasOwn(data, 'preferences')) {
    throw new Error('The server returned incomplete preference data.')
  }

  return data
}

export default function PreferencesForm({ onSaved, isDemo = false }) {
  const [form, setForm] = useState({ ...emptyPreferences })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadPreferences() {
      setLoading(true)
      setLoadFailed(false)
      setError('')

      if (isDemo) {
        const demoData = getDemoStorage('preferences', DEFAULT_DEMO_PREFERENCES)
        setForm(toForm(demoData))
        setLoading(false)
        return
      }

      try {
        const data = await preferencesRequest({
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          setForm(
            data.preferences
              ? toForm(data.preferences)
              : { ...emptyPreferences }
          )
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadFailed(true)
          setError(error.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadPreferences()

    return () => controller.abort()
  }, [retry, isDemo])

  function updateField(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setError('')
    setNotice('')
  }

  async function handleSave(event) {
    event.preventDefault()

    if (saving) return

    setSaving(true)
    setError('')
    setNotice('')

    if (isDemo) {
      const demoSaved = {
        dietType: form.dietType || 'omnivore',
        allergies: parseList(form.allergies, 'Allergies'),
        avoidedFoods: parseList(form.avoidedFoods, 'Foods to avoid'),
        dailyBudgetLkr: form.dailyBudgetLkr ? Number(form.dailyBudgetLkr) : null,
        mealsPerDay: Number(form.mealsPerDay || 3),
      }
      setDemoStorage('preferences', demoSaved)
      setForm(toForm(demoSaved))
      setNotice('Demo preferences saved successfully.')
      setSaving(false)
      onSaved?.()
      return
    }

    try {
      const validDiets = [
        'omnivore',
        'vegetarian',
        'vegan',
        'pescatarian',
      ]

      if (!validDiets.includes(form.dietType)) {
        throw new Error('Select a valid diet type.')
      }

      const mealsPerDay = Number(form.mealsPerDay)

      if (
        !Number.isInteger(mealsPerDay) ||
        mealsPerDay < 2 ||
        mealsPerDay > 6
      ) {
        throw new Error('Select between 2 and 6 meals per day.')
      }

      const dailyBudgetLkr =
        form.dailyBudgetLkr.trim() === ''
          ? null
          : Number(form.dailyBudgetLkr)

      if (
        dailyBudgetLkr !== null &&
        (
          !Number.isFinite(dailyBudgetLkr) ||
          dailyBudgetLkr < 1 ||
          dailyBudgetLkr > 100000
        )
      ) {
        throw new Error(
          'Enter a daily budget between LKR 1 and 100,000, or leave it empty.'
        )
      }

      const payload = {
        dietType: form.dietType,
        allergies: parseList(form.allergies, 'Allergies'),
        avoidedFoods: parseList(form.avoidedFoods, 'Avoided foods'),
        dailyBudgetLkr,
        mealsPerDay,
      }

      const data = await preferencesRequest({
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      if (!data.preferences) {
        throw new Error(
          'The server did not return your saved preferences.'
        )
      }

      setForm(toForm(data.preferences))
      setNotice('Your food preferences have been saved.')
    } catch (error) {
      setError(error.message)
      return
    } finally {
      setSaving(false)
    }

    onSaved?.()
  }

  if (loading) {
    return (
      <section className="profile-section ew-section-state" data-workspace-section="preferences" aria-labelledby="preferences-heading" aria-busy={loading}>
        <h3 id="preferences-heading">Food preferences</h3>
        <p role="status">Loading your food preferences…</p>
      </section>
    )
  }

  if (loadFailed) {
    return (
      <section className="profile-section ew-section-state" data-workspace-section="preferences" aria-labelledby="preferences-heading" aria-busy={loading}>
        <h3 id="preferences-heading">Food preferences</h3>
        <p className="account-message account-error" role="alert">
          {error}
        </p>

        <button
          className="profile-save ew-action"
          type="button"
          onClick={() => setRetry((current) => current + 1)}
        >
          Try again
        </button>
      </section>
    )
  }

  return (
    <section
      className="profile-section" data-workspace-section="preferences"
      aria-labelledby="preferences-heading"
    >
      <h3 id="preferences-heading">Food preferences</h3>

      <p className="profile-description">
        Choose your diet and save your food preferences.
        You can update these details anytime.
      </p>

      <form onSubmit={handleSave} aria-busy={saving}>
        <fieldset className="profile-fields" disabled={saving}>
          <legend className="profile-legend">
            Diet and meal preferences
          </legend>

          <div className="account-field">
            <label htmlFor="preferences-diet">Diet type</label>

            <select
              id="preferences-diet"
              name="dietType"
              value={form.dietType}
              onChange={updateField}
              required
            >
              <option value="">Select your diet type</option>
              <option value="omnivore">Omnivore</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="pescatarian">Pescatarian</option>
            </select>
          </div>

          <div className="account-field">
            <label htmlFor="preferences-meals">
              Meals per day
            </label>

            <select
              id="preferences-meals"
              name="mealsPerDay"
              value={form.mealsPerDay}
              onChange={updateField}
              required
            >
              <option value="2">2 meals</option>
              <option value="3">3 meals</option>
              <option value="4">4 meals</option>
              <option value="5">5 meals</option>
              <option value="6">6 meals</option>
            </select>
          </div>

          <div className="account-field">
            <label htmlFor="preferences-allergies">
              Food allergies
            </label>

            <input
              id="preferences-allergies"
              name="allergies"
              type="text"
              value={form.allergies}
              onChange={updateField}
              placeholder="For example: egg, milk, peanuts"
              aria-describedby="preferences-allergies-hint"
            />

            <small id="preferences-allergies-hint">
              Separate items with commas. Leave empty if you have
              none. Allergy filtering is not available yet.
            </small>
          </div>

          <div className="account-field">
            <label htmlFor="preferences-avoided">
              Foods you prefer to avoid
            </label>

            <input
              id="preferences-avoided"
              name="avoidedFoods"
              type="text"
              value={form.avoidedFoods}
              onChange={updateField}
              placeholder="For example: mushrooms, broccoli"
              aria-describedby="preferences-avoided-hint"
            />

            <small id="preferences-avoided-hint">
              Separate items with commas. These preferences are
              saved, but avoided-food filtering is not available yet.
            </small>
          </div>

          <div className="account-field">
            <label htmlFor="preferences-budget">
              Daily food budget (LKR)
            </label>

            <input
              id="preferences-budget"
              name="dailyBudgetLkr"
              type="number"
              min="1"
              max="100000"
              step="0.01"
              value={form.dailyBudgetLkr}
              onChange={updateField}
              placeholder="Optional"
              aria-describedby="preferences-budget-hint"
            />

            <small id="preferences-budget-hint">
              Leave empty if you do not want to set a budget.
              Budget matching is not available yet.
            </small>
          </div>

          <button className="profile-save ew-action ew-action--primary" type="submit" aria-busy={saving}>
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </fieldset>

        {error && (
          <p className="account-message account-error" role="alert">
            {error}
          </p>
        )}

        {notice && (
          <p className="account-message account-success" role="status">
            {notice}
          </p>
        )}
      </form>
    </section>
  )
}
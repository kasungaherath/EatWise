import WorkspaceSectionTitle from './WorkspaceSectionTitle.jsx'
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
  // Retain compatibility with saved preferences and the existing API.
  dailyBudgetLkr: null,
  mealsPerDay: 3,
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
        ? null
        : Number(preferences.dailyBudgetLkr),
    mealsPerDay: Number(preferences.mealsPerDay ?? 3),
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

    try {
      const validDiets = ['omnivore', 'vegetarian', 'vegan', 'pescatarian']
      if (!validDiets.includes(form.dietType)) {
        throw new Error('Select a valid diet type.')
      }

      const payload = {
        dietType: form.dietType,
        allergies: parseList(form.allergies, 'Allergies'),
        avoidedFoods: parseList(form.avoidedFoods, 'Foods to avoid'),
        // These retained values are required by the existing API, but no
        // longer offered as editable options in the preferences dashboard.
        dailyBudgetLkr: form.dailyBudgetLkr,
        mealsPerDay: form.mealsPerDay,
      }

      if (isDemo) {
        setDemoStorage('preferences', payload)
        setForm(toForm(payload))
        setNotice('Demo preferences saved successfully.')
      } else {
        const data = await preferencesRequest({
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        if (!data.preferences) {
          throw new Error('The server did not return your saved preferences.')
        }
        setForm(toForm(data.preferences))
        setNotice('Your food preferences have been saved.')
      }
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
        <WorkspaceSectionTitle id="preferences-heading" icon="preferences">Food preferences</WorkspaceSectionTitle>
        <p role="status">Loading your food preferences…</p>
      </section>
    )
  }

  if (loadFailed) {
    return (
      <section className="profile-section ew-section-state" data-workspace-section="preferences" aria-labelledby="preferences-heading" aria-busy={loading}>
        <WorkspaceSectionTitle id="preferences-heading" icon="preferences">Food preferences</WorkspaceSectionTitle>
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
      <WorkspaceSectionTitle id="preferences-heading" icon="preferences">Food preferences</WorkspaceSectionTitle>

      <p className="profile-description">
        Choose your diet and save your food preferences.
        You can update these details anytime.
      </p>

      <form onSubmit={handleSave} aria-busy={saving}>
        <fieldset className="profile-fields" disabled={saving}>
          <legend className="profile-legend">
            Diet and food preferences
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
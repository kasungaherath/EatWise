import { useEffect, useState } from 'react'
import './ProfileForm.css'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const emptyForm = {
  dietType: '',
  allergies: '',
  avoidedFoods: '',
  dailyBudgetLkr: '',
  mealsPerDay: '3',
}

function toForm(preferences) {
  return {
    dietType: preferences.dietType,
    allergies: preferences.allergies.join(', '),
    avoidedFoods: preferences.avoidedFoods.join(', '),
    dailyBudgetLkr: preferences.dailyBudgetLkr ?? '',
    mealsPerDay: String(preferences.mealsPerDay),
  }
}

function toFoodList(text) {
  return [...new Set(
    text
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  )]
}

async function preferencesRequest(options = {}) {
  let response

  try {
    response = await fetch(`${API_URL}/api/preferences/me`, {
      ...options,
      credentials: 'include',
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error

    throw new Error(
      'Cannot connect to EatWise. Check that the backend is running.'
    )
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.message || 'Unable to process your preferences'
    )
  }

  if (!data) {
    throw new Error('Unexpected server response. Please try again.')
  }

  return data
}

export default function PreferencesForm() {
  const [form, setForm] = useState({ ...emptyForm })
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

      try {
        const data = await preferencesRequest({
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          setForm(
            data.preferences
              ? toForm(data.preferences)
              : { ...emptyForm }
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
  }, [retry])

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

    setError('')
    setNotice('')

    const allergies = toFoodList(form.allergies)
    const avoidedFoods = toFoodList(form.avoidedFoods)

    if (
      [allergies, avoidedFoods].some(
        (list) =>
          list.length > 30 ||
          list.some((item) => item.length > 80)
      )
    ) {
      setError(
        'Use up to 30 items per list, with no more than 80 characters per item.'
      )
      return
    }

    setSaving(true)

    try {
      const data = await preferencesRequest({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dietType: form.dietType,
          allergies,
          avoidedFoods,
          dailyBudgetLkr:
            form.dailyBudgetLkr === ''
              ? null
              : Number(form.dailyBudgetLkr),
          mealsPerDay: Number(form.mealsPerDay),
        }),
      })

      setForm(toForm(data.preferences))
      setNotice('Your food preferences have been saved.')
    } catch (error) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="profile-section">
        <p role="status">Loading food preferences…</p>
      </div>
    )
  }

  if (loadFailed) {
    return (
      <div className="profile-section">
        <p className="account-message account-error" role="alert">
          {error}
        </p>

        <button
          className="profile-save"
          type="button"
          onClick={() => setRetry((current) => current + 1)}
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <section
      className="profile-section"
      aria-labelledby="preferences-heading"
    >
      <h3 id="preferences-heading">Your food preferences</h3>

      <p className="profile-description">
        Tell us what you enjoy, what to avoid, and what fits your day.
      </p>

      <form onSubmit={handleSave}>
        <fieldset className="profile-fields" disabled={saving}>
          <legend className="profile-legend">
            Diet, food exclusions, and budget
          </legend>

          <div className="account-field">
            <label htmlFor="preferences-diet">Diet preference</label>

            <select
              id="preferences-diet"
              name="dietType"
              value={form.dietType}
              onChange={updateField}
              required
            >
              <option value="">Select your diet preference</option>
              <option value="omnivore">
                Omnivore — plant and animal foods
              </option>
              <option value="vegetarian">
                Vegetarian — no meat or fish
              </option>
              <option value="vegan">
                Vegan — plant foods only
              </option>
              <option value="pescatarian">
                Pescatarian — fish, but no other meat
              </option>
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
              placeholder="For example: peanuts, milk, eggs"
              value={form.allergies}
              onChange={updateField}
              maxLength={2500}
              aria-describedby="allergies-hint"
            />

            <small id="allergies-hint">
              Separate each allergy with a comma. Leave blank if none.
            </small>
          </div>

          <div className="account-field">
            <label htmlFor="preferences-avoided">
              Other foods to avoid
            </label>

            <input
              id="preferences-avoided"
              name="avoidedFoods"
              type="text"
              placeholder="For example: mushrooms, beef"
              value={form.avoidedFoods}
              onChange={updateField}
              maxLength={2500}
              aria-describedby="avoided-hint"
            />

            <small id="avoided-hint">
              Add dislikes or other food restrictions, separated by commas.
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
              placeholder="For example: 1500"
              value={form.dailyBudgetLkr}
              onChange={updateField}
              aria-describedby="budget-hint"
            />

            <small id="budget-hint">
              Optional. Leave blank if you have no set budget.
            </small>
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

          <button className="profile-save" type="submit">
            {saving ? 'Saving…' : 'Save food preferences'}
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
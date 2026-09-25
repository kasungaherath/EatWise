import { useEffect, useState } from 'react'
import './ProfileForm.css'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const emptyProfile = {
  age: '',
  heightCm: '',
  weightKg: '',
  activityLevel: '',
  goal: '',
}

export default function ProfileForm() {
  const [form, setForm] = useState(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadProfile() {
      setLoading(true)
      setLoadFailed(false)
      setError('')

      try {
        const response = await fetch(`${API_URL}/api/profile/me`, {
          credentials: 'include',
          signal: controller.signal,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load your profile')
        }

        if (!controller.signal.aborted) {
          setForm(data.profile || { ...emptyProfile })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadFailed(true)
          setError(
            error instanceof TypeError
              ? 'Cannot connect to EatWise. Check your connection and try again.'
              : error.message
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => controller.abort()
  }, [retry])

  function updateField(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setNotice('')
    setError('')
  }

  async function handleSave(event) {
    event.preventDefault()
    if (saving) return

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch(`${API_URL}/api/profile/me`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          age: Number(form.age),
          heightCm: Number(form.heightCm),
          weightKg: Number(form.weightKg),
          activityLevel: form.activityLevel,
          goal: form.goal,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to save your profile')
      }

      setForm(data.profile)
      setNotice('Your profile has been saved.')
    } catch (error) {
      setError(
        error instanceof TypeError
          ? 'Cannot connect to EatWise. Please try again.'
          : error.message
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="profile-section">
        <p role="status">Loading your profile…</p>
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
    <section className="profile-section" aria-labelledby="profile-heading">
      <h3 id="profile-heading">Your personal profile</h3>

      <p className="profile-description">
        Tell us about yourself and what you want to achieve.
        You can update these details anytime.
      </p>

      <form onSubmit={handleSave}>
        <fieldset className="profile-fields" disabled={saving}>
          <legend className="profile-legend">
            Body measurements and goals
          </legend>

          <div className="profile-grid">
            <div className="account-field">
              <label htmlFor="profile-age">Age</label>
              <input
                id="profile-age"
                name="age"
                type="number"
                min="18"
                max="120"
                step="1"
                value={form.age}
                onChange={updateField}
                required
              />
            </div>

            <div className="account-field">
              <label htmlFor="profile-height">Height (cm)</label>
              <input
                id="profile-height"
                name="heightCm"
                type="number"
                min="50"
                max="260"
                step="0.01"
                value={form.heightCm}
                onChange={updateField}
                required
              />
            </div>

            <div className="account-field">
              <label htmlFor="profile-weight">Weight (kg)</label>
              <input
                id="profile-weight"
                name="weightKg"
                type="number"
                min="20"
                max="500"
                step="0.01"
                value={form.weightKg}
                onChange={updateField}
                required
              />
            </div>
          </div>

          <div className="account-field">
            <label htmlFor="profile-activity">Activity level</label>
            <select
              id="profile-activity"
              name="activityLevel"
              value={form.activityLevel}
              onChange={updateField}
              required
            >
              <option value="">Select your activity level</option>
              <option value="sedentary">
                Sedentary — mostly sitting, little exercise
              </option>
              <option value="light">
                Light — some walking and occasional exercise
              </option>
              <option value="moderate">
                Moderate — regular exercise and daily movement
              </option>
              <option value="active">
                Active — frequent exercise or a physical job
              </option>
              <option value="very_active">
                Very active — demanding training and daily activity
              </option>
            </select>
          </div>

          <div className="account-field">
            <label htmlFor="profile-goal">Your main goal</label>
            <select
              id="profile-goal"
              name="goal"
              value={form.goal}
              onChange={updateField}
              required
            >
              <option value="">Select your goal</option>
              <option value="lose_weight">Lose weight</option>
              <option value="maintain_weight">Maintain weight</option>
              <option value="gain_muscle">Gain muscle</option>
            </select>
          </div>

          <p className="profile-note">
            EatWise currently supports adults aged 18 and over.
          </p>

          <button className="profile-save" type="submit">
            {saving ? 'Saving…' : 'Save profile'}
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
import { useEffect, useState } from 'react'
import {
  DEFAULT_DEMO_PROFILE,
  getDemoStorage,
  setDemoStorage,
} from '../demoWorkspace.js'
import './ProfileForm.css'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const emptyProfile = {
  age: '',
  sexForCalculation: '',
  heightCm: '',
  weightKg: '',
  activityLevel: '',
  goal: '',
}

function toForm(profile) {
  return {
    age: profile.age ?? '',
    sexForCalculation: profile.sexForCalculation ?? '',
    heightCm: profile.heightCm ?? '',
    weightKg: profile.weightKg ?? '',
    activityLevel: profile.activityLevel ?? '',
    goal: profile.goal ?? '',
  }
}

async function profileRequest(options = {}) {
  let response

  try {
    response = await fetch(`${API_URL}/api/profile/me`, {
      ...options,
      credentials: 'include',
      cache: 'no-store',
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error

    throw new Error(
      'Cannot connect to EatWise. Check that the backend is running.',
      { cause: error }
    )
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.message || 'Unable to process your profile'
    )
  }

  if (!data || !Object.hasOwn(data, 'profile')) {
    throw new Error('Unexpected profile response from the backend.')
  }

  if (
    data.profile &&
    ![null, 'male', 'female'].includes(
      data.profile.sexForCalculation
    )
  ) {
    throw new Error(
      'The backend returned a missing or invalid sex field. Restart the backend with the updated profileController.js.'
    )
  }

  return data
}

export default function ProfileForm({ onSaved, isDemo = false }) {
  const [form, setForm] = useState({ ...emptyProfile })
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
      setNotice('')

      if (isDemo) {
        const demoData = getDemoStorage('profile', DEFAULT_DEMO_PROFILE)
        setForm(toForm(demoData))
        setLoading(false)
        return
      }

      try {
        const data = await profileRequest({
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          setForm(
            data.profile
              ? toForm(data.profile)
              : { ...emptyProfile }
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

    loadProfile()

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

  function handleQuickFill() {
    setForm(toForm(DEFAULT_DEMO_PROFILE))
    setError('')
    setNotice('Sample measurements filled. Click "Save profile" to calculate nutrition.')
  }

  async function handleSave(event) {
    event.preventDefault()
    if (saving) return

    setSaving(true)
    setError('')
    setNotice('')

    if (isDemo) {
      const demoSaved = {
        age: Number(form.age),
        sexForCalculation: form.sexForCalculation || 'female',
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        activityLevel: form.activityLevel || 'active',
        goal: form.goal || 'maintain_weight',
      }
      setDemoStorage('profile', demoSaved)
      setForm(toForm(demoSaved))
      setNotice('Demo profile saved successfully.')
      setSaving(false)
      onSaved?.()
      return
    }

    const payload = {
      age: Number(form.age),
      sexForCalculation: form.sexForCalculation || null,
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      activityLevel: form.activityLevel,
      goal: form.goal,
    }

    let saveAccepted = false

    try {
      const saved = await profileRequest({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      saveAccepted = true

      if (
        !saved.profile ||
        saved.profile.sexForCalculation !== payload.sexForCalculation
      ) {
        throw new Error(
          'The save response contains a different sex selection.'
        )
      }

      const loaded = await profileRequest()

      if (
        !loaded.profile ||
        loaded.profile.sexForCalculation !== payload.sexForCalculation
      ) {
        throw new Error(
          'Reloading the profile returned a different sex selection. Check the backend terminal.'
        )
      }

      setForm(toForm(loaded.profile))
      setNotice('Your profile has been saved and verified.')
      onSaved?.()
    } catch (error) {
      setError(
        saveAccepted
          ? `The save request succeeded, but verification failed: ${error.message}`
          : error.message
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="profile-section ew-section-state" data-workspace-section="profile" aria-labelledby="profile-heading" aria-busy={loading}>
        <h3 id="profile-heading">Your personal profile</h3>
        <p role="status">Loading your profile…</p>
      </section>
    )
  }

  if (loadFailed) {
    return (
      <section className="profile-section ew-section-state" data-workspace-section="profile" aria-labelledby="profile-heading" aria-busy={loading}>
        <h3 id="profile-heading">Your personal profile</h3>
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
      className="profile-section" data-workspace-section="profile"
      aria-labelledby="profile-heading"
    >
      <h3 id="profile-heading">Your personal profile</h3>

      <p className="profile-description">
        Tell us about yourself and what you want to achieve.
        Click Save profile after making changes.
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
            <label htmlFor="profile-sex">
              Sex used for calorie estimation
            </label>

            <select
              id="profile-sex"
              name="sexForCalculation"
              value={form.sexForCalculation}
              onChange={updateField}
              aria-describedby="profile-sex-hint"
            >
              <option value="">Prefer not to specify</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            <small id="profile-sex-hint">
              The estimation formula uses this parameter.
              Leave it unset if you prefer not to specify.
              Automatic calorie estimates will then be unavailable.
            </small>
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

          <div className="ew-profile-actions">
            <button className="profile-save ew-action ew-action--primary" type="submit" aria-busy={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            <button
              className="ew-action"
              type="button"
              onClick={handleQuickFill}
            >
              Fill Sample Measurements
            </button>
          </div>
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
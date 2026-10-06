import { useEffect, useRef, useState } from 'react'
import ProfileForm from './ProfileForm'
import PreferencesForm from './PreferencesForm'
import NutritionSummary from './NutritionSummary'
import FoodSuggestions from './FoodSuggestions'
import SavedFoodPlans from './SavedFoodPlans'
import './AccountPanel.css'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const emptyForm = {
  name: '',
  email: '',
  password: '',
}

async function authRequest(
  path,
  { method = 'GET', body, signal } = {}
) {
  const response = await fetch(`${API_URL}/api/auth${path}`, {
    method,
    credentials: 'include',
    cache: 'no-store',
    signal,
    ...(body !== undefined
      ? {
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      : {}),
  })

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(
      data.message || 'The account request failed.'
    )
    error.status = response.status
    throw error
  }

  return data
}

function requireUser(data) {
  if (!data.user || data.user.id == null) {
    throw new Error('The server returned an invalid account response.')
  }

  return data.user
}

function errorMessage(error) {
  return error instanceof TypeError
    ? 'Cannot connect to EatWise. Check that the backend is running.'
    : error.message
}

export default function AccountPanel() {
  const [mode, setMode] = useState('login')
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [sessionFailed, setSessionFailed] = useState(false)
  const [sessionRetry, setSessionRetry] = useState(0)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [profileRevision, setProfileRevision] = useState(0)
  const [preferencesRevision, setPreferencesRevision] = useState(0)
  const [savedPlansRevision, setSavedPlansRevision] = useState(0)

  const submittingRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()

    async function checkSession() {
      setChecking(true)
      setSessionFailed(false)
      setError('')

      try {
        const data = await authRequest('/me', {
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          setUser(requireUser(data))
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setUser(null)

          if (error.status !== 401) {
            setSessionFailed(true)
            setError(errorMessage(error))
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setChecking(false)
        }
      }
    }

    checkSession()

    return () => controller.abort()
  }, [sessionRetry])

  function resetRevisions() {
    setProfileRevision(0)
    setPreferencesRevision(0)
    setSavedPlansRevision(0)
  }

  function updateField(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setError('')
    setNotice('')
  }

  function switchMode() {
    if (busy) return

    setMode((current) =>
      current === 'login' ? 'register' : 'login'
    )
    setForm((current) => ({
      ...current,
      password: '',
    }))
    setError('')
    setNotice('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (submittingRef.current) return

    const email = form.email.trim()
    const name = form.name.trim()

    if (!email || !form.password) {
      setError('Enter your email address and password.')
      return
    }

    if (mode === 'register') {
      if (name.length < 2) {
        setError('Enter a name with at least 2 characters.')
        return
      }

      if (form.password.length < 12) {
        setError('Use a password with at least 12 characters.')
        return
      }

      if (new TextEncoder().encode(form.password).length > 72) {
        setError('Your password is too long. Use at most 72 bytes.')
        return
      }
    }

    submittingRef.current = true
    setBusy(true)
    setError('')
    setNotice('')

    try {
      if (mode === 'register') {
        await authRequest('/register', {
          method: 'POST',
          body: {
            name,
            email,
            password: form.password,
          },
        })

        setMode('login')
        setForm({
          name: '',
          email,
          password: '',
        })
        setNotice('Your account has been created. Please log in.')
      } else {
        const data = await authRequest('/login', {
          method: 'POST',
          body: {
            email,
            password: form.password,
          },
        })

        setUser(requireUser(data))
        setForm({ ...emptyForm })
        resetRevisions()
      }
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      submittingRef.current = false
      setBusy(false)
    }
  }

  async function handleLogout() {
    if (submittingRef.current) return

    submittingRef.current = true
    setBusy(true)
    setError('')
    setNotice('')

    try {
      await authRequest('/logout', {
        method: 'POST',
      })

      setUser(null)
      setMode('login')
      setForm({ ...emptyForm })
      resetRevisions()
      setNotice('You have been logged out.')
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      submittingRef.current = false
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <section className="account-section">
        <p role="status">Checking your account…</p>
      </section>
    )
  }

  if (sessionFailed) {
    return (
      <section className="account-section">
        <div className="account-card">
          <h2>Unable to load your account</h2>

          <p className="account-message account-error" role="alert">
            {error}
          </p>

          <button
            className="account-submit"
            type="button"
            onClick={() => setSessionRetry((current) => current + 1)}
          >
            Try again
          </button>
        </div>
      </section>
    )
  }

  if (user) {
    return (
      <section aria-labelledby="account-heading">
        <div className="account-card">
          <h2 id="account-heading">
            Welcome, {user.name || 'EatWise member'}
          </h2>

          <p>{user.email}</p>

          <button
            className="account-submit"
            type="button"
            onClick={handleLogout}
            disabled={busy}
          >
            {busy ? 'Logging out…' : 'Log out'}
          </button>

          {error && (
            <p className="account-message account-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <ProfileForm
          key={`profile-${user.id}`}
          onSaved={() => setProfileRevision((current) => current + 1)}
        />

        <NutritionSummary
          key={`nutrition-${user.id}`}
          refreshKey={profileRevision}
        />

        <PreferencesForm
          key={`preferences-${user.id}`}
          onSaved={() =>
            setPreferencesRevision((current) => current + 1)
          }
        />

        <FoodSuggestions
          key={`suggestions-${user.id}-${profileRevision}-${preferencesRevision}`}
          onSaved={() =>
            setSavedPlansRevision((current) => current + 1)
          }
        />

        <SavedFoodPlans
          key={`saved-plans-${user.id}`}
          refreshKey={savedPlansRevision}
        />

      </section>
    )
  }

  const registering = mode === 'register'

  return (
    <section className="account-section" aria-labelledby="auth-heading">
      <div className="account-intro">
        <span className="account-badge">Your EatWise account</span>
        <h2>Food planning around your goals</h2>
        <p>
          Save your profile, set your food preferences, and explore
          food quantities with calculated nutrition.
        </p>
      </div>

      <div className="account-card">
        <h2 id="auth-heading">
          {registering ? 'Create your account' : 'Welcome back'}
        </h2>

        <p>
          {registering
            ? 'Start your EatWise journey.'
            : 'Log in to your EatWise account.'}
        </p>

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

        <form onSubmit={handleSubmit}>
          {registering && (
            <div className="account-field">
              <label htmlFor="account-name">Name</label>
              <input
                id="account-name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={updateField}
                minLength={2}
                required
                disabled={busy}
              />
            </div>
          )}

          <div className="account-field">
            <label htmlFor="account-email">Email address</label>
            <input
              id="account-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField}
              required
              disabled={busy}
            />
          </div>

          <div className="account-field">
            <label htmlFor="account-password">Password</label>
            <input
              id="account-password"
              name="password"
              type="password"
              autoComplete={
                registering ? 'new-password' : 'current-password'
              }
              value={form.password}
              onChange={updateField}
              minLength={registering ? 12 : undefined}
              required
              disabled={busy}
            />

            {registering && (
              <small>Use at least 12 characters.</small>
            )}
          </div>

          <button
            className="account-submit"
            type="submit"
            disabled={busy}
          >
            {busy
              ? registering
                ? 'Creating account…'
                : 'Logging in…'
              : registering
                ? 'Create account'
                : 'Log in'}
          </button>
        </form>

        <p className="account-switch">
          {registering ? 'Already have an account? ' : 'New to EatWise? '}
          <button type="button" onClick={switchMode} disabled={busy}>
            {registering ? 'Log in' : 'Create account'}
          </button>
        </p>
      </div>
    </section>
  )
}

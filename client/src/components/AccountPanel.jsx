import { useEffect, useState } from 'react'
import ProfileForm from './ProfileForm.jsx'
import PreferencesForm from './PreferencesForm.jsx'
import NutritionSummary from './NutritionSummary.jsx'
import RecipeList from './RecipeList.jsx'
import './AccountPanel.css'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const emptyForm = {
  name: '',
  email: '',
  password: '',
}

async function authRequest(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_URL}/api/auth${path}`, {
      ...options,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        ...(options.body
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    throw new Error(
      'Cannot connect to EatWise. Check that the backend is running.'
    )
  }

  let data

  try {
    data = await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    const responseError = new Error(
      'The server returned an unexpected response.'
    )
    responseError.status = response.status
    throw responseError
  }

  if (!response.ok || data?.success === false) {
    const error = new Error(
      data?.message || 'Unable to complete your request.'
    )
    error.status = response.status
    throw error
  }

  return data
}

function requireUser(data) {
  if (!data?.user || data.user.id == null) {
    throw new Error(
      'The server returned incomplete account information.'
    )
  }

  return data.user
}

export default function AccountPanel() {
  const [mode, setMode] = useState('login')
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ ...emptyForm })
  const [profileRevision, setProfileRevision] = useState(0)
  const [preferencesRevision, setPreferencesRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function checkSession() {
      try {
        const data = await authRequest('/me', {
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          setUser(requireUser(data))
        }
      } catch (error) {
        if (
          !controller.signal.aborted &&
          error.status !== 401
        ) {
          setError(error.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setChecking(false)
        }
      }
    }

    checkSession()

    return () => controller.abort()
  }, [])

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

    if (busy) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const email = form.email.trim()

      if (mode === 'register') {
        const name = form.name.trim()

        if (name.length < 2) {
          throw new Error(
            'Enter a name with at least 2 characters.'
          )
        }

        if (form.password.length < 12) {
          throw new Error(
            'Use a password with at least 12 characters.'
          )
        }

        if (
          new TextEncoder().encode(form.password).length > 72
        ) {
          throw new Error(
            'Your password is too long. Use fewer characters.'
          )
        }

        await authRequest('/register', {
          method: 'POST',
          body: JSON.stringify({
            name,
            email,
            password: form.password,
          }),
        })

        setMode('login')
        setForm({
          name: '',
          email,
          password: '',
        })
        setNotice(
          'Your account has been created. Please log in.'
        )
      } else {
        const data = await authRequest('/login', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password: form.password,
          }),
        })

        setUser(requireUser(data))
        setForm({ ...emptyForm })
        setProfileRevision(0)
        setPreferencesRevision(0)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    if (busy) return

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
      setProfileRevision(0)
      setPreferencesRevision(0)
      setNotice('You have been logged out.')
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy(false)
    }
  }

  const isRegister = mode === 'register'

  return (
    <section
      id="account"
      className="account-section"
      aria-labelledby="account-heading"
    >
      <div className="account-intro">
        <span className="account-badge">
          YOUR EATWISE ACCOUNT
        </span>

        <h2 id="account-heading">
          {user
            ? 'Your next step towards eating well.'
            : 'Make healthy eating personal.'}
        </h2>

        <p>
          Save your profile, set your goals, and tell us
          which foods work for you.
        </p>
      </div>

      <div className="account-card">
        {checking ? (
          <p role="status">Checking your session…</p>
        ) : user ? (
          <>
            <span className="account-badge">SIGNED IN</span>

            <h3>Welcome, {user.name}</h3>

            <p className="account-email">{user.email}</p>

            <ProfileForm
              key={`profile-${user.id}`}
              onSaved={() =>
                setProfileRevision((current) => current + 1)
              }
            />

            <NutritionSummary
              key={`nutrition-${user.id}`}
              refreshKey={profileRevision}
            />

            <PreferencesForm
              key={`preferences-${user.id}`}
              onSaved={() =>
                setPreferencesRevision(
                  (current) => current + 1
                )
              }
            />

            <RecipeList
              key={`recipes-${user.id}`}
              refreshKey={preferencesRevision}
            />

            {error && (
              <p
                className="account-message account-error"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              className="account-submit"
              type="button"
              onClick={handleLogout}
              disabled={busy}
            >
              {busy ? 'Logging out…' : 'Log out'}
            </button>
          </>
        ) : (
          <>
            <h3>
              {isRegister
                ? 'Create your account'
                : 'Welcome back'}
            </h3>

            <p className="account-description">
              {isRegister
                ? 'Get started with your EatWise profile.'
                : 'Log in to your EatWise account.'}
            </p>

            {error && (
              <p
                className="account-message account-error"
                role="alert"
              >
                {error}
              </p>
            )}

            {notice && (
              <p
                className="account-message account-success"
                role="status"
              >
                {notice}
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              aria-busy={busy}
            >
              {isRegister && (
                <div className="account-field">
                  <label htmlFor="account-name">
                    Full name
                  </label>

                  <input
                    id="account-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={updateField}
                    minLength={2}
                    maxLength={100}
                    disabled={busy}
                    required
                  />
                </div>
              )}

              <div className="account-field">
                <label htmlFor="account-email">
                  Email address
                </label>

                <input
                  id="account-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={updateField}
                  maxLength={254}
                  disabled={busy}
                  required
                />
              </div>

              <div className="account-field">
                <label htmlFor="account-password">
                  Password
                </label>

                <input
                  id="account-password"
                  name="password"
                  type="password"
                  autoComplete={
                    isRegister
                      ? 'new-password'
                      : 'current-password'
                  }
                  value={form.password}
                  onChange={updateField}
                  minLength={isRegister ? 12 : undefined}
                  aria-describedby={
                    isRegister
                      ? 'account-password-hint'
                      : undefined
                  }
                  disabled={busy}
                  required
                />

                {isRegister && (
                  <small id="account-password-hint">
                    Use at least 12 characters.
                  </small>
                )}
              </div>

              <button
                className="account-submit"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? isRegister
                    ? 'Creating account…'
                    : 'Logging in…'
                  : isRegister
                    ? 'Create account'
                    : 'Log in'}
              </button>
            </form>

            <p className="account-switch">
              {isRegister
                ? 'Already have an account? '
                : 'New to EatWise? '}

              <button
                className="account-switch-button"
                type="button"
                onClick={switchMode}
                disabled={busy}
              >
                {isRegister ? 'Log in' : 'Create account'}
              </button>
            </p>
          </>
        )}
      </div>
    </section>
  )
}
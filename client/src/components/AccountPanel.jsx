import { useEffect, useState } from 'react'
import ProfileForm from './ProfileForm.jsx'
import './AccountPanel.css'
import PreferencesForm from './PreferencesForm.jsx'
const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

async function authRequest(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_URL}/api/auth${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error

    throw new Error(
      'Cannot connect to EatWise. Check that the backend is running.'
    )
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(
      data?.message || 'Request failed. Please try again.'
    )
    error.status = response.status
    throw error
  }

  if (!data) {
    throw new Error('Unexpected server response. Please try again.')
  }

  return data
}

export default function AccountPanel() {
  const [mode, setMode] = useState('login')
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  useEffect(() => {
    const controller = new AbortController()

    async function checkSession() {
      try {
        const data = await authRequest('/me', {
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          setUser(data.user)
        }
      } catch (error) {
        if (!controller.signal.aborted && error.status !== 401) {
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
  }

  function switchMode() {
    setMode((current) => (
      current === 'login' ? 'register' : 'login'
    ))
    setError('')
    setNotice('')
    setForm((current) => ({
      ...current,
      password: '',
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const payload = mode === 'register'
        ? {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
          }
        : {
            email: form.email.trim(),
            password: form.password,
          }

      const data = await authRequest(`/${mode}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setForm((current) => ({
        ...current,
        password: '',
      }))

      if (mode === 'register') {
        setMode('login')
        setNotice('Account created. Log in with your new password.')
      } else {
        setUser(data.user)
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
      setForm({
        name: '',
        email: '',
        password: '',
      })
      setNotice('You have been logged out.')
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="account-section" id="account">
      <div className="account-intro">
        <span className="eyebrow">YOUR EATWISE ACCOUNT</span>

        <h2>
          {user
            ? 'Your goals. Your starting point.'
            : 'Your next chapter starts here.'}
        </h2>

        <p>
          {user
            ? 'Keep your profile up to date so your meal plans can reflect your needs and goals.'
            : 'Create your account to get started with EatWise. Already registered? Welcome back.'}
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

            <ProfileForm key={user.id} />
            <PreferencesForm key={user.id} />

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
              {mode === 'login'
                ? 'Welcome back'
                : 'Create your account'}
            </h3>

            <p className="account-description">
              {mode === 'login'
                ? 'Log in to your EatWise account.'
                : 'Start with a few simple details.'}
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

            <form onSubmit={handleSubmit}>
              <fieldset
                className="account-fields"
                disabled={busy}
              >
                {mode === 'register' && (
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
                      mode === 'register'
                        ? 'new-password'
                        : 'current-password'
                    }
                    value={form.password}
                    onChange={updateField}
                    minLength={
                      mode === 'register' ? 12 : undefined
                    }
                    aria-describedby={
                      mode === 'register'
                        ? 'password-hint'
                        : undefined
                    }
                    required
                  />

                  {mode === 'register' && (
                    <small id="password-hint">
                      Use at least 12 characters.
                    </small>
                  )}
                </div>

                <button
                  className="account-submit"
                  type="submit"
                >
                  {busy
                    ? 'Please wait…'
                    : mode === 'login'
                      ? 'Log in'
                      : 'Create account'}
                </button>
              </fieldset>
            </form>

            <p className="account-switch">
              {mode === 'login'
                ? 'New to EatWise?'
                : 'Already have an account?'}

              <button
                type="button"
                onClick={switchMode}
                disabled={busy}
              >
                {mode === 'login'
                  ? 'Create account'
                  : 'Log in'}
              </button>
            </p>
          </>
        )}
      </div>
    </section>
  )
}
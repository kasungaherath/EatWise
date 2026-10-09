import { useState } from 'react'
import { loginUser, registerUser, startDemoSession } from '../auth.js'

function PasswordIcon({ visible }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {visible ? <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" /></> : <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>}
    </svg>
  )
}

export default function InlineAuth({ onLoginSuccess }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const isRegister = mode === 'register'

  function updateField(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
    setNotice('')
  }

  function handleModeChange() {
    setMode(isRegister ? 'login' : 'register')
    setShowPassword(false)
    setError('')
    setNotice('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    const email = form.email.trim()
    const name = form.name.trim()
    if (!email || !form.password) {
      setError('Please enter your email and password.')
      return
    }
    if (isRegister && name.length < 2) {
      setError('Please enter your name (at least 2 characters).')
      return
    }
    if (isRegister && form.password.length < 12) {
      setError('Use at least 12 characters for your password.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (isRegister) {
        await registerUser(name, email, form.password)
        setMode('login')
        setShowPassword(false)
        setNotice('Account created. Sign in to open your workspace.')
      } else {
        onLoginSuccess(await loginUser(email, form.password))
      }
    } catch (err) {
      const message = err.message || 'Something went wrong. Please try again.'
      setError(/fetch|network/i.test(message)
        ? 'Unable to connect. Try again, or explore the guest workspace below.'
        : message)
    } finally {
      setBusy(false)
    }
  }

  function handleDemo() {
    setError('')
    try {
      onLoginSuccess(startDemoSession())
    } catch {
      setError('Guest mode needs browser storage. Enable it and try again.')
    }
  }

  return (
    <section className="ew-login" id="login-section" aria-labelledby="login-heading">
      <h2 id="login-heading">{isRegister ? 'Create an account' : 'Sign in'}</h2>
      <p className="ew-login-description">{isRegister ? 'Start your personal nutrition workspace.' : 'Continue to your nutrition workspace.'}</p>
      {error && <p className="ew-login-message is-error" role="alert">{error}</p>}
      {notice && <p className="ew-login-message" role="status">{notice}</p>}
      <form className="ew-login-form" onSubmit={handleSubmit} aria-busy={busy}>
        {isRegister && (
          <div className="ew-login-field">
            <label htmlFor="inline-auth-name">Full name</label>
            <input id="inline-auth-name" name="name" autoComplete="name" placeholder="Your name" value={form.name} onChange={updateField} disabled={busy} required minLength={2} />
          </div>
        )}
        <div className="ew-login-field">
          <label htmlFor="inline-auth-email">Email address</label>
          <input id="inline-auth-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={updateField} disabled={busy} required />
        </div>
        <div className="ew-login-field">
          <div className="ew-login-label">
            <label htmlFor="inline-auth-password">Password</label>
            {isRegister && <span id="password-hint">At least 12 characters</span>}
          </div>
          <div className="ew-login-password">
            <input id="inline-auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} aria-describedby={isRegister ? 'password-hint' : undefined} minLength={isRegister ? 12 : undefined} placeholder={isRegister ? 'Create a password' : 'Enter your password'} value={form.password} onChange={updateField} disabled={busy} required />
            <button className="ew-action ew-action--quiet" type="button" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} disabled={busy}>
              <PasswordIcon visible={showPassword} />
            </button>
          </div>
        </div>
        <button className="ew-login-primary ew-action ew-action--primary" type="submit" aria-busy={busy} disabled={busy}>
          {busy ? (isRegister ? 'Creating account…' : 'Signing in…') : (isRegister ? 'Create account' : 'Sign in')}
          {!busy && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>}
        </button>
      </form>
      <p className="ew-login-switch">
        {isRegister ? 'Already have an account?' : 'New to EatWise?'}
        <button className="ew-action ew-action--link" type="button" onClick={handleModeChange} disabled={busy}>{isRegister ? 'Sign in' : 'Create an account'}</button>
      </p>
      <div className="ew-login-guest">
        <button className="ew-action" type="button" onClick={handleDemo} disabled={busy}>Try guest workspace</button>
        <p>Explore with sample data. No account needed.</p>
      </div>
    </section>
  )
}

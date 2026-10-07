import { useState } from 'react'
import { loginUser, registerUser, startDemoSession } from '../auth.js'

function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  )
}

function UserPlusIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  )
}

function getPasswordStrength(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return score
}

export default function InlineAuth({ onLoginSuccess }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function updateField(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
    setNotice('')
  }

  function handleModeChange(newMode) {
    setMode(newMode)
    setError('')
    setNotice('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const email = form.email.trim()
    const name = form.name.trim()

    if (!email || !form.password) {
      setError('Please enter your email and password.')
      return
    }

    if (mode === 'register') {
      if (name.length < 2) {
        setError('Please enter your name (at least 2 characters).')
        return
      }
      if (form.password.length < 12) {
        setError('Password must be at least 12 characters.')
        return
      }
    }

    setBusy(true)
    setError('')
    setNotice('')

    try {
      if (mode === 'register') {
        await registerUser(name, email, form.password)
        setMode('login')
        setNotice('Account created successfully! You can now log in below.')
      } else {
        const user = await loginUser(email, form.password)
        onLoginSuccess(user)
      }
    } catch (err) {
      const msg = err.message || 'Login failed.'
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        setError('Backend server offline. Click "Explore Workspace as Guest" below to test immediately.')
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  function handleDemo() {
    const demoUser = startDemoSession()
    onLoginSuccess(demoUser)
  }

  const isRegister = mode === 'register'
  const strength = getPasswordStrength(form.password)

  return (
    <div className="ew-inline-auth" id="login-section">
      {/* Decorative top accent glow */}
      <div className="ew-auth-card-topglow" aria-hidden="true" />

      {/* Header Bar with Portal Status and Mode Tabs */}
      <div className="ew-auth-header-bar">
        <div className="ew-auth-status-chip">
          <span className="ew-auth-status-pulse" aria-hidden="true" />
          <span>EatWise Secure Portal</span>
        </div>

        <div className="ew-inline-auth-tabs" role="tablist" aria-label="Sign in options">
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            className={`ew-inline-auth-tab ${!isRegister ? 'is-active' : ''}`}
            onClick={() => handleModeChange('login')}
          >
            <KeyIcon />
            <span>Log In</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            className={`ew-inline-auth-tab ${isRegister ? 'is-active' : ''}`}
            onClick={() => handleModeChange('register')}
          >
            <UserPlusIcon />
            <span>Create Account</span>
          </button>
        </div>
      </div>

      {/* Dynamic Title and Description */}
      <div className="ew-auth-heading-unit">
        <h2 className="ew-auth-heading">
          {isRegister ? 'Create your EatWise account' : 'Sign in to your nutrition workspace'}
        </h2>
        <p className="ew-auth-subheading">
          {isRegister
            ? 'Set up your profile to calculate metabolic targets and generate customized food portions.'
            : 'Access your saved meal drafts, calculated calorie and macro targets, and daily meal plans.'}
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="ew-inline-auth-alert ew-inline-auth-error" role="alert">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="ew-inline-auth-alert ew-inline-auth-notice" role="status">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{notice}</span>
        </div>
      )}

      {/* Form */}
      <form className="ew-inline-auth-form" onSubmit={handleSubmit}>
        {isRegister && (
          <div className="ew-inline-auth-field">
            <label htmlFor="inline-auth-name">Full Name</label>
            <div className="ew-auth-input-wrapper">
              <span className="ew-auth-input-icon" aria-hidden="true">
                <UserIcon />
              </span>
              <input
                id="inline-auth-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Alex Rivera"
                value={form.name}
                onChange={updateField}
                disabled={busy}
                required
              />
            </div>
          </div>
        )}

        <div className="ew-inline-auth-fields-row">
          <div className="ew-inline-auth-field">
            <label htmlFor="inline-auth-email">Email Address</label>
            <div className="ew-auth-input-wrapper">
              <span className="ew-auth-input-icon" aria-hidden="true">
                <MailIcon />
              </span>
              <input
                id="inline-auth-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={updateField}
                disabled={busy}
                required
              />
            </div>
          </div>

          <div className="ew-inline-auth-field">
            <div className="ew-inline-label-row">
              <label htmlFor="inline-auth-password">Password</label>
              {isRegister && <span className="ew-inline-auth-hint">12+ characters</span>}
            </div>
            <div className="ew-auth-input-wrapper">
              <span className="ew-auth-input-icon" aria-hidden="true">
                <LockIcon />
              </span>
              <input
                id="inline-auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder="••••••••••••"
                value={form.password}
                onChange={updateField}
                disabled={busy}
                required
              />
              <button
                type="button"
                className="ew-auth-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Password Strength Indicator in Register mode */}
        {isRegister && form.password && (
          <div className="ew-auth-strength-container" aria-live="polite">
            <div className="ew-auth-strength-bars">
              <span className={`ew-strength-bar ${strength >= 1 ? 'is-active-1' : ''}`} />
              <span className={`ew-strength-bar ${strength >= 2 ? 'is-active-2' : ''}`} />
              <span className={`ew-strength-bar ${strength >= 3 ? 'is-active-3' : ''}`} />
            </div>
            <span className="ew-auth-strength-text">
              {strength === 0 && 'Too short'}
              {strength === 1 && 'Minimum length reached'}
              {strength === 2 && 'Good password'}
              {strength >= 3 && 'Strong password'}
            </span>
          </div>
        )}

        {/* Remember Me row in login mode */}
        {!isRegister && (
          <div className="ew-auth-auxiliary-row">
            <label className="ew-auth-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="ew-auth-checkbox"
              />
              <span>Remember this device</span>
            </label>
            <span className="ew-auth-security-badge">
              <ShieldIcon />
              <span>Encrypted Session</span>
            </span>
          </div>
        )}

        {/* Primary Action Button */}
        <button className="ew-button ew-inline-submit-btn" type="submit" disabled={busy}>
          {busy ? (
            <span className="ew-submit-busy-cluster">
              <span className="ew-submit-spinner" aria-hidden="true" />
              <span>Connecting to workspace…</span>
            </span>
          ) : isRegister ? (
            <>
              <span>Create Account & Open Workspace</span>
              <ArrowIcon />
            </>
          ) : (
            <>
              <span>Log In & Open Workspace</span>
              <ArrowIcon />
            </>
          )}
        </button>

        {/* Tasteful Divider */}
        <div className="ew-auth-divider" aria-hidden="true">
          <span>OR QUICK ACCESS</span>
        </div>

        {/* Upgraded Guest Sandbox Card */}
        <button
          className="ew-inline-demo-btn"
          type="button"
          onClick={handleDemo}
        >
          <div className="ew-demo-icon-box" aria-hidden="true">
            <SparkIcon />
          </div>
          <div className="ew-demo-text-cluster">
            <div className="ew-demo-headline">
              <strong>Explore Workspace as Guest</strong>
              <span className="ew-demo-badge">Instant Sandbox</span>
            </div>
            <span className="ew-demo-subline">Test with pre-calibrated sample data — no account required</span>
          </div>
          <div className="ew-demo-arrow" aria-hidden="true">
            <ArrowIcon />
          </div>
        </button>
      </form>

      {/* Security & Trust Footer Strip */}
      <div className="ew-auth-trust-strip">
        <ShieldIcon />
        <span>End-to-end encrypted session · Verified metabolic science · Zero spam</span>
      </div>
    </div>
  )
}

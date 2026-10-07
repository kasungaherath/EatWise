const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

export async function checkSession(signal) {
  // Check if there is an active demo session in storage
  try {
    const demo = sessionStorage.getItem('eatwise_demo_user')
    if (demo) {
      return JSON.parse(demo)
    }
  } catch {
    // Ignore storage parse error
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal,
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.user || null
  } catch {
    // If backend is unreachable, check if demo session exists
    try {
      const demo = sessionStorage.getItem('eatwise_demo_user')
      if (demo) return JSON.parse(demo)
    } catch {
      // Ignore
    }
    return null
  }
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.message || 'Login failed.')
    error.status = response.status
    throw error
  }

  sessionStorage.removeItem('eatwise_demo_user')
  return data.user
}

export async function registerUser(name, email, password) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })

  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.message || 'Registration failed.')
    error.status = response.status
    throw error
  }

  return data
}

export async function logoutUser() {
  sessionStorage.removeItem('eatwise_demo_user')
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // Ignore network error on logout
  }
}

export function startDemoSession() {
  const demoUser = {
    id: 'demo-user',
    name: 'Alex Rivera',
    email: 'alex.rivera@eatwise.app',
    isDemo: true,
  }
  sessionStorage.setItem('eatwise_demo_user', JSON.stringify(demoUser))
  return demoUser
}

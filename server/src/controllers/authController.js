import bcrypt from 'bcryptjs'
import validator from 'validator'
import pool from '../config/db.js'
import { cookieOptions } from '../config/session.js'

export async function register(req, res) {
  const { name, email, password } = req.body || {}

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required',
    })
  }

  const cleanName = name.trim()
  const cleanEmail = email.trim().toLowerCase()

  if (cleanName.length < 2 || cleanName.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Name must contain between 2 and 100 characters',
    })
  }

  if (cleanEmail.length > 254 || !validator.isEmail(cleanEmail)) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid email address',
    })
  }

  if (password.length < 12) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain at least 12 characters',
    })
  }

  if (bcrypt.truncates(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password is too long. Use no more than 72 UTF-8 bytes',
    })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)

    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [cleanName, cleanEmail, passwordHash]
    )

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail,
      },
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      })
    }

    console.error('Registration failed:', error.code || error.name)

    return res.status(500).json({
      success: false,
      message: 'Unable to create your account. Please try again',
    })
  }
}

export async function login(req, res, next) {
  const { email, password } = req.body || {}

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    })
  }

  const cleanEmail = email.trim().toLowerCase()

  if (
    cleanEmail.length > 254 ||
    !validator.isEmail(cleanEmail) ||
    password.length === 0 ||
    bcrypt.truncates(password)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid email and password',
    })
  }

  try {
    const [users] = await pool.execute(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail]
    )

    const user = users[0]

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password',
      })
    }

    req.session.regenerate((error) => {
      if (error) return next(error)

      req.session.userId = user.id

      req.session.save((saveError) => {
        if (saveError) return next(saveError)

        res.set('Cache-Control', 'no-store')

        return res.json({
          success: true,
          message: 'Logged in successfully',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        })
      })
    })
  } catch (error) {
    next(error)
  }
}

export async function getCurrentUser(req, res, next) {
  res.set('Cache-Control', 'no-store')

  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Please log in',
    })
  }

  try {
    const [users] = await pool.execute(
      'SELECT id, name, email FROM users WHERE id = ?',
      [req.session.userId]
    )

    if (!users.length) {
      return req.session.destroy((error) => {
        if (error) return next(error)

        res.clearCookie('eatwise.sid', cookieOptions)

        return res.status(401).json({
          success: false,
          message: 'Please log in again',
        })
      })
    }

    return res.json({
      success: true,
      user: users[0],
    })
  } catch (error) {
    next(error)
  }
}

export function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error)

    res.clearCookie('eatwise.sid', cookieOptions)
    res.set('Cache-Control', 'no-store')

    return res.json({
      success: true,
      message: 'Logged out successfully',
    })
  })
}
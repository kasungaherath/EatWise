import bcrypt from 'bcryptjs'
import validator from 'validator'
import pool from '../config/db.js'

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
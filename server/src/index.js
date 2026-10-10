import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import pool from './config/db.js'
import {
  sessionMiddleware,
  sessionStore,
} from './config/session.js'

import authRoutes from './routes/authRoutes.js'
import profileRoutes from './routes/profileRoutes.js'
import preferencesRoutes from './routes/preferencesRoutes.js'
import nutritionRoutes from './routes/nutritionRoutes.js'
import recipeRoutes from './routes/recipeRoutes.js'
import foodRoutes from './routes/foodRoutes.js'
import foodSuggestionRoutes from './routes/foodSuggestionRoutes.js'
import foodPlanRoutes from './routes/foodPlanRoutes.js'

const app = express()
const PORT = Number(process.env.PORT) || 5000
const isProduction = process.env.NODE_ENV === 'production'

app.disable('x-powered-by')

if (isProduction) {
  app.set('trust proxy', 1)
}

const clientUrl = process.env.CLIENT_URL?.trim()

if (isProduction && !clientUrl) {
  throw new Error('CLIENT_URL environment variable is missing')
}

const allowedOrigins = new Set(
  [
    clientUrl ? new URL(clientUrl).origin : null,
    ...(
      isProduction
        ? []
        : [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
          ]
    ),
  ].filter(Boolean)
)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true)
      }

      const error = new Error('Origin not allowed')
      error.status = 403
      return callback(error)
    },
    credentials: true,
  })
)

// Cross-site session cookies require checks on requests that change data.
app.use((req, res, next) => {
  const changesData = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
    req.method
  )

  if (
    isProduction &&
    changesData &&
    !allowedOrigins.has(req.get('origin'))
  ) {
    return res.status(403).json({
      success: false,
      message: 'Request origin is not allowed',
    })
  }

  next()
})

app.use(express.json({ limit: '100kb' }))
app.use(sessionMiddleware)

app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/preferences', preferencesRoutes)
app.use('/api/nutrition', nutritionRoutes)
app.use('/api/recipes', recipeRoutes)
app.use('/api/foods', foodRoutes)
app.use('/api/food-plans', foodPlanRoutes)
app.use('/api/food-suggestions', foodSuggestionRoutes)

app.get('/api/health', async (req, res) => {
  res.set('Cache-Control', 'no-store')

  try {
    await pool.query('SELECT 1')

    return res.json({
      success: true,
      message: 'EatWise backend is running',
      database: 'Connected',
    })
  } catch (error) {
    console.error('Database health check failed:', error.code)

    return res.status(503).json({
      success: false,
      message: 'Database is unavailable',
      database: 'Disconnected',
    })
  }
})

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  })
})

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }

  console.error('Request failed:', err.code || err.name)

  const status =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status < 600
      ? err.status
      : 500

  const messages = {
    400: 'Invalid request data',
    403: 'Request origin is not allowed',
    413: 'Request body is too large',
  }

  return res.status(status).json({
    success: false,
    message: messages[status] || 'Unable to process your request',
  })
})

async function startServer() {
  try {
    await pool.query('SELECT 1')
    await sessionStore.onReady()

    console.log('MySQL connected successfully')
    console.log('Session store is ready')

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`EatWise backend listening on port ${PORT}`)
    })

    server.on('error', (error) => {
      console.error('Server failed to start:', error.code)
      process.exit(1)
    })
  } catch (error) {
    console.error(
      'Backend startup failed:',
      error.code || error.message
    )
    process.exit(1)
  }
}

startServer()
import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import pool from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import {
  sessionMiddleware,
  sessionStore,
} from './config/session.js'
import profileRoutes from './routes/profileRoutes.js'
import preferencesRoutes from './routes/preferencesRoutes.js'
import nutritionRoutes from './routes/nutritionRoutes.js'
import recipeRoutes from './routes/recipeRoutes.js'
const app = express()
const PORT = Number(process.env.PORT) || 5000

app.disable('x-powered-by')

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
)

app.use(express.json({ limit: '100kb' }))
app.use(sessionMiddleware)

app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/preferences', preferencesRoutes)
app.use('/api/nutrition', nutritionRoutes)
app.use('/api/recipes', recipeRoutes)

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')

    res.json({
      success: true,
      message: 'EatWise backend is running',
      database: 'Connected',
    })
  } catch (error) {
    console.error('Database health check failed:', error.code)

    res.status(503).json({
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
    Number.isInteger(err.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 500

  const messages = {
    400: 'Invalid request data',
    413: 'Request body is too large',
  }

  res.status(status).json({
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

    const server = app.listen(PORT, () => {
      console.log(`EatWise backend running at http://localhost:${PORT}`)
    })

    server.on('error', (error) => {
      console.error('Server failed to start:', error.code)
      process.exit(1)
    })
  } catch (error) {
    console.error('Backend startup failed:', error.code || error.message)
    process.exit(1)
  }
}

startServer()
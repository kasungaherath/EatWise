import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import pool from './config/db.js'
import authRoutes from './routes/authRoutes.js'

const app = express()
const PORT = Number(process.env.PORT) || 5000

app.disable('x-powered-by')

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  })
)

app.use(express.json({ limit: '100kb' }))
app.use('/api/auth', authRoutes)

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
  console.error(err)

  const status = err.status || 500

  res.status(status).json({
    success: false,
    message:
      status === 400
        ? 'Invalid request data'
        : 'Unable to process your request',
  })
})

async function startServer() {
  try {
    await pool.query('SELECT 1')
    console.log('MySQL connected successfully')

    app.listen(PORT, () => {
      console.log(`EatWise backend running at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('MySQL connection failed:', error.code)
    await pool.end()
    process.exit(1)
  }
}

startServer()
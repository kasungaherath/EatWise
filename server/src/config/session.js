import 'dotenv/config'
import session from 'express-session'
import MySQLStoreFactory from 'express-mysql-session'
import pool from './db.js'

const isProduction = process.env.NODE_ENV === 'production'
const sessionSecret = process.env.SESSION_SECRET

if (!sessionSecret) {
  throw new Error('SESSION_SECRET environment variable is missing')
}

const MySQLStore = MySQLStoreFactory(session)

export const sessionStore = new MySQLStore(
  {
    createDatabaseTable: true,
    expiration: 1000 * 60 * 60 * 24,
  },
  pool
)

export const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
}

export const sessionMiddleware = session({
  name: 'eatwise.sid',
  secret: sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24,
  },
})
import session from 'express-session'
import MySQLStoreFactory from 'express-mysql-session'
import pool from './db.js'
import 'dotenv/config'

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is missing from .env')
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
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
}

export const sessionMiddleware = session({
  name: 'eatwise.sid',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24,
  },
})
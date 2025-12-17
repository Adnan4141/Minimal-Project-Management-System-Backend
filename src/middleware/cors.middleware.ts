import cors from 'cors'
import { config } from '../config/env.js'
import { logger } from '../utils/logger.js'

// Define allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:8000',
  'https://pms.myproject.mhadnan.com',
  config.cors.origin
].filter(Boolean) // Remove undefined values

// CORS origin validation function
const originValidator = function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  try {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true)
    }
    
    // Log incoming origin for debugging
    logger.info(`CORS request from origin: ${origin}`)
    
    // Normalize origin (remove trailing slash, convert to lowercase for comparison)
    const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, '')
    const normalizedAllowed = allowedOrigins.map(o => o?.toLowerCase().replace(/\/$/, ''))
    
    // Check if origin matches any allowed origin
    if (normalizedAllowed.includes(normalizedOrigin)) {
      logger.info(`CORS allowed for origin: ${origin}`)
      callback(null, true)
    } else {
      // Log for debugging
      logger.warn(`CORS blocked origin: ${origin}`)
      logger.warn(`Normalized origin: ${normalizedOrigin}`)
      logger.warn(`Allowed origins: ${allowedOrigins.join(', ')}`)
      logger.warn(`Normalized allowed: ${normalizedAllowed.join(', ')}`)
      callback(new Error('Not allowed by CORS'))
    }
  } catch (error: any) {
    logger.error('CORS origin check error:', error)
    callback(error)
  }
}

// CORS configuration options
const corsOptions = {
  origin: originValidator,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours - cache preflight requests
}


export const corsMiddleware = cors(corsOptions)


export const corsOptionsHandler = cors(corsOptions)


export { allowedOrigins }


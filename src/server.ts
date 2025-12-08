import 'dotenv/config'

import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { config, validateEnv } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'
import { mountRoutes } from './routes/index.js'
import { logger } from './utils/logger.js'
import { initializeEmailService } from './utils/email.js'


validateEnv()
initializeEmailService()

const app = express()
const httpServer = createServer(app)

// CORS must be configured BEFORE helmet to avoid conflicts
const allowedOrigins = [
  'https://pms.myproject.mhadnan.com',
  'http://localhost:3000',
  'http://localhost:8000',
  config.cors.origin
].filter(Boolean) // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
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
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}))

// Configure Helmet to not interfere with CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}))

app.use(morgan('dev'))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use(config.upload.publicUrl || '/uploads', express.static(path.join(__dirname, '..', config.upload.uploadPath || 'uploads')))




const apiRouter = express.Router()
mountRoutes(apiRouter)


apiRouter.get('/', (req, res) => {
  res.json({ message: 'Server is working', version: '1.0.0' })
})




const apiPrefix = config.server.apiPrefix || '/api'

// Handle OPTIONS preflight requests explicitly
app.options('*', cors({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true)
    }
    const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, '')
    const normalizedAllowed = allowedOrigins.map(o => o?.toLowerCase().replace(/\/$/, ''))
    if (normalizedAllowed.includes(normalizedOrigin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}))

app.use(apiPrefix, apiRouter)

app.get(apiPrefix, (req, res) => {
  res.json({ message: 'API Server working ', version: '1.0.0' })
})

app.use(notFoundHandler)
app.use(errorHandler)

const PORT = config.server.port || 4000;

if (!process.env.VERCEL) {
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`)
    logger.info(`📝 Environment: ${config.server.nodeEnv}`)
  }).on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${PORT} is already in use.`)
      logger.error(`   Please stop the process using this port or change the PORT in your .env file`)
      process.exit(1)
    } else {
      logger.error('❌ Server error:', err)
      process.exit(1)
    }
  })
}

export default app

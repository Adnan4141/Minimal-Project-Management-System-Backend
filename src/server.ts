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

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(morgan('dev'))
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    const allowedOrigins = [
      'https://pms.myproject.mhadnan.com',
      'http://localhost:3000',
      'http://localhost:8000',
      config.cors.origin
    ].filter(Boolean) // Remove undefined values
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
}))
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

const apiPrefix = config.server.apiPrefix || '/api'
app.use(apiPrefix, apiRouter)

app.get(apiPrefix, (req, res) => {
  res.json({ message: 'API Server working', version: '1.0.0' })
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

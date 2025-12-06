// Load environment variables FIRST before any other imports
import 'dotenv/config'

import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { config, validateEnv } from './config/env'
import { errorHandler, notFoundHandler } from './middleware/error.middleware'
import { mountRoutes } from './routes'
import { logger } from './utils/logger'
import { initializeEmailService } from './utils/email'


validateEnv()
initializeEmailService()

const app = express()
const httpServer = createServer(app)

// Middleware
app.use(helmet())
app.use(morgan('dev'))
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded files statically
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use(config.upload.publicUrl || '/uploads', express.static(path.join(__dirname, '..', config.upload.uploadPath || 'uploads')))




// Create API router with prefix
const apiRouter = express.Router()
mountRoutes(apiRouter)

// Mount API routes with prefix
const apiPrefix = config.server.apiPrefix || '/api'
app.use(apiPrefix, apiRouter)

// Health check endpoint
app.get(apiPrefix, (req, res) => {
  res.json({ message: 'API Server working', version: '1.0.0' })
})

// Error handling middleware 
app.use(notFoundHandler)
app.use(errorHandler)

const PORT = config.server.port || 5000;

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

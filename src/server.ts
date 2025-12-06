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


validateEnv()

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
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📝 Environment: ${config.server.nodeEnv}`)
}).on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`)
    console.error(`   Please stop the process using this port or change the PORT in your .env file`)
    process.exit(1)
  } else {
    console.error('❌ Server error:', err)
    process.exit(1)
  }
})

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




app.get('/api', (req, res) => {
  res.json({ message: 'API Server working', version: '1.0.0' })
})

// Mount all routes from routes folder
mountRoutes(app)

// Error handling middleware 
app.use(notFoundHandler)
app.use(errorHandler)

const PORT = config.server.port || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📝 Environment: ${config.server.nodeEnv}`)
})

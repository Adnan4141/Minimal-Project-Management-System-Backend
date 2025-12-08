import 'dotenv/config'

import express from 'express'
import { createServer } from 'http'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { config, validateEnv } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'
import { corsMiddleware, corsOptionsHandler } from './middleware/cors.middleware.js'
import { mountRoutes } from './routes/index.js'
import { logger } from './utils/logger.js'
import { initializeEmailService } from './utils/email.js'


validateEnv()
initializeEmailService()

const app = express()
const httpServer = createServer(app)

app.use(corsMiddleware)

app.use(morgan('dev'))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use(config.upload.publicUrl || '/uploads', express.static(path.join(__dirname, '..', config.upload.uploadPath || 'uploads')))

app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running successfully',
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})

const apiRouter = express.Router()
apiRouter.get('/', (req, res) => {
  res.json({ message: 'Server is working', version: '1.0.0' })
})


mountRoutes(apiRouter)



const apiPrefix = config.server.apiPrefix || '/api'

app.options('*', corsOptionsHandler)

app.use(apiPrefix, apiRouter)

app.get(apiPrefix, (req, res) => {
  res.json({ message: 'API Server working ', version: '1.0.0' })
})

app.use(notFoundHandler)
app.use(errorHandler)

const PORT = config.server.port || 5000;

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

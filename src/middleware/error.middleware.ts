import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`)
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  })
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || err.status || 500
  const message = err.message || 'Internal Server Error'

  if (statusCode >= 500) {
    logger.error(`Server Error [${statusCode}]: ${message}`, {
      method: req.method,
      url: req.originalUrl,
      stack: err.stack,
    })
  } else {
    logger.warn(`Client Error [${statusCode}]: ${message}`, {
      method: req.method,
      url: req.originalUrl,
    })
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}


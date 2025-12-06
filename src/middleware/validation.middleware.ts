/**
 * Validation Middleware using Zod
 */

import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { ApiResponse } from '../types'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }))

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: errors,
        })
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
      })
    }
  }
}


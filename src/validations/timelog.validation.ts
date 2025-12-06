import { z } from 'zod'

export const createTimeLogSchema = z.object({
  body: z.object({
    hours: z.number().positive('Hours must be positive'),
    description: z.string().optional(),
    date: z.string().or(z.date()),
    taskId: z.string().uuid('Invalid task ID'),
  }),
})

export const updateTimeLogSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid time log ID'),
  }),
  body: z.object({
    hours: z.number().positive('Hours must be positive').optional(),
    description: z.string().optional(),
    date: z.string().or(z.date()).optional(),
  }),
})

export const getTimeLogSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid time log ID'),
  }),
})


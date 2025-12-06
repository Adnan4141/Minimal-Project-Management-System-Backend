import { z } from 'zod'

export const createSprintSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()),
    description: z.string().optional(),
    projectId: z.string().uuid('Invalid project ID'),
  }),
})

export const updateSprintSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid sprint ID'),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    startDate: z.string().or(z.date()).optional(),
    endDate: z.string().or(z.date()).optional(),
    description: z.string().optional(),
  }),
})

export const getSprintSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid sprint ID'),
  }),
})


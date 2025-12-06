import { z } from 'zod'

export const createProjectSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    client: z.string().min(1, 'Client is required'),
    description: z.string().optional(),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()),
    budget: z.number().positive().optional(),
    status: z.enum(['planned', 'active', 'completed', 'archived']).optional(),
    thumbnail: z.string().url().optional(),
    managerId: z.string().uuid().optional(),
  }),
})

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    client: z.string().min(1).optional(),
    description: z.string().optional(),
    startDate: z.string().or(z.date()).optional(),
    endDate: z.string().or(z.date()).optional(),
    budget: z.number().positive().optional(),
    status: z.enum(['planned', 'active', 'completed', 'archived']).optional(),
    thumbnail: z.string().url().optional(),
    managerId: z.string().uuid().optional(),
  }),
})

export const getProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
})


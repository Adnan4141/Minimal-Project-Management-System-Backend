import { z } from 'zod'

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['Admin', 'Manager', 'Member']),
    department: z.string().optional(),
    skills: z.array(z.string()).optional(),
  }),
})

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    email: z.string().email().optional(),
    name: z.string().min(2).optional(),
    role: z.enum(['Admin', 'Manager', 'Member']).optional(),
    department: z.string().optional(),
    skills: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
})

export const getUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
})

export const inviteUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['Admin', 'Manager', 'Member']),
    department: z.string().optional(),
    skills: z.array(z.string()).optional(),
    sendEmail: z.boolean().optional().default(true),
  }),
})

export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Invite token is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
})


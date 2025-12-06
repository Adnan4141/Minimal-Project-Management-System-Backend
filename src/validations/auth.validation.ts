import { z } from 'zod'

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['Admin', 'Manager', 'Member']).optional(),
    department: z.string().optional(),
    skills: z.array(z.string()).optional(),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
})

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
})

export const oauthSchema = z.object({
  body: z.object({
    provider: z.enum(['google', 'facebook'], {
      errorMap: () => ({ message: 'Provider must be "google" or "facebook"' }),
    }),
    idToken: z.string().optional(),
    accessToken: z.string().optional(),
  }).refine(
    (data) => {
      if (data.provider === 'google' && !data.idToken) {
        return false
      }
      if (data.provider === 'facebook' && !data.accessToken) {
        return false
      }
      return true
    },
    {
      message: 'Token is required for the selected provider',
    }
  ),
})


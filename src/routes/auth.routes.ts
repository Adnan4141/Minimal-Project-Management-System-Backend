import { Router } from 'express'
import {
  register,
  login,
  refreshToken,
  getMe,
  logout,
  oauth,
  acceptInvite,
} from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  oauthSchema,
} from '../validations/auth.validation'
import { acceptInviteSchema } from '../validations/user.validation'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/refresh', validate(refreshTokenSchema), refreshToken)
router.post('/accept-invite', validate(acceptInviteSchema), acceptInvite)
router.get('/me', authenticate, getMe)
router.post('/logout', authenticate, logout)
router.post('/oauth', validate(oauthSchema), oauth)

export default router


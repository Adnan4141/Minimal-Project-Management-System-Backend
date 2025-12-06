import { Router } from 'express'
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getTeamMemberStats,
  inviteUser,
} from '../controllers/user.controller'
import { authenticate, requireAdminOrManager } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import {
  createUserSchema,
  updateUserSchema,
  getUserSchema,
  inviteUserSchema,
} from '../validations/user.validation'

const router = Router()

router.use(authenticate)

router.get('/', requireAdminOrManager, getUsers)
router.get('/:id/stats', validate(getUserSchema), getTeamMemberStats)
router.get('/:id', validate(getUserSchema), getUserById)
router.post('/', requireAdminOrManager, validate(createUserSchema), createUser)
router.post('/invite', requireAdminOrManager, validate(inviteUserSchema), inviteUser)
router.put('/:id', validate(updateUserSchema), updateUser)
router.delete('/:id', validate(getUserSchema), deleteUser)

export default router


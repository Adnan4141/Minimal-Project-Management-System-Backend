import { Router } from 'express'
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getTeamMemberStats,
  inviteUser,
  uploadAvatar,
  activateUser,
  deactivateUser,
} from '../controllers/user.controller'
import { authenticate, requireAdminOrManager } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import {
  createUserSchema,
  updateUserSchema,
  getUserSchema,
  inviteUserSchema,
} from '../validations/user.validation'
import { uploadSingle } from '../middleware/upload.middleware'

const router = Router()

router.use(authenticate)

router.get('/', requireAdminOrManager, getUsers)
router.get('/:id/stats', validate(getUserSchema), getTeamMemberStats)
router.get('/:id', validate(getUserSchema), getUserById)
router.post('/', requireAdminOrManager, validate(createUserSchema), createUser)
router.post('/invite', requireAdminOrManager, validate(inviteUserSchema), inviteUser)
router.put('/:id', validate(updateUserSchema), updateUser)
router.post('/avatar', uploadSingle, uploadAvatar)
router.post('/:id/activate', validate(getUserSchema), activateUser)
router.post('/:id/deactivate', validate(getUserSchema), deactivateUser)
router.delete('/:id', validate(getUserSchema), deleteUser)

export default router


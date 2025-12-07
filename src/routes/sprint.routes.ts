import { Router, type Router as ExpressRouter } from 'express'
import {
  getSprints,
  getSprintById,
  createSprint,
  updateSprint,
  deleteSprint,
} from '../controllers/sprint.controller'
import { authenticate, requireAdminOrManager } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import {
  createSprintSchema,
  updateSprintSchema,
  getSprintSchema,
} from '../validations/sprint.validation'

const router: ExpressRouter = Router()

router.use(authenticate)

router.get('/', getSprints)

router.get('/:id', validate(getSprintSchema), getSprintById)

router.post('/', requireAdminOrManager, validate(createSprintSchema), createSprint)

router.put('/:id', requireAdminOrManager, validate(updateSprintSchema), updateSprint)

router.delete('/:id', requireAdminOrManager, validate(getSprintSchema), deleteSprint)

export default router


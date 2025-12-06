/**
 * Sprint Routes
 */

import { Router } from 'express'
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

const router = Router()

// All routes require authentication
router.use(authenticate)

// Get sprints (filtered by projectId query param)
router.get('/', getSprints)

// Get sprint by ID
router.get('/:id', validate(getSprintSchema), getSprintById)

// Create sprint (Admin/Manager only)
router.post('/', requireAdminOrManager, validate(createSprintSchema), createSprint)

// Update sprint (Admin/Manager only)
router.put('/:id', requireAdminOrManager, validate(updateSprintSchema), updateSprint)

// Delete sprint (Admin/Manager only)
router.delete('/:id', requireAdminOrManager, validate(getSprintSchema), deleteSprint)

export default router


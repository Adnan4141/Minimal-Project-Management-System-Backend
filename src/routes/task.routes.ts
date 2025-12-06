/**
 * Task Routes
 */

import { Router } from 'express'
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/task.controller'
import { authenticate, requireAdminOrManager } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import {
  createTaskSchema,
  updateTaskSchema,
  getTaskSchema,
} from '../validations/task.validation'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Get all tasks (with filters)
router.get('/', getTasks)

// Get task by ID
router.get('/:id', validate(getTaskSchema), getTaskById)

// Create task (Admin/Manager only)
router.post('/', requireAdminOrManager, validate(createTaskSchema), createTask)

// Update task
router.put('/:id', validate(updateTaskSchema), updateTask)

// Delete task (Admin/Manager only)
router.delete('/:id', requireAdminOrManager, validate(getTaskSchema), deleteTask)

export default router


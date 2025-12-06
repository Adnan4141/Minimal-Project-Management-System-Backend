/**
 * Project Routes
 */

import { Router } from 'express'
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/project.controller'
import { authenticate, requireAdminOrManager } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import {
  createProjectSchema,
  updateProjectSchema,
  getProjectSchema,
} from '../validations/project.validation'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Get all projects
router.get('/', getProjects)

// Get project by ID
router.get('/:id', validate(getProjectSchema), getProjectById)

// Create project (Admin/Manager only)
router.post('/', requireAdminOrManager, validate(createProjectSchema), createProject)

// Update project
router.put('/:id', validate(updateProjectSchema), updateProject)

// Delete project (Admin/Manager only)
router.delete('/:id', requireAdminOrManager, validate(getProjectSchema), deleteProject)

export default router


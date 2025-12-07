import { Router, type Router as ExpressRouter } from 'express'
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

const router: ExpressRouter = Router()

router.use(authenticate)

router.get('/', getProjects)

router.get('/:id', validate(getProjectSchema), getProjectById)

router.post('/', requireAdminOrManager, validate(createProjectSchema), createProject)

router.put('/:id', validate(updateProjectSchema), updateProject)

router.delete('/:id', requireAdminOrManager, validate(getProjectSchema), deleteProject)

export default router


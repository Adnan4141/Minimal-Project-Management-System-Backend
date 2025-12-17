import { Router, type Router as ExpressRouter } from 'express'
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  submitAssignedTask,
} from '../controllers/task.controller'
import { authenticate, requireAdminOrManager } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import {
  createTaskSchema,
  updateTaskSchema,
  getTaskSchema,
} from '../validations/task.validation'

const router: ExpressRouter = Router()

router.use(authenticate)

router.get('/', getTasks)

router.get('/:id', validate(getTaskSchema), getTaskById)

router.post('/', requireAdminOrManager, validate(createTaskSchema), createTask)

router.put('/:id', validate(updateTaskSchema), updateTask)

router.put('/submit/:id', validate(updateTaskSchema), submitAssignedTask)

router.delete('/:id', requireAdminOrManager, validate(getTaskSchema), deleteTask)

export default router


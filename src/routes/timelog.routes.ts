import { Router } from 'express'
import {
  getTaskTimeLogs,
  getUserTimeLogs,
  createTimeLog,
  updateTimeLog,
  deleteTimeLog,
} from '../controllers/timelog.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import {
  createTimeLogSchema,
  updateTimeLogSchema,
  getTimeLogSchema,
} from '../validations/timelog.validation'

const router = Router()

router.use(authenticate)

router.get('/task/:taskId', getTaskTimeLogs)
router.get('/user', getUserTimeLogs)
router.post('/', validate(createTimeLogSchema), createTimeLog)
router.put('/:id', validate(updateTimeLogSchema), updateTimeLog)
router.delete('/:id', validate(getTimeLogSchema), deleteTimeLog)

export default router


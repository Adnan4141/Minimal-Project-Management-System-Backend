import { Router } from 'express'
import {
  getTaskComments,
  createComment,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import {
  createCommentSchema,
  getCommentSchema,
} from '../validations/comment.validation'

const router = Router()

router.use(authenticate)

router.get('/task/:taskId', getTaskComments)

router.post('/', validate(createCommentSchema), createComment)

router.put('/:id', validate(getCommentSchema), updateComment)

router.delete('/:id', validate(getCommentSchema), deleteComment)

export default router


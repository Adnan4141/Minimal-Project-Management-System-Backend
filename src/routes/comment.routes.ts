/**
 * Comment Routes
 */

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

// All routes require authentication
router.use(authenticate)

// Get comments for a task
router.get('/task/:taskId', getTaskComments)

// Create comment
router.post('/', validate(createCommentSchema), createComment)

// Update comment
router.put('/:id', validate(getCommentSchema), updateComment)

// Delete comment
router.delete('/:id', validate(getCommentSchema), deleteComment)

export default router


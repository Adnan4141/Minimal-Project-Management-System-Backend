/**
 * Attachment Routes
 */

import { Router } from 'express'
import {
  getTaskAttachments,
  uploadAttachment,
  createAttachment,
  deleteAttachment,
} from '../controllers/attachment.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import { getAttachmentSchema, getTaskAttachmentsSchema } from '../validations/attachment.validation'
import { uploadSingle } from '../middleware/upload.middleware'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Get attachments for a task
router.get('/task/:taskId', validate(getTaskAttachmentsSchema), getTaskAttachments)

// Upload file and create attachment
router.post('/upload', uploadSingle, uploadAttachment)

// Create attachment (for external URLs)
router.post('/', createAttachment)

// Delete attachment
router.delete('/:id', validate(getAttachmentSchema), deleteAttachment)

export default router


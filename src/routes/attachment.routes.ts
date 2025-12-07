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

router.use(authenticate)

router.get('/task/:taskId', validate(getTaskAttachmentsSchema), getTaskAttachments)

router.post('/upload', uploadSingle, uploadAttachment)

router.post('/', createAttachment)

router.delete('/:id', validate(getAttachmentSchema), deleteAttachment)

export default router


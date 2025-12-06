/**
 * File Upload Middleware
 * Handles file uploads using multer
 */

import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { config } from '../config/env'

// Ensure upload directory exists
const uploadDir = config.upload.uploadPath
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
  },
})

// File filter for allowed types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = config.upload.allowedMimeTypes || ['image/*', 'application/pdf']
  
  const isAllowed = allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      const baseType = type.split('/')[0]
      return file.mimetype.startsWith(baseType + '/')
    }
    return file.mimetype === type
  })

  if (isAllowed) {
    cb(null, true)
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`))
  }
}

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
})

// Single file upload middleware
export const uploadSingle = upload.single('file')

// Multiple files upload middleware
export const uploadMultiple = upload.array('files', 10)



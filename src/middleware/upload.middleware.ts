import multer from 'multer'
import { config } from '../config/env'

const storage = multer.memoryStorage()

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

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
})

export const uploadSingle = upload.single('file')

export const uploadMultiple = upload.array('files', 10)



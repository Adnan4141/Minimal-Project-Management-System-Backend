import { z } from 'zod'

export const createAttachmentSchema = z.object({
  body: z.object({
    taskId: z.string().uuid('Invalid task ID'),
    filename: z.string().min(1, 'Filename is required'),
    fileUrl: z.string().url('Invalid file URL'),
    fileType: z.string().min(1, 'File type is required'),
    fileSize: z.string().or(z.number()).refine(
      (val) => {
        const num = typeof val === 'string' ? parseInt(val, 10) : val
        return !isNaN(num) && num > 0
      },
      { message: 'File size must be a positive number' }
    ),
  }),
})

export const getAttachmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attachment ID'),
  }),
})

export const getTaskAttachmentsSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
})



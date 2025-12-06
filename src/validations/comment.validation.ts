import { z } from 'zod'

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Comment content is required'),
    taskId: z.string().uuid('Invalid task ID'),
    parentId: z.string().uuid().optional(),
  }),
})

export const getCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid comment ID'),
  }),
})


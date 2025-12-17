import { z } from 'zod'

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    estimate: z.number().positive().optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    status: z.enum(['ToDo', 'InProgress', 'Review', 'Done']).optional(),
    dueDate: z.string().or(z.date()).optional(),
    sprintId: z.string().uuid('Invalid sprint ID'),
    assigneeIds: z.array(z.string().uuid()).optional(),
    parentTaskId: z.string().uuid().optional(),
  }),
})


export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    estimate: z.number().positive().optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    status: z.enum(['ToDo', 'InProgress', 'Review', 'Done']).optional(),
    dueDate: z.string().or(z.date()).optional(),
    assigneeIds: z.array(z.string().uuid()).optional(),
    parentTaskId: z.string().uuid().optional(),
  }),
})

export const getTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
})


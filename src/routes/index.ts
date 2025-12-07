import { Router } from 'express'
import authRoutes from './auth.routes.js'
import userRoutes from './user.routes.js'
import projectRoutes from './project.routes.js'
import sprintRoutes from './sprint.routes.js'
import taskRoutes from './task.routes.js'
import commentRoutes from './comment.routes.js'
import timelogRoutes from './timelog.routes.js'
import reportsRoutes from './reports.routes.js'
import attachmentRoutes from './attachment.routes.js'

export function mountRoutes(router: Router): void {
  router.use('/auth', authRoutes)
  router.use('/users', userRoutes)
  router.use('/projects', projectRoutes)
  router.use('/sprints', sprintRoutes)
  router.use('/tasks', taskRoutes)
  router.use('/comments', commentRoutes)
  router.use('/timelogs', timelogRoutes)
  router.use('/reports', reportsRoutes)
  router.use('/attachments', attachmentRoutes)
}

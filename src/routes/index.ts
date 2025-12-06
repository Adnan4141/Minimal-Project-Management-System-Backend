/**
 * Routes Index - Central management for all API routes
 */

import { Router } from 'express'
import authRoutes from './auth.routes'
import userRoutes from './user.routes'
import projectRoutes from './project.routes'
import sprintRoutes from './sprint.routes'
import taskRoutes from './task.routes'
import commentRoutes from './comment.routes'
import timelogRoutes from './timelog.routes'
import reportsRoutes from './reports.routes'
import attachmentRoutes from './attachment.routes'

export function mountRoutes(router: Router): void {
  // Authentication routes (public)
  router.use('/auth', authRoutes)

  // Protected routes
  router.use('/users', userRoutes)
  router.use('/projects', projectRoutes)
  router.use('/sprints', sprintRoutes)
  router.use('/tasks', taskRoutes)
  router.use('/comments', commentRoutes)
  router.use('/timelogs', timelogRoutes)
  router.use('/reports', reportsRoutes)
  router.use('/attachments', attachmentRoutes)
}

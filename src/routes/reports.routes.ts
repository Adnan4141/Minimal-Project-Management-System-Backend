/**
 * Reports Routes
 */

import { Router } from 'express'
import {
  getProjectProgress,
  getUserTimeSummary,
  getDashboardStats,
} from '../controllers/reports.controller'
import { authenticate, requireAdminOrManager } from '../middleware/auth.middleware'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Get project progress
router.get('/project/:projectId/progress', getProjectProgress)

// Get user time summary
router.get('/user/time-summary', getUserTimeSummary)

// Get dashboard stats (Admin/Manager only)
router.get('/dashboard', requireAdminOrManager, getDashboardStats)

export default router


import { Router, type Router as ExpressRouter } from 'express'
import {
  getProjectProgress,
  getUserTimeSummary,
  getDashboardStats,
} from '../controllers/reports.controller'
import { authenticate, requireAdminOrManager } from '../middleware/auth.middleware'

const router: ExpressRouter = Router()

router.use(authenticate)

router.get('/project/:projectId/progress', getProjectProgress)

router.get('/user/time-summary', getUserTimeSummary)

router.get('/dashboard', requireAdminOrManager, getDashboardStats)

export default router


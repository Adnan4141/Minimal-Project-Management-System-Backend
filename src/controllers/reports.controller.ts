/**
 * Reports Controller
 */

import { Response } from 'express'
import { AuthRequest, ApiResponse, ProjectProgress, UserTimeSummary } from '../types'
import { prisma } from '../prisma/client'
import { logger } from '../utils/logger'

/**
 * Get project progress report
 */
export async function getProjectProgress(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { projectId } = req.params

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      })
    }

    // Get all tasks for the project
    const tasks = await prisma.task.findMany({
      where: {
        sprint: {
          projectId,
        },
      },
      select: {
        id: true,
        status: true,
        estimate: true,
      },
    })

    // Get time logs for all tasks in the project
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        task: {
          sprint: {
            projectId,
          },
        },
      },
      select: {
        hours: true,
      },
    })

    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === 'Done').length
    const inProgressTasks = tasks.filter((t) => t.status === 'InProgress').length
    const tasksRemaining = totalTasks - completedTasks
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    const timeLogged = timeLogs.reduce((sum, log) => sum + Number(log.hours), 0)

    const progress: ProjectProgress = {
      projectId,
      totalTasks,
      completedTasks,
      inProgressTasks,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      timeLogged: Math.round(timeLogged * 100) / 100,
      tasksRemaining,
    }

    return res.json({
      success: true,
      data: progress,
    })
  } catch (error: any) {
    logger.error('Failed to fetch project progress', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch project progress',
    })
  }
}

/**
 * Get user time summary
 */
export async function getUserTimeSummary(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const userId = req.query.userId as string | undefined
    const targetUserId = userId || req.user?.id
    const projectId = req.query.projectId as string | undefined

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      })
    }

    // Users can only see their own summary unless Admin/Manager
    if (targetUserId !== req.user?.id && req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    const where: any = {
      userId: targetUserId,
    }

    if (projectId) {
      where.task = {
        sprint: {
          projectId,
        },
      }
    }

    const timeLogs = await prisma.timeLog.findMany({
      where,
      include: {
        task: {
          include: {
            sprint: {
              include: {
                project: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    const totalHours = timeLogs.reduce((sum, log) => sum + Number(log.hours), 0)
    const uniqueTasks = new Set(timeLogs.map((log) => log.taskId))
    const tasksWorked = uniqueTasks.size

    // Group by project
    const projectHours: Record<string, number> = {}
    timeLogs.forEach((log) => {
      const projId = log.task.sprint.project.id
      if (!projectHours[projId]) {
        projectHours[projId] = 0
      }
      projectHours[projId] += Number(log.hours)
    })

    const projects = Object.entries(projectHours).map(([projectId, hours]) => ({
      projectId,
      hours: Math.round(hours * 100) / 100,
    }))

    const summary: UserTimeSummary = {
      userId: targetUserId,
      totalHours: Math.round(totalHours * 100) / 100,
      tasksWorked,
      projects,
    }

    return res.json({
      success: true,
      data: summary,
    })
  } catch (error: any) {
    logger.error('Failed to fetch time summary', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch time summary',
    })
  }
}

/**
 * Get dashboard stats (Admin/Manager only)
 */
export async function getDashboardStats(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const [totalProjects, totalUsers, totalTasks, totalTimeLogged] = await Promise.all([
      prisma.project.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.task.count(),
      prisma.timeLog.aggregate({
        _sum: {
          hours: true,
        },
      }),
    ])

    const activeProjects = await prisma.project.count({
      where: { status: 'active' },
    })

    const completedTasks = await prisma.task.count({
      where: { status: 'Done' },
    })

    const inProgressTasks = await prisma.task.count({
      where: { status: 'InProgress' },
    })

    return res.json({
      success: true,
      data: {
        projects: {
          total: totalProjects,
          active: activeProjects,
        },
        users: {
          total: totalUsers,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
        },
        timeLogged: {
          total: Math.round((Number(totalTimeLogged._sum.hours) || 0) * 100) / 100,
        },
      },
    })
  } catch (error: any) {
    logger.error('Failed to fetch dashboard stats', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch dashboard stats',
    })
  }
}


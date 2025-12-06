/**
 * Time Log Controller
 */

import { Response } from 'express'
import { AuthRequest, ApiResponse, CreateTimeLogData } from '../types'
import { prisma } from '../prisma/client'
import { logger } from '../utils/logger'

/**
 * Get time logs for a task
 */
export async function getTaskTimeLogs(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { taskId } = req.params

    const timeLogs = await prisma.timeLog.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    // Calculate total hours
    const totalHours = timeLogs.reduce((sum, log) => sum + Number(log.hours), 0)

    return res.json({
      success: true,
      data: {
        timeLogs,
        totalHours,
      },
    })
  } catch (error: any) {
    logger.error('Failed to fetch time logs', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch time logs',
    })
  }
}

/**
 * Get time logs for a user
 */
export async function getUserTimeLogs(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const userId = req.query.userId as string | undefined
    const targetUserId = userId || req.user?.id

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      })
    }

    // Users can only see their own logs unless Admin/Manager
    if (targetUserId !== req.user?.id && req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    const timeLogs = await prisma.timeLog.findMany({
      where: { userId: targetUserId },
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
      orderBy: { date: 'desc' },
    })

    const totalHours = timeLogs.reduce((sum, log) => sum + Number(log.hours), 0)

    return res.json({
      success: true,
      data: {
        timeLogs,
        totalHours,
      },
    })
  } catch (error: any) {
    logger.error('Failed to fetch time logs', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch time logs',
    })
  }
}

/**
 * Create time log
 */
export async function createTimeLog(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const data: CreateTimeLogData = req.body

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
    })

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      })
    }

    // Check if user is assigned to the task (unless Admin/Manager)
    if (req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
      const assignment = await prisma.taskAssignment.findFirst({
        where: {
          taskId: data.taskId,
          userId: req.user!.id,
        },
      })

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'You can only log time for assigned tasks',
        })
      }
    }

    const timeLog = await prisma.timeLog.create({
      data: {
        hours: parseFloat(data.hours.toString()),
        description: data.description,
        date: new Date(data.date),
        taskId: data.taskId,
        userId: req.user!.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    // Create activity log
    await prisma.activityLog.create({
      data: {
        type: 'time_logged',
        description: `${data.hours} hours logged`,
        taskId: data.taskId,
        userId: req.user!.id,
        metadata: {
          hours: data.hours,
        },
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Time log created successfully',
      data: timeLog,
    })
  } catch (error: any) {
    logger.error('Failed to create time log', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create time log',
    })
  }
}

/**
 * Update time log
 */
export async function updateTimeLog(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params
    const { hours, description, date } = req.body

    const timeLog = await prisma.timeLog.findUnique({
      where: { id },
    })

    if (!timeLog) {
      return res.status(404).json({
        success: false,
        message: 'Time log not found',
      })
    }

    // Only the log owner or Admin/Manager can update
    if (timeLog.userId !== req.user?.id && req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    const updateData: any = {}
    if (hours !== undefined) updateData.hours = parseFloat(hours.toString())
    if (description !== undefined) updateData.description = description
    if (date) updateData.date = new Date(date)

    const updatedTimeLog = await prisma.timeLog.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    return res.json({
      success: true,
      message: 'Time log updated successfully',
      data: updatedTimeLog,
    })
  } catch (error: any) {
    logger.error('Failed to update time log', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update time log',
    })
  }
}

/**
 * Delete time log
 */
export async function deleteTimeLog(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const timeLog = await prisma.timeLog.findUnique({
      where: { id },
    })

    if (!timeLog) {
      return res.status(404).json({
        success: false,
        message: 'Time log not found',
      })
    }

    // Only the log owner or Admin/Manager can delete
    if (timeLog.userId !== req.user?.id && req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    await prisma.timeLog.delete({
      where: { id },
    })

    return res.json({
      success: true,
      message: 'Time log deleted successfully',
    })
  } catch (error: any) {
    logger.error('Failed to delete time log', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete time log',
    })
  }
}


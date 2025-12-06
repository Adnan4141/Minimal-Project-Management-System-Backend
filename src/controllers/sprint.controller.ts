/**
 * Sprint Controller
 */

import { Response } from 'express'
import { AuthRequest, ApiResponse, CreateSprintData, UpdateSprintData } from '../types'
import { prisma } from '../prisma/client'
import { logger } from '../utils/logger'

/**
 * Get all sprints for a project
 */
export async function getSprints(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const projectId = req.query.projectId as string | undefined

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required',
      })
    }

    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          include: {
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { sprintNumber: 'asc' },
    })

    // Calculate stats for each sprint
    const sprintsWithStats = sprints.map((sprint) => {
      const totalTasks = sprint.tasks.length
      const completedTasks = sprint.tasks.filter((t) => t.status === 'Done').length
      const inProgressTasks = sprint.tasks.filter((t) => t.status === 'InProgress').length

      return {
        ...sprint,
        stats: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          progressPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        },
      }
    })

    return res.json({
      success: true,
      data: sprintsWithStats,
    })
  } catch (error: any) {
    logger.error('Failed to fetch sprints', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch sprints',
    })
  }
}

/**
 * Get sprint by ID
 */
export async function getSprintById(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            client: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          include: {
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: 'Sprint not found',
      })
    }

    return res.json({
      success: true,
      data: sprint,
    })
  } catch (error: any) {
    logger.error('Failed to fetch sprint', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch sprint',
    })
  }
}

/**
 * Create sprint
 */
export async function createSprint(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const data: CreateSprintData = req.body

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      })
    }

    // Get the next sprint number for this project
    const lastSprint = await prisma.sprint.findFirst({
      where: { projectId: data.projectId },
      orderBy: { sprintNumber: 'desc' },
    })

    const sprintNumber = lastSprint ? lastSprint.sprintNumber + 1 : 1

    const sprint = await prisma.sprint.create({
      data: {
        title: data.title,
        sprintNumber,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        description: data.description,
        projectId: data.projectId,
        creatorId: req.user!.id,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Sprint created successfully',
      data: sprint,
    })
  } catch (error: any) {
    logger.error('Failed to create sprint', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create sprint',
    })
  }
}

/**
 * Update sprint
 */
export async function updateSprint(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params
    const data: Partial<UpdateSprintData> = req.body

    const existingSprint = await prisma.sprint.findUnique({
      where: { id },
    })

    if (!existingSprint) {
      return res.status(404).json({
        success: false,
        message: 'Sprint not found',
      })
    }

    const updateData: any = {}
    if (data.title) updateData.title = data.title
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)
    if (data.description !== undefined) updateData.description = data.description

    const sprint = await prisma.sprint.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return res.json({
      success: true,
      message: 'Sprint updated successfully',
      data: sprint,
    })
  } catch (error: any) {
    logger.error('Failed to update sprint', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update sprint',
    })
  }
}

/**
 * Delete sprint
 */
export async function deleteSprint(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const sprint = await prisma.sprint.findUnique({
      where: { id },
    })

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: 'Sprint not found',
      })
    }

    await prisma.sprint.delete({
      where: { id },
    })

    return res.json({
      success: true,
      message: 'Sprint deleted successfully',
    })
  } catch (error: any) {
    logger.error('Failed to delete sprint', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete sprint',
    })
  }
}


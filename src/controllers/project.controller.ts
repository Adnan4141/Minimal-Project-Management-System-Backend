import { Response } from 'express'
import { AuthRequest, ApiResponse, CreateProjectData, UpdateProjectData } from '../types'
import { prisma } from '../prisma/client'
import { ProjectStatus } from '../../generated/prisma/enums.js'
import { logger } from '../utils/logger'

export async function getProjects(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const status = req.query.status as ProjectStatus | undefined
    const client = req.query.client as string | undefined
    const search = req.query.search as string | undefined
    const skip = (page - 1) * limit

    const where: any = {}
    if (status) where.status = status
    if (client) where.client = { contains: client, mode: 'insensitive' }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { client: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (req.user?.role !== 'Admin') {
      where.OR = [
        { creatorId: req.user?.id },
        { managerId: req.user?.id },
        {
          sprints: {
            some: {
              tasks: {
                some: {
                  assignees: {
                    some: {
                      userId: req.user?.id,
                    },
                  },
                },
              },
            },
          },
        },
      ]
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          sprints: {
            select: {
              id: true,
              title: true,
              sprintNumber: true,
            },
          },
          _count: {
            select: {
              sprints: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ])

    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const tasks = await prisma.task.findMany({
          where: {
            sprint: {
              projectId: project.id,
            },
          },
          select: {
            status: true,
          },
        })

        const totalTasks = tasks.length
        const completedTasks = tasks.filter((t) => t.status === 'Done').length
        const inProgressTasks = tasks.filter((t) => t.status === 'InProgress').length
        const tasksRemaining = totalTasks - completedTasks - inProgressTasks

        return {
          ...project,
          stats: {
            totalTasks,
            completedTasks,
            inProgressTasks,
            tasksRemaining,
            progressPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
          },
        }
      })
    )

    return res.json({
      success: true,
      data: {
        projects: projectsWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: any) {
    logger.error('Failed to fetch projects', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch projects',
    })
  }
}

export async function getProjectById(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sprints: {
          include: {
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
          },
          orderBy: { sprintNumber: 'asc' },
        },
      },
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      })
    }

    if (req.user?.role !== 'Admin') {
      const hasAccess =
        project.creatorId === req.user?.id ||
        project.managerId === req.user?.id ||
        project.sprints.some((sprint) =>
          sprint.tasks.some((task) =>
            task.assignees.some((assignment) => assignment.userId === req.user?.id)
          )
        )

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        })
      }
    }

    const allTasks = project.sprints.flatMap((sprint) => sprint.tasks)
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter((t) => t.status === 'Done').length
    const inProgressTasks = allTasks.filter((t) => t.status === 'InProgress').length
    const tasksRemaining = totalTasks - completedTasks - inProgressTasks

    return res.json({
      success: true,
      data: {
        ...project,
        stats: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          tasksRemaining,
          progressPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        },
      },
    })
  } catch (error: any) {
    logger.error('Failed to fetch project', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch project',
    })
  }
}

export async function createProject(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const data: CreateProjectData = req.body

    const project = await prisma.project.create({
      data: {
        title: data.title,
        client: data.client,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        budget: data.budget ? parseFloat(data.budget.toString()) : null,
        status: data.status || ProjectStatus.planned,
        thumbnail: data.thumbnail,
        creatorId: req.user!.id,
        managerId: data.managerId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manager: {
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
      message: 'Project created successfully',
      data: project,
    })
  } catch (error: any) {
    logger.error('Failed to create project', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create project',
    })
  }
}

export async function updateProject(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params
    const data: Partial<UpdateProjectData> = req.body

    const existingProject = await prisma.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      })
    }

    if (
      req.user?.role !== 'Admin' &&
      existingProject.creatorId !== req.user?.id &&
      existingProject.managerId !== req.user?.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    const updateData: any = {}
    if (data.title) updateData.title = data.title
    if (data.client) updateData.client = data.client
    if (data.description !== undefined) updateData.description = data.description
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)
    if (data.budget !== undefined) updateData.budget = data.budget ? parseFloat(data.budget.toString()) : null
    if (data.status) updateData.status = data.status
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail
    if (data.managerId !== undefined) updateData.managerId = data.managerId

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manager: {
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
      message: 'Project updated successfully',
      data: project,
    })
  } catch (error: any) {
    logger.error('Failed to update project', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update project',
    })
  }
}

export async function deleteProject(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      })
    }

    if (req.user?.role !== 'Admin' && project.creatorId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    await prisma.project.delete({
      where: { id },
    })

    return res.json({
      success: true,
      message: 'Project deleted successfully',
    })
  } catch (error: any) {
    logger.error('Failed to delete project', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete project',
    })
  }
}


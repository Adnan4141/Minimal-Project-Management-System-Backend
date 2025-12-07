
import { Response } from 'express'
import { AuthRequest, ApiResponse, CreateTaskData, UpdateTaskData, TaskFilters } from '../types'
import { prisma } from '../prisma/client'
import { TaskStatus, TaskPriority } from '../../generated/prisma/enums.js'
import { logger } from '../utils/logger'

export async function getTasks(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    const filters: TaskFilters = {
      projectId: req.query.projectId as string | undefined,
      sprintId: req.query.sprintId as string | undefined,
      assigneeId: req.query.assigneeId as string | undefined,
      status: req.query.status as TaskStatus | undefined,
      priority: req.query.priority as TaskPriority | undefined,
      search: req.query.search as string | undefined,
    }

    const where: any = {}

    if (filters.sprintId) {
      where.sprintId = filters.sprintId
    }

    if (filters.projectId) {
      where.sprint = {
        projectId: filters.projectId,
      }
    }

    if (filters.assigneeId) {
      where.assignees = {
        some: {
          userId: filters.assigneeId,
        },
      }
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.priority) {
      where.priority = filters.priority
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ]
    }


    if (req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
      where.OR = [
        { creatorId: req.user?.id },
        {
          assignees: {
            some: {
              userId: req.user?.id,
            },
          },
        },
      ]
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        include: {
          sprint: {
            select: {
              id: true,
              title: true,
              sprintNumber: true,
              project: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          parentTask: {
            select: {
              id: true,
              title: true,
            },
          },
          subtasks: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          _count: {
            select: {
              comments: true,
              attachments: true,
              timeLogs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where }),
    ])

    return res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: any) {
    logger.error('Failed to fetch tasks', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch tasks',
    })
  }
}

export async function getTaskById(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        sprint: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                client: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        parentTask: {
          select: {
            id: true,
            title: true,
          },
        },
        subtasks: {
          include: {
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          orderBy: { uploadedAt: 'desc' },
        },
        timeLogs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { date: 'desc' },
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      })
    }


    if (req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
      const hasAccess =
        task.creatorId === req.user?.id ||
        task.assignees.some((assignment) => assignment.userId === req.user?.id)

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        })
      }
    }

    return res.json({
      success: true,
      data: task,
    })
  } catch (error: any) {
    logger.error('Failed to fetch task', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch task',
    })
  }
}

export async function createTask(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const data: CreateTaskData = req.body


    const sprint = await prisma.sprint.findUnique({
      where: { id: data.sprintId },
    })

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: 'Sprint not found',
      })
    }


    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        estimate: data.estimate ? parseFloat(data.estimate.toString()) : null,
        priority: data.priority || TaskPriority.Medium,
        status: data.status || TaskStatus.ToDo,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        sprintId: data.sprintId,
        creatorId: req.user!.id,
        parentTaskId: data.parentTaskId,
      },
      include: {
        sprint: {
          select: {
            id: true,
            title: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })


    if (data.assigneeIds && data.assigneeIds.length > 0) {
      if (req.user?.role === 'Manager') {
        const assigneeUsers = await prisma.user.findMany({
          where: { id: { in: data.assigneeIds } },
          select: { id: true, role: true },
        })

        const hasAdmin = assigneeUsers.some((user) => user.role === 'Admin')
        if (hasAdmin) {
          await prisma.task.delete({ where: { id: task.id } })
          return res.status(403).json({
            success: false,
            message: 'Managers cannot assign tasks to Administrators',
          })
        }
      }

      await prisma.taskAssignment.createMany({
        data: data.assigneeIds.map((userId) => ({
          taskId: task.id,
          userId,
        })),
      })
    }


    await prisma.activityLog.create({
      data: {
        type: 'created',
        description: `Task "${task.title}" created`,
        taskId: task.id,
        userId: req.user!.id,
      },
    })


    const fullTask = await prisma.task.findUnique({
      where: { id: task.id },
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
    })

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: fullTask,
    })
  } catch (error: any) {
    logger.error('Failed to create task', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create task',
    })
  }
}

export async function updateTask(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params
    const data: Partial<UpdateTaskData> = req.body

    const existingTask = await prisma.task.findUnique({
      where: { id },
    })

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      })
    }


    if (req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
      const hasAccess =
        existingTask.creatorId === req.user?.id ||
        (await prisma.taskAssignment.findFirst({
          where: {
            taskId: id,
            userId: req.user?.id,
          },
        }))

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        })
      }
    }

    const updateData: any = {}
    if (data.title) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.estimate !== undefined) updateData.estimate = data.estimate ? parseFloat(data.estimate.toString()) : null
    if (data.priority) updateData.priority = data.priority
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null


    if (data.status && data.status !== existingTask.status) {

      if (data.status === 'Done' && existingTask.status === 'Review') {
        if (req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
          return res.status(403).json({
            success: false,
            message: 'Only Managers or Admins can approve tasks in Review status to mark them as Done',
          })
        }
      }

      else if (data.status === 'Done' && existingTask.status !== 'Review') {
        if (req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
          return res.status(400).json({
            success: false,
            message: 'Task must be in Review status before it can be marked as Done. Please move it to Review first.',
          })
        }
      }

      updateData.status = data.status


      await prisma.activityLog.create({
        data: {
          type: 'status_changed',
          description: `Task status changed from ${existingTask.status} to ${data.status}`,
          taskId: id,
          userId: req.user!.id,
          metadata: {
            oldStatus: existingTask.status,
            newStatus: data.status,
          },
        },
      })
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
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
    })


    if (data.assigneeIds) {
      if (req.user?.role === 'Manager') {
        const assigneeUsers = await prisma.user.findMany({
          where: { id: { in: data.assigneeIds } },
          select: { id: true, role: true },
        })

        const hasAdmin = assigneeUsers.some((user) => user.role === 'Admin')
        if (hasAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Managers cannot assign tasks to Administrators',
          })
        }
      }

      await prisma.taskAssignment.deleteMany({
        where: { taskId: id },
      })


      if (data.assigneeIds.length > 0) {
        await prisma.taskAssignment.createMany({
          data: data.assigneeIds.map((userId) => ({
            taskId: id,
            userId,
          })),
        })


        await prisma.activityLog.create({
          data: {
            type: 'assigned',
            description: 'Task assignees updated',
            taskId: id,
            userId: req.user!.id,
          },
        })
      }
    }

    return res.json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    })
  } catch (error: any) {
    logger.error('Failed to update task', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update task',
    })
  }
}

export async function deleteTask(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const task = await prisma.task.findUnique({
      where: { id },
    })

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      })
    }


    if (
      req.user?.role !== 'Admin' &&
      req.user?.role !== 'Manager' &&
      task.creatorId !== req.user?.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    await prisma.task.delete({
      where: { id },
    })

    return res.json({
      success: true,
      message: 'Task deleted successfully',
    })
  } catch (error: any) {
    logger.error('Failed to delete task', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete task',
    })
  }
}


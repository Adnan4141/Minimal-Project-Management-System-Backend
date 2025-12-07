import { Response } from 'express'
import { AuthRequest, ApiResponse, UpdateUserData } from '../types'
import { prisma } from '../prisma/client'
import { logger } from '../utils/logger'
import { hashPassword } from '../utils/password'
import { uploadToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from '../utils/cloudinary'
import crypto from 'crypto'

export async function getUsers(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const skip = (page - 1) * limit
    const search = req.query.search as string | undefined
    const role = req.query.role as string | undefined
    const isActive = req.query.isActive as string | undefined

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (role) {
      where.role = role
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          skills: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              assignedTasks: true,
              createdProjects: true,
              createdTasks: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: any) {
    logger.error('Failed to fetch users', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users',
    })
  }
}

export async function getUserById(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        skills: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedTasks: true,
            createdProjects: true,
            createdTasks: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    return res.json({
      success: true,
      data: user,
    })
  } catch (error: any) {
    logger.error('Failed to fetch user', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user',
    })
  }
}

export async function createUser(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const data: UpdateUserData = req.body

    if (!data.email || !data.name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required',
      })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use',
      })
    }

    const password = data.password
      ? await hashPassword(data.password)
      : await hashPassword(Math.random().toString(36).slice(-12))

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password,
        name: data.name,
        role: data.role || 'Member',
        department: data.department,
        skills: data.skills || [],
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        skills: true,
        avatar: true,
        isActive: true,
        createdAt: true,
      },
    })

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    })
  } catch (error: any) {
    logger.error('Failed to create user', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create user',
    })
  }
}

export async function updateUser(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params
    const data: Partial<UpdateUserData> = req.body


    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }


    if (req.user?.role !== 'Admin' && req.user?.role !== 'Manager' && req.user?.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile',
      })
    }


    if (req.user?.id === id && data.role && data.role !== existingUser.role) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change your own role',
      })
    }

    if (data.role && req.user?.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can change user roles',
      })
    }

    if (data.isActive !== undefined && req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators and managers can activate/deactivate accounts',
      })
    }


    if (data.email && data.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use',
        })
      }
    }

    const updateData: any = {
      ...(data.name && { name: data.name }),
      ...(data.email && { email: data.email }),
      ...(data.role && { role: data.role }),
      ...(data.department !== undefined && { department: data.department }),
      ...(data.skills && { skills: data.skills }),
      ...(data.avatar !== undefined && { avatar: data.avatar }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        skills: true,
        avatar: true,
        isActive: true,
        updatedAt: true,
      },
    })


    return res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    })
  } catch (error: any) {
    logger.error('Failed to update user', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user',
    })
  }
}

export async function activateUser(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User is already active',
      })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        skills: true,
        avatar: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return res.json({
      success: true,
      message: 'User activated successfully',
      data: updatedUser,
    })
  } catch (error: any) {
    logger.error('Failed to activate user', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to activate user',
    })
  }
}

export async function deactivateUser(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    if (user.id === req.user?.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account',
      })
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User is already inactive',
      })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        skills: true,
        avatar: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return res.json({
      success: true,
      message: 'User deactivated successfully',
      data: updatedUser,
    })
  } catch (error: any) {
    logger.error('Failed to deactivate user', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to deactivate user',
    })
  }
}

export async function uploadAvatar(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const file = req.file as Express.Multer.File

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      })
    }

    if (!file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'File buffer is missing',
      })
    }

    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed',
      })
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const cloudinaryResult = await uploadToCloudinary(
      file.buffer,
      `avatar-${req.user.id}-${Date.now()}`,
      'project-management/avatars'
    )

    if (user.avatar) {
      const publicId = extractPublicIdFromUrl(user.avatar)
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId)
        } catch (error: any) {
          logger.error('Failed to delete old avatar from Cloudinary', error)
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: cloudinaryResult.secure_url },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        skills: true,
        avatar: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: updatedUser,
    })
  } catch (error: any) {
    logger.error('Failed to upload avatar', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload avatar',
    })
  }
}

export async function deleteUser(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params


    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      })
    }

    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    if (user.avatar) {
      const publicId = extractPublicIdFromUrl(user.avatar)
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId)
        } catch (error: any) {
          logger.error('Failed to delete avatar from Cloudinary', error)
        }
      }
    }

    await prisma.user.delete({
      where: { id },
    })

    return res.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error: any) {
    logger.error('Failed to delete user', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user',
    })
  }
}

export async function getTeamMemberStats(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        skills: true,
        avatar: true,
        isActive: true,
      },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const [taskStats, projectStats, timeStats, recentTasks, recentActivities] = await Promise.all([
      prisma.taskAssignment.groupBy({
        by: ['taskId'],
        where: { userId: id },
        _count: true,
      }).then(async (assignments) => {
        const taskIds = assignments.map((a) => a.taskId)
        const tasks = await prisma.task.findMany({
          where: { id: { in: taskIds } },
          select: { id: true, status: true },
        })

        const total = tasks.length
        const completed = tasks.filter((t: { id: string; status: string }) => t.status === 'Done').length
        const inProgress = tasks.filter((t: { id: string; status: string }) => t.status === 'InProgress').length

        return {
          total,
          completed,
          inProgress,
          created: 0,
          completionRate: total > 0 ? (completed / total) * 100 : 0,
        }
      }),
      prisma.task.findMany({
        where: { creatorId: id },
        select: { id: true },
      }).then(async (createdTasks: Array<{ id: string }>) => {
        const created = createdTasks.length
        const managed = await prisma.project.count({
          where: { managerId: id },
        })
        return {
          created,
          managed,
          total: created + managed,
        }
      }),
      prisma.timeLog.groupBy({
        by: ['taskId'],
        where: { userId: id },
        _sum: { hours: true },
      }).then(async (logs) => {
        const taskIds = logs.map((l) => l.taskId)
        const tasks = await prisma.task.findMany({
          where: { id: { in: taskIds } },
          include: { sprint: { include: { project: true } } },
        })

        const totalHours = logs.reduce((sum: number, log) => sum + Number(log._sum.hours || 0), 0)
        const byProject = tasks.reduce((acc: Array<{ projectId: string; projectTitle: string; hours: number }>, task: { id: string; sprint?: { project?: { id: string; title: string } | null } | null }) => {
          const projectId = task.sprint?.project?.id || 'unknown'
          const projectTitle = task.sprint?.project?.title || 'Unknown Project'
          const hours = Number(
            logs.find((l) => l.taskId === task.id)?._sum.hours || 0
          )

          const existing = acc.find((p: { projectId: string; projectTitle: string; hours: number }) => p.projectId === projectId)
          if (existing) {
            existing.hours += hours
          } else {
            acc.push({ projectId, projectTitle, hours })
          }
          return acc
        }, [] as Array<{ projectId: string; projectTitle: string; hours: number }>)

        return { totalHours, byProject }
      }),
      prisma.taskAssignment.findMany({
        where: { userId: id },
        orderBy: { assignedAt: 'desc' },
        take: 5,
        include: {
          task: {
            include: {
              sprint: { include: { project: { select: { id: true, title: true } } } },
            },
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
            },
          },
        },
      }).then((assignments: Array<{
        task: {
          id: string
          title: string
          status: string
          priority: string
          sprint?: {
            id: string
            title: string
            project?: { id: string; title: string } | null
          } | null
        }
        assignedAt: Date
      }>) =>
        assignments.map((a: {
          task: {
            id: string
            title: string
            status: string
            priority: string
            sprint?: {
              id: string
              title: string
              project?: { id: string; title: string } | null
            } | null
          }
          assignedAt: Date
        }) => ({
          id: a.task.id,
          title: a.task.title,
          status: a.task.status,
          priority: a.task.priority,
          project: a.task.sprint?.project,
          sprint: a.task.sprint ? { id: a.task.sprint.id, title: a.task.sprint.title } : undefined,
          assignedAt: a.assignedAt.toISOString(),
        }))
      ),
      prisma.activityLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          task: { select: { id: true, title: true } },
        },
      }).then((activities: Array<{
        id: string
        type: string
        description: string | null
        task?: { id: string; title: string } | null
        createdAt: Date
      }>) =>
        activities.map((a: {
          id: string
          type: string
          description: string | null
          task?: { id: string; title: string } | null
          createdAt: Date
        }) => ({
          id: a.id,
          type: a.type,
          description: a.description || '',
          task: a.task ? { id: a.task.id, title: a.task.title } : undefined,
          createdAt: a.createdAt.toISOString(),
        }))
      ),
    ])

    const createdTasksCount = await prisma.task.count({
      where: { creatorId: id },
    })

    return res.json({
      success: true,
      data: {
        user,
        statistics: {
          tasks: {
            ...taskStats,
            created: createdTasksCount,
          },
          projects: projectStats,
          time: timeStats,
        },
        recentTasks,
        recentActivities,
      },
    })
  } catch (error: any) {
    logger.error('Failed to fetch team member stats', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch team member stats',
    })
  }
}

export async function inviteUser(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const data: UpdateUserData & { sendEmail?: boolean } = req.body

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use',
      })
    }

    const randomPassword = crypto.randomBytes(16).toString('hex')
    const hashedPassword = await hashPassword(randomPassword)

    const inviteToken = crypto.randomBytes(32).toString('hex')
    const inviteTokenExpiry = new Date()
    inviteTokenExpiry.setDate(inviteTokenExpiry.getDate() + 7)

    if (!data.email || !data.name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required',
      })
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'Member',
        department: data.department,
        skills: data.skills || [],
        inviteToken,
        inviteTokenExpiry,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        skills: true,
        avatar: true,
        isActive: true,
        inviteToken: true,
        createdAt: true,
      },
    })

    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${inviteToken}`

    return res.status(201).json({
      success: true,
      message: 'User invited successfully',
      data: {
        ...user,
        inviteUrl,
      },
    })
  } catch (error: any) {
    logger.error('Failed to invite user', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to invite user',
    })
  }
}

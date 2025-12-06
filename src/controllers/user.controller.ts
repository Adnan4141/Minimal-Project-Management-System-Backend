/**
 * User/Team Management Controller
 */

import { Response } from 'express'
import { AuthRequest, ApiResponse, CreateUserData, UpdateUserData } from '../types'
import { prisma } from '../prisma/client'
import { hashPassword } from '../utils/password'
import { UserRole } from '../../generated/prisma/enums.js'
import { logger } from '../utils/logger'
import { sendInviteEmail } from '../utils/email'
import crypto from 'crypto'

/**
 * Get all users (with pagination and filters)
 */
export async function getUsers(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const role = req.query.role as UserRole | undefined
    const search = req.query.search as string | undefined
    const skip = (page - 1) * limit

    const where: any = {}
    if (role) where.role = role
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ]
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

/**
 * Get user by ID
 */
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

/**
 * Create user (Admin/Manager only)
 */
export async function createUser(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const data: CreateUserData = req.body

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      })
    }

    // Hash password if provided, otherwise generate a random one
    const password = data.password
      ? await hashPassword(data.password)
      : await hashPassword(Math.random().toString(36).slice(-12))

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password,
        name: data.name,
        role: data.role,
        department: data.department,
        skills: data.skills || [],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        skills: true,
        avatar: true,
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

/**
 * Update user
 */
export async function updateUser(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params
    const data: Partial<UpdateUserData> = req.body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    // Check permissions: Admin/Manager can update anyone, users can only update themselves
    if (req.user?.role !== 'Admin' && req.user?.role !== 'Manager' && req.user?.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile',
      })
    }

    // Prevent users from changing their own role
    if (req.user?.id === id && data.role && data.role !== existingUser.role) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change your own role',
      })
    }

    // If email is being changed, check for duplicates
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

/**
 * Delete user (soft delete by setting isActive to false)
 */
export async function deleteUser(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    // Prevent self-deletion
    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
      })
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    })

    return res.json({
      success: true,
      message: 'User deactivated successfully',
      data: user,
    })
  } catch (error: any) {
    logger.error('Failed to delete user', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user',
    })
  }
}

/**
 * Get team member statistics
 */
export async function getTeamMemberStats(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    // Get task statistics
    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      assignedTasks,
      createdTasks,
      createdProjects,
      managedProjects,
      totalTimeLogged,
      recentActivities,
    ] = await Promise.all([
      // Total assigned tasks
      prisma.taskAssignment.count({
        where: { userId: id },
      }),
      // Completed tasks
      prisma.taskAssignment.count({
        where: {
          userId: id,
          task: {
            status: 'Done',
          },
        },
      }),
      // In progress tasks
      prisma.taskAssignment.count({
        where: {
          userId: id,
          task: {
            status: 'InProgress',
          },
        },
      }),
      // All assigned tasks with details
      prisma.taskAssignment.findMany({
        where: { userId: id },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              sprint: {
                select: {
                  id: true,
                  title: true,
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
        take: 10,
        orderBy: { assignedAt: 'desc' },
      }),
      // Created tasks count
      prisma.task.count({
        where: { creatorId: id },
      }),
      // Created projects count
      prisma.project.count({
        where: { creatorId: id },
      }),
      // Managed projects count
      prisma.project.count({
        where: { managerId: id },
      }),
      // Total time logged
      prisma.timeLog.aggregate({
        where: { userId: id },
        _sum: {
          hours: true,
        },
      }),
      // Recent activities
      prisma.activityLog.findMany({
        where: { userId: id },
        include: {
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // Calculate time logged by project
    const timeLogsByProject = await prisma.timeLog.groupBy({
      by: ['taskId'],
      where: { userId: id },
      _sum: {
        hours: true,
      },
    })

    const projectIds = await Promise.all(
      timeLogsByProject.map(async (log) => {
        const task = await prisma.task.findUnique({
          where: { id: log.taskId },
          select: {
            sprint: {
              select: {
                projectId: true,
                project: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        })
        return task?.sprint?.projectId
      })
    )

    const uniqueProjectIds = [...new Set(projectIds.filter(Boolean))]

    const projectTimeStats = await Promise.all(
      uniqueProjectIds.map(async (projectId) => {
        const project = await prisma.project.findUnique({
          where: { id: projectId as string },
          select: {
            id: true,
            title: true,
          },
        })

        const projectTasks = await prisma.task.findMany({
          where: {
            sprint: {
              projectId: projectId as string,
            },
            assignees: {
              some: {
                userId: id,
              },
            },
          },
          select: {
            id: true,
          },
        })

        const taskIds = projectTasks.map((t) => t.id)

        const totalHours = await prisma.timeLog.aggregate({
          where: {
            userId: id,
            taskId: {
              in: taskIds,
            },
          },
          _sum: {
            hours: true,
          },
        })

        return {
          projectId: project?.id,
          projectTitle: project?.title,
          hours: Number(totalHours._sum.hours || 0),
        }
      })
    )

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        statistics: {
          tasks: {
            total: totalTasks,
            completed: completedTasks,
            inProgress: inProgressTasks,
            created: createdTasks,
            completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
          },
          projects: {
            created: createdProjects,
            managed: managedProjects,
            total: createdProjects + managedProjects,
          },
          time: {
            totalHours: Number(totalTimeLogged._sum.hours || 0),
            byProject: projectTimeStats,
          },
        },
        recentTasks: assignedTasks.map((assignment) => ({
          id: assignment.task.id,
          title: assignment.task.title,
          status: assignment.task.status,
          priority: assignment.task.priority,
          project: assignment.task.sprint?.project,
          sprint: assignment.task.sprint,
          assignedAt: assignment.assignedAt,
        })),
        recentActivities: recentActivities.map((activity) => ({
          id: activity.id,
          type: activity.type,
          description: activity.description,
          task: activity.task,
          createdAt: activity.createdAt,
        })),
      },
    })
  } catch (error: any) {
    logger.error('Failed to fetch team member statistics', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch team member statistics',
    })
  }
}

export async function inviteUser(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { email, name, role, department, skills, sendEmail } = req.body

    if (req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only Admins and Managers can invite users',
      })
    }

    if (role === 'Admin' && req.user?.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only Admins can invite Admin users',
      })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser && existingUser.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      })
    }

    const inviteToken = crypto.randomBytes(32).toString('hex')
    const inviteTokenExpiry = new Date()
    inviteTokenExpiry.setDate(inviteTokenExpiry.getDate() + 7)

    const randomPassword = crypto.randomBytes(16).toString('hex')
    const hashedPassword = await hashPassword(randomPassword)

    let user
    if (existingUser) {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          department,
          skills: skills || [],
          inviteToken,
          inviteTokenExpiry,
          isActive: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          skills: true,
          createdAt: true,
        },
      })
    } else {
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          department,
          skills: skills || [],
          inviteToken,
          inviteTokenExpiry,
          isActive: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          skills: true,
          createdAt: true,
        },
      })
    }

    let emailSent = false
    if (sendEmail) {
      emailSent = await sendInviteEmail(
        email,
        name,
        inviteToken,
        req.user?.name || 'Admin'
      )
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? 'Invitation sent successfully'
        : 'User created. Invite email could not be sent. Please share the invite link manually.',
      data: {
        user,
        inviteToken: emailSent ? undefined : inviteToken,
        inviteUrl: emailSent
          ? undefined
          : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${inviteToken}`,
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


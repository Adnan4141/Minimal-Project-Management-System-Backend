/**
 * Comment Controller
 */

import { Response } from 'express'
import { AuthRequest, ApiResponse, CreateCommentData } from '../types'
import { prisma } from '../prisma/client'
import { logger } from '../utils/logger'

/**
 * Get comments for a task
 */
export async function getTaskComments(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { taskId } = req.params

    const comments = await prisma.comment.findMany({
      where: {
        taskId,
        parentId: null, // Only top-level comments
      },
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
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return res.json({
      success: true,
      data: comments,
    })
  } catch (error: any) {
    logger.error('Failed to fetch comments', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch comments',
    })
  }
}

/**
 * Create comment
 */
export async function createComment(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const data: CreateCommentData = req.body

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

    // If parent comment, verify it exists
    if (data.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: data.parentId },
      })

      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found',
        })
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        taskId: data.taskId,
        userId: req.user!.id,
        parentId: data.parentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        parent: data.parentId
          ? {
              select: {
                id: true,
                content: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            }
          : undefined,
      },
    })

    // Create activity log
    await prisma.activityLog.create({
      data: {
        type: 'commented',
        description: 'Comment added',
        taskId: data.taskId,
        userId: req.user!.id,
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: comment,
    })
  } catch (error: any) {
    logger.error('Failed to create comment', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create comment',
    })
  }
}

/**
 * Update comment
 */
export async function updateComment(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params
    const { content } = req.body

    const comment = await prisma.comment.findUnique({
      where: { id },
    })

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      })
    }

    // Only the comment author can update
    if (comment.userId !== req.user?.id && req.user?.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
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
    })

    return res.json({
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment,
    })
  } catch (error: any) {
    logger.error('Failed to update comment', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update comment',
    })
  }
}

/**
 * Delete comment
 */
export async function deleteComment(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const comment = await prisma.comment.findUnique({
      where: { id },
    })

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      })
    }

    // Only the comment author or Admin can delete
    if (comment.userId !== req.user?.id && req.user?.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    await prisma.comment.delete({
      where: { id },
    })

    return res.json({
      success: true,
      message: 'Comment deleted successfully',
    })
  } catch (error: any) {
    logger.error('Failed to delete comment', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete comment',
    })
  }
}



import { Response } from 'express'
import { AuthRequest, ApiResponse } from '../types'
import { prisma } from '../prisma/client'
import { logger } from '../utils/logger'
import { uploadToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from '../utils/cloudinary'

export async function getTaskAttachments(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { taskId } = req.params

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    })

    return res.json({
      success: true,
      data: attachments,
    })
  } catch (error: any) {
    logger.error('Failed to fetch attachments', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch attachments',
    })
  }
}

export async function uploadAttachment(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { taskId } = req.body
    const file = req.file as Express.Multer.File

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      })
    }

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required',
      })
    }


    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      })
    }

    if (!file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'File buffer is missing',
      })
    }

    const cloudinaryResult = await uploadToCloudinary(
      file.buffer,
      file.originalname
    )

    const attachment = await prisma.attachment.create({
      data: {
        filename: file.originalname,
        fileUrl: cloudinaryResult.secure_url,
        fileType: file.mimetype,
        fileSize: cloudinaryResult.bytes,
        taskId,
        uploadedById: req.user!.id,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })


    await prisma.activityLog.create({
      data: {
        type: 'attachment_added',
        description: `Attachment "${file.originalname}" added`,
        taskId,
        userId: req.user!.id,
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully',
      data: attachment,
    })
  } catch (error: any) {
    logger.error('Failed to upload attachment', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload attachment',
    })
  }
}

export async function createAttachment(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { taskId, filename, fileUrl, fileType, fileSize } = req.body


    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      })
    }

    const attachment = await prisma.attachment.create({
      data: {
        filename,
        fileUrl,
        fileType,
        fileSize: parseInt(fileSize),
        taskId,
        uploadedById: req.user!.id,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })


    await prisma.activityLog.create({
      data: {
        type: 'attachment_added',
        description: `Attachment "${filename}" added`,
        taskId,
        userId: req.user!.id,
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Attachment created successfully',
      data: attachment,
    })
  } catch (error: any) {
    logger.error('Failed to create attachment', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create attachment',
    })
  }
}

export async function deleteAttachment(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { id } = req.params

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    })

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found',
      })
    }


    const task = await prisma.task.findUnique({
      where: { id: attachment.taskId },
    })

    const canDelete =
      attachment.uploadedById === req.user?.id ||
      task?.creatorId === req.user?.id ||
      req.user?.role === 'Admin' ||
      req.user?.role === 'Manager'

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    const publicId = extractPublicIdFromUrl(attachment.fileUrl)
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId)
      } catch (error: any) {
        logger.error('Failed to delete from Cloudinary', error)
      }
    }

    await prisma.attachment.delete({
      where: { id },
    })

    return res.json({
      success: true,
      message: 'Attachment deleted successfully',
    })
  } catch (error: any) {
    logger.error('Failed to delete attachment', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete attachment',
    })
  }
}


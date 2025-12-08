import { Response } from 'express'
import { AuthRequest, ApiResponse, RegisterData, LoginCredentials } from '../types'
import { prisma } from '../prisma/client'
import { hashPassword, comparePassword } from '../utils/password'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { config } from '../config/env'
import { UserRole } from '../../generated/prisma/enums.js'
import { handleOAuth } from '../services/auth.service'
import { logger } from '../utils/logger'

function parseExpiryToMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/)
  if (!match) {

    return 7 * 24 * 60 * 60 * 1000
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }

  return value * (multipliers[unit] || multipliers.d)
}

export async function register(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const data: RegisterData = req.body

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      })
    }

    const hashedPassword = await hashPassword(data.password)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || UserRole.Member,
        department: data.department,
        skills: data.skills || [],
        isActive: false,
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
      message: 'Registration successful. Your account is pending activation by an administrator.',
      data: {
        user,
        requiresActivation: true,
      },
    })
  } catch (error: any) {
    logger.error('Failed to register user', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to register user',
    })
  }
}

export async function login(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const credentials: LoginCredentials = req.body


    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

  

    const isPasswordValid = await comparePassword(credentials.password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    }


    const accessToken = generateAccessToken(tokenPayload, 'credentials')
    const refreshToken = generateRefreshToken(tokenPayload, 'credentials')


    const refreshExpiry = config.jwt.credentials.refreshTokenExpiry || config.jwt.refreshTokenExpiry || '7d'
    const maxAge = parseExpiryToMs(refreshExpiry)

    res.cookie(config.jwt.cookieName, refreshToken, {
      httpOnly: true,
      secure: config.server.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge,
    })

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          skills: user.skills,
          avatar: user.avatar,
        },
        accessToken,
      },
    })
  } catch (error: any) {
    logger.error('Failed to login', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to login',
    })
  }
}

export async function refreshToken(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const refreshToken =
      req.cookies[config.jwt.cookieName] || req.body.refreshToken

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided',
      })
    }

    const payload = verifyRefreshToken(refreshToken)

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    if (!user ) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      })
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    }


    const accessToken = generateAccessToken(tokenPayload, 'credentials')

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
      },
    })
  } catch (error: any) {
    logger.error('Invalid refresh token', error)
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid refresh token',
    })
  }
}

export async function getMe(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
    logger.error('Failed to get user profile', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user profile',
    })
  }
}

export async function changePassword(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
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

    const isPasswordValid = await comparePassword(currentPassword, user.password)

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      })
    }

    const hashedPassword = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    })

    return res.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error: any) {
    logger.error('Failed to change password', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to change password',
    })
  }
}

export async function logout(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    res.clearCookie(config.jwt.cookieName, {
      httpOnly: true,
      secure: config.server.nodeEnv === 'production',
      sameSite: 'strict',
    })

    return res.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error: any) {
    logger.error('Failed to logout', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to logout',
    })
  }
}

export async function oauth(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { provider, idToken, accessToken } = req.body

    if (!provider || !['google', 'facebook'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OAuth provider. Must be "google" or "facebook"',
      })
    }

    if (provider === 'google' && !idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      })
    }

    if (provider === 'facebook' && !accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Facebook access token is required',
      })
    }

    const userIp = req.ip || req.socket.remoteAddress || undefined

    const authResult = await handleOAuth(
      provider as 'google' | 'facebook',
      idToken,
      accessToken,
      userIp
    )


    const refreshExpiry = config.jwt.oauth.refreshTokenExpiry || config.jwt.refreshTokenExpiry || '30d'
    const maxAge = parseExpiryToMs(refreshExpiry)

    res.cookie(config.jwt.cookieName, authResult.refreshToken, {
      httpOnly: true,
      secure: config.server.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge,
    })

    return res.json({
      success: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} login successful`,
      data: {
        user: authResult.user,
        accessToken: authResult.accessToken,
      },
    })
  } catch (error: any) {
    logger.error('OAuth authentication failed', error)
    
    // if (error.message && error.message.includes('pending activation')) {
    //   return res.status(403).json({
    //     success: false,
    //     message: error.message || 'Your account is pending activation. Please contact an administrator to activate your account.',
    //     requiresActivation: true,
    //   })
    // }
    
    return res.status(401).json({
      success: false,
      message: error.message || 'OAuth authentication failed',
    })
  }
}

export async function acceptInvite(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Invite token and password are required',
      })
    }

    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteTokenExpiry: {
          gte: new Date(),
        },
      },
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invite token',
      })
    }

    const hashedPassword = await hashPassword(password)

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        inviteToken: null,
        inviteTokenExpiry: null,
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
        createdAt: true,
      },
    })

    const tokenPayload = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.name,
    }


    const accessToken = generateAccessToken(tokenPayload, 'credentials')
    const refreshToken = generateRefreshToken(tokenPayload, 'credentials')


    const refreshExpiry = config.jwt.credentials.refreshTokenExpiry || config.jwt.refreshTokenExpiry || '7d'
    const maxAge = parseExpiryToMs(refreshExpiry)

    res.cookie(config.jwt.cookieName, refreshToken, {
      httpOnly: true,
      secure: config.server.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge,
    })

    return res.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        user: updatedUser,
        accessToken,
      },
    })
  } catch (error: any) {
    logger.error('Failed to accept invite', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to accept invitation',
    })
  }
}


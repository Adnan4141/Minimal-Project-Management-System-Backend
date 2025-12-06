import { Response } from 'express'
import { AuthRequest, ApiResponse, RegisterData, LoginCredentials } from '../types'
import { prisma } from '../prisma/client'
import { hashPassword, comparePassword } from '../utils/password'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { config } from '../config/env'
import { UserRole } from '../../generated/prisma/enums.js'
import { handleOAuth } from '../services/auth.service'

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
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    }

    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    // Set refresh token in HTTP-only cookie
    res.cookie(config.jwt.cookieName, refreshToken, {
      httpOnly: true,
      secure: config.server.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        accessToken,
      },
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to register user',
    })
  }
}

/**
 * Login user
 */
export async function login(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const credentials: LoginCredentials = req.body

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
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

    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    res.cookie(config.jwt.cookieName, refreshToken, {
      httpOnly: true,
      secure: config.server.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

    if (!user || !user.isActive) {
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

    const accessToken = generateAccessToken(tokenPayload)

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
      },
    })
  } catch (error: any) {
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
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user profile',
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

    res.cookie(config.jwt.cookieName, authResult.refreshToken, {
      httpOnly: true,
      secure: config.server.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
    return res.status(401).json({
      success: false,
      message: error.message || 'OAuth authentication failed',
    })
  }
}


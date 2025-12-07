
import { Response } from 'express'
import { AuthRequest, ApiResponse } from '../types'
import { prisma } from '../prisma/client'
import { generateAccessToken, generateRefreshToken } from '../utils/jwt'
import { config } from '../config/env'
import { UserRole } from '../../generated/prisma/enums.js'
import { OAuth2Client } from 'google-auth-library'
import axios from 'axios'
import { hashPassword } from '../utils/password'
import { logger } from '../utils/logger'

export async function googleOAuth(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required',
      })
    }

    if (!config.oauth.google.clientId) {
      return res.status(500).json({
        success: false,
        message: 'Google OAuth is not configured',
      })
    }


    const client = new OAuth2Client(config.oauth.google.clientId)
    
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: config.oauth.google.clientId,
      })

      const payload = ticket.getPayload()
      
      if (!payload || !payload.email || !payload.name) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Google token payload',
        })
      }

      const { email, name, picture, sub: googleId } = payload


      let user = await prisma.user.findUnique({
        where: { email },
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

      if (!user) {


        const randomPassword = await hashPassword(Math.random().toString(36).slice(-12))

        user = await prisma.user.create({
          data: {
            email,
            password: randomPassword, // OAuth users won't use password
            name: name || 'User',
            role: UserRole.Member,
            avatar: picture || undefined,
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
      } else {

        if (!user.isActive) {
          return res.status(403).json({
            success: false,
            message: 'Your account is pending activation. Please contact an administrator to activate your account.',
            requiresActivation: true,
          })
        }


        if (picture && picture !== user.avatar) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { avatar: picture },
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
        }
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
        message: 'Google login successful',
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
      logger.error('Invalid Google token', error)
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token: ' + (error.message || 'Token verification failed'),
      })
    }
  } catch (error: any) {
    logger.error('Failed to authenticate with Google', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to authenticate with Google',
    })
  }
}

export async function facebookOAuth(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { accessToken } = req.body

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Facebook access token is required',
      })
    }

    if (!config.oauth.facebook.appId || !config.oauth.facebook.appSecret) {
      return res.status(500).json({
        success: false,
        message: 'Facebook OAuth is not configured',
      })
    }

    try {

      const debugResponse = await axios.get(
        `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${config.oauth.facebook.appId}|${config.oauth.facebook.appSecret}`
      )

      if (!debugResponse.data.data || !debugResponse.data.data.is_valid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid Facebook token',
        })
      }

      const userId = debugResponse.data.data.user_id


      const userInfoResponse = await axios.get(
        `https://graph.facebook.com/${userId}?fields=id,name,email,picture&access_token=${accessToken}`
      )

      const { email, name, picture } = userInfoResponse.data

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required from Facebook. Please grant email permission.',
        })
      }


      let user = await prisma.user.findUnique({
        where: { email },
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

      if (!user) {

        const randomPassword = await hashPassword(Math.random().toString(36).slice(-12))
        const avatarUrl = picture?.data?.url

        user = await prisma.user.create({
          data: {
            email,
            password: randomPassword,
            name: name || 'User',
            role: UserRole.Member,
            avatar: avatarUrl || undefined,
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
      } else {

        if (!user.isActive) {
          return res.status(403).json({
            success: false,
            message: 'Your account is pending activation. Please contact an administrator to activate your account.',
            requiresActivation: true,
          })
        }


        const avatarUrl = picture?.data?.url
        if (avatarUrl && avatarUrl !== user.avatar) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { avatar: avatarUrl },
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
        }
      }


      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      }

      const accessTokenJWT = generateAccessToken(tokenPayload)
      const refreshToken = generateRefreshToken(tokenPayload)


      res.cookie(config.jwt.cookieName, refreshToken, {
        httpOnly: true,
        secure: config.server.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })

      return res.json({
        success: true,
        message: 'Facebook login successful',
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
          accessToken: accessTokenJWT,
        },
      })
    } catch (error: any) {
      logger.error('Facebook authentication failed', error)
      if (error.response) {
        return res.status(401).json({
          success: false,
          message: 'Facebook authentication failed: ' + (error.response.data?.error?.message || 'Invalid token'),
        })
      }
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to authenticate with Facebook',
      })
    }
  } catch (error: any) {
    logger.error('Failed to authenticate with Facebook', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to authenticate with Facebook',
    })
  }
}


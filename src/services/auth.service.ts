
import { prisma } from '../prisma/client'
import { hashPassword } from '../utils/password'
import { generateAccessToken, generateRefreshToken } from '../utils/jwt'
import { verifyGoogleToken, verifyFacebookToken } from '../utils/oauth-verification'
import { UserRole } from '../../generated/prisma/enums.js'

export interface OAuthUserInfo {
  email: string
  name: string
  picture?: string
  emailVerified: boolean
}

export interface AuthResult {
  user: {
    id: string
    email: string
    name: string
    role: string
    department?: string | null
    skills: string[]
    avatar?: string | null
  }
  accessToken: string
  refreshToken: string
}

export async function handleOAuth(
  provider: 'google' | 'facebook',
  idToken?: string,
  accessToken?: string,
  userIp?: string
): Promise<AuthResult> {
  let userInfo: OAuthUserInfo


  if (provider === 'google') {
    if (!idToken) {
      throw new Error('Google ID token is required')
    }
    userInfo = await verifyGoogleToken(idToken)
  } else if (provider === 'facebook') {
    if (!accessToken) {
      throw new Error('Facebook access token is required')
    }
    userInfo = await verifyFacebookToken(accessToken)
  } else {
    throw new Error('Invalid OAuth provider')
  }


  let user = await prisma.user.findUnique({
    where: { email: userInfo.email },
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


    const randomPassword = await hashPassword(Math.random().toString(36).slice(-12))

    user = await prisma.user.create({
      data: {
        email: userInfo.email,
        password: randomPassword,
        name: userInfo.name,
        role: UserRole.Member,
        avatar: userInfo.picture || undefined,
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
      },
    })
  } else {
    


    if (userInfo.picture && userInfo.picture !== user.avatar) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatar: userInfo.picture },
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
    }
  }


  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  }


  const accessTokenJWT = generateAccessToken(tokenPayload, 'oauth')
  const refreshToken = generateRefreshToken(tokenPayload, 'oauth')

  return {
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
    refreshToken,
  }
}





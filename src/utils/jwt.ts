import jwt, { SignOptions } from 'jsonwebtoken'
import { config } from '../config/env'
import { TokenPayload } from '../types'

export type AuthMethod = 'credentials' | 'oauth'

export function generateAccessToken(
  payload: TokenPayload & { name?: string },
  method: AuthMethod = 'credentials',
  customExpiry?: string
): string {
  const expiry: string = customExpiry || 
    (method === 'oauth' 
      ? config.jwt.oauth.accessTokenExpiry 
      : config.jwt.credentials.accessTokenExpiry) ||
    config.jwt.accessTokenExpiry || '30m'

  const options: SignOptions = {
    expiresIn: expiry as any,
  }

  return jwt.sign(payload, config.jwt.secret as string, options)
}

export function generateRefreshToken(
  payload: TokenPayload & { name?: string },
  method: AuthMethod = 'credentials',
  customExpiry?: string
): string {
  const expiry: string = customExpiry || 
    (method === 'oauth' 
      ? config.jwt.oauth.refreshTokenExpiry 
      : config.jwt.credentials.refreshTokenExpiry) ||
    config.jwt.refreshTokenExpiry || '7d'

  const options: SignOptions = {
    expiresIn: expiry as any,
  }

  return jwt.sign(payload, config.jwt.refreshSecret as string, options)
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.jwt.secret as string) as TokenPayload
  } catch (error) {
    throw new Error('Invalid or expired access token')
  }
}

export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.jwt.refreshSecret as string) as TokenPayload
  } catch (error) {
    throw new Error('Invalid or expired refresh token')
  }
}


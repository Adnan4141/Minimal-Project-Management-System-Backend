import { OAuth2Client } from 'google-auth-library'
import axios from 'axios'
import { config } from '../config/env'

export interface GoogleUserInfo {
  email: string
  name: string
  picture?: string
  emailVerified: boolean
}

export interface FacebookUserInfo {
  email: string
  name: string
  picture?: string
  emailVerified: boolean
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
  if (!config.oauth.google.clientId) {
    throw new Error('Google OAuth is not configured')
  }

  const client = new OAuth2Client(config.oauth.google.clientId)

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.oauth.google.clientId,
    })

    const payload = ticket.getPayload()

    if (!payload) {
      throw new Error('Invalid Google token payload')
    }

    if (!payload.email) {
      throw new Error('Email is required from Google token')
    }

    if (!payload.name) {
      throw new Error('Name is required from Google token')
    }

    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.email_verified || false,
    }
  } catch (error: any) {
    throw new Error(`Google token verification failed: ${error.message}`)
  }
}

export async function verifyFacebookToken(accessToken: string): Promise<FacebookUserInfo> {
  if (!config.oauth.facebook.appId || !config.oauth.facebook.appSecret) {
    throw new Error('Facebook OAuth is not configured')
  }

  try {
    const debugResponse = await axios.get(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${config.oauth.facebook.appId}|${config.oauth.facebook.appSecret}`
    )

    if (!debugResponse.data.data || !debugResponse.data.data.is_valid) {
      throw new Error('Invalid Facebook token')
    }

    const userId = debugResponse.data.data.user_id

    const userInfoResponse = await axios.get(
      `https://graph.facebook.com/${userId}?fields=id,name,email,picture&access_token=${accessToken}`
    )

    const { email, name, picture } = userInfoResponse.data

    if (!email) {
      throw new Error('Email is required from Facebook. Please grant email permission.')
    }

    if (!name) {
      throw new Error('Name is required from Facebook')
    }

    return {
      email,
      name,
      picture: picture?.data?.url,
      emailVerified: true,
    }
  } catch (error: any) {
    if (error.response) {
      throw new Error(`Facebook token verification failed: ${error.response.data?.error?.message || 'Invalid token'}`)
    }
    throw new Error(`Facebook token verification failed: ${error.message}`)
  }
}







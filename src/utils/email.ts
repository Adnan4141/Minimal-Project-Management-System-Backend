import nodemailer from 'nodemailer'
import { config } from '../config/env'
import { logger } from './logger'

let transporter: nodemailer.Transporter | null = null

export function initializeEmailService() {
  if (!config.email.enabled) {
    logger.warn('Email service is disabled. Invite emails will not be sent.')
    return
  }

  if (!config.email.user || !config.email.password) {
    logger.warn('Email credentials not configured. Invite emails will not be sent.')
    return
  }

  transporter = nodemailer.createTransport({
    service: config.email.service === 'gmail' ? 'gmail' : undefined,
    host: config.email.service !== 'gmail' ? config.email.host : undefined,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  })

  logger.info('Email service initialized')
}

export async function sendInviteEmail(
  email: string,
  name: string,
  inviteToken: string,
  inviterName: string
): Promise<boolean> {
  if (!config.email.enabled || !transporter) {
    logger.warn(`Email service not available. Invite token for ${email}: ${inviteToken}`)
    return false
  }

  const inviteUrl = `${config.app.frontendUrl}/accept-invite?token=${inviteToken}`

  const mailOptions = {
    from: `"${config.email.fromName}" <${config.email.from}>`,
    to: email,
    subject: `You've been invited to join ${config.email.fromName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Team Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">You're Invited!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hi ${name},</p>
            <p><strong>${inviterName}</strong> has invited you to join the team on ${config.email.fromName}.</p>
            <p>Click the button below to accept the invitation and set up your account:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Accept Invitation</a>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 30px;">
              Or copy and paste this link into your browser:<br>
              <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
            </p>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
              This invitation link will expire in 7 days.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Hi ${name},
      
      ${inviterName} has invited you to join the team on ${config.email.fromName}.
      
      Click the link below to accept the invitation and set up your account:
      ${inviteUrl}
      
      This invitation link will expire in 7 days.
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    logger.info(`Invite email sent to ${email}`)
    return true
  } catch (error) {
    logger.error(`Failed to send invite email to ${email}`, error)
    return false
  }
}


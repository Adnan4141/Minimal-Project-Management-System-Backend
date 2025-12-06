import { config } from '../config/env'

type LogLevel = 'info' | 'error' | 'warn' | 'debug'

class Logger {
  private isDevelopment = config.server.nodeEnv === 'development'

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    return `${prefix} ${message}`
  }

  info(message: string, ...args: any[]): void {
    if (this.isDevelopment || process.env.LOG_LEVEL === 'info') {
      console.log(this.formatMessage('info', message), ...args)
    }
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('error', message), ...args)
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('warn', message), ...args)
  }

  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment || process.env.LOG_LEVEL === 'debug') {
      console.debug(this.formatMessage('debug', message), ...args)
    }
  }
}

export const logger = new Logger()


/**
 * Environment configuration
 * Validates and exports all environment variables
 */

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getEnvOptional(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key]
  if (value === undefined) {
    return defaultValue
  }
  const num = Number(value)
  if (isNaN(num)) {
    throw new Error(`Invalid number for environment variable: ${key}`)
  }
  return num
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key]
  if (value === undefined) {
    return defaultValue
  }
  return value.toLowerCase() === 'true'
}

export function validateEnv() {
  // Required environment variables
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ]

  const missing: string[] = []
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file.'
    )
  }
}

export const config = {
  // Server Configuration
  server: {
    port: getEnvNumber('PORT', 5000),
    nodeEnv: getEnvOptional('NODE_ENV', 'development') as 'development' | 'production' | 'test',
    apiPrefix: getEnvOptional('API_PREFIX', '/api'),
  },

  // Database Configuration
  database: {
    url: getEnv('DATABASE_URL'),
  },

  // JWT Configuration
  jwt: {
    secret: getEnv('JWT_SECRET'),
    refreshSecret: getEnv('JWT_REFRESH_SECRET'),
    accessTokenExpiry: getEnvOptional('JWT_ACCESS_EXPIRY', '15m'),
    refreshTokenExpiry: getEnvOptional('JWT_REFRESH_EXPIRY', '7d'),
    cookieName: getEnvOptional('JWT_COOKIE_NAME', 'refreshToken'),
  },

  // CORS Configuration
  cors: {
    origin: getEnvOptional('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: getEnvBoolean('CORS_CREDENTIALS', true),
  },

  // File Upload Configuration
  upload: {
    maxFileSize: getEnvNumber('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB default
    allowedMimeTypes: getEnvOptional('ALLOWED_MIME_TYPES', 'image/*,application/pdf')?.split(','),
    uploadPath: getEnvOptional('UPLOAD_PATH', './uploads'),
    publicUrl: getEnvOptional('PUBLIC_UPLOAD_URL', '/uploads'),
  },

  // Email Configuration (for invites)
  email: {
    enabled: getEnvBoolean('EMAIL_ENABLED', false),
    service: getEnvOptional('EMAIL_SERVICE', 'gmail'),
    host: getEnvOptional('EMAIL_HOST'),
    port: getEnvNumber('EMAIL_PORT', 587),
    secure: getEnvBoolean('EMAIL_SECURE', false),
    user: getEnvOptional('EMAIL_USER'),
    password: getEnvOptional('EMAIL_PASSWORD'),
    from: getEnvOptional('EMAIL_FROM', 'noreply@mpms.com'),
    fromName: getEnvOptional('EMAIL_FROM_NAME', 'MPMS System'),
  },

  // Redis Configuration (optional, for caching/sessions)
  redis: {
    enabled: getEnvBoolean('REDIS_ENABLED', false),
    url: getEnvOptional('REDIS_URL', 'redis://localhost:6379'),
    host: getEnvOptional('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: getEnvOptional('REDIS_PASSWORD'),
  },

  // Security Configuration
  security: {
    bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 10),
    rateLimitWindow: getEnvNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
    rateLimitMax: getEnvNumber('RATE_LIMIT_MAX', 100), // requests per window
  },

  // Application URLs
  app: {
    frontendUrl: getEnvOptional('FRONTEND_URL', 'http://localhost:3000'),
    backendUrl: getEnvOptional('BACKEND_URL', 'http://localhost:5000'),
  },

  // OAuth Configuration
  oauth: {
    google: {
      clientId: getEnvOptional('GOOGLE_CLIENT_ID'),
      clientSecret: getEnvOptional('GOOGLE_CLIENT_SECRET'),
    },
    facebook: {
      appId: getEnvOptional('FACEBOOK_APP_ID'),
      appSecret: getEnvOptional('FACEBOOK_APP_SECRET'),
    },
  },
} as const

// Validate on import
validateEnv()


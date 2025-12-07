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
  server: {
    port: getEnvNumber('PORT', 5000),
    nodeEnv: getEnvOptional('NODE_ENV', 'development') as 'development' | 'production' | 'test',
    apiPrefix: getEnvOptional('API_PREFIX', '/api'),
  },

  database: {
    url: getEnv('DATABASE_URL'),
  },

  jwt: {
    secret: getEnv('JWT_SECRET'),
    refreshSecret: getEnv('JWT_REFRESH_SECRET'),
    credentials: {
      accessTokenExpiry: getEnvOptional('JWT_CREDENTIALS_ACCESS_EXPIRY', '20m'),
      refreshTokenExpiry: getEnvOptional('JWT_CREDENTIALS_REFRESH_EXPIRY', '7d'),
    },
    oauth: {
      accessTokenExpiry: getEnvOptional('JWT_OAUTH_ACCESS_EXPIRY', '1h'),
      refreshTokenExpiry: getEnvOptional('JWT_OAUTH_REFRESH_EXPIRY', '30d'),
    },
    accessTokenExpiry: getEnvOptional('JWT_ACCESS_EXPIRY', '30m'),
    refreshTokenExpiry: getEnvOptional('JWT_REFRESH_EXPIRY', '7d'),
    cookieName: getEnvOptional('JWT_COOKIE_NAME', 'refreshToken') || 'refreshToken',
  },

  cors: {
    origin: getEnvOptional('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: getEnvBoolean('CORS_CREDENTIALS', true),
  },

  upload: {
    maxFileSize: getEnvNumber('MAX_FILE_SIZE', 10 * 1024 * 1024),
    allowedMimeTypes: getEnvOptional('ALLOWED_MIME_TYPES', 'image/*,application/pdf')?.split(','),
    uploadPath: getEnvOptional('UPLOAD_PATH', './uploads'),
    publicUrl: getEnvOptional('PUBLIC_UPLOAD_URL', '/uploads'),
  },

  cloudinary: {
    cloudName: getEnvOptional('CLOUDINARY_CLOUD_NAME') || '',
    apiKey: getEnvOptional('CLOUDINARY_API_KEY') || '',
    apiSecret: getEnvOptional('CLOUDINARY_API_SECRET') || '',
    folder: getEnvOptional('CLOUDINARY_FOLDER', 'project-management/attachments'),
  },

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

  redis: {
    enabled: getEnvBoolean('REDIS_ENABLED', false),
    url: getEnvOptional('REDIS_URL', 'redis://localhost:6379'),
    host: getEnvOptional('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: getEnvOptional('REDIS_PASSWORD'),
  },

  security: {
    bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 10),
    rateLimitWindow: getEnvNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    rateLimitMax: getEnvNumber('RATE_LIMIT_MAX', 100),
  },

  app: {
    frontendUrl: getEnvOptional('FRONTEND_URL', 'http://localhost:3000'),
    backendUrl: getEnvOptional('BACKEND_URL', 'http://localhost:5000'),
  },

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

validateEnv()


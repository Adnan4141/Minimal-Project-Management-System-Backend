/**
 * Prisma Client Singleton
 * Ensures only one instance of PrismaClient is created
 */

import { PrismaClient } from '../../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { config } from '../config/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url,
})

// Create Prisma adapter
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: config.server.nodeEnv === 'development' ? [ 'error', 'warn'] : ['error'],
  })

if (config.server.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma


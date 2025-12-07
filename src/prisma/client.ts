import { PrismaClient } from '../../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { config } from '../config/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const pool = new Pool({
  connectionString: config.database.url,
})

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


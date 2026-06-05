import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL chưa được cấu hình trong .env')
  }

  const adapter = new PrismaMariaDb(url)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient
  prismaSchemaHash?: string
}

/** Đổi khi schema Prisma thay đổi — buộc tạo lại client */
const SCHEMA_HASH = 'v7-attendance-wifi'

function isPrismaClientStale(client: PrismaClient): boolean {
  if (globalForPrisma.prismaSchemaHash !== SCHEMA_HASH) return true
  const c = client as unknown as {
    telegramLinkPending?: { deleteMany?: unknown }
    companyWifi?: { findMany?: unknown }
    attendance?: { findMany?: unknown }
    _runtimeDataModel?: {
      models?: {
        Cost?: { fields?: { name?: string }[] }
        CompanyWifi?: unknown
        Attendance?: unknown
      }
    }
  }
  const hasTelegramLink = typeof c.telegramLinkPending?.deleteMany === 'function'
  const hasCompanyWifi = typeof c.companyWifi?.findMany === 'function'
  const hasAttendance = typeof c.attendance?.findMany === 'function'
  const costFields = c._runtimeDataModel?.models?.Cost?.fields ?? []
  const hasCostApproval = costFields.some((field) => field.name === 'approved')
  const hasCostCancel = costFields.some((field) => field.name === 'canceled')
  const models = c._runtimeDataModel?.models
  const hasModelsInRuntime =
    !!models?.CompanyWifi && !!models?.Attendance
  return (
    !hasTelegramLink ||
    !hasCostApproval ||
    !hasCostCancel ||
    !hasCompanyWifi ||
    !hasAttendance ||
    !hasModelsInRuntime
  )
}

function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma && isPrismaClientStale(globalForPrisma.prisma)) {
    globalForPrisma.prisma.$disconnect().catch(() => {})
    globalForPrisma.prisma = undefined
    globalForPrisma.prismaSchemaHash = undefined
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
    globalForPrisma.prismaSchemaHash = SCHEMA_HASH
  }
  return globalForPrisma.prisma
}

/**
 * Luôn lấy client mới nhất — tránh export const prisma bị kẹt client cũ
 * (thiếu model telegramLinkPending → lỗi 500 khi liên kết Telegram).
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma()
    const value = Reflect.get(client, prop, client)
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client)
    }
    return value
  },
})

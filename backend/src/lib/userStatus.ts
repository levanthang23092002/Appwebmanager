export const USER_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  LOCKED: 'LOCKED',
} as const

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS]

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: 'Đang chờ duyệt',
  APPROVED: 'Đã duyệt',
  LOCKED: 'Đã khóa',
}

export function parseId(id: string): number | null {
  const n = parseInt(id, 10)
  return Number.isNaN(n) || n < 1 ? null : n
}

/** @deprecated use parseId */
export const parseUserId = parseId

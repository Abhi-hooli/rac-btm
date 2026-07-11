import { describe, it, expect, vi, afterEach } from 'vitest'
import { isTrashEnabled, isExpired, daysRemaining, TRASH_RETENTION_DAYS } from './trash'

describe('isTrashEnabled', () => {
  it('is true for collections with a soft-delete safety net', () => {
    expect(isTrashEnabled('treasury_members')).toBe(false) // not a real entry — sanity check the list isn't matching by prefix
    expect(isTrashEnabled('treasurer_members')).toBe(true)
    expect(isTrashEnabled('users')).toBe(true)
    expect(isTrashEnabled('moms')).toBe(true)
  })

  it('is false for collections that still hard-delete', () => {
    expect(isTrashEnabled('projects')).toBe(false)
    expect(isTrashEnabled('blogs')).toBe(false)
    expect(isTrashEnabled('nonexistent')).toBe(false)
  })
})

describe('isExpired / daysRemaining', () => {
  const DAY_MS = 24 * 60 * 60 * 1000

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is never expired if it was never deleted', () => {
    expect(isExpired({})).toBe(false)
    expect(daysRemaining({})).toBe(null)
  })

  it('is not expired the moment it is soft-deleted', () => {
    const now = Date.now()
    vi.useFakeTimers()
    vi.setSystemTime(now)
    const item = { deletedAt: now }
    expect(isExpired(item)).toBe(false)
    expect(daysRemaining(item)).toBe(TRASH_RETENTION_DAYS)
  })

  it('is not yet expired just before the retention window closes', () => {
    const deletedAt = Date.now()
    vi.useFakeTimers()
    vi.setSystemTime(deletedAt + (TRASH_RETENTION_DAYS * DAY_MS) - DAY_MS)
    const item = { deletedAt }
    expect(isExpired(item)).toBe(false)
    expect(daysRemaining(item)).toBeGreaterThan(0)
  })

  it('is expired once the retention window has passed', () => {
    const deletedAt = Date.now()
    vi.useFakeTimers()
    vi.setSystemTime(deletedAt + (TRASH_RETENTION_DAYS * DAY_MS) + DAY_MS)
    const item = { deletedAt }
    expect(isExpired(item)).toBe(true)
    expect(daysRemaining(item)).toBe(0)
  })

  it('reads a Firestore Timestamp-shaped deletedAt via toMillis()', () => {
    const now = Date.now()
    vi.useFakeTimers()
    vi.setSystemTime(now)
    const item = { deletedAt: { toMillis: () => now } }
    expect(isExpired(item)).toBe(false)
    expect(daysRemaining(item)).toBe(TRASH_RETENTION_DAYS)
  })
})

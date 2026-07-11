import { describe, it, expect } from 'vitest'
import {
  inRange,
  isNonCashSponsorship,
  budgetFromForecast,
  resolveApprovedBudget,
  EXPENSE_CATEGORIES,
} from './treasurerShared'

describe('inRange', () => {
  it('treats a missing date as always in range', () => {
    expect(inRange(null, '2026-01-01', '2026-12-31')).toBe(true)
    expect(inRange(undefined, '2026-01-01', '2026-12-31')).toBe(true)
  })

  it('treats no bounds as always in range', () => {
    expect(inRange('2026-06-15', null, null)).toBe(true)
  })

  it('includes a date on or inside the bounds', () => {
    expect(inRange('2026-06-15', '2026-01-01', '2026-12-31')).toBe(true)
  })

  it('excludes a date before the lower bound', () => {
    expect(inRange('2025-12-31', '2026-01-01', '2026-12-31')).toBe(false)
  })

  it('excludes a date after the upper bound', () => {
    expect(inRange('2027-01-01', '2026-01-01', '2026-12-31')).toBe(false)
  })
})

describe('isNonCashSponsorship', () => {
  it('is true for known non-cash sources', () => {
    expect(isNonCashSponsorship({ source: 'written-off' })).toBe(true)
    expect(isNonCashSponsorship({ source: 'self-funded-expense' })).toBe(true)
  })

  it('is false for a real cash sponsorship, or when source is missing', () => {
    expect(isNonCashSponsorship({ source: 'bank-transfer' })).toBe(false)
    expect(isNonCashSponsorship({})).toBe(false)
    expect(isNonCashSponsorship(null)).toBe(false)
  })
})

describe('budgetFromForecast', () => {
  it('falls back to DEFAULT_FORECAST and sums line items into their mapped expense category', () => {
    const budget = budgetFromForecast(null)
    expect(budget['RI Dues']).toBe(18400)
    // Two line items map onto the same category and must be summed, not overwritten
    expect(budget['Meeting Expenses']).toBe(15000) // General Body (10000) + Board (5000)
    expect(budget['Miscellaneous']).toBe(11000)     // Badges (6000) + Discretionary Fund (5000)
  })

  it('every expense category is present, even ones untouched by the forecast', () => {
    const budget = budgetFromForecast(null)
    expect(Object.keys(budget).sort()).toEqual([...EXPENSE_CATEGORIES].sort())
    expect(budget['Bank Charges']).toBe(0)
  })

  it('uses a custom forecast when one is supplied instead of the default', () => {
    const custom = {
      budgetCategories: [
        { key: 'x', label: 'X', items: [{ label: 'RI Dues', amount: 1 }] },
      ],
    }
    const budget = budgetFromForecast(custom)
    expect(budget['RI Dues']).toBe(1)
    expect(budget['District Dues']).toBe(0)
  })
})

describe('resolveApprovedBudget', () => {
  it('uses the live forecast when nothing has been frozen', () => {
    const { budget, isFrozen, live } = resolveApprovedBudget(undefined, null)
    expect(isFrozen).toBe(false)
    expect(budget).toEqual(live)
    expect(budget['RI Dues']).toBe(18400)
  })

  it('uses the frozen snapshot verbatim once approved, ignoring later forecast edits', () => {
    const approvedBudget = { frozen: true, 'RI Dues': 99999 }
    const { budget, isFrozen, live } = resolveApprovedBudget(approvedBudget, null)
    expect(isFrozen).toBe(true)
    expect(budget['RI Dues']).toBe(99999)
    // categories the frozen snapshot didn't set default to 0, not to the live forecast
    expect(budget['District Dues']).toBe(0)
    expect(live['District Dues']).toBe(5000) // live is still computed for comparison in the UI
  })
})

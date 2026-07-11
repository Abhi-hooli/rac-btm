// Shared constants/helpers used by both TreasurerDashboard.jsx and TreasurerReports.jsx.
// Kept in a separate module to avoid a circular import between the two.

export const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque']

export const INCOME_CATEGORIES = ['Membership Dues', 'Sponsorship', 'Donations', 'Fundraising', 'Merchandise Sales', 'Event Registration', 'Interest Income', 'Other Income']
export const EXPENSE_CATEGORIES = ['RI Dues', 'District Dues', 'Installation', 'DOV Ceremony', 'Charter Day', 'Club Service', 'Community Service', 'Professional Development', 'International Service', 'Public Image', 'Membership Development', 'Fellowship', 'Meeting Expenses', 'Website & Technology', 'Printing & Stationery', 'Merchandise', 'Awards & Recognition', 'Bank Charges', 'Miscellaneous']

// Rotaract's 7 Avenues of Service — separate from Budget Head, since a
// transaction's accounting category (e.g. "Printing & Stationery") and which
// avenue-of-service project it funded are two different questions. Kept
// independent so spend can be reported per avenue regardless of budget head.
export const AVENUES = ['Not Applicable', 'Club Service', 'Community Service', 'Professional Development', 'International Service', 'Public Image', 'Fundraising', 'DEI (Diversity, Equity, & Inclusion)']

export function inRange(dateStr, from, to) {
  if (!dateStr) return true
  if (!from && !to) return true
  const d = new Date(dateStr)
  if (from && d < new Date(from)) return false
  if (to && d > new Date(to)) return false
  return true
}

// Sponsorships auto-generated from a written-off transaction or a self-funded
// event expense never brought cash into the club account — the linked expense
// is already excluded from spend, so counting these toward "Collected"/income
// as well would inflate the balance by money the club never actually held.
export const NON_CASH_SPONSORSHIP_SOURCES = ['written-off', 'self-funded-expense']
export const isNonCashSponsorship = (s) => NON_CASH_SPONSORSHIP_SOURCES.includes(s?.source)

// ── Annual Forecast — Budget 26-27, fully editable ──
export const DEFAULT_FORECAST = {
  membership: {
    professional: { current: 20, proposed: 30, dues: 4500 },
    student: { current: 5, proposed: 5, dues: 2500 },
  },
  budgetCategories: [
    {
      key: 'mandatory', label: 'Mandatory Contributions', items: [
        { label: 'RI Dues', amount: 18400 },
        { label: 'District Dues', amount: 5000 },
      ]
    },
    {
      key: 'admin', label: 'Administrative Expenses', items: [
        { label: 'Printing, Stationery & Certificates', amount: 1000 },
        { label: 'Club Banner, Standees & Branding', amount: 2000 },
        { label: 'Board Member Badges / Pins', amount: 6000 },
      ]
    },
    {
      key: 'activities', label: 'Club Activities', items: [
        { label: 'Installation Ceremony', amount: 20000 },
        { label: 'DOV Ceremony', amount: 20000 },
        { label: 'General Body Meetings', amount: 10000 },
        { label: 'Board Meetings', amount: 5000 },
        { label: 'Fellowship Activities', amount: 12000 },
        { label: 'Awards & Recognition', amount: 4000 },
        { label: 'Club Merchandise', amount: 15000 },
        { label: "President's Discretionary Fund", amount: 5000 },
      ]
    },
    {
      key: 'projects', label: 'Avenue-wise Projects', items: [
        { label: 'Club Service Projects', amount: 15000 },
        { label: 'Community Service Projects', amount: 20000 },
        { label: 'Professional Development Projects', amount: 5000 },
        { label: 'International Service Projects', amount: 5000 },
        { label: 'Public Image Initiatives', amount: 10000 },
      ]
    },
  ],
  additionalRevenue: [
    { label: 'Corporate Sponsorships', amount: 25000 },
    { label: 'Project Sponsorships', amount: 15000 },
    { label: 'Fundraising Initiatives', amount: 15000 },
  ],
}

// Maps Forecast's granular budget line items onto the fixed Expense Categories used in Transactions.
export const FORECAST_TO_EXPENSE_MAP = {
  'RI Dues': 'RI Dues',
  'District Dues': 'District Dues',
  'Printing, Stationery & Certificates': 'Printing & Stationery',
  'Club Banner, Standees & Branding': 'Public Image',
  'Board Member Badges / Pins': 'Miscellaneous',
  'Installation Ceremony': 'Installation',
  'DOV Ceremony': 'DOV Ceremony',
  'General Body Meetings': 'Meeting Expenses',
  'Board Meetings': 'Meeting Expenses',
  'Fellowship Activities': 'Fellowship',
  'Awards & Recognition': 'Awards & Recognition',
  'Club Merchandise': 'Merchandise',
  "President's Discretionary Fund": 'Miscellaneous',
  'Club Service Projects': 'Club Service',
  'Community Service Projects': 'Community Service',
  'Professional Development Projects': 'Professional Development',
  'International Service Projects': 'International Service',
  'Public Image Initiatives': 'Public Image',
}

export function budgetFromForecast(forecast) {
  const result = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c, 0]))
  const categories = forecast?.budgetCategories?.length ? forecast.budgetCategories : DEFAULT_FORECAST.budgetCategories
  categories.forEach(cat => {
    cat.items.forEach(item => {
      const target = FORECAST_TO_EXPENSE_MAP[item.label]
      if (target) result[target] += item.amount || 0
    })
  })
  return result
}

// Resolves the "current" approved budget: frozen snapshot if confirmed, else live from Forecast.
export function resolveApprovedBudget(approvedBudget, forecast) {
  const live = budgetFromForecast(forecast)
  const isFrozen = !!approvedBudget?.frozen
  const budget = isFrozen ? { ...Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c, 0])), ...approvedBudget } : live
  return { budget, isFrozen, live }
}

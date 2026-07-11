import { EXPENSE_CATEGORIES, resolveApprovedBudget, inRange, isNonCashSponsorship } from './treasurerShared'

// Validated categorical palette (fixed order — see dataviz skill reference palette).
const CATEGORY_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834']
const OTHER_COLOR = '#9ca3af'

function monthKey(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}
function weekKey(dateStr) {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // back up to Monday
  return d.toISOString().slice(0, 10)
}
function weekLabel(key) {
  return `Wk ${new Date(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
}
function dayKey(dateStr) {
  return new Date(dateStr).toISOString().slice(0, 10)
}
function dayLabel(key) {
  return new Date(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// New clubs won't have two months of history for a while — rather than show
// nothing, fall back to weekly, then daily buckets so a trend still appears
// as soon as there are transactions on at least two different days.
// Cumulative balance is always computed over ALL history (so the running
// total is correct) even though only the last `displayLimit` buckets show.
function buildCashFlowPoints(transactions, keyFn, labelFn, displayLimit) {
  const bucket = {}
  transactions.forEach(t => {
    if (!t.date) return
    const key = keyFn(t.date)
    if (!bucket[key]) bucket[key] = { income: 0, expense: 0 }
    bucket[key][t.type === 'Income' ? 'income' : 'expense'] += t.amount || 0
  })
  const allKeys = Object.keys(bucket).sort()
  if (allKeys.length < 2) return null
  let running = 0
  const cumulative = {}
  allKeys.forEach(k => {
    running += (bucket[k].income || 0) - (bucket[k].expense || 0)
    cumulative[k] = running
  })
  return allKeys.slice(-displayLimit).map(k => ({ key: k, label: labelFn(k), value: cumulative[k] }))
}

function cashFlowSVG(points) {
  if (points.length < 2) return '<p style="font-size:11px;color:#9ca3af">Add transactions on at least two different days to see a trend.</p>'
  const W = 600, H = 130, padX = 12, padY = 14
  const values = points.map(p => p.value)
  const minV = Math.min(0, ...values)
  const maxV = Math.max(0, ...values, 1)
  const range = (maxV - minV) || 1
  const x = i => padX + (i / (points.length - 1)) * (W - padX * 2)
  const y = v => H - padY - ((v - minV) / range) * (H - padY * 2)
  const zeroY = y(0)
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ')
  const areaPath = `${linePath} L ${x(points.length - 1)} ${zeroY} L ${x(0)} ${zeroY} Z`
  const zeroLine = (minV < 0 && maxV > 0) ? `<line x1="${padX}" x2="${W - padX}" y1="${zeroY}" y2="${zeroY}" stroke="#c3c2b7" stroke-width="1" stroke-dasharray="3,3" />` : ''
  const dots = points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="4" fill="${p.value >= 0 ? '#16a34a' : '#ef4444'}" stroke="#fff" stroke-width="1.5" />`).join('')
  const labels = points.map((p, i) => `<div style="flex:1;text-align:center">${p.label}</div>`).join('')
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:110px" preserveAspectRatio="none">
    ${zeroLine}
    <path d="${areaPath}" fill="#005daa" fill-opacity="0.12" />
    <path d="${linePath}" fill="none" stroke="#005daa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    ${dots}
  </svg>
  <div style="display:flex;margin-top:4px;font-size:9px;color:#6b7a99">${labels}</div>`
}

function exportTreasurerReportPDF(d) {
  const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const rotaryYearStart = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1
  const logoUrl = `${window.location.origin}/rotaract-logo.png`
  const maxMonthVal = d.maxMonthVal || 1
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Treasurer Report</title>
<style>
  @page{size:A4;margin:16mm 14mm}
  *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:'Inter',sans-serif;color:#1a2236;max-width:800px;margin:0 auto;font-size:12px;line-height:1.4;padding-top:28px}
  .letterhead{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:3px solid #d4006d;margin-bottom:6px}
  .letterhead-left{display:flex;align-items:center;gap:14px}
  .letterhead-left img{width:52px;height:52px;object-fit:contain}
  .org-name{font-size:15px;font-weight:800;color:#1a2236}
  .org-sub{font-size:10.5px;color:#6b7a99;margin-top:1px}
  .org-badge{display:inline-block;margin-top:5px;background:#f8f0f4;color:#d4006d;font-size:9px;font-weight:700;padding:2px 9px;border-radius:10px;letter-spacing:.3px}
  .doc-meta{text-align:right;font-size:10px;color:#9ca3af;line-height:1.6}
  .doc-meta b{color:#1a2236;font-size:11px}
  .doc-title{text-align:center;margin:22px 0 26px}
  .doc-title h1{font-size:19px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#1a2236}
  .doc-title p{font-size:11px;color:#6b7a99;margin-top:3px}
  .section-title{font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#d4006d;margin:0 0 10px;padding-left:9px;border-left:3px solid #d4006d}
  .grid6{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
  .card{background:#f8f9fc;border-radius:10px;padding:14px 13px;border:1px solid #eaecf4;break-inside:avoid}
  .card-label{font-size:9.5px;color:#6b7a99;font-weight:600;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px}
  .card-val{font-size:20px;font-weight:800;line-height:1}
  .card-sub{font-size:9.5px;color:#9ca3af;margin-top:4px}
  .green{color:#16a34a}.red{color:#ef4444}.blue{color:#005daa}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .panel{background:#fff;border:1px solid #eaecf4;border-radius:10px;padding:18px;break-inside:avoid}
  .panel h3{font-size:12.5px;font-weight:700;margin-bottom:14px;color:#1a2236}
  .bars{display:flex;align-items:flex-end;justify-content:space-around;gap:8px;height:130px}
  .barcol{display:flex;flex-direction:column;align-items:center;gap:6px}
  .barpair{display:flex;align-items:flex-end;gap:3px;height:100px}
  .bar{width:15px;border-radius:3px 3px 0 0}
  .barlabel{font-size:9px;color:#6b7a99}
  table{width:100%;border-collapse:collapse;font-size:10.5px}
  th{text-align:left;color:#6b7a99;font-weight:600;text-transform:uppercase;font-size:9px;padding:6px 0;border-bottom:1px solid #eaecf4}
  td{padding:6px 0;border-bottom:1px solid #f3f4f6}
  td.r{text-align:right}
  tr{break-inside:avoid}
  .legend-row{display:flex;justify-content:space-between;align-items:center;font-size:10.5px;padding:4px 0}
  .dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:6px}
  .util-row{margin-bottom:9px;break-inside:avoid}
  .util-top{display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:3px}
  .util-bg{height:6px;background:#eee;border-radius:6px;overflow:hidden}
  .util-bar{height:100%;border-radius:6px}
  .signoff{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:44px;break-inside:avoid}
  .sign-line{border-top:1px solid #1a2236;padding-top:6px;font-size:10px;color:#6b7a99}
  .sign-line b{display:block;color:#1a2236;font-size:11px;margin-bottom:2px}
  .ftr{margin-top:28px;padding-top:12px;border-top:1px solid #eaecf4;display:flex;justify-content:space-between;font-size:9.5px;color:#9ca3af}
</style></head><body>

<div class="letterhead">
  <div class="letterhead-left">
    <img src="${logoUrl}" onerror="this.style.display='none'" />
    <div>
      <div class="org-name">Rotaract Club of Bengaluru BTM</div>
      <div class="org-sub">Rotary International District 3191 · RI Club ID 8826232</div>
      <span class="org-badge">Rotary Year ${rotaryYearStart}–${rotaryYearStart + 1}</span>
    </div>
  </div>
  <div class="doc-meta">
    <div>Generated on</div>
    <div><b>${now}</b></div>
  </div>
</div>

<div class="doc-title">
  <h1>Treasurer's Financial Report</h1>
  <p>A consolidated overview of membership, revenue, expenses and budget health</p>
</div>

<div class="section-title">Key Figures</div>
<div class="grid6">
  <div class="card"><div class="card-label">Members</div><div class="card-val">${d.membersCount}</div><div class="card-sub">${d.workingCount} Working · ${d.studentCount} Student</div></div>
  <div class="card"><div class="card-label">Revenue</div><div class="card-val green">₹${d.totalRevenue.toLocaleString()}</div><div class="card-sub">Expected ₹${d.expectedRevenue.toLocaleString()}</div></div>
  <div class="card"><div class="card-label">Expenses</div><div class="card-val red">₹${d.totalExpenses.toLocaleString()}</div></div>
  <div class="card"><div class="card-label">Balance</div><div class="card-val ${d.balance >= 0 ? 'green' : 'red'}">${d.balance >= 0 ? '' : '-'}₹${Math.abs(d.balance).toLocaleString()}</div></div>
  <div class="card"><div class="card-label">Collection</div><div class="card-val blue">${d.collectionPct}%</div><div class="card-sub">₹${d.collectedDues.toLocaleString()} / ₹${d.expectedRevenue.toLocaleString()}</div></div>
  <div class="card"><div class="card-label">Budget</div><div class="card-val">₹${d.totalApprovedBudget.toLocaleString()}</div><div class="card-sub">${d.isFrozen ? 'Frozen' : 'Live'} · ₹${d.totalSpent.toLocaleString()} spent</div></div>
</div>

<div class="section-title">Revenue &amp; Collections</div>
<div class="grid2">
  <div class="panel">
    <h3>Revenue vs Expenses</h3>
    ${d.months.length === 0 ? '<p style="font-size:11px;color:#9ca3af">No transactions recorded yet.</p>' : `<div class="bars">
      ${d.months.map(key => {
        const m = d.monthMap[key]
        const incH = Math.max(Math.round((m.income / maxMonthVal) * 100), m.income > 0 ? 3 : 0)
        const expH = Math.max(Math.round((m.expense / maxMonthVal) * 100), m.expense > 0 ? 3 : 0)
        return `<div class="barcol"><div class="barpair">
          <div class="bar" style="height:${incH}%;background:#16a34a"></div>
          <div class="bar" style="height:${expH}%;background:#ef4444"></div>
        </div><span class="barlabel">${monthLabel(key)}</span></div>`
      }).join('')}
    </div>`}
  </div>
  <div class="panel">
    <h3>Membership Collection</h3>
    <div class="legend-row"><span><span class="dot" style="background:#16a34a"></span>Paid</span><b>${d.paidCount}</b></div>
    <div class="legend-row"><span><span class="dot" style="background:#f59e0b"></span>Partial</span><b>${d.partialCount}</b></div>
    <div class="legend-row"><span><span class="dot" style="background:#ef4444"></span>Pending</span><b>${d.pendingCount}</b></div>
  </div>
</div>

<div class="panel" style="margin-bottom:24px">
  <h3>Running Balance / Cash Flow</h3>
  ${cashFlowSVG(d.cashFlowPoints || [])}
</div>

<div class="section-title">Budget Health</div>
<div class="grid2">
  <div class="panel">
    <h3>Budget Utilization</h3>
    ${d.utilizationRows.length === 0 ? '<p style="font-size:11px;color:#9ca3af">No approved budget yet.</p>' : d.utilizationRows.map(r => `
      <div class="util-row">
        <div class="util-top"><span>${r.label}</span><b style="color:${r.over ? '#ef4444' : '#6b7a99'}">${r.pct}%</b></div>
        <div class="util-bg"><div class="util-bar" style="width:${Math.min(r.pct, 100)}%;background:${r.over ? '#ef4444' : '#16a34a'}"></div></div>
      </div>`).join('')}
  </div>
  <div class="panel">
    <h3>Expenses by Budget Head</h3>
    ${d.pieStops.length === 0 ? '<p style="font-size:11px;color:#9ca3af">No expenses recorded yet.</p>' : d.pieStops.map(s => `
      <div class="legend-row"><span><span class="dot" style="background:${s.color}"></span>${s.label}</span><b>${Math.round(s.pct)}%</b></div>`).join('')}
  </div>
</div>

${d.budgetSummaryRows.length > 0 ? `<div class="section-title">Budget Summary</div>
<div class="panel" style="margin-bottom:24px">
<table><thead><tr><th>Budget Head</th><th style="text-align:right">Budget</th><th style="text-align:right">Spent</th><th style="text-align:right">Remaining</th></tr></thead>
<tbody>${d.budgetSummaryRows.map(r => `<tr><td>${r.label}</td><td class="r">₹${r.approved.toLocaleString()}</td><td class="r">₹${r.spent.toLocaleString()}</td><td class="r" style="color:${(r.approved - r.spent) >= 0 ? '#16a34a' : '#ef4444'}">₹${Math.abs(r.approved - r.spent).toLocaleString()}</td></tr>`).join('')}</tbody></table>
</div>` : ''}

<div class="section-title">Outstanding Items</div>
<div class="grid2">
  <div class="panel">
    <h3>Pending Dues</h3>
    <table><tbody>${d.pendingDues.length === 0 ? '<tr><td style="color:#9ca3af">Everyone\'s paid up.</td></tr>' : d.pendingDues.map(m => `<tr><td>${m.name}</td><td class="r" style="color:#d97706;font-weight:700">₹${m.pending.toLocaleString()}</td></tr>`).join('')}</tbody></table>
  </div>
  <div class="panel">
    <h3>Pending Reimbursements</h3>
    <table><tbody>${d.pendingReimbursements.length === 0 ? '<tr><td style="color:#9ca3af">Nothing pending.</td></tr>' : d.pendingReimbursements.map(t => `<tr><td>${t.description || t.voucherNo || '—'}<br><span style="color:#9ca3af;font-size:9px">${t.paidBy || 'Unknown'}</span></td><td class="r" style="color:#d97706;font-weight:700">₹${(t.amount || 0).toLocaleString()}</td></tr>`).join('')}</tbody></table>
  </div>
</div>

<div class="signoff">
  <div class="sign-line"><b>${d.treasurerName || ' '}</b>Prepared by — Treasurer &nbsp;·&nbsp; Date: ${now}</div>
  <div class="sign-line"><b>${d.presidentName || ' '}</b>Approved by — President &nbsp;·&nbsp; Date: ${now}</div>
</div>

<div class="ftr"><p>Rotaract Club of Bengaluru BTM · Create. Lead. Inspire.</p><p>Confidential — For Club Use Only</p></div>
</body></html>`
  const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.onload = () => w.print()
}

// Single-series running balance — thin line, rounded data-ends, zero-baseline, hover via <title>.
function CashFlowChart({ points }) {
  if (points.length < 2) {
    return <p className="text-sm text-rotary-slate dark:text-white/30 text-center py-14">Add transactions on at least two different days to see a trend.</p>
  }
  const W = 600, H = 160, padX = 12, padY = 16
  const values = points.map(p => p.value)
  const minV = Math.min(0, ...values)
  const maxV = Math.max(0, ...values, 1)
  const range = (maxV - minV) || 1
  const x = i => padX + (i / (points.length - 1)) * (W - padX * 2)
  const y = v => H - padY - ((v - minV) / range) * (H - padY * 2)
  const zeroY = y(0)
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ')
  const areaPath = `${linePath} L ${x(points.length - 1)} ${zeroY} L ${x(0)} ${zeroY} Z`
  const last = points[points.length - 1]
  const lastPositive = last.value >= 0

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cashFlowFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#005daa" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#005daa" stopOpacity="0" />
          </linearGradient>
        </defs>
        {minV < 0 && maxV > 0 && (
          <line x1={padX} x2={W - padX} y1={zeroY} y2={zeroY} stroke="#c3c2b7" strokeWidth="1" strokeDasharray="3,3" />
        )}
        <path d={areaPath} fill="url(#cashFlowFill)" />
        <path d={linePath} fill="none" stroke="#005daa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={p.key} cx={x(i)} cy={y(p.value)} r="4" fill={p.value >= 0 ? '#16a34a' : '#ef4444'} stroke="#fff" strokeWidth="1.5">
            <title>{`${p.label}: ${p.value >= 0 ? '' : '-'}₹${Math.abs(p.value).toLocaleString()}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between mt-1 px-1">
        {points.map(p => <span key={p.key} className="text-[10px] text-rotary-slate dark:text-white/40">{p.label}</span>)}
      </div>
      <p className="text-xs text-rotary-slate dark:text-white/40 mt-2">
        Current balance: <span className={`font-semibold ${lastPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{lastPositive ? '' : '-'}₹{Math.abs(last.value).toLocaleString()}</span>
      </p>
    </div>
  )
}

function StatTile({ label, value, sub, color = 'text-rotary-charcoal dark:text-white' }) {
  return (
    <div className="bg-white dark:bg-rotary-navy-light rounded-xl p-5 border border-gray-100 dark:border-white/5">
      <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-rotary-slate dark:text-white/40 mt-1">{sub}</p>}
    </div>
  )
}

export default function TreasurerReports({ members, leaders, transactions, eventLedger = [], sponsorships = [], forecast, approvedBudget, dateRange = {} }) {
  // Respect the same date-range filter every other tab on this page uses —
  // otherwise this "consolidated overview" silently shows all-time figures
  // while everything else on screen reflects the selected range, which reads
  // as a mismatch. Membership dues/collection stay all-time regardless (a
  // due either exists or doesn't — it isn't a dated flow), matching how the
  // Balance Sheet tab treats "Total Dues" too.
  const { from, to } = dateRange
  const filteredTransactions = (from || to) ? transactions.filter(t => inRange(t.date, from, to)) : transactions
  const filteredEventLedger = (from || to) ? eventLedger.filter(e => inRange(e.date, from, to)) : eventLedger
  const filteredSponsorships = (from || to) ? sponsorships.filter(s => inRange(s.date, from, to)) : sponsorships

  // ── Members ──
  const workingCount = members.filter(m => leaders.find(l => l.name?.toLowerCase() === m.name?.toLowerCase())?.memberType === 'working').length
  const studentCount = members.length - workingCount
  const expectedRevenue = members.reduce((s, m) => s + (m.annualDue || 0), 0)
  const collectedDues = members.reduce((s, m) => s + (m.paid || 0), 0)
  const collectionPct = expectedRevenue > 0 ? Math.round((collectedDues / expectedRevenue) * 100) : 0

  // ── Revenue & Expenses ──
  // Matches the same comprehensive formula used on the Overview cards and
  // Balance Sheet tab: revenue = dues collected + sponsorships + event ticket
  // income + other transaction income; expenses = event expenses + other
  // transaction expenses. Written-off transactions and self-funded event
  // expenses are excluded — the club never actually paid that money out (a
  // member covered it as a donation instead, tracked separately as a
  // sponsorship), so it shouldn't count as real spend or income.
  const totalTransactionIncome = filteredTransactions.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amount || 0), 0)
  const totalTransactionExpense = filteredTransactions.filter(t => t.type === 'Expense' && t.reimbursableStatus !== 'Written Off').reduce((s, t) => s + (t.amount || 0), 0)
  const cashSponsorships = filteredSponsorships.filter(s => !isNonCashSponsorship(s)).reduce((s, x) => s + (x.amount || 0), 0)
  const totalEventIncome = filteredEventLedger.reduce((s, e) => s + (e.income || 0), 0)
  const totalEventExpenses = filteredEventLedger.reduce((s, e) => s + (e.expenses || []).filter(x => !x.linkedSponsorshipId).reduce((ss, x) => ss + (x.amount || 0), 0), 0)
  const totalRevenue = collectedDues + cashSponsorships + totalEventIncome + totalTransactionIncome
  const totalExpenses = totalEventExpenses + totalTransactionExpense
  const balance = totalRevenue - totalExpenses

  // ── Budget ──
  const { budget, isFrozen } = resolveApprovedBudget(approvedBudget, forecast)
  const actualByCategory = EXPENSE_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = filteredTransactions.filter(t => t.type === 'Expense' && t.budgetHead === cat && t.reimbursableStatus !== 'Written Off').reduce((s, t) => s + (t.amount || 0), 0)
    return acc
  }, {})
  const totalApprovedBudget = EXPENSE_CATEGORIES.reduce((s, c) => s + (budget[c] || 0), 0)
  const totalSpent = EXPENSE_CATEGORIES.reduce((s, c) => s + (actualByCategory[c] || 0), 0)

  // Excludes written-off expenses (see note above) from anywhere expense
  // amounts get aggregated below — trend charts and cash flow shouldn't
  // treat them as real spend either.
  const spendableTransactions = filteredTransactions.filter(t => t.type !== 'Expense' || t.reimbursableStatus !== 'Written Off')

  // ── Monthly trend (last 6 months present in data) ──
  const monthMap = {}
  spendableTransactions.forEach(t => {
    if (!t.date) return
    const key = monthKey(t.date)
    if (!monthMap[key]) monthMap[key] = { income: 0, expense: 0 }
    monthMap[key][t.type === 'Income' ? 'income' : 'expense'] += t.amount || 0
  })
  const months = Object.keys(monthMap).sort().slice(-6)
  const maxMonthVal = Math.max(1, ...months.flatMap(k => [monthMap[k].income, monthMap[k].expense]))

  // ── Running balance / cash-flow trend ──
  // Prefer monthly buckets, but a new club won't have two months of history
  // for a while — fall back to weekly, then daily, so a trend still shows up
  // as soon as there are transactions on two different days.
  let cashFlowPoints = buildCashFlowPoints(spendableTransactions, monthKey, monthLabel, 6)
  let cashFlowGranularity = 'month'
  if (!cashFlowPoints) {
    cashFlowPoints = buildCashFlowPoints(spendableTransactions, weekKey, weekLabel, 8)
    cashFlowGranularity = 'week'
  }
  if (!cashFlowPoints) {
    cashFlowPoints = buildCashFlowPoints(spendableTransactions, dayKey, dayLabel, 8)
    cashFlowGranularity = 'day'
  }
  if (!cashFlowPoints) {
    cashFlowPoints = []
    cashFlowGranularity = null
  }

  // ── Membership collection donut ──
  const paidCount = members.filter(m => m.paid >= m.annualDue && m.annualDue > 0).length
  const partialCount = members.filter(m => m.paid > 0 && m.paid < m.annualDue).length
  const pendingCount = members.length - paidCount - partialCount
  const totalMembers = members.length || 1
  const paidPct = Math.round((paidCount / totalMembers) * 100)
  const partialPct = Math.round((partialCount / totalMembers) * 100)
  const donutGradient = `conic-gradient(#16a34a 0% ${paidPct}%, #f59e0b ${paidPct}% ${paidPct + partialPct}%, #ef4444 ${paidPct + partialPct}% 100%)`

  // ── Budget utilization bars (only categories with an approved amount) ──
  const utilizationRows = EXPENSE_CATEGORIES
    .map(cat => ({ label: cat, approved: budget[cat] || 0, spent: actualByCategory[cat] || 0 }))
    .filter(r => r.approved > 0)
    .map(r => ({ ...r, pct: Math.round((r.spent / r.approved) * 100), over: r.spent > r.approved }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8)

  // ── Expenses by budget head (pie) — top 7 + Other ──
  const catEntries = EXPENSE_CATEGORIES
    .map(c => ({ label: c, value: actualByCategory[c] || 0 }))
    .filter(e => e.value > 0)
    .sort((a, b) => b.value - a.value)
  const top = catEntries.slice(0, 7)
  const otherValue = catEntries.slice(7).reduce((s, e) => s + e.value, 0)
  const pieEntries = otherValue > 0 ? [...top, { label: 'Other', value: otherValue }] : top
  const totalPieValue = pieEntries.reduce((s, e) => s + e.value, 0) || 1
  let cursor = 0
  const pieStops = pieEntries.map((e, i) => {
    const pct = (e.value / totalPieValue) * 100
    const start = cursor
    cursor += pct
    return { ...e, pct, start, end: cursor, color: e.label === 'Other' ? OTHER_COLOR : CATEGORY_COLORS[i % CATEGORY_COLORS.length] }
  })
  const pieGradient = pieStops.length ? `conic-gradient(${pieStops.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ')})` : null

  // ── Tables ──
  const pendingDues = members
    .filter(m => (m.paid || 0) < (m.annualDue || 0))
    .map(m => ({ ...m, pending: (m.annualDue || 0) - (m.paid || 0) }))
    .sort((a, b) => b.pending - a.pending)

  const pendingReimbursements = transactions
    .filter(t => t.reimbursableStatus === 'Pending')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const totalPendingReimbursement = pendingReimbursements.reduce((s, t) => s + (t.amount || 0), 0)

  const budgetSummaryRows = EXPENSE_CATEGORIES
    .map(cat => ({ label: cat, approved: budget[cat] || 0, spent: actualByCategory[cat] || 0 }))
    .filter(r => r.approved > 0 || r.spent > 0)
    .sort((a, b) => b.spent - a.spent)

  const treasurerName = leaders.find(l => l.role?.toLowerCase().includes('treasurer'))?.name || ''
  const presidentName = leaders.find(l => {
    const r = `${l.role || ''} ${l.role2 || ''}`.toLowerCase()
    return r.includes('president') && !r.includes('vice') && !r.includes('past') && !r.includes('ipp')
  })?.name || ''

  const handleExportPDF = () => exportTreasurerReportPDF({
    membersCount: members.length, workingCount, studentCount, expectedRevenue, collectedDues, collectionPct,
    totalRevenue, totalExpenses, balance, totalApprovedBudget, totalSpent, isFrozen,
    months, monthMap, maxMonthVal, cashFlowPoints, cashFlowGranularity,
    paidCount, partialCount, pendingCount,
    utilizationRows, pieStops, budgetSummaryRows, pendingDues, pendingReimbursements,
    treasurerName, presidentName,
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg">Treasurer Report</h2>
          <p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">A single-page overview of members, revenue, expenses and budget health</p>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-rotary-charcoal dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export PDF
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatTile label="Members" value={members.length} sub={`${workingCount} Working · ${studentCount} Student`} />
        <StatTile label="Revenue" value={`₹${totalRevenue.toLocaleString()}`} sub={`Expected ₹${expectedRevenue.toLocaleString()}`} color="text-green-600 dark:text-green-400" />
        <StatTile label="Expenses" value={`₹${totalExpenses.toLocaleString()}`} color="text-red-500" />
        <StatTile label="Balance" value={`${balance >= 0 ? '' : '-'}₹${Math.abs(balance).toLocaleString()}`} color={balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'} />
        <StatTile label="Collection" value={`${collectionPct}%`} sub={`₹${collectedDues.toLocaleString()} / ₹${expectedRevenue.toLocaleString()}`} color="text-rotary-blue" />
        <StatTile label="Budget" value={`₹${totalApprovedBudget.toLocaleString()}`} sub={`${isFrozen ? 'Frozen' : 'Live'} · ₹${totalSpent.toLocaleString()} spent`} />
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Revenue vs Expenses</h3>
            <div className="flex items-center gap-3 text-xs text-rotary-slate dark:text-white/50">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Income</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Expense</span>
            </div>
          </div>
          {months.length === 0 ? (
            <p className="text-sm text-rotary-slate dark:text-white/30 text-center py-14">No transactions recorded yet.</p>
          ) : (
            <div className="flex items-end justify-around gap-2 h-48">
              {months.map(key => {
                const m = monthMap[key]
                const incH = Math.max(Math.round((m.income / maxMonthVal) * 100), m.income > 0 ? 2 : 0)
                const expH = Math.max(Math.round((m.expense / maxMonthVal) * 100), m.expense > 0 ? 2 : 0)
                return (
                  <div key={key} className="flex flex-col items-center gap-2">
                    <div className="flex items-end gap-1 h-36">
                      <div title={`Income: ₹${m.income.toLocaleString()}`} className="w-4 sm:w-6 bg-green-500 rounded-t-md" style={{ height: `${incH}%` }} />
                      <div title={`Expense: ₹${m.expense.toLocaleString()}`} className="w-4 sm:w-6 bg-red-500 rounded-t-md" style={{ height: `${expH}%` }} />
                    </div>
                    <span className="text-[10px] text-rotary-slate dark:text-white/40">{monthLabel(key)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Membership Collection</h3>
          {members.length === 0 ? (
            <p className="text-sm text-rotary-slate dark:text-white/30 text-center py-14">No members yet.</p>
          ) : (
            <div className="flex items-center gap-6 flex-wrap">
              <div className="relative w-32 h-32 rounded-full shrink-0" style={{ background: donutGradient }} title={`Paid: ${paidCount} · Partial: ${partialCount} · Pending: ${pendingCount}`}>
                <div className="absolute inset-3 rounded-full bg-white dark:bg-rotary-navy-light flex flex-col items-center justify-center">
                  <span className="text-lg font-display font-bold text-rotary-charcoal dark:text-white">{paidPct}%</span>
                  <span className="text-[10px] text-rotary-slate dark:text-white/40">Paid</span>
                </div>
              </div>
              <div className="space-y-2 text-sm min-w-[140px]">
                <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Paid</span><span className="font-semibold">{paidCount}</span></div>
                <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />Partial</span><span className="font-semibold">{partialCount}</span></div>
                <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Pending</span><span className="font-semibold">{pendingCount}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-sm">Running Balance / Cash Flow</h3>
          {cashFlowGranularity && cashFlowGranularity !== 'month' && (
            <span className="text-[10px] uppercase tracking-wider text-rotary-slate dark:text-white/30">By {cashFlowGranularity}</span>
          )}
        </div>
        <CashFlowChart points={cashFlowPoints} />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Budget Utilization</h3>
          {utilizationRows.length === 0 ? (
            <p className="text-sm text-rotary-slate dark:text-white/30 text-center py-14">No approved budget yet — set it up in Forecast, then freeze it in Budget vs Actual.</p>
          ) : (
            <div className="space-y-3">
              {utilizationRows.map(r => (
                <div key={r.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-rotary-charcoal dark:text-white/80">{r.label}</span>
                    <span className={r.over ? 'text-red-500 font-semibold' : 'text-rotary-slate dark:text-white/40'}>{r.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden" title={`₹${r.spent.toLocaleString()} of ₹${r.approved.toLocaleString()}`}>
                    <div className={`h-full rounded-full ${r.over ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(r.pct, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Expenses by Budget Head</h3>
          {!pieGradient ? (
            <p className="text-sm text-rotary-slate dark:text-white/30 text-center py-14">No expenses recorded yet.</p>
          ) : (
            <div className="flex items-center gap-6 flex-wrap">
              <div className="w-32 h-32 rounded-full shrink-0" style={{ background: pieGradient }} />
              <div className="space-y-1.5 text-xs flex-1 min-w-[160px]">
                {pieStops.map(s => (
                  <div key={s.label} className="flex items-center justify-between gap-3" title={`₹${s.value.toLocaleString()}`}>
                    <span className="flex items-center gap-1.5 truncate text-rotary-charcoal dark:text-white/70">
                      <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <span className="font-semibold shrink-0">{Math.round(s.pct)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Budget summary table */}
      {budgetSummaryRows.length > 0 && (
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
            <h3 className="font-display font-semibold text-sm">Budget Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Budget Head</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Budget</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Spent</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {budgetSummaryRows.map(r => {
                  const remaining = r.approved - r.spent
                  return (
                    <tr key={r.label} className="border-b border-gray-50 dark:border-white/[0.03] last:border-0">
                      <td className="px-5 py-3 font-medium">{r.label}</td>
                      <td className="px-5 py-3 text-right">₹{r.approved.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right">₹{r.spent.toLocaleString()}</td>
                      <td className={`px-5 py-3 text-right font-medium ${remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{remaining >= 0 ? '' : '-'}₹{Math.abs(remaining).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 3: tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm">Pending Dues</h3>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">₹{pendingDues.reduce((s, m) => s + m.pending, 0).toLocaleString()}</span>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {pendingDues.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 dark:border-white/[0.03] last:border-0">
                    <td className="px-5 py-3 font-medium">{m.name}</td>
                    <td className="px-5 py-3 text-right text-amber-600 dark:text-amber-400 font-semibold">₹{m.pending.toLocaleString()}</td>
                  </tr>
                ))}
                {pendingDues.length === 0 && (
                  <tr><td className="px-5 py-10 text-center text-rotary-slate dark:text-white/30">Everyone's paid up 🎉</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm">Pending Reimbursements</h3>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">₹{totalPendingReimbursement.toLocaleString()}</span>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {pendingReimbursements.map(t => (
                  <tr key={t.id} className="border-b border-gray-50 dark:border-white/[0.03] last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium">{t.description || t.voucherNo || '—'}</p>
                      <p className="text-xs text-rotary-slate dark:text-white/40">{t.paidBy || 'Unknown'}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-amber-600 dark:text-amber-400 font-semibold">₹{(t.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {pendingReimbursements.length === 0 && (
                  <tr><td className="px-5 py-10 text-center text-rotary-slate dark:text-white/30">Nothing pending.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

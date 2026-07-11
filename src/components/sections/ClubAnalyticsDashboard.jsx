import { motion } from 'framer-motion'
import { useCollection, useDocument } from '../../hooks/useFirestore'
import { EXPENSE_CATEGORIES, DEFAULT_FORECAST, resolveApprovedBudget, isNonCashSponsorship } from './treasurerShared'

function exportToPdf(d) {
  const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const rotaryYearStart = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1
  const logoUrl = `${window.location.origin}/rotaract-logo.png`
  const { stats, trend, insights, health, avenueStats = [], monthlyStats = [] } = d

  const maxBarTotal = Math.max(...monthlyStats.map(m => m.projects + m.meetings + m.events), 1)
  const maxAvenueProjects = Math.max(...avenueStats.map(a => a.projects), 1)

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Club Analytics Report</title>
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
  .grid5{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:24px}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
  .card{background:#f8f9fc;border-radius:10px;padding:14px 13px;border:1px solid #eaecf4;break-inside:avoid}
  .card-label{font-size:9.5px;color:#6b7a99;font-weight:600;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px}
  .card-val{font-size:20px;font-weight:800;line-height:1}
  .card-sub{font-size:9.5px;color:#9ca3af;margin-top:4px}
  .card-val.blue{color:#005daa}.card-val.pink{color:#d4006d}.card-val.green{color:#16a34a}.card-val.amber{color:#d97706}.card-val.purple{color:#7c3aed}.card-val.red{color:#ef4444}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .panel{background:#fff;border:1px solid #eaecf4;border-radius:10px;padding:18px;break-inside:avoid}
  .panel h3{font-size:12.5px;font-weight:700;margin-bottom:14px;color:#1a2236}
  .trend-row{display:flex;align-items:center;gap:12px;margin-bottom:10px;font-size:11px}
  .trend-month{width:56px;color:#6b7a99;font-weight:500}
  .trend-bar-bg{flex:1;height:6px;background:#eee;border-radius:6px;overflow:hidden}
  .trend-bar{height:100%;border-radius:6px;background:#f59e0b}
  .trend-pct{width:34px;text-align:right;font-weight:700;color:#1a2236;font-size:11px}
  .ins-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:11.5px}
  .ins-row:last-child{border-bottom:none}
  .ins-label{color:#6b7a99}.ins-val{font-weight:700;color:#1a2236}
  .ins-val.alert{color:#d4006d}
  .health{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px;display:flex;align-items:center;gap:18px;break-inside:avoid}
  .health-circle{width:52px;height:52px;border-radius:50%;color:#fff;font-size:19px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .bars{display:flex;align-items:flex-end;gap:5px;height:90px}
  .barcol{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:90px;gap:4px}
  .bar{width:100%;border-radius:2px 2px 0 0}
  .avenue-row{margin-bottom:10px}
  .avenue-top{display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:4px}
  .avenue-bg{height:5px;background:#eee;border-radius:4px;overflow:hidden}
  .avenue-bar{height:100%;border-radius:4px}
  .signoff{margin-top:36px;font-size:10px;color:#9ca3af;text-align:center;break-inside:avoid}
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
  <h1>Club Analytics Report</h1>
  <p>Month-on-month overview of membership, attendance, projects and club health</p>
</div>

<div class="section-title">Key Figures</div>
<div class="grid5">${stats.map(s => `<div class="card"><div class="card-label">${s.label}</div><div class="card-val ${s.accent}">${s.value}</div></div>`).join('')}</div>

${d.canSeeTreasury ? `
<div class="section-title">Treasury Snapshot</div>
<div class="grid4">
  <div class="card"><div class="card-label">Revenue</div><div class="card-val green">₹${d.totalRevenue.toLocaleString()}</div></div>
  <div class="card"><div class="card-label">Expenses</div><div class="card-val red">₹${d.totalExpenses.toLocaleString()}</div></div>
  <div class="card"><div class="card-label">Balance</div><div class="card-val ${d.netBalance >= 0 ? '' : 'red'}">${d.netBalance >= 0 ? '' : '-'}₹${Math.abs(d.netBalance).toLocaleString()}</div></div>
  <div class="card"><div class="card-label">Budget Used</div><div class="card-val blue">${d.budgetUtilizationPct}%</div><div class="card-sub">₹${d.totalSpentOnBudget.toLocaleString()} / ₹${d.totalApprovedBudget.toLocaleString()}</div></div>
</div>
<div class="panel" style="margin-bottom:24px">
  <h3>Membership Dues Collection</h3>
  <div class="avenue-row" style="margin-bottom:0">
    <div class="avenue-top"><span style="color:#6b7a99">Collected</span><b>${d.duesCollectionPct}% &nbsp;·&nbsp; ₹${d.collectedDues.toLocaleString()} / ₹${d.expectedDues.toLocaleString()}</b></div>
    <div class="avenue-bg"><div class="avenue-bar" style="width:${Math.min(d.duesCollectionPct, 100)}%;background:#005daa"></div></div>
  </div>
</div>` : ''}

<div class="section-title">Engagement</div>
<div class="grid2">
<div class="panel"><h3>Attendance Trend</h3>${trend.length === 0 ? '<p style="font-size:11px;color:#9ca3af">No meeting data yet.</p>' : trend.map(t => `<div class="trend-row"><span class="trend-month">${t.month}</span><div class="trend-bar-bg"><div class="trend-bar" style="width:${t.pct}%"></div></div><span class="trend-pct">${t.pct}%</span></div>`).join('')}</div>
<div class="panel"><h3>Club Insights</h3>${insights.map(r => `<div class="ins-row"><span class="ins-label">${r.label}</span><span class="ins-val ${r.alert ? 'alert' : ''}">${r.value}</span></div>`).join('')}</div>
</div>

<div class="health" style="margin-bottom:24px"><div class="health-circle" style="background:${health.color}">${health.score}</div><div><h4 style="font-size:13px;font-weight:700;margin-bottom:2px;">Club Health Score · ${health.title}</h4><p style="font-size:10.5px;color:#6b7a99">${health.desc}</p></div></div>

<div class="section-title">Activity Breakdown</div>
<div class="grid2">
<div class="panel"><h3>Month-on-Month Activity</h3>
<div class="bars">
${monthlyStats.map(m => {
  const total = m.projects + m.meetings + m.events
  const h = Math.max(Math.round((total / maxBarTotal) * 100), total > 0 ? 4 : 0)
  const monthIndex = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'].indexOf(m.month)
  const year = monthIndex >= 6 ? rotaryYearStart : rotaryYearStart + 1
  const monthNum = monthIndex >= 6 ? monthIndex - 5 : monthIndex + 7
  const isPast = new Date(`${year}-${String(monthNum).padStart(2,'0')}-01`) <= new Date()
  return `<div class="barcol">
    <div class="bar" style="height:${h}%;background:${isPast ? 'linear-gradient(to top,#005daa,#d4006d)' : '#e5e7eb'}"></div>
    <span style="font-size:8px;color:${isPast ? '#1a2236' : '#ccc'}">${m.month}</span>
  </div>`
}).join('')}
</div>
</div>
<div class="panel"><h3>Avenue-wise Activity</h3>
${avenueStats.length === 0 ? '<p style="font-size:11px;color:#9ca3af">No project data yet.</p>' : avenueStats.map(a => {
  const pct = Math.round((a.projects / maxAvenueProjects) * 100)
  return `<div class="avenue-row">
    <div class="avenue-top"><span style="color:#6b7a99">${a.avenue.replace(' Service','').replace(' Development',' dev.')}</span><b>${a.projects}</b></div>
    <div class="avenue-bg"><div class="avenue-bar" style="width:${pct}%;background:${a.color}"></div></div>
  </div>`
}).join('')}
</div>
</div>

<div class="signoff">Prepared for circulation to all club members · ${now}</div>
<div class="ftr"><p>Rotaract Club of Bengaluru BTM · Create. Lead. Inspire.</p><p>Confidential — For Club Use Only</p></div>
</body></html>`
  const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.onload = () => w.print()
}

function TrendIcon({ color = '#6b7a99' }) {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" fill="none" className="opacity-30">
      <path d="M1 14 L7 9 L13 11 L19 4 L27 1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ClubAnalyticsDashboard({ onBack, isAdmin, permissions }) {
  const { data: leaders = [] }      = useCollection('leaders')
  const { data: projects = [] }     = useCollection('projects')
  const { data: meetings = [] }     = useCollection('attendance_meetings')
  const { data: moms = [] }         = useCollection('moms')
  const { data: sponsorships = [] } = useCollection('treasurer_sponsorships')
  const { data: treasMembers = [] } = useCollection('treasurer_members')
  const { data: events = [] }       = useCollection('events')
  const { data: transactions = [] } = useCollection('treasurer_transactions')
  const { data: forecast }         = useDocument('settings', 'annual_forecast', DEFAULT_FORECAST)
  const { data: approvedBudget }   = useDocument('settings', 'approved_budget', Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c, 0])))

  // Treasury snapshot — only shown to Super Admin / Treasurer (permissions
  // gated in App.jsx passes the full permissions object down for this check).
  const canSeeTreasury = !!(permissions?.isSuperAdmin || permissions?.treasurer)

  const totalMembers   = leaders.length
  const totalProjects  = projects.length

  const leaderIds = new Set(leaders.map(l => l.id))

  const avgAttendance = (() => {
    if (!meetings.length || !leaders.length) return 0
    const total = meetings.reduce((sum, m) => {
      const presentCount = (m.presentIds || []).filter(id => leaderIds.has(id)).length
      return sum + (presentCount / leaders.length) * 100
    }, 0)
    return Math.round(total / meetings.length)
  })()

  const volunteerHours = (() => {
    const a = projects.reduce((s, p) => s + Number(p.volunteerHours || 0), 0)
    const b = events.reduce((s, e) => s + Number(e.volunteerHours || 0), 0)
    return a + b
  })()

  // Excludes sponsorships auto-generated from a written-off transaction or a
  // self-funded event expense — those never brought actual cash in, so
  // counting them here would overstate what the club really raised.
  const fundsRaised = sponsorships.filter(sp => !isNonCashSponsorship(sp)).reduce((s, sp) => s + Number(sp.amount || 0), 0)

  // ── Treasury snapshot (mirrors TreasurerReports.jsx) ────────────────────
  const totalRevenue  = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amount || 0), 0)
  // Written-off expenses never actually left club funds (a member covered
  // them as a donation, tracked separately as a sponsorship) — exclude them
  // here too, matching the Treasurer module's Balance definition.
  const totalExpenses = transactions.filter(t => t.type === 'Expense' && t.reimbursableStatus !== 'Written Off').reduce((s, t) => s + (t.amount || 0), 0)
  const netBalance     = totalRevenue - totalExpenses
  const { budget: approvedBudgetByCategory } = resolveApprovedBudget(approvedBudget, forecast)
  const totalApprovedBudget = EXPENSE_CATEGORIES.reduce((s, c) => s + (approvedBudgetByCategory[c] || 0), 0)
  const totalSpentOnBudget  = EXPENSE_CATEGORIES.reduce((s, c) =>
    s + transactions.filter(t => t.type === 'Expense' && t.budgetHead === c).reduce((sum, t) => sum + (t.amount || 0), 0), 0)
  const budgetUtilizationPct = totalApprovedBudget > 0 ? Math.round((totalSpentOnBudget / totalApprovedBudget) * 100) : 0
  const expectedDues   = treasMembers.reduce((s, m) => s + (m.annualDue || 0), 0)
  const collectedDues  = treasMembers.reduce((s, m) => s + (m.paid || 0), 0)
  const duesCollectionPct = expectedDues > 0 ? Math.round((collectedDues / expectedDues) * 100) : 0

  const stats = [
    { value: totalMembers, label: 'Members',        accent: 'blue',   iconBg: 'bg-rotary-blue',   color: 'text-rotary-blue',  trendColor: '#005daa' },
    { value: `${avgAttendance}%`, label: 'Attendance', accent: 'green', iconBg: 'bg-emerald-500', color: 'text-emerald-600 dark:text-emerald-400', trendColor: '#22c55e' },
    { value: totalProjects, label: 'Projects',      accent: 'pink',   iconBg: 'bg-[#d4006d]',    color: 'text-[#d4006d]',    trendColor: '#d4006d' },
    { value: volunteerHours > 0 ? `${volunteerHours.toLocaleString()}h` : meetings.length, label: volunteerHours > 0 ? 'Vol. Hours' : 'Meetings', accent: 'amber', iconBg: 'bg-amber-500', color: 'text-amber-600 dark:text-amber-400', trendColor: '#f59e0b' },
    { value: fundsRaised > 0 ? `₹${fundsRaised >= 100000 ? (fundsRaised / 100000).toFixed(1) + 'L' : fundsRaised.toLocaleString()}` : leaders.filter(l => l.memberType === 'working').length, label: fundsRaised > 0 ? 'Funds Raised' : 'Working Members', accent: 'purple', iconBg: 'bg-violet-500', color: 'text-violet-600 dark:text-violet-400', trendColor: '#8b5cf6' },
    { value: leaders.filter(l => l.memberType === 'student').length, label: 'Students', accent: 'blue', iconBg: 'bg-sky-500', color: 'text-sky-600 dark:text-sky-400', trendColor: '#0ea5e9' },
  ]

  const iconSvgs = [
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />,
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 21a12.083 12.083 0 01-6.16-9.422L12 14zm0 0v6" />,
  ]

  const trend = (() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const byMonth = {}
    meetings.forEach(m => {
      if (!m.date) return
      const d = new Date(m.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!byMonth[key]) byMonth[key] = { month: months[d.getMonth()], total: 0, present: 0 }
      byMonth[key].total += leaders.length
      byMonth[key].present += (m.presentIds || []).filter(id => leaderIds.has(id)).length
    })
    return Object.values(byMonth)
      .map(b => ({ month: b.month, pct: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0 }))
      .slice(-5)
  })()

  // ── Avenue breakdown ──────────────────────────────────────────────────────
  const avenueColors = ['#005daa','#d4006d','#f59e0b','#22c55e','#8b5cf6','#ef4444','#06b6d4','#f97316']
  const avenueStats = (() => {
    const map = {}
    projects.forEach(p => {
      const key = p.avenue || p.category || 'Uncategorised'
      if (!map[key]) map[key] = { avenue: key, projects: 0, hours: 0 }
      map[key].projects++
      map[key].hours += Number(p.volunteerHours || 0)
    })
    return Object.values(map)
      .sort((a, b) => b.projects - a.projects)
      .map((a, i) => ({ ...a, color: avenueColors[i % avenueColors.length] }))
  })()

  const totalAvenueProjects = avenueStats.reduce((s, a) => s + a.projects, 0) || 1
  const totalAvenueHours    = avenueStats.reduce((s, a) => s + a.hours, 0)
  const avgHrsPerProject    = totalProjects > 0 ? Math.round(totalAvenueHours / totalProjects) : 0
  const maxProjects         = Math.max(...avenueStats.map(a => a.projects), 1)

  // ── Month-on-month ────────────────────────────────────────────────────────
  const monthlyProjectStats = (() => {
    const monthLabels = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun']
    const start = new Date('2026-07-01')
    const map = {}
    monthLabels.forEach((m, i) => {
      const d = new Date(start)
      d.setMonth(start.getMonth() + i)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      map[key] = { month: m, projects: 0, meetings: 0, events: 0 }
    })
    projects.forEach(p => { if (p.startDate && map[p.startDate.slice(0,7)]) map[p.startDate.slice(0,7)].projects++ })
    meetings.forEach(m => { if (m.date && map[m.date.slice(0,7)]) map[m.date.slice(0,7)].meetings++ })
    events.forEach(e => { if (e.date && map[e.date.slice(0,7)]) map[e.date.slice(0,7)].events++ })
    return Object.values(map)
  })()

  const maxBarTotal = Math.max(...monthlyProjectStats.map(m => m.projects + m.meetings + m.events), 1)

  // ── Insights ──────────────────────────────────────────────────────────────
  const mostActiveMember = (() => {
    if (!meetings.length || !leaders.length) return '—'
    const counts = {}
    meetings.forEach(m => (m.presentIds || []).forEach(id => { counts[id] = (counts[id] || 0) + 1 }))
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (!topId) return '—'
    const member = leaders.find(l => l.id === topId[0])
    return member ? member.name.replace(/^Rtr\.\s*/i, '') : '—'
  })()

  const pendingMoms = (() => {
    const linkedIds = new Set(moms.filter(m => m.linkedMeetingId).map(m => m.linkedMeetingId))
    return meetings.filter(m => !linkedIds.has(m.id)).length
  })()

  const pendingDues      = treasMembers.reduce((s, m) => s + Math.max(0, Number(m.annualDue || 0) - Number(m.paid || 0)), 0)
  const upcomingEvents   = events.filter(e => e.date && new Date(e.date) > new Date()).length

  const insights = [
    { label: 'Most Active Member', value: mostActiveMember, alert: false },
    { label: 'Upcoming Events',    value: upcomingEvents,   alert: false },
    { label: 'Pending MoM',        value: pendingMoms,      alert: pendingMoms > 0 },
    { label: 'Pending Dues',       value: pendingDues > 0 ? `₹${pendingDues.toLocaleString()}` : '₹0', alert: pendingDues > 0 },
  ]

  // ── Health ────────────────────────────────────────────────────────────────
  const health = (() => {
    let score = 0
    score += Math.min(40, avgAttendance * 0.4)
    score += Math.min(20, totalProjects * 4)
    score += Math.min(15, totalMembers * 1.5)
    score += Math.min(15, meetings.length * 3)
    score += fundsRaised > 0 ? 10 : (sponsorships.length > 0 ? 5 : 0)
    score = Math.min(100, Math.round(score))
    const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'
    const title = score >= 80 ? 'Excellent performance' : score >= 60 ? 'Good progress' : 'Needs attention'
    const desc  = 'Based on attendance, project activity, membership growth, volunteer hours and finances.'
    return { score, color, title, desc }
  })()

  const cardClass = 'bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/8 p-6'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-rotary-navy-light pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8"
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start gap-3">
            <button onClick={onBack}
              className="mt-6 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4006d] animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4006d]">President's Dashboard</p>
              </div>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal dark:text-white">Club Analytics</h2>
              <p className="text-sm text-gray-400 dark:text-white/40 mt-1">Rotaract Club · Bengaluru BTM</p>
            </div>
          </div>
          <button onClick={() => exportToPdf({
            stats, trend, insights, health, avenueStats, monthlyStats: monthlyProjectStats,
            canSeeTreasury, totalRevenue, totalExpenses, netBalance,
            budgetUtilizationPct, totalSpentOnBudget, totalApprovedBudget,
            duesCollectionPct, collectedDues, expectedDues,
          })}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-semibold text-rotary-charcoal dark:text-white hover:bg-rotary-blue hover:text-white hover:border-rotary-blue active:scale-95 transition-all shadow-sm shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export PDF
          </button>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/8 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">{iconSvgs[i]}</svg>
                </div>
                <TrendIcon color={stat.trendColor} />
              </div>
              <p className="text-xs font-medium text-gray-400 dark:text-white/40 mb-1">{stat.label}</p>
              <p className={`font-display font-extrabold text-[1.75rem] leading-none ${stat.color} tabular-nums`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Treasury Snapshot — Super Admin / Treasurer only */}
        {canSeeTreasury && (
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }}
            className={`${cardClass} mb-4`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-base text-rotary-charcoal dark:text-white">Treasury Snapshot</h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300 dark:text-white/20">From Treasurer Dashboard</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-white/40 mb-1">Revenue</p>
                <p className="font-display font-extrabold text-xl text-green-600 dark:text-green-400 tabular-nums">₹{totalRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-white/40 mb-1">Expenses</p>
                <p className="font-display font-extrabold text-xl text-red-500 tabular-nums">₹{totalExpenses.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-white/40 mb-1">Balance</p>
                <p className={`font-display font-extrabold text-xl tabular-nums ${netBalance >= 0 ? 'text-rotary-charcoal dark:text-white' : 'text-red-500'}`}>
                  {netBalance >= 0 ? '' : '-'}₹{Math.abs(netBalance).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-white/40 mb-1">Budget Used</p>
                <p className="font-display font-extrabold text-xl text-rotary-blue tabular-nums">
                  {budgetUtilizationPct}%
                  <span className="text-xs font-medium text-gray-400 dark:text-white/30 ml-1.5">₹{totalSpentOnBudget.toLocaleString()} / ₹{totalApprovedBudget.toLocaleString()}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-white/50">Dues collected</span>
              <span className="font-bold text-rotary-charcoal dark:text-white tabular-nums">{duesCollectionPct}% <span className="text-gray-400 dark:text-white/30 font-medium">(₹{collectedDues.toLocaleString()} / ₹{expectedDues.toLocaleString()})</span></span>
            </div>
          </motion.div>
        )}

        {/* Attendance Trend + Club Insights */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className={cardClass}>
            <h3 className="font-display font-bold text-base text-rotary-charcoal dark:text-white mb-5">Attendance Trend</h3>
            {trend.length === 0 ? (
              <p className="text-sm text-gray-300 italic py-4">No meeting data yet</p>
            ) : (
              <div className="space-y-4">
                {trend.map((t, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-500 dark:text-white/50">{t.month}</span>
                      <span className="text-sm font-bold text-rotary-charcoal dark:text-white tabular-nums">{t.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full bg-amber-400"
                        initial={{ width: 0 }} whileInView={{ width: `${t.pct}%` }} viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.08 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
            className={cardClass}>
            <h3 className="font-display font-bold text-base text-rotary-charcoal dark:text-white mb-5">Club Insights</h3>
            <div>
              {insights.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-3.5 border-b border-gray-50 dark:border-white/5 last:border-0">
                  <span className="text-sm text-gray-500 dark:text-white/50">{r.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${r.alert ? 'text-[#d4006d]' : 'text-rotary-charcoal dark:text-white'}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Club Health Score */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
          className={`${cardClass} flex items-center gap-5 mb-4`}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: health.color + '18' }}>
            <span className="font-display font-extrabold text-xl" style={{ color: health.color }}>{health.score}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-bold text-base text-rotary-charcoal dark:text-white">Club Health Score</h3>
              <span className="text-sm font-semibold" style={{ color: health.color }}>{health.title}</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">{health.desc}</p>
          </div>
        </motion.div>

        {/* Health explanation */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.22 }}
          className="px-5 py-4 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-100 dark:border-white/8 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">How the health score works</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Scored out of <strong className="text-rotary-charcoal dark:text-white">100pts</strong> —
            <span className="text-rotary-blue font-semibold"> Attendance</span> (40) ·
            <span className="text-[#d4006d] font-semibold"> Projects</span> (20) ·
            <span className="text-emerald-600 font-semibold"> Members</span> (15) ·
            <span className="text-amber-500 font-semibold"> Meetings</span> (15) ·
            <span className="text-violet-600 font-semibold"> Funds</span> (10). 80+ = Excellent · 60–79 = Good · below 60 = Needs attention.
          </p>
        </motion.div>

        {/* Month-on-Month Activity */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 }}
          className={`${cardClass} mb-4`}>
          <h3 className="font-display font-bold text-base text-rotary-charcoal dark:text-white mb-0.5">Month-on-month activity</h3>
          <p className="text-xs text-gray-400 mb-6">Rotary Year 2026–27 · July 2026 to June 2027</p>

          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 min-w-[560px] h-36 mb-2">
              {monthlyProjectStats.map((m, i) => {
                const total = m.projects + m.meetings + m.events
                const heightPct = Math.round((total / maxBarTotal) * 100)
                const monthIndex = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'].indexOf(m.month)
                const year = monthIndex >= 6 ? 2026 : 2027
                const monthNum = monthIndex >= 6 ? monthIndex - 5 : monthIndex + 7
                const isPast = new Date(`${year}-${String(monthNum).padStart(2,'0')}-01`) <= new Date()
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full flex flex-col justify-end h-28 relative">
                      {total > 0 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-rotary-charcoal dark:text-white whitespace-nowrap bg-white dark:bg-rotary-navy-light border border-gray-100 dark:border-white/10 px-1.5 py-0.5 rounded shadow-sm z-10">
                          {m.projects > 0 && `${m.projects}P `}{m.meetings > 0 && `${m.meetings}M `}{m.events > 0 && `${m.events}E`}
                        </div>
                      )}
                      <motion.div className="w-full rounded-t-lg"
                        style={{ height: `${heightPct}%`, minHeight: total > 0 ? 6 : 0, background: isPast ? 'linear-gradient(to top,#005daa,#d4006d)' : '#e5e7eb' }}
                        initial={{ height: 0 }} whileInView={{ height: `${heightPct}%` }} viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.05 }} />
                    </div>
                    <span className={`text-[10px] font-semibold ${isPast ? 'text-rotary-charcoal dark:text-white' : 'text-gray-300 dark:text-white/20'}`}>{m.month}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-white/5 flex-wrap">
              {[['bg-rotary-blue','P = Projects'],['bg-[#d4006d]','M = Meetings'],['bg-amber-400','E = Events']].map(([bg, label]) => (
                <span key={label} className="text-[10px] text-gray-400 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${bg} inline-block`} />{label}
                </span>
              ))}
              <span className="text-[10px] text-gray-400 flex items-center gap-1.5 ml-auto">
                <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />Upcoming
              </span>
            </div>
          </div>
        </motion.div>

        {/* Avenue-wise Activity — reference style */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
          className={cardClass}>
          <h3 className="font-display font-bold text-base text-rotary-charcoal dark:text-white mb-0.5">Avenue-wise activity</h3>
          <p className="text-xs text-gray-400 mb-5">Projects breakdown by service avenue</p>

          {/* Summary mini-cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total projects',       value: totalProjects },
              { label: 'Volunteer hours',      value: `${totalAvenueHours}h` },
              { label: 'Avenues active',       value: avenueStats.length },
              { label: 'Avg hrs / project',    value: `${avgHrsPerProject}h` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 border border-gray-100 dark:border-white/8">
                <p className="text-[10px] text-gray-400 dark:text-white/40 mb-1">{label}</p>
                <p className="font-display font-bold text-xl text-rotary-charcoal dark:text-white tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          {/* Avenue legend pills */}
          {avenueStats.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {avenueStats.map((a, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-white/50">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: a.color }} />
                  {a.avenue} {Math.round((a.projects / totalAvenueProjects) * 100)}%
                </span>
              ))}
            </div>
          )}

          {avenueStats.length === 0 ? (
            <p className="text-sm text-gray-300 italic py-4">No project data yet</p>
          ) : (
            <div>
              <div className="space-y-4">
                {avenueStats.map((a, i) => {
                  const projectBarPct = Math.round((a.projects / maxProjects) * 100)
                  const maxHours      = Math.max(...avenueStats.map(x => x.hours), 1)
                  const hourBarPct    = Math.round((a.hours / maxHours) * 100)
                  const shortName     = a.avenue.replace(' Service','').replace(' Development',' dev.')
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-32 shrink-0 text-right">
                        <span className="text-xs text-gray-500 dark:text-white/50 truncate block">{shortName}</span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="w-full h-3 bg-gray-100 dark:bg-white/8 rounded overflow-hidden">
                          <motion.div className="h-full rounded"
                            style={{ width: `${projectBarPct}%`, background: a.color }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${projectBarPct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.07 }} />
                        </div>
                        <div className="w-full h-3 bg-gray-100 dark:bg-white/8 rounded overflow-hidden">
                          <motion.div className="h-full rounded"
                            style={{ width: `${hourBarPct}%`, background: a.color + '55' }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${hourBarPct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.07 + 0.1 }} />
                        </div>
                      </div>
                      <div className="w-20 shrink-0 text-xs">
                        <p className="font-bold text-rotary-charcoal dark:text-white">{a.projects} proj</p>
                        {a.hours > 0 && <p className="text-amber-500">{a.hours}h</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-3 mt-3 pl-[140px]">
                <div className="flex-1 flex justify-between text-[10px] text-gray-300 dark:text-white/20 border-t border-gray-100 dark:border-white/5 pt-1">
                  <span>0</span>
                  <span>{Math.round(maxProjects / 4)}</span>
                  <span>{Math.round(maxProjects / 2)}</span>
                  <span>{Math.round(maxProjects * 3 / 4)}</span>
                  <span>{maxProjects}</span>
                </div>
                <div className="w-20" />
              </div>
              <div className="flex gap-4 mt-2 pl-[140px] text-[10px] text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#005daa' }} /> Projects
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-sm inline-block bg-blue-200" /> Volunteer hours
                </span>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
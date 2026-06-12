import { motion } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportToPdf(stats, trend, insights, health) {
  const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Club Analytics Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',sans-serif;color:#1a2236;padding:44px;max-width:900px;margin:0 auto}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
  .hdr h1{font-family:'Sora',sans-serif;font-size:24px;font-weight:800;margin-bottom:4px}
  .hdr p{font-size:12px;color:#6b7a99}
  .badge{background:#d4006d;color:#fff;font-family:'Sora',sans-serif;font-size:10px;font-weight:700;padding:4px 12px;border-radius:16px;margin-top:6px;display:inline-block;letter-spacing:.5px}
  .div{height:2px;background:linear-gradient(90deg,#d4006d,#005daa,transparent);margin-bottom:28px}
  .grid5{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:28px}
  .card{background:#f8f9fc;border-radius:12px;padding:18px 16px;border:1px solid #eaecf4}
  .card-label{font-size:10px;color:#6b7a99;font-weight:600;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px}
  .card-val{font-family:'Sora',sans-serif;font-size:28px;font-weight:800;line-height:1}
  .card-val.blue{color:#005daa}.card-val.pink{color:#d4006d}.card-val.green{color:#16a34a}.card-val.amber{color:#d97706}.card-val.purple{color:#7c3aed}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:28px}
  .panel{background:#fff;border:1px solid #eaecf4;border-radius:12px;padding:22px}
  .panel h3{font-family:'Sora',sans-serif;font-size:14px;font-weight:700;margin-bottom:16px;color:#1a2236}
  .trend-row{display:flex;align-items:center;gap:12px;margin-bottom:10px;font-size:12px}
  .trend-month{width:60px;color:#6b7a99;font-weight:500}
  .trend-bar-bg{flex:1;height:6px;background:#eee;border-radius:6px;overflow:hidden}
  .trend-bar{height:100%;border-radius:6px;background:#f59e0b}
  .trend-pct{width:36px;text-align:right;font-weight:700;color:#1a2236;font-size:11px}
  .ins-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:12px}
  .ins-row:last-child{border-bottom:none}
  .ins-label{color:#6b7a99}.ins-val{font-weight:700;color:#1a2236}
  .ins-val.alert{color:#d4006d}
  .health{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:22px;display:flex;align-items:center;gap:20px}
  .health-circle{width:60px;height:60px;border-radius:50%;background:#22c55e;color:#fff;font-family:'Sora',sans-serif;font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center}
  .health h4{font-family:'Sora',sans-serif;font-size:14px;font-weight:700;margin-bottom:2px}
  .health p{font-size:11px;color:#6b7a99}
  .ftr{margin-top:28px;padding-top:14px;border-top:1px solid #eaecf4;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af}
  @media print{body{padding:24px}}
</style></head><body>
<div class="hdr"><div><h1>Club Analytics Report</h1><p>Rotaract Bengaluru BTM</p><span class="badge">RID 3191</span></div><div style="text-align:right"><p style="font-size:11px;color:#9ca3af">Generated</p><p style="font-family:'Sora',sans-serif;font-weight:700;font-size:12px;color:#1a2236;margin-top:3px">${now}</p></div></div>
<div class="div"></div>
<div class="grid5">${stats.map(s => `<div class="card"><div class="card-label">${s.label}</div><div class="card-val ${s.accent}">${s.value}</div></div>`).join('')}</div>
<div class="grid2">
<div class="panel"><h3>Attendance Trend</h3>${trend.map(t => `<div class="trend-row"><span class="trend-month">${t.month}</span><div class="trend-bar-bg"><div class="trend-bar" style="width:${t.pct}%"></div></div><span class="trend-pct">${t.pct}%</span></div>`).join('')}</div>
<div class="panel"><h3>Club Insights</h3>${insights.map(r => `<div class="ins-row"><span class="ins-label">${r.label}</span><span class="ins-val ${r.alert ? 'alert' : ''}">${r.value}</span></div>`).join('')}</div>
</div>
<div class="health"><div class="health-circle" style="background:${health.color}">${health.score}</div><div><h4>${health.title}</h4><p>${health.desc}</p></div></div>
<div class="ftr"><p>Rotaract Club of Bengaluru BTM · Create. Lead. Inspire.</p><p>Confidential</p></div>
</body></html>`
  const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.onload = () => w.print()
}

// ─── Trend icon (mini sparkline) ──────────────────────────────────────────────
function TrendIcon({ color = '#6b7a99' }) {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" fill="none" className="opacity-30">
      <path d="M1 14 L7 9 L13 11 L19 4 L27 1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImpactStats({ onBack }) {
  const { data: leaders = [] } = useCollection('leaders')
  const { data: projects = [] } = useCollection('projects')
  const { data: meetings = [] } = useCollection('attendance_meetings')
  const { data: moms = [] } = useCollection('moms')
  const { data: sponsorships = [] } = useCollection('treasurer_sponsorships')
  const { data: treasMembers = [] } = useCollection('treasurer_members')
  const { data: events = [] } = useCollection('events')

  // ── Stats ──
  const totalMembers = leaders.length
  const totalProjects = projects.length

  const avgAttendance = (() => {
    if (!meetings.length || !leaders.length) return 0
    const total = meetings.reduce((sum, m) => sum + ((m.presentIds || []).length / leaders.length) * 100, 0)
    return Math.round(total / meetings.length)
  })()

  const volunteerHours = (() => {
    const a = projects.reduce((s, p) => s + Number(p.volunteerHours || 0), 0)
    const b = events.reduce((s, e) => s + Number(e.volunteerHours || 0), 0)
    return a + b
  })()

  const fundsRaised = sponsorships.reduce((s, sp) => s + Number(sp.amount || 0), 0)

  const stats = [
    { value: totalMembers, label: 'Members', accent: 'blue', iconBg: 'bg-rotary-blue', color: 'text-rotary-blue', trendColor: '#005daa' },
    { value: `${avgAttendance}%`, label: 'Attendance', accent: 'green', iconBg: 'bg-emerald-500', color: 'text-emerald-600 dark:text-emerald-400', trendColor: '#22c55e' },
    { value: totalProjects, label: 'Projects', accent: 'pink', iconBg: 'bg-[#d4006d]', color: 'text-[#d4006d]', trendColor: '#d4006d' },
    { value: volunteerHours > 0 ? volunteerHours.toLocaleString() : meetings.length, label: volunteerHours > 0 ? 'Volunteer Hours' : 'Meetings Held', accent: 'amber', iconBg: 'bg-amber-500', color: 'text-amber-600 dark:text-amber-400', trendColor: '#f59e0b' },
    { value: fundsRaised > 0 ? `₹${fundsRaised >= 100000 ? (fundsRaised / 100000).toFixed(1) + 'L' : fundsRaised.toLocaleString()}` : leaders.filter(l => l.memberType === 'working').length, label: fundsRaised > 0 ? 'Funds Raised' : 'Working Members', accent: 'purple', iconBg: 'bg-violet-500', color: 'text-violet-600 dark:text-violet-400', trendColor: '#8b5cf6' },
  ]

  const iconSvgs = [
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />,
  ]

  // ── Attendance trend (by month from attendance_meetings) ──
  const trend = (() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const byMonth = {}
    meetings.forEach(m => {
      if (!m.date) return
      const d = new Date(m.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!byMonth[key]) byMonth[key] = { month: months[d.getMonth()], total: 0, present: 0, count: 0 }
      byMonth[key].count++
      byMonth[key].total += leaders.length
      byMonth[key].present += (m.presentIds || []).length
    })
    return Object.values(byMonth)
      .map(b => ({ month: b.month, pct: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0 }))
      .slice(-5)
  })()

  // ── Avenue-wise breakdown ──
  const avenueColors = [
    '#005daa', '#d4006d', '#f59e0b', '#22c55e',
    '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'
  ]
  const avenueStats = (() => {
    const map = {}
    projects.forEach(p => {
      const key = p.avenue || p.category || 'Uncategorised'
      if (!map[key]) map[key] = { avenue: key, projects: 0, hours: 0 }
      map[key].projects++
      map[key].hours += Number(p.volunteerHours || 0)
    })
    const arr = Object.values(map).sort((a, b) => b.projects - a.projects)
    const max = arr[0]?.projects || 1
    return arr.map((a, i) => ({
      ...a,
      pct: Math.round((a.projects / max) * 100),
      color: avenueColors[i % avenueColors.length]
    }))
  })()

  // ── Month-on-month activity (Rotary Year Jul 2026 – Jun 2027) ──
  const monthlyProjectStats = (() => {
    const monthLabels = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const start = new Date('2026-07-01')
    const map = {}
    monthLabels.forEach((m, i) => {
      const d = new Date(start)
      d.setMonth(start.getMonth() + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map[key] = { month: m, projects: 0, meetings: 0, events: 0 }
    })
    projects.forEach(p => {
      if (!p.startDate) return
      const key = p.startDate.slice(0, 7)
      if (map[key]) map[key].projects++
    })
    meetings.forEach(m => {
      if (!m.date) return
      const key = m.date.slice(0, 7)
      if (map[key]) map[key].meetings++
    })
    events.forEach(e => {
      if (!e.date) return
      const key = e.date.slice(0, 7)
      if (map[key]) map[key].events++
    })
    return Object.values(map)
  })()

  // ── Club insights ──
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

  const pendingDues = treasMembers.reduce((s, m) => s + Math.max(0, Number(m.annualDue || 0) - Number(m.paid || 0)), 0)

  const upcomingEvents = events.filter(e => e.date && new Date(e.date) > new Date()).length

  const insights = [
    { label: 'Most Active Member', value: mostActiveMember, alert: false },
    { label: 'Upcoming Events', value: upcomingEvents, alert: false },
    { label: 'Pending MoM', value: pendingMoms, alert: pendingMoms > 0 },
    { label: 'Pending Dues', value: pendingDues > 0 ? `₹${pendingDues.toLocaleString()}` : '₹0', alert: pendingDues > 0 },
  ]

  // ── Club health score ──
  const health = (() => {
    let score = 0
    score += Math.min(40, avgAttendance * 0.4)
    score += Math.min(20, totalProjects * 4)
    score += Math.min(15, totalMembers * 1.5)
    score += Math.min(15, meetings.length * 3)
    score += fundsRaised > 0 ? 10 : (sponsorships.length > 0 ? 5 : 0)
    score = Math.min(100, Math.round(score))
    const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'
    const title = score >= 80 ? 'Excellent Performance' : score >= 60 ? 'Good Progress' : 'Needs Attention'
    const desc = 'Based on attendance, project activity, membership growth, volunteer hours and finances.'
    return { score, color, title, desc }
  })()

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Header ── */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={onBack}
              className="mt-6 p-2.5 rounded-xl border border-gray-200 hover:bg-white transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4006d] animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4006d]">
                  President's Dashboard
                </p>
              </div>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal dark:text-white">
                Club Analytics
              </h2>
              <p className="text-sm text-gray-400 dark:text-white/40 mt-1.5">
                Rotaract Club · Bengaluru BTM
              </p>
            </div>
          </div>
          <button
            onClick={() => exportToPdf(stats, trend, insights, health)}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-semibold text-rotary-charcoal dark:text-white hover:bg-rotary-blue hover:text-white hover:border-rotary-blue active:scale-95 transition-all shadow-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export PDF
          </button>
        </motion.div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/8 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {iconSvgs[i]}
                  </svg>
                </div>
                <TrendIcon color={stat.trendColor} />
              </div>
              <p className="text-xs font-medium text-gray-400 dark:text-white/40 mb-1">{stat.label}</p>
              <p className={`font-display font-extrabold text-[1.75rem] leading-none ${stat.color} tabular-nums`}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Attendance Trend + Club Insights ── */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">

          {/* Attendance Trend */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: 0.1 }}
            className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/8 p-6"
          >
            <h3 className="font-display font-bold text-lg text-rotary-charcoal dark:text-white mb-5">Attendance Trend</h3>
            {trend.length === 0 ? (
              <p className="text-sm text-gray-300 dark:text-white/20 italic py-4">No meeting data yet</p>
            ) : (
              <div className="space-y-4">
                {trend.map((t, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-500 dark:text-white/50">{t.month}</span>
                      <span className="text-sm font-bold text-rotary-charcoal dark:text-white tabular-nums">{t.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-amber-400"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${t.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Club Insights */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: 0.15 }}
            className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/8 p-6"
          >
            <h3 className="font-display font-bold text-lg text-rotary-charcoal dark:text-white mb-5">Club Insights</h3>
            <div className="space-y-0">
              {insights.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-3.5 border-b border-gray-50 dark:border-white/5 last:border-0">
                  <span className="text-sm text-gray-500 dark:text-white/50">{r.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${r.alert ? 'text-[#d4006d]' : 'text-rotary-charcoal dark:text-white'}`}>
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Club Health Score ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: 0.2 }}
          className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/8 p-6 flex items-center gap-6"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: health.color + '18' }}
          >
            <span className="font-display font-extrabold text-2xl" style={{ color: health.color }}>
              {health.score}
            </span>
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-rotary-charcoal dark:text-white mb-0.5">
              Club Health Score
              <span className="ml-2 text-sm font-semibold" style={{ color: health.color }}>{health.title}</span>
            </h3>
            <p className="text-sm text-gray-400 dark:text-white/40">{health.desc}</p>
          </div>
        </motion.div>

        {/* ── How Health Score Works ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: 0.25 }}
          className="mt-4 px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 dark:bg-white/5 dark:border-white/8"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">How the Health Score works</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            The score is calculated out of <strong className="text-rotary-charcoal dark:text-white">100 points</strong> across five factors —
            <span className="text-rotary-blue font-semibold"> Attendance</span> (40pts) ·
            <span className="text-[#d4006d] font-semibold"> Projects</span> (20pts) ·
            <span className="text-emerald-600 font-semibold"> Members</span> (15pts) ·
            <span className="text-amber-500 font-semibold"> Meetings</span> (15pts) ·
            <span className="text-violet-600 font-semibold"> Funds</span> (10pts).
            A score of <strong className="text-rotary-charcoal dark:text-white">80+</strong> is Excellent,
            <strong className="text-rotary-charcoal dark:text-white"> 60–79</strong> is Good Progress,
            below <strong className="text-rotary-charcoal dark:text-white">60</strong> needs attention.
          </p>
        </motion.div>

        {/* ── Month-on-Month Activity ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: 0.3 }}
          className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/8 p-6 mt-4"
        >
          <h3 className="font-display font-bold text-lg text-rotary-charcoal dark:text-white mb-1">Month-on-Month Activity</h3>
          <p className="text-xs text-gray-400 mb-6">Rotary Year 2026–27 · July 2026 to June 2027</p>

          <div className="overflow-x-auto">
            <div className="flex items-end gap-3 min-w-[600px] h-40">
              {monthlyProjectStats.map((m, i) => {
                const total = m.projects + m.meetings + m.events
                const maxTotal = Math.max(...monthlyProjectStats.map(x => x.projects + x.meetings + x.events), 1)
                const heightPct = Math.round((total / maxTotal) * 100)

                // determine if this month is in the past
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
                      <motion.div
                        className="w-full rounded-t-lg"
                        style={{
                          height: `${heightPct}%`,
                          minHeight: total > 0 ? 8 : 0,
                          background: isPast
                            ? 'linear-gradient(to top, #005daa, #d4006d)'
                            : '#e5e7eb'
                        }}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${heightPct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.06 }}
                      />
                    </div>
                    <span className={`text-[10px] font-semibold ${isPast ? 'text-rotary-charcoal dark:text-white' : 'text-gray-300 dark:text-white/20'}`}>
                      {m.month}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex-wrap">
              <span className="text-[10px] text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rotary-blue inline-block" />P = Projects
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#d4006d] inline-block" />M = Meetings
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />E = Events
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1.5 ml-auto">
                <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />Upcoming months
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Avenue-wise Activity Breakdown ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: 0.35 }}
          className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/8 p-6 mt-4"
        >
          <h3 className="font-display font-bold text-lg text-rotary-charcoal dark:text-white mb-1">Avenue-wise Activity</h3>
          <p className="text-xs text-gray-400 mb-6">Projects breakdown by service avenue</p>

          {avenueStats.length === 0 ? (
            <p className="text-sm text-gray-300 dark:text-white/20 italic py-4">No project data yet</p>
          ) : (
            <div className="space-y-5">
              {avenueStats.map((a, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: a.color }} />
                      <span className="text-sm font-semibold text-rotary-charcoal dark:text-white">{a.avenue}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{a.projects} project{a.projects !== 1 ? 's' : ''}</span>
                      {a.hours > 0 && (
                        <span className="text-xs font-semibold text-amber-500">{a.hours}h volunteer</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: a.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${a.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'

const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

function getMonthYear(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return {
    month: d.toLocaleString('en-IN', { month: 'long' }),
    year:  d.getFullYear(),
    key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    monthNum: d.getMonth() + 1,
  }
}

function filterByMonth(items, dateField, monthKey) {
  return items.filter(item => (item[dateField] || '').startsWith(monthKey))
}

// ── Birthday helpers ──────────────────────────────────────────────────────────
function getBirthdaysThisMonth(leaders, monthNum) {
  return leaders.filter(l => {
    if (!l.birthdate) return false
    const m = new Date(l.birthdate).getMonth() + 1
    return m === monthNum
  }).map(l => ({
    name: l.name || '',
    date: l.birthdate ? new Date(l.birthdate).getDate() : '',
    type: 'birthday',
  }))
}

function getAnniversariesThisMonth(leaders, monthNum) {
  return leaders.filter(l => {
    if (!l.joinDate && !l.inductionDate) return false
    const dateStr = l.joinDate || l.inductionDate
    const m = new Date(dateStr).getMonth() + 1
    return m === monthNum
  }).map(l => {
    const dateStr = l.joinDate || l.inductionDate
    const joinYear = new Date(dateStr).getFullYear()
    const years = new Date().getFullYear() - joinYear
    return {
      name: l.name || '',
      date: new Date(dateStr).getDate(),
      years,
      type: 'anniversary',
    }
  })
}

// ── HTML builder ──────────────────────────────────────────────────────────────
function buildNewsletterHTML(data) {
  const { month, year, heroImage, presidentMessage, projects, events, stats, clubTagline, birthdays, anniversaries } = data

  const projectRows = projects.slice(0, 6).map(p => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:top">
        ${p.newsletterImage ? `<img src="${p.newsletterImage}" crossorigin="anonymous" alt="${p.title}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:10px;" />` : ''}
        <div style="font-weight:700;color:#1a1a2e;font-size:14px;">${p.title}</div>
        <div style="font-size:12px;color:#888;margin-top:2px;">${p.avenue || p.category || ''}${p.areaOfFocus ? ' · ' + p.areaOfFocus : ''}</div>
        ${p.description ? `<div style="font-size:12px;color:#555;margin-top:4px;line-height:1.6">${p.description.slice(0,150)}${p.description.length>150?'...':''}</div>` : ''}
        <div style="margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;">
          ${p.participants ? `<span style="font-size:11px;color:#888;">👥 ${p.participants} participants</span>` : ''}
          ${p.volunteerHours ? `<span style="font-size:11px;color:#888;">⏱ ${p.volunteerHours}h volunteer</span>` : ''}
          ${p.beneficiaries ? `<span style="font-size:11px;color:#888;">🎯 ${p.beneficiaries} beneficiaries</span>` : ''}
        </div>
      </td>
    </tr>`).join('')

  const eventRows = events.slice(0, 4).map(e => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #f0f0f0;">
      <div style="min-width:48px;text-align:center;background:#D31145;color:#fff;border-radius:8px;padding:6px;">
        <div style="font-size:18px;font-weight:800;line-height:1">${new Date(e.date).getDate()}</div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px">${new Date(e.date).toLocaleString('en-IN',{month:'short'})}</div>
      </div>
      <div>
        <div style="font-weight:700;color:#1a1a2e;font-size:14px;">${e.title}</div>
        <div style="font-size:12px;color:#888;margin-top:2px;">🕐 ${e.time||'TBD'} &nbsp;·&nbsp; 📍 ${e.location||'TBD'}</div>
        ${e.type ? `<div style="font-size:11px;color:#D31145;margin-top:2px;font-weight:600;">${e.type}</div>` : ''}
      </div>
    </div>`).join('')

  const bdaySection = (birthdays.length > 0 || anniversaries.length > 0) ? `
    <div style="padding:0 32px 32px;">
      <div style="background:#fff8f0;border-radius:12px;padding:24px;border:1px solid #ffe4c8;">
        <div style="font-size:10px;color:#D31145;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Celebrations</div>
        <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:#1a1a2e;margin-bottom:16px;">Birthdays & Anniversaries</div>
        ${birthdays.length > 0 ? `
          <div style="margin-bottom:16px;">
            <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🎂 Birthdays this month</div>
            ${birthdays.map(b => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #ffe4c8;">
                <div style="width:32px;height:32px;border-radius:50%;background:#D31145;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${(b.name||'?').charAt(0).toUpperCase()}</div>
                <div>
                  <div style="font-weight:700;color:#1a1a2e;font-size:13px;">${b.name}</div>
                  ${b.date ? `<div style="font-size:11px;color:#888;">on the ${b.date}${['th','st','nd','rd'][b.date%10<4&&(b.date<11||b.date>13)?b.date%10:0]||'th'}</div>` : ''}
                </div>
                <div style="margin-left:auto;font-size:18px;">🎂</div>
              </div>`).join('')}
          </div>` : ''}
        ${anniversaries.length > 0 ? `
          <div>
            <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">💍 Wedding Anniversaries</div>
            ${anniversaries.map(a => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #ffe4c8;">
                <div style="width:32px;height:32px;border-radius:50%;background:#1a73e8;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${(a.name||'?').charAt(0).toUpperCase()}</div>
                <div>
                  <div style="font-weight:700;color:#1a1a2e;font-size:13px;">${a.name}</div>
                  <div style="font-size:11px;color:#888;">${a.years > 0 ? `${a.years} year${a.years!==1?'s':''} with Rotaract` : 'New member!'}</div>
                </div>
                <div style="margin-left:auto;font-size:18px;">🌟</div>
              </div>`).join('')}
          </div>` : ''}
      </div>
    </div>` : ''

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Rotaract BTM Newsletter — ${month} ${year}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',sans-serif;color:#333;background:#f4f4f5}
  .wrapper{max-width:600px;margin:0 auto;background:#fff}
  @media print{body{background:#fff}.no-print{display:none!important}.wrapper{box-shadow:none}}
  img{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
</style>
</head><body><div class="wrapper">
  <div style="position:relative;height:280px;overflow:hidden;">
    ${heroImage
      ? `<img src="${heroImage}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;" />`
      : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#D31145,#1a73e8);"></div>`}
    <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.2) 60%,transparent 100%);"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;padding:28px 32px;">
      <div style="font-size:10px;color:rgba(255,255,255,0.65);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Monthly Newsletter</div>
      <div style="font-family:'Sora',sans-serif;font-size:28px;font-weight:800;color:#fff;line-height:1.2;">Rotaract Bengaluru BTM</div>
      <div style="font-size:16px;color:rgba(255,255,255,0.85);margin-top:4px;font-weight:600;">${month} ${year}</div>
      ${clubTagline ? `<div style="font-size:13px;color:rgba(255,255,255,0.65);margin-top:4px;">${clubTagline}</div>` : ''}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);background:#D31145;">
    ${stats.map(s => `<div style="padding:16px 12px;text-align:center;border-right:1px solid rgba(255,255,255,0.15);">
      <div style="font-family:'Sora',sans-serif;font-size:22px;font-weight:800;color:#fff;">${s.value}</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">${s.label}</div>
    </div>`).join('')}
  </div>
  ${projects.length > 0 ? `
  <div style="padding:32px;">
    <div style="font-size:10px;color:#D31145;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">This Month</div>
    <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:#1a1a2e;margin-bottom:20px;">Projects & Activities</div>
    <table style="width:100%;border-collapse:collapse;">${projectRows}</table>
  </div>` : ''}
  ${events.length > 0 ? `
  <div style="padding:0 32px 32px;">
    <div style="background:#f8f9fa;border-radius:12px;padding:24px;">
      <div style="font-size:10px;color:#D31145;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Don't Miss</div>
      <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:#1a1a2e;margin-bottom:16px;">Upcoming Events</div>
      ${eventRows}
    </div>
  </div>` : ''}
  ${bdaySection}
  ${presidentMessage ? `
  <div style="padding:0 32px 32px;">
    <div style="border-left:4px solid #D31145;padding:20px 24px;background:#fdf2f5;border-radius:0 12px 12px 0;">
      <div style="font-size:10px;color:#D31145;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">A Note From Leadership</div>
      <div style="font-size:14px;color:#333;line-height:1.8;">${presidentMessage}</div>
    </div>
  </div>` : ''}
  <div style="background:#1a1a2e;padding:28px 32px;text-align:center;">
    <div style="font-family:'Sora',sans-serif;font-size:16px;font-weight:700;color:#fff;margin-bottom:4px;">Rotaract Club of Bengaluru BTM</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:12px;">RID 3191 · Create. Lead. Inspire.</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.3);">${month} ${year} Newsletter</div>
  </div>
</div></body></html>`
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function NewsletterGenerator({ isAdmin, onBack }) {
  const { data: allProjects = [] } = useCollection('projects')
  const { data: events = [] }      = useCollection('events')
  const { data: leaders = [] }     = useCollection('leaders')
  const { data: meetings = [] }    = useCollection('attendance_meetings')
  const { save: saveBlog }         = useCollection('blogs')

  const [monthOffset, setMonthOffset] = useState(0)
  const [generated,   setGenerated]   = useState(false)
  const [pushing,     setPushing]     = useState(false)
  const [pushed,      setPushed]      = useState(false)

  const { month, year, key: monthKey, monthNum } = getMonthYear(monthOffset)

  // Editable fields
  const [heroImage,        setHeroImage]        = useState('')
  const [presidentMessage, setPresidentMessage]  = useState('')
  const [clubTagline,      setClubTagline]       = useState('Create. Lead. Inspire.')
  const [customTitle,      setCustomTitle]       = useState('')

  // Auto-pulled data
  const monthProjects  = filterByMonth(allProjects, 'startDate', monthKey)
  const monthMeetings  = filterByMonth(meetings, 'date', monthKey)
  const upcomingEvents = events
    .filter(e => e.date && new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4)
  const volunteerHours = monthProjects.reduce((s, p) => s + Number(p.volunteerHours || 0), 0)
  const participants   = monthProjects.reduce((s, p) => s + Number(p.participants || 0), 0)

  // Per-project newsletter images (editable)
  const [projectImages, setProjectImages] = useState({})
  const setProjectImage = (id, url) => setProjectImages(prev => ({ ...prev, [id]: url }))

  // Birthdays & anniversaries — auto-pulled + editable
  const autoBdays = getBirthdaysThisMonth(leaders, monthNum)
  const autoAnnivs = getAnniversariesThisMonth(leaders, monthNum)

  const [editedBdays,  setEditedBdays]  = useState(null) // null = use auto
  const [editedAnnivs, setEditedAnnivs] = useState(null)
  const [newBdayName,  setNewBdayName]  = useState('')
  const [newAnnivName, setNewAnnivName] = useState('')
  const [newAnnivYears, setNewAnnivYears] = useState('')

  const birthdays    = editedBdays  ?? autoBdays
  const anniversaries = editedAnnivs ?? autoAnnivs

  const initBdays  = () => { if (!editedBdays)  setEditedBdays([...autoBdays]) }
  const initAnnivs = () => { if (!editedAnnivs) setEditedAnnivs([...autoAnnivs]) }

  const addBday = () => {
    if (!newBdayName.trim()) return
    initBdays()
    setEditedBdays(prev => [...(prev||autoBdays), { name: newBdayName.trim(), date: '', type: 'birthday' }])
    setNewBdayName('')
  }
  const removeBday = (i) => {
    initBdays()
    setEditedBdays(prev => (prev||autoBdays).filter((_, idx) => idx !== i))
  }
  const addAnniv = () => {
    if (!newAnnivName.trim()) return
    initAnnivs()
    setEditedAnnivs(prev => [...(prev||autoAnnivs), { name: newAnnivName.trim(), years: parseInt(newAnnivYears)||0, date: '', type: 'anniversary' }])
    setNewAnnivName(''); setNewAnnivYears('')
  }
  const removeAnniv = (i) => {
    initAnnivs()
    setEditedAnnivs(prev => (prev||autoAnnivs).filter((_, idx) => idx !== i))
  }

  const stats = [
    { label: 'Projects',   value: monthProjects.length },
    { label: 'Events',     value: upcomingEvents.length },
    { label: 'Members',    value: leaders.length },
    { label: 'Vol. Hours', value: volunteerHours || monthMeetings.length },
  ]

  const projectsWithImages = monthProjects.map(p => ({
    ...p,
    newsletterImage: projectImages[p.id] || p.image || '',
  }))

  const newsletterData = {
    month, year, heroImage, presidentMessage, clubTagline,
    projects: projectsWithImages,
    events:   upcomingEvents,
    stats, birthdays, anniversaries,
  }

  const handleGenerate = () => setGenerated(true)

  const handleExportPDF = () => {
    const html = buildNewsletterHTML(newsletterData)
    const w = window.open('', '_blank')
    w.document.write(html); w.document.close()
    w.onload = () => w.print()
  }

  const handlePushToBlog = async () => {
    setPushing(true)
    const html  = buildNewsletterHTML(newsletterData)
    const title = customTitle || `${month} ${year} Newsletter — Rotaract BTM`
    await saveBlog({
      id:           `newsletter-${monthKey}-${Date.now()}`,
      title, slug:  `newsletter-${monthKey}`,
      excerpt:      `Rotaract Bengaluru BTM's monthly newsletter for ${month} ${year}. ${monthProjects.length} projects · ${upcomingEvents.length} upcoming events.`,
      content:      html,
      coverImage:   heroImage || '',
      category:     'Newsletter',
      author:       'Rotaract BTM',
      published:    true,
      publishedAt:  new Date().toISOString(),
      createdAt:    new Date().toISOString(),
      isNewsletter: true,
    })
    setPushing(false); setPushed(true)
    setTimeout(() => setPushed(false), 4000)
  }

  const cardClass = 'bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/8 p-6'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-rotary-navy-light pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8"
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start gap-3">
            <button onClick={onBack}
              className="mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#D31145' }} />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: '#D31145' }}>Newsletter Generator</p>
              </div>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal dark:text-white">Monthly Newsletter</h2>
              <p className="text-sm text-gray-400 dark:text-white/40 mt-1">Auto-generate · Edit · Push to Blog</p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">

          {/* ── Left: Controls ── */}
          <div className="space-y-4">

            {/* Month selector */}
            <motion.div className={cardClass} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <h3 className="font-display font-bold text-base mb-4">Select Month</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => { setMonthOffset(o => o - 1); setGenerated(false) }}
                  className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex-1 text-center">
                  <p className="font-display font-bold text-lg text-rotary-charcoal dark:text-white">{month} {year}</p>
                  <p className="text-xs text-gray-400 dark:text-white/40">{monthProjects.length} projects · {monthMeetings.length} meetings</p>
                </div>
                <button onClick={() => { setMonthOffset(o => o + 1); setGenerated(false) }}
                  className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </motion.div>

            {/* Customize */}
            <motion.div className={cardClass} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h3 className="font-display font-bold text-base mb-4">Customize</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Newsletter Title (optional)</label>
                  <input className={inputClass} placeholder={`${month} ${year} Newsletter — Rotaract BTM`} value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Hero Image URL</label>
                  <input className={inputClass} placeholder="https://your-image.jpg" value={heroImage} onChange={e => setHeroImage(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Club Tagline</label>
                  <input className={inputClass} value={clubTagline} onChange={e => setClubTagline(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">President's / Leadership Message</label>
                  <textarea className={inputClass} rows={3} placeholder="Write a short message..." value={presidentMessage} onChange={e => setPresidentMessage(e.target.value)} />
                </div>
              </div>
            </motion.div>

            {/* Project images */}
            {monthProjects.length > 0 && (
              <motion.div className={cardClass} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
                <h3 className="font-display font-bold text-base mb-1">Project Images</h3>
                <p className="text-xs text-gray-400 dark:text-white/40 mb-4">Add an image URL for each project to show in the newsletter</p>
                <div className="space-y-3">
                  {monthProjects.map(p => (
                    <div key={p.id}>
                      <label className="text-xs font-semibold text-rotary-charcoal dark:text-white block mb-1 truncate">{p.title}</label>
                      <div className="flex gap-2">
                        <input className={inputClass} placeholder="https://image-url.jpg"
                          value={projectImages[p.id] || p.image || ''}
                          onChange={e => setProjectImage(p.id, e.target.value)} />
                        {(projectImages[p.id] || p.image) && (
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                            <img src={projectImages[p.id] || p.image} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Birthdays & Anniversaries */}
            <motion.div className={cardClass} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
              <h3 className="font-display font-bold text-base mb-1">🎂 Birthdays & Anniversaries</h3>
              <p className="text-xs text-gray-400 dark:text-white/40 mb-4">
                Auto-pulled from member profiles · {autoBdays.length} birthday{autoBdays.length!==1?'s':''} · {autoAnnivs.length} wedding anniversary{autoAnnivs.length!==1?'ies':'y'} this month
              </p>

              {/* Birthdays */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-rotary-charcoal dark:text-white mb-2">Birthdays</p>
                <div className="space-y-1.5 mb-2">
                  {birthdays.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5">
                      <span className="text-sm flex-1 text-rotary-charcoal dark:text-white">{b.name}{b.date ? ` · ${b.date}th` : ''}</span>
                      <button onClick={() => removeBday(i)} className="text-gray-300 hover:text-red-400 transition-colors text-xs">✕</button>
                    </div>
                  ))}
                  {birthdays.length === 0 && <p className="text-xs text-gray-300 dark:text-white/20 italic">No birthdays added</p>}
                </div>
                <div className="flex gap-2">
                  <input className={inputClass} placeholder="Add member name" value={newBdayName} onChange={e => setNewBdayName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addBday()} />
                  <button onClick={addBday} className="px-3 py-2 rounded-lg text-sm font-semibold text-white shrink-0 transition-colors" style={{ background: '#D31145' }}>Add</button>
                </div>
              </div>

              {/* Anniversaries */}
              <div>
                <p className="text-xs font-semibold text-rotary-charcoal dark:text-white mb-2">Wedding Anniversaries</p>
                <div className="space-y-1.5 mb-2">
                  {anniversaries.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5">
                      <span className="text-sm flex-1 text-rotary-charcoal dark:text-white">{a.name}{a.years ? ` · ${a.years}yr` : ''}</span>
                      <button onClick={() => removeAnniv(i)} className="text-gray-300 hover:text-red-400 transition-colors text-xs">✕</button>
                    </div>
                  ))}
                  {anniversaries.length === 0 && <p className="text-xs text-gray-300 dark:text-white/20 italic">No anniversaries added</p>}
                </div>
                <div className="flex gap-2">
                  <input className={inputClass} placeholder="Member name" value={newAnnivName} onChange={e => setNewAnnivName(e.target.value)} />
                  <input className={`${inputClass} w-20`} placeholder="Yrs" type="number" value={newAnnivYears} onChange={e => setNewAnnivYears(e.target.value)} />
                  <button onClick={addAnniv} className="px-3 py-2 rounded-lg text-sm font-semibold text-white shrink-0 transition-colors" style={{ background: '#1a73e8' }}>Add</button>
                </div>
              </div>
            </motion.div>

            {/* Auto-pulled summary */}
            <motion.div className={cardClass} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}>
              <h3 className="font-display font-bold text-base mb-4">Auto-pulled Data</h3>
              <div className="space-y-0">
                {[
                  { label: 'Projects this month', value: monthProjects.length, color: 'text-rotary-blue' },
                  { label: 'Upcoming events',      value: upcomingEvents.length, color: 'text-rotary-gold' },
                  { label: 'Club members',         value: leaders.length,        color: 'text-emerald-600' },
                  { label: 'Volunteer hours',      value: `${volunteerHours}h`,  color: 'text-violet-600' },
                  { label: 'Total participants',   value: participants,           color: 'text-amber-600' },
                  { label: 'Birthdays this month', value: birthdays.length,      color: 'text-pink-500' },
                  { label: 'Wedding anniversaries', value: anniversaries.length, color: 'text-blue-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-white/5 last:border-0">
                    <span className="text-sm text-gray-500 dark:text-white/50">{label}</span>
                    <span className={`text-sm font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Generate button */}
            <motion.button onClick={handleGenerate}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              style={{ background: '#D31145' }}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Newsletter Preview
            </motion.button>
          </div>

          {/* ── Right: Preview ── */}
          <div className="space-y-4">
            <AnimatePresence>
              {generated && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button onClick={handleExportPDF}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-semibold text-rotary-charcoal dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Export PDF
                    </button>
                    <button onClick={handlePushToBlog} disabled={pushing || pushed}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors text-white disabled:opacity-70"
                      style={{ background: pushed ? '#22c55e' : '#1a73e8' }}>
                      {pushing ? (
                        <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Publishing...</>
                      ) : pushed ? (
                        <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Published!</>
                      ) : (
                        <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>Push to Blog</>
                      )}
                    </button>
                  </div>

                  {/* Mini preview */}
                  <div className={`${cardClass} overflow-hidden`}>
                    <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />Preview
                    </h3>
                    <div className="rounded-xl overflow-hidden border border-gray-100 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>

                      {/* Hero */}
                      <div className="relative h-28 flex items-end"
                        style={{ background: heroImage ? `url(${heroImage}) center/cover` : 'linear-gradient(135deg,#D31145,#1a73e8)' }}>
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.7),transparent)' }} />
                        <div className="relative p-3">
                          <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>Rotaract Bengaluru BTM</div>
                          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{month} {year}</div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-4" style={{ background: '#D31145' }}>
                        {stats.map(s => (
                          <div key={s.label} className="p-2 text-center border-r border-white/20 last:border-0">
                            <div style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>{s.value}</div>
                            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 8, textTransform: 'uppercase' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Projects */}
                      {monthProjects.length > 0 && (
                        <div className="p-3 border-b border-gray-100">
                          <div style={{ fontSize: 8, color: '#D31145', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Projects</div>
                          {monthProjects.slice(0, 2).map((p, i) => (
                            <div key={i} className="mb-2">
                              {(projectImages[p.id] || p.image) && (
                                <div className="h-16 rounded overflow-hidden mb-1">
                                  <img src={projectImages[p.id] || p.image} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: 11 }}>{p.title}</div>
                              <div style={{ color: '#888', fontSize: 9 }}>{p.avenue || ''}</div>
                            </div>
                          ))}
                          {monthProjects.length > 2 && <div style={{ color: '#888', fontSize: 9 }}>+{monthProjects.length - 2} more...</div>}
                        </div>
                      )}

                      {/* Birthdays preview */}
                      {(birthdays.length > 0 || anniversaries.length > 0) && (
                        <div className="p-3 border-b border-gray-100" style={{ background: '#fff8f0' }}>
                          <div style={{ fontSize: 8, color: '#D31145', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Celebrations</div>
                          {birthdays.slice(0, 2).map((b, i) => (
                            <div key={i} style={{ fontSize: 10, color: '#1a1a2e', marginBottom: 2 }}>🎂 {b.name}</div>
                          ))}
                          {anniversaries.slice(0, 2).map((a, i) => (
                            <div key={i} style={{ fontSize: 10, color: '#1a1a2e', marginBottom: 2 }}>🌟 {a.name}{a.years ? ` · ${a.years}yr` : ''}</div>
                          ))}
                        </div>
                      )}

                      {/* Events */}
                      {upcomingEvents.length > 0 && (
                        <div className="p-3 border-b border-gray-100" style={{ background: '#f8f9fa' }}>
                          <div style={{ fontSize: 8, color: '#D31145', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Upcoming Events</div>
                          {upcomingEvents.slice(0, 2).map((e, i) => (
                            <div key={i} className="flex items-center gap-2 mb-1.5">
                              <div style={{ background: '#D31145', color: '#fff', borderRadius: 4, padding: '2px 5px', fontSize: 10, fontWeight: 800 }}>{new Date(e.date).getDate()}</div>
                              <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 10 }}>{e.title}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="p-3 text-center" style={{ background: '#1a1a2e' }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 10 }}>Rotaract Club of Bengaluru BTM</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, marginTop: 1 }}>RID 3191 · Create. Lead. Inspire.</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-400 dark:text-white/30">Export PDF to print · Push to Blog to publish on website</p>
                </motion.div>
              )}
            </AnimatePresence>

            {!generated && (
              <div className={`${cardClass} flex flex-col items-center justify-center py-20 text-center`}>
                <svg className="w-12 h-12 text-gray-200 dark:text-white/10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <p className="font-display font-bold text-lg text-rotary-charcoal dark:text-white mb-1">Preview will appear here</p>
                <p className="text-sm text-gray-400 dark:text-white/30">Fill in the details then click Generate</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
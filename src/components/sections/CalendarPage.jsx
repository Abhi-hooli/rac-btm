import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'
import { useCollection } from '../../hooks/useFirestore'

const STANDARD_EVENTS = [
  { id: 's1', title: 'World Rotary Day', month: 2, day: 23, category: 'rotary', desc: "Anniversary of Rotary International's founding (1905)" },
  { id: 's2', title: 'Rotaract Day', month: 1, day: 23, category: 'rotary', desc: "Anniversary of Rotaract's establishment (1968)" },
  { id: 's3', title: 'World Polio Day', month: 10, day: 24, category: 'rotary', desc: 'Global initiative to eradicate polio — a Rotary-led cause' },
  { id: 's4', title: 'Paul Harris Birthday', month: 4, day: 19, category: 'rotary', desc: 'Birthday of Rotary International founder Paul Harris' },
  { id: 's18', title: 'Republic Day', month: 1, day: 26, category: 'national', desc: "India's Republic Day" },
  { id: 's19', title: 'Independence Day', month: 8, day: 15, category: 'national', desc: "India's Independence Day" },
  { id: 's20', title: 'Gandhi Jayanti', month: 10, day: 2, category: 'national', desc: 'Birthday of Mahatma Gandhi — Father of the Nation' },
  { id: 's21', title: "International Women's Day", month: 3, day: 8, category: 'social', desc: "Celebrating women's achievements worldwide" },
  { id: 's22', title: 'International Day of Peace', month: 9, day: 21, category: 'social', desc: '24 hours of non-violence and ceasefire globally' },
  { id: 's23', title: 'World Kindness Day', month: 11, day: 13, category: 'social', desc: 'Highlights kind acts that bind communities together' },
  { id: 's24', title: 'Human Rights Day', month: 12, day: 10, category: 'social', desc: 'Anniversary of the Universal Declaration of Human Rights' },
]

const CATEGORY_CONFIG = {
  rotary:      { label: 'Rotary',      color: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', light: 'bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20' },
  national:    { label: 'National',    color: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', light: 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20' },
  social:      { label: 'Social',      color: 'bg-pink-500',   text: 'text-pink-600 dark:text-pink-400',     light: 'bg-pink-50 dark:bg-pink-500/10 border-pink-100 dark:border-pink-500/20' },
  birthday:    { label: 'Birthday',    color: 'bg-rose-400',   text: 'text-rose-600 dark:text-rose-400',     light: 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20' },
  anniversary: { label: 'Anniversary', color: 'bg-cyan-500',   text: 'text-cyan-600 dark:text-cyan-400',     light: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-100 dark:border-cyan-500/20' },
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function parseToMonthDay(val) {
  if (!val) return null
  const str = String(val).trim()
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (dmy) return { month: parseInt(dmy[2]), day: parseInt(dmy[1]) }
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return { month: parseInt(iso[2]), day: parseInt(iso[3]) }
  const md = str.match(/^(\d{1,2})-(\d{1,2})$/)
  if (md) return { month: parseInt(md[1]), day: parseInt(md[2]) }
  if (!isNaN(val) && typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000))
    return { month: d.getUTCMonth() + 1, day: d.getUTCDate() }
  }
  return null
}

function storableDate(val) {
  if (!val) return ''
  const str = String(val).trim()
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (dmy) {
    const yr = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
    return `${yr}-${String(dmy[2]).padStart(2,'0')}-${String(dmy[1]).padStart(2,'0')}`
  }
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str
  if (!isNaN(val) && typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000))
    return d.toISOString().split('T')[0]
  }
  return str
}

function getCalendarDays(year, month) {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev  = new Date(year, month, 0).getDate()
  const days = []
  for (let i = firstDay - 1; i >= 0; i--)     days.push({ day: daysInPrev - i, cur: false, date: new Date(year, month - 1, daysInPrev - i) })
  for (let i = 1; i <= daysInMonth; i++)       days.push({ day: i, cur: true,  date: new Date(year, month, i) })
  for (let i = 1; i <= 42 - days.length; i++)  days.push({ day: i, cur: false, date: new Date(year, month + 1, i) })
  return days
}

function getEventsForDate(date, membersInfo) {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const events = []
  STANDARD_EVENTS.forEach(e => { if (e.month === m && e.day === d) events.push({ ...e, type: 'standard' }) })
  membersInfo.forEach(mem => {
    if (mem.birthday) {
      const p = parseToMonthDay(mem.birthday)
      if (p && p.month === m && p.day === d) events.push({ id: `b-${mem.id}`, title: mem.name, category: 'birthday', desc: 'Member Birthday 🎂', type: 'birthday' })
    }
    if (mem.anniversary) {
      const p = parseToMonthDay(mem.anniversary)
      if (p && p.month === m && p.day === d) events.push({ id: `a-${mem.id}`, title: mem.name, category: 'anniversary', desc: 'Wedding Anniversary 💍', type: 'anniversary' })
    }
  })
  return events
}

// ── Import Modal ──
function ImportModal({ onClose, onImport }) {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
        if (!data.length) { setError('No data found in file.'); return }

        const normalize = s => String(s).toLowerCase().replace(/[\s_]/g, '')
        const headers   = Object.keys(data[0])
        const findCol   = (...keys) => headers.find(h => keys.some(k => normalize(h).includes(normalize(k))))

        const nameCol  = findCol('name', 'member')
        const bdayCol  = findCol('birthday', 'bday', 'dob', 'birthdate', 'birth')
        const annCol   = findCol('anniversary', 'anni', 'wedding', 'marriage')
        const notesCol = findCol('notes', 'note', 'remark')

        if (!nameCol) { setError('Could not find a "Name" column.'); return }

        const parsed = data.map((row, i) => ({
          id:          Date.now().toString() + '_' + i,
          name:        String(row[nameCol] || '').trim(),
          birthday:    bdayCol  ? storableDate(row[bdayCol])  : '',
          anniversary: annCol   ? storableDate(row[annCol])   : '',
          notes:       notesCol ? String(row[notesCol] || '').trim() : ''
        })).filter(r => r.name)

        setPreview({ parsed, cols: { nameCol, bdayCol, annCol } })
      } catch { setError('Failed to parse file. Ensure it is a valid .xlsx or .csv.') }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (!preview) return
    setLoading(true)
    await onImport(preview.parsed)
    setLoading(false)
    onClose()
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Birthday (DD/MM/YYYY)', 'Anniversary (DD/MM/YYYY)', 'Notes'],
      ['Rtr. John Doe', '15/08/1998', '20/03/2023', ''],
      ['Rtr. Jane Smith', '22/12/2000', '', 'Core Team'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Members')
    XLSX.writeFile(wb, 'rotaract-members-template.xlsx')
  }

  const iClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-rotary-navy-light rounded-xl shadow-2xl" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-lg">Bulk Import Members</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {!preview ? (
            <>
              <div
                className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-10 text-center cursor-pointer hover:border-rotary-blue dark:hover:border-rotary-blue/50 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
              >
                <svg className="w-10 h-10 mx-auto text-rotary-slate dark:text-white/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="font-medium">Drop your .xlsx or .csv file here</p>
                <p className="text-sm text-rotary-slate dark:text-white/40 mt-1">or click to browse</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              </div>

              {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

              <div className="mt-4 p-4 rounded-lg bg-rotary-cloud dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                <p className="text-sm font-medium mb-2">Expected columns:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['Name *', 'Birthday (DD/MM/YYYY)', 'Anniversary (DD/MM/YYYY)', 'Notes'].map(c => (
                    <span key={c} className="px-2 py-1 rounded-lg bg-white dark:bg-white/5 text-xs font-mono border border-gray-200 dark:border-white/10">{c}</span>
                  ))}
                </div>
                <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs font-medium text-rotary-blue hover:underline">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Download Template
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">{preview.parsed.length} members parsed</p>
                  <p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">
                    Columns: Name ✓ {preview.cols.bdayCol ? '· Birthday ✓' : ''} {preview.cols.annCol ? '· Anniversary ✓' : ''}
                  </p>
                </div>
                <button onClick={() => setPreview(null)} className="text-xs text-rotary-blue hover:underline">Re-upload</button>
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden mb-5">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-white/[0.03]">
                      <tr className="border-b border-gray-100 dark:border-white/5">
                        <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Name</th>
                        <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Birthday</th>
                        <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Anniversary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.parsed.map(r => (
                        <tr key={r.id} className="border-b border-gray-50 dark:border-white/[0.03]">
                          <td className="px-4 py-2.5 font-medium">{r.name}</td>
                          <td className="px-4 py-2.5 text-rotary-slate dark:text-white/50 text-xs">
                            {r.birthday ? new Date(r.birthday + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-rotary-slate dark:text-white/50 text-xs">
                            {r.anniversary ? new Date(r.anniversary + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleImport} disabled={loading} className="px-6 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm hover:bg-rotary-gold-light disabled:opacity-50 transition-colors">
                  {loading ? 'Importing...' : `Import ${preview.parsed.length} Members`}
                </button>
                <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Calendar Page ──
export default function CalendarPage({ onBack, isAdmin }) {
  const today = new Date()
  const [viewYear, setViewYear]           = useState(today.getFullYear())
  const [viewMonth, setViewMonth]         = useState(today.getMonth())
  const [selectedDate, setSelectedDate]   = useState(null)
  const [activeFilters, setActiveFilters] = useState(new Set(Object.keys(CATEGORY_CONFIG)))
  const [memberForm, setMemberForm]       = useState({ name: '', birthday: '', anniversary: '', notes: '' })

  // ── FIX 1: Missing state variables ──
  const [showAddMember, setShowAddMember] = useState(false)
  const [showImport, setShowImport]       = useState(false)

  // ── FIX 2: Destructure add/remove from useCollection ──
  const { data: membersInfo, loading, add: saveMember, remove: removeMember } = useCollection('leaders')

  const days = getCalendarDays(viewYear, viewMonth)

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0)  } else setViewMonth(m => m + 1) }
  const goToday   = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }

  const toggleFilter = (cat) => {
    setActiveFilters(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n })
  }

  const getFiltered = (date) => getEventsForDate(date, membersInfo).filter(e => activeFilters.has(e.category))

  const selectedEvents = selectedDate ? getFiltered(selectedDate) : []

  const upcoming = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    getEventsForDate(d, membersInfo).filter(e => activeFilters.has(e.category)).forEach(e => upcoming.push({ ...e, date: d }))
  }

  const handleBulkImport = async (parsed) => {
    await Promise.all(parsed.map(m => saveMember(m)))
  }

  const handleAddMember = async () => {
    if (!memberForm.name) return
    await saveMember({ ...memberForm, id: Date.now().toString() })
    setMemberForm({ name: '', birthday: '', anniversary: '', notes: '' })
    setShowAddMember(false)
  }

  const iClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

  return (
    <div className="min-h-screen pt-5">
      <div className="section-padding max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="heading-lg">Club <span className="text-gradient">Calendar</span></h1>
              <p className="text-rotary-slate dark:text-white/50 text-sm mt-0.5">Events, birthdays, anniversaries & more</p>
            </div>
          </div>

          {/* Admin action buttons */}
          
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-8">

          {/* Left: Calendar */}
          <div>
            {/* Category filters */}
            <div className="flex flex-wrap gap-2 mb-5">
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => toggleFilter(key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${activeFilters.has(key) ? `${cfg.light} ${cfg.text}` : 'bg-gray-100 dark:bg-white/5 text-rotary-slate dark:text-white/30 border-transparent'}`}>
                  <span className={`w-2 h-2 rounded-full ${activeFilters.has(key) ? cfg.color : 'bg-gray-300 dark:bg-white/20'}`} />
                  {cfg.label}
                </button>
              ))}
            </div>

            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl">{MONTHS[viewMonth]} {viewYear}</h2>
              <div className="flex items-center gap-2">
                <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Today</button>
                <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/5">
            <div className="bg-white dark:bg-rotary-navy-light rounded-xl overflow-hidden min-w-[336px]">
              <div className="grid grid-cols-7 border-b border-gray-100 dark:border-white/5">
                {DAYS.map(d => <div key={d} className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rotary-slate dark:text-white/40 py-3">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map((cell, idx) => {
                  const events  = getFiltered(cell.date)
                  const isToday = cell.cur && cell.date.toDateString() === today.toDateString()
                  const isSel   = selectedDate && cell.date.toDateString() === selectedDate.toDateString()
                  return (
                    <div key={idx} onClick={() => setSelectedDate(isSel ? null : cell.date)} className={`min-h-[72px] p-1.5 border-b border-r border-gray-50 dark:border-white/[0.03] cursor-pointer transition-colors ${!cell.cur ? 'bg-gray-50/50 dark:bg-white/[0.01]' : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'} ${isSel ? '!bg-rotary-blue/[0.04] dark:!bg-rotary-blue/[0.08]' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium mb-1 ${isToday ? 'bg-rotary-blue text-white' : cell.cur ? 'text-rotary-charcoal dark:text-white' : 'text-gray-400 dark:text-white/20'}`}>
                        {cell.day}
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        {events.slice(0, 3).map((e, i) => (
                          <div key={i} className={`h-1.5 rounded-full ${CATEGORY_CONFIG[e.category]?.color}`} style={{ width: events.length === 1 ? '90%' : '28%' }} />
                        ))}
                        {events.length > 3 && <span className="text-[9px] text-rotary-slate dark:text-white/30">+{events.length - 3}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            </div>

            {/* Selected Day Panel */}
            <AnimatePresence>
              {selectedDate && (
                <motion.div className="mt-4 bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-5" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold">{selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                    <button onClick={() => setSelectedDate(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                      <svg className="w-4 h-4 text-rotary-slate dark:text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  {selectedEvents.length === 0 ? (
                    <p className="text-sm text-rotary-slate dark:text-white/30">No events on this day.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedEvents.map((e, i) => {
                        const cfg = CATEGORY_CONFIG[e.category]
                        return (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.light}`}>
                            <span className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${cfg.color}`} />
                            <div>
                              <p className={`font-semibold text-sm ${cfg.text}`}>{e.title}</p>
                              <p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">{e.desc}</p>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.light} ${cfg.text}`}>{cfg.label}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-5">
            {/* Upcoming Events */}
            <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-5">
              <h3 className="font-display font-semibold text-sm mb-4">Next 30 Days</h3>
              {upcoming.length === 0 ? (
                <p className="text-xs text-rotary-slate dark:text-white/30">No events coming up.</p>
              ) : (
                <div className="space-y-1">
                  {upcoming.slice(0, 10).map((e, i) => {
                    const cfg     = CATEGORY_CONFIG[e.category]
                    const isToday = e.date.toDateString() === today.toDateString()
                    return (
                      <div key={i} className="flex items-center gap-3 -mx-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors" onClick={() => { setSelectedDate(e.date); setViewYear(e.date.getFullYear()); setViewMonth(e.date.getMonth()) }}>
                        <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center shrink-0 ${isToday ? 'bg-rotary-blue text-white' : 'bg-gray-100 dark:bg-white/5'}`}>
                          <span className="text-[9px] font-semibold leading-none">{MONTHS[e.date.getMonth()].slice(0,3).toUpperCase()}</span>
                          <span className="text-sm font-bold leading-tight">{e.date.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          <p className={`text-xs ${cfg.text}`}>{cfg.label}</p>
                        </div>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.color}`} />
                      </div>
                    )
                  })}
                  {upcoming.length > 10 && <p className="text-xs text-rotary-slate dark:text-white/30 text-center pt-1">+{upcoming.length - 10} more</p>}
                </div>
              )}
            </div>

            {/* Members list — birthdays/anniversaries feed the public calendar,
                but the roster itself (name + date-of-birth) is admin-only,
                not something every site visitor should be able to browse. */}
            {isAdmin && (loading || membersInfo.length > 0) && (
              <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-5">
                <h3 className="font-display font-semibold text-sm mb-4">
                  Members {!loading && `(${membersInfo.length})`}
                </h3>
                <p className="text-xs text-rotary-slate dark:text-white/40 mb-3">
                  Admin-only — manage the birthdays &amp; anniversaries that appear on the calendar above.
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                  {loading ? (
                    [...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-white/[0.03] last:border-0 animate-pulse">
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-28 bg-gray-200 dark:bg-white/10 rounded-full" />
                          <div className="h-2.5 w-20 bg-gray-100 dark:bg-white/5 rounded-full" />
                        </div>
                        <div className="w-6 h-6 rounded bg-gray-100 dark:bg-white/5" />
                      </div>
                    ))
                  ) : (
                    membersInfo.map(m => (
                      <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-white/[0.03] last:border-0">
                        <div>
                          <p className="text-sm font-medium">{m.name}</p>
                          <div className="flex gap-2 mt-0.5">
                            {m.birthday    && <span className="text-[10px] text-rose-500">🎂 {new Date(m.birthday    + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                            {m.anniversary && <span className="text-[10px] text-cyan-500">💍 {new Date(m.anniversary + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                          </div>
                        </div>
                        <button onClick={() => removeMember(m.id)} className="w-6 h-6 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center transition-colors shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMember && (
          <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddMember(false)} />
            <motion.div className="relative w-full max-w-md bg-white dark:bg-rotary-navy-light rounded-xl shadow-2xl p-6" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-lg">Add Member</h3>
                <button onClick={() => setShowAddMember(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="space-y-3">
                <input className={iClass} placeholder="Full Name *" value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} />
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Birthday</label>
                  <input className={iClass} type="date" value={memberForm.birthday} onChange={e => setMemberForm({ ...memberForm, birthday: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Anniversary</label>
                  <input className={iClass} type="date" value={memberForm.anniversary} onChange={e => setMemberForm({ ...memberForm, anniversary: e.target.value })} />
                </div>
                <input className={iClass} placeholder="Notes (optional)" value={memberForm.notes} onChange={e => setMemberForm({ ...memberForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleAddMember} disabled={!memberForm.name} className="px-6 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm disabled:opacity-50 hover:bg-rotary-gold-light transition-colors">Add</button>
                <button onClick={() => setShowAddMember(false)} className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleBulkImport} />}
      </AnimatePresence>
    </div>
  )
}
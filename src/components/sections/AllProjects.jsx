import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'
import { useCollection } from '../../hooks/useFirestore'
import { colorOptions, rotaractAvenues, areasOfFocus, inputClass, ProjectModal } from './Projects'
import { logAction } from '../../utils/auditLog'

const activityTypes = [
  'Standalone Activity',
  'Hosted Activity',
  'Joint Activity',
  'Participatory Activity',
  'Partnered with Sponsored Club',
]

// ── Template columns (order matters for XLS) ─────────────────────────────────
const TEMPLATE_COLUMNS = [
  'Title',
  'Activity Type',
  'Venue',
  'Start Date (YYYY-MM-DD)',
  'End Date (YYYY-MM-DD)',
  'Avenue of Service',
  'Area of Focus',
  'Host Club',
  'Partner Clubs',
  'External Partners',
  'Expenses (INR)',
  'Cash Contributions (INR)',
  'In-Kind Contributions (INR)',
  'Participants',
  'Beneficiaries',
  'Volunteers',
  'Volunteer Hours',
  'Description',
  'Image URL',
]

// Map XLS column → Firestore field
const COL_MAP = {
  'Title':                       'title',
  'Activity Type':               'activityType',
  'Venue':                       'venue',
  'Start Date (YYYY-MM-DD)':     'startDate',
  'End Date (YYYY-MM-DD)':       'endDate',
  'Avenue of Service':           'avenue',
  'Area of Focus':               'areaOfFocus',
  'Host Club':                   'hostClub',
  'Partner Clubs':               'partnerClubs',
  'External Partners':           'externalPartners',
  'Expenses (INR)':              'expenses',
  'Cash Contributions (INR)':    'cashContributions',
  'In-Kind Contributions (INR)': 'inKindContributions',
  'Participants':                'participants',
  'Beneficiaries':               'beneficiaries',
  'Volunteers':                  'volunteers',
  'Volunteer Hours':             'volunteerHours',
  'Description':                 'description',
  'Image URL':                   'image',
}

// ── Download template ─────────────────────────────────────────────────────────
function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  // Main data sheet
  const exampleRow = [
    'Blood Donation Drive',
    'Standalone Activity',
    'BTM Community Hall',
    '2025-08-01',
    '2025-08-01',
    'Community Service',
    'Disease Prevention and Treatment',
    '',
    '',
    'Red Cross',
    5000,
    10000,
    0,
    120,
    80,
    15,
    45,
    'A blood donation camp organized in BTM Layout.',
    '',
  ]
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, exampleRow])

  // Column widths
  ws['!cols'] = TEMPLATE_COLUMNS.map(col =>
    col.length > 20 ? { wch: col.length + 4 } : { wch: 22 }
  )

  // Header style (bold via cell metadata — SheetJS community doesn't support styles, handled via Notes sheet)
  XLSX.utils.book_append_sheet(wb, ws, 'Projects')

  // Reference sheet — valid values
  const refData = [
    ['Activity Types', 'Avenues of Service', 'Areas of Focus'],
    ...Array.from({ length: Math.max(activityTypes.length, rotaractAvenues.length, areasOfFocus.length) }, (_, i) => [
      activityTypes[i] || '',
      rotaractAvenues[i] || '',
      areasOfFocus[i] || '',
    ])
  ]
  const wsRef = XLSX.utils.aoa_to_sheet(refData)
  wsRef['!cols'] = [{ wch: 35 }, { wch: 30 }, { wch: 42 }]
  XLSX.utils.book_append_sheet(wb, wsRef, 'Reference Values')

  XLSX.writeFile(wb, 'rotaract-projects-template.xlsx')
}

// ── Parse uploaded XLS ────────────────────────────────────────────────────────
function parseXLS(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
        if (rows.length < 2) { resolve([]); return }

        const headers = rows[0].map(h => String(h).trim())
        const parsed = rows.slice(1)
          .filter(row => row.some(cell => cell !== '' && cell !== undefined))
          .map(row => {
            const obj = {
              color: colorOptions[0].value,
              featured: false,
              activityType: activityTypes[0],
              avenue: rotaractAvenues[0],
              areaOfFocus: areasOfFocus[0],
            }
            headers.forEach((header, i) => {
              const field = COL_MAP[header]
              if (!field) return
              const val = row[i]
              if (val === undefined || val === '') return
              // Numbers
              if (['expenses','cashContributions','inKindContributions','participants','beneficiaries','volunteers','volunteerHours'].includes(field)) {
                obj[field] = parseInt(val) || 0
              } else {
                obj[field] = String(val).trim()
              }
            })
            return obj
          })
          .filter(p => p.title)

        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportToPDF(projects, dateRange) {
  const totals = projects.reduce((acc, p) => ({
    volunteerHours:  acc.volunteerHours  + (p.volunteerHours   || 0),
    contributions:   acc.contributions   + (p.cashContributions || 0),
    beneficiaries:   acc.beneficiaries   + (p.beneficiaries     || 0),
    participants:    acc.participants    + (p.participants      || 0),
    volunteers:      acc.volunteers      + (p.volunteers        || 0),
  }), { volunteerHours: 0, contributions: 0, beneficiaries: 0, participants: 0, volunteers: 0 })

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Rotaract Bengaluru BTM - Projects Report</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#333; padding:40px; max-width:900px; margin:0 auto; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #d41367; padding-bottom:20px; margin-bottom:30px; }
  .header h1 { font-size:22px; color:#d41367; }
  .header p { font-size:12px; color:#666; margin-top:4px; }
  .date-range { font-size:11px; color:#888; text-align:right; }
  .summary { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:30px; }
  .summary-card { background:#f9f9f9; border:1px solid #eee; border-radius:8px; padding:14px; text-align:center; }
  .summary-card .num { font-size:20px; font-weight:700; color:#d41367; }
  .summary-card .label { font-size:10px; color:#888; text-transform:uppercase; letter-spacing:0.5px; margin-top:4px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { background:#d41367; color:white; padding:10px 12px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; }
  td { padding:10px 12px; border-bottom:1px solid #eee; vertical-align:top; }
  tr:nth-child(even) { background:#fafafa; }
  .tag { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; margin-right:4px; }
  .tag-avenue { background:#e8f0fe; color:#1a73e8; }
  .tag-focus { background:#fef3c7; color:#92400e; }
  .footer { margin-top:30px; padding-top:15px; border-top:1px solid #eee; font-size:10px; color:#aaa; text-align:center; }
</style></head><body>
<div class="header">
  <div><h1>Rotaract Bengaluru BTM</h1><p>Projects Report — ${projects.length} project${projects.length !== 1 ? 's' : ''}</p></div>
  <div class="date-range">
    ${dateRange ? `<p>${dateRange}</p>` : '<p>All Projects</p>'}
    <p>Generated: ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</p>
  </div>
</div>
<div class="summary">
  <div class="summary-card"><div class="num">${totals.participants.toLocaleString()}</div><div class="label">Participants</div></div>
  <div class="summary-card"><div class="num">${totals.beneficiaries.toLocaleString()}</div><div class="label">Beneficiaries</div></div>
  <div class="summary-card"><div class="num">${totals.volunteers.toLocaleString()}</div><div class="label">Volunteers</div></div>
  <div class="summary-card"><div class="num">${totals.volunteerHours.toLocaleString()}</div><div class="label">Volunteer Hours</div></div>
  <div class="summary-card"><div class="num">₹${totals.contributions.toLocaleString()}</div><div class="label">Cash Contributions</div></div>
</div>
<table>
  <thead><tr><th>#</th><th>Project</th><th>Type</th><th>Avenue / Focus</th><th>Dates</th><th>Venue</th><th>Key Numbers</th></tr></thead>
  <tbody>
    ${projects.map((p, i) => {
      const start = p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : ''
      const end   = p.endDate   ? new Date(p.endDate).toLocaleDateString('en-IN',   { day:'numeric', month:'short', year:'numeric' }) : ''
      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${p.title}</strong><br><span style="font-size:11px;color:#666">${p.description || ''}</span></td>
        <td style="font-size:11px">${p.activityType || '—'}</td>
        <td>${p.avenue ? `<span class="tag tag-avenue">${p.avenue}</span>` : ''}${p.areaOfFocus ? `<span class="tag tag-focus">${p.areaOfFocus}</span>` : ''}</td>
        <td style="font-size:11px;color:#888">${start}${start && end ? ' → ' : ''}${end || ''}</td>
        <td style="font-size:11px">${p.venue || '—'}</td>
        <td style="font-size:11px">
          ${p.participants  ? `👥 ${p.participants}<br>`  : ''}
          ${p.beneficiaries ? `🎯 ${p.beneficiaries}<br>` : ''}
          ${p.volunteers    ? `🙋 ${p.volunteers}<br>`    : ''}
          ${p.volunteerHours ? `⏱ ${p.volunteerHours} hrs<br>` : ''}
          ${p.cashContributions ? `💰 ₹${p.cashContributions}` : ''}
        </td>
      </tr>`
    }).join('')}
  </tbody>
</table>
<div class="footer">Rotaract Club of Bengaluru BTM — RID 3191 — Create. Lead. Inspire.</div>
</body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.onload = () => w.print()
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportToCSV(projects) {
  const headers = ['Title','Type','Venue','Start Date','End Date','Avenue','Area of Focus','Host Club','Partner Clubs','External Partners','Expenses (₹)','Cash Contributions (₹)','In-Kind Contributions (₹)','Participants','Beneficiaries','Volunteers','Volunteer Hours']
  const rows = projects.map(p => [
    `"${(p.title||'').replace(/"/g,'""')}"`,
    `"${(p.activityType||'').replace(/"/g,'""')}"`,
    `"${(p.venue||'').replace(/"/g,'""')}"`,
    p.startDate||'', p.endDate||'',
    `"${(p.avenue||'').replace(/"/g,'""')}"`,
    `"${(p.areaOfFocus||'').replace(/"/g,'""')}"`,
    `"${(p.hostClub||'').replace(/"/g,'""')}"`,
    `"${(p.partnerClubs||'').replace(/"/g,'""')}"`,
    `"${(p.externalPartners||'').replace(/"/g,'""')}"`,
    p.expenses||0, p.cashContributions||0, p.inKindContributions||0,
    p.participants||0, p.beneficiaries||0, p.volunteers||0, p.volunteerHours||0,
  ].join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `rotaract-projects-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Filter groups ─────────────────────────────────────────────────────────────
const FILTER_GROUPS = [
  { label: 'All',              key: 'all',          options: [] },
  { label: 'Rotaract Avenues', key: 'avenue',       options: rotaractAvenues },
  { label: 'Areas of Focus',   key: 'areaOfFocus',  options: areasOfFocus },
  { label: 'Activity Type',    key: 'activityType', options: activityTypes },
]

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label, sub }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
      <div>
        <p className="text-sm font-semibold text-rotary-charcoal dark:text-white">{label}</p>
        {sub && <p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">{sub}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-rotary-blue' : 'bg-gray-300 dark:bg-white/20'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

// ── Empty form ────────────────────────────────────────────────────────────────
const emptyForm = {
  title:'', activityType:activityTypes[0], venue:'', startDate:'', endDate:'',
  avenue:rotaractAvenues[0], areaOfFocus:areasOfFocus[0],
  hostClub:'', partnerClubs:'', externalPartners:'',
  expenses:0, cashContributions:0, inKindContributions:0,
  participants:0, beneficiaries:0, volunteers:0, volunteerHours:0,
  description:'', image:'', color:colorOptions[0].value, featured:false,
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AllProjects({ isAdmin, onBack }) {
  const { data: projects, loading, save, remove } = useCollection('projects')
  const [selectedProject, setSelectedProject] = useState(null)
  const [showForm,   setShowForm]   = useState(false)
  const [editingId,  setEditingId]  = useState(null)
  const [form,       setForm]       = useState(emptyForm)

  // filters
  const [filterGroup, setFilterGroup] = useState('all')
  const [filterValue, setFilterValue] = useState('All')

  // export
  const [showExport, setShowExport] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo,   setExportTo]   = useState('')

  // bulk upload
  const [showBulk,      setShowBulk]      = useState(false)
  const [bulkPreview,   setBulkPreview]   = useState([])  // parsed rows
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkDone,      setBulkDone]      = useState(false)
  const [bulkError,     setBulkError]     = useState('')
  const fileInputRef = useRef(null)

  const set    = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setNum = (key, val) => set(key, parseInt(val) || 0)

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false) }

  const handleSave = async () => {
    if (!form.title) return
    await save({ ...form, id: editingId || Date.now().toString() })
    logAction({ admin: 'admin', action: editingId ? 'EDIT' : 'CREATE', module: 'Projects', item: form.title, details: `Project ${editingId ? 'updated' : 'created'}` })
    resetForm()
  }


  const handleEdit = (p) => {
    setForm({
      title: p.title||'', activityType: p.activityType||activityTypes[0],
      venue: p.venue||'', startDate: p.startDate||'', endDate: p.endDate||'',
      avenue: p.avenue||rotaractAvenues[0], areaOfFocus: p.areaOfFocus||areasOfFocus[0],
      hostClub: p.hostClub||'', partnerClubs: p.partnerClubs||'', externalPartners: p.externalPartners||'',
      expenses: p.expenses||0, cashContributions: p.cashContributions||0, inKindContributions: p.inKindContributions||0,
      participants: p.participants||0, beneficiaries: p.beneficiaries||0,
      volunteers: p.volunteers||0, volunteerHours: p.volunteerHours||0,
      description: p.description||'', image: p.image||'',
      color: p.color||colorOptions[0].value, featured: p.featured||false,
    })
    setEditingId(p.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRemove = async (id) => {
    if (confirm('Remove this project?')) {
      const projectTitle = projects.find(p => p.id === id)?.title || id
      await remove(id)
      logAction({ admin: 'admin', action: 'DELETE', module: 'Projects', item: projectTitle, details: 'Project deleted' })
    }
  }

  // ── Bulk upload handlers ──
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBulkError('')
    setBulkDone(false)
    try {
      const parsed = await parseXLS(file)
      if (parsed.length === 0) {
        setBulkError('No valid rows found. Make sure the file uses the provided template.')
        return
      }
      setBulkPreview(parsed)
    } catch {
      setBulkError('Could not read the file. Please use the downloaded template.')
    }
    e.target.value = ''
  }

  const handleBulkConfirm = async () => {
    setBulkUploading(true)
    try {
      for (const project of bulkPreview) {
        await save({ ...project, id: Date.now().toString() + Math.random().toString(36).slice(2) })
      }
      setBulkDone(true)
      setBulkPreview([])
    } catch {
      setBulkError('Upload failed. Please try again.')
    }
    setBulkUploading(false)
  }

  const resetBulk = () => { setBulkPreview([]); setBulkDone(false); setBulkError(''); setShowBulk(false) }

  const handleExport = (asPDF = false) => {
    let out = [...projects]
    if (exportFrom) out = out.filter(p => (p.startDate||'') >= exportFrom)
    if (exportTo)   out = out.filter(p => (p.startDate||'') <= exportTo)
    if (filterValue !== 'All') out = out.filter(p => p.avenue===filterValue||p.areaOfFocus===filterValue||p.activityType===filterValue)
    const label = exportFrom||exportTo
      ? `${exportFrom ? new Date(exportFrom).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : 'Start'} — ${exportTo ? new Date(exportTo).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : 'Present'}`
      : ''
    if (asPDF) exportToPDF(out, label)
    else exportToCSV(out)
    setShowExport(false)
  }

  const filtered = (() => {
    if (filterGroup==='all'||filterValue==='All') return projects
    return projects.filter(p => {
      if (filterGroup==='avenue')       return p.avenue===filterValue
      if (filterGroup==='areaOfFocus')  return p.areaOfFocus===filterValue
      if (filterGroup==='activityType') return p.activityType===filterValue
      return true
    })
  })()
  const sorted = [...filtered].sort((a,b) => (a.order||0)-(b.order||0))

  return (
    <div className="min-h-screen pt-20">
      <div className="section-padding max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="heading-lg">All <span className="text-gradient">Projects</span></h1>
            <p className="text-rotary-slate dark:text-white/50 text-sm mt-1">{projects.length} projects total</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {FILTER_GROUPS.map(g => (
              <button key={g.key} onClick={() => { setFilterGroup(g.key); setFilterValue('All') }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filterGroup===g.key ? 'bg-rotary-blue text-white' : 'bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10'}`}
              >{g.label}</button>
            ))}
          </div>
          {filterGroup !== 'all' && (
            <motion.div className="flex flex-wrap gap-2" initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}>
              <button onClick={() => setFilterValue('All')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterValue==='All' ? 'bg-rotary-blue/15 text-rotary-blue' : 'bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10'}`}
              >All</button>
              {FILTER_GROUPS.find(g => g.key===filterGroup)?.options.map(opt => (
                <button key={opt} onClick={() => setFilterValue(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterValue===opt ? 'bg-rotary-blue/15 text-rotary-blue' : 'bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                >{opt}</button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 mb-6 flex-wrap">
          <button onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-rotary-charcoal dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
          {isAdmin && (
            <>
              <button onClick={() => { setShowBulk(!showBulk); setBulkPreview([]); setBulkDone(false); setBulkError('') }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-rotary-charcoal dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Bulk Upload
              </button>
              <button onClick={() => { if (showForm&&!editingId) resetForm(); else { resetForm(); setShowForm(true) } }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
                </svg>
                {showForm ? 'Cancel' : 'Add Project'}
              </button>
            </>
          )}
        </div>

        {/* Export Panel */}
        <AnimatePresence>
          {showExport && (
            <motion.div className="mb-6 bg-white dark:bg-rotary-navy-light rounded-xl p-5 border border-gray-100 dark:border-white/5"
              initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            >
              <h4 className="font-display font-semibold text-sm mb-4">Export Projects</h4>
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 w-full">
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">From Date</label>
                  <input className={inputClass} type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">To Date</label>
                  <input className={inputClass} type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} />
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <button onClick={() => handleExport(false)} className="px-5 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm hover:bg-rotary-gold-light transition-colors">CSV</button>
                  <button onClick={() => handleExport(true)}  className="px-5 py-2.5 rounded-lg bg-rotary-blue text-white font-semibold text-sm hover:bg-rotary-blue-dark transition-colors">PDF</button>
                  <button onClick={() => { setExportFrom(''); setExportTo(''); exportToPDF(projects,'') }} className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">All PDF</button>
                </div>
              </div>
              <p className="text-xs text-rotary-slate dark:text-white/30 mt-3">Leave dates empty to export all.{filterValue!=='All'&&` Filtered by: ${filterValue}.`}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bulk Upload Panel ── */}
        <AnimatePresence>
          {isAdmin && showBulk && (
            <motion.div className="mb-6 bg-white dark:bg-rotary-navy-light rounded-xl p-6 border border-gray-100 dark:border-white/5 shadow-sm"
              initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            >
              <h4 className="font-display font-semibold text-sm mb-1">Bulk Upload via Excel</h4>
              <p className="text-xs text-rotary-slate dark:text-white/40 mb-5">Download the template, fill in your projects, then upload it back.</p>

              {!bulkPreview.length && !bulkDone && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={downloadTemplate}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm hover:bg-rotary-gold-light transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Template
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rotary-blue text-white font-semibold text-sm hover:bg-rotary-blue-dark transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    Upload Filled Template
                  </button>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
                </div>
              )}

              {bulkError && (
                <p className="mt-3 text-xs text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{bulkError}</p>
              )}

              {/* Preview table */}
              {bulkPreview.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-rotary-charcoal dark:text-white">
                      {bulkPreview.length} project{bulkPreview.length !== 1 ? 's' : ''} ready to import
                    </p>
                    <button onClick={() => { setBulkPreview([]); setBulkError('') }}
                      className="text-xs text-rotary-slate dark:text-white/40 hover:text-red-500 transition-colors"
                    >Clear</button>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-white/10 mb-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-white/5">
                          {['Title','Type','Venue','Start Date','Avenue','Participants','Cash Contributions'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-rotary-slate dark:text-white/50 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreview.map((p, i) => (
                          <tr key={i} className="border-t border-gray-100 dark:border-white/5">
                            <td className="px-3 py-2 font-medium text-rotary-charcoal dark:text-white whitespace-nowrap max-w-[180px] truncate">{p.title}</td>
                            <td className="px-3 py-2 text-rotary-slate dark:text-white/50 whitespace-nowrap">{p.activityType}</td>
                            <td className="px-3 py-2 text-rotary-slate dark:text-white/50 whitespace-nowrap">{p.venue || '—'}</td>
                            <td className="px-3 py-2 text-rotary-slate dark:text-white/50 whitespace-nowrap">{p.startDate || '—'}</td>
                            <td className="px-3 py-2 text-rotary-slate dark:text-white/50 whitespace-nowrap">{p.avenue}</td>
                            <td className="px-3 py-2 text-rotary-slate dark:text-white/50 text-right">{p.participants || 0}</td>
                            <td className="px-3 py-2 text-rotary-slate dark:text-white/50 text-right">₹{(p.cashContributions||0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleBulkConfirm} disabled={bulkUploading}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm hover:bg-rotary-gold-light disabled:opacity-50 transition-colors"
                    >
                      {bulkUploading ? (
                        <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Uploading...</>
                      ) : `Confirm & Import ${bulkPreview.length} Projects`}
                    </button>
                    <button onClick={() => setBulkPreview([])}
                      className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >Cancel</button>
                  </div>
                </div>
              )}

              {bulkDone && (
                <div className="mt-4 flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20">
                  <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">Projects imported successfully!</p>
                  <button onClick={resetBulk} className="ml-auto text-xs text-green-600 dark:text-green-400 hover:underline">Close</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Add / Edit Form ── */}
        <AnimatePresence>
          {isAdmin && showForm && (
            <motion.div className="mb-10 bg-white dark:bg-rotary-navy-light rounded-xl p-6 md:p-8 border border-gray-100 dark:border-white/5 shadow-sm"
              initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            >
              <h3 className="font-display font-semibold text-lg mb-6">{editingId ? 'Edit Project' : 'New Project'}</h3>

              <p className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider mb-3">Project Details</p>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <input className={`${inputClass} md:col-span-2`} placeholder="Project Title *" value={form.title} onChange={e => set('title', e.target.value)} />
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Type</label>
                  <select className={inputClass} value={form.activityType} onChange={e => set('activityType', e.target.value)}>
                    {activityTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <input className={inputClass} placeholder="Venue" value={form.venue} onChange={e => set('venue', e.target.value)} />
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Start Date</label>
                  <input className={inputClass} type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">End Date</label>
                  <input className={inputClass} type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
                </div>
              </div>

              <p className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider mb-3">Clubs & Partners</p>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <input className={inputClass} placeholder="Host Club" value={form.hostClub} onChange={e => set('hostClub', e.target.value)} />
                <input className={inputClass} placeholder="Partner Clubs (comma-separated)" value={form.partnerClubs} onChange={e => set('partnerClubs', e.target.value)} />
                <input className={inputClass} placeholder="External Partners / NGOs" value={form.externalPartners} onChange={e => set('externalPartners', e.target.value)} />
              </div>

              <p className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider mb-3">Classification</p>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Avenues of Service</label>
                  <select className={inputClass} value={form.avenue} onChange={e => set('avenue', e.target.value)}>
                    {rotaractAvenues.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Areas of Focus</label>
                  <select className={inputClass} value={form.areaOfFocus} onChange={e => set('areaOfFocus', e.target.value)}>
                    {areasOfFocus.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <p className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider mb-3">Financials (₹)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {[{key:'expenses',label:'Expenses'},{key:'cashContributions',label:'Cash Contributions'},{key:'inKindContributions',label:'In-Kind Contributions'}].map(({key,label}) => (
                  <div key={key}>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">{label}</label>
                    <input className={inputClass} type="number" min="0" value={form[key]} onChange={e => setNum(key, e.target.value)} />
                  </div>
                ))}
              </div>

              <p className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider mb-3">Participation</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[{key:'participants',label:'Participants'},{key:'beneficiaries',label:'Beneficiaries'},{key:'volunteers',label:'Volunteers'},{key:'volunteerHours',label:'Volunteer Hours'}].map(({key,label}) => (
                  <div key={key}>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">{label}</label>
                    <input className={inputClass} type="number" min="0" value={form[key]} onChange={e => setNum(key, e.target.value)} />
                  </div>
                ))}
              </div>

              <p className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider mb-3">Display</p>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <input className={inputClass} placeholder="Image URL" value={form.image} onChange={e => set('image', e.target.value)} />
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Card Colour</label>
                  <select className={inputClass} value={form.color} onChange={e => set('color', e.target.value)}>
                    {colorOptions.map(c => <option key={c.value} value={c.value}>{c.label} overlay</option>)}
                  </select>
                </div>
                <textarea className={`${inputClass} md:col-span-2`} rows={3} placeholder="Description" value={form.description} onChange={e => set('description', e.target.value)} />
              </div>

              <div className="mb-6">
                <Toggle value={form.featured} onChange={v => set('featured', v)} label="Feature on Homepage" sub="Show in homepage Featured Projects section (max 4)" />
              </div>

              <div className="flex gap-3">
                <button onClick={handleSave} disabled={!form.title}
                  className="px-6 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm hover:bg-rotary-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >{editingId ? 'Save Changes' : 'Add Project'}</button>
                {editingId && (
                  <button onClick={resetForm} className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-rotary-blue/30 border-t-rotary-blue rounded-full animate-spin" />
          </div>
        )}

        {!loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((project, i) => (
              <motion.div key={project.id}
                className="group relative rounded-xl overflow-hidden aspect-[4/3] cursor-pointer"
                initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
                transition={{ duration:0.4, delay: i*0.05 }}
                whileHover={{ scale:1.01 }}
                onClick={() => setSelectedProject(project)}
              >
                <img
                  src={project.image||'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80'}
                  alt={project.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${project.color} opacity-50 group-hover:opacity-60 transition-opacity`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {isAdmin && (
                  <div className="absolute top-3 right-3 z-20 flex gap-2">
                    <button onClick={e => { e.stopPropagation(); handleEdit(project) }}
                      className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleRemove(project.id) }}
                      className="w-8 h-8 rounded-lg bg-red-500/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}

                <div className="absolute inset-0 p-5 flex flex-col justify-end">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {project.activityType && <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-black/30 backdrop-blur-sm rounded-full text-white">{project.activityType}</span>}
                    {project.avenue && <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full text-white">{project.avenue}</span>}
                    {project.areaOfFocus && <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-rotary-gold/40 backdrop-blur-sm rounded-full text-white">{project.areaOfFocus}</span>}
                  </div>
                  <h3 className="font-display font-bold text-lg text-white mb-1">{project.title}</h3>
                  {project.venue && <p className="text-white/50 text-xs mb-0.5">📍 {project.venue}</p>}
                  {(project.startDate||project.endDate) && (
                    <p className="text-white/50 text-xs mb-1">
                      {project.startDate && new Date(project.startDate).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}
                      {project.startDate&&project.endDate&&' – '}
                      {project.endDate && new Date(project.endDate).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}
                    </p>
                  )}
                  <p className="text-white/70 text-xs line-clamp-2">{project.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-rotary-slate dark:text-white/30">
            <p className="text-lg">No projects in this category yet.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedProject && <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
      </AnimatePresence>
    </div>
  )
}
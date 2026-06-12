import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'
import { colorOptions, rotaractAvenues, areasOfFocus, impactLabels, emptyImpact, inputClass, ProjectModal } from './Projects'

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportToPDF(projects, dateRange) {
  const totalImpact = projects.reduce((acc, p) => {
    const imp = p.impact || {}
    return {
      volunteerHours: acc.volunteerHours + (imp.volunteerHours || 0),
      fundsRaised: acc.fundsRaised + (imp.fundsRaised || 0),
      contributions: acc.contributions + (imp.contributions || imp.fundsRaised || 0),
      peopleImpacted: acc.peopleImpacted + (imp.peopleImpacted || 0),
      projectsCompleted: acc.projectsCompleted + (imp.projectsCompleted || 0),
      membersEngaged: acc.membersEngaged + (imp.membersEngaged || 0),
    }
  }, { volunteerHours: 0, fundsRaised: 0, contributions: 0, peopleImpacted: 0, projectsCompleted: 0, membersEngaged: 0 })

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Rotaract Bengaluru BTM - Projects Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 40px; max-width: 900px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #d41367; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 22px; color: #d41367; }
  .header p { font-size: 12px; color: #666; margin-top: 4px; }
  .date-range { font-size: 11px; color: #888; text-align: right; }
  .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 30px; }
  .summary-card { background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 14px; text-align: center; }
  .summary-card .num { font-size: 20px; font-weight: 700; color: #d41367; }
  .summary-card .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #d41367; color: white; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
  tr:nth-child(even) { background: #fafafa; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; margin-right: 4px; margin-bottom: 2px; }
  .tag-avenue { background: #e8f0fe; color: #1a73e8; }
  .tag-focus  { background: #fef3c7; color: #92400e; }
  .dates { color: #888; font-size: 11px; }
  .impact-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-top: 6px; }
  .impact-item { font-size: 10px; color: #888; }
  .impact-item strong { color: #333; }
  .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; text-align: center; }
</style></head><body>
<div class="header">
  <div>
    <h1>Rotaract Bengaluru BTM</h1>
    <p>Projects Report — ${projects.length} project${projects.length !== 1 ? 's' : ''}</p>
  </div>
  <div class="date-range">
    ${dateRange ? `<p>${dateRange}</p>` : '<p>All Projects</p>'}
    <p>Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>
</div>
<div class="summary">
  <div class="summary-card"><div class="num">${totalImpact.volunteerHours.toLocaleString()}</div><div class="label">Volunteer Hours</div></div>
  <div class="summary-card"><div class="num">₹${totalImpact.contributions.toLocaleString()}</div><div class="label">Contributions</div></div>
  <div class="summary-card"><div class="num">${totalImpact.peopleImpacted.toLocaleString()}</div><div class="label">People Impacted</div></div>
  <div class="summary-card"><div class="num">${totalImpact.projectsCompleted.toLocaleString()}</div><div class="label">Projects Completed</div></div>
  <div class="summary-card"><div class="num">${totalImpact.membersEngaged.toLocaleString()}</div><div class="label">Members Engaged</div></div>
</div>
<table>
  <thead><tr><th>#</th><th>Project</th><th>Avenue / Area of Focus</th><th>Duration</th><th>Impact</th></tr></thead>
  <tbody>
    ${projects.map((p, i) => {
    const imp = p.impact || {}
    const start = p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    const end = p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    return `<tr>
        <td>${i + 1}</td>
        <td><strong>${p.title}</strong><br><span style="font-size:11px;color:#666">${p.description || ''}</span></td>
        <td>
          ${p.avenue ? `<span class="tag tag-avenue">${p.avenue}</span>` : ''}
          ${p.areaOfFocus ? `<span class="tag tag-focus">${p.areaOfFocus}</span>` : ''}
          ${!p.avenue && !p.areaOfFocus && p.category ? `<span class="tag tag-avenue">${p.category}</span>` : ''}
        </td>
        <td class="dates">${start}${start && end ? '<br>to<br>' : ''}${end || (start ? '' : '—')}</td>
        <td><div class="impact-row">
          <div class="impact-item"><strong>${imp.volunteerHours || 0}</strong> hrs</div>
          <div class="impact-item"><strong>₹${(imp.contributions || imp.fundsRaised || 0).toLocaleString()}</strong></div>
          <div class="impact-item"><strong>${imp.peopleImpacted || 0}</strong> people</div>
          <div class="impact-item"><strong>${imp.projectsCompleted || 0}</strong> proj</div>
          <div class="impact-item"><strong>${imp.membersEngaged || 0}</strong> mbrs</div>
        </div></td>
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
  const headers = ['Title', 'Avenue', 'Area of Focus', 'Description', 'Start Date', 'End Date', 'Volunteer Hours', 'Funds Raised (₹)', 'Contributions (₹)', 'People Impacted', 'Projects Completed', 'Members Engaged']
  const rows = projects.map(p => {
    const impact = p.impact || {}
    return [
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.avenue || '').replace(/"/g, '""')}"`,
      `"${(p.areaOfFocus || '').replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      p.startDate || '',
      p.endDate || '',
      impact.volunteerHours || 0,
      impact.fundsRaised || 0,
      impact.contributions || 0,
      impact.peopleImpacted || 0,
      impact.projectsCompleted || 0,
      impact.membersEngaged || 0,
    ].join(',')
  })
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rotaract-projects-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Filter tabs config ────────────────────────────────────────────────────────
const FILTER_GROUPS = [
  { label: 'All', key: 'all', options: [] },
  { label: 'Rotaract Avenues', key: 'avenue', options: rotaractAvenues },
  { label: 'Areas of Focus', key: 'areaOfFocus', options: areasOfFocus },
]

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AllProjects({ isAdmin, onBack }) {
  const { data: projects, loading, save, remove } = useCollection('projects')
  const [selectedProject, setSelectedProject] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Filter state
  const [filterGroup, setFilterGroup] = useState('all')
  const [filterValue, setFilterValue] = useState('All')

  // Export state
  const [showExport, setShowExport] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')

  // Form state
  const emptyForm = {
    title: '', description: '', image: '',
    color: colorOptions[0].value,
    avenue: rotaractAvenues[0],
    areaOfFocus: areasOfFocus[0],
    startDate: '', endDate: '',
    featured: false,
    impact: { ...emptyImpact },
  }
  const [form, setForm] = useState(emptyForm)

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false) }

  const handleSave = async () => {
    if (!form.title || !form.description) return
    const id = editingId || Date.now().toString()
    await save({ ...form, id })
    resetForm()
  }

  const handleEdit = (project) => {
  setForm({
    title:       project.title       || '',
    description: project.description || '',
    image:       project.image       || '',
    color:       project.color       || colorOptions[0].value,
    avenue:      project.avenue      || rotaractAvenues[0],
    areaOfFocus: project.areaOfFocus || areasOfFocus[0],
    startDate:   project.startDate   || '',
    endDate:     project.endDate     || '',
    featured:    project.featured    || false,
    impact:      project.impact      || { ...emptyImpact },
  })
    setEditingId(project.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRemove = async (id) => {
    if (confirm('Remove this project?')) await remove(id)
  }

  const updateImpact = (key, val) => {
    setForm({ ...form, impact: { ...form.impact, [key]: parseInt(val) || 0 } })
  }

  const handleExport = (asPDF = false) => {
    let toExport = [...projects]
    if (exportFrom) toExport = toExport.filter(p => (p.startDate || '') >= exportFrom)
    if (exportTo) toExport = toExport.filter(p => (p.startDate || '') <= exportTo)
    if (filterValue !== 'All') {
      toExport = toExport.filter(p =>
        p.avenue === filterValue || p.areaOfFocus === filterValue || p.category === filterValue
      )
    }
    const dateLabel = exportFrom || exportTo
      ? `${exportFrom ? new Date(exportFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Start'} — ${exportTo ? new Date(exportTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Present'}`
      : ''
    if (asPDF) exportToPDF(toExport, dateLabel)
    else exportToCSV(toExport)
    setShowExport(false)
  }

  // Filtering logic
  const filtered = (() => {
    if (filterGroup === 'all' || filterValue === 'All') return projects
    return projects.filter(p => {
      if (filterGroup === 'avenue') return p.avenue === filterValue
      if (filterGroup === 'areaOfFocus') return p.areaOfFocus === filterValue
      return true
    })
  })()
  const sorted = [...filtered].sort((a, b) => (a.order || 0) - (b.order || 0))

  return (
    <div className="min-h-screen pt-20">
      <div className="section-padding max-w-7xl mx-auto">

        {/* Page header */}
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

        {/* ── Filter Tabs ── */}
        <div className="mb-6 space-y-3">
          {/* Group selector */}
          <div className="flex flex-wrap gap-2">
            {FILTER_GROUPS.map(g => (
              <button
                key={g.key}
                onClick={() => { setFilterGroup(g.key); setFilterValue('All') }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filterGroup === g.key ? 'bg-rotary-blue text-white' : 'bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10'}`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Sub-filter options */}
          {filterGroup !== 'all' && (
            <motion.div className="flex flex-wrap gap-2" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              <button
                onClick={() => setFilterValue('All')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterValue === 'All' ? 'bg-rotary-blue/15 text-rotary-blue' : 'bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10'}`}
              >
                All
              </button>
              {FILTER_GROUPS.find(g => g.key === filterGroup)?.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => setFilterValue(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterValue === opt ? 'bg-rotary-blue/15 text-rotary-blue' : 'bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                >
                  {opt}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex justify-end gap-2 mb-6">
          <button
            onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-rotary-charcoal dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
          {isAdmin && (
            <button
              onClick={() => { if (showForm && !editingId) resetForm(); else { resetForm(); setShowForm(true) } }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
              </svg>
              {showForm ? 'Cancel' : 'Add Project'}
            </button>
          )}
        </div>

        {/* Export Panel */}
        <AnimatePresence>
          {showExport && (
            <motion.div
              className="mb-6 bg-white dark:bg-rotary-navy-light rounded-xl p-5 border border-gray-100 dark:border-white/5"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
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
                  <button onClick={() => handleExport(true)} className="px-5 py-2.5 rounded-lg bg-rotary-blue text-white font-semibold text-sm hover:bg-rotary-blue-dark transition-colors">PDF</button>
                  <button onClick={() => { setExportFrom(''); setExportTo(''); exportToPDF(projects, '') }} className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">All PDF</button>
                </div>
              </div>
              <p className="text-xs text-rotary-slate dark:text-white/30 mt-3">Leave dates empty to export all. {filterValue !== 'All' && `Filtered by: ${filterValue}.`}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Add/Edit Form ── */}
        <AnimatePresence>
          {isAdmin && showForm && (
            <motion.div
              className="mb-10 bg-white dark:bg-rotary-navy-light rounded-xl p-6 md:p-8 border border-gray-100 dark:border-white/5 shadow-sm"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            >
              <h3 className="font-display font-semibold text-lg mb-5">{editingId ? 'Edit Project' : 'New Project'}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  className={inputClass}
                  placeholder="Project Title *"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />

                {/* Rotaract Avenue */}
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Rotaract Avenue *</label>
                  <select className={inputClass} value={form.avenue} onChange={e => setForm({ ...form, avenue: e.target.value })}>
                    {rotaractAvenues.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {/* Area of Focus */}
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Area of Focus *</label>
                  <select className={inputClass} value={form.areaOfFocus} onChange={e => setForm({ ...form, areaOfFocus: e.target.value })}>
                    {areasOfFocus.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {/* Color overlay */}
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Card Colour</label>
                  <select className={inputClass} value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}>
                    {colorOptions.map(c => <option key={c.value} value={c.value}>{c.label} overlay</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Start Date</label>
                  <input className={inputClass} type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">End Date</label>
                  <input className={inputClass} type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>

                <input
                  className={inputClass}
                  placeholder="Image URL"
                  value={form.image}
                  onChange={e => setForm({ ...form, image: e.target.value })}
                />

                <textarea
                  className={`${inputClass} md:col-span-2`}
                  rows={3}
                  placeholder="Description *"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Featured toggle */}
              <div className="md:col-span-2 flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <div>
                  <p className="text-sm font-semibold text-rotary-charcoal dark:text-white">Feature on Homepage</p>
                  <p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">Show this project in the homepage Featured Projects section (max 4)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, featured: !form.featured })}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.featured ? 'bg-rotary-blue' : 'bg-gray-300 dark:bg-white/20'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form.featured ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Impact Metrics */}
              <h4 className="font-display font-semibold text-sm mt-6 mb-3 text-rotary-slate dark:text-white/50 uppercase tracking-wider">Impact Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(impactLabels).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">{label}</label>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      value={form.impact[key]}
                      onChange={e => updateImpact(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleSave}
                  disabled={!form.title || !form.description}
                  className="px-6 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm hover:bg-rotary-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Add Project'}
                </button>
                {editingId && (
                  <button onClick={resetForm} className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-rotary-blue/30 border-t-rotary-blue rounded-full animate-spin" />
          </div>
        )}

        {/* ── Projects Grid ── */}
        {!loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((project, i) => (
              <motion.div
                key={project.id}
                className="group relative rounded-xl overflow-hidden aspect-[4/3] cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedProject(project)}
              >
                <img
                  src={project.image || 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80'}
                  alt={project.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${project.color} opacity-50 group-hover:opacity-60 transition-opacity`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {isAdmin && (
                  <div className="absolute top-3 right-3 z-20 flex gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleEdit(project) }}
                      className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleRemove(project.id) }}
                      className="w-8 h-8 rounded-lg bg-red-500/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="absolute inset-0 p-5 flex flex-col justify-end">
                  {/* Avenue + Area badges */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {project.avenue && (
                      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full text-white">
                        {project.avenue}
                      </span>
                    )}
                    {project.areaOfFocus && (
                      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-rotary-gold/40 backdrop-blur-sm rounded-full text-white">
                        {project.areaOfFocus}
                      </span>
                    )}
                    {!project.avenue && !project.areaOfFocus && project.category && (
                      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full text-white">
                        {project.category}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-lg text-white mb-1">{project.title}</h3>
                  {(project.startDate || project.endDate) && (
                    <p className="text-white/50 text-xs mb-1">
                      {project.startDate && new Date(project.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      {project.startDate && project.endDate && ' – '}
                      {project.endDate && new Date(project.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
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
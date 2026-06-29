import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'
import { useCollection } from '../../hooks/useFirestore'
import { teamCategories, memberTypes, inputClass, LeaderCard } from './Leadership'

function storableDate(val) {
  if (!val) return ''
  const str = String(val).trim()
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (dmy) {
    const yr = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
    return `${yr}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`
  }
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str
  if (!isNaN(val) && typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000))
    return d.toISOString().split('T')[0]
  }
  return str
}

function ImportModal({ onClose, onImport }) {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
        if (!data.length) { setError('No data found in file.'); return }

        const normalize = s => String(s).toLowerCase().replace(/[\s_]/g, '')
        const headers = Object.keys(data[0])
        const findCol = (...keys) => headers.find(h => keys.some(k => normalize(h).includes(normalize(k))))

        const nameCol = findCol('name', 'member')
        const roleCol = findCol('role', 'designation', 'position')
        const bdayCol = findCol('birthday', 'bday', 'dob', 'birth')
        const annCol = findCol('anniversary', 'anni', 'wedding')
        const teamCol = findCol('team', 'group', 'category')
        const typeCol = findCol('type', 'membertype', 'student', 'working')

        if (!nameCol) { setError('Could not find a "Name" column.'); return }

        const parsed = data.map((row, i) => ({
          id: Date.now().toString() + '_' + i,
          name: String(row[nameCol] || '').trim(),
          role: roleCol ? String(row[roleCol] || '').trim() : '',
          category: teamCol
            ? (String(row[teamCol] || '').toLowerCase().includes('bod')
              ? 'bod'
              : String(row[teamCol] || '').toLowerCase().includes('core')
              ? 'core'
              : 'member')
            : 'member',
          memberType: typeCol
            ? (String(row[typeCol] || '').toLowerCase().includes('work') ? 'working' : 'student')
            : 'student',
          birthday: bdayCol ? storableDate(row[bdayCol]) : '',
          anniversary: annCol ? storableDate(row[annCol]) : '',
          image: '',
          linkedin: ''
        })).filter(r => r.name)

        setPreview({ parsed, cols: { nameCol, roleCol, bdayCol, annCol } })
      } catch { setError('Failed to parse file.') }
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
      ['Name', 'Role', 'Team (bod/core/member)', 'Member Type (student/working)', 'Birthday (DD/MM/YYYY)', 'Anniversary (DD/MM/YYYY)'],
      ['Rtr. John Doe', 'President', 'bod', 'working', '15/08/1998', ''],
      ['Rtr. Jane Smith', 'Secretary', 'core', 'student', '22/12/2000', '20/03/2023'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Members')
    XLSX.writeFile(wb, 'rotaract-members-template.xlsx')
  }

  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-rotary-navy-light rounded-xl shadow-2xl" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}>
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
              <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                <p className="text-sm font-medium mb-2">Expected columns:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['Name *', 'Role', 'Team', 'Member Type', 'Birthday (DD/MM/YYYY)', 'Anniversary (DD/MM/YYYY)'].map(c => (
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
                    Name ✓ {preview.cols.roleCol ? '· Role ✓' : ''} {preview.cols.bdayCol ? '· Birthday ✓' : ''} {preview.cols.annCol ? '· Anniversary ✓' : ''}
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
                        <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Role</th>
                        <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Birthday</th>
                        <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Anniversary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.parsed.map(r => (
                        <tr key={r.id} className="border-b border-gray-50 dark:border-white/[0.03]">
                          <td className="px-4 py-2.5 font-medium">{r.name}</td>
                          <td className="px-4 py-2.5 text-xs text-rotary-slate dark:text-white/50">{r.role || '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-rotary-slate dark:text-white/50">{r.birthday ? new Date(r.birthday + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-rotary-slate dark:text-white/50">{r.anniversary ? new Date(r.anniversary + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
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

export default function OurTeam({ isAdmin, onBack }) {
  const { data: leaders, loading, save, remove } = useCollection('leaders')
  const { remove: removeTreasurerMember, data: treasurerMembers } = useCollection('treasurer_members')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filterTeam, setFilterTeam] = useState('All')
  const [deleteLeader, setDeleteLeader] = useState(null)
  const [form, setForm] = useState({
    name: '', role: '', category: 'bod', image: '', linkedin: '',
    memberType: 'student', birthday: '', anniversary: '', notes: ''
  })

  const resetForm = () => {
    setForm({ name: '', role: '', category: 'bod', image: '', linkedin: '', memberType: 'student', birthday: '', anniversary: '', notes: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.name || !form.role) return
    const id = editingId || Date.now().toString()
    await save({ ...form, id })
    resetForm()
  }

  const handleEdit = (leader) => {
    setForm({
      name: leader.name || '',
      role: leader.role || '',
      category: leader.category || leader.team || 'member',
      image: leader.image || '',
      linkedin: leader.linkedin || '',
      memberType: leader.memberType || 'student',
      birthday: leader.birthday || '',
      anniversary: leader.anniversary || '',
      notes: leader.notes || ''
    })
    setEditingId(leader.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRemove = (leader) => setDeleteLeader(leader)

  const handleBulkImport = async (parsed) => {
    await Promise.all(parsed.map(m => save(m)))
  }

  const filters = ['All', ...teamCategories.map(t => t.value)]
  const filterLabels = { All: 'All', bod: 'Board of Directors', core: 'Core Team', member: 'Members' }
  const filtered = filterTeam === 'All'
    ? leaders
    : leaders.filter(l => (l.category || l.team) === filterTeam)

  return (
    <div className="min-h-screen pt-20">
      <div className="section-padding max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="heading-lg">Our <span className="text-gradient">Team</span></h1>
            <p className="text-rotary-slate dark:text-white/50 text-sm mt-1">{leaders.length} members</p>
          </div>
        </div>

        {/* Filter + Admin Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {filters.map(f => (
              <button key={f} onClick={() => setFilterTeam(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterTeam === f ? 'bg-rotary-blue text-white' : 'bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                {filterLabels[f]}
              </button>
            ))}
          </div>
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-rotary-charcoal dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Import Excel
              </button>
              <button
                onClick={() => { if (showForm && !editingId) resetForm(); else { resetForm(); setShowForm(true) } }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} /></svg>
                {showForm ? 'Cancel' : 'Add Member'}
              </button>
            </div>
          )}
        </div>

        {/* Add / Edit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="mb-10 p-6 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <h3 className="font-display font-bold text-base mb-5">
                {editingId ? 'Edit Member' : 'Add New Member'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">Name *</label>
                  <input
                    className={inputClass}
                    placeholder="Rtr. Full Name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">Role *</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. President"
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">Category</label>
                  <select
                    className={inputClass}
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {teamCategories.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">Member Type</label>
                  <select
                    className={inputClass}
                    value={form.memberType}
                    onChange={e => setForm(f => ({ ...f, memberType: e.target.value }))}
                  >
                    {memberTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">Birthday</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.birthday}
                    onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">Anniversary</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.anniversary}
                    onChange={e => setForm(f => ({ ...f, anniversary: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">Photo URL</label>
                  <input
                    className={inputClass}
                    placeholder="https://..."
                    value={form.image}
                    onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">LinkedIn URL</label>
                  <input
                    className={inputClass}
                    placeholder="https://linkedin.com/in/..."
                    value={form.linkedin}
                    onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">Notes</label>
                  <input
                    className={inputClass}
                    placeholder="Optional notes"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleSave}
                  disabled={!form.name || !form.role}
                  className="px-6 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm hover:bg-rotary-gold-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Add Member'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirm Modal */}
        <AnimatePresence>
          {deleteLeader && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteLeader(null)} />
              <motion.div className="relative bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-white/10" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
                <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="font-display font-bold text-lg mb-1">Remove Member?</h3>
                <p className="text-sm text-gray-400 dark:text-white/50 mb-6">
                  <strong>{deleteLeader.name}</strong> will be permanently removed from the team.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteLeader(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={async () => {
                    await remove(deleteLeader.id)
                    const treasurerEntry = treasurerMembers.find(m => m.name.toLowerCase() === deleteLeader.name.toLowerCase() || m.id === 'team_' + deleteLeader.id)
                    if (treasurerEntry) await removeTreasurerMember(treasurerEntry.id)
                    setDeleteLeader(null)
                  }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Remove</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-rotary-blue/30 border-t-rotary-blue rounded-full animate-spin" />
          </div>
        )}

        {/* Members Grid */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-8">
            {filtered.map((leader, i) => (
              <div key={leader.id} className="relative group/card">
                <LeaderCard leader={leader} i={i} />

                

                

                {isAdmin && (
                  <div className="absolute top-0 right-0 flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                    <button onClick={() => handleEdit(leader)} className="w-7 h-7 rounded-lg bg-white dark:bg-white/10 text-rotary-charcoal dark:text-white flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/20 transition-colors shadow-sm border border-gray-200 dark:border-white/10">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => handleRemove(leader)} className="w-7 h-7 rounded-lg bg-red-500/80 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-rotary-slate dark:text-white/30">
            <p className="text-lg">No members in this category yet.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleBulkImport} />}
      </AnimatePresence>
    </div>
  )
}
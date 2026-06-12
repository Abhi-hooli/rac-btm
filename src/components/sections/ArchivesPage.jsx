import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'

const inputClass =
  'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

// Generate Rotary years from 2015-16 up to one year ahead of current
function getRotaryYears() {
  const now = new Date()
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  const years = []
  for (let y = startYear + 1; y >= 2015; y--) {
    years.push(`${y}-${String(y + 1).slice(2)}`)
  }
  return years
}

// ── Add / Edit Year Form ──
function YearForm({ onSave, onCancel, existing }) {
  const [form, setForm] = useState({
    year: existing?.year || '',
    presidentName: existing?.presidentName || '',
    presidentImage: existing?.presidentImage || '',
    presidentMessage: existing?.presidentMessage || '',
    awards: existing?.awards || [],
    projects: existing?.projects || [],
    stats: existing?.stats || { livesImpacted: 0, fundsRaised: 0, projectsCompleted: 0, volunteerHours: 0 }
  })
  const [awardInput, setAwardInput] = useState('')
  const [projectForm, setProjectForm] = useState({ title: '', description: '', image: '' })

  const addAward = () => {
    if (!awardInput.trim()) return
    setForm(f => ({ ...f, awards: [...f.awards, awardInput.trim()] }))
    setAwardInput('')
  }

  const removeAward = (i) =>
    setForm(f => ({ ...f, awards: f.awards.filter((_, idx) => idx !== i) }))

  const addProject = () => {
    if (!projectForm.title.trim()) return
    setForm(f => ({
      ...f,
      projects: [...f.projects, { ...projectForm, id: Date.now().toString() }]
    }))
    setProjectForm({ title: '', description: '', image: '' })
  }

  const removeProject = (id) =>
    setForm(f => ({ ...f, projects: f.projects.filter(p => p.id !== id) }))

  const handleSave = () => {
    if (!form.year.trim()) return
    onSave({ ...form, id: existing?.id || form.year.replace(/\s+/g, '-') })
  }

  return (
    <motion.div
      className="mb-10 p-6 rounded-2xl bg-white dark:bg-rotary-navy-light border border-gray-200 dark:border-white/10"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <h3 className="font-display font-bold text-base mb-5">
        {existing ? `Edit Archive — ${existing.year}` : 'Add Archive Year'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">Rotary Year *</label>
          <select
            className={inputClass}
            value={form.year}
            onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
            disabled={!!existing}
          >
            <option value="">Select year...</option>
            {getRotaryYears().map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">President Name</label>
          <input
            className={inputClass}
            placeholder="Rtr. Full Name"
            value={form.presidentName}
            onChange={e => setForm(f => ({ ...f, presidentName: e.target.value }))}
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">President Photo URL</label>
          <input
            className={inputClass}
            placeholder="https://..."
            value={form.presidentImage}
            onChange={e => setForm(f => ({ ...f, presidentImage: e.target.value }))}
          />
        </div>

        <div className="sm:col-span-2 mb-2">
          <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">Impact Stats</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <input type="number" min="0" className={inputClass} placeholder="Lives Impacted" value={form.stats.livesImpacted || ''} onChange={e => setForm(f => ({ ...f, stats: { ...f.stats, livesImpacted: parseInt(e.target.value) || 0 } }))} />
              <p className="text-xs text-gray-400 mt-1">Lives Impacted</p>
            </div>
            <div>
              <input type="number" min="0" className={inputClass} placeholder="Funds Raised (₹)" value={form.stats.fundsRaised || ''} onChange={e => setForm(f => ({ ...f, stats: { ...f.stats, fundsRaised: parseInt(e.target.value) || 0 } }))} />
              <p className="text-xs text-gray-400 mt-1">Funds Raised (₹)</p>
            </div>
            <div>
              <input type="number" min="0" className={inputClass} placeholder="Projects" value={form.stats.projectsCompleted || ''} onChange={e => setForm(f => ({ ...f, stats: { ...f.stats, projectsCompleted: parseInt(e.target.value) || 0 } }))} />
              <p className="text-xs text-gray-400 mt-1">Projects Completed</p>
            </div>
            <div>
              <input type="number" min="0" className={inputClass} placeholder="Hours" value={form.stats.volunteerHours || ''} onChange={e => setForm(f => ({ ...f, stats: { ...f.stats, volunteerHours: parseInt(e.target.value) || 0 } }))} />
              <p className="text-xs text-gray-400 mt-1">Volunteer Hours</p>
            </div>
          </div>
        </div>
        
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">President's Message</label>
          <textarea
            className={`${inputClass} min-h-[100px] resize-y`}
            placeholder="A message reflecting on the year..."
            value={form.presidentMessage}
            onChange={e => setForm(f => ({ ...f, presidentMessage: e.target.value }))}
          />
        </div>
      </div>

      {/* Awards */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">Awards & Recognitions</label>
        <div className="flex gap-2 mb-2">
          <input
            className={inputClass}
            placeholder="e.g. Best Club Award — RID 3191"
            value={awardInput}
            onChange={e => setAwardInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAward()}
          />
          <button onClick={addAward} className="px-4 py-2 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors shrink-0">Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.awards.map((a, i) => (
            <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rotary-gold/10 text-rotary-gold text-xs font-medium">
              🏆 {a}
              <button onClick={() => removeAward(i)} className="hover:text-red-500 transition-colors">✕</button>
            </span>
          ))}
        </div>
      </div>

      {/* Projects */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">Projects of the Year</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          <input className={inputClass} placeholder="Project title *" value={projectForm.title} onChange={e => setProjectForm(p => ({ ...p, title: e.target.value }))} />
          <input className={inputClass} placeholder="Short description" value={projectForm.description} onChange={e => setProjectForm(p => ({ ...p, description: e.target.value }))} />
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Image URL (optional)" value={projectForm.image} onChange={e => setProjectForm(p => ({ ...p, image: e.target.value }))} />
            <button onClick={addProject} className="px-4 py-2 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors shrink-0">Add</button>
          </div>
        </div>
        <div className="space-y-2">
          {form.projects.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                {p.description && <p className="text-xs text-rotary-slate dark:text-white/40 truncate">{p.description}</p>}
              </div>
              <button onClick={() => removeProject(p.id)} className="text-red-400 hover:text-red-600 text-sm transition-colors shrink-0">✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!form.year.trim()}
          className="px-6 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm hover:bg-rotary-gold-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {existing ? 'Save Changes' : 'Add Archive'}
        </button>
        <button onClick={onCancel} className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

// ── Main Archives Page ──
export default function ArchivesPage({ isAdmin, onBack }) {
    console.log('Archives Page Loaded')
  const { data: archives, loading, save, remove } = useCollection('archives')
  const [selectedYear, setSelectedYear] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingYear, setEditingYear] = useState(null)
  const [deleteYear, setDeleteYear] = useState(null)

  const sorted = [...archives].sort((a, b) => String(b.year).localeCompare(String(a.year)))

 // Initialize selected year from URL ?year=, or default to latest
  useEffect(() => {
    if (sorted.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const yearParam = params.get('year')
    if (yearParam && sorted.find(a => a.year === yearParam)) {
      setSelectedYear(yearParam)
    } else if (!selectedYear) {
      setSelectedYear(sorted[0].year)
    }
  }, [sorted])

  // Update URL ?year= when year changes
  useEffect(() => {
    if (selectedYear) {
      const url = new URL(window.location)
      url.searchParams.set('year', selectedYear)
      window.history.replaceState(null, '', url)
    }
  }, [selectedYear])

  const selected = sorted.find(a => a.year === selectedYear)

  const saveYear = async (data) => {
    await save(data)
    setShowForm(false)
    setEditingYear(null)
    setSelectedYear(data.year)
  }

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
          <div className="flex-1">
            <h1 className="heading-lg">Club <span className="text-gradient">Archives</span></h1>
            <p className="text-rotary-slate dark:text-white/50 text-sm mt-1">{sorted.length} year{sorted.length !== 1 ? 's' : ''} archived</p>
          </div>

          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              {selected && (
                <button
                  onClick={() => { setEditingYear(selected); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-rotary-charcoal dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit Year
                </button>
              )}
              <button
                onClick={() => { setEditingYear(null); setShowForm(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Year
              </button>
            </div>
          )}
        </div>

        {/* Add/Edit form */}
        <AnimatePresence>
          {showForm && (
            <YearForm
              onSave={saveYear}
              onCancel={() => { setShowForm(false); setEditingYear(null) }}
              existing={editingYear}
            />
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-rotary-blue/20 border-t-rotary-blue rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <p className="text-5xl mb-4">🏛️</p>
            <p className="font-display font-bold text-xl">No archives yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {isAdmin ? 'Click "Add Year" to create the first archive.' : 'Archives will appear here soon.'}
            </p>
          </div>
        ) : (
          <>
            {/* Year selector */}
            <motion.div className="flex items-center gap-3 mb-8 flex-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <span className="text-sm font-semibold text-gray-500">Rotary Year:</span>
              <div className="flex gap-2 flex-wrap">
                {sorted.map(a => (
                  <button
                    key={a.year}
                    onClick={() => setSelectedYear(a.year)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      selectedYear === a.year
                        ? 'bg-rotary-blue text-white border-rotary-blue'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-rotary-blue/40'
                    }`}
                  >
                    {a.year}
                  </button>
                ))}
              </div>
            </motion.div>

            {selected && (
              <motion.div key={selected.year} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

                {/* President section: image left, message right */}
                {(selected.presidentMessage || selected.presidentName || selected.presidentImage) && (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-8">
                    <div className="grid md:grid-cols-3 gap-0">
                      {selected.presidentImage && (
                        <div className="md:col-span-1">
                          <img src={selected.presidentImage} alt={selected.presidentName} className="w-full h-full object-cover min-h-[280px]" loading="lazy" />
                        </div>
                      )}
                      <div className={`p-8 ${selected.presidentImage ? 'md:col-span-2' : 'md:col-span-3'}`}>
                        <svg className="w-10 h-10 text-rotary-gold/40 mb-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                        </svg>
                        {selected.presidentMessage && (
                          <p className="text-lg text-gray-700 leading-relaxed mb-4">{selected.presidentMessage}</p>
                        )}
                        {selected.presidentName && (
                          <p className="font-display font-semibold text-rotary-charcoal">
                            — {selected.presidentName}
                            <span className="text-sm font-normal text-gray-400 ml-2">President, {selected.year}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                 {/* Share link */}
                {selected && (
                  <div className="flex items-center justify-end mb-4">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/archives?year=${selected.year}`
                        navigator.clipboard.writeText(url)
                        alert('Link copied: ' + url)
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-rotary-blue hover:bg-rotary-blue/5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share this year's link
                    </button>
                  </div>
                )}

                {/* Impact stats counter */}
                {selected.stats && Object.values(selected.stats).some(v => v > 0) && (
                  <div className="mb-8">
                    <h3 className="font-display font-bold text-lg mb-4">Impact at a Glance</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Lives Impacted', value: selected.stats.livesImpacted, icon: '🤝' },
                        { label: 'Funds Raised', value: selected.stats.fundsRaised, prefix: '₹', icon: '💰' },
                        { label: 'Projects Completed', value: selected.stats.projectsCompleted, icon: '🌱' },
                        { label: 'Volunteer Hours', value: selected.stats.volunteerHours, icon: '⏱️' }
                      ].filter(s => s.value > 0).map(s => (
                        <motion.div
                          key={s.label}
                          initial={{ opacity: 0, y: 12 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:shadow-lg transition-shadow"
                        >
                          <div className="text-3xl mb-2">{s.icon}</div>
                          <p className="text-3xl font-display font-bold text-rotary-blue">
                            {s.prefix || ''}{s.value.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-medium">{s.label}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {(selected.projects || []).length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-display font-bold text-lg mb-4">Projects of {selected.year}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {selected.projects.map(p => (
                        <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                          {p.image && (
                            <img src={p.image} alt={p.title} className="w-full h-44 object-cover" loading="lazy" />
                          )}
                          <div className="p-5">
                            <h4 className="font-display font-semibold mb-1">{p.title}</h4>
                            {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Awards (last) */}
                {(selected.awards || []).length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-display font-bold text-lg mb-4">🏆 Awards & Recognitions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selected.awards.map((a, i) => (
                        <div key={i} className="px-5 py-4 rounded-xl bg-rotary-gold/5 border border-rotary-gold/20 text-sm font-medium text-rotary-charcoal">
                          {a}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <button
                    onClick={() => setDeleteYear(selected)}
                    className="text-sm text-red-400 hover:text-red-600 transition-colors"
                  >
                    Delete archive for {selected.year}
                  </button>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteYear && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteYear(null)} />
            <motion.div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <h3 className="font-display font-bold text-lg mb-1">Delete {deleteYear.year} archive?</h3>
              <p className="text-sm text-gray-400 mb-6">All projects, awards, and the president's message for this year will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteYear(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button
                  onClick={async () => {
                    await remove(deleteYear.id)
                    setDeleteYear(null)
                    setSelectedYear(null)
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
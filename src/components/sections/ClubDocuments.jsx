import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loadFirestore } from '../../firebase'

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'charter', label: 'Charter & Bylaws', icon: '📜', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
  { value: 'minutes', label: 'Minutes of Meeting', icon: '📋', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20' },
  { value: 'circular', label: 'District Circulars', icon: '📣', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20' },
  { value: 'financial', label: 'Financial Reports', icon: '💰', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-500/20' },
  { value: 'policy', label: 'Policies & Guidelines', icon: '📌', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20' },
  { value: 'certificate', label: 'Certificates & Awards', icon: '🏆', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-500/10', border: 'border-yellow-200 dark:border-yellow-500/20' },
  { value: 'training', label: 'Training Materials', icon: '📚', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/10', border: 'border-cyan-200 dark:border-cyan-500/20' },
  { value: 'other', label: 'Other', icon: '📁', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-white/5', border: 'border-gray-200 dark:border-white/10' },
]

const ROTARY_YEARS = Array.from({ length: 6 }, (_, i) => {
  const start = new Date().getMonth() >= 6
    ? new Date().getFullYear() - i
    : new Date().getFullYear() - 1 - i
  return `${start}–${start + 1}`
})

const FILE_TYPES = {
  pdf: { icon: '📄', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
  doc: { icon: '📝', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  docx: { icon: '📝', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  xls: { icon: '📊', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
  xlsx: { icon: '📊', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
  ppt: { icon: '📊', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  pptx: { icon: '📊', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  img: { icon: '🖼️', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  link: { icon: '🔗', color: 'text-rotary-blue', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  other: { icon: '📎', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-white/5' },
}

function getFileType(url) {
  if (!url) return 'link'
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'img'
  return FILE_TYPES[ext] ? ext : (url.startsWith('http') ? 'link' : 'other')
}

const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function DocumentModal({ isOpen, onClose, onSave, editDoc }) {
  const [form, setForm] = useState({
    title: '', category: 'minutes', rotaryYear: ROTARY_YEARS[0],
    url: '', description: '', tags: '', isPublic: false
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (editDoc) {
      setForm({
        title: editDoc.title || '',
        category: editDoc.category || 'minutes',
        rotaryYear: editDoc.rotaryYear || ROTARY_YEARS[0],
        url: editDoc.url || '',
        description: editDoc.description || '',
        tags: (editDoc.tags || []).join(', '),
        isPublic: editDoc.isPublic || false,
      })
    } else {
      setForm({ title: '', category: 'minutes', rotaryYear: ROTARY_YEARS[0], url: '', description: '', tags: '', isPublic: false })
    }
  }, [isOpen, editDoc])

  const handleSave = async () => {
    if (!form.title.trim() || !form.url.trim()) return
    setSaving(true)
    await onSave({
      ...form,
      title: form.title.trim(),
      url: form.url.trim(),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    setSaving(false)
    onClose()
  }

  if (!isOpen) return null
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-white dark:bg-rotary-navy-light w-full sm:max-w-lg max-h-[95vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl overflow-y-auto"
          initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 shrink-0">
            <h2 className="font-display font-bold text-lg">{editDoc ? 'Edit Document' : 'Add Document'}</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider block mb-1.5">Document Title *</label>
              <input className={inputClass} placeholder="e.g. BOD Meeting Minutes — April 2025" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>

            {/* URL */}
            <div>
              <label className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider block mb-1.5">Link / URL *</label>
              <input className={inputClass} placeholder="https://drive.google.com/... or any link" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
              <p className="text-xs text-rotary-slate dark:text-white/30 mt-1">Google Drive, Dropbox, direct file URL — anything works</p>
            </div>

            {/* Category + Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider block mb-1.5">Category</label>
                <select className={inputClass} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider block mb-1.5">Rotary Year</label>
                <select className={inputClass} value={form.rotaryYear} onChange={e => setForm({ ...form, rotaryYear: e.target.value })}>
                  {ROTARY_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider block mb-1.5">Description <span className="normal-case font-normal">(optional)</span></label>
              <textarea className={`${inputClass} resize-none`} rows={2} placeholder="Brief description of this document..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider block mb-1.5">Tags <span className="normal-case font-normal">(comma separated)</span></label>
              <input className={inputClass} placeholder="e.g. budget, 2025, district" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
            </div>

            {/* Visibility */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div
                onClick={() => setForm({ ...form, isPublic: !form.isPublic })}
                className={`w-10 h-6 rounded-full transition-colors relative ${form.isPublic ? 'bg-rotary-blue' : 'bg-gray-200 dark:bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isPublic ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold">{form.isPublic ? 'Public' : 'Admin Only'}</p>
                <p className="text-xs text-rotary-slate dark:text-white/40">{form.isPublic ? 'Visible to all members on the site' : 'Only visible to admins'}</p>
              </div>
            </label>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex gap-3 shrink-0">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.url.trim()}
              className="flex-1 py-3 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue/90 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : editDoc ? 'Save Changes' : 'Add Document'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Document Card ────────────────────────────────────────────────────────────
function DocCard({ doc: d, isAdmin, onEdit, onDelete, i }) {
  const cat = CATEGORIES.find(c => c.value === d.category) || CATEGORIES[7]
  const fileType = getFileType(d.url)
  const ft = FILE_TYPES[fileType] || FILE_TYPES.other

  return (
    <motion.div
      className="group bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:shadow-md hover:border-rotary-blue/20 dark:hover:border-rotary-blue/30 transition-all overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
    >
      {/* Top stripe by category */}
      <div className={`h-1 w-full ${cat.bg.replace('bg-', 'bg-').split(' ')[0]}`} />

      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* File type icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${ft.bg}`}>
            {ft.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-semibold text-sm leading-snug line-clamp-2 flex-1">{d.title}</h3>
              {isAdmin && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => onEdit(d)} className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-rotary-blue/10 hover:text-rotary-blue transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => onDelete(d.id)} className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              )}
            </div>

            {d.description && (
              <p className="text-xs text-rotary-slate dark:text-white/40 mt-1 line-clamp-2">{d.description}</p>
            )}

            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color} ${cat.bg} ${cat.border}`}>
                {cat.icon} {cat.label}
              </span>
              <span className="text-[10px] text-rotary-slate dark:text-white/30 font-medium">{d.rotaryYear}</span>
              {!d.isPublic && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-rotary-slate dark:text-white/30 font-semibold border border-gray-200 dark:border-white/10">
                  🔒 Admin
                </span>
              )}
            </div>

            {d.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {d.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-rotary-slate dark:text-white/30">#{tag}</span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
              <span className="text-[10px] text-rotary-slate dark:text-white/25">
                {d.createdAt?.toDate ? new Date(d.createdAt.toDate()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </span>
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer nodownload"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs font-semibold text-rotary-blue hover:underline"
              >
                Open
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClubDocuments({ onBack, isAdmin }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editDoc, setEditDoc] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [filterYear, setFilterYear] = useState('All')
  const [filterVis, setFilterVis] = useState('All')

  // ── Firestore ──
  useEffect(() => {
    let unsub
    let cancelled = false
    loadFirestore().then(({ mod, db }) => {
      if (cancelled) return
      const q = mod.query(mod.collection(db, 'club_documents'), mod.orderBy('createdAt', 'desc'))
      unsub = mod.onSnapshot(q, snap => {
        setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
    })
    return () => { cancelled = true; if (unsub) unsub() }
  }, [])

  const handleSave = async (data) => {
    const { mod, db } = await loadFirestore()
    if (editDoc) {
      await mod.updateDoc(mod.doc(db, 'club_documents', editDoc.id), { ...data, updatedAt: mod.serverTimestamp() })
    } else {
      await mod.addDoc(mod.collection(db, 'club_documents'), { ...data, createdAt: mod.serverTimestamp() })
    }
    setEditDoc(null)
  }

  const handleDelete = async (id) => {
    const { mod, db } = await loadFirestore()
    await mod.deleteDoc(mod.doc(db, 'club_documents', id))
    setDeleteId(null)
  }

  const openAdd = () => { setEditDoc(null); setModalOpen(true) }
  const openEdit = (d) => { setEditDoc(d); setModalOpen(true) }

  // ── Filter ──
  const visibleDocs = documents.filter(d => isAdmin ? true : d.isPublic)
  const filtered = visibleDocs.filter(d => {
    const matchCat = filterCat === 'All' || d.category === filterCat
    const matchYear = filterYear === 'All' || d.rotaryYear === filterYear
    const matchVis = filterVis === 'All' || (filterVis === 'public' ? d.isPublic : !d.isPublic)
    const matchSearch = !search || [d.title, d.description, ...(d.tags || [])].join(' ').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchYear && matchVis && matchSearch
  })

  // ── Stats ──
  const totalDocs = visibleDocs.length
  const catCounts = CATEGORIES.map(c => ({ ...c, count: visibleDocs.filter(d => d.category === c.value).length })).filter(c => c.count > 0)
  const years = ['All', ...new Set(visibleDocs.map(d => d.rotaryYear).filter(Boolean))]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-rotary-navy pt-5 pb-16">
      <div className="section-padding max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div>
              <h1 className="heading-lg">
                Club <span className="text-gradient">Documents</span>
              </h1>
              <p className="text-rotary-slate dark:text-white/50 text-sm mt-0.5">
                {totalDocs} document{totalDocs !== 1 ? 's' : ''} · Rotaract Bengaluru BTM
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Document
            </button>
          )}
        </motion.div>

        {/* Category quick stats */}
        {catCounts.length > 0 && (
          <motion.div className="flex flex-wrap gap-2 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
            <button
              onClick={() => setFilterCat('All')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterCat === 'All' ? 'bg-rotary-blue text-white border-rotary-blue' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-rotary-charcoal dark:text-white/60 hover:border-rotary-blue/40'}`}
            >
              All <span className="opacity-60">{totalDocs}</span>
            </button>
            {catCounts.map(c => (
              <button
                key={c.value}
                onClick={() => setFilterCat(filterCat === c.value ? 'All' : c.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterCat === c.value ? `${c.bg} ${c.color} ${c.border}` : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-rotary-charcoal dark:text-white/60 hover:border-rotary-blue/40'}`}
              >
                {c.icon} {c.label} <span className="opacity-60">{c.count}</span>
              </button>
            ))}
          </motion.div>
        )}

        {/* Search + filters row */}
        <motion.div className="flex flex-col sm:flex-row gap-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rotary-slate dark:text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30"
              placeholder="Search documents, tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30"
          >
            {years.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : `RY ${y}`}</option>)}
          </select>

          {isAdmin && (
            <select
              value={filterVis}
              onChange={e => setFilterVis(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30"
            >
              <option value="All">All Visibility</option>
              <option value="public">Public</option>
              <option value="private">Admin Only</option>
            </select>
          )}
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-rotary-blue/20 border-t-rotary-blue rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div className="text-center py-24" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-5xl mb-4">📂</p>
            <p className="font-display font-bold text-lg">
              {totalDocs === 0 ? 'No documents yet' : 'No documents match your filters'}
            </p>
            <p className="text-sm text-rotary-slate dark:text-white/40 mt-1">
              {totalDocs === 0 && isAdmin ? 'Click "Add Document" to get started' : 'Try adjusting your search or filters'}
            </p>
            {totalDocs > 0 && (
              <button onClick={() => { setSearch(''); setFilterCat('All'); setFilterYear('All'); setFilterVis('All') }} className="mt-4 text-sm text-rotary-blue hover:underline">
                Clear all filters
              </button>
            )}
          </motion.div>
        ) : (
          <>
            <p className="text-xs text-rotary-slate dark:text-white/30 mb-4">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((d, i) => (
                <DocCard
                  key={d.id}
                  doc={d}
                  isAdmin={isAdmin}
                  onEdit={openEdit}
                  onDelete={setDeleteId}
                  i={i}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      <DocumentModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditDoc(null) }}
        onSave={handleSave}
        editDoc={editDoc}
      />

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <motion.div
              className="relative bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-white/10"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            >
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg mb-1">Delete Document?</h3>
              <p className="text-sm text-rotary-slate dark:text-white/50 mb-6">The document link will be removed. The actual file won't be deleted.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
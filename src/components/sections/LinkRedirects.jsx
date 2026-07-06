import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loadFirestore } from '../../firebase'

const BASE_URL = window.location.origin

const SLUG_CHARS = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const randomSlug = (len = 6) =>
  Array.from({ length: len }, () => SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)]).join('')

const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

function isValidUrl(str) {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function LinkRedirects({ onBack }) {
  const [links, setLinks] = useState([])
  const [clicks, setClicks] = useState([])
  const [loading, setLoading] = useState(true)

  const [destination, setDestination] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState(null)
  const [deleteSlug, setDeleteSlug] = useState(null)

  useEffect(() => {
    let unsub
    let cancelled = false
    loadFirestore().then(({ mod, db }) => {
      if (cancelled) return
      const q = mod.query(mod.collection(db, 'links'), mod.orderBy('createdAt', 'desc'))
      unsub = mod.onSnapshot(q, snap => {
        setLinks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      }, () => setLoading(false))
    })
    return () => { cancelled = true; if (unsub) unsub() }
  }, [])

  useEffect(() => {
    let unsub
    let cancelled = false
    loadFirestore().then(({ mod, db }) => {
      if (cancelled) return
      unsub = mod.onSnapshot(mod.collection(db, 'linkClicks'), snap => {
        setClicks(snap.docs.map(d => d.data()))
      }, () => {})
    })
    return () => { cancelled = true; if (unsub) unsub() }
  }, [])

  const clicksByLink = useMemo(() => {
    const map = {}
    for (const c of clicks) map[c.linkId] = (map[c.linkId] || 0) + 1
    return map
  }, [clicks])

  const clicksToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return clicks.filter(c => c.day === today).length
  }, [clicks])

  const totalClicks = clicks.length

  const handleCreate = async () => {
    setError('')
    if (!destination.trim() || !isValidUrl(destination.trim())) {
      setError('Enter a valid destination URL (including https://).')
      return
    }
    setSaving(true)
    try {
      const { mod, db } = await loadFirestore()
      let slug = customSlug.trim().replace(/[^a-zA-Z0-9_-]/g, '')
      if (slug) {
        const existing = await mod.getDoc(mod.doc(db, 'links', slug))
        if (existing.exists()) {
          setError(`"${slug}" is already taken — try a different one.`)
          setSaving(false)
          return
        }
      } else {
        // auto-generate, retry on the rare collision
        for (let i = 0; i < 5; i++) {
          const candidate = randomSlug()
          const existing = await mod.getDoc(mod.doc(db, 'links', candidate))
          if (!existing.exists()) { slug = candidate; break }
        }
      }
      if (!slug) {
        setError('Could not generate a unique short link — try a custom one.')
        setSaving(false)
        return
      }
      await mod.setDoc(mod.doc(db, 'links', slug), {
        destination: destination.trim(),
        label: label.trim(),
        createdAt: mod.serverTimestamp(),
      })
      setDestination(''); setCustomSlug(''); setLabel('')
    } catch (err) {
      setError('Failed to create link. Please try again.')
    }
    setSaving(false)
  }

  const handleDelete = async (slug) => {
    const { mod, db } = await loadFirestore()
    await mod.deleteDoc(mod.doc(db, 'links', slug))
    setDeleteSlug(null)
  }

  const copyLink = (slug) => {
    navigator.clipboard.writeText(`${BASE_URL}/r/${slug}`)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 1500)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-rotary-navy pt-5 pb-16">
      <div className="section-padding max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          className="flex items-center gap-4 mb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
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
              Link <span className="text-gradient">Redirects</span>
            </h1>
            <p className="text-rotary-slate dark:text-white/50 text-sm mt-0.5">
              Short links with click tracking · Rotary Bengaluru BTM
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-8"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        >
          {[
            { label: 'Links', value: links.length },
            { label: 'Total Clicks', value: totalClicks },
            { label: 'Clicks Today', value: clicksToday },
          ].map(s => (
            <div key={s.label} className="card-surface p-4 text-center">
              <div className="font-display font-bold text-2xl text-rotary-navy dark:text-white">{s.value}</div>
              <div className="text-xs text-rotary-slate dark:text-white/50 mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Create form */}
        <motion.div
          className="card-surface p-5 mb-8"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          <h2 className="font-display font-semibold text-base mb-4">Create New Link</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1 block">Destination URL</label>
              <input
                className={inputClass}
                placeholder="https://example.com/some-long-page"
                value={destination}
                onChange={e => setDestination(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1 block">Custom slug (optional)</label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-rotary-slate dark:text-white/40 whitespace-nowrap">/r/</span>
                <input
                  className={inputClass}
                  placeholder="auto-generated if blank"
                  value={customSlug}
                  onChange={e => setCustomSlug(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1 block">Label (optional)</label>
              <input
                className={inputClass}
                placeholder="e.g. Newsletter Signup"
                value={label}
                onChange={e => setLabel(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Link'}
          </button>
        </motion.div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-rotary-blue/30 border-t-rotary-blue rounded-full animate-spin" />
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-16 text-rotary-slate dark:text-white/50">
            No links yet — create one above to get started.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {links.map(link => (
                <motion.div
                  key={link.id}
                  layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="card-surface p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-semibold text-sm text-rotary-blue">
                        {BASE_URL.replace('https://', '')}/r/{link.id}
                      </span>
                      {link.label && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rotary-gold/10 text-rotary-gold font-semibold">
                          {link.label}
                        </span>
                      )}
                    </div>
                    <a
                      href={link.destination} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-rotary-slate dark:text-white/50 hover:text-rotary-blue truncate block mt-0.5"
                    >
                      {link.destination}
                    </a>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <div className="font-display font-bold text-lg text-rotary-navy dark:text-white">
                        {clicksByLink[link.id] || 0}
                      </div>
                      <div className="text-[10px] text-rotary-slate dark:text-white/40 uppercase tracking-wide">clicks</div>
                    </div>

                    <button
                      onClick={() => copyLink(link.id)}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                      {copiedSlug === link.id ? 'Copied!' : 'Copy'}
                    </button>

                    <button
                      onClick={() => setDeleteSlug(link.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Delete confirm */}
        <AnimatePresence>
          {deleteSlug && (
            <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteSlug(null)} />
              <motion.div className="relative w-full max-w-sm bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6"
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
                <h3 className="font-display font-bold text-lg mb-2">Delete this link?</h3>
                <p className="text-sm text-rotary-slate dark:text-white/50 mb-5">
                  /r/{deleteSlug} will stop working immediately. This can't be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => handleDelete(deleteSlug)}
                    className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors">
                    Delete
                  </button>
                  <button onClick={() => setDeleteSlug(null)}
                    className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

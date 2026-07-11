import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { loadFirestore } from '../../firebase'
import { TRASH_COLLECTIONS, TRASH_RETENTION_DAYS, restoreDoc, purgeDoc, daysRemaining, isExpired } from '../../utils/trash'

const COLLECTION_LABELS = {
  membershipApplications: 'Membership Applications',
  moms: 'Minutes of Meeting',
  rsvps: 'Event RSVPs',
  attendance_meetings: 'Attendance Meetings',
  users: 'Admin Users',
  treasurer_members: 'Treasurer · Members',
  treasurer_events: 'Treasurer · Events',
  treasurer_sponsorships: 'Treasurer · Sponsorships',
  treasurer_transactions: 'Treasurer · Transactions',
  treasurer_assets: 'Treasurer · Assets',
  avenueProjects: 'Avenue Projects',
}

function describeItem(item) {
  return item.name || item.title || item.meetingTitle || item.email
    || item.presidentName || item.description || `#${item.id.slice(0, 8)}`
}

function formatDate(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function deletedAtMillis(item) {
  const v = item?.deletedAt
  if (typeof v === 'number') return v
  if (typeof v?.toMillis === 'function') return v.toMillis()
  return null
}

export default function TrashBin({ permissions, onBack }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCollection, setActiveCollection] = useState('all')
  const [busyId, setBusyId] = useState(null)
  const [confirmPurge, setConfirmPurge] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { mod, db } = await loadFirestore()
    // Collections queried independently — one denied/erroring collection
    // (e.g. a Firestore rule that hasn't been deployed yet) shouldn't blank
    // out the whole Trash view.
    const results = await Promise.all(TRASH_COLLECTIONS.map(async (collectionName) => {
      try {
        const snap = await mod.getDocs(mod.collection(db, collectionName))
        return snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => d.deletedAt)
          .map(d => ({ ...d, __collection: collectionName }))
      } catch (err) {
        console.warn(`Trash: couldn't read "${collectionName}":`, err)
        return []
      }
    }))
    const all = results.flat()

    // Best-effort auto-purge sweep: anything past the retention window gets
    // hard-deleted now instead of lingering. Client-triggered (this project
    // has no scheduled server job), so it only runs when a super admin opens
    // this view or logs in — not on a real clock.
    const expired = all.filter(isExpired)
    if (expired.length) {
      await Promise.all(expired.map(item => purgeDoc(item.__collection, item.id).catch(err => console.warn('Purge failed:', item.__collection, item.id, err))))
    }

    setItems(all.filter(item => !isExpired(item)).sort((a, b) => (deletedAtMillis(b) || 0) - (deletedAtMillis(a) || 0)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (!permissions?.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-rotary-navy pt-24 pb-16 flex items-center justify-center">
        <p className="text-gray-400 dark:text-white/40 text-sm">Only super admins can access the Trash.</p>
      </div>
    )
  }

  const visible = activeCollection === 'all' ? items : items.filter(i => i.__collection === activeCollection)
  const collectionsInUse = TRASH_COLLECTIONS.filter(c => items.some(i => i.__collection === c))

  const handleRestore = async (item) => {
    setBusyId(item.id)
    try {
      await restoreDoc(item.__collection, item.id)
      setItems(prev => prev.filter(i => !(i.id === item.id && i.__collection === item.__collection)))
    } finally {
      setBusyId(null)
    }
  }

  const handlePurge = async () => {
    if (!confirmPurge) return
    const item = confirmPurge
    setConfirmPurge(null)
    setBusyId(item.id)
    try {
      await purgeDoc(item.__collection, item.id)
      setItems(prev => prev.filter(i => !(i.id === item.id && i.__collection === item.__collection)))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-rotary-navy pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">

        <motion.div
          className="flex items-start gap-3 mb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={onBack}
            className="mt-6 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-500">
                Super Admin Only
              </p>
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal dark:text-white">
              Trash
            </h2>
            <p className="text-sm text-gray-400 dark:text-white/40 mt-1.5">Deleted items are kept for {TRASH_RETENTION_DAYS} days, then purged automatically.</p>
          </div>
        </motion.div>

        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setActiveCollection('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${activeCollection === 'all' ? 'bg-rotary-charcoal text-white border-rotary-charcoal' : 'bg-white dark:bg-white/5 text-gray-500 dark:text-white/60 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'}`}
          >
            All ({items.length})
          </button>
          {collectionsInUse.map(c => (
            <button
              key={c}
              onClick={() => setActiveCollection(c)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${activeCollection === c ? 'bg-rotary-charcoal text-white border-rotary-charcoal' : 'bg-white dark:bg-white/5 text-gray-500 dark:text-white/60 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'}`}
            >
              {COLLECTION_LABELS[c] || c} ({items.filter(i => i.__collection === c).length})
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 dark:text-white/40 text-sm">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-display font-bold text-lg text-rotary-charcoal dark:text-white">Nothing in the trash</p>
              <p className="text-sm text-gray-400 dark:text-white/40 mt-1">Deleted items from Membership, MoMs, RSVPs, Attendance, Users, Treasurer and Avenue Projects show up here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {visible.map(item => {
                const remaining = daysRemaining(item)
                return (
                  <div key={`${item.__collection}-${item.id}`} className="px-6 py-4 flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60">
                          {COLLECTION_LABELS[item.__collection] || item.__collection}
                        </span>
                        <p className="font-semibold text-rotary-charcoal dark:text-white truncate">{describeItem(item)}</p>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-white/40 mt-1">
                        Deleted {formatDate(deletedAtMillis(item))}{item.deletedBy ? ` by ${item.deletedBy}` : ''}
                        {remaining != null && <span className={remaining <= 2 ? 'text-red-500 font-semibold' : ''}> · {remaining} day{remaining === 1 ? '' : 's'} left</span>}
                      </p>
                    </div>
                    <button
                      disabled={busyId === item.id}
                      onClick={() => handleRestore(item)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50 shrink-0"
                    >
                      Restore
                    </button>
                    <button
                      disabled={busyId === item.id}
                      onClick={() => setConfirmPurge(item)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50 shrink-0"
                    >
                      Delete Permanently
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {confirmPurge && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setConfirmPurge(null)}>
          <div className="bg-white dark:bg-rotary-navy rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <p className="font-display font-bold text-lg text-rotary-charcoal dark:text-white mb-2">Delete permanently?</p>
            <p className="text-sm text-gray-500 dark:text-white/50 mb-5">"{describeItem(confirmPurge)}" will be gone for good — this can't be undone from within the app.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmPurge(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 dark:text-white transition-colors">Cancel</button>
              <button onClick={handlePurge} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

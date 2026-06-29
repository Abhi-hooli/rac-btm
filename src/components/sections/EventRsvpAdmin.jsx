import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../../firebase'
import {
  collection, query, orderBy, onSnapshot, deleteDoc, doc
} from 'firebase/firestore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(time24) {
  if (!time24) return ''
  const [h, m] = time24.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

function exportCSV(event, eventRsvps) {
  const headers = ['Name', 'Email', 'Phone', 'Guests', 'Dietary Notes', 'RSVP Date']
  const rows = eventRsvps.map(r => [
    r.name, r.email, r.phone || '', r.guests || 1,
    r.dietaryNotes || '',
    new Date(r.rsvpedAt).toLocaleString('en-IN'),
  ])
  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rsvp_${event.title.replace(/\s+/g, '_')}_${event.date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const AVATAR_COLORS = [
  'bg-rotary-blue/10 text-rotary-blue',
  'bg-rotary-gold/15 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-600',
]
function avatarColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// ─── RSVP Detail Drawer ───────────────────────────────────────────────────────

function RsvpDrawer({ rsvp, onClose, onDelete }) {
  if (!rsvp) return null
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-white w-full sm:max-w-md max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-gray-100 shadow-2xl overflow-hidden"
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="h-1 w-full bg-gradient-to-r from-rotary-blue via-rotary-gold to-rotary-blue shrink-0" />
        <div className="flex justify-center pt-3 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-display font-bold text-lg">RSVP Details</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col items-center text-center pt-6 pb-4 px-6 border-b border-gray-100 shrink-0">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mb-3 ${avatarColor(rsvp.name)}`}>
            {rsvp.name?.charAt(0).toUpperCase()}
          </div>
          <h3 className="font-display font-bold text-xl">{rsvp.name}</h3>
          <span className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />confirmed
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {[
            {
              path: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
              label: 'Email', value: rsvp.email
            },
            {
              path: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
              label: 'Phone', value: rsvp.phone || '—'
            },
            {
              path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
              label: 'Guests', value: `${rsvp.guests || 1} ${(rsvp.guests || 1) === 1 ? 'person' : 'people'}`
            },
            {
              path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
              label: 'RSVP Date',
              value: new Date(rsvp.rsvpedAt).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })
            },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-rotary-blue/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-rotary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.path} />
                </svg>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold text-rotary-charcoal">{item.value}</p>
              </div>
            </div>
          ))}
          {rsvp.dietaryNotes && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-[10px] uppercase tracking-widest text-amber-600 font-bold mb-1">📝 Dietary / Special Notes</p>
              <p className="text-sm text-amber-800">{rsvp.dietaryNotes}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => onDelete(rsvp)}
            className="w-full py-3 rounded-xl bg-red-50 text-red-500 border border-red-100 text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            Remove RSVP
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Event RSVP Panel ─────────────────────────────────────────────────────────

function EventRsvpPanel({ event, rsvps }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [selectedRsvp, setSelectedRsvp] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const eventRsvps = rsvps.filter(r => r.eventId === event.id)
  const totalAttendees = eventRsvps.reduce((s, r) => s + (r.guests || 1), 0)
  const avgGroup = eventRsvps.length ? (totalAttendees / eventRsvps.length).toFixed(1) : '0'
  const isPast = new Date(event.date) < new Date()
  const withDietary = eventRsvps.filter(r => r.dietaryNotes).length

  const filtered = eventRsvps
    .filter(r => {
      const q = search.toLowerCase()
      return r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.rsvpedAt) - new Date(a.rsvpedAt)
      if (sortBy === 'oldest') return new Date(a.rsvpedAt) - new Date(b.rsvpedAt)
      if (sortBy === 'name') return a.name?.localeCompare(b.name)
      if (sortBy === 'guests') return (b.guests || 1) - (a.guests || 1)
      return 0
    })

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteDoc(doc(db, 'rsvps', deleteTarget.id))
    } catch (err) {
      console.error('Delete RSVP error:', err)
    }
    setDeleteTarget(null)
    setSelectedRsvp(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 shrink-0">
        <div className="flex items-start gap-4 mb-5">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md">
            <img
              src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&q=80'}
              alt=""
              className="w-full h-full object-cover"
            />
            {isPast && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white uppercase tracking-wider">Past</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-rotary-gold/15 text-amber-700 rounded-full mb-1.5 uppercase tracking-wider">
              {event.type}
            </span>
            <h2 className="font-display font-bold text-rotary-charcoal text-xl leading-tight line-clamp-2">{event.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              {event.time ? ` · ${formatTime(event.time)}` : ''}
            </p>
            <p className="text-xs text-gray-400 truncate">{event.location}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            { icon: '👥', label: 'RSVPs', value: eventRsvps.length, accent: 'bg-rotary-blue/10' },
            { icon: '🎟️', label: 'Total Attending', value: totalAttendees, accent: 'bg-rotary-gold/10' },
            { icon: '📊', label: 'Avg. Group Size', value: avgGroup, accent: 'bg-emerald-100' },
            { icon: '📝', label: 'With Dietary Notes', value: withDietary, accent: 'bg-purple-100' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.accent} mb-3`}>
                <span className="text-base">{s.icon}</span>
              </div>
              <p className="text-xs font-medium text-gray-400 mb-0.5">{s.label}</p>
              <p className="font-display font-extrabold text-2xl leading-none text-rotary-charcoal">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 cursor-pointer"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name A–Z</option>
            <option value="guests">Most Guests</option>
          </select>
          {eventRsvps.length > 0 && (
            <button
              onClick={() => exportCSV(event, eventRsvps)}
              title="Export CSV"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-rotary-charcoal hover:bg-gray-50 transition-all shadow-sm shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-24">
            <p className="text-5xl mb-4">🎟️</p>
            <p className="font-display font-bold text-lg">
              {search ? 'No results found' : 'No RSVPs yet for this event'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'Try a different search term' : 'RSVPs will appear here when members register'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-3 text-sm text-rotary-blue font-semibold hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-2.5">
            {filtered.map((rsvp, i) => (
              <motion.div
                key={rsvp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedRsvp(rsvp)}
                className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-rotary-blue/20 hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${avatarColor(rsvp.name)}`}>
                    {rsvp.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-display font-bold text-sm">{rsvp.name}</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                        <span className="w-1 h-1 rounded-full bg-emerald-500" />confirmed
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{rsvp.email}</p>
                    {rsvp.dietaryNotes && (
                      <p className="text-xs text-amber-500 truncate mt-0.5">📝 {rsvp.dietaryNotes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 justify-end mb-0.5">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm font-bold">{rsvp.guests || 1}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {new Date(rsvp.rsvpedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-rotary-blue transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedRsvp && (
          <RsvpDrawer
            rsvp={selectedRsvp}
            onClose={() => setSelectedRsvp(null)}
            onDelete={(rsvp) => setDeleteTarget(rsvp)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
            <motion.div
              className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            >
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg mb-1">Remove RSVP?</h3>
              <p className="text-sm text-gray-400 mb-6">
                This will permanently remove <strong>{deleteTarget.name}</strong>'s registration.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleDeleteConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Remove</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EventRsvpAdmin({ isAdmin, onBack }) {

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="font-display font-bold text-xl mb-1">Access Restricted</h2>
      <p className="text-sm text-gray-400">Admin login required.</p>
      <button onClick={onBack} className="mt-6 btn-primary !py-2 !px-6 text-sm !rounded-xl">Go Back</button>
    </div>
  )

  const [events, setEvents] = useState([])
  const [rsvps, setRsvps] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [mobileShowPanel, setMobileShowPanel] = useState(false)
  const [filterType, setFilterType] = useState('All')

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setEvents(data)
      if (!selectedEventId && data.length > 0) setSelectedEventId(data[0].id)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'rsvps'), snap => {
      setRsvps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const totalRsvps = rsvps.length
  const totalAttending = rsvps.reduce((s, r) => s + (r.guests || 1), 0)
  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).length

  const eventTypes = ['All', ...new Set(events.map(e => e.type).filter(Boolean))]
  const filteredEvents = events.filter(e => filterType === 'All' || e.type === filterType)

  const getRsvpCount = (eventId) => rsvps.filter(r => r.eventId === eventId).length
  const getAttendeeCount = (eventId) => rsvps.filter(r => r.eventId === eventId).reduce((s, r) => s + (r.guests || 1), 0)

  const selectedEvent = events.find(e => e.id === selectedEventId)

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">

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
                <span className="w-1.5 h-1.5 rounded-full bg-rotary-blue animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-rotary-blue">
                  Event Management Dashboard
                </p>
              </div>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal">
                Event RSVPs
              </h2>
              <p className="text-sm text-gray-400">Rotaract Club · Bengaluru BTM</p>
            </div>
          </div>
        </motion.div>

        <button
          onClick={() => {
            const headers = ['Event', 'Event Date', 'Name', 'Email', 'Phone', 'Guests', 'Dietary Notes', 'RSVP Date']
            const rows = rsvps.map(r => {
              const ev = events.find(e => e.id === r.eventId)
              return [
                ev?.title || r.eventTitle || r.eventId,
                ev?.date || r.eventDate || '',
                r.name, r.email, r.phone || '',
                r.guests || 1,
                r.dietaryNotes || '',
                new Date(r.rsvpedAt).toLocaleString('en-IN')
              ]
            })
            const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `all-rsvps-${new Date().toISOString().split('T')[0]}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
          disabled={rsvps.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-rotary-charcoal hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export All RSVPs
        </button>
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          {[
            { icon: '📅', label: 'Total Events', value: events.length, accent: 'bg-rotary-blue/10' },
            { icon: '🎟️', label: 'Total RSVPs', value: totalRsvps, accent: 'bg-rotary-gold/10' },
            { icon: '📆', label: 'Upcoming Events', value: upcomingEvents, accent: 'bg-purple-100' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.04 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.accent}`}>
                  <span className="text-lg">{s.icon}</span>
                </div>
              </div>
              <p className="text-xs font-medium text-gray-400 mb-1">{s.label}</p>
              <p className="font-display font-extrabold text-[1.75rem] leading-none text-rotary-charcoal">{s.value}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="flex gap-5 min-h-[600px]">
          <motion.div
            className={`w-full lg:w-80 shrink-0 flex flex-col gap-3 ${mobileShowPanel ? 'hidden lg:flex' : 'flex'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
          >
            <button
              onClick={() => setSelectedEventId('all')}
              className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-semibold transition-all mb-2 ${selectedEventId === 'all' ? 'border-rotary-blue bg-rotary-blue/5 text-rotary-blue' : 'border-gray-100 bg-white text-gray-500 hover:border-rotary-blue/30'}`}
            >
              📋 All RSVPs ({rsvps.length})
            </button>

            <div className="flex gap-2 flex-wrap">
              {eventTypes.map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterType === t ? 'bg-rotary-blue text-white border-rotary-blue' : 'border-gray-200 text-gray-500 hover:border-rotary-blue/40 bg-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-rotary-blue/20 border-t-rotary-blue rounded-full animate-spin" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📅</p>
                <p className="font-display font-bold">No events yet</p>
                <p className="text-sm text-gray-400 mt-1">Add events from the home page</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredEvents.map((event, i) => {
                  const rsvpCount = getRsvpCount(event.id)
                  const attendeeCount = getAttendeeCount(event.id)
                  const isPast = new Date(event.date) < new Date()
                  const isActive = event.id === selectedEventId

                  return (
                    <motion.button
                      key={event.id}
                      onClick={() => { setSelectedEventId(event.id); setMobileShowPanel(true) }}
                      className={`w-full text-left bg-white rounded-2xl border p-4 transition-all duration-200 hover:shadow-md group ${isActive ? 'border-rotary-blue shadow-md shadow-rotary-blue/10' : 'border-gray-100 hover:border-rotary-blue/30'}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
                          <img
                            src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100&q=70'}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {isPast && <div className="absolute inset-0 bg-black/30" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-display font-bold text-sm leading-snug line-clamp-1 mb-0.5 transition-colors ${isActive ? 'text-rotary-blue' : 'text-rotary-charcoal group-hover:text-rotary-blue'}`}>
                            {event.title}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {rsvpCount > 0 ? (
                              <>
                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  {rsvpCount} RSVP{rsvpCount !== 1 ? 's' : ''}
                                </span>
                                <span className="text-[10px] font-semibold text-rotary-blue">
                                  {attendeeCount} attending
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-400">No RSVPs yet</span>
                            )}
                            {isPast && (
                              <span className="text-[10px] font-semibold text-gray-400 uppercase">Ended</span>
                            )}
                          </div>
                        </div>
                        <svg className={`w-4 h-4 shrink-0 mt-1 transition-colors ${isActive ? 'text-rotary-blue' : 'text-gray-300 group-hover:text-rotary-blue'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </motion.div>

          <motion.div
            className={`flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col ${!mobileShowPanel ? 'hidden lg:flex' : 'flex'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.16 }}
          >
            <div className="lg:hidden px-6 py-3 border-b border-gray-100 shrink-0">
              <button onClick={() => setMobileShowPanel(false)} className="flex items-center gap-2 text-sm font-semibold text-rotary-blue">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                All Events
              </button>
            </div>

            {selectedEventId === 'all' ? (
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                  All RSVPs — {rsvps.length} total
                </p>
                {rsvps.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-4xl mb-3">🎟️</p>
                    <p className="font-display font-bold">No RSVPs yet</p>
                  </div>
                ) : (
                  <div className="grid gap-2.5">
                    {rsvps.map((rsvp) => {
                      const ev = events.find(e => e.id === rsvp.eventId)
                      return (
                        <div key={rsvp.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rotary-blue/10 flex items-center justify-center shrink-0 font-bold text-sm text-rotary-blue">
                              {rsvp.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-display font-bold text-sm">{rsvp.name}</p>
                              <p className="text-xs text-gray-400 truncate">{rsvp.email}</p>
                              <p className="text-xs text-rotary-blue mt-0.5 font-medium">{ev?.title || rsvp.eventTitle || 'Unknown Event'}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold">{rsvp.guests || 1} guest{(rsvp.guests || 1) > 1 ? 's' : ''}</p>
                              <p className="text-[10px] text-gray-400">
                                {new Date(rsvp.rsvpedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : selectedEvent ? (
              <EventRsvpPanel event={selectedEvent} rsvps={rsvps} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <p className="text-5xl mb-4">👈</p>
                <p className="font-display font-bold text-lg">Select an event</p>
                <p className="text-sm text-gray-400 mt-1">Choose an event from the list to view its RSVPs</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
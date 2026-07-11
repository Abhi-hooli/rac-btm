import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from '../ui/Card'
import { useCollection } from '../../hooks/useFirestore'
import { logAction } from '../../utils/auditLog'

// ── EmailJS config ────────────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = 'service_s15ywsk'
const EMAILJS_TEMPLATE_ID = 'template_5wto4ah'
const EMAILJS_PUBLIC_KEY  = '_iWiLJFtq5D6diONH'

const eventTypes = [
  'Community Service', 'Professional Development', 'Club Service',
  'International Service', 'Public Image', 'Fundraising',
  'DEI (Diversity, Equity, & Inclusion)'
]

const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm transition-all'

function formatTime(time24) {
  if (!time24) return ''
  const [h, m] = time24.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

// End date/time, defaulting to 1hr after start when the event has no explicit end set.
function getEventEnd(event) {
  if (event.endDate || event.endTime) {
    return { date: event.endDate || event.date, time: event.endTime || event.time }
  }
  if (!event.date || !event.time) return { date: event.date, time: event.time }
  const end = new Date(`${event.date}T${event.time}`)
  end.setHours(end.getHours() + 1)
  const pad = n => String(n).padStart(2, '0')
  return {
    date: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    time: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
  }
}

function toICSDateTime(date, time) {
  return `${date.replace(/-/g, '')}T${time ? time.replace(':', '') + '00' : '000000'}`
}

// e.g. "12 July 2026 · 11:00 AM – 1:00 PM" or, spanning days, "12 July 2026 11:00 AM – 13 July 2026 1:00 PM"
function formatEventSchedule(event, dateOpts) {
  const startLabel = new Date(event.date).toLocaleDateString('en-IN', dateOpts)
  const startTime = formatTime(event.time)
  if (!event.endDate && !event.endTime) return `${startLabel} · ${startTime}`
  const endDateStr = event.endDate || event.date
  const endTimeLabel = formatTime(event.endTime || event.time)
  if (endDateStr === event.date) return `${startLabel} · ${startTime} – ${endTimeLabel}`
  const endLabel = new Date(endDateStr).toLocaleDateString('en-IN', dateOpts)
  return `${startLabel} ${startTime} – ${endLabel} ${endTimeLabel}`
}

function getRsvpStorageKey(eventId) { return `rsvp_${eventId}` }

// ── Send Reminder via EmailJS ─────────────────────────────────────────────────
async function sendReminderEmail(event) {
  const { default: emailjs } = await import('@emailjs/browser')
  const result = await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      event_title:       event.title,
      event_date:        new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      event_time:        formatTime(event.time),
      event_location:    event.location,
      event_type:        event.type || '',
      event_description: event.description || '',
      event_image:       event.image || '',
    },
    EMAILJS_PUBLIC_KEY
  )
  // Log count to Firestore
  const { loadFirestore } = await import('../../firebase')
  const { mod, db } = await loadFirestore()
  const ref  = mod.doc(db, 'emailReminders', event.id)
  const snap = await mod.getDoc(ref)
  const prev = snap.exists() ? (snap.data().count || 0) : 0
  await mod.setDoc(ref, {
    eventId:    event.id,
    eventTitle: event.title,
    count:      prev + 1,
    lastSentAt: mod.serverTimestamp(),
  })
  return result
}

// ── Reminder Button ───────────────────────────────────────────────────────────
function ReminderButton({ event }) {
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [count,  setCount]  = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { loadFirestore } = await import('../../firebase')
        const { mod, db } = await loadFirestore()
        const snap = await mod.getDoc(mod.doc(db, 'emailReminders', event.id))
        if (snap.exists()) setCount(snap.data().count || 0)
      } catch {}
    }
    load()
  }, [event.id])

  const handleSend = async () => {
    if (status === 'sending' || status === 'sent') return
    setStatus('sending')
    try {
      await sendReminderEmail(event)
      setCount(c => (c || 0) + 1)
      setStatus('sent')
      setTimeout(() => setStatus('idle'), 4000)
    } catch (err) {
      console.error('Reminder failed:', err)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={status === 'sending' || status === 'sent'}
      className={`flex items-center gap-1 px-2 h-7 rounded-lg text-xs font-semibold transition-colors shadow-sm ${
        status === 'sent'    ? 'bg-green-500 text-white' :
        status === 'error'   ? 'bg-red-500 text-white' :
        status === 'sending' ? 'bg-amber-400 text-white' :
        'bg-amber-500/80 text-white hover:bg-amber-500'
      }`}
    >
      {status === 'sending' ? (
        <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Sending...</>
      ) : status === 'sent' ? (
        <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Sent! {count ? `· ${count}` : ''}</>
      ) : status === 'error' ? (
        <>⚠ Failed</>
      ) : (
        <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>Remind {count ? `· ${count}` : ''}</>
      )}
    </button>
  )
}

function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0 })
  const [isPast, setIsPast] = useState(false)

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(targetDate) - new Date()
      if (diff > 0) {
        setIsPast(false)
        setTimeLeft({
          days:  Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          mins:  Math.floor((diff / (1000 * 60)) % 60)
        })
      } else { setIsPast(true) }
    }
    calculate()
    const timer = setInterval(calculate, 60000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (isPast) return <span className="text-xs font-medium text-rotary-slate dark:text-white/30 uppercase tracking-wider">Event concluded</span>

  return (
    <div className="flex gap-2">
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div key={unit} className="text-center">
          <div className="w-11 h-11 rounded-lg bg-rotary-cloud dark:bg-white/[0.04] border border-gray-100 dark:border-white/5 flex items-center justify-center">
            <span className="font-display font-bold text-base text-rotary-blue dark:text-white">{value}</span>
          </div>
          <span className="text-[10px] text-rotary-slate dark:text-white/30 uppercase mt-1 block">{unit}</span>
        </div>
      ))}
    </div>
  )
}

function RSVPModal({ event, onClose, onSuccess, existingRsvp }) {
  // Only need save() here (RSVP creation is a public write per firestore.rules) —
  // disable the read/listener entirely so anonymous visitors never trigger a
  // Firestore SDK download just by opening the RSVP form.
  const { save: saveRsvp } = useCollection('rsvps', [], { enabled: false })
  const [step, setStep] = useState(existingRsvp ? 'already' : 'form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', guests: '1', dietaryNotes: '' })
  const totalAttendees = parseInt(form.guests) || 1

  const handleSubmit = async () => {
    if (form.honeypot) return // Bot detected — silently ignore
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Please enter a valid email address.'); return }
    setError(''); setLoading(true)
    try {
      const normalizedEmail = form.email.trim().toLowerCase()
      // Deterministic ID (eventId + email) instead of a duplicate-check read —
      // `rsvps` requires auth to read, so an anonymous visitor can't query it.
      // Firestore rules already distinguish create (public) vs update
      // (auth-only) based on whether the doc exists, so a second RSVP attempt
      // with the same event+email naturally gets rejected as permission-denied.
      const rsvpData = {
        id: `${event.id}_${normalizedEmail}`, eventId: event.id, eventTitle: event.title, eventDate: event.date,
        name: form.name.trim(), email: normalizedEmail, phone: form.phone.trim(),
        guests: totalAttendees, dietaryNotes: form.dietaryNotes.trim(), status: 'confirmed', rsvpedAt: new Date().toISOString()
      }
      await saveRsvp(rsvpData)
      localStorage.setItem(getRsvpStorageKey(event.id), JSON.stringify({ name: form.name.trim(), guests: totalAttendees, rsvpedAt: rsvpData.rsvpedAt }))
      onSuccess && onSuccess(rsvpData)
      setStep('success')
    } catch (err) {
      if (err.code === 'permission-denied') {
        setError("You've already RSVP'd for this event.")
      } else {
        console.error('RSVP error:', err)
        setError('Something went wrong. Please try again.')
      }
    }
    finally { setLoading(false) }
  }

  return (
    <motion.div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full sm:max-w-md bg-white dark:bg-rotary-navy-light rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
        <div className="h-1.5 w-full bg-gradient-to-r from-rotary-blue via-rotary-gold to-rotary-blue" />
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/20" /></div>
        <div className="p-6">
          <div className="flex items-start gap-3 mb-6 pb-5 border-b border-gray-100 dark:border-white/10">
            <div className="w-12 h-12 rounded-xl bg-rotary-blue/10 dark:bg-rotary-blue/20 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-rotary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-rotary-gold uppercase tracking-wider mb-0.5">RSVP</p>
              <h3 className="font-display font-bold text-gray-900 dark:text-white leading-tight truncate">{event.title}</h3>
              <p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">{formatEventSchedule(event, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <button onClick={onClose} className="ml-auto shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 'already' && (
              <motion.div key="already" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h4 className="font-display font-bold text-lg text-gray-900 dark:text-white mb-1">You're already going!</h4>
                  <p className="text-sm text-rotary-slate dark:text-white/50 mb-1">RSVP confirmed for <span className="font-semibold text-gray-700 dark:text-white/70">{existingRsvp.name}</span></p>
                  <p className="text-sm text-rotary-slate dark:text-white/50 mb-6">{existingRsvp.guests} {existingRsvp.guests === 1 ? 'attendee' : 'attendees'}</p>
                  <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors">Got it</button>
                </div>
              </motion.div>
            )}
            {step === 'form' && (
              <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="space-y-3">
                  <div><label className="text-xs font-medium text-rotary-slate dark:text-white/50 block mb-1">Full Name <span className="text-red-400">*</span></label><input className={inputClass} placeholder="Your full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div><label className="text-xs font-medium text-rotary-slate dark:text-white/50 block mb-1">Email <span className="text-red-400">*</span></label><input className={inputClass} type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-rotary-slate dark:text-white/50 block mb-1">Phone <span className="text-red-400">*</span></label><input className={inputClass} type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                    <div><label className="text-xs font-medium text-rotary-slate dark:text-white/50 block mb-1">No. of guests</label>
                      <select className={inputClass} value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })}>
                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label className="text-xs font-medium text-rotary-slate dark:text-white/50 block mb-1">Dietary notes (optional)</label><input className={inputClass} placeholder="e.g. vegetarian, wheelchair access..." value={form.dietaryNotes} onChange={e => setForm({ ...form, dietaryNotes: e.target.value })} /></div>
                  {/* Honeypot — hidden from humans, bots fill it */}
                  <input type="text" name="website" value={form.honeypot || ''} onChange={e => setForm({ ...form, honeypot: e.target.value })} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                  {error && <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
                </div>
                <div className="mt-5 flex items-center gap-2 text-xs text-rotary-slate dark:text-white/30 mb-4">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Your data is only used for event coordination.
                </div>
                <button onClick={handleSubmit} disabled={loading || !form.name.trim() || !form.email.trim() || !form.phone.trim()}
                  className="w-full py-3 rounded-xl bg-rotary-blue text-white text-sm font-bold hover:bg-rotary-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                  {loading ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Confirming...</> : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Confirm RSVP · {totalAttendees} {totalAttendees === 1 ? 'person' : 'people'}</>}
                </button>
              </motion.div>
            )}
            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-4">
                <motion.div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center mx-auto mb-4" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}>
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </motion.div>
                <h4 className="font-display font-bold text-xl text-gray-900 dark:text-white mb-2">You're in!</h4>
                <p className="text-sm text-rotary-slate dark:text-white/50 mb-6 max-w-xs mx-auto">Your RSVP has been confirmed. Add this event to your calendar!</p>
                <div className="flex flex-col gap-2 mb-4">
                  <a href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${toICSDateTime(event.date, event.time)}/${toICSDateTime(getEventEnd(event).date, getEventEnd(event).time)}&details=${encodeURIComponent('Rotaract Club Bengaluru BTM Event')}&location=${encodeURIComponent(event.location)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" />Add to Google Calendar
                  </a>
                  <button onClick={() => {
                    const end = getEventEnd(event)
                    const ics = ['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT',`SUMMARY:${event.title}`,`DTSTART:${toICSDateTime(event.date, event.time)}`,`DTEND:${toICSDateTime(end.date, end.time)}`,`LOCATION:${event.location}`,'DESCRIPTION:Rotaract Club Bengaluru BTM Event','END:VEVENT','END:VCALENDAR'].join('\n')
                    const blob = new Blob([ics],{type:'text/calendar'}); const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href=url; a.download=`${event.title.replace(/\s+/g,'_')}.ics`; a.click(); URL.revokeObjectURL(url)
                  }} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Add to Apple / Outlook Calendar
                  </button>
                </div>
                <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors">Done</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

function AdminRSVPPanel({ event, rsvps, onClose }) {
  const eventRsvps = rsvps.filter(r => r.eventId === event.id)
  const totalAttendees = eventRsvps.reduce((sum, r) => sum + (r.guests || 1), 0)

  const exportCSV = () => {
    const headers = ['Name','Email','Phone','Guests','Dietary Notes','RSVP Date']
    const rows = eventRsvps.map(r => [r.name, r.email, r.phone||'', r.guests||1, r.dietaryNotes||'', new Date(r.rsvpedAt).toLocaleString('en-IN')])
    const csv = [headers,...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`rsvp_${event.title.replace(/\s+/g,'_')}_${event.date}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <motion.div className="fixed inset-0 z-[300] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl overflow-hidden" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white">RSVP List</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <p className="text-sm text-rotary-slate dark:text-white/50 mb-4 truncate">{event.title}</p>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {[{label:'RSVPs',value:eventRsvps.length,color:'text-rotary-blue'},{label:'Attendees',value:totalAttendees,color:'text-rotary-gold'},{label:'Avg. Size',value:eventRsvps.length?(totalAttendees/eventRsvps.length).toFixed(1):'0',color:'text-green-500'}].map(stat => (
              <div key={stat.label} className="bg-gray-50 dark:bg-white/[0.04] rounded-xl p-2 sm:p-3 text-center border border-gray-100 dark:border-white/5">
                <p className={`font-display font-bold text-xl sm:text-2xl ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] sm:text-[11px] text-rotary-slate dark:text-white/40 mt-0.5 leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {eventRsvps.length === 0 ? (
            <div className="text-center py-12 text-rotary-slate dark:text-white/30"><p className="text-sm">No RSVPs yet</p></div>
          ) : (
            <div className="space-y-2">
              {eventRsvps.map((rsvp, i) => (
                <motion.div key={rsvp.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/5">
                  <div className="w-9 h-9 rounded-lg bg-rotary-blue/10 dark:bg-rotary-blue/20 flex items-center justify-center shrink-0 font-bold text-sm text-rotary-blue">{rsvp.name?.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{rsvp.name}</p>
                    <p className="text-xs text-rotary-slate dark:text-white/40 truncate">{rsvp.email}</p>
                    {rsvp.dietaryNotes && <p className="text-xs text-amber-500 truncate mt-0.5">📝 {rsvp.dietaryNotes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-gray-700 dark:text-white/70">{rsvp.guests || 1}</span>
                    <p className="text-[10px] text-rotary-slate dark:text-white/30">{new Date(rsvp.rsvpedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        {eventRsvps.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 shrink-0">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export CSV
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function EventModal({ event, onClose, rsvpCount }) {
  if (!event) return null
  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-rotary-navy-light rounded-xl shadow-2xl" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
        <div className="relative h-48">
          <img src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80'} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <span className="inline-block px-3 py-1 mb-2 text-xs font-semibold bg-rotary-gold text-rotary-navy rounded-full">{event.type}</span>
            <h2 className="font-display font-bold text-xl text-white">{event.title}</h2>
          </div>
        </div>
        <div className="p-6">
          {event.description && <p className="text-rotary-charcoal dark:text-white/70 mb-5 leading-relaxed">{event.description}</p>}
          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3 text-sm text-rotary-charcoal dark:text-white/60"><svg className="w-4 h-4 text-rotary-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{event.endDate && event.endDate !== event.date && <> – {new Date(event.endDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</>}</div>
            <div className="flex items-center gap-3 text-sm text-rotary-charcoal dark:text-white/60"><svg className="w-4 h-4 text-rotary-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{formatTime(event.time)}{event.endTime && <> – {formatTime(event.endTime)}</>}</div>
            <div className="flex items-center gap-3 text-sm text-rotary-charcoal dark:text-white/60"><svg className="w-4 h-4 text-rotary-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{event.location}</div>
            {rsvpCount > 0 && <div className="flex items-center gap-3 text-sm text-green-600 dark:text-green-400"><svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{rsvpCount} {rsvpCount === 1 ? 'person has' : 'people have'} RSVP'd</div>}
          </div>
          <CountdownTimer targetDate={`${event.date}T${event.time || '00:00'}`} />
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Events({ isAdmin, setCurrentPage }) {
  const { data: events, loading: eventsLoading, save, remove } = useCollection('events', [], { live: isAdmin })
  const sortedEvents = [...events].sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`))
  const { data: rsvps, loading: rsvpsLoading } = useCollection('rsvps', [], isAdmin)
  // Completed projects awaiting a super-admin/secretary decision to feature on the site.
  const { data: avenueProjectsData } = useCollection('avenueProjects', [], { enabled: isAdmin })
  const pendingFeatures = (avenueProjectsData || []).filter(p => p.featureRequested && !p.featurePublished && !p.deletedAt)
  const [selectedEvent,  setSelectedEvent]  = useState(null)
  const [rsvpEvent,      setRsvpEvent]      = useState(null)
  const [adminRsvpEvent, setAdminRsvpEvent] = useState(null)
  const [showForm,       setShowForm]       = useState(false)
  const [editingId,      setEditingId]      = useState(null)
  const [deleteId,       setDeleteId]       = useState(null)
  const [myRsvps,        setMyRsvps]        = useState({})
  const [form, setForm] = useState({ title:'', date:'', time:'', endDate:'', endTime:'', location:'', type:eventTypes[0], image:'', description:'' })
  const formRef = useRef(null)

  useEffect(() => {
    if (!events) return
    const stored = {}
    events.forEach(e => { try { const val = localStorage.getItem(getRsvpStorageKey(e.id)); if (val) stored[e.id] = JSON.parse(val) } catch {} })
    setMyRsvps(stored)
  }, [events])

  useEffect(() => {
    if (!events?.length) return
    const hash = window.location.hash.replace('#','')
    if (hash.startsWith('event-')) { const found = events.find(e => e.id === hash.replace('event-','')); if (found) setRsvpEvent(found) }
  }, [events])

  const resetForm = () => { setForm({ title:'', date:'', time:'', endDate:'', endTime:'', location:'', type:eventTypes[0], image:'', description:'' }); setEditingId(null); setShowForm(false) }

  const handleSave = async () => {
    if (!form.title || !form.date || !form.time || !form.location) return
    try {
      await save({ id: editingId || Date.now().toString(), ...form })
      logAction({ admin: 'admin', action: editingId ? 'EDIT' : 'CREATE', module: 'Events', item: form.title, details: `Event ${editingId ? 'updated' : 'created'}` })
      resetForm()
    }
    catch (error) { console.error('Error saving event:', error) }
  }

  const handleEdit = (event) => {
    setForm({ title:event.title, date:event.date, time:event.time, endDate:event.endDate||'', endTime:event.endTime||'', location:event.location, type:event.type, image:event.image||'', description:event.description||'' })
    setEditingId(event.id); setShowForm(true)
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const handleConfirmDelete = async () => {
    if (!deleteId) return
    try {
      const eventTitle = events.find(e => e.id === deleteId)?.title || deleteId
      await remove(deleteId)
      logAction({ admin: 'admin', action: 'DELETE', module: 'Events', item: eventTitle, details: `Event deleted` })
    } catch (error) { console.error('Error deleting event:', error) }
    setDeleteId(null)
  }

  const handleRSVPSuccess = useCallback((rsvpData) => {
    setMyRsvps(prev => ({ ...prev, [rsvpData.eventId]: { name:rsvpData.name, guests:rsvpData.guests, rsvpedAt:rsvpData.rsvpedAt } }))
  }, [])

  const getRsvpCountForEvent = (eventId) => {
    if (!rsvps) return 0
    return rsvps.filter(r => r.eventId === eventId).reduce((sum, r) => sum + (r.guests || 1), 0)
  }

  if (eventsLoading) return <section className="section-padding"><div className="max-w-7xl mx-auto text-center">Loading events...</div></section>

  return (
    <section id="events" className="section-padding bg-rotary-cloud dark:bg-rotary-navy-light">
      <div className="max-w-7xl mx-auto">
        <motion.div className="text-center mb-16" initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}>
          <span className="text-rotary-gold font-semibold mb-4 block text-sm uppercase tracking-wider">Upcoming Events</span>
          <h2 className="heading-lg mb-4">Join Us in <span className="text-gradient">Action</span></h2>
          <p className="text-rotary-slate dark:text-white/50 max-w-2xl mx-auto">Be part of our community gatherings, service projects, and celebration events.</p>
        </motion.div>

        {isAdmin && pendingFeatures.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-rotary-blue/5 border border-rotary-blue/20">
            <p className="text-sm font-medium text-rotary-blue">
              {pendingFeatures.length} completed project{pendingFeatures.length === 1 ? '' : 's'} awaiting your approval to feature on the site.
            </p>
            <button onClick={() => setCurrentPage?.('activeProjects')} className="text-xs font-bold text-rotary-blue hover:underline shrink-0">Review in Active Projects →</button>
          </div>
        )}

        {isAdmin && (
          <div className="flex justify-end mb-6">
            <button onClick={() => { if (showForm && !editingId) resetForm(); else { resetForm(); setShowForm(true) } }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} /></svg>
              {showForm ? 'Cancel' : 'Add Event'}
            </button>
          </div>
        )}

        <AnimatePresence>
          {isAdmin && showForm && (
            <motion.div ref={formRef} className="mb-10 scroll-mt-24 bg-white dark:bg-rotary-navy rounded-xl p-6 md:p-8 border border-gray-100 dark:border-white/5 shadow-sm" initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}>
              <h3 className="font-display font-semibold text-lg mb-5">{editingId ? 'Edit Event' : 'New Event'}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input className={inputClass} placeholder="Event Title *" value={form.title} onChange={e => setForm({...form, title:e.target.value})} />
                <select className={inputClass} value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                  {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div><label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Start Date *</label><input className={inputClass} type="date" value={form.date} onChange={e => setForm({...form, date:e.target.value})} /></div>
                <div><label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Start Time *</label><input className={inputClass} type="time" value={form.time} onChange={e => setForm({...form, time:e.target.value})} /></div>
                <div><label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">End Date</label><input className={inputClass} type="date" min={form.date || undefined} value={form.endDate} onChange={e => setForm({...form, endDate:e.target.value})} /></div>
                <div><label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">End Time</label><input className={inputClass} type="time" value={form.endTime} onChange={e => setForm({...form, endTime:e.target.value})} /></div>
                <input className={inputClass} placeholder="Location *" value={form.location} onChange={e => setForm({...form, location:e.target.value})} />
                <input className={inputClass} placeholder="Image URL (optional)" value={form.image} onChange={e => setForm({...form, image:e.target.value})} />
                <textarea className={`${inputClass} md:col-span-2`} rows={3} placeholder="Description" value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleSave} disabled={!form.title||!form.date||!form.time||!form.location} className="px-6 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm hover:bg-rotary-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {editingId ? 'Save Changes' : 'Add Event'}
                </button>
                {editingId && <button onClick={resetForm} className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel Edit</button>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedEvents.map((event, i) => {
            const myRsvp    = myRsvps[event.id]
            const rsvpCount = getRsvpCountForEvent(event.id)
            const isPast    = new Date(event.date) < new Date()

            return (
              <motion.div key={event.id} initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.4, delay:i*0.08 }}>
                <Card className="overflow-hidden h-full flex flex-col relative group" hover={true}>

                  {/* Admin controls */}
                  {isAdmin && (
                    <div className="absolute top-2 right-2 z-20 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {/* Remind button */}
                      <ReminderButton event={event} />
                      {/* RSVP list */}
                      <button onClick={() => setAdminRsvpEvent(event)} className="flex items-center gap-1 px-2 h-7 rounded-lg bg-rotary-blue/80 text-white text-xs font-semibold hover:bg-rotary-blue transition-colors shadow-sm">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {rsvps?.filter(r => r.eventId === event.id).length || 0}
                      </button>
                      <button onClick={() => handleEdit(event)} className="w-7 h-7 rounded-lg bg-white/80 dark:bg-white/10 text-rotary-charcoal dark:text-white flex items-center justify-center hover:bg-white dark:hover:bg-white/20 transition-colors shadow-sm">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleteId(event.id)} className="w-7 h-7 rounded-lg bg-red-500/80 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}

                  <div className="relative h-44 -m-6 mb-5 md:-m-8 md:mb-5 cursor-pointer" onClick={() => setSelectedEvent(event)}>
                    <img src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80'} alt={event.title} className="w-full h-full object-cover" loading="lazy" />
                    <span className="absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold bg-rotary-gold text-rotary-navy rounded-full">{event.type}</span>
                    {myRsvp && (
                      <span className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-green-500 text-white rounded-full shadow">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        You're going
                      </span>
                    )}
                  </div>

                  <div className="flex-1 cursor-pointer" onClick={() => setSelectedEvent(event)}>
                    <h3 className="font-display font-semibold text-lg mb-3 leading-snug">{event.title}</h3>
                    <div className="space-y-2 mb-4 text-sm text-rotary-slate dark:text-white/50">
                      <div className="flex items-center gap-2"><svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{new Date(event.date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}{event.endDate && event.endDate !== event.date && <> – {new Date(event.endDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</>}</div>
                      <div className="flex items-center gap-2"><svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{formatTime(event.time)}{event.endTime && <> – {formatTime(event.endTime)}</>}</div>
                      <div className="flex items-center gap-2"><svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{event.location}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <CountdownTimer targetDate={`${event.date}T${event.time || '00:00'}`} />
                      {!rsvpsLoading && rsvpCount > 0 && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">{rsvpCount} going</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); const url=`${window.location.origin}${window.location.pathname}#event-${event.id}`; navigator.clipboard.writeText(url); alert('Event link copied!') }}
                    className="mt-3 w-full py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-rotary-blue hover:bg-rotary-blue/5 border border-gray-100 transition-all flex items-center justify-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    Share / Copy Link
                  </button>

                  {!isPast ? (
                    <motion.button className={`mt-3 w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${myRsvp ? 'bg-green-500/10 dark:bg-green-500/15 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30 hover:bg-green-500/20' : 'bg-rotary-blue text-white hover:bg-rotary-blue-dark'}`}
                      whileHover={{ scale:1.01 }} whileTap={{ scale:0.98 }} onClick={() => setRsvpEvent(event)}>
                      {myRsvp ? <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>You're going · {myRsvp.guests} {myRsvp.guests === 1 ? 'person' : 'people'}</> : 'RSVP Now'}
                    </motion.button>
                  ) : (
                    <div className="mt-3 w-full py-2.5 rounded-lg text-sm font-semibold text-center text-rotary-slate dark:text-white/30 bg-gray-100 dark:bg-white/5 cursor-default">Event concluded</div>
                  )}
                </Card>
              </motion.div>
            )
          })}
        </div>

        {setCurrentPage && (
          <motion.div
            className="text-center mt-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-rotary-slate dark:text-white/50 mb-4">Want to help plan and run events like these?</p>
            <button
              onClick={() => setCurrentPage('joinForm')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-rotary-blue text-white font-semibold text-sm hover:bg-rotary-blue-dark transition-colors shadow-sm"
            >
              Join Rotaract
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} rsvpCount={getRsvpCountForEvent(selectedEvent.id)} />}
      </AnimatePresence>
      <AnimatePresence>
        {rsvpEvent && <RSVPModal event={rsvpEvent} onClose={() => setRsvpEvent(null)} onSuccess={handleRSVPSuccess} existingRsvp={myRsvps[rsvpEvent.id]} />}
      </AnimatePresence>
      <AnimatePresence>
        {adminRsvpEvent && rsvps && <AdminRSVPPanel event={adminRsvpEvent} rsvps={rsvps} onClose={() => setAdminRsvpEvent(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <motion.div className="relative bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-white/10" initial={{ scale:0.95 }} animate={{ scale:1 }} exit={{ scale:0.95 }}>
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="font-display font-bold text-lg mb-1">Delete Event?</h3>
              <p className="text-sm text-gray-400 dark:text-white/50 mb-6">This event and all its RSVP data will be permanently deleted.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={handleConfirmDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
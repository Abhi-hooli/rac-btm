import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loadFirestore, getCurrentAdminEmail } from '../../firebase'
import { softDelete, backupToSheet } from '../../utils/trash'
import { AVENUES } from './treasurerShared'

const DIRECTOR_AVENUES = [...AVENUES.filter(a => a !== 'Not Applicable'), 'Membership']

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAvenueDirector(members, avenue) {
  if (!avenue) return ''
  const match = members.find(m => m.avenue === avenue && ((m.role || '').toLowerCase().includes('director') || (m.role2 || '').toLowerCase().includes('director')))
  return match?.name || ''
}

function getBulletPoints(v) {
  if (Array.isArray(v)) return v.map(item => item.text).filter(Boolean)
  if (typeof v === 'string' && v) return [v]
  return []
}

function getMonthFinancials(transactions, meetingDate) {
  if (!meetingDate) return { income: 0, expense: 0 }
  const month = meetingDate.slice(0, 7) // YYYY-MM
  const inMonth = transactions.filter(t => (t.date || '').slice(0, 7) === month)
  const income = inMonth.filter(t => t.type === 'Income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
  const expense = inMonth.filter(t => t.type === 'Expense' && t.reimbursableStatus !== 'Written Off').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
  return { income, expense }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

const formatDateTime = (ts) => {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
  })
}

// Newest first. Falls back to the old single-entry fields for items updated before history tracking existed.
function getStatusHistory(item) {
  if (Array.isArray(item.statusHistory)) return item.statusHistory
  if (item.statusUpdatedBy) {
    return [{ from: item.previousStatus || 'Pending', to: item.status || 'Pending', by: item.statusUpdatedBy, at: item.statusUpdatedAt }]
  }
  return []
}

const STATUS_COLORS = {
  'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'Done': 'bg-green-50 text-green-700 border-green-200',
}

const PRIORITY_COLORS = {
  'Low': 'bg-gray-50 text-gray-600 border-gray-200',
  'Medium': 'bg-blue-50 text-blue-700 border-blue-200',
  'High': 'bg-red-50 text-red-700 border-red-200',
}

const MEETING_TYPES = ['General Body Meeting', 'Board Meeting', 'Committee Meeting', 'Special Meeting']

const EMPTY_MOM = {
  meetingNumber: '',
  meetingType: 'General Body Meeting',
  meetingTitle: '',
  meetingDate: '',
  startTime: '',
  endTime: '',
  venue: '',
  chairedBy: '',
  recordedBy: '',
  totalMembers: '',
  attendees: '',
  agendaItems: [{ text: '' }],
  presidentUpdate: [{ text: '' }],
  secretaryUpdate: [{ text: '' }],
  discussionItems: [{ agendaItem: '', discussion: '', decision: '' }],
  actionItems: [{ task: '', owner: '', deadline: '', priority: 'Medium', status: 'Pending' }],
  directorUpdates: [{ avenue: '', update: '' }],
  financials: { income: '', expense: '' },
  announcements: '',
  nextMeetingTitle: '',
  nextMeetingDate: '',
  nextMeetingTime: '',
  nextMeetingVenue: '',
  attachments: [{ name: '', url: '' }],
  preparedBy: '',
  reviewedBy: '',
  approvedBy: '',
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status, onChange }) {
  const statuses = ['Pending', 'In Progress', 'Done']
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLORS[status]} flex items-center gap-1.5 whitespace-nowrap`}
      >
        {status}
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute left-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden w-36"
          >
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors ${s === status ? 'bg-gray-50' : ''}`}
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatusHistoryLog({ history = [] }) {
  const [open, setOpen] = useState(false)
  if (history.length === 0) return null
  const [latest, ...rest] = history

  const Entry = ({ h }) => (
    <p className="text-[10px] text-gray-400">
      {h.from} → {h.to} by <span className="font-semibold text-gray-500">{h.by}</span> · {formatDateTime(h.at)}
    </p>
  )

  return (
    <div className="mt-1.5 pt-1.5 border-t border-gray-100">
      <div className="flex items-center justify-between gap-2">
        <Entry h={latest} />
        {rest.length > 0 && (
          <button
            onClick={() => setOpen(o => !o)}
            className="text-[10px] font-semibold text-rotary-blue hover:underline flex-shrink-0 flex items-center gap-0.5"
          >
            {open ? 'Hide' : `+${rest.length} more`}
            <svg className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      {open && rest.length > 0 && (
        <div className="mt-1 space-y-1 pl-2 border-l-2 border-gray-100">
          {rest.map((h, i) => <Entry key={i} h={h} />)}
        </div>
      )}
    </div>
  )
}

function DynamicList({ label, items, onChange, fieldKey = 'text', placeholder, bulleted = false }) {
  const update = (idx, value) => {
    const next = [...items]
    next[idx] = { ...next[idx], [fieldKey]: value }
    onChange(next)
  }
  const add = () => onChange([...items, { [fieldKey]: '' }])
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx))

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {bulleted ? (
              <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-rotary-blue text-lg leading-none">•</span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-rotary-blue/10 text-rotary-blue text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
            )}
            <input
              type="text"
              value={item[fieldKey]}
              onChange={(e) => update(idx, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
            />
            {items.length > 1 && (
              <button onClick={() => remove(idx)} className="w-6 h-6 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      <button onClick={add} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rotary-blue hover:text-rotary-blue/70 transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add {label.toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  )
}

// ─── Generic Multi-Field List (discussion, director updates, attachments) ─────

function MultiFieldList({ label, items, onChange, fields, addRow, placeholder = {} }) {
  const update = (idx, key, value) => {
    const next = [...items]
    next[idx] = { ...next[idx], [key]: value }
    onChange(next)
  }
  const add = () => onChange([...items, addRow])
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx))

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
              {items.length > 1 && (
                <button onClick={() => remove(idx)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
              )}
            </div>
            {fields.map(f => (
              <input
                key={f}
                type="text"
                value={item[f] || ''}
                onChange={(e) => update(idx, f, e.target.value)}
                placeholder={placeholder[f] || f}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue transition-colors"
              />
            ))}
          </div>
        ))}
      </div>
      <button onClick={add} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rotary-blue hover:text-rotary-blue/70 transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add {label.toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  )
}

// ─── Director Updates List (avenue → director auto-matched from Our Team) ────

function DirectorUpdatesList({ items, onChange, members }) {
  const update = (idx, key, value) => {
    const next = [...items]
    next[idx] = { ...next[idx], [key]: value }
    onChange(next)
  }
  const add = () => onChange([...items, { avenue: '', update: '' }])
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx))

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Director Updates</label>
      <div className="space-y-3">
        {items.map((item, idx) => {
          const director = getAvenueDirector(members, item.avenue)
          return (
            <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => remove(idx)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={item.avenue}
                  onChange={(e) => update(idx, 'avenue', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue transition-colors"
                >
                  <option value="">Select avenue…</option>
                  {DIRECTOR_AVENUES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                {item.avenue && (
                  <span className={`text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap ${director ? 'bg-rotary-blue/10 text-rotary-blue' : 'bg-amber-50 text-amber-600'}`}>
                    {director || 'No director on record'}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={item.update || ''}
                onChange={(e) => update(idx, 'update', e.target.value)}
                placeholder="Update"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue transition-colors"
              />
            </div>
          )
        })}
      </div>
      <button onClick={add} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rotary-blue hover:text-rotary-blue/70 transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add director update
      </button>
    </div>
  )
}

// ─── Accordion Section (drawer) ────────────────────────────────────────────────

function AccordionSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// ─── Attendees Selector ───────────────────────────────────────────────────────

function AttendeesSelector({ value, onChange, members }) {
  const [search, setSearch] = useState('')
  const selected = new Set(value ? value.split(',').map(s => s.trim()).filter(Boolean) : [])
  const toggle = (name) => {
    const next = new Set(selected)
    next.has(name) ? next.delete(name) : next.add(name)
    onChange([...next].join(', '))
  }
  const allOn = () => onChange(members.map(m => m.name).join(', '))
  const allOff = () => onChange('')

  const roleRank = (m) => {
    const r = `${m.role || ''} ${m.role2 || ''}`.toLowerCase()
    if (r.includes('president') && !r.includes('vice') && !r.includes('past') && !r.includes('ipp')) return 0
    if (r.includes('secretary')) return 1
    return 2
  }
  const sortedMembers = [...members].sort((a, b) => roleRank(a) - roleRank(b))
  const filteredMembers = sortedMembers.filter(m => m.name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Attendees ({selected.size} selected{members.length > 0 ? ` — ${((selected.size / members.length) * 100).toFixed(0)}%` : ''})
        </label>
        <div className="flex gap-2">
          <button onClick={allOn} className="text-xs text-rotary-blue font-semibold hover:underline">All</button>
          <span className="text-gray-300">|</span>
          <button onClick={allOff} className="text-xs text-gray-400 font-semibold hover:underline">Clear</button>
        </div>
      </div>
      {members.length > 0 && (
        <div className="relative mb-2">
          <svg className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
          />
        </div>
      )}
      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 divide-y divide-gray-100">
        {members.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No members found. Add members via Our Team page.</p>
        )}
        {members.length > 0 && filteredMembers.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No members match "{search}".</p>
        )}
        {filteredMembers.map((m, i) => {
          const on = selected.has(m.name)
          const group = roleRank(m) <= 1 ? 'leadership' : 'other'
          const prevGroup = i > 0 ? (roleRank(filteredMembers[i - 1]) <= 1 ? 'leadership' : 'other') : null
          const showHeader = group !== prevGroup
          return (
            <React.Fragment key={m.id}>
              {showHeader && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0">
                  {group === 'leadership' ? 'President & Secretaries' : 'Other Members'}
                </p>
              )}
              <button
                onClick={() => toggle(m.name)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${on ? 'bg-rotary-blue/5' : 'hover:bg-white'}`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${on ? 'bg-rotary-blue border-rotary-blue' : 'border-gray-300'}`}>
                  {on && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{m.name}</p>
                  {m.role && <p className="text-[10px] text-gray-400 truncate">{m.role}</p>}
                </div>
              </button>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ─── Owner Dropdown ───────────────────────────────────────────────────────────

function OwnerDropdown({ value, onChange, members }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
  const selected = members.find(m => m.name === value)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue transition-colors text-left"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-rotary-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {selected.name[0].toUpperCase()}
            </span>
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-gray-400">Select owner…</span>
        )}
        <svg className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search member…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {value && (
                <button
                  onClick={() => { onChange(''); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 transition-colors italic"
                >
                  — Clear selection
                </button>
              )}
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-xs text-gray-400 text-center">No members found</p>
              ) : (
                filtered.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { onChange(m.name); setOpen(false); setSearch('') }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-rotary-blue/5 transition-colors ${m.name === value ? 'bg-rotary-blue/5' : ''}`}
                  >
                    <span className="w-6 h-6 rounded-full bg-rotary-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {m.name[0].toUpperCase()}
                    </span>
                    <div className="text-left min-w-0">
                      <p className="font-medium text-rotary-charcoal truncate text-xs">{m.name}</p>
                      {m.role && <p className="text-[10px] text-gray-400 truncate">{m.role}</p>}
                    </div>
                    {m.name === value && (
                      <svg className="w-3.5 h-3.5 text-rotary-blue ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Multi Owner Dropdown (e.g. Prepared By — more than one person) ──────────

function MultiOwnerDropdown({ value, onChange, members }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))

  const toggle = (name) => {
    const next = selected.includes(name) ? selected.filter(n => n !== name) : [...selected, name]
    onChange(next.join(', '))
  }
  const removeChip = (name) => onChange(selected.filter(n => n !== name).join(', '))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue transition-colors text-left min-h-[38px]"
      >
        {selected.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {selected.map(name => (
              <span key={name} className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-md bg-rotary-blue/10 text-rotary-blue text-xs font-semibold">
                {name}
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); removeChip(name) }}
                  className="w-3.5 h-3.5 rounded-full hover:bg-rotary-blue/20 flex items-center justify-center"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </span>
              </span>
            ))}
          </span>
        ) : (
          <span className="text-gray-400">Select preparer(s)…</span>
        )}
        <svg className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search member…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-xs text-gray-400 text-center">No members found</p>
              ) : (
                filtered.map(m => {
                  const on = selected.includes(m.name)
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggle(m.name)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-rotary-blue/5 transition-colors ${on ? 'bg-rotary-blue/5' : ''}`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${on ? 'bg-rotary-blue border-rotary-blue' : 'border-gray-300'}`}>
                        {on && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="font-medium text-rotary-charcoal truncate text-xs">{m.name}</p>
                        {m.role && <p className="text-[10px] text-gray-400 truncate">{m.role}</p>}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── MoM Form Modal ───────────────────────────────────────────────────────────

function MomModal({ isOpen, onClose, onSave, initial, members, attendanceMeetings = [], transactions = [] }) {
  const [form, setForm] = useState(EMPTY_MOM)
  const [saving, setSaving] = useState(false)
  const [customTitle, setCustomTitle] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const toBulletList = (v) => Array.isArray(v) && v.length > 0 ? v : (typeof v === 'string' && v ? [{ text: v }] : [{ text: '' }])
      setForm(initial ? {
        ...initial,
        presidentUpdate: toBulletList(initial.presidentUpdate),
        secretaryUpdate: toBulletList(initial.secretaryUpdate),
      } : EMPTY_MOM)
      setCustomTitle(false)
    }
  }, [isOpen, initial])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const secretaries = members.filter(m => `${m.role || ''} ${m.role2 || ''}`.toLowerCase().includes('secretary'))
  const president = members.find(m => {
    const r = `${m.role || ''} ${m.role2 || ''}`.toLowerCase()
    return r.includes('president') && !r.includes('vice') && !r.includes('past') && !r.includes('ipp')
  })

  useEffect(() => {
    if (isOpen && president) set('approvedBy', president.name)
  }, [isOpen, president?.name])

  useEffect(() => {
    if (isOpen) set('totalMembers', String(members.length))
  }, [isOpen, members.length])

  const handleMeetingSelect = (e) => {
    const val = e.target.value
    if (val === '__custom__') {
      setCustomTitle(true)
      set('meetingTitle', '')
      return
    }
    setCustomTitle(false)
    const selected = attendanceMeetings.find(m => m.id === val)
    if (selected) {
      set('meetingTitle', selected.title)
      set('meetingDate', selected.date || '')
    }
  }

  const handleSave = async () => {
    if (!form.meetingTitle || !form.meetingDate) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  const isLinked = !!initial?.linkedMeetingId

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-display font-bold text-lg text-rotary-charcoal">
                  {initial?.id ? 'Edit MoM' : isLinked ? 'New MoM — Linked to Meeting' : 'New Minutes of Meeting'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isLinked ? 'Attendance data pre-filled from the meeting record' : 'Fill in the details from the meeting'}
                </p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Linked badge */}
            {isLinked && (
              <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-2 flex-shrink-0">
                <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="text-xs text-purple-700 font-medium">Linked to attendance record — attendees auto-filled from meeting</p>
              </div>
            )}

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Meeting Title — dropdown or readonly */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Meeting Title *
                  </label>

                  {isLinked ? (
                    // Linked from Attendance Tracker — readonly
                    <input
                      type="text"
                      value={form.meetingTitle}
                      readOnly
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl opacity-60 cursor-default"
                    />
                  ) : customTitle ? (
                    // Custom title input
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={form.meetingTitle}
                        onChange={e => set('meetingTitle', e.target.value)}
                        placeholder="e.g. Monthly Board Meeting — June 2025"
                        className="flex-1 px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                      />
                      <button
                        onClick={() => { setCustomTitle(false); set('meetingTitle', '') }}
                        className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
                      >
                        ← Back
                      </button>
                    </div>
                  ) : (
                    // Dropdown from attendance_meetings
                    <select
                      value={attendanceMeetings.find(m => m.title === form.meetingTitle)?.id || ''}
                      onChange={handleMeetingSelect}
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                    >
                      <option value="">Select a meeting…</option>
                      {attendanceMeetings.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.title} — {formatDate(m.date)}
                        </option>
                      ))}
                      <option value="__custom__">+ Enter custom title…</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Meeting Date *</label>
                  <input
                    type="date"
                    value={form.meetingDate}
                    onChange={e => set('meetingDate', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Meeting Number</label>
                  <input
                    type="text"
                    value={form.meetingNumber}
                    onChange={e => set('meetingNumber', e.target.value)}
                    placeholder="e.g. GBM #05"
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Meeting Type</label>
                  <select
                    value={form.meetingType}
                    onChange={e => set('meetingType', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                  >
                    {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => set('startTime', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => set('endTime', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Venue</label>
                  <input
                    type="text"
                    value={form.venue}
                    onChange={e => set('venue', e.target.value)}
                    placeholder="e.g. Google Meet / BTM Clubhouse"
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Total Members</label>
                  <div className="w-full px-3 py-2.5 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-600 font-semibold">
                    {members.length}
                    <span className="ml-1.5 text-[10px] text-gray-400 font-normal">from Our Team</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Chaired By</label>
                  <OwnerDropdown value={form.chairedBy} members={members} onChange={v => set('chairedBy', v)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Recorded By</label>
                  <OwnerDropdown value={form.recordedBy} members={members} onChange={v => set('recordedBy', v)} />
                </div>
              </div>

              <DynamicList label="Agenda Items" items={form.agendaItems} onChange={v => set('agendaItems', v)} placeholder="e.g. Review last month's projects" />

              <AttendeesSelector
                value={form.attendees}
                onChange={v => set('attendees', v)}
                members={members}
              />

              <DynamicList
                label="President's Update"
                items={form.presidentUpdate}
                onChange={v => set('presidentUpdate', v)}
                placeholder="e.g. Welcomed new members to the club"
                bulleted
              />

              <DynamicList
                label="Secretary's Update"
                items={form.secretaryUpdate}
                onChange={v => set('secretaryUpdate', v)}
                placeholder="e.g. Meeting minutes from last GBM approved"
                bulleted
              />

              <MultiFieldList
                label="Discussion & Decisions"
                items={form.discussionItems}
                onChange={v => set('discussionItems', v)}
                fields={['agendaItem', 'discussion', 'decision']}
                addRow={{ agendaItem: '', discussion: '', decision: '' }}
                placeholder={{ agendaItem: 'Agenda item', discussion: 'Discussion summary', decision: 'Decision taken' }}
              />

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Action Items</label>
                <div className="space-y-3">
                  {form.actionItems.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400">TASK {idx + 1}</span>
                        {form.actionItems.length > 1 && (
                          <button onClick={() => set('actionItems', form.actionItems.filter((_, i) => i !== idx))} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={item.task}
                        onChange={e => {
                          const next = [...form.actionItems]
                          next[idx] = { ...next[idx], task: e.target.value }
                          set('actionItems', next)
                        }}
                        placeholder="Describe the task"
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue transition-colors"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <OwnerDropdown
                          value={item.owner}
                          members={members}
                          onChange={val => {
                            const next = [...form.actionItems]
                            next[idx] = { ...next[idx], owner: val }
                            set('actionItems', next)
                          }}
                        />
                        <input
                          type="date"
                          value={item.deadline}
                          onChange={e => {
                            const next = [...form.actionItems]
                            next[idx] = { ...next[idx], deadline: e.target.value }
                            set('actionItems', next)
                          }}
                          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue transition-colors"
                        />
                        <select
                          value={item.priority || 'Medium'}
                          onChange={e => {
                            const next = [...form.actionItems]
                            next[idx] = { ...next[idx], priority: e.target.value }
                            set('actionItems', next)
                          }}
                          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue transition-colors"
                        >
                          {Object.keys(PRIORITY_COLORS).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => set('actionItems', [...form.actionItems, { task: '', owner: '', deadline: '', priority: 'Medium', status: 'Pending' }])}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rotary-blue hover:text-rotary-blue/70 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add action item
                </button>
              </div>

              <DirectorUpdatesList
                items={form.directorUpdates}
                onChange={v => set('directorUpdates', v)}
                members={members}
              />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Financial Updates</label>
                  {form.meetingDate && (
                    <button
                      type="button"
                      onClick={() => set('financials', getMonthFinancials(transactions, form.meetingDate))}
                      className="flex items-center gap-1.5 text-xs font-semibold text-rotary-blue hover:text-rotary-blue/70 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Fetch from Treasurer Report
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mb-2">
                  {form.meetingDate ? `Pulls ${new Date(form.meetingDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} totals from Treasurer Dashboard — you can still edit below.` : 'Set the meeting date to fetch totals from Treasurer Dashboard.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Income (₹)</label>
                    <input
                      type="number"
                      value={form.financials?.income || ''}
                      onChange={e => set('financials', { ...form.financials, income: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Expense (₹)</label>
                    <input
                      type="number"
                      value={form.financials?.expense || ''}
                      onChange={e => set('financials', { ...form.financials, expense: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Announcements</label>
                <textarea
                  value={form.announcements}
                  onChange={e => set('announcements', e.target.value)}
                  rows={3}
                  placeholder="Any general announcements…"
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Next Meeting</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={form.nextMeetingTitle}
                    onChange={e => set('nextMeetingTitle', e.target.value)}
                    placeholder="e.g. Board Meeting #03"
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                  />
                  <input
                    type="date"
                    value={form.nextMeetingDate}
                    onChange={e => set('nextMeetingDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                  />
                  <input
                    type="time"
                    value={form.nextMeetingTime}
                    onChange={e => set('nextMeetingTime', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                  />
                  <input
                    type="text"
                    value={form.nextMeetingVenue}
                    onChange={e => set('nextMeetingVenue', e.target.value)}
                    placeholder="Venue"
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <MultiFieldList
                label="Attachments"
                items={form.attachments}
                onChange={v => set('attachments', v)}
                fields={['name', 'url']}
                addRow={{ name: '', url: '' }}
                placeholder={{ name: 'File name', url: 'Link (Drive/URL)' }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Prepared By</label>
                  <MultiOwnerDropdown value={form.preparedBy} members={secretaries} onChange={v => set('preparedBy', v)} />
                  {secretaries.length === 0 && <p className="text-[10px] text-amber-500 mt-1">No member with role "Secretary" found in Our Team.</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reviewed By</label>
                  <OwnerDropdown value={form.reviewedBy} members={secretaries} onChange={v => set('reviewedBy', v)} />
                  {secretaries.length === 0 && <p className="text-[10px] text-amber-500 mt-1">No member with role "Secretary" found in Our Team.</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Approved By</label>
                  <div className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-rotary-charcoal">
                    {president ? (
                      <>
                        <span className="w-5 h-5 rounded-full bg-rotary-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {president.name[0].toUpperCase()}
                        </span>
                        <span className="truncate">{president.name}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">No President on record</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Auto-set to the club President — set in Our Team.</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={!form.meetingTitle || !form.meetingDate || saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-rotary-blue text-white hover:bg-rotary-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {saving ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {saving ? 'Saving…' : 'Save MoM'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

// ─── Plain-Text Summary (for pasting into an email / message manually) ───────

function buildMomSummary(mom, members = []) {
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const fmtTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 === 0 ? 12 : hour % 12
    return `${h12}:${m} ${ampm}`
  }
  const attendees = mom.attendees ? mom.attendees.split(',').map(s => s.trim()).filter(Boolean) : []
  const total = parseInt(mom.totalMembers, 10) || 0
  const pct = total > 0 ? ((attendees.length / total) * 100).toFixed(1) : null
  const agenda = (mom.agendaItems || []).filter(a => a.text)
  const presidentUpdates = getBulletPoints(mom.presidentUpdate)
  const secretaryUpdates = getBulletPoints(mom.secretaryUpdate)
  const discussions = (mom.discussionItems || []).filter(d => d.agendaItem || d.discussion || d.decision)
  const actions = (mom.actionItems || []).filter(a => a.task)
  const directorUpdates = (mom.directorUpdates || []).filter(d => d.avenue || d.update)
  const income = parseFloat(mom.financials?.income) || 0
  const expense = parseFloat(mom.financials?.expense) || 0
  const hasFinancials = mom.financials?.income || mom.financials?.expense

  const lines = []
  lines.push(`MINUTES OF MEETING — ${mom.meetingTitle || 'Untitled Meeting'}`)
  lines.push(`Rotaract Club of Bengaluru BTM · RID 3191`)
  lines.push('')
  lines.push(`${mom.meetingType || ''} · ${fmtDate(mom.meetingDate)}${mom.startTime ? ` · ${fmtTime(mom.startTime)}${mom.endTime ? ' – ' + fmtTime(mom.endTime) : ''}` : ''}`)
  if (mom.venue) lines.push(`Venue: ${mom.venue}`)
  if (mom.chairedBy || mom.recordedBy) lines.push(`Chaired By: ${mom.chairedBy || '—'}   Recorded By: ${mom.recordedBy || '—'}`)
  lines.push(`Attendance: ${total > 0 ? `${attendees.length} / ${total} (${pct}%)` : attendees.length}`)

  if (attendees.length > 0) {
    lines.push('', `ATTENDEES (${attendees.length})`, attendees.join(', '))
  }

  if (agenda.length > 0) {
    lines.push('', 'AGENDA')
    agenda.forEach((a, i) => lines.push(`${i + 1}. ${a.text}`))
  }

  if (presidentUpdates.length > 0) lines.push('', "PRESIDENT'S UPDATE", ...presidentUpdates.map(p => `- ${p}`))
  if (secretaryUpdates.length > 0) lines.push('', "SECRETARY'S UPDATE", ...secretaryUpdates.map(p => `- ${p}`))

  if (discussions.length > 0) {
    lines.push('', 'DISCUSSION & DECISIONS')
    discussions.forEach(d => lines.push(`- ${d.agendaItem || 'General'}: ${d.discussion || '—'} → Decision: ${d.decision || 'TBD'}`))
  }

  if (actions.length > 0) {
    lines.push('', 'ACTION ITEMS')
    actions.forEach(a => lines.push(`- [${a.status === 'Done' ? 'x' : ' '}] ${a.task} — Owner: ${a.owner || 'Unassigned'}, Due: ${a.deadline ? fmtDate(a.deadline) : 'TBD'}, Priority: ${a.priority || 'Medium'}, Status: ${a.status || 'Pending'}`))
  }

  if (directorUpdates.length > 0) {
    lines.push('', 'DIRECTOR UPDATES')
    directorUpdates.forEach(d => {
      const director = getAvenueDirector(members, d.avenue)
      lines.push(`- ${d.avenue || 'Update'}${director ? ` (${director})` : ''}: ${d.update || '—'}`)
    })
  }

  if (hasFinancials) {
    lines.push('', 'FINANCIAL UPDATES', `Income: ₹${income.toLocaleString('en-IN')}   Expense: ₹${expense.toLocaleString('en-IN')}   Balance: ₹${(income - expense).toLocaleString('en-IN')}`)
  }

  if (mom.announcements) {
    lines.push('', 'ANNOUNCEMENTS', mom.announcements)
  }

  if (mom.nextMeetingTitle || mom.nextMeetingDate) {
    lines.push('', 'NEXT MEETING', `${mom.nextMeetingTitle || ''}${mom.nextMeetingDate ? ` — ${fmtDate(mom.nextMeetingDate)}` : ''}${mom.nextMeetingTime ? ` ${fmtTime(mom.nextMeetingTime)}` : ''}${mom.nextMeetingVenue ? ` at ${mom.nextMeetingVenue}` : ''}`)
  }

  lines.push('', 'APPROVAL')
  lines.push(`Prepared By: ${mom.preparedBy || '—'}`)
  lines.push(`Reviewed By: ${mom.reviewedBy || '—'}`)
  lines.push(`Approved By: ${mom.approvedBy || '—'}`)

  return lines.join('\n')
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function exportMomToPdf(mom, members = []) {
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const fmtTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 === 0 ? 12 : hour % 12
    return `${h12}:${m} ${ampm}`
  }
  const attendees = mom.attendees ? mom.attendees.split(',').map(s => s.trim()).filter(Boolean) : []
  const total = parseInt(mom.totalMembers, 10) || 0
  const pct = total > 0 ? ((attendees.length / total) * 100).toFixed(1) : null
  const agenda = (mom.agendaItems || []).filter(a => a.text)
  const presidentUpdates = getBulletPoints(mom.presidentUpdate)
  const secretaryUpdates = getBulletPoints(mom.secretaryUpdate)
  const discussions = (mom.discussionItems || []).filter(d => d.agendaItem || d.discussion || d.decision)
  const actions = (mom.actionItems || []).filter(a => a.task)
  const directorUpdates = (mom.directorUpdates || []).filter(d => d.avenue || d.update)
  const attachments = (mom.attachments || []).filter(a => a.name || a.url)
  const income = parseFloat(mom.financials?.income) || 0
  const expense = parseFloat(mom.financials?.expense) || 0
  const hasFinancials = mom.financials?.income || mom.financials?.expense

  const statusTagClass = { 'Pending': 'pending', 'In Progress': 'progress', 'Done': 'done' }

  const infoRows = [
    ['Meeting Type', mom.meetingType || '—', 'Venue', mom.venue || '—'],
    ['Chaired By', mom.chairedBy || '—', 'Recorded By', mom.recordedBy || '—'],
    ['Meeting Number', mom.meetingNumber || '—', 'Time', mom.startTime ? `${fmtTime(mom.startTime)}${mom.endTime ? ' – ' + fmtTime(mom.endTime) : ''}` : '—'],
    ['Attendance', total > 0 ? `${attendees.length} / ${total} (${pct}%)` : `${attendees.length}`, '', ''],
  ]

  const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const rotaryYearStart = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1
  const themeUrl = `${window.location.origin}/theme-create-lasting-impact.png`

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>MoM - ${esc(mom.meetingTitle)}</title>
<style>
  @page{size:A4;margin:18mm 12mm}
  *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{background:#e9e9ec}
  body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;font-size:12.5px;line-height:1.55;padding:18px}
  .sheet{max-width:800px;margin:0 auto;background:#fff}

  .letterhead{border-bottom:3px solid #d4006d;padding:26px 40px 18px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
  .letterhead-left{display:flex;align-items:center;gap:16px}
  .logo-chip{width:54px;height:54px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .logo-chip img{width:100%;height:100%;object-fit:contain}
  .org-name{font-size:18px;font-weight:700;letter-spacing:.2px;font-family:'Times New Roman',Georgia,serif}
  .org-sub{font-size:11px;color:#555;margin-top:2px;font-family:Arial,sans-serif}
  .org-year{font-size:10px;color:#d4006d;font-weight:700;margin-top:4px;font-family:Arial,sans-serif;letter-spacing:.3px}
  .doc-meta{text-align:right;font-size:10px;color:#666;font-family:Arial,sans-serif;line-height:1.7}
  .doc-meta b{color:#1a1a1a}

  .body-pad{padding:30px 40px 34px}

  .doc-title{text-align:center;margin-bottom:4px}
  .doc-title .eyebrow{font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#d4006d}
  .doc-title h1{font-size:20px;font-weight:700;margin-top:4px}

  .meta-line{text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#555;margin:8px 0 26px;padding-bottom:14px;border-bottom:1px solid #f3d3e3}
  .meta-line span:not(:last-child)::after{content:'  •  ';color:#e8a9c6}

  .section{margin-bottom:22px;break-inside:avoid}
  .section-title{font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#d4006d;padding-bottom:6px;border-bottom:1.5px solid #d4006d;margin-bottom:12px}

  table.info{width:100%;border-collapse:collapse;font-family:Arial,sans-serif}
  table.info td{padding:6px 0;vertical-align:top;font-size:12px}
  table.info td.k{width:22%;color:#666;font-size:10px;text-transform:uppercase;letter-spacing:.4px;padding-right:10px}
  table.info td.v{font-weight:600;color:#1a1a1a;width:28%}

  .attendee-box{border:1px solid #f3d3e3;padding:12px 16px}
  .attendee-grid{columns:3;column-gap:24px;font-family:Arial,sans-serif;font-size:11.5px;color:#333}
  .attendee-grid div{break-inside:avoid;padding:2px 0}
  .attendee-grid .n{color:#999;font-size:10px;margin-right:6px}

  ol.agenda{font-family:Arial,sans-serif;padding-left:22px}
  ol.agenda li{margin-bottom:6px;font-size:12px}

  table.grid{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:11.5px}
  table.grid th{text-align:left;background:#d4006d;color:#fff;font-weight:700;text-transform:uppercase;font-size:9.5px;letter-spacing:.5px;padding:8px 10px;border:1px solid #d4006d}
  table.grid td{padding:8px 10px;border:1px solid #f3d3e3;vertical-align:top}
  table.grid tbody tr:nth-child(even){background:#fdf5f9}

  .status-tag{font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;padding:2px 7px;border:1px solid #999;color:#444}
  .status-tag.done{border-color:#2f6f3e;color:#2f6f3e}
  .status-tag.progress{border-color:#1f4e8c;color:#1f4e8c}
  .status-tag.pending{border-color:#8a6d1a;color:#8a6d1a}

  .fin-table{width:60%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}
  .fin-table td{padding:7px 12px;border:1px solid #f3d3e3}
  .fin-table td.label{color:#555}
  .fin-table td.amt{text-align:right;font-weight:700;font-family:Georgia,serif}
  .fin-table tr.total td{border-top:2px solid #d4006d;font-weight:700}

  .announce-text{font-family:Arial,sans-serif;font-size:12px;color:#333;line-height:1.7}

  .attach-list{font-family:Arial,sans-serif;font-size:12px;color:#333}
  .attach-list div{padding:3px 0}

  table.approval{width:100%;border-collapse:collapse;font-family:Arial,sans-serif}
  table.approval td{padding:8px 0;vertical-align:top;font-size:12px;border-bottom:1px solid #f6e0ea}
  table.approval tr:last-child td{border-bottom:none}
  table.approval td.k{width:30%;color:#666;font-size:10px;text-transform:uppercase;letter-spacing:.4px}
  table.approval td.v{font-weight:700;color:#1a1a1a;font-family:Georgia,serif}

  .ftr{margin-top:34px;padding-top:12px;border-top:1px solid #f3d3e3;display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:9px;color:#888}
</style></head><body>
<div class="sheet">

<div class="letterhead">
  <div class="letterhead-left">
    <div class="logo-chip"><img src="${themeUrl}" onerror="this.parentElement.style.display='none'" /></div>
    <div>
      <div class="org-name">Rotaract Club of Bengaluru BTM</div>
      <div class="org-sub">Rotary International District 3191 · RI Club ID 8826232</div>
      <div class="org-year">ROTARY YEAR ${rotaryYearStart}–${rotaryYearStart + 1}</div>
    </div>
  </div>
  <div class="doc-meta">
    <div>Document generated</div>
    <div><b>${now}</b></div>
  </div>
</div>

<div class="body-pad">

<div class="doc-title">
  <div class="eyebrow">Minutes of Meeting</div>
  <h1>${esc(mom.meetingTitle)}</h1>
</div>
<div class="meta-line">
  <span>${fmtDate(mom.meetingDate)}</span>
  ${mom.startTime ? `<span>${fmtTime(mom.startTime)}${mom.endTime ? ' – ' + fmtTime(mom.endTime) : ''}</span>` : ''}
  <span>${actions.length} Action Item${actions.length !== 1 ? 's' : ''} Recorded</span>
</div>

<div class="section">
  <div class="section-title">Meeting Information</div>
  <table class="info">${infoRows.map(([k1, v1, k2, v2]) => `<tr><td class="k">${esc(k1)}</td><td class="v">${esc(v1)}</td><td class="k">${esc(k2)}</td><td class="v">${esc(v2)}</td></tr>`).join('')}</table>
</div>

<div class="section"><div class="section-title">Attendees (${attendees.length}${total > 0 ? ` / ${total} — ${pct}%` : ''})</div><div class="attendee-box">${attendees.length > 0 ? `<div class="attendee-grid">${attendees.map((a, i) => `<div><span class="n">${String(i + 1).padStart(2, '0')}</span>${esc(a)}</div>`).join('')}</div>` : `<p style="font-family:Arial,sans-serif;font-size:11.5px;color:#999">No attendees recorded for this meeting.</p>`}</div></div>

${agenda.length > 0 ? `<div class="section"><div class="section-title">Agenda</div><ol class="agenda">${agenda.map(a => `<li>${esc(a.text)}</li>`).join('')}</ol></div>` : ''}
${presidentUpdates.length > 0 ? `<div class="section"><div class="section-title">President's Update</div><ol class="agenda" style="list-style:disc">${presidentUpdates.map(p => `<li>${esc(p)}</li>`).join('')}</ol></div>` : ''}
${secretaryUpdates.length > 0 ? `<div class="section"><div class="section-title">Secretary's Update</div><ol class="agenda" style="list-style:disc">${secretaryUpdates.map(p => `<li>${esc(p)}</li>`).join('')}</ol></div>` : ''}

${discussions.length > 0 ? `<div class="section"><div class="section-title">Discussion &amp; Decisions</div><table class="grid"><thead><tr><th style="width:20%">Agenda Item</th><th style="width:42%">Discussion Summary</th><th>Decision Taken</th></tr></thead><tbody>${discussions.map(d => `<tr><td>${esc(d.agendaItem || '—')}</td><td>${esc(d.discussion || '—')}</td><td>${esc(d.decision || '—')}</td></tr>`).join('')}</tbody></table></div>` : ''}

${actions.length > 0 ? `<div class="section"><div class="section-title">Action Items</div><table class="grid"><thead><tr><th>Task</th><th>Owner</th><th>Deadline</th><th>Priority</th><th>Status</th></tr></thead><tbody>${actions.map(a => `<tr><td>${esc(a.task)}</td><td>${esc(a.owner || '—')}</td><td>${a.deadline ? fmtDate(a.deadline) : '—'}</td><td>${esc(a.priority || 'Medium')}</td><td><span class="status-tag ${statusTagClass[a.status || 'Pending']}">${esc(a.status || 'Pending')}</span></td></tr>`).join('')}</tbody></table></div>` : ''}

${directorUpdates.length > 0 ? `<div class="section"><div class="section-title">Director Updates</div><table class="grid"><thead><tr><th style="width:28%">Avenue</th><th style="width:28%">Director</th><th>Update</th></tr></thead><tbody>${directorUpdates.map(d => `<tr><td>${esc(d.avenue || '—')}</td><td>${esc(getAvenueDirector(members, d.avenue) || '—')}</td><td>${esc(d.update || '—')}</td></tr>`).join('')}</tbody></table></div>` : ''}

${hasFinancials ? `<div class="section"><div class="section-title">Financial Updates</div><table class="fin-table">
  <tr><td class="label">Income</td><td class="amt">₹${income.toLocaleString('en-IN')}</td></tr>
  <tr><td class="label">Expense</td><td class="amt">₹${expense.toLocaleString('en-IN')}</td></tr>
  <tr class="total"><td class="label">Balance</td><td class="amt">₹${(income - expense).toLocaleString('en-IN')}</td></tr>
</table></div>` : ''}

${mom.announcements ? `<div class="section"><div class="section-title">Announcements</div><p class="announce-text">${esc(mom.announcements)}</p></div>` : ''}

${(mom.nextMeetingTitle || mom.nextMeetingDate) ? `<div class="section"><div class="section-title">Next Meeting</div>
  <table class="info"><tr>
    <td class="k">Meeting</td><td class="v">${esc(mom.nextMeetingTitle || '—')}</td>
    <td class="k">Date</td><td class="v">${mom.nextMeetingDate ? fmtDate(mom.nextMeetingDate) : '—'}</td>
  </tr><tr>
    <td class="k">Time</td><td class="v">${mom.nextMeetingTime ? fmtTime(mom.nextMeetingTime) : '—'}</td>
    <td class="k">Venue</td><td class="v">${esc(mom.nextMeetingVenue || '—')}</td>
  </tr></table>
</div>` : ''}

${attachments.length > 0 ? `<div class="section"><div class="section-title">Attachments</div><div class="attach-list">${attachments.map(a => `<div>${esc(a.name || a.url)}</div>`).join('')}</div></div>` : ''}

<div class="section">
  <div class="section-title">Approval</div>
  <table class="approval">
    <tr><td class="k">Prepared By</td><td class="v">${esc(mom.preparedBy) || '—'}</td></tr>
    <tr><td class="k">Reviewed By</td><td class="v">${esc(mom.reviewedBy) || '—'}</td></tr>
    <tr><td class="k">Approved By (President)</td><td class="v">${esc(mom.approvedBy) || '—'}</td></tr>
  </table>
</div>

<div class="ftr"><span>Rotaract Club of Bengaluru BTM · RID 3190</span><span>Confidential — For Club Use Only</span></div>
</div>
</div>
</body></html>`

  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => { printWindow.print() }
}

// ─── MoM Detail Drawer ────────────────────────────────────────────────────────

function MomDrawer({ mom, onClose, onEdit, onDelete, onStatusChange, members = [] }) {
  const [copied, setCopied] = useState(false)
  if (!mom) return null

  const handleCopySummary = async () => {
    await navigator.clipboard.writeText(buildMomSummary(mom, members))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const attendeeList = mom.attendees ? mom.attendees.split(',').map(s => s.trim()).filter(Boolean) : []
  const total = parseInt(mom.totalMembers, 10) || 0
  const pct = total > 0 ? ((attendeeList.length / total) * 100).toFixed(1) : null
  const discussionList = (mom.discussionItems || []).filter(d => d.agendaItem || d.discussion || d.decision)
  const directorUpdateList = (mom.directorUpdates || []).filter(d => d.avenue || d.update)
  const presidentUpdateList = getBulletPoints(mom.presidentUpdate)
  const secretaryUpdateList = getBulletPoints(mom.secretaryUpdate)
  const attachmentList = (mom.attachments || []).filter(a => a.name || a.url)
  const income = parseFloat(mom.financials?.income) || 0
  const expense = parseFloat(mom.financials?.expense) || 0
  const hasFinancials = mom.financials?.income || mom.financials?.expense
  const fmtTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 === 0 ? 12 : hour % 12
    return `${h12}:${m} ${ampm}`
  }

  const infoRows = [
    ['Meeting Number', mom.meetingNumber],
    ['Meeting Type', mom.meetingType],
    ['Date', formatDate(mom.meetingDate)],
    ['Time', mom.startTime ? `${fmtTime(mom.startTime)}${mom.endTime ? ' – ' + fmtTime(mom.endTime) : ''}` : null],
    ['Venue', mom.venue],
    ['Chaired By', mom.chairedBy],
    ['Recorded By', mom.recordedBy],
  ].filter(([, v]) => v)

  return (
    <AnimatePresence>
      {mom && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-rotary-blue uppercase tracking-wider mb-1">{formatDate(mom.meetingDate)}</p>
                  <h2 className="font-display font-bold text-xl text-rotary-charcoal leading-tight">{mom.meetingTitle}</h2>
                  {mom.linkedMeetingId && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full mt-1.5">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Linked to Attendance Record
                    </span>
                  )}
                  {mom.nextMeetingDate && (
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Next meeting: {formatDate(mom.nextMeetingDate)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={handleCopySummary} className="p-2 rounded-xl bg-gray-100 hover:bg-rotary-blue/10 hover:text-rotary-blue transition-colors" title="Copy summary (for email/message)">
                    {copied ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <button onClick={() => exportMomToPdf(mom, members)} className="p-2 rounded-xl bg-gray-100 hover:bg-rotary-blue/10 hover:text-rotary-blue transition-colors" title="Export PDF">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button onClick={onEdit} className="p-2 rounded-xl bg-gray-100 hover:bg-rotary-blue/10 hover:text-rotary-blue transition-colors" title="Edit">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={onDelete} className="p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">

              {infoRows.length > 0 && (
                <AccordionSection title="Meeting Information">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {infoRows.map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{k}</dt>
                        <dd className="text-sm text-gray-700 mt-0.5">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </AccordionSection>
              )}

              {attendeeList.length > 0 && (
                <AccordionSection title={`Attendance · ${attendeeList.length}${total > 0 ? ` / ${total} (${pct}%)` : ''}`}>
                  <div className="flex flex-wrap gap-2">
                    {attendeeList.map((a, i) => (
                      <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-rotary-blue text-white text-xs font-bold flex items-center justify-center">{a[0].toUpperCase()}</span>
                        {a}
                      </span>
                    ))}
                  </div>
                </AccordionSection>
              )}

              {mom.agendaItems?.some(a => a.text) && (
                <AccordionSection title="Agenda">
                  <ol className="space-y-1.5">
                    {mom.agendaItems.filter(a => a.text).map((a, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-rotary-blue/10 text-rotary-blue text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {a.text}
                      </li>
                    ))}
                  </ol>
                </AccordionSection>
              )}

              {presidentUpdateList.length > 0 && (
                <AccordionSection title="President's Update">
                  <ul className="space-y-1.5">
                    {presidentUpdateList.map((p, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-rotary-blue text-lg leading-none">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </AccordionSection>
              )}

              {secretaryUpdateList.length > 0 && (
                <AccordionSection title="Secretary's Update">
                  <ul className="space-y-1.5">
                    {secretaryUpdateList.map((p, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-rotary-blue text-lg leading-none">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </AccordionSection>
              )}

              {discussionList.length > 0 && (
                <AccordionSection title="Discussion & Decisions">
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-left">
                          <th className="px-1 pb-2">Agenda Item</th>
                          <th className="px-1 pb-2">Discussion Summary</th>
                          <th className="px-1 pb-2">Decision Taken</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {discussionList.map((d, i) => (
                          <tr key={i} className="align-top">
                            <td className="px-1 py-2 font-medium text-gray-800">{d.agendaItem || '—'}</td>
                            <td className="px-1 py-2 text-gray-600">{d.discussion || '—'}</td>
                            <td className="px-1 py-2 text-gray-600">{d.decision || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionSection>
              )}

              {mom.actionItems?.some(a => a.task) && (
                <AccordionSection title="Action Items">
                  <div className="space-y-2">
                    {mom.actionItems.filter(a => a.task).map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-gray-800 flex-1">{item.task}</p>
                          <StatusBadge status={item.status || 'Pending'} onChange={(s) => onStatusChange(i, s)} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                          {item.owner && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              {item.owner}
                            </span>
                          )}
                          {item.deadline && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              Due {formatDate(item.deadline)}
                            </span>
                          )}
                          {item.priority && (
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.Medium}`}>
                              {item.priority}
                            </span>
                          )}
                        </div>
                        <StatusHistoryLog history={getStatusHistory(item)} />
                      </div>
                    ))}
                  </div>
                </AccordionSection>
              )}

              {directorUpdateList.length > 0 && (
                <AccordionSection title="Director Reports">
                  <div className="space-y-2">
                    {directorUpdateList.map((d, i) => {
                      const director = getAvenueDirector(members, d.avenue)
                      return (
                        <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-xs font-semibold text-rotary-blue">{d.avenue || 'Update'}</p>
                            {d.avenue && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${director ? 'bg-rotary-blue/10 text-rotary-blue' : 'bg-amber-50 text-amber-600'}`}>
                                {director || 'No director on record'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{d.update}</p>
                        </div>
                      )
                    })}
                  </div>
                </AccordionSection>
              )}

              {hasFinancials && (
                <AccordionSection title="Financial Updates">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                      <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-1">Income</p>
                      <p className="text-lg font-display font-bold text-green-700">₹{income.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                      <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1">Expense</p>
                      <p className="text-lg font-display font-bold text-red-700">₹{expense.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-gray-100 rounded-xl p-3 border border-gray-200">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Balance</p>
                      <p className="text-lg font-display font-bold text-gray-800">₹{(income - expense).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </AccordionSection>
              )}

              {mom.announcements && (
                <AccordionSection title="Announcements">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{mom.announcements}</p>
                </AccordionSection>
              )}

              {(mom.nextMeetingTitle || mom.nextMeetingDate || mom.nextMeetingVenue) && (
                <AccordionSection title="Next Meeting">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {mom.nextMeetingTitle && (
                      <div><dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Meeting</dt><dd className="text-sm text-gray-700 mt-0.5">{mom.nextMeetingTitle}</dd></div>
                    )}
                    {mom.nextMeetingDate && (
                      <div><dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date</dt><dd className="text-sm text-gray-700 mt-0.5">{formatDate(mom.nextMeetingDate)}</dd></div>
                    )}
                    {mom.nextMeetingTime && (
                      <div><dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Time</dt><dd className="text-sm text-gray-700 mt-0.5">{fmtTime(mom.nextMeetingTime)}</dd></div>
                    )}
                    {mom.nextMeetingVenue && (
                      <div><dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Venue</dt><dd className="text-sm text-gray-700 mt-0.5">{mom.nextMeetingVenue}</dd></div>
                    )}
                  </dl>
                </AccordionSection>
              )}

              {attachmentList.length > 0 && (
                <AccordionSection title="Attachments" defaultOpen={false}>
                  <div className="space-y-1.5">
                    {attachmentList.map((a, i) => (
                      a.url ? (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-rotary-blue hover:underline">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          {a.name || a.url}
                        </a>
                      ) : (
                        <p key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          {a.name}
                        </p>
                      )
                    ))}
                  </div>
                </AccordionSection>
              )}

              {(mom.preparedBy || mom.reviewedBy || mom.approvedBy) && (
                <AccordionSection title="Approvals" defaultOpen={false}>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[['Prepared By', mom.preparedBy], ['Reviewed By', mom.reviewedBy], ['Approved By', mom.approvedBy]].map(([label, val]) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-sm font-medium text-gray-700">{val || '—'}</p>
                      </div>
                    ))}
                  </div>
                </AccordionSection>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Action Items Table (all tasks across every MoM, tracked in one place) ────

function ActionItemsTable({ moms, onOpenMom, onStatusChange, readOnly }) {
  const [statusFilter, setStatusFilter] = useState('All')

  const rows = moms
    .flatMap(mom => (mom.actionItems || [])
      .map((item, idx) => ({ mom, idx, item }))
      .filter(r => r.item.task))
    .filter(r => statusFilter === 'All' || (r.item.status || 'Pending') === statusFilter)
    .sort((a, b) => {
      if (!a.item.deadline) return 1
      if (!b.item.deadline) return -1
      return new Date(a.item.deadline) - new Date(b.item.deadline)
    })

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {['All', 'Pending', 'In Progress', 'Done'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${statusFilter === s ? 'bg-rotary-blue text-white border-rotary-blue' : 'bg-white text-gray-500 border-gray-200 hover:border-rotary-blue/40'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-gray-100">
          <p className="font-semibold text-gray-400">No action items {statusFilter !== 'All' ? `with status "${statusFilter}"` : 'yet'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-left border-b border-gray-100">
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Meeting</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(({ mom, idx, item }) => (
                  <tr key={`${mom.id}-${idx}`} className="align-top hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-xs">{item.task}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => onOpenMom(mom)} className="text-rotary-blue font-semibold hover:underline text-left">
                        {mom.meetingTitle}
                      </button>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(mom.meetingDate)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.owner || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.deadline ? formatDate(item.deadline) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.Medium}`}>
                        {item.priority || 'Medium'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 max-w-[220px] ${readOnly ? 'pointer-events-none opacity-60' : ''}`}>
                      <StatusBadge status={item.status || 'Pending'} onChange={(s) => onStatusChange(mom, idx, s)} />
                      <StatusHistoryLog history={getStatusHistory(item)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MomTracker({ isAdmin, permissions, onBack, linkedMeeting, readOnly = false }) {
  const [moms, setMoms] = useState([])
  const [members, setMembers] = useState([])
  const [attendanceMeetings, setAttendanceMeetings] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMom, setEditingMom] = useState(null)
  const [selectedMom, setSelectedMom] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [activeTab, setActiveTab] = useState('moms')

  // Guard: redirect non-admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="font-display font-bold text-xl text-rotary-charcoal mb-1">Access Restricted</h2>
        <p className="text-sm text-gray-400">You need to be logged in as admin to view this page.</p>
        <button onClick={onBack} className="mt-6 btn-primary !py-2 !px-6 text-sm !rounded-xl">Go Back</button>
      </div>
    )
  }

  // Firestore — MoMs
  useEffect(() => {
    let unsub
    let cancelled = false
    loadFirestore().then(({ mod, db }) => {
      if (cancelled) return
      const q = mod.query(mod.collection(db, 'moms'), mod.orderBy('meetingDate', 'desc'))
      unsub = mod.onSnapshot(q, (snap) => {
        setMoms(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => !m.deletedAt))
        setLoading(false)
      })
    })
    return () => { cancelled = true; if (unsub) unsub() }
  }, [])

  // Firestore — Members
  useEffect(() => {
    let unsub
    let cancelled = false
    loadFirestore().then(({ mod, db }) => {
      if (cancelled) return
      unsub = mod.onSnapshot(mod.collection(db, 'leaders'), (snap) => {
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(m => m.name)
          .sort((a, b) => a.name.localeCompare(b.name))
        setMembers(sorted)
      })
    })
    return () => { cancelled = true; if (unsub) unsub() }
  }, [])

  // Firestore — Attendance Meetings (for dropdown)
  useEffect(() => {
    let unsub
    let cancelled = false
    loadFirestore().then(({ mod, db }) => {
      if (cancelled) return
      const q = mod.query(mod.collection(db, 'attendance_meetings'), mod.orderBy('date', 'desc'))
      unsub = mod.onSnapshot(q, (snap) => {
        setAttendanceMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      })
    })
    return () => { cancelled = true; if (unsub) unsub() }
  }, [])

  // Firestore — Treasurer Transactions (for auto-fetching Financial Updates)
  useEffect(() => {
    let unsub
    let cancelled = false
    loadFirestore().then(({ mod, db }) => {
      if (cancelled) return
      unsub = mod.onSnapshot(mod.collection(db, 'treasurer_transactions'), (snap) => {
        setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      })
    })
    return () => { cancelled = true; if (unsub) unsub() }
  }, [])

  // Auto-open modal when navigated from AttendanceTracker
  useEffect(() => {
    if (!linkedMeeting || !members.length || loading) return
    const attendeeNames = (linkedMeeting.presentIds || [])
      .map(id => members.find(m => m.id === id)?.name)
      .filter(Boolean)
      .join(', ')
    const existing = moms.find(m => m.linkedMeetingId === linkedMeeting.id)
    if (existing) {
      setEditingMom(existing)
    } else {
      setEditingMom({
        ...EMPTY_MOM,
        meetingTitle: linkedMeeting.title,
        meetingDate: linkedMeeting.date,
        attendees: attendeeNames,
        linkedMeetingId: linkedMeeting.id,
      })
    }
    setModalOpen(true)
  }, [linkedMeeting, members.length, loading])

  const handleSave = async (form) => {
    const { mod, db } = await loadFirestore()
    const admin = await getCurrentAdminEmail()
    if (editingMom?.id) {
      const updates = { ...form, updatedAt: mod.serverTimestamp() }
      if (editingMom.linkedMeetingId) updates.linkedMeetingId = editingMom.linkedMeetingId
      await mod.updateDoc(mod.doc(db, 'moms', editingMom.id), updates)
      backupToSheet('moms', editingMom.id, 'save', { ...editingMom, ...form }, admin)
      if (selectedMom?.id === editingMom.id) setSelectedMom({ ...editingMom, ...form })
    } else {
      const data = { ...form, createdAt: mod.serverTimestamp() }
      if (editingMom?.linkedMeetingId) data.linkedMeetingId = editingMom.linkedMeetingId
      const docRef = await mod.addDoc(mod.collection(db, 'moms'), data)
      backupToSheet('moms', docRef.id, 'save', form, admin)
    }
    setEditingMom(null)
  }

  const handleDelete = async (mom) => {
    await softDelete('moms', mom.id, mom)
    if (selectedMom?.id === mom.id) setSelectedMom(null)
    setDeleteConfirm(null)
  }

  const stampStatusChange = (item, newStatus) => {
    const entry = {
      from: item.status || 'Pending',
      to: newStatus,
      by: permissions?.name || permissions?.email || 'Admin',
      at: Date.now(),
    }
    return {
      ...item,
      status: newStatus,
      statusHistory: [entry, ...getStatusHistory(item)],
    }
  }

  const handleStatusChange = async (actionIdx, newStatus) => {
    if (!selectedMom) return
    const updatedActions = selectedMom.actionItems.map((a, i) =>
      i === actionIdx ? stampStatusChange(a, newStatus) : a
    )
    const updated = { ...selectedMom, actionItems: updatedActions }
    setSelectedMom(updated)
    const { mod, db } = await loadFirestore()
    await mod.updateDoc(mod.doc(db, 'moms', selectedMom.id), { actionItems: updatedActions })
    backupToSheet('moms', selectedMom.id, 'save', updated, await getCurrentAdminEmail())
  }

  const handleActionItemStatusChange = async (mom, actionIdx, newStatus) => {
    const updatedActions = mom.actionItems.map((a, i) =>
      i === actionIdx ? stampStatusChange(a, newStatus) : a
    )
    if (selectedMom?.id === mom.id) setSelectedMom({ ...selectedMom, actionItems: updatedActions })
    const { mod, db } = await loadFirestore()
    await mod.updateDoc(mod.doc(db, 'moms', mom.id), { actionItems: updatedActions })
    backupToSheet('moms', mom.id, 'save', { ...mom, actionItems: updatedActions }, await getCurrentAdminEmail())
  }

  const filtered = moms.filter(m =>
    m.meetingTitle?.toLowerCase().includes(search.toLowerCase()) ||
    m.attendees?.toLowerCase().includes(search.toLowerCase())
  )

  const totalActions = moms.flatMap(m => m.actionItems || []).filter(a => a.task)
  const pendingCount = totalActions.filter(a => !a.status || a.status === 'Pending').length
  const doneCount = totalActions.filter(a => a.status === 'Done').length

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">

        {/* Page header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-3">
            <button onClick={onBack} className="mt-6 p-2.5 rounded-xl border border-gray-200 hover:bg-white transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4006d] animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4006d]">
                  Secretary's Dashboard
                </p>
              </div>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal dark:text-white">
                Minutes of Meeting
              </h2>
              <p className="text-sm text-gray-400 dark:text-white/40 mt-1.5">
                Rotaract Club · Bengaluru BTM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search meetings…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue transition-colors w-52 shadow-sm"
              />
            </div>
            <button
              onClick={() => { setEditingMom(null); setModalOpen(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-rotary-blue text-white hover:bg-rotary-blue/90 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New MoM
            </button>
          </div>
        </motion.div>

        {readOnly && (
          <div className="sticky top-20 z-10 mb-6 px-4 py-3 rounded-xl bg-rotary-gold/10 border border-rotary-gold/30 text-sm font-medium text-rotary-gold">
            View only — you don't have edit access to MoM Tracker.
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 border-b border-gray-200">
          {[
            { key: 'moms', label: 'Minutes of Meeting' },
            { key: 'actions', label: 'Action Items' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${activeTab === t.key ? 'border-rotary-blue text-rotary-blue' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {t.label}
              {t.key === 'actions' && pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className={readOnly ? 'pointer-events-none select-none opacity-75' : ''}>

        {activeTab === 'actions' ? (
          <ActionItemsTable
            moms={moms}
            onOpenMom={(mom) => { setActiveTab('moms'); setSelectedMom(mom) }}
            onStatusChange={handleActionItemStatusChange}
            readOnly={readOnly}
          />
        ) : (
        <>
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Meetings', value: moms.length, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-rotary-blue bg-rotary-blue/10' },
            { label: 'Pending Actions', value: pendingCount, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-amber-600 bg-amber-50' },
            { label: 'Completed Actions', value: doneCount, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-green-600 bg-green-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-rotary-charcoal leading-none">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* MoM list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <svg className="w-8 h-8 text-rotary-blue animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-400">{search ? 'No meetings match your search' : 'No MoMs yet'}</p>
            {!search && (
              <button onClick={() => { setEditingMom(null); setModalOpen(true) }} className="mt-4 text-sm font-semibold text-rotary-blue hover:underline">
                Create your first MoM →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((mom, i) => {
              const actions = (mom.actionItems || []).filter(a => a.task)
              const done = actions.filter(a => a.status === 'Done').length
              const attendeeList = mom.attendees ? mom.attendees.split(',').map(s => s.trim()).filter(Boolean) : []
              return (
                <motion.div
                  key={mom.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedMom(mom)}
                  className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:border-rotary-blue/30 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-rotary-blue mb-1">
                        {formatDate(mom.meetingDate)}{mom.meetingNumber ? ` · ${mom.meetingNumber}` : ''}
                      </p>
                      <h3 className="font-display font-bold text-rotary-charcoal text-base leading-tight truncate group-hover:text-rotary-blue transition-colors">
                        {mom.meetingTitle}
                      </h3>
                      {mom.venue && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{mom.venue}</p>
                      )}
                      {mom.linkedMeetingId && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full mt-1">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Linked to Meeting
                        </span>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-rotary-blue flex-shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {attendeeList.length > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      {attendeeList.slice(0, 5).map((a, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-rotary-blue text-white text-xs font-bold flex items-center justify-center border-2 border-white -ml-1 first:ml-0" title={a}>
                          {a[0].toUpperCase()}
                        </div>
                      ))}
                      {attendeeList.length > 5 && (
                        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center border-2 border-white -ml-1">
                          +{attendeeList.length - 5}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-1">{attendeeList.length} attendees</span>
                    </div>
                  )}

                  {actions.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>Actions</span>
                        <span className="font-semibold">{done}/{actions.length}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-green-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${actions.length ? (done / actions.length) * 100 : 0}%` }}
                          transition={{ duration: 0.6, delay: i * 0.04 + 0.2 }}
                        />
                      </div>
                    </div>
                  )}

                  {mom.nextMeetingDate && (
                    <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Next: {formatDate(mom.nextMeetingDate)}
                    </p>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
        </>
        )}
        </div>
      </div>

      {/* Create / Edit modal */}
      <MomModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingMom(null) }}
        onSave={handleSave}
        initial={editingMom}
        members={members}
        attendanceMeetings={attendanceMeetings}
        transactions={transactions}
      />

      {/* Detail drawer */}
      <MomDrawer
        mom={selectedMom}
        onClose={() => setSelectedMom(null)}
        onEdit={() => { setEditingMom(selectedMom); setSelectedMom(null); setModalOpen(true) }}
        onDelete={() => setDeleteConfirm(selectedMom)}
        onStatusChange={handleStatusChange}
        members={members}
      />

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <motion.div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg text-center text-rotary-charcoal mb-1">Delete MoM?</h3>
              <p className="text-sm text-center text-gray-400 mb-5">
                "<strong>{deleteConfirm.meetingTitle}</strong>" will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
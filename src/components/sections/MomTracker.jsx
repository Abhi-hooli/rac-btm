import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp, orderBy, query
} from 'firebase/firestore'
import { db } from '../../firebase'

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

const STATUS_COLORS = {
  'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'Done': 'bg-green-50 text-green-700 border-green-200',
}

const EMPTY_MOM = {
  meetingTitle: '',
  meetingDate: '',
  nextMeetingDate: '',
  attendees: '',
  agendaItems: [{ text: '' }],
  decisions: [{ text: '' }],
  actionItems: [{ task: '', owner: '', deadline: '', status: 'Pending' }],
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

function DynamicList({ label, items, onChange, fieldKey = 'text', placeholder }) {
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
            <span className="w-5 h-5 rounded-full bg-rotary-blue/10 text-rotary-blue text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
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

// ─── Attendees Selector ───────────────────────────────────────────────────────

function AttendeesSelector({ value, onChange, members }) {
  const selected = new Set(value ? value.split(',').map(s => s.trim()).filter(Boolean) : [])
  const toggle = (name) => {
    const next = new Set(selected)
    next.has(name) ? next.delete(name) : next.add(name)
    onChange([...next].join(', '))
  }
  const allOn = () => onChange(members.map(m => m.name).join(', '))
  const allOff = () => onChange('')

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Attendees ({selected.size} selected)
        </label>
        <div className="flex gap-2">
          <button onClick={allOn} className="text-xs text-rotary-blue font-semibold hover:underline">All</button>
          <span className="text-gray-300">|</span>
          <button onClick={allOff} className="text-xs text-gray-400 font-semibold hover:underline">Clear</button>
        </div>
      </div>
      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 divide-y divide-gray-100">
        {members.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No members found. Add members via Our Team page.</p>
        )}
        {members.map(m => {
          const on = selected.has(m.name)
          return (
            <button
              key={m.id}
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

// ─── MoM Form Modal ───────────────────────────────────────────────────────────

function MomModal({ isOpen, onClose, onSave, initial, members, attendanceMeetings = [] }) {
  const [form, setForm] = useState(EMPTY_MOM)
  const [saving, setSaving] = useState(false)
  const [customTitle, setCustomTitle] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm(initial || EMPTY_MOM)
      setCustomTitle(false)
    }
  }, [isOpen, initial])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

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
              <div className="grid grid-cols-2 gap-4">

                {/* Meeting Title — dropdown or readonly */}
                <div className="col-span-2">
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
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Next Meeting Date</label>
                  <input
                    type="date"
                    value={form.nextMeetingDate}
                    onChange={e => set('nextMeetingDate', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rotary-blue focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <AttendeesSelector
                value={form.attendees}
                onChange={v => set('attendees', v)}
                members={members}
              />

              <DynamicList label="Agenda Items" items={form.agendaItems} onChange={v => set('agendaItems', v)} placeholder="e.g. Review last month's projects" />
              <DynamicList label="Decisions Made" items={form.decisions} onChange={v => set('decisions', v)} placeholder="e.g. Approved ₹5,000 for event logistics" />

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
                      <div className="grid grid-cols-2 gap-2">
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
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => set('actionItems', [...form.actionItems, { task: '', owner: '', deadline: '', status: 'Pending' }])}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rotary-blue hover:text-rotary-blue/70 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add action item
                </button>
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

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function exportMomToPdf(mom) {
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const attendees = mom.attendees ? mom.attendees.split(',').map(s => s.trim()).filter(Boolean) : []
  const agenda = (mom.agendaItems || []).filter(a => a.text)
  const decisions = (mom.decisions || []).filter(d => d.text)
  const actions = (mom.actionItems || []).filter(a => a.task)

  const statusBg = { 'Pending': '#fef3c7', 'In Progress': '#dbeafe', 'Done': '#dcfce7' }
  const statusFg = { 'Pending': '#92400e', 'In Progress': '#1d4ed8', 'Done': '#15803d' }

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>MoM - ${esc(mom.meetingTitle)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e2837; padding: 40px; max-width: 900px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #d41367; padding-bottom: 20px; margin-bottom: 28px; }
  .header h1 { font-size: 20px; color: #d41367; margin: 0 0 4px; }
  .header p { font-size: 12px; color: #666; }
  .meeting-title { font-size: 26px; font-weight: 700; color: #1e2837; margin-bottom: 8px; }
  .meta { display: flex; gap: 20px; font-size: 12px; color: #666; margin-bottom: 28px; flex-wrap: wrap; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #d41367; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #f0e0e8; }
  .attendees { display: flex; flex-wrap: wrap; gap: 8px; }
  .attendee { background: #f8f9fa; border: 1px solid #e8ecf0; border-radius: 20px; padding: 4px 12px; font-size: 12px; }
  .list-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; font-size: 13px; }
  .badge { width: 22px; height: 22px; border-radius: 50%; color: white; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #1e2837; color: white; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
  tr:nth-child(even) { background: #fafafa; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
  .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; text-align: center; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <div class="header">
    <div><h1>Rotaract Bengaluru BTM</h1><p>Minutes of Meeting</p></div>
    <div style="text-align:right;font-size:11px;color:#888">
      <p>Generated: ${fmtDate(new Date().toISOString().split('T')[0])}</p>
      ${mom.nextMeetingDate ? `<p>Next meeting: ${fmtDate(mom.nextMeetingDate)}</p>` : ''}
    </div>
  </div>
  <div class="meeting-title">${esc(mom.meetingTitle)}</div>
  <div class="meta">
    <span>📅 ${fmtDate(mom.meetingDate)}</span>
    ${attendees.length > 0 ? `<span>👥 ${attendees.length} attendee${attendees.length !== 1 ? 's' : ''}</span>` : ''}
    ${actions.length > 0 ? `<span>✅ ${actions.length} action item${actions.length !== 1 ? 's' : ''}</span>` : ''}
  </div>
  ${attendees.length > 0 ? `<div class="section"><div class="section-title">Attendees</div><div class="attendees">${attendees.map(a => `<span class="attendee">${esc(a)}</span>`).join('')}</div></div>` : ''}
  ${agenda.length > 0 ? `<div class="section"><div class="section-title">Agenda</div>${agenda.map((a, i) => `<div class="list-item"><span class="badge" style="background:#d41367">${i + 1}</span><span>${esc(a.text)}</span></div>`).join('')}</div>` : ''}
  ${decisions.length > 0 ? `<div class="section"><div class="section-title">Decisions Made</div>${decisions.map(d => `<div class="list-item"><span class="badge" style="background:#22c55e">✓</span><span>${esc(d.text)}</span></div>`).join('')}</div>` : ''}
  ${actions.length > 0 ? `<div class="section"><div class="section-title">Action Items</div><table><thead><tr><th>Task</th><th>Owner</th><th>Deadline</th><th>Status</th></tr></thead><tbody>${actions.map(a => `<tr><td>${esc(a.task)}</td><td>${esc(a.owner || '—')}</td><td>${a.deadline ? fmtDate(a.deadline) : '—'}</td><td><span class="status" style="background:${statusBg[a.status || 'Pending']};color:${statusFg[a.status || 'Pending']}">${esc(a.status || 'Pending')}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
  <div class="footer">Rotaract Club of Bengaluru BTM · RID 3190 · Create. Lead. Inspire.</div>
</body></html>`

  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => { printWindow.print() }
}

// ─── MoM Detail Drawer ────────────────────────────────────────────────────────

function MomDrawer({ mom, onClose, onEdit, onDelete, onStatusChange }) {
  if (!mom) return null
  const attendeeList = mom.attendees ? mom.attendees.split(',').map(s => s.trim()).filter(Boolean) : []

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
                  <button onClick={() => exportMomToPdf(mom)} className="p-2 rounded-xl bg-gray-100 hover:bg-rotary-blue/10 hover:text-rotary-blue transition-colors" title="Export PDF">
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
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {attendeeList.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Attendees · {attendeeList.length}</h3>
                  <div className="flex flex-wrap gap-2">
                    {attendeeList.map((a, i) => (
                      <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-rotary-blue text-white text-xs font-bold flex items-center justify-center">{a[0].toUpperCase()}</span>
                        {a}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {mom.agendaItems?.some(a => a.text) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Agenda</h3>
                  <ol className="space-y-1.5">
                    {mom.agendaItems.filter(a => a.text).map((a, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-rotary-blue/10 text-rotary-blue text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {a.text}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {mom.decisions?.some(d => d.text) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Decisions Made</h3>
                  <ul className="space-y-1.5">
                    {mom.decisions.filter(d => d.text).map((d, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {d.text}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {mom.actionItems?.some(a => a.task) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Action Items</h3>
                  <div className="space-y-2">
                    {mom.actionItems.filter(a => a.task).map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-gray-800 flex-1">{item.task}</p>
                          <StatusBadge status={item.status || 'Pending'} onChange={(s) => onStatusChange(i, s)} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
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
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MomTracker({ isAdmin, onBack, linkedMeeting }) {
  const [moms, setMoms] = useState([])
  const [members, setMembers] = useState([])
  const [attendanceMeetings, setAttendanceMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMom, setEditingMom] = useState(null)
  const [selectedMom, setSelectedMom] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

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
    const q = query(collection(db, 'moms'), orderBy('meetingDate', 'desc'))
    return onSnapshot(q, (snap) => {
      setMoms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [])

  // Firestore — Members
  useEffect(() => {
    return onSnapshot(collection(db, 'leaders'), (snap) => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => m.name)
        .sort((a, b) => a.name.localeCompare(b.name))
      setMembers(sorted)
    })
  }, [])

  // Firestore — Attendance Meetings (for dropdown)
  useEffect(() => {
    const q = query(collection(db, 'attendance_meetings'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => {
      setAttendanceMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
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
        meetingTitle: linkedMeeting.title,
        meetingDate: linkedMeeting.date,
        attendees: attendeeNames,
        linkedMeetingId: linkedMeeting.id,
        agendaItems: [{ text: '' }],
        decisions: [{ text: '' }],
        actionItems: [{ task: '', owner: '', deadline: '', status: 'Pending' }],
      })
    }
    setModalOpen(true)
  }, [linkedMeeting, members.length, loading])

  const handleSave = async (form) => {
    if (editingMom?.id) {
      const updates = { ...form, updatedAt: serverTimestamp() }
      if (editingMom.linkedMeetingId) updates.linkedMeetingId = editingMom.linkedMeetingId
      await updateDoc(doc(db, 'moms', editingMom.id), updates)
      if (selectedMom?.id === editingMom.id) setSelectedMom({ ...editingMom, ...form })
    } else {
      const data = { ...form, createdAt: serverTimestamp() }
      if (editingMom?.linkedMeetingId) data.linkedMeetingId = editingMom.linkedMeetingId
      await addDoc(collection(db, 'moms'), data)
    }
    setEditingMom(null)
  }

  const handleDelete = async (mom) => {
    await deleteDoc(doc(db, 'moms', mom.id))
    if (selectedMom?.id === mom.id) setSelectedMom(null)
    setDeleteConfirm(null)
  }

  const handleStatusChange = async (actionIdx, newStatus) => {
    if (!selectedMom) return
    const updatedActions = selectedMom.actionItems.map((a, i) =>
      i === actionIdx ? { ...a, status: newStatus } : a
    )
    const updated = { ...selectedMom, actionItems: updatedActions }
    setSelectedMom(updated)
    await updateDoc(doc(db, 'moms', selectedMom.id), { actionItems: updatedActions })
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
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
                      <p className="text-xs font-semibold text-rotary-blue mb-1">{formatDate(mom.meetingDate)}</p>
                      <h3 className="font-display font-bold text-rotary-charcoal text-base leading-tight truncate group-hover:text-rotary-blue transition-colors">
                        {mom.meetingTitle}
                      </h3>
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
      </div>

      {/* Create / Edit modal */}
      <MomModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingMom(null) }}
        onSave={handleSave}
        initial={editingMom}
        members={members}
        attendanceMeetings={attendanceMeetings}
      />

      {/* Detail drawer */}
      <MomDrawer
        mom={selectedMom}
        onClose={() => setSelectedMom(null)}
        onEdit={() => { setEditingMom(selectedMom); setSelectedMom(null); setModalOpen(true) }}
        onDelete={() => setDeleteConfirm(selectedMom)}
        onStatusChange={handleStatusChange}
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
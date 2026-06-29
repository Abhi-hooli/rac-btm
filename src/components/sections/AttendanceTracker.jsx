import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'
import { db } from '../../firebase'
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore'

const pct = (attended, total) =>
  total === 0 ? 0 : Math.round((attended / total) * 100)

const flagLevel = (p) => (p >= 75 ? 'good' : p >= 50 ? 'warn' : 'low')

const FLAG = {
  good: { dot: 'bg-emerald-400', bar: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  warn: { dot: 'bg-amber-400', bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { dot: 'bg-red-400', bar: 'bg-red-400', badge: 'bg-red-50 text-red-700 border-red-200' },
}

const TEAM_LABELS = { bod: 'Board of Directors', core: 'Core Team', member: 'Member' }
const EVENT_TYPES = ['GBM Meeting', 'BOD Meeting', 'Core Team Meeting', 'Fellowship', 'Project']

// ─── Excel Export ─────────────────────────────────────────────────────────────
function exportAttendanceXLSX(meetings, members, projects) {
  const wb = XLSX.utils.book_new()

  const meetingHeaders = [
    'Meeting / Event', 'Type', 'Date', 'Present', 'Absent', 'Total', 'Attendance %',
    ...members.map(m => m.name)
  ]
  const meetingRows = meetings.map(record => {
    const presentSet = new Set(record.presentIds || [])
    const linked = projects.find(p => p.id === record.projectId)
    return [
      linked ? `[Project] ${linked.title}` : record.title,
      record.type || '',
      record.date ? new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      presentSet.size,
      members.length - presentSet.size,
      members.length,
      `${pct(presentSet.size, members.length)}%`,
      ...members.map(m => presentSet.has(m.id) ? '✓' : '✗')
    ]
  })
  const ws1 = XLSX.utils.aoa_to_sheet([meetingHeaders, ...meetingRows])
  ws1['!cols'] = [{ wch: 36 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, ...members.map(() => ({ wch: 20 }))]
  XLSX.utils.book_append_sheet(wb, ws1, 'Attendance by Meeting')

  const memberHeaders = ['#', 'Name', 'Role', 'Team', 'Attended', 'Total', 'Attendance %', 'Status']
  const memberRows = members.map((m, i) => {
    const attended = meetings.filter(mt => mt.presentIds?.includes(m.id)).length
    const p = pct(attended, meetings.length)
    return [i + 1, m.name, m.role || '', TEAM_LABELS[m.team] || m.team || '', attended, meetings.length, `${p}%`, p >= 75 ? 'Good' : p >= 50 ? 'At Risk' : 'Low']
  }).sort((a, b) => parseInt(b[6]) - parseInt(a[6]))
  const ws2 = XLSX.utils.aoa_to_sheet([memberHeaders, ...memberRows])
  ws2['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 22 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Member Summary')

  XLSX.writeFile(wb, `rotaract-attendance-${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ─── Micro components ─────────────────────────────────────────────────────────
function AttendanceBadge({ percentage }) {
  const f = FLAG[flagLevel(percentage)]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${f.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />{percentage}%
    </span>
  )
}

function Bar({ percentage }) {
  const f = FLAG[flagLevel(percentage)]
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <motion.div className={`h-full rounded-full ${f.bar}`} initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.7 }} />
    </div>
  )
}

function MemberChip({ m, color = 'green' }) {
  const colors = { green: 'bg-emerald-50 border-emerald-200 text-emerald-700', red: 'bg-red-50 border-red-200 text-red-600' }
  const avatar = color === 'green' ? 'bg-emerald-200 text-emerald-700' : 'bg-red-100 text-red-600'
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${colors[color]}`}>
      {m.image
        ? <img src={m.image} alt="" className="w-5 h-5 rounded-full object-cover" />
        : <div className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${avatar}`}>{m.name.charAt(0)}</div>
      }
      <span className="text-xs font-semibold">{m.name.replace(/^Rtr\.\s*/i, '')}</span>
    </div>
  )
}

// ─── Mark Attendance Modal ────────────────────────────────────────────────────
function MarkAttendanceModal({ isOpen, onClose, onSave, members, record }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState('GBM Meeting')
  const [present, setPresent] = useState(new Set())
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const isProjectMode = record?.sourceType === 'project'

  useEffect(() => {
    if (!isOpen) return
    setTitle(record?.title || '')
    setDate(record?.date || new Date().toISOString().split('T')[0])
    setType(record?.type || 'GBM Meeting')
    setPresent(new Set(record?.presentIds || []))
    setSearch('')
  }, [isOpen, record])

  const toggle = (id) => { const s = new Set(present); s.has(id) ? s.delete(id) : s.add(id); setPresent(s) }
  const allOn = () => setPresent(new Set(members.map(m => m.id)))
  const allOff = () => setPresent(new Set())

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.role || '').toLowerCase().includes(search.toLowerCase())
  )
  const grouped = { bod: [], core: [], member: [] }
  filtered.forEach(m => { const k = m.team || 'member'; (grouped[k] || grouped.member).push(m) })

  const handleSave = async () => {
    if (!title.trim() || !date) return
    setSaving(true)
    await onSave({ title: title.trim(), date, type, presentIds: [...present] })
    setSaving(false)
    onClose()
  }

  if (!isOpen) return null
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-white w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-gray-100 shadow-2xl"
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="font-display font-bold text-lg">
                {record?.id && !isProjectMode ? 'Edit Meeting' : isProjectMode ? 'Mark Project Attendance' : 'New Meeting'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{present.size} of {members.length} marked present</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Fields */}
          <div className="px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={title} onChange={e => !isProjectMode && setTitle(e.target.value)}
                placeholder="Meeting title *" readOnly={isProjectMode}
                className={`col-span-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 ${isProjectMode ? 'opacity-60 cursor-default' : ''}`}
              />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30"
              />
              <select value={type} onChange={e => !isProjectMode && setType(e.target.value)} disabled={isProjectMode}
                className={`px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 ${isProjectMode ? 'opacity-60' : ''}`}
              >
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-100 shrink-0 flex gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30"
            />
            <button onClick={allOn} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors shrink-0">All ✓</button>
            <button onClick={allOff} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-bold hover:bg-gray-200 transition-colors shrink-0">Clear</button>
          </div>

          {/* Member list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-4">
            {['bod', 'core', 'member'].map(teamKey => {
              const group = grouped[teamKey]
              if (!group.length) return null
              return (
                <div key={teamKey}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 mb-2">{TEAM_LABELS[teamKey]} ({group.length})</p>
                  <div className="space-y-1.5">
                    {group.map(m => {
                      const isPresent = present.has(m.id)
                      return (
                        <button key={m.id} onClick={() => toggle(m.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${isPresent ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                        >
                          {m.image
                            ? <img src={m.image} alt={m.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            : <div className="w-8 h-8 rounded-full bg-rotary-blue/10 text-rotary-blue font-bold text-sm flex items-center justify-center flex-shrink-0">{m.name.charAt(0).toUpperCase()}</div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{m.name}</p>
                            <p className="text-xs text-gray-400 truncate">{m.role}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${isPresent ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                            {isPresent && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {!filtered.length && <p className="text-center text-sm text-gray-400 py-8">No members found</p>}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving || !title.trim() || !date}
              className="flex-1 py-3 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue/90 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({ record, members, onClose, onEdit }) {
  const presentIds = new Set(record.presentIds || [])
  const presentList = members.filter(m => presentIds.has(m.id))
  const absentList = members.filter(m => !presentIds.has(m.id))
  const percentage = pct(presentList.length, members.length)

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-white w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-gray-100 shadow-2xl"
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-bold text-lg truncate">{record.title}</h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rotary-blue/10 text-rotary-blue font-semibold shrink-0">{record.type}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-5">
              <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{presentList.length}</p><p className="text-[10px] text-gray-400 uppercase tracking-wider">Present</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-red-500">{absentList.length}</p><p className="text-[10px] text-gray-400 uppercase tracking-wider">Absent</p></div>
              <div className="text-center"><p className="text-2xl font-bold">{members.length}</p><p className="text-[10px] text-gray-400 uppercase tracking-wider">Total</p></div>
            </div>
            <AttendanceBadge percentage={percentage} />
          </div>
          <Bar percentage={percentage} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">✓ Present ({presentList.length})</p>
            {presentList.length === 0
              ? <p className="text-xs text-gray-400 italic">Nobody marked present</p>
              : <div className="flex flex-wrap gap-2">{presentList.map(m => <MemberChip key={m.id} m={m} color="green" />)}</div>
            }
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-2">✗ Absent ({absentList.length})</p>
            {absentList.length === 0
              ? <p className="text-xs text-gray-400 italic">Full attendance! 🎉</p>
              : <div className="flex flex-wrap gap-2">{absentList.map(m => <MemberChip key={m.id} m={m} color="red" />)}</div>
            }
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={() => { onClose(); onEdit() }} className="w-full py-3 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue/90 transition-colors">
            Edit Attendance
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AttendanceTracker({ onBack, onCreateMom, isAdmin }) {

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      </div>
      <h2 className="font-display font-bold text-xl mb-1">Access Restricted</h2>
      <p className="text-sm text-gray-400">Admin login required.</p>
      <button onClick={onBack} className="mt-6 btn-primary !py-2 !px-6 text-sm !rounded-xl">Go Back</button>
    </div>
  )

  const [members, setMembers] = useState([])
  const [meetings, setMeetings] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState(null)
  const [detailRecord, setDetailRecord] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const [activeTab, setActiveTab] = useState('meetings')
  const [filterType, setFilterType] = useState('All')
  const [filterAvenue, setFilterAvenue] = useState('All')
  const [filterFlag, setFilterFlag] = useState('All')
  const [memberSearch, setMemberSearch] = useState('')
  const [linkedMomIds, setLinkedMomIds] = useState(new Set())

  // ── Firestore listeners ──
  useEffect(() => {
    const q = query(collection(db, 'leaders'), orderBy('name'))
    return onSnapshot(q, snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'attendance_meetings'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    // Pull ALL projects regardless of featured flag
    const q = query(collection(db, 'projects'), orderBy('title'))
    return onSnapshot(q, snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'moms'), snap => {
      const ids = new Set()
      snap.docs.forEach(d => { const data = d.data(); if (data.linkedMeetingId) ids.add(data.linkedMeetingId) })
      setLinkedMomIds(ids)
    })
  }, [])

  // ── CRUD ──
  const saveMeeting = async ({ title, date, type, presentIds }) => {
    if (modalRecord?.id && modalRecord?.sourceType !== 'project') {
      await updateDoc(doc(db, 'attendance_meetings', modalRecord.id), { title, date, type, presentIds, updatedAt: serverTimestamp() })
    } else {
      const payload = { title, date, type, presentIds, createdAt: serverTimestamp() }
      if (modalRecord?.projectId) payload.projectId = modalRecord.projectId
      await addDoc(collection(db, 'attendance_meetings'), payload)
    }
    setModalRecord(null)
  }

  const deleteMeeting = async (id) => { await deleteDoc(doc(db, 'attendance_meetings', id)); setDeleteId(null) }

  const openNewMeeting = () => { setModalRecord(null); setModalOpen(true) }
  const openEditMeeting = (m) => { setModalRecord(m); setModalOpen(true) }

  const openProjectAttendance = (project) => {
    const existing = meetings.find(m => m.projectId === project.id)
    if (existing) {
      setModalRecord({ ...existing })
    } else {
      setModalRecord({
        title: project.title,
        date: project.startDate || new Date().toISOString().split('T')[0],
        type: 'Project',
        presentIds: [],
        projectId: project.id,
        sourceType: 'project',
      })
    }
    setModalOpen(true)
  }

  // ── Stats ──
  const totalMeetings = meetings.filter(m => !m.projectId).length  // only club meetings for member stats

  const memberStats = members.map(m => {
  const clubMeetingsList = meetings.filter(mt => !mt.projectId)
  const projectMeetingsList = meetings.filter(mt => !!mt.projectId)

  const clubAttended = clubMeetingsList.filter(mt => mt.presentIds?.includes(m.id)).length
  const projectAttended = projectMeetingsList.filter(mt => mt.presentIds?.includes(m.id)).length

  const totalAttended = clubAttended + projectAttended
  const totalAll = clubMeetingsList.length + projectMeetingsList.length

  const percentage = pct(totalAttended, totalAll || 1)
  return { ...m, attended: totalAttended, clubAttended, projectAttended, percentage, flag: flagLevel(percentage) }
  }).sort((a, b) => b.percentage - a.percentage)

  const lowCount = memberStats.filter(m => m.flag === 'low').length
  const warnCount = memberStats.filter(m => m.flag === 'warn').length

  // ── Filters ──
  const clubMeetings = meetings.filter(m => !m.projectId)
  const filteredMeetings = clubMeetings.filter(m => filterType === 'All' || m.type === filterType)
  const meetingTypes = ['All', ...new Set(clubMeetings.map(m => m.type).filter(Boolean))]

  // Project avenue filter — uses avenue field (new) or category (old)
  const allAvenues = ['All', ...new Set(projects.map(p => p.avenue || p.category).filter(Boolean))]
  const filteredProjects = projects.filter(p => {
    if (filterAvenue === 'All') return true
    return (p.avenue || p.category) === filterAvenue
  })

  const filteredMembers = memberStats.filter(m => {
    const flagMatch = filterFlag === 'All' || m.flag === filterFlag
    const searchMatch = m.name.toLowerCase().includes(memberSearch.toLowerCase()) || (m.role || '').toLowerCase().includes(memberSearch.toLowerCase())
    return flagMatch && searchMatch
  })

  // ── Meeting record row (with MoM button — meetings only) ──
  const RecordRow = ({ record, i }) => {
    const presentCount = record.presentIds?.length || 0
    const percentage = pct(presentCount, members.length)
    const hasMom = linkedMomIds.has(record.id)

    return (
      <motion.div
        className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-rotary-blue/20 transition-all"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
        onClick={() => setDetailRecord(record)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="font-display font-bold text-base">{record.title}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rotary-blue/10 text-rotary-blue font-semibold">{record.type}</span>
              {hasMom && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 font-semibold flex items-center gap-1">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  MoM Added
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <Bar percentage={percentage} />
            <div className="flex items-center gap-3 mt-2">
              <AttendanceBadge percentage={percentage} />
              <span className="text-xs text-gray-400">
                <span className="text-emerald-600 font-semibold">{presentCount} present</span>
                {' · '}
                <span className="text-red-500 font-semibold">{members.length - presentCount} absent</span>
              </span>
            </div>
          </div>

          <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
            {/* MoM button — only for club meetings */}
            <button
              onClick={() => onCreateMom?.(record)}
              className="p-2 rounded-lg hover:bg-purple-50 text-purple-400 hover:text-purple-600 transition-colors"
              title={hasMom ? 'View / Edit MoM' : 'Create MoM'}
            >
              {hasMom
                ? <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              }
            </button>
            <button onClick={() => openEditMeeting(record)} className="p-2 rounded-lg hover:bg-rotary-blue/10 text-rotary-blue transition-colors" title="Edit">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={() => setDeleteId(record.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Delete">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Header ── */}
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
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4006d] animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4006d]">
                  Sergeant At Arms Dashboard
                </p>
              </div>

              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal dark:text-white">
                Attendance Tracker
              </h2>

              <p className="text-sm text-gray-400 dark:text-white/40">
                Rotaract Club · Bengaluru BTM
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => exportAttendanceXLSX(meetings, members, projects)}
              disabled={meetings.length === 0}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-rotary-charcoal hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export
            </button>

            {activeTab === 'meetings' && (
              <button
                onClick={openNewMeeting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue/90 transition-colors shadow-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Meeting
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Stat Cards ── */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          {[
            {
              icon: '📅',
              label: 'Club Meetings',
              value: clubMeetings.length,
              accent: 'bg-rotary-blue/10'
            },
            {
              icon: '🗂️',
              label: 'Projects',
              value: projects.length,
              accent: 'bg-purple-100'
            },
            {
              icon: '⚠️',
              label: 'At Risk',
              value: warnCount,
              accent: 'bg-amber-100'
            },
            {
              icon: '🔴',
              label: 'Low Attendance',
              value: lowCount,
              accent: 'bg-red-100'
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.accent}`}>
                  <span className="text-lg">{s.icon}</span>
                </div>
              </div>

              <p className="text-xs font-medium text-gray-400 mb-1">
                {s.label}
              </p>

              <p className="font-display font-extrabold text-[1.75rem] leading-none text-rotary-charcoal">
                {s.value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* ── Tabs ── */}
        <div className="inline-flex gap-1 p-1 bg-white rounded-2xl border border-gray-100 shadow-sm mb-8">
          {[
            { key: 'meetings', label: `Meetings (${clubMeetings.length})` },
            { key: 'projects', label: `Projects (${projects.length})` },
            { key: 'members', label: `Members (${members.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === t.key ? 'bg-rotary-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ MEETINGS TAB ══ */}
        {activeTab === 'meetings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex gap-2 flex-wrap mb-5">
              {meetingTypes.map(t => (
                <button key={t} onClick={() => setFilterType(t)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterType === t ? 'bg-rotary-blue text-white border-rotary-blue' : 'border-gray-200 text-gray-500 hover:border-rotary-blue/40'}`}>
                  {t}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-24"><div className="w-10 h-10 border-4 border-rotary-blue/20 border-t-rotary-blue rounded-full animate-spin" /></div>
            ) : filteredMeetings.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-5xl mb-4">📋</p>
                <p className="font-display font-bold text-lg">No meetings yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "New Meeting" to get started</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredMeetings.map((m, i) => <RecordRow key={m.id} record={m} i={i} />)}
              </div>
            )}
          </motion.div>
        )}

        {/* ══ PROJECTS TAB ══ */}
        {activeTab === 'projects' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-purple-50 border border-purple-200 mb-5">
              <span className="text-purple-500 mt-0.5 text-lg shrink-0">ℹ️</span>
              <p className="text-xs text-purple-700 leading-relaxed">
                All projects from <strong>All Projects</strong> page appear here. Click a card to mark attendance for that project. MoM tracking is only available for club meetings.
              </p>
            </div>

            {/* Avenue filter */}
            <div className="flex gap-2 flex-wrap mb-5">
              {allAvenues.map(a => (
                <button key={a} onClick={() => setFilterAvenue(a)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterAvenue === a ? 'bg-rotary-blue text-white border-rotary-blue' : 'border-gray-200 text-gray-500 hover:border-rotary-blue/40'}`}>
                  {a}
                </button>
              ))}
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-5xl mb-4">🗂️</p>
                <p className="font-display font-bold text-lg">No projects found</p>
                <p className="text-sm text-gray-400 mt-1">Add projects from the All Projects page first</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredProjects.map((project, i) => {
                  const attendanceRecord = meetings.find(m => m.projectId === project.id)
                  const presentCount = attendanceRecord?.presentIds?.length || 0
                  const percentage = pct(presentCount, members.length)
                  const hasRecord = !!attendanceRecord

                  return (
                    <motion.div
                      key={project.id}
                      className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-rotary-blue/20 transition-all"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    >
                      {project.image && (
                        <div className="relative h-28 overflow-hidden">
                          <img src={project.image} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className={`absolute inset-0 bg-gradient-to-t ${project.color || 'from-black/60'} opacity-60`} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          {/* Show avenue or category badge */}
                          <div className="absolute bottom-3 left-4 flex flex-wrap gap-1">
                            {(project.avenue || project.category) && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 bg-black/30 px-2 py-0.5 rounded-full">
                                {project.avenue || project.category}
                              </span>
                            )}
                            {project.areaOfFocus && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 bg-rotary-gold/40 px-2 py-0.5 rounded-full">
                                {project.areaOfFocus}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-bold text-base truncate">{project.title}</h3>
                            {!project.image && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {(project.avenue || project.category) && (
                                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{project.avenue || project.category}</span>
                                )}
                              </div>
                            )}
                            {project.startDate && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(project.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {project.endDate && ` → ${new Date(project.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                              </p>
                            )}
                          </div>
                          {hasRecord
                            ? <AttendanceBadge percentage={percentage} />
                            : <span className="text-[10px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 font-semibold border border-gray-200 shrink-0">Not marked</span>
                          }
                        </div>

                        {hasRecord && (
                          <div className="mb-3">
                            <Bar percentage={percentage} />
                            <p className="text-xs text-gray-400 mt-1.5">
                              <span className="text-emerald-600 font-semibold">{presentCount} present</span>
                              {' · '}
                              <span className="text-red-500 font-semibold">{members.length - presentCount} absent</span>
                              {' · '}
                              {new Date(attendanceRecord.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() => openProjectAttendance(project)}
                          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${hasRecord ? 'bg-gray-100 text-gray-700 hover:bg-rotary-blue hover:text-white' : 'bg-rotary-blue text-white hover:bg-rotary-blue/90'}`}
                        >
                          {hasRecord ? '✏️ Update Attendance' : '✅ Mark Attendance'}
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ══ MEMBERS TAB ══ */}
        {activeTab === 'members' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search by name or role…"
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30"
              />
              <div className="flex gap-2">
                {[{ key: 'All', label: 'All' }, { key: 'good', label: '🟢 Good' }, { key: 'warn', label: '🟡 At Risk' }, { key: 'low', label: '🔴 Low' }].map(f => (
                  <button key={f.key} onClick={() => setFilterFlag(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterFlag === f.key ? 'bg-rotary-blue text-white border-rotary-blue' : 'border-gray-200 text-gray-500'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-5">Attendance rate is based on <strong>all meetings and projects</strong> combined.</p>

            {members.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-5xl mb-4">👥</p>
                <p className="font-display font-bold text-lg">No members yet</p>
                <p className="text-sm text-gray-400 mt-1">Add members via the Our Team page</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Member</div>
                  <div className="col-span-2">Team</div>
                  <div className="col-span-2 text-center">Attended</div>
                  <div className="col-span-2 text-right">Rate</div>
                </div>
                {filteredMembers.map((m, i) => (
                  <motion.div key={m.id} className="grid grid-cols-12 gap-3 sm:gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}>
                    <div className="col-span-1 text-xs text-gray-300 font-mono hidden sm:block">{i + 1}</div>
                    <div className="col-span-8 sm:col-span-5 flex items-center gap-2.5">
                      {m.image
                        ? <img src={m.image} alt={m.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-rotary-blue/10 text-rotary-blue font-bold text-sm flex items-center justify-center flex-shrink-0">{m.name.charAt(0).toUpperCase()}</div>
                      }
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{m.name}</p>
                        <p className="text-xs text-gray-400 truncate">{m.role}</p>
                        <div className="mt-1"><Bar percentage={m.percentage} /></div>
                      </div>
                    </div>
                    <div className="col-span-2 hidden sm:block">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">{TEAM_LABELS[m.team] || m.team || '—'}</span>
                    </div>
                    <div className="col-span-2 text-center hidden sm:block">
                      <span className="text-sm font-bold">{m.attended}</span>
                      <span className="text-xs text-gray-400">/{meetings.length}</span>
                    </div>
                    <div className="col-span-4 sm:col-span-2 flex justify-end">
                      <AttendanceBadge percentage={m.percentage} />
                    </div>
                  </motion.div>
                ))}
                {filteredMembers.length === 0 && <p className="text-center text-sm text-gray-400 py-12">No members match this filter</p>}
              </div>
            )}
          </motion.div>
        )}
      </div>

      <MarkAttendanceModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setModalRecord(null) }} onSave={saveMeeting} members={members} record={modalRecord} />

      <AnimatePresence>
        {detailRecord && <DetailDrawer record={detailRecord} members={members} onClose={() => setDetailRecord(null)} onEdit={() => openEditMeeting(detailRecord)} />}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <motion.div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="font-display font-bold text-lg mb-1">Delete Record?</h3>
              <p className="text-sm text-gray-400 mb-6">This will permanently remove the attendance record.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={() => deleteMeeting(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
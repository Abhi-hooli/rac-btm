import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'

const STATUS_STEPS = ['new', 'contacted', 'approved', 'rejected']

const STATUS_STYLES = {
  new:       { label: 'New',       dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  contacted: { label: 'Contacted', dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved:  { label: 'Approved',  dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected:  { label: 'Rejected',  dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200' },
}

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  return new Date(value)
}

function formatDate(value) {
  const d = toDate(value)
  if (!d || isNaN(d)) return '—'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.new
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  )
}

function exportCSV(applications, getAssigneeName) {
  const headers = ['Name', 'Email', 'Phone', 'Age', 'Occupation', 'Areas of Interest', 'Heard From', 'Reason', 'Status', 'Assigned To', 'Submitted']
  const rows = applications.map(a => [
    a.name, a.email, a.phone || '', a.age || '', a.occupation || '',
    (a.interests || []).join('; '), a.heardFrom || '', a.reason || '',
    a.status || 'new', getAssigneeName(a.assignedTo) || '', formatDate(a.submittedAt),
  ])
  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `membership-applications-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ApplicationDrawer({ application, users, onClose, onStatusChange, onAssigneeChange, onDelete }) {
  if (!application) return null
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
          <h2 className="font-display font-bold text-lg">Application Details</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center text-center pt-6 pb-4 px-6 border-b border-gray-100 shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-rotary-blue/10 text-rotary-blue flex items-center justify-center text-2xl font-bold mb-3">
            {application.name?.charAt(0).toUpperCase()}
          </div>
          <h3 className="font-display font-bold text-xl">{application.name}</h3>
          <div className="mt-2"><StatusBadge status={application.status || 'new'} /></div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {[
            { label: 'Email', value: application.email },
            { label: 'Phone', value: application.phone || '—' },
            { label: 'Age', value: application.age || '—' },
            { label: 'Occupation', value: application.occupation || '—' },
            { label: 'Heard From', value: application.heardFrom || '—' },
            { label: 'Submitted', value: formatDate(application.submittedAt) },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{item.label}</p>
              <p className="text-sm font-semibold text-rotary-charcoal text-right">{item.value}</p>
            </div>
          ))}

          {application.interests?.length > 0 && (
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Areas of Interest</p>
              <div className="flex flex-wrap gap-1.5">
                {application.interests.map(i => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rotary-blue/10 text-rotary-blue">{i}</span>
                ))}
              </div>
            </div>
          )}

          {application.reason && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-[10px] uppercase tracking-widest text-amber-600 font-bold mb-1">Why they want to join</p>
              <p className="text-sm text-amber-900">{application.reason}</p>
            </div>
          )}

          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_STEPS.map(step => (
                <button
                  key={step}
                  onClick={() => onStatusChange(application, step)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    (application.status || 'new') === step
                      ? 'bg-rotary-blue text-white border-rotary-blue'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-rotary-blue/40'
                  }`}
                >
                  {STATUS_STYLES[step].label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Assigned To (Follow-up)</p>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 cursor-pointer"
              value={application.assignedTo || ''}
              onChange={e => onAssigneeChange(application, e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => onDelete(application)}
            className="w-full py-3 rounded-xl bg-red-50 text-red-500 border border-red-100 text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            Delete Application
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function MembershipAdmin({ isAdmin, onBack }) {

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

  const { data: applications, loading, save, remove } = useCollection('membershipApplications')
  const { data: users } = useCollection('users')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [assigneeFilter, setAssigneeFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const assigneeName = (id) => users.find(u => u.id === id)?.name || users.find(u => u.id === id)?.email || null

  const totalNew = applications.filter(a => (a.status || 'new') === 'new').length
  const totalContacted = applications.filter(a => a.status === 'contacted').length
  const totalApproved = applications.filter(a => a.status === 'approved').length

  const filtered = applications
    .filter(a => statusFilter === 'All' || (a.status || 'new') === statusFilter)
    .filter(a => assigneeFilter === 'All' || (assigneeFilter === 'Unassigned' ? !a.assignedTo : a.assignedTo === assigneeFilter))
    .filter(a => {
      const q = search.toLowerCase()
      if (!q) return true
      return a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q)
    })
    .sort((a, b) => (toDate(b.submittedAt) || 0) - (toDate(a.submittedAt) || 0))

  const handleStatusChange = async (application, status) => {
    try {
      await save({ ...application, status })
      setSelected(s => s && s.id === application.id ? { ...s, status } : s)
    } catch (err) {
      console.error('Update status error:', err)
    }
  }

  const handleAssigneeChange = async (application, assignedTo) => {
    try {
      await save({ ...application, assignedTo: assignedTo || null })
      setSelected(s => s && s.id === application.id ? { ...s, assignedTo: assignedTo || null } : s)
    } catch (err) {
      console.error('Update assignee error:', err)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
    } catch (err) {
      console.error('Delete application error:', err)
    }
    setDeleteTarget(null)
    setSelected(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">

        <motion.div
          className="flex items-start gap-3 mb-10"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
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
                Membership Dashboard
              </p>
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal">
              Membership Applications
            </h2>
            <p className="text-sm text-gray-400">Rotaract Club · Bengaluru BTM</p>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          {[
            { icon: '📋', label: 'Total Applications', value: applications.length, accent: 'bg-rotary-blue/10' },
            { icon: '🆕', label: 'New', value: totalNew, accent: 'bg-blue-100' },
            { icon: '📞', label: 'Contacted', value: totalContacted, accent: 'bg-amber-100' },
            { icon: '✅', label: 'Approved', value: totalApproved, accent: 'bg-emerald-100' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.04 }}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.accent} mb-3`}>
                <span className="text-base">{s.icon}</span>
              </div>
              <p className="text-xs font-medium text-gray-400 mb-0.5">{s.label}</p>
              <p className="font-display font-extrabold text-2xl leading-none text-rotary-charcoal">{s.value}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
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
            <div className="flex gap-2 flex-wrap">
              {['All', ...STATUS_STEPS].map(t => (
                <button
                  key={t}
                  onClick={() => setStatusFilter(t)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${statusFilter === t ? 'bg-rotary-blue text-white border-rotary-blue' : 'border-gray-200 text-gray-500 hover:border-rotary-blue/40 bg-white'}`}
                >
                  {t === 'All' ? 'All' : STATUS_STYLES[t].label}
                </button>
              ))}
            </div>
            <select
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 cursor-pointer"
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
            >
              <option value="All">All Assignees</option>
              <option value="Unassigned">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
            <button
              onClick={() => exportCSV(applications, assigneeName)}
              disabled={applications.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-rotary-charcoal hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-24">
                <div className="w-10 h-10 border-4 border-rotary-blue/20 border-t-rotary-blue rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-24">
                <p className="text-5xl mb-4">📋</p>
                <p className="font-display font-bold text-lg">
                  {search || statusFilter !== 'All' ? 'No results found' : 'No applications yet'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {search || statusFilter !== 'All' ? 'Try a different search or filter' : 'Applications will appear here when submitted'}
                </p>
              </div>
            ) : (
              <div className="grid gap-2.5">
                {filtered.map((application, i) => (
                  <motion.div
                    key={application.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelected(application)}
                    className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-rotary-blue/20 hover:-translate-y-0.5 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rotary-blue/10 text-rotary-blue flex items-center justify-center shrink-0 font-bold text-sm">
                        {application.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="font-display font-bold text-sm">{application.name}</p>
                          <StatusBadge status={application.status || 'new'} />
                          {assigneeName(application.assignedTo) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              👤 {assigneeName(application.assignedTo)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{application.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-400">{formatDate(application.submittedAt)}</p>
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
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <ApplicationDrawer
            application={selected}
            users={users}
            onClose={() => setSelected(null)}
            onStatusChange={handleStatusChange}
            onAssigneeChange={handleAssigneeChange}
            onDelete={(application) => setDeleteTarget(application)}
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
              <h3 className="font-display font-bold text-lg mb-1">Delete Application?</h3>
              <p className="text-sm text-gray-400 mb-6">
                This will permanently delete <strong>{deleteTarget.name}</strong>'s application.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleDeleteConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

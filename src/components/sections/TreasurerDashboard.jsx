import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection, useDocument } from '../../hooks/useFirestore'

const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

function inRange(dateStr, from, to) {
  if (!dateStr) return true
  if (!from && !to) return true
  const d = new Date(dateStr)
  if (from && d < new Date(from)) return false
  if (to && d > new Date(to)) return false
  return true
}

function exportDuesCSV(members) {
  const { data: leaders } = useCollection('leaders')
  const headers = ['#', 'Member Name', 'Type', 'Annual Due (₹)', 'Paid (₹)', 'Pending (₹)', 'Status', 'Payment Date', 'Payment Mode', 'Note']
  const rows = members.map((m, i) => {
    const pending = (m.annualDue || 0) - (m.paid || 0)
    const status = m.paid >= m.annualDue ? 'Paid' : m.paid > 0 ? 'Partial' : 'Unpaid'
    const leader = leaders.find(l => l.name?.toLowerCase() === m.name?.toLowerCase())
    const type = leader?.memberType === 'working' ? 'Working Professional' : 'Student'
    return [i + 1, `"${m.name}"`, type, m.annualDue || 0, m.paid || 0, pending, status,
    m.paymentDate ? new Date(m.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    m.paymentMode || '',
    `"${m.note || ''}"`].join(',')
  })
  const totalDue = members.reduce((s, m) => s + (m.annualDue || 0), 0)
  const totalPaid = members.reduce((s, m) => s + (m.paid || 0), 0)
  rows.push(['', '"TOTAL"', '', totalDue, totalPaid, totalDue - totalPaid, '', '', '', ''].join(','))
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rotaract-membership-dues-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Summary Cards ──
function SummaryCards({ members, events, sponsorships = [], dateRange = {} }) {
  const { from, to } = dateRange
  const filteredMembers = members.filter(m => inRange(m.paymentDate, from, to) || (!m.paymentDate && !from && !to))
  const filteredEvents = events.filter(e => inRange(e.date, from, to))
  const filteredSponsorships = sponsorships.filter(s => inRange(s.date, from, to))
  const totalDues = members.reduce((sum, m) => sum + (m.annualDue || 0), 0)
  const totalCollected = filteredMembers.reduce((sum, m) => sum + (m.paid || 0), 0)
    + filteredSponsorships.reduce((sum, s) => sum + (s.amount || 0), 0)
  const totalPending = totalDues - totalCollected
  const totalExpenses = filteredEvents.reduce((sum, e) => sum + (e.expenses || []).reduce((s, x) => s + (x.amount || 0), 0), 0)
  const balance = totalCollected - totalExpenses
  const cards = [
    { label: 'Total Dues', value: totalDues, color: 'text-rotary-slate dark:text-white/60' },
    { label: 'Collected', value: totalCollected, color: 'text-green-600 dark:text-green-400' },
    { label: 'Pending', value: totalPending, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Expenses', value: totalExpenses, color: 'text-red-500 dark:text-red-400' },
    { label: 'Balance', value: balance, color: balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
      {cards.map(c => (
        <div key={c.label} className="bg-white dark:bg-rotary-navy-light rounded-xl p-5 border border-gray-100 dark:border-white/5">
          <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">{c.label}</p>
          <p className={`text-2xl font-display font-bold ${c.color}`}>₹{c.value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}

// ── Members Dues Tab ──
const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque']

function MembersDues({ members, saveMember, removeMember, dateRange = {} }) {
  const { data: leaders } = useCollection('leaders')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'paid' | 'partial' | 'unpaid'
  const [deleteId, setDeleteId] = useState(null)
  const [editingMember, setEditingMember] = useState(null)
  const [editForm, setEditForm] = useState({ paid: 0, paymentDate: '', paymentMode: '', note: '' })

  const handleRemove = (id) => setDeleteId(id)
  const openEdit = (m) => {
    setEditingMember(m)
    setEditForm({ paid: m.paid || 0, paymentDate: m.paymentDate || '', paymentMode: m.paymentMode || '', note: m.note || '' })
  }
  const markPaid = async (id) => {
    const m = members.find(x => x.id === id)
    if (m) await saveMember({ ...m, paid: m.annualDue, paymentDate: m.paymentDate || new Date().toISOString().split('T')[0] })
  }

  const generateReceipt = (m) => {
    const isPaid = m.paid >= m.annualDue && m.annualDue > 0
    const rotaryYearStart = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1
    const rotaryYearEnd = rotaryYearStart + 1
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt - ${m.name}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; background: #f8f9fa; }
  .receipt { max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
  .header { background: linear-gradient(135deg, #d41367 0%, #a80f52 100%); color: white; padding: 32px; text-align: center; }
  .header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  .header p { margin: 0; opacity: 0.75; font-size: 13px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 14px; font-size: 12px; margin-top: 10px; }
  .body { padding: 32px; }
  .receipt-no { text-align: right; font-size: 12px; color: #999; margin-bottom: 20px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  .row:last-child { border-bottom: none; }
  .label { color: #666; }
  .value { font-weight: 600; color: #1a1a2e; }
  .amount-box { background: #fdf0f5; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
  .amount-box .amt { font-size: 36px; font-weight: 800; color: #d41367; }
  .amount-box .sub { font-size: 13px; color: #888; margin-top: 4px; }
  .status { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-left: 8px; }
  .paid { background: #d1fae5; color: #065f46; }
  .partial { background: #fef3c7; color: #92400e; }
  .footer { background: #f8f9fa; padding: 20px 32px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
</style></head><body>
  <div class="receipt">
    <div class="header">
      <h1>Rotaract Bengaluru BTM</h1>
      <p>Official Membership Due Receipt</p>
      <div class="badge">Rotary Year ${rotaryYearStart}–${rotaryYearEnd}</div>
    </div>
    <div class="body">
      <div class="receipt-no">Receipt #${Date.now().toString().slice(-6)}</div>
      <div class="row"><span class="label">Member Name</span><span class="value">${m.name}</span></div>
      <div class="row"><span class="label">Member Type</span><span class="value">${m.note || 'Member'}</span></div>
      <div class="row"><span class="label">Annual Due</span><span class="value">₹${(m.annualDue || 0).toLocaleString()}</span></div>
      <div class="row"><span class="label">Payment Date</span><span class="value">${m.paymentDate ? new Date(m.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not recorded'}</span></div>
      ${m.paymentMode ? `<div class="row"><span class="label">Payment Mode</span><span class="value">${m.paymentMode}</span></div>` : ''}
      <div class="amount-box">
        <div class="amt">₹${(m.paid || 0).toLocaleString()}</div>
        <div class="sub">Amount Paid <span class="status ${isPaid ? 'paid' : 'partial'}">${isPaid ? '✓ PAID' : 'PARTIAL'}</span></div>
      </div>
      ${(m.annualDue || 0) - (m.paid || 0) > 0 ? `<div class="row"><span class="label">Pending Balance</span><span class="value" style="color:#d97706">₹${((m.annualDue || 0) - (m.paid || 0)).toLocaleString()}</span></div>` : ''}
      ${m.note ? `<div class="row"><span class="label">Note</span><span class="value">${m.note}</span></div>` : ''}
    </div>
    <div class="footer">Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · Rotaract Club of Bengaluru BTM</div>
  </div>
</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${m.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const { from, to } = dateRange
  const rangeFiltered = (from || to) ? members.filter(m => m.paymentDate ? inRange(m.paymentDate, from, to) : false) : members

  const statusFiltered = rangeFiltered.filter(m => {
    if (statusFilter === 'all') return true
    const isPaid = m.paid >= m.annualDue && m.annualDue > 0
    const isPartial = m.paid > 0 && m.paid < m.annualDue
    if (statusFilter === 'paid') return isPaid
    if (statusFilter === 'partial') return isPartial
    if (statusFilter === 'unpaid') return !isPaid && !isPartial
    return true
  })

  const filtered = search
    ? statusFiltered.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : statusFiltered

  const totalDue = members.reduce((s, m) => s + (m.annualDue || 0), 0)
  const totalPaid = members.reduce((s, m) => s + (m.paid || 0), 0)

  // Status counts for filter badges
  const counts = {
    all: rangeFiltered.length,
    paid: rangeFiltered.filter(m => m.paid >= m.annualDue && m.annualDue > 0).length,
    partial: rangeFiltered.filter(m => m.paid > 0 && m.paid < m.annualDue).length,
    unpaid: rangeFiltered.filter(m => !(m.paid > 0)).length,
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rotary-slate dark:text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input className={`${inputClass} !pl-10`} placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => exportDuesCSV(filtered)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-rotary-charcoal dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export
        </button>
      </div>

      {/* ── Status filter pills ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all', label: 'All', color: 'bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60', active: 'bg-rotary-blue text-white' },
          { key: 'paid', label: 'Paid', color: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400', active: 'bg-green-600 text-white' },
          { key: 'partial', label: 'Partial', color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400', active: 'bg-amber-500 text-white' },
          { key: 'unpaid', label: 'Unpaid', color: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400', active: 'bg-red-500 text-white' },
        ].map(({ key, label, color, active }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${statusFilter === key ? active : color}`}
          >
            {label}
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${statusFilter === key ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Member</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Type</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Due</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Paid</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Status</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Payment Date</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Mode</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Receipt</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Note</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const isPaid = m.paid >= m.annualDue && m.annualDue > 0
                const isPartial = m.paid > 0 && m.paid < m.annualDue
                const leader = leaders.find(l => l.name?.toLowerCase() === m.name?.toLowerCase())
                const memberType = leader?.memberType === 'working' ? 'Working Professional' : 'Student'
                return (
                  <tr key={m.id} className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-medium">{m.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${memberType === 'Working Professional' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'}`}>{memberType}</span>
                    </td>
                    <td className="px-5 py-3 text-right">₹{(m.annualDue || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right">₹{(m.paid || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${isPaid ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' : isPartial ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                        {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/40">
                      {m.paymentDate ? new Date(m.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">
                      {m.paymentMode
                        ? <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 font-medium">{m.paymentMode}</span>
                        : <span className="text-rotary-slate dark:text-white/20">—</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {m.paid > 0 ? (
                        <button onClick={() => generateReceipt(m)} title="Download Receipt" className="w-7 h-7 rounded-lg bg-rotary-blue/10 text-rotary-blue flex items-center justify-center hover:bg-rotary-blue/20 transition-colors mx-auto">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </button>
                      ) : <span className="text-rotary-slate dark:text-white/20 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3 text-rotary-slate dark:text-white/40 text-xs">{m.note || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(m)} title="Edit payment" className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {!isPaid && (
                          <button onClick={() => markPaid(m.id)} title="Mark as Paid" className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        )}
                        <button onClick={() => handleRemove(m.id)} className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-5 py-10 text-center text-rotary-slate dark:text-white/30">No members found.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                <td className="px-5 py-3 font-semibold" colSpan={2}>Total ({members.length})</td>
                <td className="px-5 py-3 text-right font-semibold">₹{totalDue.toLocaleString()}</td>
                <td className="px-5 py-3 text-right font-semibold text-green-600 dark:text-green-400">₹{totalPaid.toLocaleString()}</td>
                <td colSpan={6} className="px-5 py-3 text-right text-sm text-rotary-slate dark:text-white/40">
                  Pending: <span className="font-semibold text-amber-600 dark:text-amber-400">₹{(totalDue - totalPaid).toLocaleString()}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <motion.div className="relative bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-white/10" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg mb-1">Remove Member?</h3>
              <p className="text-sm text-gray-400 dark:text-white/50 mb-6">This will permanently remove this member's dues record.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingMember && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingMember(null)} />
            <motion.div
              className="relative bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-white/10"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            >
              <h3 className="font-display font-bold text-lg mb-0.5">Edit Payment</h3>
              <p className="text-sm text-gray-400 dark:text-white/40 mb-5">
                {editingMember.name} · Due: ₹{(editingMember.annualDue || 0).toLocaleString()}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Amount Paid (₹)</label>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max={editingMember.annualDue}
                    value={editForm.paid || ''}
                    onChange={e => setEditForm({ ...editForm, paid: parseInt(e.target.value) || 0 })}
                  />
                  {editForm.paid > 0 && editForm.paid < editingMember.annualDue && (
                    <p className="text-xs text-amber-500 mt-1">
                      Partial — ₹{(editingMember.annualDue - editForm.paid).toLocaleString()} still pending
                    </p>
                  )}
                  {editForm.paid >= editingMember.annualDue && editingMember.annualDue > 0 && (
                    <p className="text-xs text-green-600 mt-1">✓ Fully paid</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Payment Date</label>
                  <input
                    className={inputClass}
                    type="date"
                    value={editForm.paymentDate}
                    onChange={e => setEditForm({ ...editForm, paymentDate: e.target.value })}
                  />
                </div>

                {/* ── Payment Mode ── */}
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Payment Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_MODES.map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, paymentMode: editForm.paymentMode === mode ? '' : mode })}
                        className={`py-2 rounded-lg border text-xs font-semibold transition-colors ${
                          editForm.paymentMode === mode
                            ? 'border-rotary-blue bg-rotary-blue/10 text-rotary-blue dark:text-rotary-blue'
                            : 'border-gray-200 dark:border-white/10 text-rotary-slate dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Note</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. reference no., collected by, etc."
                    value={editForm.note}
                    onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await saveMember({ ...editingMember, ...editForm })
                    setEditingMember(null)
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue/90 transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Event Expenses Tab ──
function EventExpenses({ eventLedger, saveEvent, removeEvent, dateRange = {}, projects = [] }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandedEvent, setExpandedEvent] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ eventName: '', date: '', budget: 0, income: 0 })
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: 0, category: 'Venue', paidBy: '' })
  const [paymentForms, setPaymentForms] = useState({})
  const [expandedExpense, setExpandedExpense] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const expenseCategories = ['Venue', 'Food & Beverages', 'Transport', 'Printing', 'Decoration', 'Equipment', 'Donation', 'Miscellaneous']

  const resetForm = () => { setForm({ eventName: '', date: '', budget: 0, income: 0 }); setEditingId(null); setShowForm(false) }
  const resetExpenseForm = () => setExpenseForm({ description: '', amount: 0, category: 'Venue', paidBy: '' })

  const handleSaveEvent = async () => {
    if (!form.eventName) return
    if (editingId) {
      const existing = eventLedger.find(e => e.id === editingId)
      await saveEvent({ ...existing, eventName: form.eventName, date: form.date, budget: form.budget, income: form.income || 0 })
    } else {
      await saveEvent({ id: Date.now().toString(), eventName: form.eventName, date: form.date, budget: form.budget, income: form.income || 0, expenses: [] })
    }
    resetForm()
  }

  const handleEditEvent = (ev) => {
    setForm({ eventName: ev.eventName, date: ev.date || '', budget: ev.budget || 0, income: ev.income || 0 })
    setEditingId(ev.id)
    setShowForm(true)
  }

  const handleRemoveEvent = (id) => setDeleteId(id)

  const addExpense = async (eventId) => {
    if (!expenseForm.description || !expenseForm.amount) return
    const ev = eventLedger.find(e => e.id === eventId)
    if (!ev) return
    const newExp = {
      ...expenseForm,
      id: Date.now().toString(),
      totalAmount: expenseForm.amount,
      payments: [{ id: Date.now().toString() + '_p', amount: expenseForm.amount, date: new Date().toISOString().split('T')[0], note: 'Initial payment' }]
    }
    await saveEvent({ ...ev, expenses: [...(ev.expenses || []), newExp] })
    resetExpenseForm()
  }

  const removeExpense = async (eventId, expId) => {
    const ev = eventLedger.find(e => e.id === eventId)
    if (!ev) return
    await saveEvent({ ...ev, expenses: (ev.expenses || []).filter(x => x.id !== expId) })
  }

  const addPayment = async (eventId, expId, payment) => {
    const ev = eventLedger.find(e => e.id === eventId)
    if (!ev) return
    const updatedExpenses = (ev.expenses || []).map(x => {
      if (x.id !== expId) return x
      const newPayments = [...(x.payments || []), { ...payment, id: Date.now().toString() + '_p' }]
      return { ...x, payments: newPayments, amount: newPayments.reduce((s, p) => s + (p.amount || 0), 0) }
    })
    await saveEvent({ ...ev, expenses: updatedExpenses })
  }

  const removePayment = async (eventId, expId, payId) => {
    const ev = eventLedger.find(e => e.id === eventId)
    if (!ev) return
    const updatedExpenses = (ev.expenses || []).map(x => {
      if (x.id !== expId) return x
      const newPayments = (x.payments || []).filter(p => p.id !== payId)
      return { ...x, payments: newPayments, amount: newPayments.reduce((s, p) => s + (p.amount || 0), 0) }
    })
    await saveEvent({ ...ev, expenses: updatedExpenses })
  }

  const exportExpensesCSV = () => {
    const headers = ['Project', 'Date', 'Income (₹)', 'Description', 'Category', 'Paid By', 'Expense (₹)']
    const rows = []
    eventLedger.forEach(ev => {
      const totalExp = (ev.expenses || []).reduce((s, x) => s + (x.amount || 0), 0)
      const net = (ev.income || 0) - totalExp
        ; (ev.expenses || []).forEach(exp => {
          rows.push([`"${ev.eventName}"`, ev.date ? new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '', ev.income || 0, `"${exp.description}"`, exp.category, `"${exp.paidBy || ''}"`, exp.amount || 0].join(','))
        })
      rows.push([`"${ev.eventName} — TOTAL"`, '', ev.income || 0, '', '', '', totalExp].join(','))
      rows.push([`"${ev.eventName} — NET"`, '', '', '', '', '', net].join(','))
      rows.push(['', '', '', '', '', '', ''].join(','))
    })
    const grandIncome = eventLedger.reduce((s, e) => s + (e.income || 0), 0)
    const grandExpenses = eventLedger.reduce((s, e) => s + (e.expenses || []).reduce((ss, x) => ss + (x.amount || 0), 0), 0)
    rows.push(['"GRAND TOTAL"', '', grandIncome, '', '', '', grandExpenses].join(','))
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rotaract-expenses-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const { from, to } = dateRange
  const rangeFiltered = (from || to) ? eventLedger.filter(e => inRange(e.date, from, to)) : eventLedger
  const filtered = search ? rangeFiltered.filter(e => e.eventName.toLowerCase().includes(search.toLowerCase())) : rangeFiltered

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rotary-slate dark:text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input className={`${inputClass} !pl-10`} placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={exportExpensesCSV} disabled={eventLedger.length === 0} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-rotary-charcoal dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0 disabled:opacity-40">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export
        </button>
        <button onClick={() => { if (showForm && !editingId) resetForm(); else { resetForm(); setShowForm(true) } }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} /></svg>
          {showForm ? 'Cancel' : 'Add Project'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="mb-6 bg-white dark:bg-rotary-navy-light rounded-xl p-5 border border-gray-100 dark:border-white/5" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <h4 className="font-display font-semibold mb-4">{editingId ? 'Edit Project' : 'New Project Ledger'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Project *</label>
                <select className={inputClass} value={form.eventName} onChange={e => setForm({ ...form, eventName: e.target.value })}>
                  <option value="">Select a project…</option>
                  {form.eventName && !projects.find(p => p.title === form.eventName) && (
                    <option value={form.eventName}>{form.eventName} (old record)</option>
                  )}
                  {projects.map(p => (
                    <option key={p.id} value={p.title}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Date</label>
                <input className={inputClass} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Budget / Total Cost (₹)</label>
                <input className={inputClass} type="number" min="0" value={form.budget || ''} onChange={e => setForm({ ...form, budget: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Income Received (₹)</label>
                <input className={inputClass} type="number" min="0" placeholder="Ticket sales, collections, entry fees…" value={form.income || ''} onChange={e => setForm({ ...form, income: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSaveEvent} disabled={!form.eventName} className="px-5 py-2 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm disabled:opacity-50 transition-colors">{editingId ? 'Save' : 'Add Project'}</button>
              {editingId && <button onClick={resetForm} className="px-5 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm">Cancel</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Project</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Date</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Budget</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Income</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Expenses</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Net</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Items</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ev => {
                const totalSpent = (ev.expenses || []).reduce((s, x) => s + (x.amount || 0), 0)
                const totalIncome = ev.income || 0
                const net = totalIncome - totalSpent
                const overBudget = ev.budget > 0 && totalSpent > ev.budget
                const isExpanded = expandedEvent === ev.id
                return (
                  <React.Fragment key={ev.id}>
                    <tr onClick={() => setExpandedEvent(isExpanded ? null : ev.id)} className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 text-rotary-slate dark:text-white/30 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          <span className="font-semibold">{ev.eventName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/40">
                        {ev.date ? new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right text-rotary-slate dark:text-white/40">
                        {ev.budget > 0 ? `₹${ev.budget.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-green-600 dark:text-green-400">
                        {totalIncome > 0 ? `₹${totalIncome.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold ${overBudget ? 'text-red-500' : 'text-rotary-charcoal dark:text-white'}`}>
                          ₹{totalSpent.toLocaleString()}
                        </span>
                        {overBudget && <span className="ml-1.5 text-xs text-red-400">over</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                          {net >= 0 ? '+' : ''}₹{net.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/5 text-rotary-slate dark:text-white/50">
                          {(ev.expenses || []).length}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleEditEvent(ev)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleRemoveEvent(ev.id)} className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${ev.id}-exp`} className="bg-gray-50 dark:bg-white/[0.02]">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="flex items-center gap-6 mb-4 px-1 text-sm">
                            <span className="text-green-600 dark:text-green-400 font-semibold">↑ Income: ₹{totalIncome.toLocaleString()}</span>
                            <span className="text-red-500 font-semibold">↓ Expenses: ₹{totalSpent.toLocaleString()}</span>
                            <span className={`font-bold ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>Net: {net >= 0 ? '+' : ''}₹{net.toLocaleString()}</span>
                          </div>

                          {ev.budget > 0 && (
                            <div className="mb-4 max-w-sm">
                              <div className="flex justify-between text-xs mb-1 text-rotary-slate dark:text-white/40">
                                <span>Budget used</span>
                                <span className={overBudget ? 'text-red-500 font-semibold' : ''}>{Math.round((totalSpent / ev.budget) * 100)}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                                <div className={`h-full rounded-full ${overBudget ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((totalSpent / ev.budget) * 100, 100)}%` }} />
                              </div>
                            </div>
                          )}

                          {(ev.expenses || []).length > 0 ? (
                            <div className="mb-4 space-y-2">
                              {(ev.expenses || []).map(exp => {
                                const totalPaid = (exp.payments || []).reduce((s, p) => s + (p.amount || 0), 0)
                                const totalAmount = exp.totalAmount || exp.amount || 0
                                const isFullyPaid = totalPaid >= totalAmount && totalAmount > 0
                                const isPartial = totalPaid > 0 && totalPaid < totalAmount
                                const isExpExp = expandedExpense === exp.id
                                const pForm = paymentForms[exp.id] || { amount: 0, date: new Date().toISOString().split('T')[0], note: '' }
                                return (
                                  <div key={exp.id} className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                    <div className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-white/[0.02] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]" onClick={() => setExpandedExpense(isExpExp ? null : exp.id)}>
                                      <svg className={`w-3.5 h-3.5 text-rotary-slate dark:text-white/30 transition-transform shrink-0 ${isExpExp ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{exp.description}</p>
                                        <p className="text-xs text-rotary-slate dark:text-white/30">{exp.category}{exp.paidBy ? ` · ${exp.paidBy}` : ''}</p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className="text-sm font-semibold">₹{totalPaid.toLocaleString()}<span className="text-rotary-slate dark:text-white/30 font-normal"> / ₹{totalAmount.toLocaleString()}</span></p>
                                        <span className={`text-xs font-medium ${isFullyPaid ? 'text-green-600 dark:text-green-400' : isPartial ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}>
                                          {isFullyPaid ? 'Fully Paid' : isPartial ? `₹${(totalAmount - totalPaid).toLocaleString()} pending` : 'Unpaid'}
                                        </span>
                                      </div>
                                      <button onClick={e => { e.stopPropagation(); removeExpense(ev.id, exp.id) }} className="w-6 h-6 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center transition-colors shrink-0">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                    </div>
                                    <AnimatePresence>
                                      {isExpExp && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                          <div className="border-t border-gray-100 dark:border-white/5 px-3 py-3 bg-gray-50 dark:bg-white/[0.01]">
                                            {totalAmount > 0 && (
                                              <div className="mb-3">
                                                <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                                                  <div className={`h-full rounded-full ${isFullyPaid ? 'bg-green-500' : isPartial ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${Math.min((totalPaid / totalAmount) * 100, 100)}%` }} />
                                                </div>
                                                <p className="text-xs text-rotary-slate dark:text-white/30 mt-1">{Math.round((totalPaid / totalAmount) * 100)}% paid</p>
                                              </div>
                                            )}
                                            {(exp.payments || []).length > 0 ? (
                                              <div className="mb-2">
                                                {(exp.payments || []).map((p, pi) => (
                                                  <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-white/5 last:border-0">
                                                    <span className="w-5 h-5 rounded-full bg-rotary-blue/10 text-rotary-blue text-xs flex items-center justify-center font-semibold shrink-0">{pi + 1}</span>
                                                    <div className="flex-1 min-w-0">
                                                      <p className="text-xs font-medium">₹{(p.amount || 0).toLocaleString()}</p>
                                                      <p className="text-xs text-rotary-slate dark:text-white/30">{p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}{p.note ? ` · ${p.note}` : ''}</p>
                                                    </div>
                                                    <button onClick={() => removePayment(ev.id, exp.id, p.id)} className="w-5 h-5 rounded text-red-400 hover:text-red-600 flex items-center justify-center transition-colors shrink-0">
                                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : <p className="text-xs text-rotary-slate dark:text-white/30 mb-2">No payments recorded yet.</p>}
                                            {!isFullyPaid && (
                                              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
                                                <p className="text-xs font-medium text-rotary-slate dark:text-white/40 mb-2">Add Payment Instalment</p>
                                                <div className="grid grid-cols-3 gap-2">
                                                  <input className={inputClass} type="number" min="0" placeholder="Amount (₹) *" value={pForm.amount || ''} onChange={e => setPaymentForms(pf => ({ ...pf, [exp.id]: { ...pForm, amount: parseInt(e.target.value) || 0 } }))} />
                                                  <input className={inputClass} type="date" value={pForm.date} onChange={e => setPaymentForms(pf => ({ ...pf, [exp.id]: { ...pForm, date: e.target.value } }))} />
                                                  <input className={inputClass} placeholder="Note (optional)" value={pForm.note} onChange={e => setPaymentForms(pf => ({ ...pf, [exp.id]: { ...pForm, note: e.target.value } }))} />
                                                </div>
                                                <button onClick={() => { if (!pForm.amount) return; addPayment(ev.id, exp.id, pForm); setPaymentForms(pf => ({ ...pf, [exp.id]: { amount: 0, date: new Date().toISOString().split('T')[0], note: '' } })) }} disabled={!pForm.amount} className="mt-2 px-4 py-1.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-xs disabled:opacity-50 hover:bg-rotary-gold-light transition-colors">+ Add Instalment</button>
                                              </div>
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )
                              })}
                            </div>
                          ) : <p className="text-sm text-rotary-slate dark:text-white/30 mb-4">No expenses yet. Add one below.</p>}

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end pt-2 border-t border-gray-200 dark:border-white/10">
                            <input className={inputClass} placeholder="Description *" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                            <select className={inputClass} value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                              {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input className={inputClass} placeholder="Paid by" value={expenseForm.paidBy} onChange={e => setExpenseForm({ ...expenseForm, paidBy: e.target.value })} />
                            <input className={inputClass} type="number" min="0" placeholder="Amount (₹) *" value={expenseForm.amount || ''} onChange={e => setExpenseForm({ ...expenseForm, amount: parseInt(e.target.value) || 0 })} />
                            <button onClick={() => addExpense(ev.id)} disabled={!expenseForm.description || !expenseForm.amount} className="px-4 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm disabled:opacity-50 hover:bg-rotary-gold-light transition-colors">+ Add</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-rotary-slate dark:text-white/30">No projects yet. Create one to start tracking.</td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                  <td className="px-5 py-3 font-semibold" colSpan={2}>Total ({filtered.length} projects)</td>
                  <td className="px-5 py-3 text-right text-rotary-slate dark:text-white/40">—</td>
                  <td className="px-5 py-3 text-right font-semibold text-green-600 dark:text-green-400">₹{filtered.reduce((s, e) => s + (e.income || 0), 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-semibold text-rotary-blue">₹{filtered.reduce((s, e) => s + (e.expenses || []).reduce((ss, x) => ss + (x.amount || 0), 0), 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-bold">
                    {(() => {
                      const totInc = filtered.reduce((s, e) => s + (e.income || 0), 0)
                      const totExp = filtered.reduce((s, e) => s + (e.expenses || []).reduce((ss, x) => ss + (x.amount || 0), 0), 0)
                      const n = totInc - totExp
                      return <span className={n >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{n >= 0 ? '+' : ''}₹{n.toLocaleString()}</span>
                    })()}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <motion.div className="relative bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-white/10" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg mb-1">Remove Project?</h3>
              <p className="text-sm text-gray-400 dark:text-white/50 mb-6">This will permanently remove this project and all its expenses.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={async () => { await removeEvent(deleteId); setDeleteId(null) }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Remove</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Date Range Filter ──
function DateRangeFilter({ dateRange, setDateRange }) {
  const presets = [
    { label: 'All Time', from: '', to: '' },
    { label: 'This Month', from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0] },
    { label: 'Last 3 Months', from: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
    { label: 'This Year', from: `${new Date().getFullYear()}-01-01`, to: `${new Date().getFullYear()}-12-31` },
    { label: 'Rotary Year', from: `${new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1}-07-01`, to: `${new Date().getMonth() >= 6 ? new Date().getFullYear() + 1 : new Date().getFullYear()}-06-30` }
  ]
  const activePreset = presets.find(p => p.from === dateRange.from && p.to === dateRange.to)
  return (
    <div className="mb-8 bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <svg className="w-4 h-4 text-rotary-slate dark:text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-sm font-medium text-rotary-charcoal dark:text-white">Date Range</span>
        </div>
        <div className="flex flex-wrap gap-2 flex-1">
          {presets.map(p => (
            <button key={p.label} onClick={() => setDateRange({ from: p.from, to: p.to })} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activePreset?.label === p.label ? 'bg-rotary-blue text-white' : 'bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10'}`}>{p.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input type="date" value={dateRange.from} onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-rotary-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-rotary-blue/30" />
          <span className="text-xs text-rotary-slate dark:text-white/30">to</span>
          <input type="date" value={dateRange.to} onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-rotary-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-rotary-blue/30" />
          {(dateRange.from || dateRange.to) && (
            <button onClick={() => setDateRange({ from: '', to: '' })} className="px-2 py-1.5 rounded-lg text-xs text-rotary-slate dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">✕</button>
          )}
        </div>
      </div>
      {(dateRange.from || dateRange.to) && (
        <p className="text-xs text-rotary-slate dark:text-white/40 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
          Showing: <span className="font-medium text-rotary-charcoal dark:text-white">{dateRange.from ? new Date(dateRange.from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Beginning'}{' → '}{dateRange.to ? new Date(dateRange.to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}</span>
        </p>
      )}
    </div>
  )
}

// ── Sponsorships ──
function Sponsorships({ sponsorships, saveSponsorship, removeSponsorship, dateRange = {} }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ sponsor: '', amount: 0, date: '', type: 'Cash', note: '' })
  const [deleteId, setDeleteId] = useState(null)
  const types = ['Cash', 'In-Kind', 'Venue', 'Food', 'Prize', 'Other']

  const resetForm = () => { setForm({ sponsor: '', amount: 0, date: '', type: 'Cash', note: '' }); setEditingId(null); setShowForm(false) }

  const handleSave = async () => {
    if (!form.sponsor || !form.amount) return
    const id = editingId || Date.now().toString()
    await saveSponsorship({ ...form, id })
    resetForm()
  }

  const handleEdit = (s) => {
    setForm({ sponsor: s.sponsor, amount: s.amount || 0, date: s.date || '', type: s.type || 'Cash', note: s.note || '' })
    setEditingId(s.id)
    setShowForm(true)
  }

  const handleRemove = (id) => setDeleteId(id)

  const exportCSV = () => {
    const headers = ['Sponsor', 'Type', 'Date', 'Amount (₹)', 'Note']
    const rows = sponsorships.map(s => [`"${s.sponsor}"`, s.type, s.date ? new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '', s.amount || 0, `"${s.note || ''}"`].join(','))
    const total = sponsorships.reduce((sum, s) => sum + (s.amount || 0), 0)
    rows.push(['"TOTAL"', '', '', total, ''].join(','))
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rotaract-sponsorships-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const { from, to } = dateRange
  const filtered = (from || to) ? sponsorships.filter(s => inRange(s.date, from, to)) : sponsorships
  const total = filtered.reduce((s, x) => s + (x.amount || 0), 0)

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <p className="text-sm text-rotary-slate dark:text-white/40">{filtered.length} sponsorship{filtered.length !== 1 ? 's' : ''} · Total: <span className="font-semibold text-green-600 dark:text-green-400">₹{total.toLocaleString()}</span></p>
        </div>
        <button onClick={exportCSV} disabled={sponsorships.length === 0} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-rotary-charcoal dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0 disabled:opacity-40">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export
        </button>
        <button onClick={() => { if (showForm && !editingId) resetForm(); else { resetForm(); setShowForm(true) } }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} /></svg>
          {showForm ? 'Cancel' : 'Add Sponsorship'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="mb-6 bg-white dark:bg-rotary-navy-light rounded-xl p-5 border border-gray-100 dark:border-white/5" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <h4 className="font-display font-semibold mb-4">{editingId ? 'Edit Sponsorship' : 'New Sponsorship'}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input className={inputClass} placeholder="Sponsor Name *" value={form.sponsor} onChange={e => setForm({ ...form, sponsor: e.target.value })} />
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Amount (₹) *</label>
                <input className={inputClass} type="number" min="0" value={form.amount || ''} onChange={e => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} />
              </div>
              <select className={inputClass} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Date Received</label>
                <input className={inputClass} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <input className={inputClass} placeholder="Note / Event linked (optional)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={!form.sponsor || !form.amount} className="px-5 py-2 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm disabled:opacity-50 transition-colors">{editingId ? 'Save' : 'Add'}</button>
              {editingId && <button onClick={resetForm} className="px-5 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm">Cancel</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Sponsor</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Type</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Date</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Amount</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Note</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 font-medium">{s.sponsor}</td>
                  <td className="px-5 py-3"><span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400">{s.type}</span></td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/40">{s.date ? new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-green-600 dark:text-green-400">₹{(s.amount || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/40">{s.note || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => handleEdit(s)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleRemove(s.id)} className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-rotary-slate dark:text-white/30">No sponsorships recorded yet.</td></tr>}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                <td className="px-5 py-3 font-semibold" colSpan={3}>Total ({filtered.length})</td>
                <td className="px-5 py-3 text-right font-bold text-green-600 dark:text-green-400">₹{total.toLocaleString()}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <motion.div className="relative bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-white/10" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg mb-1">Remove Sponsorship?</h3>
              <p className="text-sm text-gray-400 dark:text-white/50 mb-6">This will permanently remove this sponsorship record.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={async () => { await removeSponsorship(deleteId); setDeleteId(null) }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Remove</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Balance Sheet ──
function BalanceSheet({ members, eventLedger, sponsorships = [], dateRange = {} }) {
  const { from, to } = dateRange
  const filteredMembers = (from || to) ? members.filter(m => m.paymentDate ? inRange(m.paymentDate, from, to) : false) : members
  const filteredEvents = (from || to) ? eventLedger.filter(e => inRange(e.date, from, to)) : eventLedger
  const filteredSponsorships = (from || to) ? sponsorships.filter(s => inRange(s.date, from, to)) : sponsorships

  const totalDues = members.reduce((s, m) => s + (m.annualDue || 0), 0)
  const totalCollected = filteredMembers.reduce((s, m) => s + (m.paid || 0), 0)
  const totalPending = totalDues - totalCollected
  const totalSponsorships = filteredSponsorships.reduce((s, x) => s + (x.amount || 0), 0)

  const eventTotals = filteredEvents.map(ev => ({
    name: ev.eventName,
    date: ev.date,
    budget: ev.budget || 0,
    income: ev.income || 0,
    spent: (ev.expenses || []).reduce((s, x) => s + (x.amount || 0), 0),
    breakdown: Object.entries((ev.expenses || []).reduce((acc, x) => { acc[x.category] = (acc[x.category] || 0) + (x.amount || 0); return acc }, {}))
  }))

  const totalEventIncome = eventTotals.reduce((s, e) => s + e.income, 0)
  const totalExpenses = eventTotals.reduce((s, e) => s + e.spent, 0)
  const totalIncome = totalCollected + totalSponsorships + totalEventIncome
  const balance = totalIncome - totalExpenses
  const isPositive = balance >= 0

  const exportBalanceCSV = () => {
    const rows = []
    rows.push(['"INCOME"', '', ''].join(','))
    rows.push(['"Membership Dues Collected"', '', totalCollected].join(','))
    if (totalSponsorships > 0) rows.push(['"Total Sponsorships"', '', totalSponsorships].join(','))
    if (totalEventIncome > 0) rows.push(['"Project Income (ticket sales etc.)"', '', totalEventIncome].join(','))
    rows.push(['"Total Income"', '', totalIncome].join(','))
    rows.push(['', '', ''].join(','))
    rows.push(['"EXPENSES"', '', ''].join(','))
    eventTotals.forEach(ev => {
      rows.push([`"${ev.name}"`, `"${ev.date ? new Date(ev.date).toLocaleDateString('en-IN') : ''}"`, ev.spent].join(','))
      ev.breakdown.forEach(([cat, amt]) => rows.push([`"  — ${cat}"`, '', amt].join(',')))
    })
    rows.push(['"Total Expenses"', '', totalExpenses].join(','))
    rows.push(['', '', ''].join(','))
    rows.push([`"${isPositive ? 'NET SURPLUS' : 'NET DEFICIT'}"`, '', balance].join(','))
    const csv = '\uFEFF' + ['"Description","Date","Amount (₹)"', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rotaract-balance-sheet-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg">Balance Sheet</h2>
          <p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">Financial summary</p>
        </div>
        <button onClick={exportBalanceCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-rotary-charcoal dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export
        </button>
      </div>

      <div className={`rounded-2xl p-6 flex items-center justify-between ${isPositive ? 'bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20' : 'bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20'}`}>
        <div>
          <p className="text-sm font-medium text-rotary-slate dark:text-white/50 mb-1">{isPositive ? 'Net Surplus' : 'Net Deficit'}</p>
          <p className={`text-4xl font-display font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{isPositive ? '+' : ''}₹{balance.toLocaleString()}</p>
          <p className="text-xs text-rotary-slate dark:text-white/40 mt-1">₹{totalIncome.toLocaleString()} income − ₹{totalExpenses.toLocaleString()} expenses</p>
        </div>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-100 dark:bg-green-500/20' : 'bg-red-100 dark:bg-red-500/20'}`}>
          <svg className={`w-8 h-8 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPositive ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'} /></svg>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <h3 className="font-display font-semibold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Income</h3>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">₹{totalIncome.toLocaleString()}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-50 dark:border-white/[0.03]">
                <td className="px-5 py-3"><p className="font-medium">Membership Dues</p><p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">{filteredMembers.filter(m => m.paid >= m.annualDue && m.annualDue > 0).length} paid · {filteredMembers.filter(m => m.paid > 0 && m.paid < m.annualDue).length} partial</p></td>
                <td className="px-5 py-3 text-right font-semibold text-green-600 dark:text-green-400">₹{totalCollected.toLocaleString()}</td>
              </tr>
              {filteredSponsorships.length > 0 && (
                <tr className="border-b border-gray-50 dark:border-white/[0.03]">
                  <td className="px-5 py-3"><p className="font-medium">Sponsorships</p><p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">{filteredSponsorships.length} sponsor{filteredSponsorships.length !== 1 ? 's' : ''}</p></td>
                  <td className="px-5 py-3 text-right font-semibold text-green-600 dark:text-green-400">₹{totalSponsorships.toLocaleString()}</td>
                </tr>
              )}
              {totalEventIncome > 0 && (
                <tr className="border-b border-gray-50 dark:border-white/[0.03]">
                  <td className="px-5 py-3"><p className="font-medium">Project Income</p><p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">Ticket sales, collections, entry fees</p></td>
                  <td className="px-5 py-3 text-right font-semibold text-green-600 dark:text-green-400">₹{totalEventIncome.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                <td className="px-5 py-3 font-semibold text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40">Total Income</td>
                <td className="px-5 py-3 text-right font-bold text-green-600 dark:text-green-400">₹{totalIncome.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          {totalPending > 0 && (
            <div className="mx-5 mb-4 mt-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex items-center justify-between">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Pending dues (not yet collected)</p>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">₹{totalPending.toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <h3 className="font-display font-semibold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Expenses</h3>
            <span className="text-sm font-bold text-red-500">₹{totalExpenses.toLocaleString()}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {eventTotals.length === 0 && <tr><td colSpan={3} className="px-5 py-8 text-center text-rotary-slate dark:text-white/30 text-xs">No expenses recorded.</td></tr>}
              {eventTotals.map((ev, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-white/[0.03]">
                  <td className="px-5 py-3">
                    <p className="font-medium">{ev.name}</p>
                    {ev.breakdown.length > 0 && <p className="text-xs text-rotary-slate dark:text-white/30 mt-0.5">{ev.breakdown.map(([cat]) => cat).join(' · ')}</p>}
                    {ev.income > 0 && <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Income: ₹{ev.income.toLocaleString()}</p>}
                  </td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/40">{ev.date ? new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-red-500">₹{ev.spent.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                <td className="px-5 py-3 font-semibold text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40" colSpan={2}>Total Expenses</td>
                <td className="px-5 py-3 text-right font-bold text-red-500">₹{totalExpenses.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ──
export default function TreasurerDashboard({ onBack, isAdmin }) {
  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-rotary-navy">
      <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="font-display font-bold text-xl text-gray-800 dark:text-white mb-1">Access Restricted</h2>
      <p className="text-sm text-gray-400">Admin login required to view this page.</p>
      <button onClick={onBack} className="mt-6 btn-primary !py-2 !px-6 text-sm !rounded-xl">Go Back</button>
    </div>
  )

  const [activeTab, setActiveTab] = useState('dues')
  const [showRateEdit, setShowRateEdit] = useState(false)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  const { data: leaders } = useCollection('leaders')
  const { data: members, loading: membersLoading, save: saveMember, remove: removeMember } = useCollection('treasurer_members')
  const { data: eventLedger, loading: eventsLoading, save: saveEvent, remove: removeEvent } = useCollection('treasurer_events')
  const { data: sponsorships, loading: sponsorshipsLoading, save: saveSponsorship, remove: removeSponsorship } = useCollection('treasurer_sponsorships')
  const { data: dueRates, save: saveDueRates } = useDocument('settings', 'due_rates', { student: 1000, working: 2500 })
  const { data: projects = [] } = useCollection('projects')

  const loading = membersLoading || eventsLoading || sponsorshipsLoading

  useEffect(() => {
    if (membersLoading || leaders.length === 0) return
    const leaderNames = leaders.map(l => l.name?.toLowerCase())
    const memberNames = members.map(m => m.name?.toLowerCase())
    const newMembers = leaders.filter(l => !memberNames.includes(l.name?.toLowerCase()))
    newMembers.forEach(leader => {
      saveMember({
        id: `team_${leader.id}`,
        name: leader.name,
        annualDue: leader.memberType === 'working' ? (dueRates.working || 2500) : (dueRates.student || 1000),
        paid: 0, paymentDate: '',
        note: leader.team === 'bod' ? 'Board of Directors' : leader.team === 'core' ? 'Core Team' : 'Member'
      })
    })
    const toRemove = members.filter(m => !leaderNames.includes(m.name?.toLowerCase()))
    toRemove.forEach(m => removeMember(m.id))
  }, [membersLoading, leaders, members, dueRates, saveMember, removeMember])

  const applyRatesToAll = async () => {
    await Promise.all(
      members.map(m => {
        const leader = leaders.find(l => l.name?.toLowerCase() === m.name?.toLowerCase())
        const type = leader?.memberType || 'student'
        return saveMember({ ...m, annualDue: type === 'working' ? dueRates.working : dueRates.student })
      })
    )
    setShowRateEdit(false)
  }

  const tabs = [
    { id: 'dues', label: 'Members Dues', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'expenses', label: 'Event Expenses', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { id: 'sponsorships', label: 'Sponsorships', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'balance', label: 'Balance Sheet', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-3">
            <button onClick={onBack} className="mt-6 p-2.5 rounded-xl border border-gray-200 hover:bg-white transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4006d] animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4006d]">Treasurer Dashboard</p>
              </div>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal dark:text-white">Treasurer Report</h2>
              <p className="text-sm text-gray-400 dark:text-white/40 mt-1.5">Rotaract Club · Bengaluru BTM</p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-rotary-blue/30 border-t-rotary-blue rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <SummaryCards members={members} events={eventLedger} sponsorships={sponsorships} dateRange={dateRange} />

            <div className="mb-8 bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display font-semibold text-sm">Standard Annual Dues</h3>
                <button onClick={() => setShowRateEdit(!showRateEdit)} className="text-xs font-medium text-rotary-blue hover:underline">{showRateEdit ? 'Done' : 'Edit Rates'}</button>
              </div>
              {showRateEdit ? (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Student (₹/year)</label>
                    <input className={inputClass} type="number" min="0" value={dueRates.student} onChange={e => saveDueRates({ ...dueRates, student: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Working Professional (₹/year)</label>
                    <input className={inputClass} type="number" min="0" value={dueRates.working} onChange={e => saveDueRates({ ...dueRates, working: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-2">
                    <button onClick={applyRatesToAll} className="px-5 py-2 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm hover:bg-rotary-gold-light transition-colors">Apply to All Members</button>
                    <p className="text-xs text-rotary-slate dark:text-white/30 mt-2">Updates dues for all members based on their Student/Working status.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-sm text-rotary-slate dark:text-white/50">Student: <span className="font-semibold text-rotary-charcoal dark:text-white">₹{(dueRates.student || 0).toLocaleString()}</span>/year</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm text-rotary-slate dark:text-white/50">Working: <span className="font-semibold text-rotary-charcoal dark:text-white">₹{(dueRates.working || 0).toLocaleString()}</span>/year</span>
                  </div>
                </div>
              )}
            </div>

            <DateRangeFilter dateRange={dateRange} setDateRange={setDateRange} />

            <div className="flex overflow-x-auto gap-2 mb-8 border-b border-gray-100 dark:border-white/5 pb-px">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-white dark:bg-rotary-navy-light border border-gray-100 dark:border-white/5 border-b-white dark:border-b-rotary-navy-light -mb-px text-rotary-blue' : 'text-rotary-slate dark:text-white/40 hover:text-rotary-charcoal dark:hover:text-white/60'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'dues' && <MembersDues members={members} saveMember={saveMember} removeMember={removeMember} dateRange={dateRange} />}
            {activeTab === 'expenses' && <EventExpenses eventLedger={eventLedger} saveEvent={saveEvent} removeEvent={removeEvent} dateRange={dateRange} projects={projects} />}
            {activeTab === 'sponsorships' && <Sponsorships sponsorships={sponsorships} saveSponsorship={saveSponsorship} removeSponsorship={removeSponsorship} dateRange={dateRange} />}
            {activeTab === 'balance' && <BalanceSheet members={members} eventLedger={eventLedger} sponsorships={sponsorships} dateRange={dateRange} />}
          </>
        )}
      </div>
    </div>
  )
}
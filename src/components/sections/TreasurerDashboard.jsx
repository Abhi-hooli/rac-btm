import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection, useDocument } from '../../hooks/useFirestore'
import {
  PAYMENT_MODES, INCOME_CATEGORIES, EXPENSE_CATEGORIES, inRange,
  DEFAULT_FORECAST, resolveApprovedBudget,
} from './treasurerShared'
import TreasurerReports from './TreasurerReports'

const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

function exportDuesCSV(members, leaders) {
  const headers =['#', 'Member Name', 'Type', 'Board Role', 'Email', 'Phone', 'Annual Due (₹)', 'Paid (₹)', 'Balance (₹)', 'Status', 'Progress', 'Payment Date', 'Payment Mode', 'Remarks']
  const rows = members.map((m, i) => {
    const balance = (m.annualDue || 0) - (m.paid || 0)
    const isPaid = m.paid >= m.annualDue && m.annualDue > 0
    const isPartial = m.paid > 0 && m.paid < m.annualDue
    const status = isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'
    const progress = isPaid ? 'Completed' : isPartial ? 'Partial' : 'Not Started'
    const leader = leaders.find(l => l.name?.toLowerCase() === m.name?.toLowerCase())
    const type = leader?.memberType === 'working' ? 'Working Professional' : 'Student'
    return [i + 1, `"${m.name}"`, type, `"${leader?.role || ''}"`, `"${m.email || ''}"`, `"${m.phone || ''}"`, m.annualDue || 0, m.paid || 0, balance, status, progress,
    m.paymentDate ? new Date(m.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    m.paymentMode || '',
    `"${m.note || ''}"`].join(',')
  })
  const totalDue = members.reduce((s, m) => s + (m.annualDue || 0), 0)
  const totalPaid = members.reduce((s, m) => s + (m.paid || 0), 0)
  rows.push(['', '"TOTAL"', '', '', '', '', totalDue, totalPaid, totalDue - totalPaid, '', '', '', '', ''].join(','))
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
function SummaryCards({ members, events, sponsorships = [], transactions = [], dateRange = {} }) {
  const { from, to } = dateRange
  const filteredMembers = members.filter(m => inRange(m.paymentDate, from, to) || (!m.paymentDate && !from && !to))
  const filteredEvents = events.filter(e => inRange(e.date, from, to))
  const filteredSponsorships = sponsorships.filter(s => inRange(s.date, from, to))
  const filteredTransactions = transactions.filter(t => inRange(t.date, from, to))
  const totalDues = members.reduce((sum, m) => sum + (m.annualDue || 0), 0)
  const totalTransactionIncome = filteredTransactions.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amount || 0), 0)
  const totalTransactionExpense = filteredTransactions.filter(t => t.type === 'Expense').reduce((s, t) => s + (t.amount || 0), 0)
  const totalCollected = filteredMembers.reduce((sum, m) => sum + (m.paid || 0), 0)
    + filteredSponsorships.reduce((sum, s) => sum + (s.amount || 0), 0)
    + totalTransactionIncome
  const totalPending = totalDues - totalCollected
  const totalExpenses = filteredEvents.reduce((sum, e) => sum + (e.expenses || []).reduce((s, x) => s + (x.amount || 0), 0), 0)
    + totalTransactionExpense
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
function MembersDues({ members, leaders, saveMember, removeMember, dateRange = {} }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'paid' | 'partial' | 'unpaid'
  const [typeFilter, setTypeFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')
  const [progressFilter, setProgressFilter] = useState('all')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [editingMember, setEditingMember] = useState(null)
  const [editForm, setEditForm] = useState({ paid: 0, paymentDate: '', paymentMode: '', note: '', email: '', phone: '' })

  const handleRemove = (id) => setDeleteId(id)
  const openEdit = (m) => {
    setEditingMember(m)
    setEditForm({ paid: m.paid || 0, paymentDate: m.paymentDate || '', paymentMode: m.paymentMode || '', note: m.note || '', email: m.email || '', phone: m.phone || '' })
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

  const leaderFor = (m) => leaders.find(l => l.name?.toLowerCase() === m.name?.toLowerCase())
  const memberTypeLabel = (m) => leaderFor(m)?.memberType === 'working' ? 'Working Professional' : 'Student'
  const progressOf = (m) => {
    const isPaid = m.paid >= m.annualDue && m.annualDue > 0
    const isPartial = m.paid > 0 && m.paid < m.annualDue
    return isPaid ? 'Completed' : isPartial ? 'Partial' : 'Not Started'
  }

  const boardRoleOptions = [...new Set(leaders.map(l => l.role).filter(Boolean))].sort()

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

  const columnFiltered = statusFiltered.filter(m => {
    if (typeFilter !== 'all' && memberTypeLabel(m) !== typeFilter) return false
    if (roleFilter !== 'all' && (leaderFor(m)?.role || '') !== roleFilter) return false
    if (modeFilter !== 'all' && (m.paymentMode || '') !== modeFilter) return false
    if (progressFilter !== 'all' && progressOf(m) !== progressFilter) return false
    return true
  })

  const filtered = search
    ? columnFiltered.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : columnFiltered

  const activeColumnFilters = [typeFilter, roleFilter, modeFilter, progressFilter].filter(f => f !== 'all').length
  const resetColumnFilters = () => { setTypeFilter('all'); setRoleFilter('all'); setModeFilter('all'); setProgressFilter('all') }

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
        <button onClick={() => exportDuesCSV(filtered, leaders)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-rotary-charcoal dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0">
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

      {/* ── Column filters ── */}
      <div className="flex flex-wrap items-end gap-3 mb-6 bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold block mb-1">Type</label>
          <select className={`${inputClass} !w-auto !py-2`} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="Working Professional">Working Professional</option>
            <option value="Student">Student</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold block mb-1">Board Role</label>
          <select className={`${inputClass} !w-auto !py-2`} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            {boardRoleOptions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold block mb-1">Progress</label>
          <select className={`${inputClass} !w-auto !py-2`} value={progressFilter} onChange={e => setProgressFilter(e.target.value)}>
            <option value="all">All Progress</option>
            <option value="Not Started">Not Started</option>
            <option value="Partial">Partial</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold block mb-1">Payment Mode</label>
          <select className={`${inputClass} !w-auto !py-2`} value={modeFilter} onChange={e => setModeFilter(e.target.value)}>
            <option value="all">All Modes</option>
            {PAYMENT_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
          </select>
        </div>
        {activeColumnFilters > 0 && (
          <button onClick={resetColumnFilters} className="text-xs font-medium text-rotary-blue hover:underline mb-2.5">
            Clear filters ({activeColumnFilters})
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th className="sticky left-0 z-20 w-12 bg-gray-50 dark:bg-rotary-navy-light text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">#</th>
                <th className="sticky left-12 z-20 bg-gray-50 dark:bg-rotary-navy-light shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Member</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Type</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Board Role</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Email</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Phone</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Due</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Paid</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Balance</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Status</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Progress</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Payment Date</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Mode</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Remarks</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, idx) => {
                const isPaid = m.paid >= m.annualDue && m.annualDue > 0
                const isPartial = m.paid > 0 && m.paid < m.annualDue
                const leader = leaders.find(l => l.name?.toLowerCase() === m.name?.toLowerCase())
                const memberType = leader?.memberType === 'working' ? 'Working Professional' : 'Student'
                const balance = (m.annualDue || 0) - (m.paid || 0)
                const progress = isPaid ? 'Completed' : isPartial ? 'Partial' : 'Not Started'
                return (
                  <tr key={m.id} className="group border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="sticky left-0 z-10 bg-white dark:bg-rotary-navy-light group-hover:bg-gray-50 dark:group-hover:bg-white/[0.02] px-5 py-3 text-xs text-rotary-slate dark:text-white/40">{idx + 1}</td>
                    <td className="sticky left-12 z-10 bg-white dark:bg-rotary-navy-light group-hover:bg-gray-50 dark:group-hover:bg-white/[0.02] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] px-5 py-3 font-medium">{m.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${memberType === 'Working Professional' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'}`}>{memberType}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{leader?.role || '—'}</td>
                    <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{m.email || '—'}</td>
                    <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{m.phone || '—'}</td>
                    <td className="px-5 py-3 text-right">₹{(m.annualDue || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right">₹{(m.paid || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-medium">₹{balance.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${isPaid ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' : isPartial ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                        {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-xs text-rotary-slate dark:text-white/50">{progress}</td>
                    <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/40">
                      {m.paymentDate ? new Date(m.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">
                      {m.paymentMode
                        ? <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 font-medium">{m.paymentMode}</span>
                        : <span className="text-rotary-slate dark:text-white/20">—</span>}
                    </td>
                    <td className="px-5 py-3 text-rotary-slate dark:text-white/40 text-xs">{m.note || '—'}</td>
                    <td className="px-5 py-3 text-right relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)}
                        title="Actions"
                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ml-auto"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
                      </button>
                      {openMenuId === m.id && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-5 top-full mt-1 z-30 w-44 bg-white dark:bg-rotary-navy-light border border-gray-100 dark:border-white/10 rounded-xl shadow-lg overflow-hidden text-left">
                            <button onClick={() => { openEdit(m); setOpenMenuId(null) }} className="w-full px-4 py-2.5 text-xs font-medium text-rotary-charcoal dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Edit Payment</button>
                            {!isPaid && (
                              <button onClick={() => { markPaid(m.id); setOpenMenuId(null) }} className="w-full px-4 py-2.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors">Mark as Paid</button>
                            )}
                            {m.paid > 0 && (
                              <button onClick={() => { generateReceipt(m); setOpenMenuId(null) }} className="w-full px-4 py-2.5 text-xs font-medium text-rotary-blue hover:bg-rotary-blue/5 transition-colors">Download Receipt</button>
                            )}
                            <button onClick={() => { handleRemove(m.id); setOpenMenuId(null) }} className="w-full px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">Remove</button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={15} className="px-5 py-10 text-center text-rotary-slate dark:text-white/30">No members found.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                <td className="px-5 py-3 font-semibold" colSpan={6}>Total ({members.length})</td>
                <td className="px-5 py-3 text-right font-semibold">₹{totalDue.toLocaleString()}</td>
                <td className="px-5 py-3 text-right font-semibold text-green-600 dark:text-green-400">₹{totalPaid.toLocaleString()}</td>
                <td className="px-5 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">₹{(totalDue - totalPaid).toLocaleString()}</td>
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
            <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteId(null)} />
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
            <div className="absolute inset-0 bg-black/60" onClick={() => setEditingMember(null)} />
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Email</label>
                    <input
                      className={inputClass}
                      type="email"
                      placeholder="member@email.com"
                      value={editForm.email}
                      onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Phone</label>
                    <input
                      className={inputClass}
                      type="tel"
                      placeholder="+91…"
                      value={editForm.phone}
                      onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
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
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Remarks</label>
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
            <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteId(null)} />
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
            <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteId(null)} />
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
function BalanceSheet({ members, eventLedger, sponsorships = [], transactions = [], dateRange = {} }) {
  const { from, to } = dateRange
  const filteredMembers = (from || to) ? members.filter(m => m.paymentDate ? inRange(m.paymentDate, from, to) : false) : members
  const filteredEvents = (from || to) ? eventLedger.filter(e => inRange(e.date, from, to)) : eventLedger
  const filteredSponsorships = (from || to) ? sponsorships.filter(s => inRange(s.date, from, to)) : sponsorships
  const filteredTransactions = (from || to) ? transactions.filter(t => inRange(t.date, from, to)) : transactions

  const totalDues = members.reduce((s, m) => s + (m.annualDue || 0), 0)
  const totalCollected = filteredMembers.reduce((s, m) => s + (m.paid || 0), 0)
  const totalPending = totalDues - totalCollected
  const totalSponsorships = filteredSponsorships.reduce((s, x) => s + (x.amount || 0), 0)
  const totalTransactionIncome = filteredTransactions.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amount || 0), 0)
  const totalTransactionExpense = filteredTransactions.filter(t => t.type === 'Expense').reduce((s, t) => s + (t.amount || 0), 0)

  const eventTotals = filteredEvents.map(ev => ({
    name: ev.eventName,
    date: ev.date,
    budget: ev.budget || 0,
    income: ev.income || 0,
    spent: (ev.expenses || []).reduce((s, x) => s + (x.amount || 0), 0),
    breakdown: Object.entries((ev.expenses || []).reduce((acc, x) => { acc[x.category] = (acc[x.category] || 0) + (x.amount || 0); return acc }, {}))
  }))

  const totalEventIncome = eventTotals.reduce((s, e) => s + e.income, 0)
  const totalEventExpenses = eventTotals.reduce((s, e) => s + e.spent, 0)
  const totalExpenses = totalEventExpenses + totalTransactionExpense
  const totalIncome = totalCollected + totalSponsorships + totalEventIncome + totalTransactionIncome
  const balance = totalIncome - totalExpenses
  const isPositive = balance >= 0

  const exportBalanceCSV = () => {
    const rows = []
    rows.push(['"INCOME"', '', ''].join(','))
    rows.push(['"Membership Dues Collected"', '', totalCollected].join(','))
    if (totalSponsorships > 0) rows.push(['"Total Sponsorships"', '', totalSponsorships].join(','))
    if (totalEventIncome > 0) rows.push(['"Project Income (ticket sales etc.)"', '', totalEventIncome].join(','))
    if (totalTransactionIncome > 0) rows.push(['"Other Income (Transactions)"', '', totalTransactionIncome].join(','))
    rows.push(['"Total Income"', '', totalIncome].join(','))
    rows.push(['', '', ''].join(','))
    rows.push(['"EXPENSES"', '', ''].join(','))
    eventTotals.forEach(ev => {
      rows.push([`"${ev.name}"`, `"${ev.date ? new Date(ev.date).toLocaleDateString('en-IN') : ''}"`, ev.spent].join(','))
      ev.breakdown.forEach(([cat, amt]) => rows.push([`"  — ${cat}"`, '', amt].join(',')))
    })
    if (totalTransactionExpense > 0) rows.push(['"Other Expenses (Transactions)"', '', totalTransactionExpense].join(','))
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
              {totalTransactionIncome > 0 && (
                <tr className="border-b border-gray-50 dark:border-white/[0.03]">
                  <td className="px-5 py-3"><p className="font-medium">Other Income</p><p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">From Transactions ledger</p></td>
                  <td className="px-5 py-3 text-right font-semibold text-green-600 dark:text-green-400">₹{totalTransactionIncome.toLocaleString()}</td>
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
              {eventTotals.length === 0 && totalTransactionExpense === 0 && <tr><td colSpan={3} className="px-5 py-8 text-center text-rotary-slate dark:text-white/30 text-xs">No expenses recorded.</td></tr>}
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
              {totalTransactionExpense > 0 && (
                <tr className="border-b border-gray-50 dark:border-white/[0.03]">
                  <td className="px-5 py-3"><p className="font-medium">Other Expenses</p><p className="text-xs text-rotary-slate dark:text-white/30 mt-0.5">From Transactions ledger</p></td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/40">—</td>
                  <td className="px-5 py-3 text-right font-semibold text-red-500">₹{totalTransactionExpense.toLocaleString()}</td>
                </tr>
              )}
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

// ── Budget vs Actual ──
function BudgetVsActual({ approvedBudget, saveApprovedBudget, transactions, forecast }) {
  const { budget, isFrozen, live: liveFromForecast } = resolveApprovedBudget(approvedBudget, forecast)

  const actualByCategory = EXPENSE_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = transactions.filter(t => t.type === 'Expense' && t.budgetHead === cat).reduce((s, t) => s + (t.amount || 0), 0)
    return acc
  }, {})

  const handleFreeze = () => saveApprovedBudget({ ...liveFromForecast, frozen: true, frozenAt: new Date().toISOString() })
  const handleUnfreeze = () => saveApprovedBudget({ ...budget, frozen: false, frozenAt: null })

  const totalApproved = EXPENSE_CATEGORIES.reduce((s, c) => s + (budget[c] || 0), 0)
  const totalActual = EXPENSE_CATEGORIES.reduce((s, c) => s + (actualByCategory[c] || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-lg">Budget vs Actual</h2>
        <p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">Approved budget pulled from the Forecast tab vs. actual spend recorded in Transactions</p>
      </div>

      {isFrozen ? (
        <div className="rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-green-700 dark:text-green-400">
            <span className="font-semibold">Budget frozen</span> on {new Date(approvedBudget.frozenAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} — these numbers are locked and won't change even if the Forecast tab is edited later.
          </p>
          <button onClick={handleUnfreeze} className="text-xs font-semibold text-green-700 dark:text-green-400 hover:underline shrink-0">Unfreeze</button>
        </div>
      ) : (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Showing <span className="font-semibold">live values from Forecast</span> — these will keep updating if you change the Forecast tab. Once the budget is confirmed, freeze it to lock these numbers permanently.
          </p>
          <button onClick={handleFreeze} className="px-4 py-2 rounded-lg bg-rotary-gold text-rotary-navy text-xs font-semibold hover:bg-rotary-gold-light transition-colors shrink-0">Freeze Budget</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">Approved</p>
          <p className="text-xl font-display font-bold text-rotary-charcoal dark:text-white">₹{totalApproved.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">Actual Spent</p>
          <p className="text-xl font-display font-bold text-red-500">₹{totalActual.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">Balance</p>
          <p className={`text-xl font-display font-bold ${totalApproved - totalActual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>₹{(totalApproved - totalActual).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">Utilization</p>
          <p className="text-xl font-display font-bold text-rotary-blue">{totalApproved > 0 ? Math.round((totalActual / totalApproved) * 100) : 0}%</p>
        </div>
      </div>

      <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Budget Head</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Approved Budget</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Actual Spent</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Balance</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold w-48">Utilization %</th>
              </tr>
            </thead>
            <tbody>
              {EXPENSE_CATEGORIES.map(cat => {
                const approved = budget[cat] || 0
                const actual = actualByCategory[cat] || 0
                const bal = approved - actual
                const pct = approved > 0 ? Math.round((actual / approved) * 100) : 0
                const overBudget = approved > 0 && actual > approved
                return (
                  <tr key={cat} className="border-b border-gray-50 dark:border-white/[0.03] last:border-0">
                    <td className="px-5 py-3 font-medium">{cat}</td>
                    <td className="px-5 py-3 text-right">₹{approved.toLocaleString()}</td>
                    <td className={`px-5 py-3 text-right ${overBudget ? 'text-red-500 font-semibold' : ''}`}>₹{actual.toLocaleString()}</td>
                    <td className={`px-5 py-3 text-right font-medium ${bal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{bal >= 0 ? '' : '-'}₹{Math.abs(bal).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full ${overBudget ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className={`text-xs w-10 text-right ${overBudget ? 'text-red-500 font-semibold' : 'text-rotary-slate dark:text-white/40'}`}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                <td className="px-5 py-3 font-semibold">Total</td>
                <td className="px-5 py-3 text-right font-semibold">₹{totalApproved.toLocaleString()}</td>
                <td className="px-5 py-3 text-right font-semibold text-red-500">₹{totalActual.toLocaleString()}</td>
                <td className={`px-5 py-3 text-right font-bold ${totalApproved - totalActual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>₹{(totalApproved - totalActual).toLocaleString()}</td>
                <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/40">{totalApproved > 0 ? Math.round((totalActual / totalApproved) * 100) : 0}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Annual Forecast ──
function mergeForecast(forecast) {
  return { ...DEFAULT_FORECAST, ...forecast, membership: { ...DEFAULT_FORECAST.membership, ...(forecast?.membership || {}) } }
}

function Forecast({ forecast, saveForecast }) {
  // Local-first editing: typing updates local state immediately (fast), and the
  // Firestore write is debounced so we don't do a round-trip + re-render per keystroke.
  const [data, setData] = useState(() => mergeForecast(forecast))
  const dirtyRef = useRef(false)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    if (!dirtyRef.current) setData(mergeForecast(forecast))
  }, [forecast])

  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  const commit = (next) => {
    setData(next)
    dirtyRef.current = true
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveForecast(next)
      dirtyRef.current = false
    }, 600)
  }

  const categories = data.budgetCategories?.length ? data.budgetCategories : DEFAULT_FORECAST.budgetCategories
  const additionalRevenue = data.additionalRevenue?.length ? data.additionalRevenue : DEFAULT_FORECAST.additionalRevenue

  const updateMembership = (type, field, value) => {
    commit({
      ...data,
      membership: { ...data.membership, [type]: { ...data.membership[type], [field]: parseInt(value) || 0 } }
    })
  }

  const updateCategoryItem = (catKey, itemIndex, value) => {
    commit({
      ...data,
      budgetCategories: categories.map(c => c.key !== catKey ? c : {
        ...c, items: c.items.map((it, i) => i !== itemIndex ? it : { ...it, amount: parseInt(value) || 0 })
      })
    })
  }

  const updateRevenueItem = (itemIndex, value) => {
    commit({
      ...data,
      additionalRevenue: additionalRevenue.map((it, i) => i !== itemIndex ? it : { ...it, amount: parseInt(value) || 0 })
    })
  }

  const resetToDefault = () => {
    clearTimeout(saveTimerRef.current)
    dirtyRef.current = false
    setData(DEFAULT_FORECAST)
    saveForecast(DEFAULT_FORECAST)
  }

  const { professional, student } = data.membership
  const currentMembershipRevenue = (professional.current * professional.dues) + (student.current * student.dues)
  const proposedMembershipRevenue = (professional.proposed * professional.dues) + (student.proposed * student.dues)
  const totalAdditionalRevenue = additionalRevenue.reduce((s, r) => s + (r.amount || 0), 0)

  const categoryTotals = categories.map(c => ({ ...c, total: c.items.reduce((s, it) => s + (it.amount || 0), 0) }))
  const totalProposedBudget = categoryTotals.reduce((s, c) => s + c.total, 0)

  const scenarios = [
    { label: `Current (${professional.current + student.current} members)`, revenue: currentMembershipRevenue, extra: 0 },
    { label: `Current + Sponsorships`, revenue: currentMembershipRevenue, extra: totalAdditionalRevenue },
    { label: `Proposed (${professional.proposed + student.proposed} members) + Sponsorships`, revenue: proposedMembershipRevenue, extra: totalAdditionalRevenue },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg">Annual Forecast</h2>
          <p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">Membership, budget & revenue planning for the Rotary year</p>
        </div>
        <button
          onClick={resetToDefault}
          className="text-xs font-medium text-rotary-blue hover:underline shrink-0"
        >
          Reset to Budget 26-27
        </button>
      </div>

      {/* Membership */}
      <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <h3 className="font-display font-semibold">Membership</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Category</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Current Strength</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Proposed</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Annual Dues (₹)</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Current Revenue</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Projected Revenue</th>
              </tr>
            </thead>
            <tbody>
              {[{ key: 'professional', label: 'Professional Members' }, { key: 'student', label: 'Student Members' }].map(({ key, label }) => {
                const m = data.membership[key]
                return (
                  <tr key={key} className="border-b border-gray-50 dark:border-white/[0.03]">
                    <td className="px-5 py-3 font-medium">{label}</td>
                    <td className="px-5 py-3 text-right"><input type="number" min="0" className={`${inputClass} !w-20 !px-2 ml-auto text-right`} value={m.current || ''} onChange={e => updateMembership(key, 'current', e.target.value)} /></td>
                    <td className="px-5 py-3 text-right"><input type="number" min="0" className={`${inputClass} !w-20 !px-2 ml-auto text-right`} value={m.proposed || ''} onChange={e => updateMembership(key, 'proposed', e.target.value)} /></td>
                    <td className="px-5 py-3 text-right"><input type="number" min="0" className={`${inputClass} !w-28 !px-2 ml-auto text-right`} value={m.dues || ''} onChange={e => updateMembership(key, 'dues', e.target.value)} /></td>
                    <td className="px-5 py-3 text-right font-semibold">₹{(m.current * m.dues).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-semibold text-rotary-blue">₹{(m.proposed * m.dues).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                <td className="px-5 py-3 font-semibold" colSpan={4}>Total Membership Revenue</td>
                <td className="px-5 py-3 text-right font-bold">₹{currentMembershipRevenue.toLocaleString()}</td>
                <td className="px-5 py-3 text-right font-bold text-rotary-blue">₹{proposedMembershipRevenue.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Budget Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categoryTotals.map(cat => (
          <div key={cat.key} className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm">{cat.label}</h3>
              <span className="text-sm font-bold text-rotary-blue">₹{cat.total.toLocaleString()}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {cat.items.map((item, i) => (
                  <tr key={item.label} className="border-b border-gray-50 dark:border-white/[0.03] last:border-0">
                    <td className="px-5 py-2.5">{item.label}</td>
                    <td className="pl-2 pr-4 py-2.5 text-right w-36">
                      <input type="number" min="0" className={`${inputClass} !py-1.5 !px-2 text-right`} value={item.amount || ''} placeholder="0" onChange={e => updateCategoryItem(cat.key, i, e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 px-5 py-4 flex items-center justify-between">
        <span className="font-display font-semibold">Total Proposed Budget</span>
        <span className="font-display font-bold text-lg">₹{totalProposedBudget.toLocaleString()}</span>
      </div>

      {/* Additional Revenue */}
      <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-display font-semibold">Additional Revenue Sources</h3>
          <span className="text-sm font-bold text-green-600 dark:text-green-400">₹{totalAdditionalRevenue.toLocaleString()}</span>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {additionalRevenue.map((item, i) => (
              <tr key={item.label} className="border-b border-gray-50 dark:border-white/[0.03] last:border-0">
                <td className="px-5 py-2.5">{item.label}</td>
                <td className="pl-2 pr-4 py-2.5 text-right w-36">
                  <input type="number" min="0" className={`${inputClass} !py-1.5 !px-2 text-right`} value={item.amount || ''} placeholder="0" onChange={e => updateRevenueItem(i, e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scenario comparison */}
      <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <h3 className="font-display font-semibold">Scenario Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Source</th>
                {scenarios.map(s => (
                  <th key={s.label} className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50 dark:border-white/[0.03]">
                <td className="px-5 py-3">Membership Revenue</td>
                {scenarios.map(s => <td key={s.label} className="px-5 py-3 text-right">₹{s.revenue.toLocaleString()}</td>)}
              </tr>
              <tr className="border-b border-gray-50 dark:border-white/[0.03]">
                <td className="px-5 py-3">Additional Revenue</td>
                {scenarios.map(s => <td key={s.label} className="px-5 py-3 text-right">₹{s.extra.toLocaleString()}</td>)}
              </tr>
              <tr className="border-b border-gray-50 dark:border-white/[0.03]">
                <td className="px-5 py-3 font-semibold">Total Projected Revenue</td>
                {scenarios.map(s => <td key={s.label} className="px-5 py-3 text-right font-semibold">₹{(s.revenue + s.extra).toLocaleString()}</td>)}
              </tr>
              <tr className="border-b border-gray-50 dark:border-white/[0.03]">
                <td className="px-5 py-3">Total Proposed Budget</td>
                {scenarios.map(s => <td key={s.label} className="px-5 py-3 text-right">₹{totalProposedBudget.toLocaleString()}</td>)}
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                <td className="px-5 py-3 font-bold">Deficit / Surplus</td>
                {scenarios.map(s => {
                  const delta = (s.revenue + s.extra) - totalProposedBudget
                  return <td key={s.label} className={`px-5 py-3 text-right font-bold ${delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{delta >= 0 ? '+' : ''}₹{delta.toLocaleString()}</td>
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Transactions (General Ledger) ──
const BUDGET_HEADS = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]
const REIMBURSABLE_STATUSES = ['None', 'Pending', 'Completed']

function generateVoucherNo(date, transactions) {
  const d = date ? new Date(date) : new Date()
  const rotaryYearStart = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1
  const prefix = `BTM${String(rotaryYearStart).slice(-2)}`
  const seq = transactions.filter(t => t.voucherNo?.startsWith(prefix)).length + 1
  return `${prefix}${String(seq).padStart(4, '0')}`
}

function Transactions({ transactions, saveTransaction, removeTransaction, projects = [], dateRange = {} }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [headFilter, setHeadFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')
  const [reimburseFilter, setReimburseFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const emptyForm = { date: new Date().toISOString().split('T')[0], voucherNo: '', type: 'Expense', budgetHead: EXPENSE_CATEGORIES[0], description: '', amount: 0, mode: 'Cash', approvedBy: 'Treasurer', paidBy: '', project: '', reimbursableStatus: 'None' }
  const [form, setForm] = useState(emptyForm)

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false) }

  const handleSave = async () => {
    if (!form.date || !form.amount) return
    if (!editingId) form.voucherNo = generateVoucherNo(form.date, transactions)
    const id = editingId || Date.now().toString()
    await saveTransaction({ ...form, id, approvedBy: 'Treasurer' })
    resetForm()
  }

  const handleEdit = (t) => {
    setForm({ ...emptyForm, ...t })
    setEditingId(t.id)
    setShowForm(true)
  }

  const { from, to } = dateRange
  const rangeFiltered = (from || to) ? transactions.filter(t => inRange(t.date, from, to)) : transactions

  const columnFiltered = rangeFiltered.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (headFilter !== 'all' && t.budgetHead !== headFilter) return false
    if (modeFilter !== 'all' && t.mode !== modeFilter) return false
    if (reimburseFilter !== 'all' && (t.reimbursableStatus || 'None') !== reimburseFilter) return false
    return true
  })

  const filtered = search
    ? columnFiltered.filter(t => t.description?.toLowerCase().includes(search.toLowerCase()) || t.voucherNo?.toLowerCase().includes(search.toLowerCase()))
    : columnFiltered

  // Running balance computed over all transactions in chronological order (not affected by filters)
  const sortedAll = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))
  const balanceById = {}
  let running = 0
  sortedAll.forEach(t => {
    running += (t.type === 'Income' ? (t.amount || 0) : -(t.amount || 0))
    balanceById[t.id] = running
  })

  const sortedFiltered = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date))

  const totalIncome = filtered.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amount || 0), 0)
  const totalExpense = filtered.filter(t => t.type === 'Expense').reduce((s, t) => s + (t.amount || 0), 0)
  const activeColumnFilters = [typeFilter, headFilter, modeFilter, reimburseFilter].filter(f => f !== 'all').length
  const resetColumnFilters = () => { setTypeFilter('all'); setHeadFilter('all'); setModeFilter('all'); setReimburseFilter('all') }

  const exportCSV = () => {
    const headers = ['Date', 'Voucher No', 'Type', 'Budget Head', 'Description', 'Income (₹)', 'Expense (₹)', 'Mode', 'Approved By', 'Balance (₹)', 'Paid By', 'Project', 'Reimbursable Status']
    const rows = sortedFiltered.map(t => [
      t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      `"${t.voucherNo || ''}"`, t.type, `"${t.budgetHead || ''}"`, `"${t.description || ''}"`,
      t.type === 'Income' ? (t.amount || 0) : 0,
      t.type === 'Expense' ? (t.amount || 0) : 0,
      t.mode || '', `"${t.approvedBy || 'Treasurer'}"`, balanceById[t.id] ?? 0,
      `"${t.paidBy || ''}"`, `"${t.project || ''}"`, t.reimbursableStatus || 'None'
    ].join(','))
    rows.push(['', '', '', '', '"TOTAL"', totalIncome, totalExpense, '', '', '', '', '', ''].join(','))
    const csv = '﻿' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rotaract-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rotary-slate dark:text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input className={`${inputClass} !pl-10`} placeholder="Search description or voucher no..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={exportCSV} disabled={transactions.length === 0} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-rotary-charcoal dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0 disabled:opacity-40">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export
        </button>
        <button onClick={() => { if (showForm && !editingId) resetForm(); else { resetForm(); setShowForm(true) } }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} /></svg>
          {showForm ? 'Cancel' : 'Add Transaction'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">Income</p>
          <p className="text-xl font-display font-bold text-green-600 dark:text-green-400">₹{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">Expense</p>
          <p className="text-xl font-display font-bold text-red-500">₹{totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">Net</p>
          <p className={`text-xl font-display font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {totalIncome - totalExpense >= 0 ? '+' : ''}₹{(totalIncome - totalExpense).toLocaleString()}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="mb-6 bg-white dark:bg-rotary-navy-light rounded-xl p-5 border border-gray-100 dark:border-white/5" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <h4 className="font-display font-semibold mb-4">{editingId ? 'Edit Transaction' : 'New Transaction'}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Date *</label>
                <input className={inputClass} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Voucher No</label>
                <input className={`${inputClass} !bg-gray-100 dark:!bg-white/5 !text-rotary-slate dark:!text-white/40 cursor-not-allowed`} value={editingId ? form.voucherNo : 'Auto-generated on save'} readOnly disabled />
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Type</label>
                <select className={inputClass} value={form.type} onChange={e => {
                  const type = e.target.value
                  setForm({ ...form, type, budgetHead: (type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0] })
                }}>
                  <option value="Income">Income</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Budget Head</label>
                <select className={inputClass} value={form.budgetHead} onChange={e => setForm({ ...form, budgetHead: e.target.value })}>
                  {(form.type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="col-span-2 md:col-span-2">
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Description</label>
                <input className={inputClass} placeholder="What is this for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Amount (₹) *</label>
                <input className={inputClass} type="number" min="0" value={form.amount || ''} onChange={e => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Mode</label>
                <select className={inputClass} value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
                  {PAYMENT_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Approved By</label>
                <input className={`${inputClass} !bg-gray-100 dark:!bg-white/5 !text-rotary-slate dark:!text-white/40 cursor-not-allowed`} value="Treasurer" readOnly disabled />
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Paid By</label>
                <input className={inputClass} value={form.paidBy} onChange={e => setForm({ ...form, paidBy: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Project</label>
                <select className={inputClass} value={form.project} onChange={e => setForm({ ...form, project: e.target.value })}>
                  <option value="">— None —</option>
                  {projects.map(p => <option key={p.id} value={p.title}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Reimbursable Status</label>
                <select className={inputClass} value={form.reimbursableStatus} onChange={e => setForm({ ...form, reimbursableStatus: e.target.value })}>
                  {REIMBURSABLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={!form.date || !form.amount} className="px-5 py-2 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm disabled:opacity-50 transition-colors">{editingId ? 'Save' : 'Add Transaction'}</button>
              {editingId && <button onClick={resetForm} className="px-5 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm">Cancel</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Column filters ── */}
      <div className="flex flex-wrap items-end gap-3 mb-6 bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold block mb-1">Type</label>
          <select className={`${inputClass} !w-auto !py-2`} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold block mb-1">Budget Head</label>
          <select className={`${inputClass} !w-auto !py-2`} value={headFilter} onChange={e => setHeadFilter(e.target.value)}>
            <option value="all">All Heads</option>
            {BUDGET_HEADS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold block mb-1">Mode</label>
          <select className={`${inputClass} !w-auto !py-2`} value={modeFilter} onChange={e => setModeFilter(e.target.value)}>
            <option value="all">All Modes</option>
            {PAYMENT_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold block mb-1">Reimbursable</label>
          <select className={`${inputClass} !w-auto !py-2`} value={reimburseFilter} onChange={e => setReimburseFilter(e.target.value)}>
            <option value="all">All</option>
            {REIMBURSABLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {activeColumnFilters > 0 && (
          <button onClick={resetColumnFilters} className="text-xs font-medium text-rotary-blue hover:underline mb-2.5">
            Clear filters ({activeColumnFilters})
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th className="sticky left-0 z-10 bg-gray-50 dark:bg-rotary-navy-light text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Date</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Voucher No</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Type</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Budget Head</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Description</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Income</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Expense</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Mode</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Approved By</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Balance</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Paid By</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Project</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Reimbursable</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiltered.map(t => (
                <tr key={t.id} className="group border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="sticky left-0 z-10 bg-white dark:bg-rotary-navy-light group-hover:bg-gray-50 dark:group-hover:bg-white/[0.02] px-5 py-3 text-xs text-rotary-slate dark:text-white/40 whitespace-nowrap">
                    {t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{t.voucherNo || '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${t.type === 'Income' ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>{t.type}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{t.budgetHead || '—'}</td>
                  <td className="px-5 py-3">{t.description || '—'}</td>
                  <td className="px-5 py-3 text-right text-green-600 dark:text-green-400">{t.type === 'Income' ? `₹${(t.amount || 0).toLocaleString()}` : '—'}</td>
                  <td className="px-5 py-3 text-right text-red-500">{t.type === 'Expense' ? `₹${(t.amount || 0).toLocaleString()}` : '—'}</td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">
                    {t.mode ? <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 font-medium">{t.mode}</span> : <span className="text-rotary-slate dark:text-white/20">—</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{t.approvedBy || 'Treasurer'}</td>
                  <td className={`px-5 py-3 text-right font-medium ${(balanceById[t.id] ?? 0) >= 0 ? 'text-rotary-charcoal dark:text-white' : 'text-red-500'}`}>
                    {(balanceById[t.id] ?? 0) >= 0 ? '' : '-'}₹{Math.abs(balanceById[t.id] ?? 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{t.paidBy || '—'}</td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{t.project || '—'}</td>
                  <td className="px-5 py-3 text-center">
                    {t.reimbursableStatus && t.reimbursableStatus !== 'None' ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${t.reimbursableStatus === 'Completed' ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>{t.reimbursableStatus}</span>
                    ) : <span className="text-rotary-slate dark:text-white/20 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => handleEdit(t)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteId(t.id)} className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedFiltered.length === 0 && (
                <tr><td colSpan={14} className="px-5 py-10 text-center text-rotary-slate dark:text-white/30">No transactions yet. Add one above.</td></tr>
              )}
            </tbody>
            {sortedFiltered.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                  <td className="px-5 py-3 font-semibold" colSpan={5}>Total ({sortedFiltered.length})</td>
                  <td className="px-5 py-3 text-right font-semibold text-green-600 dark:text-green-400">₹{totalIncome.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-semibold text-red-500">₹{totalExpense.toLocaleString()}</td>
                  <td colSpan={7}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteId(null)} />
            <motion.div className="relative bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-white/10" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg mb-1">Remove Transaction?</h3>
              <p className="text-sm text-gray-400 dark:text-white/50 mb-6">This will permanently remove this transaction record.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={async () => { await removeTransaction(deleteId); setDeleteId(null) }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Remove</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Reimbursements ──
function Reimbursements({ transactions, saveTransaction, dateRange = {} }) {
  const [statusFilter, setStatusFilter] = useState('Pending')

  const reimbursable = transactions.filter(t => t.reimbursableStatus && t.reimbursableStatus !== 'None')
  const { from, to } = dateRange
  const rangeFiltered = (from || to) ? reimbursable.filter(t => inRange(t.date, from, to)) : reimbursable

  const counts = {
    all: rangeFiltered.length,
    Pending: rangeFiltered.filter(t => t.reimbursableStatus === 'Pending').length,
    Completed: rangeFiltered.filter(t => t.reimbursableStatus === 'Completed').length,
  }

  const filtered = statusFilter === 'all' ? rangeFiltered : rangeFiltered.filter(t => t.reimbursableStatus === statusFilter)
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date))

  const totalPending = rangeFiltered.filter(t => t.reimbursableStatus === 'Pending').reduce((s, t) => s + (t.amount || 0), 0)
  const totalCompleted = rangeFiltered.filter(t => t.reimbursableStatus === 'Completed').reduce((s, t) => s + (t.amount || 0), 0)

  const markReimbursed = async (t) => {
    await saveTransaction({ ...t, reimbursableStatus: 'Completed', reimbursedDate: new Date().toISOString().split('T')[0] })
  }
  const markPending = async (t) => {
    await saveTransaction({ ...t, reimbursableStatus: 'Pending', reimbursedDate: '' })
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display font-bold text-lg">Reimbursements</h2>
        <p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">Money owed back to members who paid for club expenses out of pocket</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">Pending</p>
          <p className="text-xl font-display font-bold text-amber-600 dark:text-amber-400">₹{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">Reimbursed</p>
          <p className="text-xl font-display font-bold text-green-600 dark:text-green-400">₹{totalCompleted.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'Pending', label: 'Pending', color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400', active: 'bg-amber-500 text-white' },
          { key: 'Completed', label: 'Reimbursed', color: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400', active: 'bg-green-600 text-white' },
          { key: 'all', label: 'All', color: 'bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60', active: 'bg-rotary-blue text-white' },
        ].map(({ key, label, color, active }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${statusFilter === key ? active : color}`}
          >
            {label}
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${statusFilter === key ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'}`}>
              {counts[key] ?? counts.all}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Date</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Voucher No</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Description</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Paid By</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Budget Head</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Amount</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Status</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => (
                <tr key={t.id} className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/40 whitespace-nowrap">
                    {t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{t.voucherNo || '—'}</td>
                  <td className="px-5 py-3">{t.description || '—'}</td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{t.paidBy || '—'}</td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{t.budgetHead || '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold">₹{(t.amount || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${t.reimbursableStatus === 'Completed' ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
                      {t.reimbursableStatus === 'Completed' ? 'Reimbursed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {t.reimbursableStatus === 'Completed' ? (
                      <button onClick={() => markPending(t)} className="text-xs font-medium text-rotary-slate dark:text-white/40 hover:underline">Reopen</button>
                    ) : (
                      <button onClick={() => markReimbursed(t)} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors">Mark Reimbursed</button>
                    )}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-rotary-slate dark:text-white/30">Nothing here — mark a transaction "Reimbursable" in Transactions to track it.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Assets ──
const ASSET_CATEGORIES = ['Banners & Standees', 'Merchandise', 'Equipment', 'Furniture', 'Electronics', 'Awards & Trophies', 'Other']
const ASSET_CONDITIONS = ['New', 'Good', 'Fair', 'Damaged', 'Disposed']

function Assets({ assets, saveAsset, removeAsset }) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const emptyForm = { name: '', category: ASSET_CATEGORIES[0], quantity: 1, value: 0, condition: 'New', location: '', purchaseDate: '', note: '' }
  const [form, setForm] = useState(emptyForm)

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false) }

  const handleSave = async () => {
    if (!form.name) return
    const id = editingId || Date.now().toString()
    await saveAsset({ ...form, id })
    resetForm()
  }

  const handleEdit = (a) => {
    setForm({ ...emptyForm, ...a })
    setEditingId(a.id)
    setShowForm(true)
  }

  const filtered = search ? assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase())) : assets
  const totalValue = assets.reduce((s, a) => s + (a.value || 0) * (a.quantity || 1), 0)
  const activeCount = assets.filter(a => a.condition !== 'Disposed').length

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rotary-slate dark:text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input className={`${inputClass} !pl-10`} placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { if (showForm && !editingId) resetForm(); else { resetForm(); setShowForm(true) } }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} /></svg>
          {showForm ? 'Cancel' : 'Add Asset'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">Total Assets</p>
          <p className="text-xl font-display font-bold text-rotary-charcoal dark:text-white">{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-rotary-navy-light rounded-xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-xs text-rotary-slate dark:text-white/40 uppercase tracking-wider font-medium mb-1">Total Value</p>
          <p className="text-xl font-display font-bold text-rotary-blue">₹{totalValue.toLocaleString()}</p>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="mb-6 bg-white dark:bg-rotary-navy-light rounded-xl p-5 border border-gray-100 dark:border-white/5" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <h4 className="font-display font-semibold mb-4">{editingId ? 'Edit Asset' : 'New Asset'}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Name *</label>
                <input className={inputClass} placeholder="e.g. Club Banner (6x4)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Category</label>
                <select className={inputClass} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Condition</label>
                <select className={inputClass} value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                  {ASSET_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Quantity</label>
                <input className={inputClass} type="number" min="1" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Value per unit (₹)</label>
                <input className={inputClass} type="number" min="0" value={form.value || ''} onChange={e => setForm({ ...form, value: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Location</label>
                <input className={inputClass} placeholder="e.g. Secretary's custody" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Purchase Date</label>
                <input className={inputClass} type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
              </div>
              <div className="col-span-2 md:col-span-4">
                <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Note</label>
                <input className={inputClass} placeholder="Optional notes" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={!form.name} className="px-5 py-2 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm disabled:opacity-50 transition-colors">{editingId ? 'Save' : 'Add Asset'}</button>
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
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Name</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Category</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Qty</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Total Value</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Condition</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Location</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Purchased</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-rotary-slate dark:text-white/40 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 font-medium">{a.name}{a.note && <p className="text-xs text-rotary-slate dark:text-white/30 font-normal mt-0.5">{a.note}</p>}</td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{a.category}</td>
                  <td className="px-5 py-3 text-right">{a.quantity || 1}</td>
                  <td className="px-5 py-3 text-right font-semibold">₹{((a.value || 0) * (a.quantity || 1)).toLocaleString()}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${a.condition === 'Disposed' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : a.condition === 'Damaged' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'}`}>{a.condition}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/50">{a.location || '—'}</td>
                  <td className="px-5 py-3 text-xs text-rotary-slate dark:text-white/40">{a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => handleEdit(a)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteId(a.id)} className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-rotary-slate dark:text-white/30">No assets recorded yet.</td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                  <td className="px-5 py-3 font-semibold" colSpan={3}>Total ({filtered.length})</td>
                  <td className="px-5 py-3 text-right font-bold">₹{filtered.reduce((s, a) => s + (a.value || 0) * (a.quantity || 1), 0).toLocaleString()}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteId(null)} />
            <motion.div className="relative bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-white/10" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg mb-1">Remove Asset?</h3>
              <p className="text-sm text-gray-400 dark:text-white/50 mb-6">This will permanently remove this asset record.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={async () => { await removeAsset(deleteId); setDeleteId(null) }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Remove</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const rateSaveTimerRef = useRef(null)

  const { data: leaders } = useCollection('leaders')
  const { data: members, loading: membersLoading, save: saveMember, remove: removeMember } = useCollection('treasurer_members')
  const { data: eventLedger, loading: eventsLoading, save: saveEvent, remove: removeEvent } = useCollection('treasurer_events')
  const { data: sponsorships, loading: sponsorshipsLoading, save: saveSponsorship, remove: removeSponsorship } = useCollection('treasurer_sponsorships')
  const { data: transactions, loading: transactionsLoading, save: saveTransaction, remove: removeTransaction } = useCollection('treasurer_transactions')
  const { data: assets, loading: assetsLoading, save: saveAsset, remove: removeAsset } = useCollection('treasurer_assets')
  const { data: dueRates, save: saveDueRates } = useDocument('settings', 'due_rates', { student: 1000, working: 2500 })
  const [rateForm, setRateForm] = useState(dueRates)
  const rateDirtyRef = useRef(false)
  useEffect(() => { if (!rateDirtyRef.current) setRateForm(dueRates) }, [dueRates])
  const { data: forecast, save: saveForecast } = useDocument('settings', 'annual_forecast', DEFAULT_FORECAST)
  const { data: approvedBudget, save: saveApprovedBudget } = useDocument('settings', 'approved_budget', Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c, 0])))
  const { data: projects = [] } = useCollection('projects')

  const loading = membersLoading || eventsLoading || sponsorshipsLoading || transactionsLoading || assetsLoading

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

  const updateDueRate = (field, value) => {
    const next = { ...rateForm, [field]: parseInt(value) || 0 }
    setRateForm(next)
    rateDirtyRef.current = true
    clearTimeout(rateSaveTimerRef.current)
    rateSaveTimerRef.current = setTimeout(() => {
      saveDueRates(next)
      rateDirtyRef.current = false
    }, 600)
  }

  const applyRatesToAll = async () => {
    clearTimeout(rateSaveTimerRef.current)
    rateDirtyRef.current = false
    await saveDueRates(rateForm)
    await Promise.all(
      members.map(m => {
        const leader = leaders.find(l => l.name?.toLowerCase() === m.name?.toLowerCase())
        const type = leader?.memberType || 'student'
        return saveMember({ ...m, annualDue: type === 'working' ? rateForm.working : rateForm.student })
      })
    )
    setShowRateEdit(false)
  }

  const tabs = [
    { id: 'report', label: 'Report', icon: 'M9 17v-6h2v6H9zm4 0V7h2v10h-2zm-8 0v-3h2v3H5zm-2 4h18v2H3v-2zM3 3h18v2H3V3z' },
    { id: 'dues', label: 'Members Dues', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'transactions', label: 'Transactions', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z' },
    { id: 'expenses', label: 'Event Expenses', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { id: 'sponsorships', label: 'Sponsorships', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'balance', label: 'Balance Sheet', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
    { id: 'budgetActual', label: 'Budget vs Actual', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm10 0V9a2 2 0 00-2-2h-2a2 2 0 00-2 2v10m0 0a2 2 0 002 2h2a2 2 0 002-2z' },
    { id: 'reimbursements', label: 'Reimbursements', icon: 'M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm0 10h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zM14 6h4M14 10h4' },
    { id: 'assets', label: 'Assets', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m8-14h.01M11 11h.01M11 15h.01M15 7h.01M15 11h.01M15 15h.01M7 7h.01M7 11h.01M7 15h.01' },
    { id: 'forecast', label: 'Forecast', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
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
            <SummaryCards members={members} events={eventLedger} sponsorships={sponsorships} transactions={transactions} dateRange={dateRange} />

            <div className="mb-8 bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display font-semibold text-sm">Standard Annual Dues</h3>
                <button onClick={() => setShowRateEdit(!showRateEdit)} className="text-xs font-medium text-rotary-blue hover:underline">{showRateEdit ? 'Done' : 'Edit Rates'}</button>
              </div>
              {showRateEdit ? (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Student (₹/year)</label>
                    <input className={inputClass} type="number" min="0" value={rateForm.student} onChange={e => updateDueRate('student', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Working Professional (₹/year)</label>
                    <input className={inputClass} type="number" min="0" value={rateForm.working} onChange={e => updateDueRate('working', e.target.value)} />
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

            {activeTab === 'report' && <TreasurerReports members={members} leaders={leaders} transactions={transactions} forecast={forecast} approvedBudget={approvedBudget} />}
            {activeTab === 'dues' && <MembersDues members={members} leaders={leaders} saveMember={saveMember} removeMember={removeMember} dateRange={dateRange} />}
            {activeTab === 'transactions' && <Transactions transactions={transactions} saveTransaction={saveTransaction} removeTransaction={removeTransaction} projects={projects} dateRange={dateRange} />}
            {activeTab === 'expenses' && <EventExpenses eventLedger={eventLedger} saveEvent={saveEvent} removeEvent={removeEvent} dateRange={dateRange} projects={projects} />}
            {activeTab === 'sponsorships' && <Sponsorships sponsorships={sponsorships} saveSponsorship={saveSponsorship} removeSponsorship={removeSponsorship} dateRange={dateRange} />}
            {activeTab === 'balance' && <BalanceSheet members={members} eventLedger={eventLedger} sponsorships={sponsorships} transactions={transactions} dateRange={dateRange} />}
            {activeTab === 'budgetActual' && <BudgetVsActual approvedBudget={approvedBudget} saveApprovedBudget={saveApprovedBudget} transactions={transactions} forecast={forecast} />}
            {activeTab === 'reimbursements' && <Reimbursements transactions={transactions} saveTransaction={saveTransaction} dateRange={dateRange} />}
            {activeTab === 'assets' && <Assets assets={assets} saveAsset={saveAsset} removeAsset={removeAsset} />}
            {activeTab === 'forecast' && <Forecast forecast={forecast} saveForecast={saveForecast} />}
          </>
        )}
      </div>
    </div>
  )
}
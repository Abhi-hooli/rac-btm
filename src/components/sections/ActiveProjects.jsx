import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'
import { logAction } from '../../utils/auditLog'
import {
  avenueDirectorAvenues,
  fundraiseTarget,
  fundsRaised,
  fundsRemaining,
} from './AvenueProjects'

const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

const AVENUE_STYLES = {
  'Club Service':              { badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  'Community Service':         { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'Professional Development':  { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  'International Service':     { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
}

const EXEC_STEPS = ['planning', 'inProgress', 'onHold', 'completed']
const EXEC_STYLES = {
  planning:   { label: 'Planning',    badge: 'bg-blue-50 text-blue-700 border-blue-200', bar: 'bg-blue-400' },
  inProgress: { label: 'In Progress', badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-400' },
  onHold:     { label: 'On Hold',     badge: 'bg-gray-100 text-gray-600 border-gray-200', bar: 'bg-gray-400' },
  completed:  { label: 'Completed',   badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
}

const Icon = {
  Cash: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  User: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Location: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Calendar: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Chat: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  Plus: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Check: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Close: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Rocket: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Update: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  List: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
}

function AvenueBadge({ avenue }) {
  const s = AVENUE_STYLES[avenue] || AVENUE_STYLES['Club Service']
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{avenue}
    </span>
  )
}

function formatWhen(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d)) return ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

export default function ActiveProjects({ isAdmin, permissions, onBack }) {
  const { data: ideas, loading, save } = useCollection('avenueProjects')
  // Logged fundraising contributions post as linked "Fundraising" income in the treasurer
  // ledger. Only subscribe/read for treasurers — the Firestore rules deny reads to others.
  const { save: saveTransaction, remove: removeTransaction } = useCollection('treasurer_transactions', [], { enabled: !!permissions?.isSuperAdmin || !!permissions?.treasurer })
  // Completed projects can be published to the public Events section (approval-gated).
  // No listener needed — we only write.
  const { save: saveEvent } = useCollection('events', [], { enabled: false })

  const isSuperAdmin = !!permissions?.isSuperAdmin
  const isTreasurer = isSuperAdmin || !!permissions?.treasurer
  const canApprove = isSuperAdmin || !!permissions?.avenueProjectsApprove
  // Only events-managers (super admin / secretary) can push a project onto the public site.
  const canPublishEvents = isSuperAdmin || !!permissions?.events
  const hasEditPerm = isSuperAdmin || !!permissions?.avenueProjects || !!permissions?.avenueProjectsApprove
  const myAvenue = permissions?.avenue || null
  const canEdit = (p) => isSuperAdmin || (hasEditPerm && (!myAvenue || p.avenue === myAvenue))
  // Fundraising is money handling — the Treasurer can log contributions on any project
  // even without avenue-edit rights; project owners can too.
  const canFund = (p) => isTreasurer || canEdit(p)

  const [filterAvenue, setFilterAvenue] = useState('All')
  const [stageFilter, setStageFilter] = useState('All')
  const [selectedId, setSelectedId] = useState(null)
  // Draft inputs, keyed by project id
  const [updateDraft, setUpdateDraft] = useState('')
  const [taskDraft, setTaskDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [fundSource, setFundSource] = useState('')
  const [fundAmount, setFundAmount] = useState('')

  const active = ideas.filter(i => i.approved && !i.deletedAt)
  const filtered = active
    .filter(i => filterAvenue === 'All' || i.avenue === filterAvenue)
    .filter(i => stageFilter === 'All' || (i.executionStage || 'planning') === stageFilter)
    .sort((a, b) => new Date(b.approvedAt || 0) - new Date(a.approvedAt || 0))

  const selected = selectedId ? (active.find(i => i.id === selectedId) || null) : null
  const editable = selected ? canEdit(selected) : false
  const canFundSel = selected ? canFund(selected) : false
  const author = permissions?.name || permissions?.email || 'Admin'

  const setStage = async (project, executionStage) => {
    if (!canEdit(project) || (project.executionStage || 'planning') === executionStage) return
    await save({ ...project, executionStage })
    logAction({ admin: permissions?.email || 'admin', action: 'PROJECT_STAGE', module: 'Active Projects', item: project.title, details: `Moved to ${EXEC_STYLES[executionStage].label}` })
  }

  const addUpdate = async (project) => {
    const text = updateDraft.trim()
    if (!text || !canEdit(project)) return
    const entry = { id: uid(), text, by: author, at: Date.now() }
    await save({ ...project, executionUpdates: [entry, ...(project.executionUpdates || [])] })
    setUpdateDraft('')
  }
  const removeUpdate = async (project, id) => {
    if (!canEdit(project)) return
    await save({ ...project, executionUpdates: (project.executionUpdates || []).filter(u => u.id !== id) })
  }

  const addTask = async (project) => {
    const text = taskDraft.trim()
    if (!text || !canEdit(project)) return
    const entry = { id: uid(), text, done: false, at: Date.now() }
    await save({ ...project, executionTasks: [...(project.executionTasks || []), entry] })
    setTaskDraft('')
  }
  const toggleTask = async (project, id) => {
    if (!canEdit(project)) return
    await save({ ...project, executionTasks: (project.executionTasks || []).map(t => t.id === id ? { ...t, done: !t.done } : t) })
  }
  const removeTask = async (project, id) => {
    if (!canEdit(project)) return
    await save({ ...project, executionTasks: (project.executionTasks || []).filter(t => t.id !== id) })
  }

  const addContribution = async (project) => {
    const amount = Number(fundAmount)
    if (!fundSource.trim() || !amount || amount <= 0 || !canFund(project)) return
    const entry = { id: uid(), source: fundSource.trim(), amount, by: author, at: Date.now() }
    const contributions = [entry, ...(project.fundraising?.contributions || [])]
    await save({ ...project, fundraising: { ...(project.fundraising || {}), contributions } })
    // Mirror into the treasurer ledger as Fundraising income, linked by contribution id.
    // Only treasurers may write to treasurer_transactions (enforced by Firestore rules),
    // so a director's logged contribution stays on the project until a treasurer reconciles.
    if (isTreasurer) {
      try {
        await saveTransaction({
          id: `fund_${entry.id}`,
          date: new Date().toISOString().split('T')[0],
          voucherNo: '',
          type: 'Income',
          budgetHead: 'Fundraising',
          avenue: project.avenue,
          description: `Fundraising — ${project.title}: ${entry.source}`,
          amount,
          mode: 'Cash',
          approvedBy: author,
          paidBy: entry.source,
          project: project.title,
          reimbursableStatus: 'None',
          fundraisingContribution: true,
          sourceProjectId: project.id,
          sourceContributionId: entry.id,
        })
      } catch { /* ledger write blocked — treasurer can add it manually */ }
    }
    logAction({ admin: permissions?.email || 'admin', action: 'FUNDRAISE_LOG', module: 'Active Projects', item: project.title, details: `Logged ${rupee(amount)} from ${entry.source}` })
    setFundSource(''); setFundAmount('')
  }
  const removeContribution = async (project, id) => {
    if (!canFund(project)) return
    const contributions = (project.fundraising?.contributions || []).filter(c => c.id !== id)
    await save({ ...project, fundraising: { ...(project.fundraising || {}), contributions } })
    // Remove the linked ledger entry too so finance stays reconciled (treasurer only).
    if (isTreasurer) {
      try { await removeTransaction(`fund_${id}`) } catch { /* ledger entry may predate linking */ }
    }
  }

  const addComment = async (project) => {
    const text = commentDraft.trim()
    if (!text || !canEdit(project)) return
    const comment = { id: uid(), author, text, createdAt: new Date().toISOString() }
    await save({ ...project, comments: [...(project.comments || []), comment] })
    setCommentDraft('')
  }

  // ── Publish a completed project to the public Events section ──
  // Directors request; a super admin / secretary approves (creates the public event).
  const requestFeature = async (project) => {
    if (!canEdit(project)) return
    await save({ ...project, featureRequested: true, featureRequestedBy: author, featureRequestedAt: Date.now() })
  }
  const publishFeature = async (project) => {
    if (!canPublishEvents) return
    // events docs are public; creating one is the "approval" that surfaces it on the site.
    await saveEvent({
      id: `proj_${project.id}`,
      title: project.title,
      date: new Date().toISOString().split('T')[0],
      time: '',
      endDate: '',
      endTime: '',
      location: project.venue || '',
      type: project.avenue,
      image: '',
      description: project.description || '',
      sourceProjectId: project.id,
    })
    try { await save({ ...project, featurePublished: true, featureRequested: false }) } catch { /* event created; flag needs avenue write */ }
    logAction({ admin: permissions?.email || 'admin', action: 'PROJECT_PUBLISH', module: 'Active Projects', item: project.title, details: 'Published completed project to Events' })
  }
  const dismissFeature = async (project) => {
    if (!canPublishEvents) return
    await save({ ...project, featureRequested: false })
  }

  // Sends a project back to the Avenue Project Planning pipeline (clears approval).
  const returnToPlanning = async (project) => {
    if (!canApprove) return
    await save({ ...project, approved: false, approvedBy: null, approvedByRole: null, approvedAt: null, approvedQuarter: null })
    logAction({ admin: permissions?.email || 'admin', action: 'PROJECT_UNAPPROVE', module: 'Active Projects', item: project.title, details: 'Returned to planning pipeline' })
    setSelectedId(null)
  }

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h2 className="font-display font-bold text-xl mb-1">Access Restricted</h2>
      <p className="text-sm text-gray-400">Admin login required.</p>
      <button onClick={onBack} className="mt-6 btn-primary !py-2 !px-6 text-sm !rounded-xl">Go Back</button>
    </div>
  )

  return (
    <section className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div className="flex items-start gap-3 mb-10" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={onBack} className="mt-6 p-2.5 rounded-xl border border-gray-200 hover:bg-white transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-rotary-blue animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-rotary-blue">Project Workspace</p>
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal">Active Projects</h2>
            <p className="text-sm text-gray-400">Approved projects in execution — track progress, tasks, funds &amp; discussion.</p>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {['All', ...avenueDirectorAvenues].map(a => (
            <button key={a} onClick={() => setFilterAvenue(a)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterAvenue === a ? 'bg-rotary-blue text-white border-rotary-blue' : 'border-gray-200 text-gray-500 hover:border-rotary-blue/40 bg-white'}`}>{a}</button>
          ))}
          <span className="w-px h-5 bg-gray-200 mx-1" />
          {['All', ...EXEC_STEPS].map(s => (
            <button key={s} onClick={() => setStageFilter(s)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${stageFilter === s ? 'bg-rotary-charcoal text-white border-rotary-charcoal' : 'border-gray-200 text-gray-500 hover:border-gray-400 bg-white'}`}>{s === 'All' ? 'All stages' : EXEC_STYLES[s].label}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><div className="w-10 h-10 border-4 border-rotary-blue/20 border-t-rotary-blue rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 bg-white rounded-2xl border border-gray-100">
            <Icon.Rocket className="w-10 h-10 text-gray-300 mb-4" />
            <p className="font-display font-bold text-lg">No active projects yet</p>
            <p className="text-sm text-gray-400 mt-1">Projects appear here once they're approved in Avenue Project Planning.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((p, i) => {
              const target = fundraiseTarget(p)
              const raised = fundsRaised(p)
              const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : null
              const stage = EXEC_STYLES[p.executionStage || 'planning']
              const openTasks = (p.executionTasks || []).filter(t => !t.done).length
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedId(p.id)}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-base mb-1.5">{p.title}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <AvenueBadge avenue={p.avenue} />
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${stage.badge}`}>{stage.label}</span>
                        {p.approvedQuarter && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">{p.approvedQuarter}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                      {openTasks > 0 && <span className="flex items-center gap-1"><Icon.List className="w-3.5 h-3.5" /> {openTasks} open</span>}
                      {(p.comments || []).length > 0 && <span className="flex items-center gap-1"><Icon.Chat className="w-3.5 h-3.5" /> {p.comments.length}</span>}
                    </div>
                  </div>
                  {target > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-500">Fundraising</span>
                        <span className="text-gray-400">{rupee(raised)} / {rupee(target)}{pct != null ? ` · ${pct}%` : ''}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-rotary-gold'}`} style={{ width: `${pct || 0}%` }} />
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail workspace modal */}
      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedId(null)} />
            <motion.div className="relative w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>
              <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1"><AvenueBadge avenue={selected.avenue} /></div>
                  <h3 className="font-display font-bold text-xl leading-snug">{selected.title}</h3>
                </div>
                <button onClick={() => setSelectedId(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0"><Icon.Close className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Execution stage */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Stage</p>
                  <div className={`flex flex-wrap gap-2 ${editable ? '' : 'pointer-events-none opacity-70'}`}>
                    {EXEC_STEPS.map(step => (
                      <button key={step} onClick={() => setStage(selected, step)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${(selected.executionStage || 'planning') === step ? 'bg-rotary-blue text-white border-rotary-blue' : 'bg-white text-gray-500 border-gray-200 hover:border-rotary-blue/40'}`}>
                        {EXEC_STYLES[step].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Publish to website — only for completed projects */}
                {(selected.executionStage || 'planning') === 'completed' && (
                  <div className="p-4 rounded-xl bg-rotary-blue/5 border border-rotary-blue/20">
                    <p className="text-[10px] uppercase tracking-widest text-rotary-blue font-bold mb-1.5">Website</p>
                    {selected.featurePublished ? (
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600"><Icon.Check className="w-4 h-4" /> Featured on the public site</p>
                    ) : selected.featureRequested ? (
                      <div>
                        <p className="text-sm text-rotary-charcoal mb-2">Feature requested{selected.featureRequestedBy ? ` by ${selected.featureRequestedBy}` : ''} — awaiting approval.</p>
                        {canPublishEvents && (
                          <div className="flex gap-2">
                            <button onClick={() => publishFeature(selected)} className="px-4 py-2 rounded-lg bg-rotary-blue text-white text-xs font-bold hover:bg-rotary-blue-dark transition-colors">Approve &amp; Publish</button>
                            <button onClick={() => dismissFeature(selected)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition-colors">Dismiss</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Show this completed project on the public Events section.</p>
                        {canPublishEvents ? (
                          <button onClick={() => publishFeature(selected)} className="px-4 py-2 rounded-lg bg-rotary-blue text-white text-xs font-bold hover:bg-rotary-blue-dark transition-colors">Publish to website</button>
                        ) : canEdit(selected) ? (
                          <button onClick={() => requestFeature(selected)} className="px-4 py-2 rounded-lg border border-rotary-blue/30 text-rotary-blue text-xs font-bold hover:bg-rotary-blue/10 transition-colors">Request to feature</button>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {/* Key info */}
                <div className="grid grid-cols-2 gap-2.5">
                  {selected.projectLead && <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Lead</p><p className="flex items-center gap-1.5 text-sm font-semibold text-rotary-charcoal"><Icon.User className="w-3.5 h-3.5 shrink-0" /> {selected.projectLead}</p></div>}
                  {selected.venue && <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Venue</p><p className="flex items-center gap-1.5 text-sm font-semibold text-rotary-charcoal"><Icon.Location className="w-3.5 h-3.5 shrink-0" /> {selected.venue}</p></div>}
                  {selected.targetTimeline && <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Timeline</p><p className="flex items-center gap-1.5 text-sm font-semibold text-rotary-charcoal"><Icon.Calendar className="w-3.5 h-3.5 shrink-0" /> {selected.targetTimeline}</p></div>}
                  {selected.estimatedBudget != null && selected.estimatedBudget !== '' && <div className="p-3 rounded-xl bg-gray-50 border border-gray-100"><p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Budget</p><p className="flex items-center gap-1.5 text-sm font-semibold text-rotary-charcoal"><Icon.Cash className="w-3.5 h-3.5 shrink-0" /> {rupee(selected.estimatedBudget)}</p></div>}
                </div>

                {/* Fundraising */}
                {fundraiseTarget(selected) > 0 && (
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase tracking-widest text-amber-600 font-bold flex items-center gap-1.5"><Icon.Cash className="w-3 h-3" /> Fundraising</p>
                      <p className="text-xs font-semibold text-amber-700">{rupee(fundsRaised(selected))} raised of {rupee(fundraiseTarget(selected))}</p>
                    </div>
                    {(() => { const t = fundraiseTarget(selected); const r = fundsRaised(selected); const pct = t > 0 ? Math.min(100, Math.round((r / t) * 100)) : 0; return (
                      <>
                        <div className="h-2.5 rounded-full bg-white border border-amber-100 overflow-hidden mb-1">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-rotary-gold'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[11px] text-amber-600 mb-3">{pct >= 100 ? 'Fully funded' : `${rupee(fundsRemaining(selected))} remaining · ${pct}%`}</p>
                      </>
                    ) })()}
                    <div className="space-y-1.5">
                      {(selected.fundraising?.contributions || []).map(c => (
                        <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-amber-100">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-rotary-charcoal truncate">{c.source}</p>
                            <p className="text-[10px] text-gray-400">{c.by} · {formatWhen(c.at)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold text-emerald-600">{rupee(c.amount)}</span>
                            {canFundSel && <button onClick={() => removeContribution(selected, c.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Icon.Close className="w-3.5 h-3.5" /></button>}
                          </div>
                        </div>
                      ))}
                      {(selected.fundraising?.contributions || []).length === 0 && <p className="text-xs text-amber-600/70">No contributions logged yet.</p>}
                    </div>
                    {canFundSel && (
                      <>
                        <div className="flex gap-2 mt-3">
                          <input className={`${inputClass} flex-1`} placeholder="Source (e.g. Sponsor, Donation)" value={fundSource} onChange={e => setFundSource(e.target.value)} />
                          <input type="number" min="0" className={`${inputClass} w-28`} placeholder="₹" value={fundAmount} onChange={e => setFundAmount(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addContribution(selected) }} />
                          <button onClick={() => addContribution(selected)} className="px-3 rounded-lg bg-rotary-gold text-rotary-navy text-sm font-bold hover:bg-rotary-gold-light transition-colors shrink-0"><Icon.Plus className="w-4 h-4" /></button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5">{isTreasurer ? 'Also posts as Fundraising income in the Treasurer ledger.' : 'Recorded here; the Treasurer will reconcile it into the finance ledger.'}</p>
                      </>
                    )}
                  </div>
                )}

                {/* Task checklist */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 flex items-center gap-1.5"><Icon.List className="w-3 h-3" /> Tasks</p>
                  <div className="space-y-1.5">
                    {(selected.executionTasks || []).map(t => (
                      <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                        <button onClick={() => toggleTask(selected, t.id)} disabled={!editable} className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${t.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'}`}>{t.done && <Icon.Check className="w-3 h-3" />}</button>
                        <span className={`flex-1 text-sm ${t.done ? 'line-through text-gray-400' : 'text-rotary-charcoal'}`}>{t.text}</span>
                        {editable && <button onClick={() => removeTask(selected, t.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Icon.Close className="w-3.5 h-3.5" /></button>}
                      </div>
                    ))}
                    {(selected.executionTasks || []).length === 0 && <p className="text-xs text-gray-400">No tasks yet.</p>}
                  </div>
                  {editable && (
                    <div className="flex gap-2 mt-2">
                      <input className={`${inputClass} flex-1`} placeholder="Add a task…" value={taskDraft} onChange={e => setTaskDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTask(selected) }} />
                      <button onClick={() => addTask(selected)} className="px-3 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors shrink-0"><Icon.Plus className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>

                {/* Progress updates */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 flex items-center gap-1.5"><Icon.Update className="w-3 h-3" /> Progress Updates</p>
                  {editable && (
                    <div className="flex gap-2 mb-3">
                      <input className={`${inputClass} flex-1`} placeholder="Post an update…" value={updateDraft} onChange={e => setUpdateDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addUpdate(selected) }} />
                      <button onClick={() => addUpdate(selected)} className="px-4 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors shrink-0">Post</button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {(selected.executionUpdates || []).map(u => (
                      <div key={u.id} className="relative pl-4 py-1 border-l-2 border-rotary-blue/30">
                        <p className="text-sm text-rotary-charcoal">{u.text}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{u.by} · {formatWhen(u.at)}</p>
                        {editable && <button onClick={() => removeUpdate(selected, u.id)} className="absolute top-1 right-0 text-gray-300 hover:text-red-500 transition-colors"><Icon.Close className="w-3.5 h-3.5" /></button>}
                      </div>
                    ))}
                    {(selected.executionUpdates || []).length === 0 && <p className="text-xs text-gray-400">No updates yet.</p>}
                  </div>
                </div>

                {/* Discussion */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 flex items-center gap-1.5"><Icon.Chat className="w-3 h-3" /> Discussion</p>
                  <div className="space-y-2">
                    {(selected.comments || []).map(c => (
                      <div key={c.id} className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-xs font-bold text-gray-600">{c.author}</p>
                          <p className="text-[10px] text-gray-400">{formatWhen(c.createdAt)}</p>
                        </div>
                        <p className="text-sm text-gray-500">{c.text}</p>
                      </div>
                    ))}
                    {(selected.comments || []).length === 0 && <p className="text-xs text-gray-400">No comments yet.</p>}
                    {editable && (
                      <div className="flex gap-2 pt-1">
                        <input className={`${inputClass} flex-1`} placeholder="Add a comment…" value={commentDraft} onChange={e => setCommentDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addComment(selected) }} />
                        <button onClick={() => addComment(selected)} className="px-4 rounded-xl bg-rotary-blue text-white text-xs font-semibold hover:bg-rotary-blue-dark transition-colors shrink-0">Add</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {canApprove && (
                <div className="px-6 py-4 border-t border-gray-100 shrink-0">
                  <button onClick={() => returnToPlanning(selected)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                    Return to planning pipeline
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

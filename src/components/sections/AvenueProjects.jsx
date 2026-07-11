import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'
import { rotaractAvenues, areasOfFocus, inputClass } from './Projects'
import { logAction } from '../../utils/auditLog'

// ── Icons (small inline SVGs, not emoji) ────────────────────────────────────
const Icon = {
  Cash: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Building: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>,
  Megaphone: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
  User: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Location: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Users: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Target: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="7" strokeWidth={2} /><circle cx="12" cy="12" r="2.5" strokeWidth={2} /></svg>,
  Calendar: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Chat: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  Bulb: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3a6 6 0 00-6 6c0 2.5 1.5 4 2.34 5.033.436.541.66 1.213.66 1.897V16h6v-.07c0-.684.224-1.356.66-1.897C16.5 13 18 11.5 18 9a6 6 0 00-6-6z" /></svg>,
  Flask: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3h6M9 3v6.586a1 1 0 01-.293.707l-4.414 4.414a1 1 0 00-.293.707V19a2 2 0 002 2h12a2 2 0 002-2v-3.586a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0115 9.586V3" /></svg>,
  Grid: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  List: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  Check: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
}

// Public Image doesn't have a dedicated director in this club's structure —
// this space is scoped to the 4 avenues that do.
export const avenueDirectorAvenues = rotaractAvenues.filter(a => a !== 'Public Image')

const AVENUE_STYLES = {
  'Club Service':              { badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  'Community Service':         { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'Professional Development':  { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  'International Service':     { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
}

const STATUS_STEPS = ['idea', 'planning', 'ready']
const STATUS_STYLES = {
  idea:     { label: 'Idea',              badge: 'bg-gray-100 text-gray-600 border-gray-200' },
  planning: { label: 'Planning',          badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  ready:    { label: 'Ready to Propose',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

const PRIORITY_STEPS = ['Low', 'Medium', 'High']
const PRIORITY_STYLES = {
  Low:    'bg-gray-50 text-gray-600 border-gray-200',
  Medium: 'bg-blue-50 text-blue-700 border-blue-200',
  High:   'bg-red-50 text-red-700 border-red-200',
}

const emptyForm = {
  avenue: avenueDirectorAvenues[0],
  title: '',
  areaOfFocus: '',
  priority: 'Medium',
  projectLead: '',
  venue: '',
  expectedImpact: '',
  volunteersNeeded: '',
  targetTimeline: '',
  estimatedBudget: '',
  clubAllocation: '',
  description: '',
  status: 'idea',
}

// Portion of the total budget still needing to be fundraised, after the club's own allocation.
function fundraiseAmount(idea) {
  if (idea.estimatedBudget == null || idea.estimatedBudget === '') return null
  const total = Number(idea.estimatedBudget) || 0
  const allocated = Number(idea.clubAllocation) || 0
  return Math.max(0, total - allocated)
}

// Fundraising helpers shared with the Active Projects workspace and Fundraising tracker.
// fundraiseTarget: how much the team must raise (always a number; 0 when no budget/gap).
// fundsRaised: sum of logged contributions. fundsRemaining: target minus raised, floored at 0.
export function fundraiseTarget(idea) {
  return fundraiseAmount(idea) || 0
}
export function fundsRaised(idea) {
  return (idea.fundraising?.contributions || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
}
export function fundsRemaining(idea) {
  return Math.max(0, fundraiseTarget(idea) - fundsRaised(idea))
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.idea
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${s.badge}`}>{s.label}</span>
}

function PriorityBadge({ priority }) {
  const p = priority || 'Medium'
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${PRIORITY_STYLES[p] || PRIORITY_STYLES.Medium}`}>{p} priority</span>
}

function AvenueBadge({ avenue }) {
  const s = AVENUE_STYLES[avenue] || AVENUE_STYLES['Club Service']
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{avenue}
    </span>
  )
}

function approvalLabel(idea) {
  if (!idea.approved) return ''
  let s = '✓ Approved'
  if (idea.approvedQuarter) s += ` for ${idea.approvedQuarter}`
  if (idea.approvedBy) s += ` by ${idea.approvedBy}${idea.approvedByRole ? ` (${idea.approvedByRole})` : ''}`
  return s
}

function formatWhen(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d)) return ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Next 6 quarters starting from the current one, e.g. ['Q3 2026', 'Q4 2026', 'Q1 2027', ...]
function upcomingQuarters() {
  const now = new Date()
  let year = now.getFullYear()
  let q = Math.floor(now.getMonth() / 3) + 1
  const options = []
  for (let i = 0; i < 6; i++) {
    options.push(`Q${q} ${year}`)
    q++
    if (q > 4) { q = 1; year++ }
  }
  return options
}

// Projects budgeted above this need explicit Treasurer sign-off before they can be approved.
// Exported so other views (e.g. the Profile task dashboard) stay in sync with one source of truth.
export const TREASURER_APPROVAL_THRESHOLD = 2000
export function needsTreasurerApproval(idea) {
  return idea.estimatedBudget != null && idea.estimatedBudget !== '' && Number(idea.estimatedBudget) > TREASURER_APPROVAL_THRESHOLD
}

export default function AvenueProjects({ isAdmin, permissions, onBack }) {
  const { data: ideas, loading, save, remove } = useCollection('avenueProjects')

  const isSuperAdmin = !!permissions?.isSuperAdmin
  const hasEditPerm = isSuperAdmin || !!permissions?.avenueProjects
  const canApprove = isSuperAdmin || !!permissions?.avenueProjectsApprove
  const canTreasurerApprove = isSuperAdmin || !!permissions?.treasurer
  const myAvenue = permissions?.avenue || null
  const avenueLocked = !isSuperAdmin && !!myAvenue

  // A director can only edit/delete/status-cycle their own avenue's ideas.
  // Anyone with the edit permission but no assigned avenue (e.g. a
  // catch-all admin role) can still edit any avenue's cards.
  const canEditIdea = (idea) => isSuperAdmin || (hasEditPerm && (!myAvenue || idea.avenue === myAvenue))

  const [filterAvenue, setFilterAvenue] = useState(avenueLocked ? myAvenue : 'All')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(() => ({ ...emptyForm, avenue: avenueLocked ? myAvenue : emptyForm.avenue }))
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [expandedComments, setExpandedComments] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [viewMode, setViewMode] = useState('board')
  const [draggedId, setDraggedId] = useState(null)
  const [approveTarget, setApproveTarget] = useState(null)
  const [approveQuarter, setApproveQuarter] = useState('')
  const [selectedIdea, setSelectedIdea] = useState(null)
  const [treasurerTarget, setTreasurerTarget] = useState(null)
  const [treasurerComment, setTreasurerComment] = useState('')
  const [treasurerAllocation, setTreasurerAllocation] = useState('')

  const resetForm = () => {
    setForm({ ...emptyForm, avenue: avenueLocked ? myAvenue : emptyForm.avenue })
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (idea) => {
    setForm({
      avenue: idea.avenue,
      title: idea.title,
      areaOfFocus: idea.areaOfFocus || '',
      priority: idea.priority || 'Medium',
      projectLead: idea.projectLead || '',
      venue: idea.venue || '',
      expectedImpact: idea.expectedImpact || '',
      volunteersNeeded: idea.volunteersNeeded || '',
      targetTimeline: idea.targetTimeline || '',
      estimatedBudget: idea.estimatedBudget || '',
      clubAllocation: idea.clubAllocation || '',
      description: idea.description || '',
      status: idea.status || 'idea',
    })
    setEditingId(idea.id)
    setShowForm(true)
  }

  // TEMP: one-click seed of 5 dummy prospective projects for testing. Remove after use.
  const handleSeedTestData = async () => {
    const dummyProjects = [
      { avenue: 'Club Service', title: 'New Member Buddy Program', areaOfFocus: '', priority: 'Medium', projectLead: 'Rtr Divya Gaur', venue: 'BTM Clubhouse', expectedImpact: 'Faster onboarding for ~15 new inductees/year', volunteersNeeded: '5', targetTimeline: 'Q3 2026', estimatedBudget: '5000', description: 'Pair every new inductee with a buddy for their first 3 months to boost retention.', status: 'idea' },
      { avenue: 'Community Service', title: 'Free Health Checkup Camp', areaOfFocus: 'Disease Prevention and Treatment', priority: 'High', projectLead: 'Rtr Prachi P Jain', venue: 'BTM Community Hall', expectedImpact: '~300 residents screened', volunteersNeeded: '20', targetTimeline: 'August 2026', estimatedBudget: '10000', clubAllocation: '3000', description: 'Partner with a local hospital to run a free general health checkup camp for the BTM community. Rest of the budget to be fundraised.', status: 'planning' },
      { avenue: 'Professional Development', title: 'Resume & LinkedIn Workshop', areaOfFocus: '', priority: 'Low', projectLead: '', venue: 'Inspyre', expectedImpact: '~40 members with updated resumes', volunteersNeeded: '3', targetTimeline: 'Q4 2026', estimatedBudget: '3000', description: 'Half-day workshop with an HR professional covering resume building and LinkedIn optimization for members.', status: 'idea' },
      { avenue: 'International Service', title: 'Cross-Border Cultural Exchange Meet', areaOfFocus: 'Peacebuilding and Conflict Prevention', priority: 'Medium', projectLead: 'Rtr Naveen', venue: 'Online + BTM Clubhouse', expectedImpact: 'Partnership with 1 sister club abroad', volunteersNeeded: '8', targetTimeline: 'Q1 2027', estimatedBudget: '40000', description: 'Virtual + in-person exchange with a sister Rotaract club abroad to share service project learnings.', status: 'ready' },
      { avenue: 'Club Service', title: 'Rotaract Talent Night', areaOfFocus: '', priority: 'Low', projectLead: '', venue: 'Vasanthpura Vallbhaswami Temple', expectedImpact: 'Full-club engagement event', volunteersNeeded: '10', targetTimeline: 'September 2026', estimatedBudget: '15000', description: 'An evening showcasing member talents to build camaraderie and attract prospective members.', status: 'planning' },
    ]
    setSaving(true)
    try {
      for (const p of dummyProjects) {
        await save({
          ...p,
          id: `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          estimatedBudget: p.estimatedBudget ? Number(p.estimatedBudget) : null,
          clubAllocation: p.clubAllocation ? Number(p.clubAllocation) : null,
          volunteersNeeded: p.volunteersNeeded ? Number(p.volunteersNeeded) : null,
          createdBy: permissions?.name || permissions?.email,
          createdAt: new Date().toISOString(),
          approved: false,
          approvedBy: null,
          approvedByRole: null,
          approvedAt: null,
          comments: [],
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const id = editingId || `${Date.now()}`
      const existing = editingId ? ideas.find(i => i.id === editingId) : null
      const newEstimatedBudget = form.estimatedBudget ? Number(form.estimatedBudget) : null
      const newClubAllocation = form.clubAllocation ? Number(form.clubAllocation) : null
      // Editing the budget or club allocation after the Treasurer signed off invalidates
      // that sign-off — it was approved against the old numbers, not whatever comes next.
      const budgetChanged = !!existing?.treasurerApproved &&
        (newEstimatedBudget !== (existing.estimatedBudget ?? null) || newClubAllocation !== (existing.clubAllocation ?? null))
      await save({
        ...form,
        id,
        estimatedBudget: newEstimatedBudget,
        clubAllocation: newClubAllocation,
        volunteersNeeded: form.volunteersNeeded ? Number(form.volunteersNeeded) : null,
        createdBy: existing?.createdBy || permissions?.name || permissions?.email,
        createdAt: existing?.createdAt || new Date().toISOString(),
        approved: existing?.approved || false,
        approvedBy: existing?.approvedBy || null,
        approvedByRole: existing?.approvedByRole || null,
        approvedAt: existing?.approvedAt || null,
        approvedQuarter: existing?.approvedQuarter || null,
        treasurerApproved: budgetChanged ? false : (existing?.treasurerApproved || false),
        treasurerApprovedBy: budgetChanged ? null : (existing?.treasurerApprovedBy || null),
        treasurerApprovedAt: budgetChanged ? null : (existing?.treasurerApprovedAt || null),
        treasurerComment: existing?.treasurerComment || null,
        comments: existing?.comments || [],
      })
      logAction({
        admin: permissions?.email || 'admin',
        action: editingId ? 'EDIT' : 'CREATE',
        module: 'Avenue Projects',
        item: form.title,
        details: `${editingId ? 'Updated' : 'Added'} prospective project for ${form.avenue}`,
      })
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const cycleStatus = async (idea) => {
    if (!canEditIdea(idea)) return
    const next = STATUS_STEPS[(STATUS_STEPS.indexOf(idea.status || 'idea') + 1) % STATUS_STEPS.length]
    await save({ ...idea, status: next })
  }

  const moveToStatus = async (idea, status) => {
    if (!canEditIdea(idea) || idea.status === status) return
    await save({ ...idea, status })
  }

  // Approving asks which quarter the project is targeted for; un-approving needs no prompt.
  // Projects budgeted over the treasurer threshold can't be approved until the Treasurer signs off.
  const openApprove = (idea) => {
    if (!canApprove) return
    if (needsTreasurerApproval(idea) && !idea.treasurerApproved) return
    setApproveQuarter(idea.approvedQuarter || upcomingQuarters()[0])
    setApproveTarget(idea)
  }

  const confirmApprove = async () => {
    if (!approveTarget || !approveQuarter) return
    const idea = approveTarget
    await save({
      ...idea,
      approved: true,
      approvedBy: permissions?.name || permissions?.email,
      approvedByRole: permissions?.role || null,
      approvedAt: new Date().toISOString(),
      approvedQuarter: approveQuarter,
    })
    logAction({
      admin: permissions?.email || 'admin',
      action: 'APPROVE',
      module: 'Avenue Projects',
      item: idea.title,
      details: `Approved prospective project for ${idea.avenue} — targeted for ${approveQuarter}`,
    })
    setApproveTarget(null)
    setApproveQuarter('')
  }

  const unapprove = async (idea) => {
    if (!canApprove) return
    await save({ ...idea, approved: false, approvedBy: null, approvedByRole: null, approvedAt: null, approvedQuarter: null })
    logAction({
      admin: permissions?.email || 'admin',
      action: 'UNAPPROVE',
      module: 'Avenue Projects',
      item: idea.title,
      details: `Un-approved prospective project for ${idea.avenue}`,
    })
  }

  const openTreasurerReview = (idea) => {
    if (!canTreasurerApprove) return
    setTreasurerComment(idea.treasurerComment || '')
    setTreasurerAllocation(idea.clubAllocation != null ? String(idea.clubAllocation) : '')
    setTreasurerTarget(idea)
  }

  const confirmTreasurerApprove = async () => {
    if (!treasurerTarget) return
    const idea = treasurerTarget
    const clubAllocation = treasurerAllocation !== '' ? Number(treasurerAllocation) : (idea.clubAllocation ?? null)
    await save({
      ...idea,
      clubAllocation,
      treasurerApproved: true,
      treasurerApprovedBy: permissions?.name || permissions?.email,
      treasurerApprovedAt: new Date().toISOString(),
      treasurerComment: treasurerComment.trim() || null,
    })
    logAction({
      admin: permissions?.email || 'admin',
      action: 'TREASURER_APPROVE',
      module: 'Avenue Projects',
      item: idea.title,
      details: `Treasurer approved ₹${(clubAllocation ?? 0).toLocaleString('en-IN')} from club funds (of ₹${Number(idea.estimatedBudget).toLocaleString('en-IN')} total) for ${idea.avenue}`,
    })
    setTreasurerTarget(null)
    setTreasurerComment('')
    setTreasurerAllocation('')
  }

  // Treasurer can leave a note (and adjust the allocation) without formally approving/revoking.
  const saveTreasurerComment = async () => {
    if (!treasurerTarget) return
    const clubAllocation = treasurerAllocation !== '' ? Number(treasurerAllocation) : (treasurerTarget.clubAllocation ?? null)
    await save({ ...treasurerTarget, clubAllocation, treasurerComment: treasurerComment.trim() || null })
    setTreasurerTarget(null)
    setTreasurerComment('')
    setTreasurerAllocation('')
  }

  const revokeTreasurerApproval = async (idea) => {
    if (!canTreasurerApprove) return
    await save({ ...idea, treasurerApproved: false, treasurerApprovedBy: null, treasurerApprovedAt: null })
    logAction({
      admin: permissions?.email || 'admin',
      action: 'TREASURER_UNAPPROVE',
      module: 'Avenue Projects',
      item: idea.title,
      details: `Treasurer approval revoked for ${idea.avenue}`,
    })
  }

  const addComment = async (idea) => {
    if (!canApprove) return
    const text = (commentDrafts[idea.id] || '').trim()
    if (!text) return
    const comment = {
      id: `${Date.now()}`,
      author: permissions?.name || permissions?.email || 'Admin',
      text,
      createdAt: new Date().toISOString(),
    }
    await save({ ...idea, comments: [...(idea.comments || []), comment] })
    setCommentDrafts(d => ({ ...d, [idea.id]: '' }))
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    await remove(deleteTarget.id)
    logAction({
      admin: permissions?.email || 'admin',
      action: 'DELETE',
      module: 'Avenue Projects',
      item: deleteTarget.title,
      details: `Removed prospective project from ${deleteTarget.avenue}`,
    })
    setDeleteTarget(null)
  }

  // Approved projects graduate to the Active Projects workspace — hide them from the
  // prospective pitch board so this stays a pipeline of ideas, not a running archive.
  const filtered = ideas
    .filter(i => !i.approved)
    .filter(i => filterAvenue === 'All' || i.avenue === filterAvenue)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

  const liveSelectedIdea = selectedIdea ? (ideas.find(i => i.id === selectedIdea.id) || selectedIdea) : null

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

  return (
    <section className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="flex items-start gap-3 mb-10"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button onClick={onBack} className="mt-6 p-2.5 rounded-xl border border-gray-200 hover:bg-white transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-rotary-blue animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-rotary-blue">Avenue Directors</p>
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal">Prospective Projects</h2>
            <p className="text-sm text-gray-400">
              A shared space for Club Service, Community Service, Professional Development &amp; International Service
              directors to pitch project ideas ahead of planning them formally.
            </p>
          </div>
        </motion.div>

        {!hasEditPerm && !canApprove && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rotary-gold/10 border border-rotary-gold/30 text-sm font-medium text-rotary-gold">
            View only — you don't have edit access to Avenue Project Planning.
          </div>
        )}
        {avenueLocked && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rotary-blue/5 border border-rotary-blue/20 text-sm font-medium text-rotary-blue">
            You can add and edit ideas for {myAvenue} — other avenues are shown read-only.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {['All', ...avenueDirectorAvenues].map(a => (
              <button
                key={a}
                onClick={() => setFilterAvenue(a)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterAvenue === a ? 'bg-rotary-blue text-white border-rotary-blue' : 'border-gray-200 text-gray-500 hover:border-rotary-blue/40 bg-white'}`}
              >
                {a}
              </button>
            ))}
            <div className="flex items-center gap-1 ml-2 p-1 rounded-lg bg-gray-100 border border-gray-200">
              {[{ key: 'board', label: 'Board', icon: Icon.Grid }, { key: 'list', label: 'List', icon: Icon.List }].map(v => (
                <button
                  key={v.key}
                  onClick={() => setViewMode(v.key)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${viewMode === v.key ? 'bg-white text-rotary-charcoal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <v.icon className="w-3.5 h-3.5" />
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          {hasEditPerm && (
            <div className="flex gap-2">
              {isSuperAdmin && (
                <button
                  onClick={handleSeedTestData}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  title="Temporary: adds 5 dummy projects for testing"
                >
                  <Icon.Flask className="w-4 h-4" />
                  Add 5 Test Projects
                </button>
              )}
              <button
                onClick={() => { if (showForm && !editingId) resetForm(); else { resetForm(); setShowForm(true) } }}
                className="px-4 py-2.5 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors"
              >
                {showForm && !editingId ? 'Cancel' : '+ New Prospective Project'}
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showForm && hasEditPerm && (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 overflow-hidden"
            >
              <h3 className="font-display font-semibold text-lg mb-4">{editingId ? 'Edit Prospective Project' : 'New Prospective Project'}</h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Avenue</label>
                  <select
                    className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                    value={form.avenue}
                    disabled={avenueLocked}
                    onChange={e => setForm(f => ({ ...f, avenue: e.target.value }))}
                  >
                    {avenueDirectorAvenues.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Project Title</label>
                  <input className={inputClass} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Blood Donation Drive" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Area of Focus (optional)</label>
                  <select className={inputClass} value={form.areaOfFocus} onChange={e => setForm(f => ({ ...f, areaOfFocus: e.target.value }))}>
                    <option value="">None</option>
                    {areasOfFocus.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority</label>
                  <select className={inputClass} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITY_STEPS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                  <select className={inputClass} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_STEPS.map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Project Lead (optional)</label>
                  <input className={inputClass} value={form.projectLead} onChange={e => setForm(f => ({ ...f, projectLead: e.target.value }))} placeholder="Who will run this on the ground" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Venue (optional)</label>
                  <input className={inputClass} value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="e.g. BTM Community Hall" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Target Timeline (optional)</label>
                  <input className={inputClass} value={form.targetTimeline} onChange={e => setForm(f => ({ ...f, targetTimeline: e.target.value }))} placeholder="e.g. Q3 2026" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Estimated Budget (optional)</label>
                  <input type="number" min="0" className={inputClass} value={form.estimatedBudget} onChange={e => setForm(f => ({ ...f, estimatedBudget: e.target.value }))} placeholder="₹ total project cost" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Club Allocation {canTreasurerApprove ? '(optional)' : '(set by Treasurer)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                    value={form.clubAllocation}
                    disabled={!canTreasurerApprove}
                    title={!canTreasurerApprove ? 'Only the Treasurer can decide how much the club funds — set via Treasurer Review.' : undefined}
                    onChange={e => setForm(f => ({ ...f, clubAllocation: e.target.value }))}
                    placeholder="₹ funded by the club"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Volunteers Needed (optional)</label>
                  <input type="number" min="0" className={inputClass} value={form.volunteersNeeded} onChange={e => setForm(f => ({ ...f, volunteersNeeded: e.target.value }))} placeholder="e.g. 10" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Expected Impact (optional)</label>
                  <input className={inputClass} value={form.expectedImpact} onChange={e => setForm(f => ({ ...f, expectedImpact: e.target.value }))} placeholder="e.g. ~300 beneficiaries reached" />
                </div>
                {fundraiseAmount(form) != null && fundraiseAmount(form) > 0 && (
                  <div className="flex items-center gap-1.5 sm:col-span-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                    <Icon.Megaphone className="w-3.5 h-3.5 shrink-0" />
                    ₹{fundraiseAmount(form).toLocaleString('en-IN')} will need to be fundraised (₹{Number(form.estimatedBudget || 0).toLocaleString('en-IN')} total − ₹{Number(form.clubAllocation || 0).toLocaleString('en-IN')} from club)
                  </div>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Description / Notes</label>
                <textarea className={inputClass} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's the idea, why it matters, who it'll involve…" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-rotary-blue text-white font-semibold hover:bg-rotary-blue-dark disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Prospective Project'}
                </button>
                <button type="button" onClick={resetForm} className="px-6 py-2.5 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-rotary-blue/20 border-t-rotary-blue rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 bg-white rounded-2xl border border-gray-100">
            <Icon.Bulb className="w-10 h-10 text-gray-300 mb-4" />
            <p className="font-display font-bold text-lg">No prospective projects yet</p>
            <p className="text-sm text-gray-400 mt-1">Directors can pitch ideas here ahead of formal project planning.</p>
          </div>
        ) : viewMode === 'board' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {STATUS_STEPS.map(step => {
              const priorityRank = { High: 0, Medium: 1, Low: 2 }
              const columnIdeas = filtered
                .filter(i => (i.status || 'idea') === step)
                .sort((a, b) => (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1))
              return (
                <div
                  key={step}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (draggedId) { const idea = filtered.find(i => i.id === draggedId); if (idea) moveToStatus(idea, step) } setDraggedId(null) }}
                  className="bg-gray-100/70 rounded-2xl p-3 min-h-[200px]"
                >
                  <div className="flex items-center justify-between px-1.5 mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{STATUS_STYLES[step].label}</p>
                    <span className="text-xs font-bold text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">{columnIdeas.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {columnIdeas.map(idea => {
                      const editable = canEditIdea(idea)
                      return (
                        <motion.div
                          key={idea.id}
                          layout
                          draggable={editable}
                          onDragStart={() => setDraggedId(idea.id)}
                          onDragEnd={() => setDraggedId(null)}
                          onClick={() => setSelectedIdea(idea)}
                          className={`bg-white rounded-xl border-l-4 border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-all ${editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${draggedId === idea.id ? 'opacity-40' : ''} ${idea.priority === 'High' ? 'border-l-red-400' : idea.priority === 'Low' ? 'border-l-gray-300' : 'border-l-blue-400'}`}
                        >
                          <p className="font-display font-bold text-sm mb-1.5 leading-snug">{idea.title}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            <AvenueBadge avenue={idea.avenue} />
                            {needsTreasurerApproval(idea) && !idea.treasurerApproved && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                                <Icon.Cash className="w-3 h-3" /> Needs Treasurer
                              </span>
                            )}
                            {idea.approved && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                <Icon.Check className="w-3 h-3" /> {idea.approvedQuarter || 'Approved'}
                              </span>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {idea.targetTimeline && <p className="flex items-center gap-1 text-[10px] text-gray-400"><Icon.Calendar className="w-3 h-3" /> {idea.targetTimeline}</p>}
                            {idea.projectLead && <p className="flex items-center gap-1 text-[10px] text-gray-400"><Icon.User className="w-3 h-3" /> {idea.projectLead}</p>}
                            {idea.volunteersNeeded != null && idea.volunteersNeeded !== '' && <p className="flex items-center gap-1 text-[10px] text-gray-400"><Icon.Users className="w-3 h-3" /> {idea.volunteersNeeded} needed</p>}
                            {fundraiseAmount(idea) != null && fundraiseAmount(idea) > 0 && <p className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold"><Icon.Megaphone className="w-3 h-3" /> ₹{fundraiseAmount(idea).toLocaleString('en-IN')} to fundraise</p>}
                          </div>
                          {!idea.approved && step === 'ready' && needsTreasurerApproval(idea) && !idea.treasurerApproved && canTreasurerApprove && (
                            <button
                              onClick={e => { e.stopPropagation(); openTreasurerReview(idea) }}
                              className="flex items-center justify-center gap-1.5 mt-2 w-full px-2 py-1.5 rounded-lg text-[10px] font-bold border border-sky-200 text-sky-600 hover:bg-sky-50 transition-colors"
                            >
                              <Icon.Cash className="w-3 h-3" /> Treasurer Review
                            </button>
                          )}
                          {canApprove && !idea.approved && step === 'ready' && (!needsTreasurerApproval(idea) || idea.treasurerApproved) && (
                            <button
                              onClick={e => { e.stopPropagation(); openApprove(idea) }}
                              className="mt-2 w-full px-2 py-1.5 rounded-lg text-[10px] font-bold border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                        </motion.div>
                      )
                    })}
                    {columnIdeas.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-6">Drop cards here</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((idea, i) => {
              const editable = canEditIdea(idea)
              const commentsOpen = !!expandedComments[idea.id]
              const comments = idea.comments || []
              return (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div>
                      <p onClick={() => setSelectedIdea(idea)} className="font-display font-bold text-base mb-1.5 cursor-pointer hover:text-rotary-blue transition-colors">{idea.title}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <AvenueBadge avenue={idea.avenue} />
                        {idea.areaOfFocus && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">{idea.areaOfFocus}</span>
                        )}
                        {editable ? (
                          <button onClick={() => cycleStatus(idea)}><StatusBadge status={idea.status} /></button>
                        ) : (
                          <StatusBadge status={idea.status} />
                        )}
                        <PriorityBadge priority={idea.priority} />
                        {needsTreasurerApproval(idea) && (
                          idea.treasurerApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-sky-50 text-sky-700 border-sky-200">
                              <Icon.Cash className="w-3 h-3" /> Treasurer OK{idea.treasurerApprovedBy ? ` — ${idea.treasurerApprovedBy}` : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
                              <Icon.Cash className="w-3 h-3" /> Needs Treasurer Approval
                            </span>
                          )
                        )}
                        {idea.approved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                            {approvalLabel(idea)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {editable && (
                        <>
                          <button onClick={() => startEdit(idea)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-colors">Edit</button>
                          <button onClick={() => setDeleteTarget(idea)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors">Delete</button>
                        </>
                      )}
                      {canTreasurerApprove && needsTreasurerApproval(idea) && (
                        idea.treasurerApproved ? (
                          <button onClick={() => revokeTreasurerApproval(idea)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-sky-200 text-sky-600 hover:bg-sky-50 transition-colors">Revoke Treasury OK</button>
                        ) : (
                          <button onClick={() => openTreasurerReview(idea)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-sky-200 text-sky-600 hover:bg-sky-50 transition-colors"><Icon.Cash className="w-3.5 h-3.5" /> Treasurer Review</button>
                        )
                      )}
                      {canApprove && (
                        <button
                          onClick={() => idea.approved ? unapprove(idea) : openApprove(idea)}
                          disabled={!idea.approved && needsTreasurerApproval(idea) && !idea.treasurerApproved}
                          title={!idea.approved && needsTreasurerApproval(idea) && !idea.treasurerApproved ? `Needs Treasurer approval first (budget over ₹${TREASURER_APPROVAL_THRESHOLD.toLocaleString('en-IN')})` : undefined}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            idea.approved
                              ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {idea.approved ? 'Unapprove' : 'Approve'}
                        </button>
                      )}
                    </div>
                  </div>
                  {idea.description && <p className="text-sm text-gray-500 mt-2">{idea.description}</p>}
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                    {idea.targetTimeline && <span className="flex items-center gap-1"><Icon.Calendar className="w-3.5 h-3.5" /> {idea.targetTimeline}</span>}
                    {idea.estimatedBudget != null && idea.estimatedBudget !== '' && <span className="flex items-center gap-1"><Icon.Cash className="w-3.5 h-3.5" /> ₹{Number(idea.estimatedBudget).toLocaleString('en-IN')} total</span>}
                    {idea.clubAllocation != null && idea.clubAllocation !== '' && <span className="flex items-center gap-1"><Icon.Building className="w-3.5 h-3.5" /> ₹{Number(idea.clubAllocation).toLocaleString('en-IN')} from club</span>}
                    {fundraiseAmount(idea) != null && fundraiseAmount(idea) > 0 && <span className="flex items-center gap-1 text-amber-600 font-semibold"><Icon.Megaphone className="w-3.5 h-3.5" /> ₹{fundraiseAmount(idea).toLocaleString('en-IN')} to fundraise</span>}
                    {idea.projectLead && <span className="flex items-center gap-1"><Icon.User className="w-3.5 h-3.5" /> Lead: {idea.projectLead}</span>}
                    {idea.venue && <span className="flex items-center gap-1"><Icon.Location className="w-3.5 h-3.5" /> {idea.venue}</span>}
                    {idea.volunteersNeeded != null && idea.volunteersNeeded !== '' && <span className="flex items-center gap-1"><Icon.Users className="w-3.5 h-3.5" /> {idea.volunteersNeeded} volunteers</span>}
                    {idea.expectedImpact && <span className="flex items-center gap-1"><Icon.Target className="w-3.5 h-3.5" /> {idea.expectedImpact}</span>}
                    {idea.createdBy && <span className="flex items-center gap-1"><Icon.User className="w-3.5 h-3.5" /> Pitched by {idea.createdBy}</span>}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => setExpandedComments(s => ({ ...s, [idea.id]: !s[idea.id] }))}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-rotary-blue transition-colors"
                    >
                      <Icon.Chat className="w-3.5 h-3.5" /> {comments.length ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comments'}
                    </button>
                    {commentsOpen && (
                      <div className="mt-3 space-y-2">
                        {comments.map(c => (
                          <div key={c.id} className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className="text-xs font-bold text-gray-600">{c.author}</p>
                              <p className="text-[10px] text-gray-400">{formatWhen(c.createdAt)}</p>
                            </div>
                            <p className="text-sm text-gray-500">{c.text}</p>
                          </div>
                        ))}
                        {comments.length === 0 && <p className="text-xs text-gray-400">No comments yet.</p>}
                        {canApprove && (
                          <div className="flex gap-2 pt-1">
                            <input
                              className={`${inputClass} flex-1`}
                              placeholder="Add a comment…"
                              value={commentDrafts[idea.id] || ''}
                              onChange={e => setCommentDrafts(d => ({ ...d, [idea.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addComment(idea) } }}
                            />
                            <button
                              onClick={() => addComment(idea)}
                              className="px-4 py-2 rounded-xl bg-rotary-blue text-white text-xs font-semibold hover:bg-rotary-blue-dark transition-colors shrink-0"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteTarget(null)} />
            <motion.div
              className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            >
              <h3 className="font-display font-semibold text-lg mb-2">Delete prospective project?</h3>
              <p className="text-sm text-gray-500 mb-6">
                This will permanently remove "{deleteTarget.title}" from {deleteTarget.avenue}'s planning space.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-medium">Cancel</button>
                <button onClick={handleDeleteConfirm} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {approveTarget && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setApproveTarget(null)} />
            <motion.div
              className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            >
              <h3 className="font-display font-semibold text-lg mb-2">Approve "{approveTarget.title}"?</h3>
              <p className="text-sm text-gray-500 mb-4">Which quarter is this project targeted for?</p>
              <select
                autoFocus
                className={`${inputClass} mb-6`}
                value={approveQuarter}
                onChange={e => setApproveQuarter(e.target.value)}
              >
                {upcomingQuarters().map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <div className="flex gap-3">
                <button onClick={() => setApproveTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-medium">Cancel</button>
                <button onClick={confirmApprove} disabled={!approveQuarter} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors">Approve</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {treasurerTarget && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setTreasurerTarget(null)} />
            <motion.div
              className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            >
              <h3 className="font-display font-semibold text-lg mb-1">Treasurer Review</h3>
              <p className="text-sm text-gray-500 mb-1">"{treasurerTarget.title}" — {treasurerTarget.avenue}</p>
              <p className="flex items-center gap-1.5 text-sm font-bold text-rotary-charcoal mb-4"><Icon.Cash className="w-4 h-4 shrink-0" /> ₹{Number(treasurerTarget.estimatedBudget).toLocaleString('en-IN')} total budget requested</p>

              <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount to allocate from club funds</label>
              <input
                autoFocus
                type="number"
                min="0"
                max={treasurerTarget.estimatedBudget || undefined}
                className={`${inputClass} mb-2`}
                value={treasurerAllocation}
                onChange={e => setTreasurerAllocation(e.target.value)}
                placeholder="₹"
              />
              <p className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold mb-4">
                <Icon.Megaphone className="w-3.5 h-3.5 shrink-0" />
                ₹{Math.max(0, Number(treasurerTarget.estimatedBudget || 0) - Number(treasurerAllocation || 0)).toLocaleString('en-IN')} left for the team to fundraise
              </p>

              <label className="block text-xs font-medium text-gray-500 mb-1.5">Comment (optional)</label>
              <textarea
                className={`${inputClass} mb-6`}
                rows={3}
                value={treasurerComment}
                onChange={e => setTreasurerComment(e.target.value)}
                placeholder="Any notes on the budget, e.g. quotes needed, adjust line items…"
              />
              <div className="flex gap-3">
                <button onClick={() => setTreasurerTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-medium">Cancel</button>
                <button onClick={saveTreasurerComment} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition-colors">Save Comment Only</button>
              </div>
              <button onClick={confirmTreasurerApprove} className="flex items-center justify-center gap-1.5 w-full mt-2 px-4 py-2.5 rounded-xl bg-sky-500 text-white font-medium hover:bg-sky-600 transition-colors"><Icon.Check className="w-4 h-4" /> Approve Budget</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {liveSelectedIdea && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedIdea(null)} />
            <motion.div
              className="relative w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            >
              <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Project Summary</p>
                  <h3 className="font-display font-bold text-xl leading-snug">{liveSelectedIdea.title}</h3>
                </div>
                <button onClick={() => setSelectedIdea(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  <AvenueBadge avenue={liveSelectedIdea.avenue} />
                  {liveSelectedIdea.areaOfFocus && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">{liveSelectedIdea.areaOfFocus}</span>
                  )}
                  <StatusBadge status={liveSelectedIdea.status} />
                  <PriorityBadge priority={liveSelectedIdea.priority} />
                  {needsTreasurerApproval(liveSelectedIdea) && (
                    liveSelectedIdea.treasurerApproved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-sky-50 text-sky-700 border-sky-200">
                        <Icon.Cash className="w-3 h-3" /> Treasurer OK{liveSelectedIdea.treasurerApprovedBy ? ` — ${liveSelectedIdea.treasurerApprovedBy}` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
                        <Icon.Cash className="w-3 h-3" /> Needs Treasurer Approval (over ₹{TREASURER_APPROVAL_THRESHOLD.toLocaleString('en-IN')})
                      </span>
                    )
                  )}
                  {liveSelectedIdea.approved && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                      {approvalLabel(liveSelectedIdea)}
                    </span>
                  )}
                </div>

                {/* Stage changer — touch-friendly alternative to Kanban drag (works on mobile). */}
                {canEditIdea(liveSelectedIdea) && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Stage</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_STEPS.map(step => (
                        <button
                          key={step}
                          onClick={() => moveToStatus(liveSelectedIdea, step)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            (liveSelectedIdea.status || 'idea') === step
                              ? 'bg-rotary-blue text-white border-rotary-blue'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-rotary-blue/40'
                          }`}
                        >
                          {STATUS_STYLES[step].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {liveSelectedIdea.treasurerComment && (
                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100">
                    <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-sky-600 font-bold mb-1.5"><Icon.Cash className="w-3 h-3" /> Treasurer's Note</p>
                    <p className="text-sm text-sky-900">{liveSelectedIdea.treasurerComment}</p>
                  </div>
                )}

                {liveSelectedIdea.description && (
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">Description</p>
                    <p className="text-sm text-gray-600">{liveSelectedIdea.description}</p>
                  </div>
                )}

                {liveSelectedIdea.expectedImpact && (
                  <div className="p-3.5 rounded-xl bg-rotary-blue/5 border border-rotary-blue/20">
                    <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-rotary-blue font-bold mb-1.5"><Icon.Target className="w-3 h-3" /> Expected Impact</p>
                    <p className="text-sm text-rotary-charcoal">{liveSelectedIdea.expectedImpact}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  {liveSelectedIdea.projectLead && (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Project Lead</p>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-rotary-charcoal"><Icon.User className="w-3.5 h-3.5 shrink-0" /> {liveSelectedIdea.projectLead}</p>
                    </div>
                  )}
                  {liveSelectedIdea.venue && (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Venue</p>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-rotary-charcoal"><Icon.Location className="w-3.5 h-3.5 shrink-0" /> {liveSelectedIdea.venue}</p>
                    </div>
                  )}
                  {liveSelectedIdea.targetTimeline && (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Timeline</p>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-rotary-charcoal"><Icon.Calendar className="w-3.5 h-3.5 shrink-0" /> {liveSelectedIdea.targetTimeline}</p>
                    </div>
                  )}
                  {liveSelectedIdea.estimatedBudget != null && liveSelectedIdea.estimatedBudget !== '' && (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Total Budget</p>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-rotary-charcoal"><Icon.Cash className="w-3.5 h-3.5 shrink-0" /> ₹{Number(liveSelectedIdea.estimatedBudget).toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  {liveSelectedIdea.clubAllocation != null && liveSelectedIdea.clubAllocation !== '' && (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">From Club</p>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-rotary-charcoal"><Icon.Building className="w-3.5 h-3.5 shrink-0" /> ₹{Number(liveSelectedIdea.clubAllocation).toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  {fundraiseAmount(liveSelectedIdea) != null && fundraiseAmount(liveSelectedIdea) > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 col-span-2">
                      <p className="text-[10px] uppercase tracking-widest text-amber-600 font-bold mb-0.5">To Fundraise</p>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700"><Icon.Megaphone className="w-3.5 h-3.5 shrink-0" /> ₹{fundraiseAmount(liveSelectedIdea).toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  {liveSelectedIdea.volunteersNeeded != null && liveSelectedIdea.volunteersNeeded !== '' && (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Volunteers Needed</p>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-rotary-charcoal"><Icon.Users className="w-3.5 h-3.5 shrink-0" /> {liveSelectedIdea.volunteersNeeded}</p>
                    </div>
                  )}
                  {liveSelectedIdea.createdBy && (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Pitched By</p>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-rotary-charcoal"><Icon.User className="w-3.5 h-3.5 shrink-0" /> {liveSelectedIdea.createdBy}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">
                    <Icon.Chat className="w-3 h-3" /> Comments {(liveSelectedIdea.comments || []).length > 0 ? `(${liveSelectedIdea.comments.length})` : ''}
                  </p>
                  <div className="space-y-2">
                    {(liveSelectedIdea.comments || []).map(c => (
                      <div key={c.id} className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-xs font-bold text-gray-600">{c.author}</p>
                          <p className="text-[10px] text-gray-400">{formatWhen(c.createdAt)}</p>
                        </div>
                        <p className="text-sm text-gray-500">{c.text}</p>
                      </div>
                    ))}
                    {(liveSelectedIdea.comments || []).length === 0 && <p className="text-xs text-gray-400">No comments yet.</p>}
                    {canApprove && (
                      <div className="flex gap-2 pt-1">
                        <input
                          className={`${inputClass} flex-1`}
                          placeholder="Add a comment…"
                          value={commentDrafts[liveSelectedIdea.id] || ''}
                          onChange={e => setCommentDrafts(d => ({ ...d, [liveSelectedIdea.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addComment(liveSelectedIdea) } }}
                        />
                        <button
                          onClick={() => addComment(liveSelectedIdea)}
                          className="px-4 py-2 rounded-xl bg-rotary-blue text-white text-xs font-semibold hover:bg-rotary-blue-dark transition-colors shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(canEditIdea(liveSelectedIdea) || canApprove || canTreasurerApprove) && (
                <div className="flex flex-wrap gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
                  {canEditIdea(liveSelectedIdea) && (
                    <>
                      <button onClick={() => { setSelectedIdea(null); startEdit(liveSelectedIdea) }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors">Edit</button>
                      <button onClick={() => { setSelectedIdea(null); setDeleteTarget(liveSelectedIdea) }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors">Delete</button>
                    </>
                  )}
                  {canTreasurerApprove && needsTreasurerApproval(liveSelectedIdea) && (
                    liveSelectedIdea.treasurerApproved ? (
                      <button onClick={() => revokeTreasurerApproval(liveSelectedIdea)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-sky-200 text-sky-600 hover:bg-sky-50 transition-colors">Revoke Treasury OK</button>
                    ) : (
                      <button onClick={() => openTreasurerReview(liveSelectedIdea)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-sky-200 text-sky-600 hover:bg-sky-50 transition-colors"><Icon.Cash className="w-4 h-4" /> Treasurer Review</button>
                    )
                  )}
                  {canApprove && (
                    <button
                      onClick={() => liveSelectedIdea.approved ? unapprove(liveSelectedIdea) : openApprove(liveSelectedIdea)}
                      disabled={!liveSelectedIdea.approved && needsTreasurerApproval(liveSelectedIdea) && !liveSelectedIdea.treasurerApproved}
                      title={!liveSelectedIdea.approved && needsTreasurerApproval(liveSelectedIdea) && !liveSelectedIdea.treasurerApproved ? `Needs Treasurer approval first (budget over ₹${TREASURER_APPROVAL_THRESHOLD.toLocaleString('en-IN')})` : undefined}
                      className={`ml-auto px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${liveSelectedIdea.approved ? 'border-gray-200 text-gray-500 hover:bg-gray-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                    >
                      {liveSelectedIdea.approved ? 'Unapprove' : 'Approve'}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

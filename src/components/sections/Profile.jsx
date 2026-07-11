import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { sendSetupEmail } from '../../firebase'
import { useCollection } from '../../hooks/useFirestore'
import {
  PERMISSION_SECTIONS,
  ROLE_PRESETS,
  ROLE_BADGE_STYLES,
  ROLE_AVATAR_BG,
  DEFAULT_BADGE_STYLE,
  DEFAULT_AVATAR_BG,
  SUPER_ADMIN_AVATAR_BG,
  StarIcon,
  TargetIcon,
  EyeIcon,
} from './UserManagement'
import { needsTreasurerApproval, fundsRemaining } from './AvenueProjects'

function CheckIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  )
}

const iconProps = { className: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.8 }

// Icons used by the pending/assigned task list. SVG (not emoji) per house style.
const TASK_ICONS = {
  blog: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  approve: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  money: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  membership: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
  assigned: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  task: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7l2 2 4-4" /></svg>,
}

const TASK_TONES = {
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  pink: 'bg-pink-50 text-pink-600',
  blue: 'bg-blue-50 text-blue-600',
  indigo: 'bg-indigo-50 text-indigo-600',
}

const norm = (v) => (v || '').trim().toLowerCase()

// Mirrors MembershipAdmin.jsx — the Membership Director owns new applications
// first and assigns them out from there. President is the fallback owner when
// no Membership Director is configured.
function isMembershipDirector(m) {
  const r = `${m.role || ''} ${m.role2 || ''}`.toLowerCase()
  return r.includes('director') && m.avenue === 'Membership'
}
function isPresident(m) {
  const r = `${m.role || ''} ${m.role2 || ''}`.toLowerCase()
  return r.includes('president') && !r.includes('vice') && !r.includes('past') && !r.includes('ipp')
}

// Action-item owners and MoM records store free-text names ("Rtr Divya") that
// rarely match a profile name ("Rtn Rtr Divya Gaur") exactly. Strip Rotary
// honorifics and compare on the remaining tokens so tasks aren't silently missed.
const HONORIFICS = new Set(['rtn', 'rtr', 'pp', 'ipp', 'pdg', 'dg', 'dgn', 'dr', 'mr', 'ms', 'mrs', 'ann', 'ro'])
function coreName(v) {
  return norm(v).replace(/\./g, ' ').split(/\s+/).filter(t => t && !HONORIFICS.has(t)).join(' ')
}
function nameMatches(owner, candidates) {
  const o = coreName(owner)
  if (!o) return false
  return candidates.some(c => {
    const cc = coreName(c)
    return cc && (cc === o || cc.includes(o) || o.includes(cc))
  })
}

// Dates arrive as Firestore Timestamps (getDocs), ISO strings, or millis.
function toJsDate(v) {
  if (!v) return null
  if (typeof v?.toDate === 'function') return v.toDate()
  const d = new Date(v)
  return isNaN(d) ? null : d
}
function daysAgo(v) {
  const d = toJsDate(v)
  return d ? Math.floor((Date.now() - d.getTime()) / 86400000) : 0
}
function isOverdue(v) {
  const d = toJsDate(v)
  if (!d) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

export default function Profile({ permissions, onBack, onNavigate }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const isSuperAdmin = !!permissions?.isSuperAdmin
  const viewAll = !!permissions?.viewAll

  // What the logged-in person can act on / has been assigned. Approval groups
  // are gated by permission; assignment groups match on their name/email.
  const canApproveBlogs = isSuperAdmin
  const canApproveAvenue = isSuperAdmin || !!permissions?.avenueProjectsApprove
  const canTreasurer = isSuperAdmin || !!permissions?.treasurer
  const canMembership = isSuperAdmin || !!permissions?.membership
  const canOpenAvenue = canApproveAvenue || !!permissions?.avenueProjects || viewAll
  const canOpenMom = isSuperAdmin || !!permissions?.mom || viewAll
  const canOpenMembership = canMembership || viewAll
  const canEditEvents = isSuperAdmin || !!permissions?.events

  // Only fetch a collection when something on this page might reference it, and
  // read once (no persistent listener) — this is a glance view, not a live board.
  const { data: blogs, loading: blogsLoading } = useCollection('blogs', [], { enabled: canApproveBlogs, once: true })
  const { data: ideas, loading: ideasLoading } = useCollection('avenueProjects', [], { enabled: canApproveAvenue || canTreasurer || canEditEvents, once: true })
  const { data: applications, loading: applicationsLoading } = useCollection('membershipApplications', [], { enabled: canMembership, once: true })
  const { data: leaders, loading: leadersLoading } = useCollection('leaders', [], { once: true })
  const { data: moms, loading: momsLoading } = useCollection('moms', [], { once: true })

  const myLeader = useMemo(() => {
    const email = norm(permissions?.email)
    const name = norm(permissions?.name)
    return leaders.find(l => (email && norm(l.email) === email) || (name && norm(l.name) === name)) || null
  }, [leaders, permissions?.email, permissions?.name])
  const myLeaderId = myLeader?.id || null

  const membershipDirectorId = useMemo(() => leaders.find(isMembershipDirector)?.id || null, [leaders])
  const iAmMembershipDirector = !!myLeaderId && myLeaderId === membershipDirectorId
  const iAmPresident = !!myLeader && isPresident(myLeader)
  // New-application triage falls to the Membership Director; if none is set up,
  // the President (and always super admins) pick it up so it's never stranded.
  const canTriageMembership = isSuperAdmin || iAmMembershipDirector || (!membershipDirectorId && iAmPresident)

  const dataLoading =
    leadersLoading || momsLoading ||
    (canApproveBlogs && blogsLoading) ||
    ((canApproveAvenue || canTreasurer || canEditEvents) && ideasLoading) ||
    (canMembership && applicationsLoading)

  const tasks = useMemo(() => {
    const list = []
    const myNames = [permissions?.name, myLeader?.name].filter(Boolean)

    if (canApproveBlogs) {
      const n = blogs.filter(b => b.status === 'pending').length
      if (n) list.push({ key: 'blog', icon: 'blog', tone: 'amber', label: 'Blog posts awaiting approval', sub: 'Review and publish submitted posts', count: n, page: 'blog' })
    }

    if (canApproveAvenue) {
      // Ready for your approval — excludes ones still blocked on treasurer sign-off.
      const n = ideas.filter(i => !i.approved && !(needsTreasurerApproval(i) && !i.treasurerApproved)).length
      if (n) list.push({ key: 'avenue-approve', icon: 'approve', tone: 'violet', label: 'Avenue projects awaiting your approval', sub: 'Approve prospective project ideas', count: n, page: canOpenAvenue ? 'avenueProjects' : null })
    }

    if (canTreasurer) {
      const n = ideas.filter(i => !i.treasurerApproved && needsTreasurerApproval(i) && !i.approved).length
      if (n) list.push({ key: 'avenue-treasurer', icon: 'money', tone: 'emerald', label: 'Avenue projects awaiting treasurer sign-off', sub: 'Approve club funds for over-budget projects', count: n, page: canOpenAvenue ? 'avenueProjects' : null })

      // Approved projects that still have money left to raise.
      const gaps = ideas.filter(i => i.approved && !i.deletedAt && fundsRemaining(i) > 0).length
      if (gaps) list.push({ key: 'fundraising-gaps', icon: 'money', tone: 'emerald', label: 'Projects still raising funds', sub: 'Track contributions toward their targets', count: gaps, page: 'fundraising' })
    }

    // Completed projects a director asked to feature — super admin / secretary approve.
    if (canEditEvents) {
      const n = ideas.filter(i => i.featureRequested && !i.featurePublished && !i.deletedAt).length
      if (n) list.push({ key: 'feature-requests', icon: 'approve', tone: 'blue', label: 'Completed projects awaiting website feature', sub: 'Approve to publish them to the public site', count: n, page: 'activeProjects' })
    }

    // New applications are the Membership Director's to triage first (they auto-assign
    // to them); the Director — plus super admins / President fallback — see the queue.
    if (canTriageMembership) {
      const q = applications.filter(a =>
        (a.status || 'new') === 'new' && (!a.assignedTo || a.assignedTo === membershipDirectorId)
      )
      if (q.length) list.push({ key: 'membership-new', icon: 'membership', tone: 'pink', label: 'New membership applications', sub: 'Fresh applications to triage and assign', count: q.length, alert: q.filter(a => daysAgo(a.submittedAt) >= 7).length, alertLabel: 'aging', page: canOpenMembership ? 'membershipAdmin' : null, params: { statusFilter: 'new' } })
    }

    // Assigned to me — membership follow-ups still open (not approved/rejected).
    // The Director's own untriaged new ones are excluded here since they're the row above.
    if (myLeaderId) {
      const q = applications.filter(a =>
        a.assignedTo === myLeaderId &&
        !['approved', 'rejected'].includes(a.status || 'new') &&
        !(iAmMembershipDirector && (a.status || 'new') === 'new')
      )
      if (q.length) list.push({ key: 'membership-assigned', icon: 'assigned', tone: 'blue', label: 'Membership follow-ups assigned to you', sub: 'Applications you own until they close', count: q.length, alert: q.filter(a => daysAgo(a.submittedAt) >= 7).length, alertLabel: 'aging', page: canOpenMembership ? 'membershipAdmin' : null, params: { assigneeFilter: myLeaderId } })
    }

    // Assigned to me — MoM action items where I'm the owner and it isn't done.
    if (myNames.length) {
      const items = moms.flatMap(m => Array.isArray(m.actionItems)
        ? m.actionItems.filter(a => a.task && a.status !== 'Done' && nameMatches(a.owner, myNames))
        : [])
      if (items.length) list.push({ key: 'mom-actions', icon: 'task', tone: 'indigo', label: 'Action items assigned to you', sub: 'Open tasks from meeting minutes', count: items.length, alert: items.filter(a => isOverdue(a.deadline)).length, alertLabel: 'overdue', page: canOpenMom ? 'mom' : null })
    }

    return list
  }, [blogs, ideas, applications, moms, myLeader, myLeaderId, membershipDirectorId, iAmMembershipDirector, canTriageMembership, permissions?.name, canApproveBlogs, canApproveAvenue, canTreasurer, canEditEvents, canOpenAvenue, canOpenMom, canOpenMembership])

  const totalTasks = tasks.reduce((sum, t) => sum + t.count, 0)
  const presetKey = Object.entries(ROLE_PRESETS).find(([, v]) => v.label === permissions?.role)?.[0] || ''

  const badgeStyle = isSuperAdmin
    ? 'bg-rotary-gold/15 text-rotary-gold border-rotary-gold/30'
    : (ROLE_BADGE_STYLES[presetKey] || DEFAULT_BADGE_STYLE)
  const avatarBg = isSuperAdmin
    ? SUPER_ADMIN_AVATAR_BG
    : (ROLE_AVATAR_BG[presetKey] || DEFAULT_AVATAR_BG)

  const enabledCount = isSuperAdmin
    ? PERMISSION_SECTIONS.length
    : PERMISSION_SECTIONS.filter(s => permissions?.[s.key]).length

  const initials = (permissions?.name || permissions?.email || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()

  const handleResetPassword = async () => {
    if (!permissions?.email) return
    setSending(true)
    setError('')
    try {
      await sendSetupEmail(permissions.email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-6">
        <motion.div
          className="flex items-start gap-3 mb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button onClick={onBack} className="mt-6 p-2.5 rounded-xl border border-gray-200 hover:bg-white transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4006d] animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4006d]">My Account</p>
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal">Profile</h2>
            <p className="text-sm text-gray-400">Rotaract Club · Bengaluru BTM</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl border border-gray-100 p-6 mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-16 h-16 rounded-2xl ${avatarBg} text-white flex items-center justify-center font-bold text-xl shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-lg truncate">{permissions?.name || permissions?.email}</p>
              <p className="text-sm text-gray-400 truncate">{permissions?.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${badgeStyle}`}>
              {isSuperAdmin && <StarIcon className="w-3 h-3" />}
              {isSuperAdmin ? 'Super Admin' : (permissions?.role || 'Custom access')}
            </span>
            {permissions?.avenue && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-gray-50 text-gray-600 border-gray-200">
                <TargetIcon className="w-3 h-3" /> {permissions.avenue}
              </span>
            )}
            {!isSuperAdmin && permissions?.viewAll && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-rotary-gold/10 text-rotary-gold border-rotary-gold/30">
                <EyeIcon className="w-3 h-3" /> View-All
              </span>
            )}
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl border border-gray-100 p-6 mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Pending &amp; Assigned</h3>
            {totalTasks > 0 && (
              <span className="text-xs font-bold text-[#d4006d] px-2.5 py-1 rounded-full bg-[#d4006d]/10 border border-[#d4006d]/20">
                {totalTasks} to review
              </span>
            )}
          </div>

          {dataLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl border border-gray-100">
                  <span className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-2/5 rounded bg-gray-100 animate-pulse" />
                    <span className="block h-2.5 w-3/5 rounded bg-gray-50 animate-pulse" />
                  </span>
                  <span className="w-6 h-6 rounded-full bg-gray-100 animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <span className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
                <CheckIcon className="w-6 h-6" />
              </span>
              <p className="font-display font-semibold text-sm text-rotary-charcoal">You're all caught up</p>
              <p className="text-xs text-gray-400 mt-1">Nothing is waiting on you right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const clickable = !!task.page
                return (
                  <button
                    key={task.key}
                    type="button"
                    disabled={!clickable}
                    onClick={clickable ? () => onNavigate?.(task.page, task.params) : undefined}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl border border-gray-100 text-left transition-colors ${clickable ? 'hover:border-rotary-blue/40 hover:bg-rotary-blue/[0.03] cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TASK_TONES[task.tone]}`}>
                      {TASK_ICONS[task.icon]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-sm text-rotary-charcoal truncate">{task.label}</span>
                      <span className="block text-xs text-gray-400 truncate">{task.sub}</span>
                    </span>
                    {task.alert > 0 && (
                      <span className="inline-flex items-center h-6 px-2 rounded-full bg-red-50 text-red-600 text-[11px] font-bold shrink-0">
                        {task.alert} {task.alertLabel}
                      </span>
                    )}
                    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold shrink-0">
                      {task.count}
                    </span>
                    {clickable && (
                      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl border border-gray-100 p-6 mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Your Access</h3>
            <span className="text-xs font-semibold text-gray-400 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100">
              {enabledCount}/{PERMISSION_SECTIONS.length} sections
            </span>
          </div>

          {isSuperAdmin ? (
            <p className="text-xs text-gray-400 mb-4">Super admins have full edit access to every section.</p>
          ) : (
            <p className="text-xs text-gray-400 mb-4">Sections you can edit are highlighted below.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERMISSION_SECTIONS.map(section => {
              const on = isSuperAdmin || !!permissions?.[section.key]
              return (
                <div
                  key={section.key}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm rounded-xl border ${
                    on
                      ? 'bg-rotary-blue/10 border-rotary-blue/40 text-rotary-blue'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${on ? 'bg-rotary-blue text-white' : 'border border-gray-300'}`}>
                    {on && <CheckIcon className="w-2.5 h-2.5" />}
                  </span>
                  <span className="truncate">{section.label}</span>
                </div>
              )
            })}
          </div>

          {!isSuperAdmin && permissions?.viewAll && (
            <p className="text-xs text-gray-400 mt-4">You can also view (read-only) every section above, even the ones not highlighted.</p>
          )}
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl border border-gray-100 p-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="font-display font-semibold mb-1">Password</h3>
          <p className="text-sm text-gray-400 mb-4">Get a link emailed to you to set a new password.</p>
          {error && (
            <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <button
            onClick={handleResetPassword}
            disabled={sending || sent}
            className="px-5 py-2.5 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark disabled:opacity-50 transition-colors"
          >
            {sent ? 'Reset link sent ✓' : sending ? 'Sending…' : 'Email me a reset link'}
          </button>
        </motion.div>
      </div>
    </section>
  )
}

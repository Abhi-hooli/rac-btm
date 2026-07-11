import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loadFirestore, createAuthUser, sendSetupEmail, getCurrentAdminEmail } from '../../firebase'
import { useCollection } from '../../hooks/useFirestore'
import { softDelete, backupToSheet } from '../../utils/trash'

// ⚠️ ADJUST THESE KEYS to match what your dashboards check, e.g. user.permissions.treasurer
export const PERMISSION_SECTIONS = [
  { key: 'homepage', label: 'Homepage Content' },
  { key: 'events', label: 'Events & Calendar' },
  { key: 'projects', label: 'Projects & Reports' },
  { key: 'analytics', label: 'Club Analytics' },
  { key: 'attendance', label: 'Attendance Tracker' },
  { key: 'mom', label: 'MoM Tracker' },
  { key: 'treasurer', label: 'Finance Dashboard' },
  { key: 'rsvp', label: 'RSVP Manager' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'linkRedirects', label: 'Link Redirects' },
  { key: 'userManagement', label: 'User Management' },
  { key: 'membership', label: 'Membership Applications' },
  { key: 'avenueProjects', label: 'Avenue Project Planning' },
  { key: 'avenueProjectsApprove', label: 'Approve Avenue Projects' }
]

// Director role presets map 1:1 to an avenue — a director can only edit
// their own avenue's prospective projects (enforced in AvenueProjects.jsx
// via user.avenue), everyone else's is read-only to them.
const ROLE_AVENUE_MAP = {
  clubServiceDirector: 'Club Service',
  communityServiceDirector: 'Community Service',
  professionalDevelopmentDirector: 'Professional Development',
  internationalServiceDirector: 'International Service',
}

const emptyPermissions = () =>
  Object.fromEntries(PERMISSION_SECTIONS.map(s => [s.key, false]))

const allPermissions = () =>
  Object.fromEntries(PERMISSION_SECTIONS.map(s => [s.key, true]))

export const ROLE_PRESETS = {
  president: { label: 'President', perms: allPermissions() },
  secretary: {
    label: 'Secretary',
    perms: { ...emptyPermissions(), rsvp: true, attendance: true, mom: true, gallery: true, membership: true, events: true, avenueProjectsApprove: true }
  },
  treasurer: {
    label: 'Treasurer',
    perms: { ...emptyPermissions(), treasurer: true, analytics: true }
  },
  saa: {
    label: 'SAA',
    perms: { ...emptyPermissions(), attendance: true }
  },
  editor: {
    label: 'Editor',
    perms: { ...emptyPermissions(), gallery: true, homepage: true }
  },
  membershipDirector: {
    label: 'Membership Director',
    perms: { ...emptyPermissions(), membership: true }
  },
  clubServiceDirector: {
    label: 'Club Service Director',
    perms: { ...emptyPermissions(), avenueProjects: true }
  },
  communityServiceDirector: {
    label: 'Community Service Director',
    perms: { ...emptyPermissions(), avenueProjects: true }
  },
  professionalDevelopmentDirector: {
    label: 'Professional Development Director',
    perms: { ...emptyPermissions(), avenueProjects: true }
  },
  internationalServiceDirector: {
    label: 'International Service Director',
    perms: { ...emptyPermissions(), avenueProjects: true }
  },
  prTeam: {
    label: 'PR Team',
    perms: { ...emptyPermissions(), gallery: true, linkRedirects: true, events: true, projects: true }
  },
  admin: { label: 'Admin', perms: allPermissions() }
}

export const ROLE_BADGE_STYLES = {
  president: 'bg-rotary-gold/15 text-rotary-gold border-rotary-gold/30',
  secretary: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  treasurer: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  saa: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
  editor: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  membershipDirector: 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/30',
  clubServiceDirector: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
  communityServiceDirector: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  professionalDevelopmentDirector: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  internationalServiceDirector: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  prTeam: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30',
  admin: 'bg-rotary-blue/10 dark:bg-rotary-blue/20 text-rotary-blue border-rotary-blue/30'
}
export const DEFAULT_BADGE_STYLE = 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60 border-gray-200 dark:border-white/10'

export const ROLE_AVATAR_BG = {
  president: 'bg-rotary-gold',
  secretary: 'bg-blue-500',
  treasurer: 'bg-emerald-500',
  saa: 'bg-purple-500',
  editor: 'bg-amber-500',
  membershipDirector: 'bg-pink-500',
  clubServiceDirector: 'bg-purple-500',
  communityServiceDirector: 'bg-emerald-500',
  professionalDevelopmentDirector: 'bg-blue-500',
  internationalServiceDirector: 'bg-amber-500',
  prTeam: 'bg-cyan-500',
  admin: 'bg-rotary-blue'
}
export const DEFAULT_AVATAR_BG = 'bg-gray-400 dark:bg-white/20'
export const SUPER_ADMIN_AVATAR_BG = 'bg-gradient-to-br from-rotary-gold to-amber-500'

const SUPER_ADMIN_EMAIL = null // no longer needed

function initials(user) {
  const source = (user.name || user.email || '?').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function CheckIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export function StarIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17l1.5-4.5L12 11l-4.5-1.5L6 5l-1.5 4.5L0 11l4.5 1.5L6 17zM19 3l1.256 3.744L24 8l-3.744 1.256L19 13l-1.256-3.744L14 8l3.744-1.256L19 3z" />
    </svg>
  )
}

function UsersIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export function EyeIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

export function TargetIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="7" strokeWidth={2} />
      <circle cx="12" cy="12" r="2.5" strokeWidth={2} />
    </svg>
  )
}

export default function UserManagement({ onBack, readOnly = false, permissions }) {
  const { data: leaders } = useCollection('leaders')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('secretary')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // user object pending deletion
  const [confirmReset, setConfirmReset] = useState(null) // user object pending password reset
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [createdUser, setCreatedUser] = useState(null) // {email, password} shown once after creation
  const [copied, setCopied] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [resetSentEmail, setResetSentEmail] = useState('') // email that just got a reset link sent
  const [expandedId, setExpandedId] = useState(null)
  const [confirmSuperAdmin, setConfirmSuperAdmin] = useState(null) // { user, action: 'promote' | 'demote' }

  const canResetPasswords = permissions?.isSuperAdmin === true

  const matchedPresetKeyFor = (user) =>
    Object.entries(ROLE_PRESETS).find(([, v]) => v.label === user.role)?.[0] || ''

  const filteredUsers = users.filter(u => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q)
  })

  const superAdminCount = users.filter(u => u.isSuperAdmin === true).length
  const viewOnlyCount = users.filter(u => !u.isSuperAdmin && u.permissions?.viewAll && matchedPresetKeyFor(u) === '').length
  const customCount = users.filter(u => !u.isSuperAdmin && matchedPresetKeyFor(u) === '' && !u.permissions?.viewAll).length

  const loadUsers = async () => {
    setLoading(true)
    const { mod, db } = await loadFirestore()
    const snap = await mod.getDocs(mod.collection(db, 'users'))
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => !u.deletedAt))
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const addUser = async () => {
    setError('')
    const email = newEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setError('Enter a valid email.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    const { mod, db } = await loadFirestore()
    const dup = await mod.getDocs(mod.query(mod.collection(db, 'users'), mod.where('email', '==', email)))
    if (!dup.empty) {
      setError('A user with this email already exists.')
      return
    }
    setSaving(true)
    let uid
    try {
      uid = await createAuthUser(email, newPassword)
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use'
        ? 'This email already has a login account.'
        : err.message)
      setSaving(false)
      return
    }
    const newUser = {
      email,
      name: newName.trim(),
      role: ROLE_PRESETS[newRole].label,
      permissions: { ...ROLE_PRESETS[newRole].perms },
      avenue: ROLE_AVENUE_MAP[newRole] || null,
      createdAt: new Date().toISOString()
    }
    // Keyed by the account's own Auth uid — see migrateUserDocToUid in
    // firebase.js for why this matters for Firestore Security Rules.
    await mod.setDoc(mod.doc(db, 'users', uid), newUser)
    backupToSheet('users', uid, 'save', newUser, await getCurrentAdminEmail())
    setCreatedUser({ email, password: newPassword })
    setCopied(false)
    setEmailSent(false)
    setSelectedMemberId('')
    setNewEmail('')
    setNewName('')
    setNewPassword('')
    setSaving(false)
    loadUsers()
  }

  const selectMember = (memberId) => {
    setSelectedMemberId(memberId)
    const member = leaders.find(l => l.id === memberId)
    if (member) setNewName(member.name)
  }

  const togglePermission = async (user, key) => {
    const updated = { ...user.permissions, [key]: !user.permissions?.[key] }
    const { mod, db } = await loadFirestore()
    await mod.updateDoc(mod.doc(db, 'users', user.id), { permissions: updated })
    backupToSheet('users', user.id, 'save', { ...user, permissions: updated }, await getCurrentAdminEmail())
    setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, permissions: updated } : u)))
  }

  const applyPreset = async (user, presetKey) => {
    const perms = { ...ROLE_PRESETS[presetKey].perms }
    const avenue = ROLE_AVENUE_MAP[presetKey] || null
    const { mod, db } = await loadFirestore()
    await mod.updateDoc(mod.doc(db, 'users', user.id), {
      permissions: perms,
      role: ROLE_PRESETS[presetKey].label,
      avenue
    })
    backupToSheet('users', user.id, 'save', { ...user, permissions: perms, role: ROLE_PRESETS[presetKey].label, avenue }, await getCurrentAdminEmail())
    setUsers(prev =>
      prev.map(u => (u.id === user.id ? { ...u, permissions: perms, role: ROLE_PRESETS[presetKey].label, avenue } : u))
    )
  }

  const setSuperAdminStatus = async () => {
    if (!confirmSuperAdmin) return
    const { user, action } = confirmSuperAdmin
    const isSuperAdmin = action === 'promote'
    // Refuse to demote the last remaining Super Admin — would lock everyone out of super-admin actions.
    if (!isSuperAdmin && superAdminCount <= 1) { setConfirmSuperAdmin(null); return }
    const { mod, db } = await loadFirestore()
    await mod.updateDoc(mod.doc(db, 'users', user.id), { isSuperAdmin })
    backupToSheet('users', user.id, 'save', { ...user, isSuperAdmin }, await getCurrentAdminEmail())
    setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, isSuperAdmin } : u)))
    setConfirmSuperAdmin(null)
  }

  const doResetPassword = async () => {
    if (!confirmReset) return
    setResetting(true)
    setResetError('')
    try {
      await sendSetupEmail(confirmReset.email)
      setResetSentEmail(confirmReset.email)
      setConfirmReset(null)
    } catch (err) {
      setResetError(err.message)
    } finally {
      setResetting(false)
    }
  }

  const deleteUser = async () => {
    if (!confirmDelete) return
    const id = confirmDelete.id
    setConfirmDelete(null)
    setExpandedId(prev => (prev === id ? null : prev))
    setUsers(prev => prev.filter(u => u.id !== id))
    await softDelete('users', id, confirmDelete)
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 focus:border-rotary-blue transition-shadow'

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-rotary-navy pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="flex items-start gap-3 mb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button onClick={onBack} className="mt-6 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4006d] animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4006d]">
                User Management
              </p>
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal dark:text-white">
              Manage Access
            </h2>
            <p className="text-sm text-gray-400 dark:text-white/40 mt-1.5">
              Rotaract Club · Bengaluru BTM
            </p>
          </div>
        </motion.div>

        {readOnly && (
          <div className="sticky top-20 z-10 mb-6 px-4 py-3 rounded-xl bg-rotary-gold/10 border border-rotary-gold/30 text-sm font-medium text-rotary-gold">
            View only — you don't have edit access to User Management.
          </div>
        )}

        <div className={readOnly ? 'pointer-events-none select-none opacity-75' : ''}>

        {/* Stats */}
        {!loading && users.length > 0 && (
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            {[
              { icon: UsersIcon, label: 'Total Users', value: users.length, accent: 'bg-rotary-blue/10', color: 'text-rotary-blue' },
              { icon: StarIcon, label: 'Super Admins', value: superAdminCount, accent: 'bg-rotary-gold/15', color: 'text-rotary-gold' },
              { icon: EyeIcon, label: 'View-Only', value: viewOnlyCount, accent: 'bg-blue-100 dark:bg-blue-500/10', color: 'text-blue-500' },
              { icon: TargetIcon, label: 'Custom Access', value: customCount, accent: 'bg-purple-100 dark:bg-purple-500/10', color: 'text-purple-500' }
            ].map((s, i) => (
              <motion.div
                key={s.label}
                className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/5 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 + i * 0.04 }}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.accent} mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-xs font-medium text-gray-400 dark:text-white/40 mb-0.5">{s.label}</p>
                <p className="font-display font-extrabold text-2xl leading-none text-rotary-charcoal dark:text-white">{s.value}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Add user */}
        <div className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden mb-8">
          <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100 dark:border-white/5">
            <div className="w-8 h-8 rounded-lg bg-rotary-blue/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-rotary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <h3 className="font-display font-semibold">Add User</h3>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5">
                Fill from member database (optional)
              </label>
              <select
                value={selectedMemberId}
                onChange={e => selectMember(e.target.value)}
                className={`w-full sm:w-auto ${inputClass}`}
              >
                <option value="">Select from member database…</option>
                {leaders.map(l => (
                  <option key={l.id} value={l.id}>{l.name}{l.role ? ` — ${l.role}` : ''}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 dark:text-white/40 mt-1.5">
                Pick a member to fill their name, or type it manually below.
              </p>
            </div>
            <div className="grid sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Rtr. Name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5">Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5">Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className={inputClass}
                >
                  {Object.entries(ROLE_PRESETS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <motion.button
                  onClick={addUser}
                  disabled={saving}
                  className="w-full px-6 py-2.5 rounded-xl bg-rotary-blue text-white font-semibold hover:bg-rotary-blue-dark disabled:opacity-50 transition-colors shadow-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {saving ? 'Adding…' : 'Add User'}
                </motion.button>
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* User list */}
        {!loading && users.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-display font-semibold text-lg">
              {users.length} {users.length === 1 ? 'User' : 'Users'}
            </h3>
            <div className="relative w-full sm:w-64">
              <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 114 10.5a6.5 6.5 0 0113 0z" /></svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, role…"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 focus:border-rotary-blue transition-shadow"
              />
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-rotary-blue/20 border-t-rotary-blue rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/5">
            <UsersIcon className="w-10 h-10 text-gray-300 mb-4" />
            <p className="font-display font-bold text-lg">No users yet</p>
            <p className="text-sm text-gray-400 dark:text-white/40 mt-1">Add your first officer above.</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/5">
            <svg className="w-10 h-10 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <p className="font-display font-bold text-lg">No results found</p>
            <p className="text-sm text-gray-400 dark:text-white/40 mt-1">No users match "{search}".</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map(user => {
              const isSuperAdmin = user.isSuperAdmin === true
              const matchedPresetKey = matchedPresetKeyFor(user)
              const badgeStyle = isSuperAdmin
                ? 'bg-rotary-gold/15 text-rotary-gold border-rotary-gold/30'
                : (ROLE_BADGE_STYLES[matchedPresetKey] || DEFAULT_BADGE_STYLE)
              const avatarBg = isSuperAdmin
                ? SUPER_ADMIN_AVATAR_BG
                : (ROLE_AVATAR_BG[matchedPresetKey] || DEFAULT_AVATAR_BG)
              const enabledCount = isSuperAdmin
                ? PERMISSION_SECTIONS.length
                : PERMISSION_SECTIONS.filter(s => user.permissions?.[s.key]).length
              const isExpanded = expandedId === user.id

              return (
                <div
                  key={user.id}
                  className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-md transition-shadow duration-300"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : user.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : user.id) } }}
                    className="w-full flex flex-wrap items-center gap-3 px-5 py-4 text-left cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl ${avatarBg} text-white flex items-center justify-center shrink-0 font-bold text-sm`}>
                      {initials(user)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display font-bold text-sm truncate">{user.name || user.email}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle}`}>
                          {isSuperAdmin && <StarIcon className="w-2.5 h-2.5" />}
                          {isSuperAdmin ? 'Super Admin' : (user.role || 'Custom')}
                        </span>
                        {user.avenue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-white/50 border-gray-200 dark:border-white/10">
                            <TargetIcon className="w-2.5 h-2.5" /> {user.avenue}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-white/40 truncate mt-0.5">{user.email}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-white/40 shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                        {enabledCount}/{PERMISSION_SECTIONS.length} sections
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      {canResetPasswords && (
                        <button
                          onClick={() => { setResetError(''); setConfirmReset(user) }}
                          title="Reset password"
                          className="p-2 rounded-lg text-rotary-blue border border-rotary-blue/20 hover:bg-rotary-blue/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 11-12 0 6 6 0 0112 0zM9 9L3 15v3h3l6-6" /></svg>
                        </button>
                      )}
                      {canResetPasswords && !isSuperAdmin && (
                        <button
                          onClick={() => setConfirmSuperAdmin({ user, action: 'promote' })}
                          title="Make Super Admin"
                          className="p-2 rounded-lg text-rotary-gold border border-rotary-gold/30 hover:bg-rotary-gold/10 transition-colors"
                        >
                          <StarIcon className="w-4 h-4" />
                        </button>
                      )}
                      {canResetPasswords && isSuperAdmin && superAdminCount > 1 && (
                        <button
                          onClick={() => setConfirmSuperAdmin({ user, action: 'demote' })}
                          title="Remove Super Admin"
                          className="p-2 rounded-lg text-gray-400 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </button>
                      )}
                      {!isSuperAdmin && (
                        <button
                          onClick={() => setConfirmDelete(user)}
                          title="Remove user"
                          className="p-2 rounded-lg text-red-500 border border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                    <ChevronIcon open={isExpanded} />
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 border-t border-gray-100 dark:border-white/5">
                          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 mb-4">
                            <p className="text-xs font-medium text-gray-500 dark:text-white/50">Quick role preset</p>
                            <select
                              value={matchedPresetKey}
                              onChange={e => { if (e.target.value) applyPreset(user, e.target.value) }}
                              disabled={isSuperAdmin}
                              className="px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30"
                            >
                              {!matchedPresetKey && <option value="" disabled>Custom / Mixed access</option>}
                              {Object.entries(ROLE_PRESETS).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                          </div>

                          {!isSuperAdmin && (
                            <button
                              onClick={() => togglePermission(user, 'viewAll')}
                              className={`w-full mb-3 flex items-center gap-2 px-3.5 py-2.5 text-sm rounded-xl border text-left transition-colors ${
                                user.permissions?.viewAll
                                  ? 'bg-rotary-gold/10 dark:bg-rotary-gold/20 border-rotary-gold/40 text-rotary-gold'
                                  : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/40'
                              }`}
                            >
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${user.permissions?.viewAll ? 'bg-rotary-gold text-white' : 'border border-gray-300 dark:border-white/20'}`}>
                                {user.permissions?.viewAll && <CheckIcon className="w-2.5 h-2.5" />}
                              </span>
                              Can view all pages (read-only unless also given edit access below)
                            </button>
                          )}

                          {isSuperAdmin ? (
                            <p className="text-xs text-gray-400 dark:text-white/40 mb-3">
                              Super admins have full edit access to every section by default.
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-white/40 mb-3">
                              Edit access — click a section to toggle it on or off for this user.
                            </p>
                          )}

                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {PERMISSION_SECTIONS.map(section => {
                              const on = isSuperAdmin || !!user.permissions?.[section.key]
                              return (
                                <button
                                  key={section.key}
                                  onClick={() => !isSuperAdmin && togglePermission(user, section.key)}
                                  disabled={isSuperAdmin}
                                  className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-xl border text-left transition-colors ${
                                    on
                                      ? 'bg-rotary-blue/10 dark:bg-rotary-blue/20 border-rotary-blue/40 text-rotary-blue dark:text-white'
                                      : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/40'
                                  } ${isSuperAdmin ? 'cursor-default' : ''}`}
                                >
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${on ? 'bg-rotary-blue text-white' : 'border border-gray-300 dark:border-white/20'}`}>
                                    {on && <CheckIcon className="w-2.5 h-2.5" />}
                                  </span>
                                  <span className="truncate">{section.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
            <motion.div
              className="relative w-full max-w-sm bg-white dark:bg-rotary-navy-light rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-white/5"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Remove user?</h3>
              <p className="text-sm text-gray-500 dark:text-white/50 mb-6">
                {confirmDelete.email} will lose access to all admin sections. Their Firebase
                Authentication account must be deleted separately in the console.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteUser}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promote / demote Super Admin confirmation modal */}
      <AnimatePresence>
        {confirmSuperAdmin && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmSuperAdmin(null)} />
            <motion.div
              className="relative w-full max-w-sm bg-white dark:bg-rotary-navy-light rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-white/5"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="w-12 h-12 rounded-full bg-rotary-gold/15 flex items-center justify-center mb-4">
                <StarIcon className="w-6 h-6 text-rotary-gold" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">
                {confirmSuperAdmin.action === 'promote' ? 'Make Super Admin?' : 'Remove Super Admin?'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-white/50 mb-6">
                {confirmSuperAdmin.action === 'promote'
                  ? `${confirmSuperAdmin.user.name || confirmSuperAdmin.user.email} will get full access to every admin section, including User Management, Maintenance Mode, and Trash — the same as you.`
                  : `${confirmSuperAdmin.user.name || confirmSuperAdmin.user.email} will lose Super Admin access and fall back to their previously assigned permissions.`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmSuperAdmin(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={setSuperAdminStatus}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition-colors ${confirmSuperAdmin.action === 'promote' ? 'bg-rotary-gold hover:bg-rotary-gold-light text-rotary-navy' : 'bg-gray-500 hover:bg-gray-600'}`}
                >
                  {confirmSuperAdmin.action === 'promote' ? 'Make Super Admin' : 'Remove'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset password confirmation modal */}
      <AnimatePresence>
        {confirmReset && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !resetting && setConfirmReset(null)} />
            <motion.div
              className="relative w-full max-w-sm bg-white dark:bg-rotary-navy-light rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-white/5"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="w-12 h-12 rounded-full bg-rotary-blue/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-rotary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 11-12 0 6 6 0 0112 0zM9 9L3 15v3h3l6-6" /></svg>
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Send password reset link?</h3>
              <p className="text-sm text-gray-500 dark:text-white/50 mb-6">
                We'll email {confirmReset.email} a link so they can set their own new password.
                Their current password keeps working until they do.
              </p>
              {resetError && (
                <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm text-red-600 dark:text-red-400">{resetError}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmReset(null)}
                  disabled={resetting}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={doResetPassword}
                  disabled={resetting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rotary-blue text-white font-medium hover:bg-rotary-blue-dark disabled:opacity-50 transition-colors"
                >
                  {resetting ? 'Sending…' : 'Send Reset Link'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset link sent confirmation */}
      <AnimatePresence>
        {resetSentEmail && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setResetSentEmail('')} />
            <motion.div
              className="relative w-full max-w-sm bg-white dark:bg-rotary-navy-light rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-white/5"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckIcon className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Reset link sent</h3>
              <p className="text-sm text-gray-500 dark:text-white/50 mb-6">
                {resetSentEmail} will receive an email with a link to set a new password.
              </p>
              <button
                onClick={() => setResetSentEmail('')}
                className="w-full px-4 py-2.5 rounded-xl bg-rotary-blue text-white font-medium hover:bg-rotary-blue-dark transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

       {/* Show-once credentials modal */}
      <AnimatePresence>
        {createdUser && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              className="relative w-full max-w-sm bg-white dark:bg-rotary-navy-light rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-white/5"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckIcon className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">
                User created
              </h3>
              <p className="text-sm text-gray-500 dark:text-white/50 mb-4">
                Share these credentials now — the password won't be shown again.
              </p>
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 text-sm font-mono mb-4">
                <p>Email: {createdUser.email}</p>
                <p>Password: {createdUser.password}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Rotaract BTM Admin Login\nEmail: ${createdUser.email}\nPassword: ${createdUser.password}\nLogin at: ${window.location.origin}`
                    )
                    setCopied(true)
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rotary-blue text-white font-medium hover:bg-rotary-blue-dark transition-colors"
                >
                  {copied ? 'Copied ✓' : 'Copy details'}
                </button>
                <button
                  onClick={async () => {
                    await sendSetupEmail(createdUser.email)
                    setEmailSent(true)
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  {emailSent ? 'Email sent ✓' : 'Email reset link'}
                </button>
              </div>
              <button
                onClick={() => setCreatedUser(null)}
                className="w-full mt-3 px-4 py-2.5 rounded-xl text-sm text-gray-500 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

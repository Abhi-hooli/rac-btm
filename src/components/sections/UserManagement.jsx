import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db, createAuthUser, sendSetupEmail } from '../../firebase'

// ⚠️ ADJUST THESE KEYS to match what your dashboards check, e.g. user.permissions.treasurer
const PERMISSION_SECTIONS = [
  { key: 'analytics', label: 'Club Analytics' },
  { key: 'attendance', label: 'Attendance Tracker' },
  { key: 'mom', label: 'MoM Tracker' },
  { key: 'treasurer', label: 'Treasurer Portal' },
  { key: 'rsvp', label: 'RSVP Manager' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'userManagement', label: 'User Management' }
]

const emptyPermissions = () =>
  Object.fromEntries(PERMISSION_SECTIONS.map(s => [s.key, false]))

const allPermissions = () =>
  Object.fromEntries(PERMISSION_SECTIONS.map(s => [s.key, true]))

const ROLE_PRESETS = {
  president: { label: 'President', perms: allPermissions() },
  secretary: {
    label: 'Secretary',
    perms: { ...emptyPermissions(), rsvp: true, attendance: true, mom: true, gallery: true }
  },
  treasurer: {
    label: 'Treasurer',
    perms: { ...emptyPermissions(), treasurer: true, analytics: true }
  },
  saa: {
    label: 'SAA',
    perms: { ...emptyPermissions(), attendance: true }
  },
  admin: { label: 'Admin', perms: allPermissions() }
}

const SUPER_ADMIN_EMAIL = null // no longer needed

export default function UserManagement({ onBack }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('secretary')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // user object pending deletion
  const [createdUser, setCreatedUser] = useState(null) // {email, password} shown once after creation
  const [copied, setCopied] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [revealId, setRevealId] = useState(null) // which user's password is visible

  const loadUsers = async () => {
    setLoading(true)
    const snap = await getDocs(collection(db, 'users'))
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
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
    const dup = await getDocs(query(collection(db, 'users'), where('email', '==', email)))
    if (!dup.empty) {
      setError('A user with this email already exists.')
      return
    }
    setSaving(true)
    try {
      await createAuthUser(email, newPassword)
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use'
        ? 'This email already has a login account.'
        : err.message)
      setSaving(false)
      return
    }
    await addDoc(collection(db, 'users'), {
      email,
      name: newName.trim(),
      initialPassword: newPassword,
      role: ROLE_PRESETS[newRole].label,
      permissions: { ...ROLE_PRESETS[newRole].perms },
      createdAt: new Date().toISOString()
    })
    setCreatedUser({ email, password: newPassword })
    setCopied(false)
    setEmailSent(false)
    setNewEmail('')
    setNewName('')
    setNewPassword('')
    setSaving(false)
    loadUsers()
  }

  const togglePermission = async (user, key) => {
    const updated = { ...user.permissions, [key]: !user.permissions?.[key] }
    await updateDoc(doc(db, 'users', user.id), { permissions: updated })
    setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, permissions: updated } : u)))
  }

  const applyPreset = async (user, presetKey) => {
    const perms = { ...ROLE_PRESETS[presetKey].perms }
    await updateDoc(doc(db, 'users', user.id), {
      permissions: perms,
      role: ROLE_PRESETS[presetKey].label
    })
    setUsers(prev =>
      prev.map(u => (u.id === user.id ? { ...u, permissions: perms, role: ROLE_PRESETS[presetKey].label } : u))
    )
  }

  const deleteUser = async () => {
    if (!confirmDelete) return
    const id = confirmDelete.id
    setConfirmDelete(null)
    setUsers(prev => prev.filter(u => u.id !== id))
    await deleteDoc(doc(db, 'users', id))
  }

  return (
    <section className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
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

        {/* Add user */}
        <div className="bg-gray-50 dark:bg-rotary-navy-light rounded-2xl p-6 mb-10">
          <h3 className="font-display font-semibold mb-4">Add User</h3>
          <div className="grid sm:grid-cols-5 gap-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Name (e.g. Rtr. Name)"
              className="px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:border-rotary-blue"
            />
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Email"
              className="px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:border-rotary-blue"
            />
            <input
              type="text"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Password (min 6)"
              className="px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:border-rotary-blue"
            />
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:border-rotary-blue"
            >
              {Object.entries(ROLE_PRESETS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <motion.button
              onClick={addUser}
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-rotary-blue text-white font-semibold hover:bg-rotary-blue-dark disabled:opacity-50 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {saving ? 'Adding…' : 'Add User'}
            </motion.button>
          </div>
          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        </div>

        {/* User list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-rotary-blue/30 border-t-rotary-blue rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-white/50 py-16">
            No users yet. Add your first officer above.
          </p>
        ) : (
          <div className="space-y-6">
            {users.map(user => {
              const isSuperAdmin = user.isSuperAdmin === true
              return (
                <div key={user.id} className="bg-gray-50 dark:bg-rotary-navy-light rounded-2xl p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="font-display font-semibold">
                        {user.name || user.email}
                        {isSuperAdmin && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-rotary-gold/20 text-rotary-gold">
                            Super Admin
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-white/50">
                        {user.email} · {user.role || '—'}
                      </p>
                      {user.initialPassword && (
                        <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5 font-mono">
                          Password:{' '}
                          {revealId === user.id ? user.initialPassword : '••••••••'}
                          <button
                            onClick={() => setRevealId(revealId === user.id ? null : user.id)}
                            className="ml-2 text-rotary-blue underline"
                          >
                            {revealId === user.id ? 'hide' : 'show'}
                          </button>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        defaultValue=""
                        onChange={e => {
                          if (e.target.value) applyPreset(user, e.target.value)
                          e.target.value = ''
                        }}
                        disabled={isSuperAdmin}
                        className="px-3 py-2 text-sm rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 disabled:opacity-40"
                      >
                        <option value="" disabled>Apply preset…</option>
                        {Object.entries(ROLE_PRESETS).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      {!isSuperAdmin && (
                        <button
                          onClick={() => setConfirmDelete(user)}
                          className="px-3 py-2 text-sm rounded-xl text-red-500 border border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {PERMISSION_SECTIONS.map(section => {
                      const on = isSuperAdmin || !!user.permissions?.[section.key]
                      return (
                        <button
                          key={section.key}
                          onClick={() => !isSuperAdmin && togglePermission(user, section.key)}
                          disabled={isSuperAdmin}
                          className={`px-3 py-2 text-sm rounded-xl border text-left transition-colors ${
                            on
                              ? 'bg-rotary-blue/10 dark:bg-rotary-blue/20 border-rotary-blue/40 text-rotary-blue dark:text-white'
                              : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/40'
                          } ${isSuperAdmin ? 'cursor-default' : ''}`}
                        >
                          {on ? '✓ ' : ''}{section.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
            <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDelete(null)} />
            <motion.div
              className="relative w-full max-w-sm bg-white dark:bg-rotary-navy-light rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
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

       {/* Show-once credentials modal */}
      <AnimatePresence>
        {createdUser && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              className="relative w-full max-w-sm bg-white dark:bg-rotary-navy-light rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <h3 className="font-display font-semibold text-lg mb-1">User created ✓</h3>
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

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection, useDocument } from '../../hooks/useFirestore'

export const teamCategories = [
  { value: 'bod', label: 'Board of Directors' },
  { value: 'core', label: 'Core Team' },
  { value: 'member', label: 'Members' }
]

export const memberTypes = [
  { value: 'student', label: 'Student' },
  { value: 'working', label: 'Working Professional' }
]

export const inputClass =
  'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

export function LeaderCard({ leader, i }) {
  return (
    <motion.div
      className="group text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: i * 0.08 }}
    >
      <motion.div
        className="relative mb-5 mx-auto w-40 h-40"
        whileHover={{ scale: 1.03 }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-rotary-blue to-rotary-gold p-[2px]">
          <img
            src={leader.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80'}
            alt={leader.name}
            className="w-full h-full rounded-full object-cover bg-rotary-cloud dark:bg-rotary-navy"
            loading="lazy"
          />
        </div>

        {leader.linkedin && leader.linkedin !== '#' && (
          <a
            href={leader.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 rounded-full bg-rotary-blue/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <svg className="w-5 h-5 text-rotary-blue" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </div>
          </a>
        )}
      </motion.div>

      <h3 className="font-display font-semibold text-base mb-0.5">{leader.name}</h3>
      <p className="text-rotary-gold text-sm font-medium">{leader.role}</p>
    </motion.div>
  )
}

const roleOrder = ['President', 'Secretary Administration', 'Secretary Operation', 'Joint Secretary', 'Treasurer']

// ── President's Message Card ──
function PresidentCard({ isAdmin }) {
  const { data: president, save } = useDocument('settings', 'currentPresident', { name: '', image: '', message: '', year: '' })
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(president)

  useEffect(() => { setForm(president) }, [president])

  const handleSave = async () => {
    await save(form)
    setEditing(false)
  }

  const hasContent = president.name || president.message || president.image

  // If nothing's set and viewer isn't admin, don't render
  if (!hasContent && !isAdmin) return null

  return (
    <motion.div
      className="max-w-5xl mx-auto mb-16 bg-white dark:bg-rotary-navy-light rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm relative"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {isAdmin && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          title="Edit President's Message"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            className="p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h3 className="font-display font-bold mb-5">Edit President's Message</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <input className={inputClass} placeholder="President Name (e.g. Rtr. Naveen)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input className={inputClass} placeholder="Rotary Year (e.g. 2025-26)" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
              <input className={`${inputClass} sm:col-span-2`} placeholder="Photo URL" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
              <textarea className={`${inputClass} sm:col-span-2 min-h-[120px] resize-y`} placeholder="President's message..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm hover:bg-rotary-gold-light transition-colors">Save</button>
              <button onClick={() => { setForm(president); setEditing(false) }} className="px-5 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
            </div>
          </motion.div>
        ) : hasContent ? (
          <motion.div
            key="view"
            className="grid md:grid-cols-3 gap-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {president.image && (
              <div className="md:col-span-1">
                <img src={president.image} alt={president.name} className="w-full h-full object-cover min-h-[260px]" loading="lazy" />
              </div>
            )}
            <div className={`p-8 md:p-10 flex flex-col justify-center ${president.image ? 'md:col-span-2' : 'md:col-span-3'}`}>
              <span className="text-rotary-gold font-semibold mb-3 block text-xs uppercase tracking-wider">
                President's Message {president.year && `· ${president.year}`}
              </span>
              {president.message && (
                <p className="text-lg text-gray-700 dark:text-white/80 leading-relaxed mb-4 italic">"{president.message}"</p>
              )}
              {president.name && (
                <p className="font-display font-semibold text-rotary-charcoal dark:text-white">
                  — {president.name}
                  <span className="text-sm font-normal text-gray-400 dark:text-white/40 ml-2">President, Rotaract Bengaluru BTM</span>
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">No president's message set yet.</p>
            <button onClick={() => setEditing(true)} className="mt-3 text-sm font-semibold text-rotary-blue hover:underline">+ Add now</button>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Leadership({ onViewTeam, isAdmin }) {
  const { data: leaders, loading } = useCollection('leaders')

  const coreLeaders = leaders.filter(l => (l.category || l.team) === 'core')
  const featured = (coreLeaders.length > 0 ? coreLeaders : leaders.slice(0, 5))
    .sort((a, b) => {
      const ai = roleOrder.findIndex(r => a.role?.toLowerCase().includes(r.toLowerCase()))
      const bi = roleOrder.findIndex(r => b.role?.toLowerCase().includes(r.toLowerCase()))
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

  if (loading) return null

  return (
    <section id="leadership" className="section-padding">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-rotary-gold font-semibold mb-4 block text-sm uppercase tracking-wider">Our Leadership</span>
          <h2 className="heading-lg mb-4">Meet the <span className="text-gradient">Team</span></h2>
          <p className="text-rotary-slate dark:text-white/50 max-w-2xl mx-auto">
            Young leaders driving our mission forward with energy and purpose.
          </p>
        </motion.div>

        {/* President's Message — admin can edit inline */}
        <PresidentCard isAdmin={isAdmin} />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
          {featured.map((leader, i) => (
            <LeaderCard key={leader.id} leader={leader} i={i} />
          ))}
        </div>

        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <motion.button
            onClick={onViewTeam}
            className="btn-secondary inline-flex items-center gap-2 !py-3 !px-6 text-sm"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            Meet the Full Team
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
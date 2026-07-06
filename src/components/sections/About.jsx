import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from '../ui/Card'
import { useCollection } from '../../hooks/useFirestore'

const values = [
  {
    icon: '🤝',
    title: 'Fellowship',
    description: 'Building lifelong friendships through shared purpose, fun events, and collaborative service projects.'
  },
  {
    icon: '🚀',
    title: 'Youth Leadership',
    description: 'Developing confident, capable leaders aged 18–30 through hands-on project management and public speaking.'
  },
  {
    icon: '💡',
    title: 'Professional Growth',
    description: 'Networking with industry professionals, mentorship programs, and career development workshops.'
  },
  {
    icon: '🌍',
    title: 'Community Service',
    description: 'Driving real change in Bengaluru through health camps, education drives, and environmental initiatives.'
  }
]

const DEFAULT_MILESTONES = [
  { id: '1', year: '2023', text: 'Club chartered under R.I.Dist 3191', order: 1 },
  { id: '2', year: '2023', text: 'First flagship project — Stree Shakti launched', order: 2 },
  { id: '3', year: '2025', text: 'Crossed 40+ active members', order: 3 },
  { id: '4', year: '2025', text: 'Best Rotaract Club award at District Conference', order: 4 },
]

const inputClass = 'w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

const EMPTY_FORM = { year: '', text: '' }

export default function About({ isAdmin, setCurrentPage }) {
  const { data: savedMilestones, save, remove } = useCollection('milestones', [], { live: isAdmin })
  const [editingId, setEditingId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const milestones = (savedMilestones.length > 0 ? savedMilestones : DEFAULT_MILESTONES)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const seedDefaults = () => {
    if (savedMilestones.length === 0) {
      DEFAULT_MILESTONES.forEach(m => save(m).catch(console.error))
    }
  }

  const openAdd = () => {
    seedDefaults()
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowAddForm(true)
  }

  const openEdit = (m) => {
    setForm({ year: m.year, text: m.text })
    setEditingId(m.id)
    setShowAddForm(false)
  }

  const handleSave = async () => {
    if (!form.year || !form.text) return
    setSaving(true)
    try {
      if (editingId) {
        const existing = milestones.find(m => m.id === editingId)
        await save({ ...existing, year: form.year, text: form.text })
      } else {
        const maxOrder = milestones.reduce((max, m) => Math.max(max, m.order ?? 0), 0)
        await save({ id: Date.now().toString(), year: form.year, text: form.text, order: maxOrder + 1 })
      }
      setEditingId(null)
      setShowAddForm(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      console.error('Failed to save milestone:', err)
      alert('Save failed. Check Firebase permissions for the milestones collection.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await remove(deleteId)
    setDeleteId(null)
  }

  return (
    <section id="about" className="section-padding bg-gray-50 dark:bg-rotary-navy-light">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-rotary-gold font-semibold mb-4 block">About Us</span>
            <h2 className="heading-lg mb-6">
              Youth Powering{' '}
              <span className="text-gradient">Bengaluru</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-white/70 mb-6">
              Rotaract Bengaluru BTM is a community-based Rotaract club affiliated to Rotary International District 3191. We bring together young professionals and students aged 18–30 who believe in the power of service, leadership, and fellowship to transform communities.
            </p>
            <p className="text-gray-600 dark:text-white/60 mb-4">
              Sponsored by our parent Rotary club, we operate at the intersection of social impact and personal development. Our members lead projects in women empowerment, environmental sustainability, education, and healthcare — while building professional skills, lifelong friendships, and a global network.
            </p>
            <p className="text-gray-600 dark:text-white/60 mb-8">
              From blood donation drives in BTM Layout to mentorship programs for underprivileged students, every initiative is designed, planned, and executed by our young members — because we believe the best way to learn leadership is to lead.
            </p>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-4">
              <div className="px-6 py-3 rounded-2xl bg-rotary-blue/10 dark:bg-rotary-blue/20">
                <span className="text-2xl font-bold text-rotary-blue dark:text-rotary-gold">50+</span>
                <p className="text-sm text-gray-600 dark:text-white/60">Active Members</p>
              </div>
              <div className="px-6 py-3 rounded-2xl bg-rotary-gold/10 dark:bg-rotary-gold/20">
                <span className="text-2xl font-bold text-rotary-gold">18–30</span>
                <p className="text-sm text-gray-600 dark:text-white/60">Age Group</p>
              </div>
              <div className="px-6 py-3 rounded-2xl bg-rotary-blue/10 dark:bg-rotary-blue/20">
                <span className="text-2xl font-bold text-rotary-blue dark:text-rotary-gold">R.I.Dist 3191</span>
                <p className="text-sm text-gray-600 dark:text-white/60">District</p>
              </div>
            </div>

            {setCurrentPage && (
              <button
                onClick={() => setCurrentPage('joinForm')}
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl bg-rotary-blue text-white font-semibold text-sm hover:bg-rotary-blue-dark transition-colors shadow-sm"
              >
                Want to be part of this? Join Rotaract
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            )}
          </motion.div>

          {/* Values Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full">
                  <span className="text-4xl mb-4 block">{value.icon}</span>
                  <h3 className="font-display font-semibold text-xl mb-2">{value.title}</h3>
                  <p className="text-gray-600 dark:text-white/60">{value.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Milestones Timeline ── */}
        <motion.div
          className="mt-24"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h3 className="heading-md text-center mb-4">
            Our <span className="text-gradient">Journey</span>
          </h3>

          {/* ── Admin Controls ── */}
          {isAdmin && (
            <div className="flex justify-center mb-8">
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Milestone
              </button>
            </div>
          )}

          {/* ── Add / Edit Form ── */}
          <AnimatePresence>
            {(showAddForm || editingId) && (
              <motion.div
                className="max-w-lg mx-auto mb-10 bg-white dark:bg-rotary-navy rounded-2xl border border-gray-100 dark:border-white/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h4 className="font-display font-bold text-base mb-4">
                  {editingId ? 'Edit Milestone' : 'New Milestone'}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-white/40 block mb-1">
                      Year <span className="text-red-400">*</span>
                    </label>
                    <input
                      className={inputClass}
                      placeholder="e.g. 2024"
                      value={form.year}
                      onChange={e => setForm({ ...form, year: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-white/40 block mb-1">
                      Milestone <span className="text-red-400">*</span>
                    </label>
                    <input
                      className={inputClass}
                      placeholder="e.g. Crossed 100 service hours"
                      value={form.text}
                      onChange={e => setForm({ ...form, text: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleSave}
                    disabled={!form.year || !form.text || saving}
                    className="px-5 py-2 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm disabled:opacity-50 hover:bg-rotary-gold/90 transition-colors"
                  >
                    {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Milestone'}
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setShowAddForm(false); setForm(EMPTY_FORM) }}
                    className="px-5 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative mt-12">
            {/* Vertical line */}
            <div className="absolute left-[7px] md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-rotary-blue via-rotary-gold to-rotary-blue" />

            <div className="space-y-10 md:space-y-12">
              {milestones.map((item, i) => (
                <motion.div
                  key={item.id}
                  className="relative flex items-start md:items-center gap-6 pl-10 md:pl-0"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  {/* ── MOBILE layout ── */}
                  <div className="md:hidden flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-3 py-1 text-sm font-bold bg-rotary-blue/10 dark:bg-rotary-blue/20 text-rotary-blue dark:text-rotary-gold rounded-full mb-1">
                          {item.year}
                        </span>
                        <p className="text-gray-700 dark:text-white/80 font-medium">{item.text}</p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 shrink-0 mt-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-3.5 h-3.5 text-gray-600 dark:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dot */}
                  <div className="absolute left-0 md:left-1/2 top-1 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-4 h-4 rounded-full bg-rotary-gold border-4 border-white dark:border-rotary-navy-light shadow-md z-10 shrink-0" />

                  {/* ── DESKTOP left side ── */}
                  <div className={`hidden md:flex flex-1 justify-end pr-8 ${i % 2 === 0 ? '' : 'invisible'}`}>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 text-sm font-bold bg-rotary-blue/10 dark:bg-rotary-blue/20 text-rotary-blue dark:text-rotary-gold rounded-full mb-1">
                        {item.year}
                      </span>
                      <p className="text-gray-700 dark:text-white/80 font-medium">{item.text}</p>
                      {isAdmin && i % 2 === 0 && (
                        <div className="flex gap-1 justify-end mt-2">
                          <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors" title="Edit">
                            <svg className="w-3.5 h-3.5 text-gray-600 dark:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors" title="Delete">
                            <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Spacer for dot on desktop */}
                  <div className="hidden md:block w-4 shrink-0" />

                  {/* ── DESKTOP right side ── */}
                  <div className={`hidden md:flex flex-1 pl-8 ${i % 2 !== 0 ? '' : 'invisible'}`}>
                    <div>
                      <span className="inline-block px-3 py-1 text-sm font-bold bg-rotary-blue/10 dark:bg-rotary-blue/20 text-rotary-blue dark:text-rotary-gold rounded-full mb-1">
                        {item.year}
                      </span>
                      <p className="text-gray-700 dark:text-white/80 font-medium">{item.text}</p>
                      {isAdmin && i % 2 !== 0 && (
                        <div className="flex gap-1 mt-2">
                          <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors" title="Edit">
                            <svg className="w-3.5 h-3.5 text-gray-600 dark:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors" title="Delete">
                            <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Delete Confirm Modal ── */}
        <AnimatePresence>
          {deleteId && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white dark:bg-rotary-navy rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              >
                <h4 className="font-display font-bold text-lg mb-2">Delete Milestone?</h4>
                <p className="text-gray-600 dark:text-white/60 text-sm mb-6">This will permanently remove this milestone from the journey.</p>
                <div className="flex gap-3">
                  <button onClick={handleDelete} className="flex-1 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors">Delete</button>
                  <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── What is Rotaract ── */}
        <motion.div
          className="mt-24 bg-white dark:bg-rotary-navy rounded-3xl p-8 md:p-12 shadow-lg dark:shadow-none dark:border dark:border-white/10"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-rotary-gold font-semibold mb-3 block text-sm uppercase tracking-wider">What is Rotaract?</span>
              <h3 className="heading-md mb-4">
                A Global Movement of{' '}
                <span className="text-gradient">Young Leaders</span>
              </h3>
              <p className="text-gray-600 dark:text-white/70 mb-4">
                Rotaract is Rotary International's youth program for people aged 18–30. With over 11,000 clubs in 170+ countries, Rotaract members — called Rotaractors — take action to address community needs while developing leadership skills and building international friendships.
              </p>
              <p className="text-gray-600 dark:text-white/60">
                Every Rotaract club is sponsored by a local Rotary club and belongs to a Rotary district. As part of R.I.Dist 3191, we collaborate with Rotary clubs and other Rotaract clubs across Karnataka for district-level projects, conferences, and fellowship events.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { num: '11,000+', label: 'Clubs Worldwide' },
                { num: '170+',    label: 'Countries' },
                { num: '250K+',   label: 'Rotaractors' },
                { num: '7',       label: 'Areas of Focus' }
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  className="text-center p-4 rounded-2xl bg-gray-50 dark:bg-rotary-navy-light"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                >
                  <p className="text-2xl font-display font-bold text-rotary-blue dark:text-rotary-gold">{s.num}</p>
                  <p className="text-xs text-gray-500 dark:text-white/50 mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}

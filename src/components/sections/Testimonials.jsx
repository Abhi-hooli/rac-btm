import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'

const DEFAULT_TESTIMONIALS = [
  {
    id: '1',
    quote: "Joining Rotaract BTM was the best decision of my college years. The friendships, the projects, the growth — it's been life-changing.",
    author: '[Member Name]',
    role: 'Member since 2022',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80'
  },
  {
    id: '2',
    quote: "The Vidya Daan program gave me the confidence and skills to pursue my dream career. I'm forever grateful to the Rotaract BTM team.",
    author: '[Beneficiary Name]',
    role: 'Program Beneficiary',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'
  },
  {
    id: '3',
    quote: "What sets Rotaract BTM apart is the energy and passion. Every member brings something unique, and together we achieve amazing things.",
    author: '[Past President Name]',
    role: 'Immediate Past President',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80'
  }
]

const inputClass = 'w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

export default function Testimonials({ isAdmin }) {
  const { data: savedTestimonials, save, remove } = useCollection('testimonials', [], { live: isAdmin })
  const [current, setCurrent] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({ quote: '', author: '', role: '', image: '' })

  const testimonials = savedTestimonials.length > 0 ? savedTestimonials : DEFAULT_TESTIMONIALS

  useEffect(() => {
    if (editingId || showAddForm) return
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [testimonials.length, editingId, showAddForm])

  useEffect(() => {
    if (current >= testimonials.length) setCurrent(0)
  }, [testimonials.length])

  const openEdit = (t) => {
    setForm({ quote: t.quote, author: t.author, role: t.role, image: t.image || '' })
    setEditingId(t.id)
    setShowAddForm(false)
  }

  const openAdd = () => {
    setForm({ quote: '', author: '', role: '', image: '' })
    setEditingId(null)
    setShowAddForm(true)
  }

  const handleSave = async () => {
    if (!form.quote || !form.author) return
    if (editingId) {
      const existing = testimonials.find(t => t.id === editingId)
      await save({ ...existing, ...form })
    } else {
      await save({ id: Date.now().toString(), ...form })
    }
    setEditingId(null)
    setShowAddForm(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await remove(deleteId)
    setDeleteId(null)
    setCurrent(0)
  }

  // If saved testimonials are empty, seed defaults first time admin edits
  const seedDefaults = async () => {
    if (savedTestimonials.length === 0) {
      for (const t of DEFAULT_TESTIMONIALS) {
        await save(t)
      }
    }
  }

  return (
    <section className="section-padding bg-gray-50 dark:bg-rotary-navy-light overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="text-rotary-gold font-semibold mb-4 block">Testimonials</span>
          <h2 className="heading-lg mb-16">
            Voices of <span className="text-gradient">Change</span>
          </h2>
        </motion.div>

        {/* ── Admin Controls ── */}
        {isAdmin && (
          <div className="mb-8 flex justify-center gap-2 flex-wrap">
            <button
              onClick={() => { seedDefaults(); openAdd() }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Testimonial
            </button>
            <button
              onClick={() => { seedDefaults(); openEdit(testimonials[current]) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-rotary-charcoal dark:text-white text-sm font-semibold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit Current
            </button>
            <button
              onClick={() => { seedDefaults(); setDeleteId(testimonials[current].id) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete Current
            </button>
          </div>
        )}

        {/* ── Edit / Add Form ── */}
        <AnimatePresence>
          {(editingId || showAddForm) && (
            <motion.div
              className="mb-8 bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/10 p-6 text-left shadow-sm"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >
              <h3 className="font-display font-bold text-base mb-4">{editingId ? 'Edit Testimonial' : 'New Testimonial'}</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Quote <span className="text-red-400">*</span></label>
                  <textarea className={inputClass} rows={3} placeholder="Their testimonial..." value={form.quote} onChange={e => setForm({ ...form, quote: e.target.value })} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Name <span className="text-red-400">*</span></label>
                    <input className={inputClass} placeholder="Rtr. Name" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Role</label>
                    <input className={inputClass} placeholder="Member since 2023" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Photo URL</label>
                  <input className={inputClass} placeholder="https://your-wordpress-site.com/image.jpg" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} />
                  {form.image && (
                    <img src={form.image} alt="preview" className="w-12 h-12 rounded-full object-cover mt-2 border-2 border-rotary-gold" />
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleSave} disabled={!form.quote || !form.author}
                  className="px-5 py-2 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm disabled:opacity-50 hover:bg-rotary-gold-light transition-colors">
                  {editingId ? 'Save Changes' : 'Add Testimonial'}
                </button>
                <button onClick={() => { setEditingId(null); setShowAddForm(false) }}
                  className="px-5 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Testimonial Display ── */}
        <div className="relative min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5 }}
              className="glass dark:glass-dark rounded-3xl p-8 md:p-12"
            >
              <svg className="w-12 h-12 mx-auto mb-6 text-rotary-gold/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>

              <p className="text-xl md:text-2xl font-light text-gray-700 dark:text-white/90 mb-8 leading-relaxed">
                "{testimonials[current]?.quote}"
              </p>

              <div className="flex items-center justify-center gap-4">
                <img
                  src={testimonials[current]?.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80'}
                  alt={testimonials[current]?.author}
                  className="w-14 h-14 rounded-full object-cover border-2 border-rotary-gold"
                />
                <div className="text-left">
                  <p className="font-display font-semibold">{testimonials[current]?.author}</p>
                  <p className="text-sm text-gray-500 dark:text-white/60">{testimonials[current]?.role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Dots ── */}
        <div className="flex justify-center gap-3 mt-8">
          {testimonials.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`h-3 rounded-full transition-all duration-300 ${i === current ? 'bg-rotary-gold w-8' : 'w-3 bg-gray-300 dark:bg-white/30 hover:bg-rotary-blue/50'}`}
            />
          ))}
        </div>
      </div>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <motion.div className="relative bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6 w-full max-w-sm" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="font-display font-bold text-lg mb-1">Delete Testimonial?</h3>
              <p className="text-sm text-gray-400 dark:text-white/50 mb-6">This testimonial will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedCounter from '../ui/AnimatedCounter'
import { useCollection } from '../../hooks/useFirestore'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1200&q=80'

const focusAreas = [
  {
    icon: '🕊️',
    title: 'Promoting Peace',
    description: 'Fostering understanding, goodwill, and peace through fellowship and community dialogue.',
    color: 'from-blue-500/70 to-indigo-600/70',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80',
  },
  {
    icon: '🦠',
    title: 'Fighting Disease',
    description: 'Health camps, blood drives, and awareness campaigns to combat preventable diseases.',
    color: 'from-red-500/70 to-rose-600/70',
    image: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=1200&q=80',
  },
  {
    icon: '💧',
    title: 'Providing Clean Water',
    description: 'Ensuring access to clean water, sanitation, and hygiene in underserved communities.',
    color: 'from-cyan-500/70 to-blue-600/70',
    image: 'https://images.unsplash.com/photo-1541544537156-7627a7a4aa1c?w=1200&q=80',
  },
  {
    icon: '👩‍👧',
    title: 'Saving Mothers & Children',
    description: 'Supporting maternal and child health through nutrition programs and medical aid.',
    color: 'from-pink-500/70 to-fuchsia-600/70',
    image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=1200&q=80',
  },
  {
    icon: '📖',
    title: 'Supporting Education',
    description: 'Digital literacy, scholarships, and mentorship for underprivileged students.',
    color: 'from-amber-500/70 to-orange-600/70',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80',
  },
  {
    icon: '💼',
    title: 'Growing Local Economies',
    description: 'Skill development workshops, entrepreneurship bootcamps, and career guidance.',
    color: 'from-green-500/70 to-emerald-600/70',
    image: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1200&q=80',
  },
  {
    icon: '🌱',
    title: 'Protecting the Environment',
    description: 'Tree plantations, clean-up drives, and sustainability awareness campaigns.',
    color: 'from-teal-500/70 to-green-600/70',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&q=80',
  },
]

const stats = [
  { key: 'lives',    suffix: 'K+', label: 'Lives\nImpacted',     display: v => `${v}` },
  { key: 'students', suffix: '+',  label: 'Students\nMentored',  display: v => `${v}` },
  { key: 'trees',    suffix: 'K+', label: 'Trees\nPlanted',      display: v => `${v}` },
  { key: 'funds',    suffix: 'L+', label: 'Funds\nRaised (₹)',   display: v => `₹${v}` },
  { key: 'camps',    suffix: '+',  label: 'Health\nCamps',       display: v => `${v}` },
  { key: 'partners', suffix: '+',  label: 'Partner\nOrgs',       display: v => `${v}` },
]

const defaultStats = { lives: 5, students: 500, trees: 2, funds: 10, camps: 30, partners: 15 }

function FocusModal({ area, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
        <div className="relative h-72 md:h-96">
          <img src={area.image} alt={area.title} className="w-full h-full object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-t ${area.color}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="absolute bottom-6 left-6 right-6">
            <span className="text-4xl mb-3 block">{area.icon}</span>
            <h3 className="font-display font-bold text-2xl md:text-3xl text-white">{area.title}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-rotary-navy-light p-6 md:p-8">
          <p className="text-rotary-charcoal dark:text-white/70 text-base leading-relaxed">{area.description}</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Admin image edit panel ────────────────────────────────────────────────────
function ImageEditPanel({ currentUrl, onSave, onClose }) {
  const [url, setUrl] = useState(currentUrl || '')
  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full max-w-md bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
        <h3 className="font-display font-bold text-lg mb-1">Impact Section Image</h3>
        <p className="text-sm text-rotary-slate dark:text-white/40 mb-4">Paste an image URL — use your WordPress hosted photos for best results.</p>
        {url && (
          <div className="mb-4 rounded-xl overflow-hidden h-40">
            <img src={url} alt="preview" className="w-full h-full object-cover" />
          </div>
        )}
        <input
          className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm mb-4"
          placeholder="https://your-image-url.jpg"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <div className="flex gap-3">
          <button onClick={() => onSave(url)}
            className="flex-1 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm hover:bg-rotary-gold-light transition-colors">
            Save Image
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Impact({ isAdmin }) {
  const { data: settings, save: saveSettings } = useCollection('settings', [], { live: isAdmin })
  const scrollRef   = useRef(null)
  const [selectedArea, setSelectedArea] = useState(null)
  const [showImageEdit, setShowImageEdit] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart   = useRef(0)
  const scrollStart = useRef(0)

  // Pull impact image from settings Firestore doc
  const impactSettings = settings?.find(s => s.id === 'impact') || {}
  const impactImage    = impactSettings.heroImage || DEFAULT_IMAGE

  const handleSaveImage = async (url) => {
    await saveSettings({ id: 'impact', heroImage: url })
    setShowImageEdit(false)
  }

  const scroll = (dir) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * 330, behavior: 'smooth' })
  }

  const onMouseDown = (e) => {
    setIsDragging(false)
    dragStart.current   = e.clientX
    scrollStart.current = scrollRef.current.scrollLeft
    const onMove = (e) => {
      const dx = dragStart.current - e.clientX
      if (Math.abs(dx) > 5) setIsDragging(true)
      scrollRef.current.scrollLeft = scrollStart.current + dx
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <>
      {/* ── Stats Section ── */}
      <section id="impact" className="section-padding relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: '#7B0D2A' }} />
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-rotary-gold to-transparent opacity-80" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl">

            {/* Left — image, no right fade */}
            <div className="relative min-h-[320px] lg:min-h-[480px]">
              <img src={impactImage} alt="Rotaract BTM Impact"
                className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)' }} />

              <div className="absolute bottom-8 left-8 right-8">
                <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Rotaract Bengaluru BTM</p>
                <p className="text-white text-xl font-display font-bold leading-snug">
                  Creating Impact<br />Since <span style={{ color: '#FAC775' }}>2023</span>
                </p>
              </div>

              {isAdmin && (
                <button onClick={() => setShowImageEdit(true)}
                  className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white text-xs font-semibold hover:bg-black/60 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Change Image
                </button>
              )}
            </div>

            {/* Right — white stats panel */}
            <div className="bg-white dark:bg-rotary-navy-light p-8 md:p-12 flex flex-col justify-center">
              <p className="text-rotary-cranberry text-xs uppercase tracking-widest font-semibold mb-2">Our Impact</p>
              <h2 className="font-display font-bold text-3xl md:text-4xl text-rotary-navy dark:text-white mb-8">
                Numbers That <span className="text-gradient">Inspire</span>
              </h2>

              <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-white/10 rounded-xl overflow-hidden">
                {[
                  { value: 5,   suffix: 'K+', label: 'Lives Impacted',    prefix: '' },
                  { value: 500, suffix: '+',  label: 'Students Mentored', prefix: '' },
                  { value: 2,   suffix: 'K+', label: 'Trees Planted',     prefix: '' },
                  { value: 10,  suffix: 'L+', label: 'Funds Raised',      prefix: '₹' },
                  { value: 30,  suffix: '+',  label: 'Health Camps',      prefix: '' },
                  { value: 15,  suffix: '+',  label: 'Partner Orgs',      prefix: '' },
                ].map((stat, i) => (
                  <motion.div key={stat.label}
                    className="flex flex-col justify-center p-5 bg-white dark:bg-rotary-navy-light"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.07 }}
                  >
                    <div className="font-display font-bold text-rotary-navy dark:text-white" style={{ fontSize: '2rem', lineHeight: 1 }}>
                      {stat.prefix}
                      <AnimatedCounter value={stat.value} suffix="" />
                      <span className="text-rotary-cranberry" style={{ fontSize: '1rem' }}>{stat.suffix}</span>
                    </div>
                    <div className="text-rotary-slate dark:text-white/40 text-xs mt-2 leading-snug">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Areas of Focus — light ── */}
      <section className="py-24 bg-white dark:bg-rotary-navy-light overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-rotary-cranberry font-semibold mb-4 block text-sm uppercase tracking-wider">What We Focus On</span>
            <h2 className="heading-lg mb-4">Rotary's 7 <span className="text-gradient">Areas of Focus</span></h2>
            <p className="text-rotary-slate dark:text-white/60 max-w-2xl mx-auto text-base">
              Every project we undertake aligns with Rotary International's seven areas of focus — guiding our efforts where they matter most.
            </p>
          </motion.div>
        </div>

        {/* Scroll container */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-6 w-8 z-10 bg-gradient-to-r from-white dark:from-rotary-navy-light to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-6 w-8 z-10 bg-gradient-to-l from-white dark:from-rotary-navy-light to-transparent pointer-events-none" />

          <button onClick={() => scroll(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white dark:bg-white/10 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/20 transition-colors">
            <svg className="w-5 h-5 text-rotary-navy dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => scroll(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white dark:bg-white/10 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/20 transition-colors">
            <svg className="w-5 h-5 text-rotary-navy dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div ref={scrollRef}
            className="flex gap-5 overflow-x-auto px-12 pb-6 cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', userSelect: 'none' }}
            onMouseDown={onMouseDown}>
            {focusAreas.map((area, i) => (
              <motion.div key={area.title}
                className="group relative rounded-2xl overflow-hidden shrink-0"
                style={{ width: '300px', height: '400px' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => { if (!isDragging) setSelectedArea(area) }}
              >
                <img src={area.image} alt={area.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy" draggable={false} />
                <div className={`absolute inset-0 bg-gradient-to-t ${area.color}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{i + 1}</span>
                </div>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>

                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <span className="text-3xl mb-2 block">{area.icon}</span>
                  <h3 className="font-display font-bold text-xl text-white mb-1 leading-snug">{area.title}</h3>
                  <p className="text-white/80 text-xs leading-relaxed opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    {area.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {focusAreas.map((_, i) => (
            <button key={i}
              onClick={() => scrollRef.current?.scrollTo({ left: i * 320, behavior: 'smooth' })}
              className="w-2 h-2 rounded-full bg-gray-300 dark:bg-white/20 hover:bg-rotary-blue dark:hover:bg-rotary-blue transition-colors" />
          ))}
        </div>
      </section>

      <AnimatePresence>
        {selectedArea && <FocusModal area={selectedArea} onClose={() => setSelectedArea(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showImageEdit && (
          <ImageEditPanel
            currentUrl={impactImage}
            onSave={handleSaveImage}
            onClose={() => setShowImageEdit(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
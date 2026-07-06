import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'

export const colorOptions = [
  { label: 'Pink',   value: 'from-pink-500 to-rose-400'     },
  { label: 'Green',  value: 'from-green-500 to-emerald-400' },
  { label: 'Blue',   value: 'from-blue-500 to-cyan-400'     },
  { label: 'Red',    value: 'from-red-500 to-orange-400'    },
  { label: 'Purple', value: 'from-purple-500 to-violet-400' },
  { label: 'Amber',  value: 'from-amber-500 to-yellow-400'  },
]

export const rotaractAvenues = [
  'Club Service', 'Community Service', 'Professional Development',
  'International Service', 'Public Image',
]

export const areasOfFocus = [
  'Peacebuilding and Conflict Prevention', 'Disease Prevention and Treatment',
  'Water, Sanitation, and Hygiene (WASH)', 'Maternal and Child Health',
  'Basic Education and Literacy', 'Community Economic Development',
  'Supporting the Environment',
]

export const projectCategories = [...rotaractAvenues, ...areasOfFocus]

export const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

const IMPACT_FIELDS = [
  { key: 'participants',        label: 'Participants'           },
  { key: 'beneficiaries',       label: 'Beneficiaries'         },
  { key: 'volunteers',          label: 'Volunteers'            },
  { key: 'volunteerHours',      label: 'Volunteer Hours'       },
  { key: 'cashContributions',   label: 'Cash Contributions'    },
  { key: 'inKindContributions', label: 'In-Kind Contributions' },
]

// ── Project Modal ─────────────────────────────────────────────────────────────
export function ProjectModal({ project, onClose }) {
  if (!project) return null
  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-rotary-navy-light rounded-xl shadow-2xl"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
      >
        <div className="relative h-56 md:h-64">
          <img src={project.image || 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80'}
            alt={project.title} className="w-full h-full object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-t ${project.color} opacity-40`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex flex-wrap gap-2 mb-2">
              {project.activityType && <span className="px-3 py-1 text-xs font-semibold bg-black/30 backdrop-blur-sm rounded-full text-white">{project.activityType}</span>}
              {project.avenue && <span className="px-3 py-1 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full text-white">{project.avenue}</span>}
              {project.areaOfFocus && <span className="px-3 py-1 text-xs font-semibold bg-rotary-gold/50 backdrop-blur-sm rounded-full text-white">{project.areaOfFocus}</span>}
            </div>
            <h2 className="font-display font-bold text-2xl text-white">{project.title}</h2>
          </div>
        </div>
        <div className="p-6">
          <p className="text-rotary-charcoal dark:text-white/70 mb-4 leading-relaxed">{project.description}</p>
          {(project.avenue || project.areaOfFocus) && (
            <div className="flex flex-wrap gap-3 mb-5">
              {project.avenue && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rotary-blue/8 border border-rotary-blue/15">
                  <div><p className="text-[10px] text-rotary-slate dark:text-white/30 uppercase tracking-wider">Rotaract Avenue</p><p className="text-xs font-semibold text-rotary-blue">{project.avenue}</p></div>
                </div>
              )}
              {project.areaOfFocus && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rotary-gold/8 border border-rotary-gold/15">
                  <div><p className="text-[10px] text-rotary-slate dark:text-white/30 uppercase tracking-wider">Area of Focus</p><p className="text-xs font-semibold text-rotary-gold">{project.areaOfFocus}</p></div>
                </div>
              )}
            </div>
          )}
          {project.venue && (
            <div className="flex items-center gap-2 mb-3 text-sm text-rotary-slate dark:text-white/40">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {project.venue}
            </div>
          )}
          {(project.startDate || project.endDate) && (
            <div className="flex items-center gap-2 mb-5 text-sm text-rotary-slate dark:text-white/40">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {project.startDate && new Date(project.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {project.startDate && project.endDate && ' — '}
              {project.endDate && new Date(project.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
          {(project.hostClub || project.partnerClubs || project.externalPartners) && (
            <div className="mb-5 p-4 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 space-y-1.5">
              {project.hostClub && <p className="text-xs text-rotary-slate dark:text-white/40"><span className="font-semibold text-rotary-charcoal dark:text-white/70">Host Club: </span>{project.hostClub}</p>}
              {project.partnerClubs && <p className="text-xs text-rotary-slate dark:text-white/40"><span className="font-semibold text-rotary-charcoal dark:text-white/70">Partner Clubs: </span>{project.partnerClubs}</p>}
              {project.externalPartners && <p className="text-xs text-rotary-slate dark:text-white/40"><span className="font-semibold text-rotary-charcoal dark:text-white/70">External Partners: </span>{project.externalPartners}</p>}
            </div>
          )}
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-rotary-slate dark:text-white/40 mb-4">Impact Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {IMPACT_FIELDS.map(({ key, label }) => (
              <div key={key} className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 text-center">
                <p className="text-xl font-display font-bold text-rotary-blue">
                  {key === 'cashContributions' || key === 'inKindContributions'
                    ? `₹${(project[key] || 0).toLocaleString()}`
                    : (project[key] || 0).toLocaleString()}
                </p>
                <p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Carousel ──────────────────────────────────────────────────────────────────
function ProjectCarousel({ projects, onSelect }) {
  const [active, setActive] = useState(0)
  const autoRef = useRef(null)
  const total = projects.length

  const startAuto = () => {
    clearInterval(autoRef.current)
    autoRef.current = setInterval(() => {
      setActive(i => (i + 1) % total)
    }, 7000)
  }

  useEffect(() => {
    if (total > 1) startAuto()
    return () => clearInterval(autoRef.current)
  }, [total])

  const go = (dir) => {
    setActive(i => (i + dir + total) % total)
    startAuto()
  }

  const goTo = (i) => { setActive(i); startAuto() }

  // Positions: prev(-1), active(0), next(1), rest hidden
  const getPos = (i) => {
    const diff = ((i - active) % total + total) % total
    if (diff === 0) return 'active'
    if (diff === 1 || (active === total - 1 && i === 0)) return 'next'
    if (diff === total - 1) return 'prev'
    return 'hidden'
  }

  return (
    <div className="relative w-full">
      {/* ── Cards stage ── */}
      <div className="relative h-[420px] md:h-[480px] flex items-center justify-center overflow-hidden">
        {projects.map((project, i) => {
          const pos = getPos(i)
          const isActive = pos === 'active'
          const isPrev   = pos === 'prev'
          const isNext   = pos === 'next'
          const isHidden = pos === 'hidden'

          return (
            <motion.div
              key={project.id}
              className="absolute rounded-2xl overflow-hidden cursor-pointer select-none"
              animate={{
                x:       isActive ? 0   : isPrev ? '-62%' : isNext ? '62%' : 0,
                scale:   isActive ? 1   : isPrev || isNext ? 0.82 : 0.7,
                zIndex:  isActive ? 30  : isPrev || isNext ? 20 : 10,
                opacity: isActive ? 1   : isPrev || isNext ? 0.55 : 0,
                filter:  isActive ? 'blur(0px)' : 'blur(1px)',
              }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              style={{ width: '70%', maxWidth: 620, height: '100%' }}
              onClick={() => isActive ? onSelect(project) : go(isNext ? 1 : -1)}
            >
              <img
                src={project.image || 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80'}
                alt={project.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              {/* colour tint */}
              <div className={`absolute inset-0 bg-gradient-to-t ${project.color || 'from-rotary-blue to-cyan-400'} opacity-40`} />
              {/* bottom fade */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

              {/* Content — only fully visible when active */}
              <div className="absolute inset-0 p-7 flex flex-col justify-end">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {project.activityType && (
                    <span className="px-2.5 py-0.5 text-[10px] font-bold bg-black/30 backdrop-blur-sm rounded-full text-white uppercase tracking-wide">
                      {project.activityType}
                    </span>
                  )}
                  {project.avenue && (
                    <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-white/20 backdrop-blur-sm rounded-full text-white">
                      {project.avenue}
                    </span>
                  )}
                  {project.areaOfFocus && (
                    <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-rotary-gold/50 backdrop-blur-sm rounded-full text-white">
                      {project.areaOfFocus}
                    </span>
                  )}
                </div>

                <h3 className="font-display font-bold text-2xl md:text-3xl text-white leading-tight mb-1">
                  {project.title}
                </h3>

                {project.venue && (
                  <p className="text-white/50 text-xs mb-1">📍 {project.venue}</p>
                )}

                {(project.startDate || project.endDate) && (
                  <p className="text-white/40 text-xs mb-3">
                    {project.startDate && new Date(project.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    {project.startDate && project.endDate && ' – '}
                    {project.endDate && new Date(project.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </p>
                )}

                <p className="text-white/70 text-sm leading-relaxed line-clamp-2 mb-4">
                  {project.description}
                </p>

                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelect(project) }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-rotary-navy text-sm font-bold hover:bg-rotary-gold transition-colors"
                    >
                      Know More
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )
        })}

        {/* Prev / Next arrows */}
        {total > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-2 md:left-4 z-40 w-10 h-10 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5 text-rotary-navy dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-2 md:right-4 z-40 w-10 h-10 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5 text-rotary-navy dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Dot indicators ── */}
      {total > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {projects.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === active
                  ? 'w-6 h-2 bg-rotary-blue'
                  : 'w-2 h-2 bg-gray-300 dark:bg-white/20 hover:bg-rotary-blue/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Counter ── */}
      {total > 1 && (
        <p className="text-center text-xs text-rotary-slate dark:text-white/30 mt-2">
          {active + 1} / {total}
        </p>
      )}
    </div>
  )
}

// ── Homepage Projects Section ─────────────────────────────────────────────────
export default function Projects({ onViewAll }) {
  // Read-only display — no admin edit UI on the homepage section, so this
  // never needs to be live; always use the lightweight REST read.
  const { data: projects, loading } = useCollection('projects', [], { live: false })
  const [selectedProject, setSelectedProject] = useState(null)

  const featured = projects.filter(p => p.featured).slice(0, 8)

  if (loading) return (
    <section id="projects" className="section-padding">
      <div className="max-w-7xl mx-auto flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-rotary-blue/30 border-t-rotary-blue rounded-full animate-spin" />
      </div>
    </section>
  )

  return (
    <section id="projects" className="section-padding overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-rotary-gold font-semibold mb-4 block text-sm uppercase tracking-wider">Featured Projects</span>
          <h2 className="heading-lg mb-4">Making a <span className="text-gradient">Difference</span></h2>
          <p className="text-rotary-slate dark:text-white/50 max-w-2xl mx-auto">
            Our flagship initiatives create lasting impact across Rotaract's 5 avenues of service and Rotary's 7 areas of focus.
          </p>
        </motion.div>

        {featured.length === 0 ? (
          <p className="text-center text-rotary-slate dark:text-white/30 py-16">No featured projects yet.</p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <ProjectCarousel projects={featured} onSelect={setSelectedProject} />
          </motion.div>
        )}

        <motion.div
          className="flex justify-center gap-4 mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <motion.button onClick={onViewAll}
            className="btn-secondary inline-flex items-center gap-2 !py-3 !px-6 text-sm"
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          >
            View All Projects
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.button>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedProject && (
          <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
        )}
      </AnimatePresence>
    </section>
  )
}
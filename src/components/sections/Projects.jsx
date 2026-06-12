import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'

export const colorOptions = [
  { label: 'Pink', value: 'from-pink-500 to-rose-400' },
  { label: 'Green', value: 'from-green-500 to-emerald-400' },
  { label: 'Blue', value: 'from-blue-500 to-cyan-400' },
  { label: 'Red', value: 'from-red-500 to-orange-400' },
  { label: 'Purple', value: 'from-purple-500 to-violet-400' },
  { label: 'Amber', value: 'from-amber-500 to-yellow-400' },
]

// ── Rotaract 5 Avenues ────────────────────────────────────────────────────────
export const rotaractAvenues = [
  'Club Service',
  'Community Service',
  'Professional Development',
  'International Service',
  'Public Image',
]

// ── Rotary 7 Areas of Focus ───────────────────────────────────────────────────
export const areasOfFocus = [
  'Peacebuilding and Conflict Prevention',
  'Disease Prevention and Treatment',
  'Water, Sanitation, and Hygiene (WASH)',
  'Maternal and Child Health',
  'Basic Education and Literacy',
  'Community Economic Development',
  'Supporting the Environment',
]

// Combined for backward-compat filters
export const projectCategories = [...rotaractAvenues, ...areasOfFocus]

export const impactLabels = {
  volunteerHours: 'Volunteer Hours',
  fundsRaised: 'Funds Raised (₹)',
  contributions: 'Contributions Received (₹)',
  peopleImpacted: 'People Impacted',
  membersEngaged: 'Members Engaged',
}

export const emptyImpact = {
  volunteerHours: 0, fundsRaised: 0, contributions: 0,
  peopleImpacted: 0, projectsCompleted: 0, membersEngaged: 0,
}

export const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

// ── Project Modal ─────────────────────────────────────────────────────────────
export function ProjectModal({ project, onClose }) {
  if (!project) return null
  const impact = project.impact || emptyImpact

  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-rotary-navy-light rounded-xl shadow-2xl"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
      >
        {/* Hero image */}
        <div className="relative h-56 md:h-64">
          <img
            src={project.image || 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80'}
            alt={project.title}
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${project.color} opacity-40`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            {/* Avenue + Area of Focus badges */}
            <div className="flex flex-wrap gap-2 mb-2">
              {project.avenue && (
                <span className="inline-block px-3 py-1 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full text-white">
                  {project.avenue}
                </span>
              )}
              {project.areaOfFocus && (
                <span className="inline-block px-3 py-1 text-xs font-semibold bg-rotary-gold/50 backdrop-blur-sm rounded-full text-white">
                  {project.areaOfFocus}
                </span>
              )}
              {/* Fallback: show category if no avenue */}
              {!project.avenue && project.category && (
                <span className="inline-block px-3 py-1 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full text-white">
                  {project.category}
                </span>
              )}
            </div>
            <h2 className="font-display font-bold text-2xl text-white">{project.title}</h2>
          </div>
        </div>

        <div className="p-6">
          <p className="text-rotary-charcoal dark:text-white/70 mb-4 leading-relaxed">{project.description}</p>

          {/* Avenue + Area of Focus detail pills */}
          {(project.avenue || project.areaOfFocus) && (
            <div className="flex flex-wrap gap-3 mb-5">
              {project.avenue && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rotary-blue/8 border border-rotary-blue/15">
                  <svg className="w-3.5 h-3.5 text-rotary-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <div>
                    <p className="text-[10px] text-rotary-slate dark:text-white/30 uppercase tracking-wider">Rotaract Avenue</p>
                    <p className="text-xs font-semibold text-rotary-blue">{project.avenue}</p>
                  </div>
                </div>
              )}
              {project.areaOfFocus && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rotary-gold/8 border border-rotary-gold/15">
                  <svg className="w-3.5 h-3.5 text-rotary-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  <div>
                    <p className="text-[10px] text-rotary-slate dark:text-white/30 uppercase tracking-wider">Area of Focus</p>
                    <p className="text-xs font-semibold text-rotary-gold">{project.areaOfFocus}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dates */}
          {(project.startDate || project.endDate) && (
            <div className="flex items-center gap-2 mb-6 text-sm text-rotary-slate dark:text-white/40">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {project.startDate && new Date(project.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {project.startDate && project.endDate && ' — '}
              {project.endDate && new Date(project.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}

          {/* Impact Metrics */}
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-rotary-slate dark:text-white/40 mb-4">Impact Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(impactLabels).map(([key, label]) => (
              <div key={key} className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 text-center">
                <p className="text-xl font-display font-bold text-rotary-blue">{(impact[key] || 0).toLocaleString()}</p>
                <p className="text-xs text-rotary-slate dark:text-white/40 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Homepage Projects Section ─────────────────────────────────────────────────
export default function Projects({ onViewAll, onViewArchives }) {
  const { data: projects, loading } = useCollection('projects')
  const [selectedProject, setSelectedProject] = useState(null)

  const featured = projects
    .filter(p => p.featured)
    .slice(0, 4)

  if (loading) return (
    <section id="projects" className="section-padding">
      <div className="max-w-7xl mx-auto flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-rotary-blue/30 border-t-rotary-blue rounded-full animate-spin" />
      </div>
    </section>
  )

  return (
    <section id="projects" className="section-padding">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
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

        <div className="grid md:grid-cols-2 gap-6">
          {featured.map((project, i) => (
            <motion.div
              key={project.id}
              className="group relative rounded-xl overflow-hidden aspect-[4/3] cursor-pointer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => setSelectedProject(project)}
            >
              <img
                src={project.image || 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80'}
                alt={project.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${project.color} opacity-50 group-hover:opacity-60 transition-opacity`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                {/* Show avenue + area of focus or fallback category */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {project.avenue && (
                    <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full text-white">
                      {project.avenue}
                    </span>
                  )}
                  {project.areaOfFocus && (
                    <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-rotary-gold/40 backdrop-blur-sm rounded-full text-white">
                      {project.areaOfFocus}
                    </span>
                  )}
                  {!project.avenue && project.category && (
                    <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full text-white">
                      {project.category}
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-xl md:text-2xl text-white mb-1">{project.title}</h3>
                <p className="text-white/70 text-sm line-clamp-2">{project.description}</p>
                <div className="mt-3 flex items-center gap-2 text-white/80 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Know More
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {featured.length === 0 && !loading && (
          <p className="text-center text-rotary-slate dark:text-white/30 py-16">No projects yet.</p>
        )}

        <motion.div
          className="flex justify-center gap-4 mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <motion.button
            onClick={onViewAll}
            className="btn-secondary inline-flex items-center gap-2 !py-3 !px-6 text-sm"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            View All Projects
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.button>

          <motion.button
            onClick={onViewArchives}
            className="btn-secondary inline-flex items-center gap-2 !py-3 !px-6 text-sm"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            Archives
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </motion.button>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedProject && <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
      </AnimatePresence>
    </section>
  )
}
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const reasons = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'On-ground execution',
    body: 'We don\'t just plan — we show up. Our members handle end-to-end project delivery so your CSR funds create real, visible impact.',
    accent: 'text-rotary-blue',
    bg: 'bg-rotary-blue/8 dark:bg-rotary-blue/15',
    border: 'border-rotary-blue/15 dark:border-rotary-blue/20',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: 'Rotary-backed credibility',
    body: 'Part of a global network of 46,000+ clubs. Your partnership carries the weight of Rotary International\'s 100+ year legacy of service.',
    accent: 'text-rotary-gold',
    bg: 'bg-rotary-gold/8 dark:bg-rotary-gold/15',
    border: 'border-rotary-gold/15 dark:border-rotary-gold/20',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Transparent reporting',
    body: 'Detailed impact reports, photo documentation, and financial summaries delivered post-project. Every rupee accounted for.',
    accent: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Community reach',
    body: 'Deep roots in Bengaluru BTM and surrounding areas. We know the communities, the needs, and how to create lasting change.',
    accent: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/20',
  },
]

const focusAreas = [
  { emoji: '📚', label: 'Education' },
  { emoji: '🌱', label: 'Environment' },
  { emoji: '🏥', label: 'Health' },
  { emoji: '💧', label: 'Clean Water' },
  { emoji: '👩‍💼', label: 'Women Empowerment' },
  { emoji: '🤝', label: 'Livelihood' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function CSR({ onContact }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} id="csr" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-rotary-cloud/60 to-white dark:from-rotary-navy dark:via-rotary-navy-light/40 dark:to-rotary-navy" />

      {/* Subtle rotary gear watermark */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[480px] h-[480px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <svg viewBox="0 0 400 400" fill="none">
          <circle cx="200" cy="200" r="180" stroke="#d41367" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="120" stroke="#f7a81b" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="60"  stroke="#d41367" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="max-w-2xl mb-16">
          <motion.span
            variants={fadeUp} custom={0} initial="hidden" animate={inView ? 'visible' : 'hidden'}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full border border-rose-200 dark:border-rose-500/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Corporate Social Responsibility
          </motion.span>

          <motion.h2
            variants={fadeUp} custom={1} initial="hidden" animate={inView ? 'visible' : 'hidden'}
            className="heading-lg mb-5"
          >
            Make your CSR{' '}
            <span className="text-rotary-blue">count.</span>
          </motion.h2>

          <motion.p
            variants={fadeUp} custom={2} initial="hidden" animate={inView ? 'visible' : 'hidden'}
            className="text-lg text-rotary-slate dark:text-white/60 leading-relaxed"
          >
            Bengaluru has no shortage of CSR spend — but impact is rare. We bridge the gap between your organisation's intent and genuine community transformation, with the energy of young professionals who care deeply about this city.
          </motion.p>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* Left — reason cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {reasons.map((r, i) => (
              <motion.div
                key={r.title}
                variants={fadeUp} custom={i + 3} initial="hidden" animate={inView ? 'visible' : 'hidden'}
                className={`p-5 rounded-2xl border ${r.bg} ${r.border} hover:shadow-sm transition-shadow`}
              >
                <div className={`w-9 h-9 rounded-xl ${r.bg} ${r.border} border flex items-center justify-center mb-3 ${r.accent}`}>
                  {r.icon}
                </div>
                <h3 className={`font-display font-bold text-sm mb-1.5 ${r.accent}`}>{r.title}</h3>
                <p className="text-xs text-rotary-slate dark:text-white/50 leading-relaxed">{r.body}</p>
              </motion.div>
            ))}
          </div>

          {/* Right — focus areas + CTA */}
          <motion.div
            variants={fadeUp} custom={7} initial="hidden" animate={inView ? 'visible' : 'hidden'}
            className="lg:pl-6"
          >
            {/* Quote / pull statement */}
            <div className="relative pl-5 mb-10">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rotary-blue via-rotary-gold to-transparent rounded-full" />
              <p className="text-xl font-display font-semibold leading-snug text-rotary-charcoal dark:text-white">
                "We don't just lend our name to a project — we show up, sleeves rolled, every single time."
              </p>
              <p className="text-sm text-rotary-slate dark:text-white/40 mt-2">— Rotaract Bengaluru BTM</p>
            </div>

            {/* Focus areas */}
            <div className="mb-10">
              <p className="text-xs font-bold uppercase tracking-widest text-rotary-slate dark:text-white/30 mb-4">Focus Areas</p>
              <div className="flex flex-wrap gap-2">
                {focusAreas.map((f) => (
                  <span
                    key={f.label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-rotary-charcoal dark:text-white/70 shadow-sm"
                  >
                    <span>{f.emoji}</span> {f.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-10 p-3 sm:p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10">
              {[
                { value: '30+', label: 'Projects delivered' },
                { value: '2000+', label: 'Lives impacted' },
                { value: '5+', label: 'Years of service' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="font-display font-bold text-xl text-rotary-blue">{s.value}</p>
                  <p className="text-[10px] text-rotary-slate dark:text-white/40 mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onContact?.()}
                className="flex-1 btn-primary !py-3 text-sm !rounded-xl text-center"
              >
                Partner with us
              </button>
              <a
                href="#projects"
                className="flex-1 py-3 px-5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold text-center text-rotary-charcoal dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                See our work →
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom separator */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rotary-silver dark:via-white/10 to-transparent" />
    </section>
  )
}
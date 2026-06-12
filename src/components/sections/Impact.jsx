import { motion } from 'framer-motion'
import AnimatedCounter from '../ui/AnimatedCounter'

const stats = [
  { value: 5000, suffix: '+', label: 'Lives Impacted', icon: '👥' },
  { value: 500, suffix: '+', label: 'Students Mentored', icon: '📚' },
  { value: 2000, suffix: '+', label: 'Trees Planted', icon: '🌳' },
  { value: 10, suffix: 'L+', label: 'Funds Raised (₹)', icon: '💰' },
  { value: 30, suffix: '+', label: 'Health Camps', icon: '🏥' },
  { value: 15, suffix: '+', label: 'Partner Organizations', icon: '🤝' }
]

const focusAreas = [
  {
    icon: '🕊️',
    title: 'Promoting Peace',
    description: 'Fostering understanding, goodwill, and peace through fellowship and community dialogue.',
    color: 'from-blue-400 to-indigo-500'
  },
  {
    icon: '🦠',
    title: 'Fighting Disease',
    description: 'Health camps, blood drives, and awareness campaigns to combat preventable diseases.',
    color: 'from-red-400 to-rose-500'
  },
  {
    icon: '💧',
    title: 'Providing Clean Water',
    description: 'Ensuring access to clean water, sanitation, and hygiene in underserved communities.',
    color: 'from-cyan-400 to-blue-500'
  },
  {
    icon: '👩‍👧',
    title: 'Saving Mothers & Children',
    description: 'Supporting maternal and child health through nutrition programs and medical aid.',
    color: 'from-pink-400 to-fuchsia-500'
  },
  {
    icon: '📖',
    title: 'Supporting Education',
    description: 'Digital literacy, scholarships, and mentorship for underprivileged students.',
    color: 'from-amber-400 to-orange-500'
  },
  {
    icon: '💼',
    title: 'Growing Local Economies',
    description: 'Skill development workshops, entrepreneurship bootcamps, and career guidance.',
    color: 'from-green-400 to-emerald-500'
  },
  {
    icon: '🌱',
    title: 'Protecting the Environment',
    description: 'Tree plantations, clean-up drives, and sustainability awareness campaigns.',
    color: 'from-teal-400 to-green-500'
  }
]

export default function Impact() {
  return (
    <section id="impact" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-rotary-navy" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rotary-blue via-rotary-gold to-rotary-blue" />

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-rotary-gold font-semibold mb-4 block text-sm uppercase tracking-wider">Our Impact</span>
          <h2 className="heading-lg text-white mb-4">
            Numbers That{' '}
            <span className="text-rotary-gold">Inspire</span>
          </h2>
          {/* was white/50 — bumped to white/80 */}
          <p className="text-white/80 max-w-2xl mx-auto text-base">
            Every number represents a story of transformation, hope, and youth-led empowerment.
          </p>
        </motion.div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="group relative rounded-xl p-6 md:p-8 text-center bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -3 }}
            >
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-rotary-gold/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <span className="text-3xl mb-3 block">{stat.icon}</span>
              <div className="text-3xl md:text-5xl font-display font-bold text-white mb-1">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              {/* was white/40 — bumped to white/75 */}
              <p className="text-white/75 text-sm font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Areas of Focus ── */}
        <motion.div
          className="mt-28"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-16">
            <span className="text-rotary-gold font-semibold mb-4 block text-sm uppercase tracking-wider">What We Focus On</span>
            <h2 className="heading-lg text-white mb-4">
              Rotary's 7{' '}
              <span className="text-rotary-gold">Areas of Focus</span>
            </h2>
            {/* was white/50 — bumped to white/80 */}
            <p className="text-white/80 max-w-2xl mx-auto text-base">
              Every project we undertake aligns with Rotary International's seven areas of focus — guiding our efforts where they matter most.
            </p>
          </div>

          {/* Top row — 4 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {focusAreas.slice(0, 4).map((area, i) => (
              <motion.div
                key={area.title}
                className="group relative rounded-xl p-6 text-center bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] overflow-hidden transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -3 }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${area.color} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`} />
                <div className="relative z-10">
                  <span className="text-3xl mb-3 block">{area.icon}</span>
                  <h3 className="font-display font-semibold text-base text-white mb-2">{area.title}</h3>
                  {/* was white/40 — bumped to white/75 */}
                  <p className="text-white/75 text-sm leading-relaxed">{area.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom row — 3 centered */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 lg:max-w-[75%] lg:mx-auto">
            {focusAreas.slice(4).map((area, i) => (
              <motion.div
                key={area.title}
                className="group relative rounded-xl p-6 text-center bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] overflow-hidden transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i + 4) * 0.08 }}
                whileHover={{ y: -3 }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${area.color} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`} />
                <div className="relative z-10">
                  <span className="text-3xl mb-3 block">{area.icon}</span>
                  <h3 className="font-display font-semibold text-base text-white mb-2">{area.title}</h3>
                  {/* was white/40 — bumped to white/75 */}
                  <p className="text-white/75 text-sm leading-relaxed">{area.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
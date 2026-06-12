import { motion } from 'framer-motion'
import Card from '../ui/Card'

const reasons = [
  {
    icon: '🏆',
    title: 'Leadership Development',
    description:
      'Run real projects, chair committees, and speak on stage. Every role sharpens the skills that matter most in your career and community.',
    accent: 'border-t-rotary-blue',
    bg: 'bg-rotary-blue/10 dark:bg-rotary-blue/20',
  },
  {
    icon: '🤝',
    title: 'Networking',
    description:
      'Build genuine relationships with young professionals, mentors from Rotary, and changemakers across Bengaluru and beyond.',
    accent: 'border-t-rotary-gold',
    bg: 'bg-rotary-gold/10 dark:bg-rotary-gold/20',
  },
  {
    icon: '🌱',
    title: 'Community Service',
    description:
      'Drive real impact through health camps, education drives, and sustainability initiatives — all designed and led by members like you.',
    accent: 'border-t-emerald-600',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
  },
  {
    icon: '✈️',
    title: 'International Opportunities',
    description:
      'Connect with 11,000+ Rotaract clubs across 170 countries — exchange programs, district conferences, and a global network await.',
    accent: 'border-t-rotary-navy',
    bg: 'bg-rotary-navy/10 dark:bg-white/10',
  },
]

export default function WhyJoin() {
  return (
    <section id="why-join" className="section-padding bg-white dark:bg-rotary-navy">
      <div className="max-w-7xl mx-auto">

        {/* Stars */}
        <motion.div
          className="flex justify-center gap-1 mb-4"
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="text-rotary-gold text-xl">★</span>
          ))}
        </motion.div>

        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-rotary-gold font-semibold mb-3 block text-sm uppercase tracking-wider">
            Why Join Us
          </span>
          <h2 className="heading-lg mb-4">
            Grow With{' '}
            <span className="text-gradient">Rotaract BTM</span>
          </h2>
          <p className="text-gray-600 dark:text-white/60 max-w-xl mx-auto text-lg">
            More than a club — a launchpad for the leaders Bengaluru needs.
            Here's what you gain when you join us.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="h-full"
            >
              <Card className={`h-full border-t-4 ${reason.accent}`}>
                <div className={`w-12 h-12 rounded-2xl ${reason.bg} flex items-center justify-center text-2xl mb-5`}>
                  {reason.icon}
                </div>
                <h3 className="font-display font-semibold text-xl mb-2">
                  {reason.title}
                </h3>
                <p className="text-gray-600 dark:text-white/60 text-sm leading-relaxed">
                  {reason.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
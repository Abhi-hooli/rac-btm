import { motion } from 'framer-motion'

const awards = [
  {
    year: '2025',
    title: 'Best Community Service Project',
    description: 'Recognized for impactful service initiatives benefiting the local community.',
  },
  {
    year: '2024',
    title: 'Outstanding Rotaract Club',
    description: 'Awarded for excellence in leadership, fellowship, and service.',
  },
  {
    year: '2023',
    title: 'District Excellence Award',
    description: 'Honored for consistent contributions and innovative club projects.',
  },
]

export default function Awards() {
  return (
    <section className="py-24 bg-gray-50 dark:bg-rotary-navy">
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-16">
          <span className="text-rotary-gold uppercase tracking-widest text-sm font-semibold">
            Recognition
          </span>

          <h2 className="text-4xl md:text-5xl font-bold mt-3 text-rotary-navy dark:text-white">
            Awards & Achievements
          </h2>

          <p className="mt-5 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Celebrating milestones and recognitions earned through service,
            leadership, and community impact.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {awards.map((award, index) => (
            <motion.div
              key={award.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-100 dark:border-white/10 shadow-lg"
            >
              <div className="w-14 h-14 rounded-2xl bg-rotary-gold/10 flex items-center justify-center mb-6">
                🏆
              </div>

              <span className="text-rotary-gold font-semibold">
                {award.year}
              </span>

              <h3 className="text-xl font-bold mt-2 text-rotary-navy dark:text-white">
                {award.title}
              </h3>

              <p className="mt-4 text-gray-600 dark:text-gray-300">
                {award.description}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
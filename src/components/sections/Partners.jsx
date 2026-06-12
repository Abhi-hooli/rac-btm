import { motion } from 'framer-motion'

const partners = [
  { name: 'Rotary International', logo: '/logo-rotary-international.png' },
  { name: 'Rotary Bengaluru BTM 3191', logo: '/logo-rotary-btm.png' },
  { name: 'Rotaract District 3191', logo: '/logo-rotaract-district.png' },
  { name: 'Rotary District 3191', logo: '/logo-rotary-district.png' },
  
]

export default function Partners() {
  return (
    <section className="py-20 bg-white dark:bg-rotary-navy overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-12">
          <p className="text-rotary-gold uppercase tracking-widest text-sm font-semibold">
            Our Network
          </p>

          <h2 className="text-4xl font-bold mt-3 text-rotary-navy dark:text-white">
            Partners & Sponsors
          </h2>

          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Collaborating with organizations that share our vision for impact.
          </p>
        </div>

        <div className="relative overflow-hidden">
          {/* Left fade */}
          <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-white dark:from-rotary-navy to-transparent pointer-events-none" />
          {/* Right fade */}
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-white dark:from-rotary-navy to-transparent pointer-events-none" />

          <motion.div
            className="flex gap-8 w-max"
            animate={{
              x: ['0%', '-50%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 25,
              ease: 'linear',
            }}
          >
            {[...partners, ...partners].map((partner, index) => (
              <div
                key={index}
                className="min-w-[240px] h-24 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center px-6"
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="max-h-12 w-auto object-contain dark:invert"
                />
              </div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  )
}
import { motion } from 'framer-motion'
import Card from '../ui/Card'

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

const milestones = [
  { year: '[2023]', text: 'Club chartered under RID 3191' },
  { year: '[Year]', text: 'First flagship project — Stree Shakti launched' },
  { year: '[2025]', text: 'Crossed 40+ active members' },
  { year: '[Year]', text: 'Best Rotaract Club award at District Conference' },
]

export default function About() {
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
                <span className="text-2xl font-bold text-rotary-blue dark:text-rotary-gold">RID 3191</span>
                <p className="text-sm text-gray-600 dark:text-white/60">District</p>
              </div>
            </div>
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
          <h3 className="heading-md text-center mb-12">
            Our <span className="text-gradient">Journey</span>
          </h3>

          <div className="relative">
            {/* Vertical line — left on mobile, center on desktop */}
            <div className="absolute left-[7px] md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-rotary-blue via-rotary-gold to-rotary-blue" />

            <div className="space-y-10 md:space-y-12">
              {milestones.map((item, i) => (
                <motion.div
                  key={i}
                  className="relative flex items-start md:items-center gap-6 pl-10 md:pl-0"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  {/* ── MOBILE layout (always left-aligned) ── */}
                  <div className="md:hidden flex-1">
                    <span className="inline-block px-3 py-1 text-sm font-bold bg-rotary-blue/10 dark:bg-rotary-blue/20 text-rotary-blue dark:text-rotary-gold rounded-full mb-1">
                      {item.year}
                    </span>
                    <p className="text-gray-700 dark:text-white/80 font-medium">{item.text}</p>
                  </div>

                  {/* Dot — positioned over the line */}
                  <div className="absolute left-0 md:left-1/2 top-1 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-4 h-4 rounded-full bg-rotary-gold border-4 border-white dark:border-rotary-navy-light shadow-md z-10 shrink-0" />

                  {/* ── DESKTOP layout (alternating sides) ── */}
                  {/* Left side */}
                  <div className={`hidden md:flex flex-1 justify-end pr-8 ${i % 2 === 0 ? '' : 'invisible'}`}>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 text-sm font-bold bg-rotary-blue/10 dark:bg-rotary-blue/20 text-rotary-blue dark:text-rotary-gold rounded-full mb-1">
                        {item.year}
                      </span>
                      <p className="text-gray-700 dark:text-white/80 font-medium">{item.text}</p>
                    </div>
                  </div>

                  {/* Spacer for the dot on desktop */}
                  <div className="hidden md:block w-4 shrink-0" />

                  {/* Right side */}
                  <div className={`hidden md:flex flex-1 pl-8 ${i % 2 !== 0 ? '' : 'invisible'}`}>
                    <div>
                      <span className="inline-block px-3 py-1 text-sm font-bold bg-rotary-blue/10 dark:bg-rotary-blue/20 text-rotary-blue dark:text-rotary-gold rounded-full mb-1">
                        {item.year}
                      </span>
                      <p className="text-gray-700 dark:text-white/80 font-medium">{item.text}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

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
                Every Rotaract club is sponsored by a local Rotary club and belongs to a Rotary district. As part of RID 3191, we collaborate with Rotary clubs and other Rotaract clubs across Karnataka for district-level projects, conferences, and fellowship events.
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
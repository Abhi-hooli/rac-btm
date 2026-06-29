import { motion } from 'framer-motion'

const EPN_RED      = '#e02927'
const EPN_TEAL     = '#00adbb'
const EPN_ORANGE   = '#f5821f'

const stats = [
  { value: '99.9%', label: 'Reduction in Cases',    color: EPN_RED,    bg: '#fff5f5', border: '#fbc8c8', text: '#a01c1b' },
  { value: '2.5B+', label: 'Children Immunized',    color: EPN_TEAL,   bg: '#f0fbfc', border: '#b3e8ed', text: '#006870' },
  { value: '122+',  label: 'Countries Polio-Free',  color: EPN_ORANGE, bg: '#fff8f2', border: '#fdd8b8', text: '#9e4e08' },
  { value: '$2.1B+',label: 'Contributed by Rotary', color: EPN_RED,    bg: '#fff5f5', border: '#fbc8c8', text: '#a01c1b' },
]

const EndPolioMark = () => (
  <svg viewBox="0 0 64 64" className="w-11 h-11" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" stroke={EPN_RED} strokeWidth="2.5" fill="none" />
    <path d="M32 12 C32 12 18 26 18 36 a14 14 0 0 0 28 0 C46 26 32 12 32 12z" fill={EPN_RED} opacity="0.15" />
    <path d="M32 18 C32 18 21 30 21 38 a11 11 0 0 0 22 0 C43 30 32 18 32 18z" stroke={EPN_RED} strokeWidth="2" fill="none" />
    <line x1="26" y1="38" x2="38" y2="38" stroke={EPN_RED} strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export default function EndPolio() {
  return (
    <section className="py-24 px-6 md:px-12 lg:px-24 bg-white relative overflow-hidden">

      {/* Tri-colour top bar */}
      <div className="absolute top-0 left-0 right-0 flex h-1">
        <div className="flex-1" style={{ background: EPN_RED }} />
        <div className="flex-1" style={{ background: EPN_TEAL }} />
        <div className="flex-1" style={{ background: EPN_ORANGE }} />
      </div>

      {/* Soft red glow top-right */}
      <div
        className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full opacity-[0.07] pointer-events-none"
        style={{ background: `radial-gradient(circle, ${EPN_RED} 0%, transparent 70%)` }}
      />

      <div className="max-w-6xl mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — Text & CTA */}
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <EndPolioMark />
              <span className="font-semibold text-xs uppercase tracking-widest" style={{ color: EPN_RED }}>
                Rotary's Flagship Cause
              </span>
            </div>

            <h2 className="font-display font-bold text-4xl md:text-5xl text-gray-900 leading-tight mb-1">
              End Polio
            </h2>
            <h3 className="font-display font-bold text-4xl md:text-5xl leading-tight mb-5" style={{ color: EPN_RED }}>
              Now.
            </h3>

            {/* Tri-colour rule */}
            <div className="flex gap-1 mb-8">
              {[EPN_RED, EPN_TEAL, EPN_ORANGE].map(c => (
                <div key={c} className="w-4 h-0.5 rounded-full" style={{ background: c }} />
              ))}
            </div>

            <p className="text-gray-500 text-lg leading-relaxed mb-10">
              Since 1985, Rotary and its partners have immunized more than 2.5 billion children against
              polio, reducing cases by 99.9%. We are closer than ever to eradicating this disease for good —
              but we need your support to finish the job.
            </p>

            <motion.a
              href="https://www.endpolio.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 text-white font-bold text-sm rounded-xl transition-opacity duration-200 hover:opacity-90"
              style={{ background: EPN_RED }}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
            >
              Support End Polio Now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </motion.a>
          </motion.div>

          {/* Right — Stats grid */}
          <motion.div
            className="grid grid-cols-2 gap-3"
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="p-6 rounded-2xl border"
                style={{
                  background: stat.bg,
                  borderColor: stat.border,
                  borderTopColor: stat.color,
                  borderTopWidth: '3px',
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <p className="font-display font-bold text-3xl mb-1" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <p className="text-xs leading-snug" style={{ color: stat.text }}>{stat.label}</p>
              </motion.div>
            ))}

            {/* Progress bar card */}
            <motion.div
              className="col-span-2 p-5 rounded-2xl bg-gray-50 border border-gray-200"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-700 text-sm font-semibold">Global Eradication Progress</p>
                <p className="text-sm font-bold" style={{ color: EPN_RED }}>99.9%</p>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                <motion.div
                  className="h-full rounded-full flex overflow-hidden"
                  initial={{ width: 0 }}
                  whileInView={{ width: '99.9%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, delay: 0.6, ease: 'easeOut' }}
                >
                  <div className="flex-1" style={{ background: EPN_RED }} />
                  <div className="w-1.5" style={{ background: EPN_TEAL }} />
                  <div className="w-1.5" style={{ background: EPN_ORANGE }} />
                </motion.div>
              </div>
              <p className="text-gray-400 text-xs mt-2">
                Wild poliovirus cases down from 350,000 in 1988 to fewer than 10 today.
              </p>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
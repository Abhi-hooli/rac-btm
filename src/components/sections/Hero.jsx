import { motion } from 'framer-motion'
import Button from '../ui/Button'

export default function Hero({ setCurrentPage }) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">

      {/* ── Background image with filters ── */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600&q=80"
          alt=""
          className="w-full h-full object-cover"
          style={{
            filter: "saturate(0.6) brightness(0.45) contrast(1.1)",
          }}
        />
      </div>

      {/* ── Colour-tinted overlay on top of the image ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-rotary-navy/80 via-rotary-navy/60 to-rotary-blue/30 dark:from-rotary-navy/90 dark:via-rotary-navy-light/70 dark:to-rotary-navy/50" />

      {/* ── Subtle decorative SVG ── */}
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.04] dark:opacity-[0.06]">
        <svg viewBox="0 0 400 800" fill="none" className="w-full h-full">
          <circle cx="300" cy="200" r="300" stroke="#d41367" strokeWidth="1" />
          <circle cx="300" cy="200" r="200" stroke="#f7a81b" strokeWidth="1" />
          <circle cx="300" cy="200" r="100" stroke="#d41367" strokeWidth="1" />
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
        <div className="max-w-3xl">

          {/* Badge — white text + white border so it pops on the dark bg */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-medium bg-white/10 text-white rounded-full border border-white/25 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-rotary-blue" />
              Rotaract Club — RID 3191
            </span>
          </motion.div>

          {/* Heading — force white for "Lead." so it doesn't disappear */}
          <motion.h1
            className="heading-xl mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <span className="text-rotary-blue">Create.</span>{' '}
            <span className="text-white">Lead.</span>{' '}
            <span className="text-rotary-gold">Inspire.</span>
          </motion.h1>

          {/* Body copy — solid white/90 instead of slate/70 */}
          <motion.div
            className="flex flex-col sm:flex-row items-start gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Button onClick={() => setCurrentPage('contact')}>
              Get Involved
            </Button>

            <Button
              variant="secondary"
              className="!text-white !border-white/60 hover:!bg-white/10"
              onClick={() =>
                document.getElementById('impact')?.scrollIntoView({
                  behavior: 'smooth'
                })
              }
            >
              Our Impact →
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </section>
  )
}
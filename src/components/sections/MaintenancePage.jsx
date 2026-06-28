import { motion } from 'framer-motion'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-rotary-navy flex items-center justify-center p-6 relative overflow-hidden">

      {/* Decorative background circles */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.04]">
        <svg viewBox="0 0 400 400" fill="none" className="w-full h-full">
          <circle cx="300" cy="100" r="300" stroke="#f7a81b" strokeWidth="1" />
          <circle cx="300" cy="100" r="200" stroke="#003F8A" strokeWidth="1" />
          <circle cx="300" cy="100" r="100" stroke="#f7a81b" strokeWidth="1" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-[0.03]">
        <svg viewBox="0 0 400 400" fill="none" className="w-full h-full">
          <circle cx="100" cy="300" r="300" stroke="#f7a81b" strokeWidth="1" />
          <circle cx="100" cy="300" r="180" stroke="#003F8A" strokeWidth="1" />
        </svg>
      </div>

      <motion.div
        className="relative z-10 text-center max-w-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/rotaract-logo.png"
            alt="Rotaract Bengaluru BTM"
            className="h-16 object-contain"
            style={{ mixBlendMode: 'screen' }}
          />
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-rotary-gold/10 border border-rotary-gold/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-rotary-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
          We'll be right back
        </h1>
        <p className="text-white/50 text-lg mb-2">
          The Rotaract Bengaluru BTM website is currently undergoing scheduled maintenance.
        </p>
        <p className="text-white/30 text-sm mb-10">
          We're working hard to improve your experience. Please check back shortly.
        </p>

        {/* Divider */}
        <div className="h-px bg-white/10 mb-8" />

        <p className="text-white/20 text-xs">
          Rotaract Club of Bengaluru BTM · R.I.Dist 3191
        </p>
        <p className="text-white/15 text-xs mt-1">
          For urgent queries, reach us at{' '}
          <a href="mailto:racbtm@gmail.com" className="text-rotary-gold/40 hover:text-rotary-gold/60 transition-colors">
            racbtm@gmail.com
          </a>
        </p>
      </motion.div>
    </div>
  )
}

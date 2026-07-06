import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function IntroAnimation({ onComplete, onSkip }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 250),
      setTimeout(() => setPhase(2), 700),
      setTimeout(onComplete, 1600)
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-rotary-navy"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="w-20 h-20 rounded-full border-[3px] border-rotary-blue flex items-center justify-center"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.div
          className="w-8 h-8 rounded-full bg-rotary-gold"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        />
      </motion.div>

      <motion.h1
        className="mt-8 font-display text-2xl md:text-4xl font-bold text-white tracking-tight"
        initial={{ opacity: 0, y: 15 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        Rotaract <span className="text-rotary-blue">Bengaluru BTM</span>
      </motion.h1>

      <motion.p
        className="mt-3 text-base text-white/50 font-medium tracking-widest uppercase"
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}
      >
        Create · Lead · Inspire
      </motion.p>

      <motion.button
        className="absolute bottom-8 right-8 text-white/30 hover:text-white/60 text-sm transition-colors"
        onClick={onSkip}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Skip →
      </motion.button>
    </motion.div>
  )
}
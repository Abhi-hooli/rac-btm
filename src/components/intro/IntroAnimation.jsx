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
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-rotary-navy"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(212,19,103,0.25),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_75%,rgba(247,168,27,0.12),transparent_55%)]" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      <div className="relative flex flex-col items-center px-6">
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <motion.div
            className="absolute w-28 h-28 rounded-full bg-rotary-blue/30 blur-2xl"
            animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.15, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-24 h-24 rounded-full border border-white/10"
            animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
          <div className="relative w-20 h-20 rounded-full border-[3px] border-rotary-blue flex items-center justify-center bg-rotary-navy shadow-[0_0_30px_rgba(212,19,103,0.35)]">
            <motion.div
              className="w-8 h-8 rounded-full bg-rotary-gold shadow-[0_0_16px_rgba(247,168,27,0.6)]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            />
          </div>
        </motion.div>

        <motion.h1
          className="mt-9 font-display text-3xl md:text-5xl font-bold text-white tracking-tight text-center"
          initial={{ opacity: 0, y: 15 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          Rotaract <span className="text-rotary-blue-light">Bengaluru BTM</span>
        </motion.h1>

        <motion.div
          className="mt-4 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="h-px w-6 bg-white/20" />
          <p className="text-sm md:text-base text-white/60 font-medium tracking-[0.2em] uppercase">
            Create · Lead · Inspire
          </p>
          <span className="h-px w-6 bg-white/20" />
        </motion.div>

        <motion.p
          className="mt-2 text-xs md:text-sm text-rotary-gold-light/80 font-semibold tracking-[0.35em] uppercase"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          People of Action
        </motion.p>

        <motion.div
          className="mt-10 h-[3px] w-40 rounded-full bg-white/10 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-rotary-blue to-rotary-gold"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>

      <motion.button
        className="absolute bottom-8 right-8 text-white/30 hover:text-white/70 text-sm transition-colors"
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
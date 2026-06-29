import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLogin from '../ui/AdminLogin'

const ABHI_URL = 'https://www.abhihooli.in'

const dots = [0, 1, 2]

function useCountdown(resumeAt) {
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (!resumeAt) { setTimeLeft(null); return }
    const calc = () => {
      const diff = resumeAt - Date.now()
      if (diff <= 0) { setTimeLeft({ h: 0, m: 0, s: 0, done: true }); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ h, m, s, done: false })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [resumeAt])

  return timeLeft
}

export default function MaintenancePage({ onLogin, resumeAt }) {
  const [showLogin, setShowLogin] = useState(false)
  const countdown = useCountdown(resumeAt || null)

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Radial glow behind content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-rotary-blue/10 blur-[120px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#f7a81b 1px, transparent 1px), linear-gradient(90deg, #f7a81b 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Decorative ring top-right */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full border border-rotary-gold/10 pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-[300px] h-[300px] rounded-full border border-rotary-blue/10 pointer-events-none" />

      {/* Decorative ring bottom-left */}
      <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full border border-rotary-gold/10 pointer-events-none" />

      {/* Main card */}
      <motion.div
        className="relative z-10 text-center max-w-md w-full"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <img
            src="/rotaract-logo.png"
            alt="Rotaract Bengaluru BTM"
            className="h-14 object-contain"
            style={{ mixBlendMode: 'screen', filter: 'brightness(1.2)' }}
          />
        </motion.div>

        {/* Animated gear icon */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-rotary-gold/20 blur-xl scale-150" />
            {/* Pulsing ring */}
            <motion.div
              className="absolute inset-0 rounded-full border border-rotary-gold/30"
              animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Icon container */}
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-rotary-blue/30 to-rotary-gold/20 border border-rotary-gold/30 backdrop-blur-sm flex items-center justify-center">
              <motion.svg
                className="w-9 h-9 text-rotary-gold"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </motion.svg>
            </div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-4xl md:text-5xl font-display font-bold mb-4"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #c8d6f0 50%, #f7a81b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          We'll be right back
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-white/50 text-base mb-2 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.7 }}
        >
          The Rotaract Bengaluru BTM website is currently undergoing scheduled maintenance.
        </motion.p>

        {/* Animated loading indicator */}
        <motion.div
          className="flex items-center justify-center gap-1.5 mt-5 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <span className="text-white/30 text-sm mr-1">Working on it</span>
          {dots.map(i => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-rotary-gold/60"
              animate={{ opacity: [0.2, 1, 0.2], y: [0, -4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </motion.div>

        {/* Countdown timer */}
        {countdown && !countdown.done && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-white/30 text-xs mb-3 tracking-widest uppercase">Back online in</p>
            <div className="flex items-center justify-center gap-3">
              {[
                { value: countdown.h, label: 'hrs' },
                { value: countdown.m, label: 'min' },
                { value: countdown.s, label: 'sec' },
              ].map(({ value, label }, i) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-2xl font-display font-bold text-white tabular-nums">
                        {String(value).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-white/20 text-[10px] mt-1 uppercase tracking-wider">{label}</span>
                  </div>
                  {i < 2 && <span className="text-white/20 text-2xl font-bold mb-4">:</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {countdown?.done && (
          <motion.p
            className="text-rotary-gold/60 text-sm mb-8 font-medium"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            Almost ready — hang tight!
          </motion.p>
        )}

        {/* Divider */}
        <motion.div
          className="h-px mb-7"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        />

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="space-y-2"
        >
          <p className="text-white/20 text-xs tracking-wide">
            Rotaract Club of Bengaluru BTM · R.I.Dist 3191
          </p>
          <p className="text-white/15 text-xs">
            For urgent queries —{' '}
            <a
              href="mailto:racbtm@gmail.com"
              className="text-rotary-gold/40 hover:text-rotary-gold/70 transition-colors underline underline-offset-2"
            >
              racbtm@gmail.com
            </a>
          </p>
          <p className="text-white/10 text-xs pt-1">
            Designed, managed &amp; content by{' '}
            <a
              href={ABHI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rotary-gold/25 hover:text-rotary-gold/50 transition-colors underline underline-offset-2"
            >
              Abhi
            </a>
          </p>
        </motion.div>

        {/* Admin login — very subtle */}
        <motion.button
          type="button"
          onClick={() => setShowLogin(true)}
          className="mt-8 text-white/[0.07] hover:text-white/25 text-xs transition-colors duration-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Admin Login
        </motion.button>
      </motion.div>

      <AdminLogin
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLogin={(perms) => {
          setShowLogin(false)
          onLogin?.(perms)
        }}
      />
    </div>
  )
}

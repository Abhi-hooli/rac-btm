import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '../ui/Button'
import { useDocument } from '../../hooks/useFirestore'

export default function Hero({ setCurrentPage, isAdmin }) {
  const { data: heroSettings, save: saveHero } = useDocument('settings', 'hero', {
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600&q=80'
  }, { live: isAdmin })
  const [showEdit, setShowEdit] = useState(false)
  const [newUrl, setNewUrl] = useState('')

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">

      {/* ── Background image with filters ── */}
      <div className="absolute inset-0">
        <img
          src={heroSettings.image}
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
              Rotaract Club — R.I.Dist 3191
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
            <Button onClick={() => setCurrentPage('joinForm')}>
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

      {/* ── Admin: Edit Hero Image ── */}
      {isAdmin && (
        <div className="absolute top-20 right-6 z-20">
          <button
            onClick={() => { setNewUrl(heroSettings.image); setShowEdit(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white text-xs font-semibold border border-white/20 hover:bg-black/60 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Change Hero Image
          </button>
        </div>
      )}

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {showEdit && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEdit(false)} />
            <motion.div
              className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            >
              <h3 className="font-display font-bold text-lg mb-1">Change Hero Image</h3>
              <p className="text-sm text-gray-400 mb-4">Paste a WordPress image URL (1920×1080px recommended)</p>
              <input
                className="w-full px-4 py-2.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 mb-3"
                placeholder="https://your-wordpress.com/image.jpg"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
              />
              {newUrl && (
                <div className="mb-4 rounded-lg overflow-hidden h-32">
                  <img src={newUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEdit(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => { await saveHero({ image: newUrl }); setShowEdit(false) }}
                  disabled={!newUrl}
                  className="flex-1 py-2.5 rounded-xl bg-rotary-blue text-white text-sm font-semibold disabled:opacity-50 hover:bg-rotary-blue/90 transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
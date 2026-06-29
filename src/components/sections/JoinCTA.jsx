import { motion } from 'framer-motion'
import Button from '../ui/Button'
import ParticleField from '../ui/ParticleField'

export default function JoinCTA({ setCurrentPage }) {
  return (
    <section id="join" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-rotary-navy via-rotary-blue-dark to-rotary-navy" />

      <motion.div
        className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-rotary-blue/30 rounded-full blur-3xl"
        animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 15, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rotary-gold/20 rounded-full blur-3xl"
        animate={{ x: [0, -80, 0], y: [0, 60, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 12, repeat: Infinity }}
      />

      <ParticleField count={40} />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge — white text instead of white/80 */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm"
            initial={{ scale: 0.8 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white text-sm font-medium">Open for members aged 18–35</span>
          </motion.div>

          <h2 className="heading-lg text-white mb-6">
            Ready to Make a{' '}
            <span className="text-rotary-gold">Difference</span>?
          </h2>

          {/* Body copy — white/70 → white/85 */}
          <p className="text-xl text-white/85 mb-12 max-w-2xl mx-auto">
            Join a community of young changemakers and be part of something bigger than yourself. Your journey of service starts here.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              className="!bg-rotary-gold !text-rotary-navy hover:!bg-rotary-gold-light"
              onClick={() => setCurrentPage('contact')}
            >
              Become a Member
            </Button>

          </div>

          {/* Benefit pills — white/80 → white */}
          <motion.div
            className="grid sm:grid-cols-3 gap-6 mt-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            {[
              { icon: '🌐', text: 'Global Network' },
              { icon: '🎯', text: 'Meaningful Impact' },
              { icon: '🤝', text: 'Lifelong Friendships' }
            ].map((benefit) => (
              <div
                key={benefit.text}
                className="flex items-center justify-center gap-3 text-white"
              >
                <span className="text-2xl">{benefit.icon}</span>
                <span className="font-medium">{benefit.text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
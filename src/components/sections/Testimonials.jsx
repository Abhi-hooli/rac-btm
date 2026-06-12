import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const testimonials = [
  {
    quote: "Joining Rotaract BTM was the best decision of my college years. The friendships, the projects, the growth — it's been life-changing.",
    author: '[Member Name]',
    role: 'Member since 2022',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80'
  },
  {
    quote: "The Vidya Daan program gave me the confidence and skills to pursue my dream career. I'm forever grateful to the Rotaract BTM team.",
    author: '[Beneficiary Name]',
    role: 'Program Beneficiary',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'
  },
  {
    quote: "What sets Rotaract BTM apart is the energy and passion. Every member brings something unique, and together we achieve amazing things.",
    author: '[Past President Name]',
    role: 'Immediate Past President',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80'
  }
]

export default function Testimonials() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="section-padding bg-gray-50 dark:bg-rotary-navy-light overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-rotary-gold font-semibold mb-4 block">Testimonials</span>
          <h2 className="heading-lg mb-16">
            Voices of{' '}
            <span className="text-gradient">Change</span>
          </h2>
        </motion.div>

        <div className="relative min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5 }}
              className="glass dark:glass-dark rounded-3xl p-8 md:p-12"
            >
              <svg className="w-12 h-12 mx-auto mb-6 text-rotary-gold/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>

              <p className="text-xl md:text-2xl font-light text-gray-700 dark:text-white/90 mb-8 leading-relaxed">
                "{testimonials[current].quote}"
              </p>

              <div className="flex items-center justify-center gap-4">
                <img
                  src={testimonials[current].image}
                  alt={testimonials[current].author}
                  className="w-14 h-14 rounded-full object-cover border-2 border-rotary-gold"
                />
                <div className="text-left">
                  <p className="font-display font-semibold">{testimonials[current].author}</p>
                  <p className="text-sm text-gray-500 dark:text-white/60">{testimonials[current].role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-3 mt-8">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i === current 
                  ? 'bg-rotary-gold w-8' 
                  : 'bg-gray-300 dark:bg-white/30 hover:bg-rotary-blue/50'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
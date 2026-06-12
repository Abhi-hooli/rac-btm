import { useState } from 'react'
import { motion } from 'framer-motion'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }
})

const CONTACT_CARDS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    label: 'Email Us',
    value: 'rotaractbtm@gmail.com',
    href: 'mailto:rotaractbtm@gmail.com',
    color: 'text-rotary-blue',
    bg: 'bg-rotary-blue/10 dark:bg-rotary-blue/10',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: 'Location',
    value: 'BTM Layout, Bengaluru, Karnataka',
    href: 'https://maps.google.com/?q=BTM+Layout+Bengaluru',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    label: 'Instagram',
    value: '@rotaractbtm',
    href: 'https://instagram.com/rotaractbtm',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    label: 'Facebook',
    value: 'Rotaract BTM',
    href: 'https://facebook.com/rotaractbtm',
    color: 'text-blue-600',
    bg: 'bg-blue-600/10',
  },
]

export default function ContactPage({ onBack }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) return
    setStatus('sending')

    // Replace with your actual form submission endpoint (e.g. EmailJS, Formspree, Firebase)
    try {
      await new Promise(r => setTimeout(r, 1500)) // simulate API call
      setStatus('sent')
      setForm({ name: '', phone: '', email: '', subject: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  const iClass = 'w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-rotary-navy-light border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 focus:border-rotary-blue/50 text-sm transition-all'

  return (
    <div className="min-h-screen pt-20">
      <div className="section-padding max-w-7xl mx-auto">

        {/* Header */}
        <motion.div className="flex items-center gap-4 mb-12" {...fadeUp(0)}>
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="heading-lg">Get in <span className="text-gradient">Touch</span></h1>
            <p className="text-rotary-slate dark:text-white/50 text-sm mt-0.5">
              We'd love to hear from you — reach out anytime
            </p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-10">

          {/* Left: Contact Form */}
          <motion.div {...fadeUp(0.1)}>
            <div className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/5 p-8 shadow-sm">
              <h2 className="font-display font-bold text-xl mb-1">Send us a message</h2>
              <p className="text-sm text-rotary-slate dark:text-white/40 mb-7">
                Fill in the form and we'll get back to you within 24 hours.
              </p>

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">
                      Your Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      className={iClass}
                      placeholder="Rtr. John Doe"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      className={iClass}
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    className={iClass}
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">
                    Subject
                  </label>
                  <select
                    className={`${iClass} cursor-pointer`}
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                  >
                    <option value="" disabled>Select a subject...</option>
                    <option value="Join the Club">Join the Club</option>
                    <option value="Donate">Donate</option>
                    <option value="Volunteer">Volunteer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    className={`${iClass} resize-none`}
                    rows={5}
                    placeholder="Tell us how we can help..."
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                  />
                </div>

                {/* Submit */}
                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={handleSubmit}
                    disabled={status === 'sending' || status === 'sent' || !form.name || !form.phone || !form.message}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl bg-rotary-blue text-white font-semibold text-sm hover:bg-rotary-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-rotary-blue/20"
                  >
                    {status === 'sending' ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </>
                    ) : status === 'sent' ? (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Sent!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send Message
                      </>
                    )}
                  </button>

                  {status === 'sent' && (
                    <motion.p
                      className="text-sm text-green-600 dark:text-green-400 font-medium"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      Thanks! We'll get back to you soon.
                    </motion.p>
                  )}
                  {status === 'error' && (
                    <motion.p
                      className="text-sm text-red-500 font-medium"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      Something went wrong. Please try again.
                    </motion.p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Info Cards + Map */}
          <div className="space-y-5">

            {/* Contact cards */}
            <motion.div className="grid grid-cols-1 gap-3" {...fadeUp(0.2)}>
              {CONTACT_CARDS.map((card, i) => (
                <motion.a
                  key={i}
                  href={card.href}
                  target={card.href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-white dark:bg-rotary-navy-light rounded-xl border border-gray-100 dark:border-white/5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.bg} ${card.color}`}>
                    {card.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-rotary-slate dark:text-white/40 mb-0.5">
                      {card.label}
                    </p>
                    <p className={`text-sm font-semibold truncate ${card.color} group-hover:underline`}>
                      {card.value}
                    </p>
                  </div>
                  <svg className={`w-4 h-4 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${card.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.a>
              ))}
            </motion.div>

            {/* Map embed */}
            <motion.div
              className="rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 shadow-sm"
              {...fadeUp(0.45)}
            >
              <div className="bg-white dark:bg-rotary-navy-light px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-semibold">BTM Layout, Bengaluru</span>
              </div>
              <iframe
                title="Rotaract BTM Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15554.53!2d77.6101!3d12.9165!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1529a65ef565%3A0x1b9d9bc9f3c6c9c6!2sBTM%20Layout%2C%20Bengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1680000000000"
                width="100%"
                height="220"
                style={{ border: 0, display: 'block' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </motion.div>

            {/* Club hours */}
            <motion.div
              className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/5 p-5"
              {...fadeUp(0.5)}
            >
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-rotary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-display font-semibold text-sm">Meeting Schedule</h3>
              </div>
              <div className="space-y-2">
                {[
                  { day: 'Weekly Meetings', time: 'Every Sunday, 10:00 AM', highlight: true },
                  { day: 'Board Meetings', time: '1st Saturday of the month', highlight: false },
                  { day: 'Response Time', time: 'Within 24 hours', highlight: false },
                ].map((row, i) => (
                  <div key={i} className={`flex items-center justify-between py-2 px-3 rounded-lg ${row.highlight ? 'bg-rotary-blue/5 dark:bg-rotary-blue/10' : ''}`}>
                    <span className="text-sm text-rotary-slate dark:text-white/50">{row.day}</span>
                    <span className={`text-sm font-semibold ${row.highlight ? 'text-rotary-blue' : 'text-rotary-charcoal dark:text-white'}`}>{row.time}</span>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  )
}
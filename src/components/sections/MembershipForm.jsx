import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { backupToSheet } from '../../utils/trash'
import { sendWhatsAppNotification } from '../../utils/whatsapp'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }
})

const AREAS_OF_INTEREST = [
  'Community Service', 'Professional Development', 'Club Service',
  'International Service', 'Public Image', 'Fundraising',
  'DEI (Diversity, Equity, & Inclusion)'
]

const HEARD_FROM_OPTIONS = [
  'Instagram', 'Friend / Referral', 'Rotary / Rotaract member', 'Event', 'Other'
]

const EMPTY_FORM = {
  name: '', email: '', phone: '', age: '', occupation: '',
  interests: [], heardFrom: '', reason: '', honeypot: ''
}

export default function MembershipForm({ onBack }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  // Prefetch the Firestore SDK quietly in the background as soon as the form
  // opens, so it's already warm by the time someone finishes filling it in
  // and clicks Submit — avoids a multi-hundred-kB download blocking the
  // submit click itself.
  useEffect(() => {
    import('../../firebase').then(({ loadFirestore }) => loadFirestore()).catch(() => {})
  }, [])

  const toggleInterest = (interest) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter(i => i !== interest)
        : [...f.interests, interest]
    }))
  }

  const isValid = form.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && form.phone.trim()

  const handleSubmit = async () => {
    if (form.honeypot) return // Bot detected — silently ignore
    if (!isValid) return
    setStatus('sending')
    try {
      const { loadFirestore } = await import('../../firebase')
      const { mod, db } = await loadFirestore()
      const record = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        age: form.age ? parseInt(form.age) : null,
        occupation: form.occupation.trim(),
        interests: form.interests,
        heardFrom: form.heardFrom,
        reason: form.reason.trim(),
        status: 'new',
      }
      const docRef = await mod.addDoc(mod.collection(db, 'membershipApplications'), {
        ...record,
        submittedAt: mod.serverTimestamp(),
      })
      backupToSheet('membershipApplications', docRef.id, 'create', record, 'public form')
      sendWhatsAppNotification(`New membership application: ${record.name} (${record.email}, ${record.phone})`)
      setForm(EMPTY_FORM)
      setStatus('sent')
    } catch (err) {
      console.error('Membership application error:', err)
      setStatus('error')
    }
  }

  const iClass = 'w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-rotary-navy-light border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 focus:border-rotary-blue/50 text-sm transition-all'
  const labelClass = 'block text-xs font-semibold text-rotary-slate dark:text-white/50 mb-1.5 uppercase tracking-wider'

  return (
    <div className="min-h-screen pt-5">
      <div className="section-padding max-w-3xl mx-auto">

        {/* Header */}
        <motion.div className="flex items-start gap-4 mb-12" {...fadeUp(0)}>
          <button onClick={onBack} className="p-2 -mt-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="heading-lg">Join <span className="text-gradient">Rotaract</span></h1>
            <p className="text-rotary-slate dark:text-white/50 text-sm mt-0.5">
              Tell us a bit about yourself — we'll be in touch soon
            </p>
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.1)}>
          {status === 'sent' ? (
            <div className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/5 p-10 shadow-sm text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-display font-bold text-xl mb-2">Thanks for applying!</h2>
              <p className="text-sm text-rotary-slate dark:text-white/50 max-w-sm mx-auto mb-6">
                We've received your membership application. We'll be in touch soon — keep an eye on your inbox.
              </p>
              <button onClick={onBack} className="px-6 py-2.5 rounded-xl bg-rotary-blue text-white font-semibold text-sm hover:bg-rotary-blue/90 transition-colors">
                Back to Home
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/5 p-8 shadow-sm">
              <h2 className="font-display font-bold text-xl mb-1">Membership Interest Form</h2>
              <p className="text-sm text-rotary-slate dark:text-white/40 mb-1">
                Rotaract welcomes young professionals and students aged 18–35.
              </p>
              <p className="text-sm text-rotary-slate dark:text-white/40 mb-7">
                Fill in the form below and a member of our team will reach out.
              </p>

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Full Name <span className="text-red-400">*</span></label>
                    <input className={iClass} placeholder="Your full name"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number <span className="text-red-400">*</span></label>
                    <input className={iClass} type="tel" placeholder="+91 98765 43210"
                      value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Email Address <span className="text-red-400">*</span></label>
                    <input className={iClass} type="email" placeholder="you@example.com"
                      value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>Age</label>
                    <input className={iClass} type="number" min="1" max="120" placeholder="e.g. 22"
                      value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Occupation / What you do</label>
                  <input className={iClass} placeholder="e.g. Student, Software Engineer..."
                    value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} />
                </div>

                <div>
                  <label className={labelClass}>Areas you're interested in</label>
                  <div className="flex flex-wrap gap-2">
                    {AREAS_OF_INTEREST.map(interest => {
                      const selected = form.interests.includes(interest)
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${selected
                            ? 'bg-rotary-blue text-white border-rotary-blue'
                            : 'bg-gray-50 dark:bg-white/5 text-rotary-slate dark:text-white/60 border-gray-200 dark:border-white/10 hover:border-rotary-blue/40'
                            }`}
                        >
                          {interest}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>How did you hear about us?</label>
                  <select className={`${iClass} cursor-pointer`}
                    value={form.heardFrom} onChange={e => setForm({ ...form, heardFrom: e.target.value })}>
                    <option value="" disabled>Select an option...</option>
                    {HEARD_FROM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Why do you want to join?</label>
                  <textarea className={`${iClass} resize-none`} rows={4}
                    placeholder="Tell us a little about what draws you to Rotaract..."
                    value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                </div>

                {/* Honeypot — hidden from real users, bots tend to fill every field */}
                <input type="text" name="website" value={form.honeypot} onChange={e => setForm({ ...form, honeypot: e.target.value })} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                <div className="flex items-center gap-4 pt-1">
                  <button onClick={handleSubmit}
                    disabled={status === 'sending' || !isValid}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl bg-rotary-blue text-white font-semibold text-sm hover:bg-rotary-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-rotary-blue/20">
                    {status === 'sending' ? (
                      <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Submitting...</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>Submit Application</>
                    )}
                  </button>

                  {status === 'error' && (
                    <motion.p className="text-sm text-red-500 font-medium"
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                      Something went wrong. Please try again.
                    </motion.p>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

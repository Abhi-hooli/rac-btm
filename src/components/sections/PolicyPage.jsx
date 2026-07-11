import { motion } from 'framer-motion'

const LAST_UPDATED = 'June 29, 2026'
const CONTACT_EMAIL = 'racbtm@gmail.com'
const SITE_URL = 'https://rotaract.btm.org.in'

const sections = [
  {
    title: '1. Who We Are',
    body: `Rotaract Club of Bengaluru BTM ("we", "our", "the Club") is a youth service organisation based in BTM Layout, Bengaluru, Karnataka, India. We operate under Rotary International District 3191 (RI Club ID 8826232) and are reachable at ${CONTACT_EMAIL}.\n\nThis Privacy Policy explains how we collect, use, and protect personal information you provide through our website (${SITE_URL}).`,
  },
  {
    title: '2. Data We Collect From You',
    body: 'We only collect personal data when you actively submit it through one of the forms below. We do not collect personal data from visitors who simply browse the site.',
    items: [
      { label: 'Newsletter subscription', detail: 'Your email address, collected when you subscribe via the footer form. Stored privately — visible only to club admins.', risk: 'private' },
      { label: 'Event RSVP', detail: 'Your name, email address, and group size when you RSVP for an event. Stored privately — used solely for event management.', risk: 'private' },
      { label: 'Contact form', detail: 'Your name, email address, and message when you submit the contact form. Stored privately — seen only by club admins responding to you.', risk: 'private' },
      { label: 'Usage analytics', detail: 'Anonymous visit data (pages visited, session duration, country) via Google Analytics 4. No name, email, or identifying information is collected. You cannot be identified from this data.', risk: 'low' },
    ],
  },
  {
    title: '3. Publicly Visible Content (No Personal Data)',
    body: 'Several sections of our website display content that is intentionally public — visible to anyone who visits. This content contains no personal data from visitors and carries minimal privacy risk:\n',
    items: [
      { label: 'Projects & CSR', detail: 'Club service projects and community initiatives. Public by design — no visitor data involved.', risk: 'public' },
      { label: 'Events & Calendar', detail: 'Upcoming and past events. Publicly listed; RSVP data is separate and private (see above).', risk: 'public' },
      { label: 'Blog & Newsletters', detail: 'Club updates and monthly newsletters published for public reading. No personal visitor data collected.', risk: 'public' },
      { label: 'Gallery', detail: 'Photos from club events. These are curated and published by club admins. If you appear in a photo and wish it removed, email us.', risk: 'public' },
      { label: 'Our Team / Leadership', detail: 'Names and roles of club members who have consented to be listed publicly on the website.', risk: 'public' },
    ],
  },
  {
    title: '4. How We Use Your Information',
    items: [
      { label: 'Email address', detail: 'To send our monthly newsletter and event updates. You can unsubscribe at any time by emailing us.' },
      { label: 'RSVP details', detail: 'To manage event attendance and send confirmation / reminder emails. Deleted after 12 months.' },
      { label: 'Contact messages', detail: 'To respond to your enquiry only. Not used for marketing.' },
      { label: 'Analytics data', detail: 'To understand how visitors use our website and improve content. Aggregated and anonymous — no individual is identifiable.' },
    ],
  },
  {
    title: '5. Data Storage & Security',
    body: `All personal data submitted through our forms is stored in Google Firebase Firestore — a cloud database product operated by Google LLC (USA). Firebase is not an independent company; it is fully owned and operated by Google. Your data therefore sits on Google's infrastructure and is subject to Google's security standards and privacy commitments (policies.google.com/privacy).\n\nAccess to your data within Firebase is restricted by security rules to authorised club administrators only. We use HTTPS for all connections and Firebase Authentication for admin login. We do not sell, rent, or share your personal data with any third party.`,
  },
  {
    title: '6. Third-Party Services & Data Flows',
    items: [
      { label: 'Google Firebase (Google LLC)', detail: 'Our database and admin authentication. Firebase is a Google product — your submitted data is stored on Google servers under Google\'s privacy policy. Low risk: access is admin-only.', risk: 'private' },
      { label: 'Google Analytics 4 (Google LLC)', detail: 'Anonymous website analytics. IP anonymisation is enabled. Google receives no name, email, or personal identifier from our site. Low risk: data is aggregated and anonymous.', risk: 'low' },
      { label: 'EmailJS', detail: 'Third-party email delivery service (emailjs.com). When we send event reminder emails, your email address is passed to EmailJS servers solely for that delivery and is not stored by them beyond transmission.', risk: 'private' },
      { label: 'Google Fonts (Google LLC)', detail: 'Font files are loaded from Google\'s servers when you visit the site. Google may log the IP address of the request. No personal data from our forms is shared. Minimal risk.', risk: 'low' },
    ],
  },
  {
    title: '7. Cookies',
    body: `We do not use our own cookies. Google Analytics uses cookies (_ga, _gid) to distinguish users and sessions. These are analytics-only cookies and do not track you across other websites for advertising. You can opt out of Google Analytics by installing the Google Analytics Opt-out Browser Add-on.`,
  },
  {
    title: '8. Your Rights (DPDP Act 2023)',
    body: `Under India\'s Digital Personal Data Protection Act 2023, you have the right to:\n\n• Access the personal data we hold about you\n• Correct inaccurate data\n• Request deletion of your data\n• Withdraw consent at any time\n\nTo exercise any of these rights, email us at ${CONTACT_EMAIL} with the subject line "Data Request". We will respond within 30 days.`,
  },
  {
    title: '9. Data Retention',
    body: `Subscriber emails are retained until you unsubscribe or request deletion. RSVP and contact form data is retained for up to 12 months for club records, then deleted. Analytics data is retained as per Google\'s default retention policy (14 months).`,
  },
  {
    title: '10. Children\'s Privacy',
    body: `Our website is intended for individuals aged 18 and above, consistent with Rotaract\'s membership criteria. We do not knowingly collect data from anyone under 18. If you believe a minor has submitted personal data, please contact us and we will delete it promptly.`,
  },
  {
    title: '11. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page will reflect any changes. Continued use of the website after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '12. Contact Us',
    body: `For any privacy-related questions or requests:\n\nRotaract Club of Bengaluru BTM\nEmail: ${CONTACT_EMAIL}\nWebsite: ${SITE_URL}`,
  },
]

export default function PrivacyPolicy({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-rotary-navy">

      {/* Header — pt-20 clears the fixed navbar */}
      <div className="bg-rotary-navy dark:bg-rotary-navy-light border-b border-white/10 pt-20">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-8 bg-rotary-gold rounded-full" />
              <span className="text-rotary-gold text-xs font-bold tracking-[0.2em] uppercase">Legal</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-2">
              Privacy Policy
            </h1>
            <p className="text-white/40 text-sm">Last updated: {LAST_UPDATED}</p>
          </motion.div>
        </div>
      </div>

      {/* Intro banner */}
      <div className="bg-rotary-blue/10 dark:bg-rotary-blue/5 border-b border-rotary-blue/20">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <p className="text-sm text-rotary-charcoal dark:text-white/60 leading-relaxed">
            We respect your privacy. This policy explains what personal data Rotaract Club of Bengaluru BTM collects, why we collect it, and how we keep it safe — in plain language, no legal jargon.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {sections.map((s, i) => (
          <motion.section
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <h2 className="text-lg font-display font-bold text-rotary-charcoal dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-white/10">
              {s.title}
            </h2>

            {s.body && (
              <p className="text-sm text-gray-600 dark:text-white/60 leading-relaxed whitespace-pre-line">
                {s.body}
              </p>
            )}

            {s.items && (
              <ul className="space-y-3 mt-3">
                {s.items.map(item => (
                  <li key={item.label} className="rounded-xl border border-gray-100 dark:border-white/8 p-3.5 flex gap-3 items-start">
                    {item.risk === 'public'  && <span className="mt-0.5 flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 tracking-wide">PUBLIC</span>}
                    {item.risk === 'low'     && <span className="mt-0.5 flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 tracking-wide">LOW RISK</span>}
                    {item.risk === 'private' && <span className="mt-0.5 flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 tracking-wide">PRIVATE</span>}
                    {!item.risk             && <div className="w-1.5 h-1.5 rounded-full bg-rotary-crimson mt-2 flex-shrink-0" />}
                    <div>
                      <span className="text-sm font-semibold text-rotary-charcoal dark:text-white">{item.label}: </span>
                      <span className="text-sm text-gray-600 dark:text-white/60">{item.detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        ))}

        {/* Contact card */}
        <div className="rounded-2xl bg-rotary-navy dark:bg-rotary-navy-light p-6 text-center">
          <p className="text-white/50 text-sm mb-2">Questions about this policy?</p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Privacy%20Policy%20Enquiry`}
            className="text-rotary-gold font-semibold text-sm hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-white/20 pb-4">
          © {new Date().getFullYear()} Rotaract Club of Bengaluru BTM · Rotary International District 3191
        </p>
      </div>
    </div>
  )
}

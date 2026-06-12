import { motion } from 'framer-motion'

const footerLinks = {
  'Quick Links': [
    { label: 'About Us', page: 'home', section: 'about' },
    { label: 'Our Projects', page: 'allProjects' },
    {
      label: 'Events',
      action: (goToPage) => {
        goToPage('home')
        setTimeout(() => {
          document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })
        }, 150)
      }
    },
    { label: 'Join Rotaract', page: 'contact' },
  ],
  'Connect': [
    { label: 'Contact', page: 'contact' },
    { label: 'Documents', page: 'documents' },
    { label: 'Calendar', page: 'calendar' },
    { label: 'Volunteer', page: 'contact' },
  ]
}

const socialLinks = [
  { name: 'Instagram', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
  { name: 'LinkedIn', icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
  { name: 'Facebook', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
]

const fourWayTest = [
  'Is it the TRUTH?',
  'Is it FAIR to all concerned?',
  'Will it build GOODWILL and better friendships?',
  'Will it be BENEFICIAL to all concerned?',
]

export default function Footer({ goToPage }) {
  return (
    <footer className="bg-rotary-navy text-white">
      <div className="max-w-7xl mx-auto section-padding">

        {/* ── Main links grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="lg:col-span-2">
            <div className="flex items-center mb-5">
              <div className="w-36 h-12 flex-shrink-0">
                <img
                  src="/rotaract-logo.png"
                  alt="Rotaract Bengaluru BTM"
                  className="w-full h-full object-contain object-left"
                  style={{ mixBlendMode: 'screen' }}
                />
              </div>
            </div>
            <p className="text-white/50 text-sm mb-6 max-w-sm leading-relaxed">
              Young professionals and students driving change through service, leadership, and fellowship in Bengaluru. Part of Rotary International District 3191.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-rotary-blue transition-colors"
              />
              <button className="px-5 py-2.5 bg-rotary-gold text-rotary-navy font-semibold text-sm rounded-lg hover:bg-rotary-gold-light transition-colors">
                Subscribe
              </button>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-white/70 mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <button
                      onClick={() => {
                        if (link.action) {
                          link.action(goToPage)
                        } else {
                          goToPage(link.page)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                      }}
                      className="text-white/40 hover:text-rotary-gold text-sm transition-colors text-left"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Four-Way Test ── */}
        <div className="h-px bg-white/10 mb-5" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0 mb-5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rotary-gold whitespace-nowrap sm:mr-4">
            Four-Way Test
          </span>
          <span className="hidden sm:block w-px h-3.5 bg-white/15 sm:mr-4 flex-shrink-0" />
          <div className="flex flex-wrap items-center gap-y-1">
            {fourWayTest.map((q, i) => (
              <span key={i} className="flex items-center">
                <span className="text-white/35 text-xs">{q}</span>
                {i < fourWayTest.length - 1 && (
                  <span className="text-rotary-gold/30 text-xs mx-2.5">·</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* ── Copyright + Social ── */}
        <div className="h-px bg-white/10 mb-5" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} Rotaract Bengaluru BTM. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {socialLinks.map(social => (
              <a
                key={social.name}
                href="#"
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-rotary-blue hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d={social.icon} />
                </svg>
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  )
}
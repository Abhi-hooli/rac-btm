import { useState, useEffect, lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import IntroAnimation from './components/intro/IntroAnimation'
import Navbar from './components/layout/Navbar'
import ScrollProgress from './components/ui/ScrollProgress'
import { subscribeAuthState, firebaseAdminLogout } from './firebase'
import { logAction } from './utils/auditLog'
import { useSEO } from './hooks/useSEO'
import MaintenancePage from './components/sections/MaintenancePage'
import { useDocument } from './hooks/useFirestore'



const Blog = lazy(() => import('./components/sections/Blog'))
const Hero = lazy(() => import('./components/sections/Hero'))
const About = lazy(() => import('./components/sections/About'))
const Impact = lazy(() => import('./components/sections/Impact'))
const Projects = lazy(() => import('./components/sections/Projects'))
const AllProjects = lazy(() => import('./components/sections/AllProjects'))
const Events = lazy(() => import('./components/sections/Events'))
const Leadership = lazy(() => import('./components/sections/Leadership'))
const OurTeam = lazy(() => import('./components/sections/OurTeam'))
const CalendarPage = lazy(() => import('./components/sections/CalendarPage'))
const Testimonials = lazy(() => import('./components/sections/Testimonials'))
const JoinCTA = lazy(() => import('./components/sections/JoinCTA'))
const TreasurerDashboard = lazy(() => import('./components/sections/TreasurerDashboard'))
const AttendanceTracker = lazy(() => import('./components/sections/AttendanceTracker'))
const MomTracker = lazy(() => import('./components/sections/MomTracker'))
const Footer = lazy(() => import('./components/layout/Footer'))
const ClubAnalyticsDashboard = lazy(() => import('./components/sections/ClubAnalyticsDashboard'))
const ClubDocuments = lazy(() => import('./components/sections/ClubDocuments'))
const ContactPage = lazy(() => import('./components/sections/ContactPage'))
const EventRsvpAdmin = lazy(() => import('./components/sections/EventRsvpAdmin'))
const ArchivesPage = lazy(() => import('./components/sections/ArchivesPage'))
const NewsletterGenerator = lazy(() => import('./components/sections/NewsletterGenerator'))
const Gallery = lazy(() => import('./components/sections/Gallery'))
const GalleryPreview = lazy(() => import('./components/sections/GalleryPreview'))
const PrivacyPolicy = lazy(() => import('./components/sections/PolicyPage'))
const LinkRedirects = lazy(() => import('./components/sections/LinkRedirects'))
const UserManagement = lazy(() => import('./components/sections/UserManagement'))
const RedirectResolver = lazy(() => import('./components/sections/RedirectResolver'))
const MembershipForm = lazy(() => import('./components/sections/MembershipForm'))
const MembershipAdmin = lazy(() => import('./components/sections/MembershipAdmin'))


const SectionLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-rotary-blue/30 border-t-rotary-blue rounded-full animate-spin" />
  </div>
)

// Search engines and link-preview crawlers must always be able to read the
// real site — Maintenance Mode is a human-facing "we're working on it"
// splash, not something that should also take the site out of Google's
// index for however long it's on. Known bot user agents skip both the
// intro splash and the maintenance gate entirely.
const BOT_UA_PATTERN = /bot|crawl|spider|slurp|googlebot|bingbot|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|pinterest|ahrefsbot|semrushbot|mj12bot|dotbot|embedly|quora link preview|w3c_validator|redditbot|applebot/i
const IS_BOT = typeof navigator !== 'undefined' && BOT_UA_PATTERN.test(navigator.userAgent || '')

export default function App() {
  const [showIntro, setShowIntro] = useState(
    !IS_BOT && !window.location.pathname.startsWith('/r/') && !sessionStorage.getItem('introShown')
  )
  const [isDark, setIsDark] = useState(false)
const [isAdmin, setIsAdmin] = useState(() => !!sessionStorage.getItem('adminPerms'))
  const [permissions, setPermissions] = useState(() => {
    const saved = sessionStorage.getItem('adminPerms')
    return saved ? JSON.parse(saved) : null
  })
  const [currentPage, setCurrentPage] = useState('home')
  const [momLinkedMeeting, setMomLinkedMeeting] = useState(null)
  const [redirectSlug, setRedirectSlug] = useState(null)
  const { data: siteSettings, save: saveSiteSettings } = useDocument('settings', 'site', { maintenanceMode: false }, { live: isAdmin })

  // Section-level edit access — a logged-in officer only sees edit controls
  // for the sections their role was granted, Super Admin always sees all.
  const canEditHomepage = isAdmin && (permissions?.isSuperAdmin || permissions?.homepage)
  const canEditEvents = isAdmin && (permissions?.isSuperAdmin || permissions?.events)
  const canEditProjects = isAdmin && (permissions?.isSuperAdmin || permissions?.projects)

  useSEO(currentPage)

  const toggleMaintenance = async (resumeAt = null) => {
    const next = !siteSettings.maintenanceMode
    await saveSiteSettings({
      ...siteSettings,
      maintenanceMode: next,
      maintenanceEndTime: next ? (resumeAt || null) : null,
    })
    logAction({
      admin: permissions?.email || 'admin',
      action: next ? 'MAINTENANCE_ON' : 'MAINTENANCE_OFF',
      module: 'Settings',
      item: 'Site',
      details: `Maintenance mode ${next ? 'enabled' : 'disabled'}${resumeAt ? ` — resume at ${new Date(resumeAt).toLocaleString('en-IN')}` : ''}`,
    })
  }

useEffect(() => {
    let unsub
    let cancelled = false
    subscribeAuthState((user) => {
      if (user) {
        const saved = sessionStorage.getItem('adminPerms')
        if (saved) {
          setIsAdmin(true)
          setPermissions(JSON.parse(saved))
        }
      } else {
        setIsAdmin(false)
        setPermissions(null)
        sessionStorage.removeItem('adminPerms')
        sessionStorage.removeItem('adminLoginTime')
      }
    }).then(u => { if (cancelled) u(); else unsub = u })
    return () => { cancelled = true; if (unsub) unsub() }
  }, [])

  // ── Auto-logout after 30 minutes ──
  useEffect(() => {
    if (!isAdmin) return
    const loginTime = sessionStorage.getItem('adminLoginTime')
    if (!loginTime) {
      sessionStorage.setItem('adminLoginTime', Date.now().toString())
      return
    }
    const elapsed = Date.now() - parseInt(loginTime)
    const sessionLimit = 0.5 * 60 * 60 * 1000
    if (elapsed >= sessionLimit) {
      // Session expired — force logout
      firebaseAdminLogout()
      setIsAdmin(false)
      setPermissions(null)
      sessionStorage.clear()
      goToPage('home')
      return
    }
    // Set timer for remaining time
    const remaining = sessionLimit - elapsed
    const timer = setTimeout(() => {
      firebaseAdminLogout()
      setIsAdmin(false)
      setPermissions(null)
      sessionStorage.clear()
      goToPage('home')
      alert('Your admin session has expired after 30 minutes. Please log in again.')
    }, remaining)
    return () => clearTimeout(timer)
  }, [isAdmin])
  useEffect(() => {
    // Force light mode
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('theme')

    // Route on initial load + back/forward navigation
    const routeFromPath = () => {
      const path = window.location.pathname
      if (path.startsWith('/r/')) {
        setRedirectSlug(path.slice(3))
        setCurrentPage('redirect')
        return
      }
      const pathMap = {
        '/': 'home',
        '/projects': 'allProjects',
        '/team': 'ourTeam',
        '/calendar': 'calendar',
        '/archives': 'archives',
        '/treasurer': 'treasurer',
        '/attendance': 'attendance',
        '/mom': 'mom',
        '/rsvp-admin': 'rsvpAdmin',
        '/analytics': 'analytics',
        '/documents': 'documents',
        '/contact': 'contact',
        '/users': 'users',
        '/blog': 'blog',
        '/newsletter': 'newsletter',
        '/gallery': 'gallery',
        '/privacy': 'privacy',
        '/link-redirects': 'linkRedirects',
        '/join': 'joinForm',
        '/membership-admin': 'membershipAdmin',
      }
      const page = pathMap[path]
      if (page) setCurrentPage(page)
    }
    routeFromPath()
    window.addEventListener('popstate', routeFromPath)
    return () => window.removeEventListener('popstate', routeFromPath)
  }, [])

  const goToPage = (page) => {
    setCurrentPage(page)

    const routes = {
      home: '/',
      allProjects: '/projects',
      ourTeam: '/team',
      calendar: '/calendar',
      archives: '/archives',
      treasurer: '/treasurer',
      attendance: '/attendance',
      mom: '/mom',
      rsvpAdmin: '/rsvp-admin',
      analytics: '/analytics',
      documents: '/documents',
      contact: '/contact',
      users: '/users',
      blog: '/blog',
      newsletter: '/newsletter',
      gallery: '/gallery',
      privacy: '/privacy',
      linkRedirects: '/link-redirects',
      joinForm: '/join',
      membershipAdmin: '/membership-admin',
    }

    window.history.pushState({}, '', routes[page] || '/')

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {showIntro && (
          <IntroAnimation
            onComplete={() => { sessionStorage.setItem('introShown', '1'); setShowIntro(false) }}
            onSkip={() => { sessionStorage.setItem('introShown', '1'); setShowIntro(false) }}
          />
        )}
      </AnimatePresence>

      {!showIntro && currentPage === 'redirect' && (
        <Suspense fallback={<SectionLoader />}>
          <RedirectResolver slug={redirectSlug} onBack={() => goToPage('home')} />
        </Suspense>
      )}

      {!showIntro && currentPage !== 'redirect' && currentPage !== 'joinForm' && siteSettings.maintenanceMode && !isAdmin && !IS_BOT && (
        <MaintenancePage resumeAt={siteSettings.maintenanceEndTime || null} onLogin={(perms) => {
          setIsAdmin(true)
          setPermissions(perms)
          sessionStorage.setItem('adminPerms', JSON.stringify(perms))
          sessionStorage.setItem('adminLoginTime', Date.now().toString())
          logAction({
            admin:   perms?.email || 'admin',
            action:  'LOGIN',
            module:  'Auth',
            item:    'Admin Session',
            details: `Logged in via maintenance page at ${new Date().toLocaleString('en-IN')}`,
          })
        }} />
      )}

      {!showIntro && currentPage !== 'redirect' && (!siteSettings.maintenanceMode || isAdmin || IS_BOT || currentPage === 'joinForm') && (
        <>
          <ScrollProgress />
          <Navbar
            isDark={isDark}
            isAdmin={isAdmin}
            permissions={permissions}
            currentPage={currentPage}
            maintenanceMode={siteSettings.maintenanceMode}
            onToggleMaintenance={toggleMaintenance}
            onLogin={(perms) => {
              setIsAdmin(true)
              setPermissions(perms)
              sessionStorage.setItem('adminPerms', JSON.stringify(perms))
              sessionStorage.setItem('adminLoginTime', Date.now().toString())
              logAction({
                admin:   perms?.email || 'admin',
                action:  'LOGIN',
                module:  'Auth',
                item:    'Admin Session',
                details: `Logged in at ${new Date().toLocaleString('en-IN')}`,
              })
            }}
            onLogout={async () => {
              logAction({
                admin:   permissions?.email || 'admin',
                action:  'LOGOUT',
                module:  'Auth',
                item:    'Admin Session',
                details: `Logged out at ${new Date().toLocaleString('en-IN')}`,
              })
              await firebaseAdminLogout()
              setIsAdmin(false)
              setPermissions(null)
              sessionStorage.removeItem('adminPerms')
              sessionStorage.removeItem('adminLoginTime')
            }}
            onLogoClick={() => goToPage('home')}
            onTreasurer={() => goToPage('treasurer')}
            onAnalytics={() => goToPage('analytics')}
            onAttendance={() => goToPage('attendance')}
            onCalendar={() => goToPage('calendar')}
            onDocuments={() => goToPage('documents')}
            onArchives={() => goToPage('archives')}
            onContact={() => goToPage('contact')}
            onMom={() => goToPage('mom')}
            onRsvpAdmin={() => goToPage('rsvpAdmin')}
            onBlog={() => goToPage('blog')}
            onNewsletter={() => goToPage('newsletter')}
            onUserManagement={() => goToPage('users')}
            onLinkRedirects={() => goToPage('linkRedirects')}
            onMembershipAdmin={() => goToPage('membershipAdmin')}
            onJoin={() => goToPage('joinForm')}
          />

          <main>
            <Suspense fallback={<SectionLoader />}>

              {/* ── Home ── */}
              {currentPage === 'home' && (
                <>
                  <Hero setCurrentPage={goToPage} isAdmin={canEditHomepage} />
                  <About isAdmin={canEditHomepage} setCurrentPage={goToPage} />
                  <Impact isAdmin={canEditHomepage} />
                  <Projects
                    onViewAll={() => goToPage('allProjects')}
                  />
                  <Events isAdmin={canEditEvents} setCurrentPage={goToPage} />
                  <Leadership onViewTeam={() => goToPage('ourTeam')} onViewArchives={() => goToPage('archives')} isAdmin={canEditHomepage} />
                  <GalleryPreview onViewAll={() => goToPage('gallery')} />
                  <Testimonials isAdmin={canEditHomepage} />
                  <JoinCTA setCurrentPage={goToPage} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── All Projects ── */}
              {currentPage === 'allProjects' && (
                <>
                  <AllProjects isAdmin={canEditProjects} onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── Our Team ── */}
              {currentPage === 'ourTeam' && (
                <>
                  <OurTeam isAdmin={canEditHomepage} onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── Calendar ── */}
              {currentPage === 'calendar' && (
                <>
                  <CalendarPage isAdmin={canEditEvents} onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── Archives ── */}
              {currentPage === 'archives' && (
                <>
                  <ArchivesPage
                    isAdmin={isAdmin}
                    onBack={() => goToPage('home')}
                  />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── Treasurer ── */}
              {currentPage === 'treasurer' && !permissions?.treasurer && goToPage('home')}
              {currentPage === 'treasurer' && permissions?.treasurer && (
                <>
                  <TreasurerDashboard isAdmin={isAdmin} onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {currentPage === 'attendance' && !permissions?.attendance && goToPage('home')}
              {/* ── Attendance Tracker ── */}
              {currentPage === 'attendance' && permissions?.attendance && (
                <>
                  <AttendanceTracker
                    isAdmin={isAdmin}
                    onBack={() => goToPage('home')}
                    onCreateMom={(meeting) => {
                      setMomLinkedMeeting(meeting)
                      goToPage('mom')
                    }}
                  />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {currentPage === 'mom' && !permissions?.mom && goToPage('home')}
              {/* ── MoM Tracker ── */}
              {currentPage === 'mom' && permissions?.mom && (
                <>
                  <MomTracker
                    isAdmin={isAdmin}
                    onBack={() => { setMomLinkedMeeting(null); goToPage('home') }}
                    linkedMeeting={momLinkedMeeting}
                  />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── Contact ── */}
              {currentPage === 'contact' && (
                <>
                  <ContactPage onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── Join / Membership Application ── */}
              {currentPage === 'joinForm' && (
                <>
                  <MembershipForm onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {currentPage === 'analytics' && !permissions?.analytics && goToPage('home')}
              {/* ── Analytics ── */}
              {currentPage === 'analytics' && permissions?.analytics && (
                <>
                  <ClubAnalyticsDashboard
                    isAdmin={isAdmin}
                    onBack={() => goToPage('home')}
                  />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── Documents ── */}
              {currentPage === 'documents' && (
                <>
                  <ClubDocuments
                    isAdmin={isAdmin}
                    onBack={() => goToPage('home')}
                  />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {currentPage === 'users' && !permissions?.userManagement && goToPage('home')}
              {/* ── User Management ── */}
              {currentPage === 'users' && permissions?.userManagement && (
                <>
                  <UserManagement onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {currentPage === 'rsvpAdmin' && !permissions?.rsvp && goToPage('home')}
              {/* ── RSVP Admin ── */}
              {currentPage === 'rsvpAdmin' && permissions?.rsvp && (
                <>
                  <EventRsvpAdmin isAdmin={isAdmin} onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── Blog ── */}
              {currentPage === 'blog' && (
                <>
                  <Blog isAdmin={isAdmin} isSuperAdmin={!!permissions?.isSuperAdmin} onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── Gallery ── */}
              {currentPage === 'gallery' && (
                <>
                  <Gallery isAdmin={isAdmin} permissions={permissions} onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {currentPage === 'newsletter' && !isAdmin && goToPage('home')}
              {/* ── News Letter ── */}
              {currentPage === 'newsletter' && isAdmin && (
                <>
                  <NewsletterGenerator isAdmin={isAdmin} onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {currentPage === 'linkRedirects' && !permissions?.linkRedirects && goToPage('home')}
              {/* ── Link Redirects ── */}
              {currentPage === 'linkRedirects' && permissions?.linkRedirects && (
                <>
                  <LinkRedirects onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {currentPage === 'membershipAdmin' && !permissions?.membership && goToPage('home')}
              {/* ── Membership Applications ── */}
              {currentPage === 'membershipAdmin' && permissions?.membership && (
                <>
                  <MembershipAdmin isAdmin={isAdmin} onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── Privacy Policy ── */}
              {currentPage === 'privacy' && (
                <>
                  <PrivacyPolicy onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

            </Suspense>
          </main>
        </>
      )}
    </>
  )
}
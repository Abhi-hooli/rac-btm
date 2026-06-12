import { useState, useEffect, lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import IntroAnimation from './components/intro/IntroAnimation'
import Navbar from './components/layout/Navbar'
import ScrollProgress from './components/ui/ScrollProgress'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminLogin from "./components/ui/AdminLogin";
import UserManagement from "./components/sections/UserManagement";

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


const SectionLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-rotary-blue/30 border-t-rotary-blue rounded-full animate-spin" />
  </div>
)

export default function App() {
  const [showIntro, setShowIntro] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('isAdmin') === 'true')
  const [permissions, setPermissions] = useState(() => {
    const saved = sessionStorage.getItem('adminPerms')
    return saved ? JSON.parse(saved) : null
  })
  const [currentPage, setCurrentPage] = useState('home')
  const [momLinkedMeeting, setMomLinkedMeeting] = useState(null)

  useEffect(() => {
    // Force light mode
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('theme')

    // Route on initial load + back/forward navigation
    const routeFromPath = () => {
      const path = window.location.pathname
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
        '/users': 'users'
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
      users: '/users'
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
            onComplete={() => setShowIntro(false)}
            onSkip={() => setShowIntro(false)}
          />
        )}
      </AnimatePresence>

      {!showIntro && (
        <>
          <ScrollProgress />
          <Navbar
            isDark={isDark}
            isAdmin={isAdmin}
            permissions={permissions}
            currentPage={currentPage}
            onLogin={(perms) => {
              setIsAdmin(true)
              setPermissions(perms)
              sessionStorage.setItem('adminPerms', JSON.stringify(perms))
            }}
            onLogout={() => {
              setIsAdmin(false)
              setPermissions(null)
              sessionStorage.removeItem('adminPerms')
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
            onUserManagement={() => goToPage('users')}
          />

          <main>
            <Suspense fallback={<SectionLoader />}>

              {/* ── Home ── */}
              {currentPage === 'home' && (
                <>
                  <Hero setCurrentPage={goToPage} />
                  <About />
                  <Impact />
                  <Projects
                    onViewAll={() => goToPage('allProjects')}
                    onViewArchives={() => goToPage('archives')}
                  />
                  <Events isAdmin={isAdmin} />
                  <Leadership onViewTeam={() => goToPage('ourTeam')} isAdmin={isAdmin} />
                  <Testimonials />
                  <JoinCTA setCurrentPage={goToPage} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── All Projects ── */}
              {currentPage === 'allProjects' && (
                <>
                  <AllProjects isAdmin={isAdmin} onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── Our Team ── */}
              {currentPage === 'ourTeam' && (
                <>
                  <OurTeam isAdmin={isAdmin} onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── Calendar ── */}
              {currentPage === 'calendar' && (
                <>
                  <CalendarPage isAdmin={isAdmin} onBack={() => goToPage('home')} />
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
              {currentPage === 'treasurer' && permissions?.treasurer && (
                <>
                  <TreasurerDashboard isAdmin={isAdmin} onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

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

              {/* ── User Management ── */}
              {currentPage === 'users' && permissions?.userManagement && (
                <>
                  <UserManagement onBack={() => goToPage('home')} />
                  <Footer goToPage={goToPage} />
                </>
              )}

              {/* ── RSVP Admin ── */}
              {currentPage === 'rsvpAdmin' && permissions?.rsvp && (
                <>
                  <EventRsvpAdmin isAdmin={isAdmin} onBack={() => goToPage('home')} />
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
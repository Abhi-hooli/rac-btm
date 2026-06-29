import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { firebaseAdminLogout } from '../../firebase'
import AdminLogin from '../ui/AdminLogin'

const navLinks = [
  { name: 'About', href: '#about' },
  { name: 'Impact', href: '#impact' },
  { name: 'Projects', href: '#projects' },
  { name: 'Events', href: '#events' },
  { name: 'Leadership', href: '#leadership' },
  { name: 'Calendar', href: '#', isPage: true, pageKey: 'calendar' },
  { name: 'Documents', href: '#', isPage: true, pageKey: 'documents' },
  { name: 'Blog', href: '#', isPage: true, pageKey: 'blog' },
]

export default function Navbar({ isDark, isAdmin, permissions, onLogin, onLogout, onLogoClick, onTreasurer, onAnalytics, onAttendance, onCalendar, onDocuments, onContact, onMom, onRsvpAdmin, onUserManagement, onBlog, onNewsletter, currentPage, maintenanceMode, onToggleMaintenance }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false)
  const [timerOption, setTimerOption] = useState('none')
  const [customDateTime, setCustomDateTime] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAdminDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isOverHero = !isScrolled && currentPage === 'home'

  const handleNavClick = (e, link) => {
    e.preventDefault()
    if (link.isPage) {
      if (link.pageKey === 'documents') onDocuments?.()
      else if (link.pageKey === 'calendar') onCalendar?.()
      else if (link.pageKey === 'blog') onBlog?.()
      return
    }
    if (currentPage !== 'home') {
      onLogoClick?.()
      setTimeout(() => {
        const el = document.querySelector(link.href)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 400)
    } else {
      const el = document.querySelector(link.href)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 py-3'
          : 'bg-transparent py-5'
          }`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

          {/* Logo */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onLogoClick?.() }}
            className="flex items-center group"
          >
            <div className="w-36 h-12 group-hover:scale-105 transition-all duration-200 flex-shrink-0">
              <img
                src="/rotaract-logo.png"
                alt="Rotaract Bengaluru BTM"
                className="w-full h-full object-contain object-left"
                style={{ mixBlendMode: isOverHero ? 'screen' : 'multiply' }}
              />
            </div>
          </a>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${isOverHero
                  ? 'text-white/85 hover:text-white hover:bg-white/10'
                  : 'text-rotary-charcoal/70 hover:text-rotary-blue hover:bg-rotary-blue/5'
                  }`}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Admin
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${adminDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence>
                  {adminDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                    >
                      {/* 1. Club Analytics */}
                      {permissions?.analytics && (
                        <button
                          onClick={() => { setAdminDropdownOpen(false); onAnalytics?.() }}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-rotary-charcoal hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            📊
                          </div>
                          Club Analytics
                        </button>
                      )}

                      {/* 2. Attendance Tracker */}
                      {permissions?.attendance && (
                        <button
                          onClick={() => { setAdminDropdownOpen(false); onAttendance?.() }}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-rotary-charcoal hover:bg-rotary-blue/5 hover:text-rotary-blue transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-rotary-blue/10 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-rotary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                          </div>
                          Attendance Tracker
                        </button>
                      )}

                      {/* 3. MoM Tracker */}
                      {permissions?.mom && (
                        <button
                          onClick={() => { setAdminDropdownOpen(false); onMom?.() }}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-rotary-charcoal hover:bg-purple-50 hover:text-purple-700 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          MoM Tracker
                        </button>
                      )}

                      {/* 4. Treasurer Portal */}
                      {permissions?.treasurer && (
                        <button
                          onClick={() => { setAdminDropdownOpen(false); onTreasurer?.() }}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-rotary-charcoal hover:bg-rotary-gold/5 hover:text-rotary-gold transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-rotary-gold/10 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-rotary-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          Treasurer Portal
                        </button>
                      )}

                      {/* 5. RSVP Manager */}
                      {permissions?.rsvp && (
                        <button
                          onClick={() => { setAdminDropdownOpen(false); onRsvpAdmin?.() }}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-rotary-charcoal hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            🎟️
                          </div>
                          RSVP Manager
                        </button>
                      )}

                      {/* Newsletter */}
                      <button
                        onClick={() => { setAdminDropdownOpen(false); onNewsletter?.() }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-rotary-charcoal hover:bg-pink-50 hover:text-pink-700 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                          📰
                        </div>
                        Newsletter
                      </button>

                      <div className="mx-3 border-t border-gray-100" />

                      {/* 6. User Management */}
                      {permissions?.userManagement && (
                        <button
                          onClick={() => { setAdminDropdownOpen(false); onUserManagement?.() }}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-rotary-charcoal hover:bg-amber-50 hover:text-amber-700 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                            👥
                          </div>
                          User Management
                        </button>
                      )}

                      {/* Maintenance Mode — super admin only */}
                      {permissions?.userManagement && (
                        <>
                          <div className="mx-3 border-t border-gray-100" />
                          <button
                            onClick={() => { setAdminDropdownOpen(false); setShowMaintenanceConfirm(true) }}
                            className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
                              maintenanceMode
                                ? 'text-orange-600 hover:bg-orange-50'
                                : 'text-rotary-charcoal hover:bg-orange-50 hover:text-orange-600'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${maintenanceMode ? 'bg-orange-100' : 'bg-orange-50'}`}>
                              <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <span className="flex-1 text-left">Maintenance Mode</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${maintenanceMode ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                              {maintenanceMode ? 'ON' : 'OFF'}
                            </span>
                          </button>
                        </>
                      )}

                      {/* Sign Out */}
                      <button
                        onClick={async () => { setAdminDropdownOpen(false); await firebaseAdminLogout(); onLogout() }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Admin Login"
              >
                <svg className={`w-[18px] h-[18px] transition-colors duration-300 ${isOverHero ? 'text-white/50' : 'text-rotary-slate/50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </button>
            )}

            {/* Join Us */}
            <button
              onClick={() => onContact?.()}
              className={`hidden sm:flex items-center gap-1.5 !py-2 !px-5 text-sm !rounded-xl font-semibold transition-all duration-300 ${isOverHero
                ? 'bg-white text-rotary-blue hover:bg-white/90'
                : 'btn-primary'
                }`}
            >
              Join Us
            </button>

            {/* Mobile hamburger */}
            <button className="lg:hidden p-2 ml-1" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <div className="w-5 h-4 flex flex-col justify-between">
                <motion.span className={`w-full h-0.5 rounded transition-colors duration-300 ${isOverHero ? 'bg-white' : 'bg-rotary-charcoal'}`} animate={isMenuOpen ? { rotate: 45, y: 7 } : {}} />
                <motion.span className={`w-full h-0.5 rounded transition-colors duration-300 ${isOverHero ? 'bg-white' : 'bg-rotary-charcoal'}`} animate={isMenuOpen ? { opacity: 0 } : {}} />
                <motion.span className={`w-full h-0.5 rounded transition-colors duration-300 ${isOverHero ? 'bg-white' : 'bg-rotary-charcoal'}`} animate={isMenuOpen ? { rotate: -45, y: -7 } : {}} />
              </div>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
            <motion.div
              className="absolute top-16 right-4 left-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="grid grid-cols-2 gap-1 mb-3">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="px-3 py-2.5 rounded-xl text-sm font-medium text-rotary-charcoal/80 hover:text-rotary-blue hover:bg-rotary-blue/5 transition-colors"
                    onClick={(e) => { handleNavClick(e, link); setIsMenuOpen(false) }}
                  >
                    {link.name}
                  </a>
                ))}
              </div>

              {isAdmin && (
                <div className="mt-2 pt-3 border-t border-gray-100 flex flex-col gap-1.5">
                  {/* 1. Club Analytics */}
                  {permissions?.analytics && (
                    <button
                      onClick={() => { setIsMenuOpen(false); onAnalytics?.() }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      📊 Club Analytics
                    </button>
                  )}

                  {/* 2. Attendance Tracker */}
                  {permissions?.attendance && (
                    <button
                      onClick={() => { setIsMenuOpen(false); onAttendance?.() }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold bg-rotary-blue/8 text-rotary-blue border border-rotary-blue/15 hover:bg-rotary-blue/15 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Attendance Tracker
                    </button>
                  )}

                  {/* 3. MoM Tracker */}
                  {permissions?.mom && (
                    <button
                      onClick={() => { setIsMenuOpen(false); onMom?.() }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      MoM Tracker
                    </button>
                  )}

                  {/* 4. Treasurer Dashboard */}
                  {permissions?.treasurer && (
                    <button
                      onClick={() => { setIsMenuOpen(false); onTreasurer?.() }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold bg-rotary-gold/8 text-rotary-gold border border-rotary-gold/15 hover:bg-rotary-gold/15 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Treasurer Dashboard
                    </button>
                  )}

                  {/* 5. RSVP Manager */}
                  {permissions?.rsvp && (
                    <button
                      onClick={() => { setIsMenuOpen(false); onRsvpAdmin?.() }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                    >
                      🎟️ RSVP Manager
                    </button>
                  )}

                  {/* 6. User Management */}
                  {permissions?.userManagement && (
                    <button
                      onClick={() => { setIsMenuOpen(false); onUserManagement?.() }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors"
                    >
                      👥 User Management
                    </button>
                  )}

                  {/* Sign Out */}
                  <button
                    onClick={async () => { setIsMenuOpen(false); await firebaseAdminLogout(); onLogout() }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}

              <button
                className="block w-full mt-3 btn-primary text-center !py-3 text-sm !rounded-xl"
                onClick={() => { setIsMenuOpen(false); onContact?.() }}
              >
                Join Us
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdminLogin isOpen={showLogin} onClose={() => setShowLogin(false)} onLogin={onLogin} />

      {/* Maintenance Mode Confirm Modal */}
      <AnimatePresence>
        {showMaintenanceConfirm && (
          <motion.div
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 10 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display font-bold text-base">
                    {maintenanceMode ? 'Disable Maintenance Mode?' : 'Enable Maintenance Mode?'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Super Admin action</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {maintenanceMode
                  ? 'The site will become publicly visible again. All visitors will be able to access it.'
                  : 'All visitors (except admins) will see a maintenance page and cannot access the site.'}
              </p>

              {/* Countdown timer picker — only when enabling, only for super admin */}
              {!maintenanceMode && permissions?.isSuperAdmin && (
                <div className="mb-5 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-orange-700">Set countdown timer for visitors</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
                    {[
                      { label: 'No timer', value: 'none' },
                      { label: '30 min', value: '30m' },
                      { label: '1 hour', value: '1h' },
                      { label: '2 hours', value: '2h' },
                      { label: '4 hours', value: '4h' },
                      { label: 'Custom', value: 'custom' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTimerOption(opt.value)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                          timerOption === opt.value
                            ? 'bg-orange-500 text-white'
                            : 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {timerOption === 'custom' && (
                    <input
                      type="datetime-local"
                      value={customDateTime}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      onChange={e => setCustomDateTime(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-orange-200 bg-white text-gray-700 focus:outline-none focus:border-orange-400"
                    />
                  )}
                  {timerOption !== 'none' && timerOption !== 'custom' && (
                    <p className="text-xs text-orange-600 mt-1">
                      Visitors will see a countdown showing when the site returns.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    let resumeAt = null
                    if (!maintenanceMode && permissions?.isSuperAdmin && timerOption !== 'none') {
                      if (timerOption === '30m') resumeAt = Date.now() + 30 * 60 * 1000
                      else if (timerOption === '1h') resumeAt = Date.now() + 60 * 60 * 1000
                      else if (timerOption === '2h') resumeAt = Date.now() + 2 * 60 * 60 * 1000
                      else if (timerOption === '4h') resumeAt = Date.now() + 4 * 60 * 60 * 1000
                      else if (timerOption === 'custom' && customDateTime) resumeAt = new Date(customDateTime).getTime()
                    }
                    onToggleMaintenance?.(resumeAt)
                    setShowMaintenanceConfirm(false)
                    setTimerOption('none')
                    setCustomDateTime('')
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    maintenanceMode
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {maintenanceMode ? 'Go Live' : 'Enable'}
                </button>
                <button
                  onClick={() => { setShowMaintenanceConfirm(false); setTimerOption('none'); setCustomDateTime('') }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
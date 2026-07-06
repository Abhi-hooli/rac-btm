import { useEffect, useState } from 'react'
import { restGetDoc } from '../../lib/firestoreRest'

export default function RedirectResolver({ slug, onBack }) {
  const [status, setStatus] = useState('loading') // loading | notfound | redirecting

  useEffect(() => {
    let cancelled = false

    const resolve = async () => {
      try {
        // Public visitors hitting a /r/:slug short link should never have to
        // download the Firestore SDK just to resolve one doc — use the
        // lightweight REST read instead. `links` has `allow read: if true`.
        const link = await restGetDoc('links', slug)
        if (cancelled) return
        if (!link) {
          setStatus('notfound')
          return
        }
        setStatus('redirecting')
        // Click logging is a write, which does need the SDK — load it lazily
        // and fire-and-forget so it never blocks the redirect itself.
        import('../../firebase').then(({ loadFirestore }) => loadFirestore()).then(({ mod, db }) => {
          mod.addDoc(mod.collection(db, 'linkClicks'), {
            linkId: slug,
            day: new Date().toISOString().slice(0, 10),
            referrer: document.referrer || null,
            userAgent: navigator.userAgent,
            createdAt: mod.serverTimestamp(),
          }).catch(() => {})
        }).catch(() => {})
        window.location.replace(link.destination)
      } catch {
        if (!cancelled) setStatus('notfound')
      }
    }
    resolve()

    return () => { cancelled = true }
  }, [slug])

  if (status === 'notfound') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-rotary-navy text-center px-6">
        <h1 className="font-display font-bold text-2xl text-rotary-navy dark:text-white">Link not found</h1>
        <p className="text-rotary-slate dark:text-white/50 text-sm">This short link doesn't exist or has been removed.</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue/90 transition-colors"
        >
          Go Home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-rotary-navy">
      <div className="w-10 h-10 border-4 border-rotary-blue/30 border-t-rotary-blue rounded-full animate-spin" />
    </div>
  )
}

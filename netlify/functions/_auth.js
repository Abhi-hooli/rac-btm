import admin from 'firebase-admin'

// Lazily initialize the Admin SDK from a service account JSON stored as a
// server-only Netlify env var (never VITE_-prefixed, so it's never bundled
// into client JS). Generate one at Firebase Console → Project Settings →
// Service Accounts → Generate new private key, then paste the whole JSON
// as FIREBASE_SERVICE_ACCOUNT_JSON in Netlify → Site settings →
// Environment variables.
let initialized = false
function adminApp() {
  if (!initialized) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not set')
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) })
    initialized = true
  }
  return admin
}

// These functions proxy webhook calls (WhatsApp notify, audit log, sheet
// backup) that used to run client-side with the destination URL/API key
// baked into the public JS bundle — anyone could extract them and forge
// requests. Requiring a valid Firebase ID token here means only someone
// who's actually signed in to the app can trigger them.
export async function verifyCaller(event) {
  const header = event.headers.authorization || event.headers.Authorization || ''
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!idToken) return null
  try {
    return await adminApp().auth().verifyIdToken(idToken)
  } catch {
    return null
  }
}

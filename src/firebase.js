import { initializeApp, getApps } from 'firebase/app'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

const ALL_PERMS = { analytics: true, attendance: true, mom: true, treasurer: true, rsvp: true, userManagement: true, gallery: true, linkRedirects: true, membership: true, homepage: true, events: true, projects: true }

// firebase/auth and firebase/firestore are large chunks (~150-200kB and
// ~600kB) only needed once someone opens the admin portal — load them on
// demand instead of blocking the initial app render for every anonymous
// visitor. Public pages read data via the lightweight REST helpers in
// src/lib/firestoreRest.js instead.
let authModPromise
function loadAuth() {
  if (!authModPromise) {
    authModPromise = import('firebase/auth').then(mod => ({ mod, auth: mod.getAuth(app) }))
  }
  return authModPromise
}

let firestoreModPromise
export function loadFirestore() {
  if (!firestoreModPromise) {
    firestoreModPromise = import('firebase/firestore').then(mod => ({ mod, db: mod.getFirestore(app) }))
  }
  return firestoreModPromise
}

export async function subscribeAuthState(callback) {
  const { mod, auth } = await loadAuth()
  return mod.onAuthStateChanged(auth, callback)
}

export async function firebaseAdminLogin(email, password) {
  const [{ mod, auth }, { mod: fsMod, db }] = await Promise.all([loadAuth(), loadFirestore()])
  const result = await mod.signInWithEmailAndPassword(auth, email, password)
  const q = fsMod.query(fsMod.collection(db, 'users'), fsMod.where('email', '==', result.user.email))
  const snap = await fsMod.getDocs(q)
  if (snap.empty) {
    await mod.signOut(auth)
    throw new Error('Unauthorized. Contact the club admin for access.')
  }
  const userData = snap.docs[0].data()
  if (userData.isSuperAdmin) {
    return { user: result.user, permissions: { ...ALL_PERMS, isSuperAdmin: true, email: result.user.email } }
  }
  return { user: result.user, permissions: { ...(userData.permissions || {}), email: result.user.email } }
}

export async function createAuthUser(email, password) {
  const { mod } = await loadAuth()
  const secondaryApp = getApps().find(a => a.name === 'Secondary')
    || initializeApp(firebaseConfig, 'Secondary')
  const secondaryAuth = mod.getAuth(secondaryApp)
  await mod.createUserWithEmailAndPassword(secondaryAuth, email, password)
  await mod.signOut(secondaryAuth)
}

export async function sendSetupEmail(email) {
  const { mod, auth } = await loadAuth()
  await mod.sendPasswordResetEmail(auth, email)
}

export async function firebaseAdminLogout() {
  const { mod, auth } = await loadAuth()
  await mod.signOut(auth)
}

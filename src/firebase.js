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

const ALL_PERMS = { analytics: true, attendance: true, mom: true, treasurer: true, rsvp: true, userManagement: true, gallery: true, linkRedirects: true, membership: true, homepage: true, events: true, projects: true, avenueProjects: true }

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

// `users` docs used to get an auto-generated ID (via addDoc), unrelated to
// the person's Firebase Auth UID. Firestore Security Rules can only cheaply
// look up a doc by a known path, so tightening the rules to check "is the
// requester's own users doc marked isSuperAdmin" requires that doc to live
// at users/{uid}. Rather than a one-off admin migration script, each user
// self-heals this the next time they log in: if their doc isn't yet keyed by
// uid, copy it there and drop the old one. Safe to run under both the old
// permissive rules and the tightened ones (a user can always read/move their
// own record), and idempotent — a second login is a no-op once migrated.
async function migrateUserDocToUid(fsMod, db, uid, oldDoc) {
  if (oldDoc.id === uid) return oldDoc.data()
  const data = oldDoc.data()
  const batch = fsMod.writeBatch(db)
  batch.set(fsMod.doc(db, 'users', uid), data)
  batch.delete(fsMod.doc(db, 'users', oldDoc.id))
  await batch.commit()
  return data
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
  const userData = await migrateUserDocToUid(fsMod, db, result.user.uid, snap.docs[0])
  if (userData.isSuperAdmin) {
    return { user: result.user, permissions: { ...ALL_PERMS, isSuperAdmin: true, email: result.user.email, name: userData.name || result.user.email, avenue: userData.avenue || null, role: userData.role || 'Super Admin' } }
  }
  return { user: result.user, permissions: { ...(userData.permissions || {}), email: result.user.email, name: userData.name || result.user.email, avenue: userData.avenue || null, role: userData.role || null } }
}

// Returns the new account's uid so the caller can create its `users` doc at
// users/{uid} directly — see migrateUserDocToUid above for why that matters.
export async function createAuthUser(email, password) {
  const { mod } = await loadAuth()
  const secondaryApp = getApps().find(a => a.name === 'Secondary')
    || initializeApp(firebaseConfig, 'Secondary')
  const secondaryAuth = mod.getAuth(secondaryApp)
  const result = await mod.createUserWithEmailAndPassword(secondaryAuth, email, password)
  const uid = result.user.uid
  await mod.signOut(secondaryAuth)
  return uid
}

export async function sendSetupEmail(email) {
  const { mod, auth } = await loadAuth()
  await mod.sendPasswordResetEmail(auth, email)
}

export async function firebaseAdminLogout() {
  const { mod, auth } = await loadAuth()
  await mod.signOut(auth)
}

export async function getCurrentAdminEmail() {
  const { auth } = await loadAuth()
  return auth.currentUser?.email || null
}

// Used to authenticate calls to our Netlify Function proxies (audit log,
// sheet backup, WhatsApp notify) — see netlify/functions/_auth.js.
export async function getCurrentIdToken() {
  const { auth } = await loadAuth()
  return auth.currentUser ? auth.currentUser.getIdToken() : null
}

import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

const ALL_PERMS = { analytics: true, attendance: true, mom: true, treasurer: true, rsvp: true, userManagement: true }

export async function firebaseAdminLogin(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password)
  const q = query(collection(db, 'users'), where('email', '==', result.user.email))
  const snap = await getDocs(q)
  if (snap.empty) {
    await signOut(auth)
    throw new Error('Unauthorized. Contact the club admin for access.')
  }
  const userData = snap.docs[0].data()
  console.log('userData:', userData)
  console.log('isSuperAdmin:', userData.isSuperAdmin)
  if (userData.isSuperAdmin) {
    return { user: result.user, permissions: ALL_PERMS }
  }
  return { user: result.user, permissions: userData.permissions || {} }
}

export async function createAuthUser(email, password) {
  const secondaryApp = getApps().find(a => a.name === 'Secondary')
    || initializeApp(firebaseConfig, 'Secondary')
  const secondaryAuth = getAuth(secondaryApp)
  await createUserWithEmailAndPassword(secondaryAuth, email, password)
  await signOut(secondaryAuth)
}

export async function sendSetupEmail(email) {
  await sendPasswordResetEmail(auth, email)
}

export async function firebaseAdminLogout() {
  await signOut(auth)
}
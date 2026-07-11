import { loadFirestore, getCurrentAdminEmail, getCurrentIdToken } from '../firebase'

// Collections where accidental deletes are costly enough to warrant a
// soft-delete safety net instead of an immediate hard delete. Anything not
// listed here keeps the old immediate-delete behaviour.
export const TRASH_COLLECTIONS = [
  'membershipApplications',
  'moms',
  'rsvps',
  'attendance_meetings',
  'users',
  'treasurer_members',
  'treasurer_events',
  'treasurer_sponsorships',
  'treasurer_transactions',
  'treasurer_assets',
  'avenueProjects',
]

export const TRASH_RETENTION_DAYS = 7

export function isTrashEnabled(collectionName) {
  return TRASH_COLLECTIONS.includes(collectionName)
}

// The Apps Script backup-sheet URL used to live in the client bundle (a
// VITE_-prefixed env var) — anyone could extract it and POST arbitrary rows
// into the backup sheet. This now goes through a Netlify Function that
// holds the real URL server-side and only forwards for an authenticated
// caller — see netlify/functions/backup-sheet.js.
//
// Off-Firestore copy of the full document, so data survives even if the
// Firestore project itself is misconfigured or someone hard-purges the
// trash. Same fire-and-forget pattern as src/utils/auditLog.js.
export async function backupToSheet(collectionName, docId, action, data, admin) {
  try {
    const idToken = await getCurrentIdToken()
    if (!idToken) return
    await fetch('/.netlify/functions/backup-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        collection: collectionName,
        docId,
        action,
        admin: admin || 'unknown',
        data: JSON.stringify(data ?? null),
      }),
    })
  } catch (err) {
    console.warn('Sheet backup failed:', err)
  }
}

export async function softDelete(collectionName, id, data) {
  const { mod, db } = await loadFirestore()
  const admin = await getCurrentAdminEmail()
  await mod.updateDoc(mod.doc(db, collectionName, id), {
    deletedAt: Date.now(),
    deletedBy: admin || null,
  })
  backupToSheet(collectionName, id, 'delete', data, admin)
}

export async function restoreDoc(collectionName, id) {
  const { mod, db } = await loadFirestore()
  await mod.updateDoc(mod.doc(db, collectionName, id), {
    deletedAt: mod.deleteField(),
    deletedBy: mod.deleteField(),
  })
}

export async function purgeDoc(collectionName, id) {
  const { mod, db } = await loadFirestore()
  await mod.deleteDoc(mod.doc(db, collectionName, id))
}

function deletedAtMillis(item) {
  const v = item?.deletedAt
  if (!v) return null
  if (typeof v === 'number') return v
  if (typeof v?.toMillis === 'function') return v.toMillis()
  return null
}

export function isExpired(item) {
  const ms = deletedAtMillis(item)
  if (ms == null) return false
  return Date.now() - ms > TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
}

export function daysRemaining(item) {
  const ms = deletedAtMillis(item)
  if (ms == null) return null
  const elapsedDays = (Date.now() - ms) / (24 * 60 * 60 * 1000)
  return Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - elapsedDays))
}

// Fetches every doc in a collection and permanently purges the ones that
// have been in the trash past the retention window. Client-triggered (on
// Trash view load and on super-admin login) since this project is on the
// Firestore Spark plan and has no scheduled Cloud Function to run this on
// a real timer.
export async function sweepExpired(collectionName) {
  try {
    const { mod, db } = await loadFirestore()
    const snap = await mod.getDocs(mod.collection(db, collectionName))
    const expired = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(isExpired)
    await Promise.all(expired.map(item => purgeDoc(collectionName, item.id)))
    return expired.length
  } catch (err) {
    console.warn(`Trash sweep failed for "${collectionName}":`, err)
    return 0
  }
}

export async function sweepAllExpired() {
  const counts = await Promise.all(TRASH_COLLECTIONS.map(sweepExpired))
  return counts.reduce((a, b) => a + b, 0)
}

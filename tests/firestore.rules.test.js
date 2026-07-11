// Exercises firestore.rules against the real Firestore emulator — this is
// the regression test for the CRITICAL finding from the engineering audit:
// rules used to only check `request.auth != null`, so any signed-in admin
// (even one granted a single narrow permission) could grant themselves
// isSuperAdmin and read/write every collection. These tests fail loudly if
// that ever regresses, instead of relying on someone re-reading the rules
// file by eye before every deploy.
//
// Run via `npm run test:rules` — needs the Firestore emulator, which that
// script starts automatically (`firebase emulators:exec`).
import { readFileSync } from 'fs'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, getDoc, getDocs, collection, addDoc } from 'firebase/firestore'

let testEnv

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'rotaract-btm-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

// Seeds a `users/{uid}` doc directly, bypassing rules — this is how a real
// admin's doc gets there in production too (via the app's own super-admin
// write path), it's just done without rules-enforcement here because it's
// test setup, not the thing under test.
async function seedUser(uid, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), data)
  })
}

describe('the privilege-escalation fix (CRITICAL finding)', () => {
  it('blocks a low-privilege admin from granting themselves isSuperAdmin', async () => {
    await seedUser('low-priv', { isSuperAdmin: false, permissions: { attendance: true } })
    const db = testEnv.authenticatedContext('low-priv').firestore()
    await assertFails(updateDoc(doc(db, 'users', 'low-priv'), { isSuperAdmin: true }))
  })

  it('blocks a low-privilege admin from granting themselves an unrelated permission', async () => {
    await seedUser('low-priv3', { isSuperAdmin: false, permissions: { attendance: true } })
    const db = testEnv.authenticatedContext('low-priv3').firestore()
    await assertFails(updateDoc(doc(db, 'users', 'low-priv3'), { 'permissions.treasurer': true }))
  })

  it('blocks a low-privilege admin from reading or writing treasury', async () => {
    await seedUser('low-priv2', { isSuperAdmin: false, permissions: { attendance: true } })
    const db = testEnv.authenticatedContext('low-priv2').firestore()
    await assertFails(setDoc(doc(db, 'treasury', 'x'), { amount: 100 }))
    await assertFails(getDoc(doc(db, 'treasury', 'x')))
  })

  it('blocks a low-privilege admin from tampering with the audit log', async () => {
    await seedUser('low-priv4', { isSuperAdmin: false, permissions: { attendance: true } })
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'auditLog', 'entry1'), { action: 'LOGIN' })
    })
    const db = testEnv.authenticatedContext('low-priv4').firestore()
    await assertFails(updateDoc(doc(db, 'auditLog', 'entry1'), { action: 'TAMPERED' }))
  })

  it('allows an admin to write only the collection matching their own granted permission', async () => {
    await seedUser('attendance-admin', { isSuperAdmin: false, permissions: { attendance: true } })
    const db = testEnv.authenticatedContext('attendance-admin').firestore()
    await assertSucceeds(setDoc(doc(db, 'attendance_meetings', 'm1'), { title: 'GBM' }))
    await assertFails(setDoc(doc(db, 'moms', 'm1'), { title: 'GBM minutes' }))
  })

  it('allows a real super admin to write to users, treasury, and settings', async () => {
    await seedUser('root', { isSuperAdmin: true, permissions: {} })
    const db = testEnv.authenticatedContext('root').firestore()
    await assertSucceeds(setDoc(doc(db, 'treasury', 'x'), { amount: 100 }))
    await assertSucceeds(setDoc(doc(db, 'settings', 'site'), { maintenanceMode: false }))
    await assertSucceeds(
      setDoc(doc(db, 'users', 'someone-else'), { isSuperAdmin: false, permissions: {} })
    )
  })

  it('denies a freshly-authenticated account with no users doc at all (e.g. open sign-up)', async () => {
    const db = testEnv.authenticatedContext('stranger').firestore()
    await assertFails(setDoc(doc(db, 'treasury', 'x'), { amount: 1 }))
    await assertFails(
      setDoc(doc(db, 'users', 'stranger'), { isSuperAdmin: true, permissions: {} })
    )
  })

  it('denies a fully unauthenticated request to every admin collection', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(db, 'treasury', 'x'), { amount: 1 }))
    await assertFails(getDocs(collection(db, 'users')))
  })
})

describe('the gallery bypass fix', () => {
  it('no longer lets any known admin write gallery — requires the gallery permission specifically', async () => {
    await seedUser('no-gallery-perm', { isSuperAdmin: false, permissions: { attendance: true } })
    const db = testEnv.authenticatedContext('no-gallery-perm').firestore()
    await assertFails(setDoc(doc(db, 'gallery', 'g1'), { url: 'x' }))
  })

  it('allows an admin with the gallery permission to write gallery', async () => {
    await seedUser('gallery-admin', { isSuperAdmin: false, permissions: { gallery: true } })
    const db = testEnv.authenticatedContext('gallery-admin').firestore()
    await assertSucceeds(setDoc(doc(db, 'gallery', 'g1'), { url: 'x' }))
  })
})

describe('public content and public-write forms', () => {
  it('lets anyone read public collections without auth', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'projects', 'p1'), { title: 'Beach Cleanup' })
    })
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(db, 'projects', 'p1')))
  })

  it('lets an anonymous visitor create a well-shaped rsvp', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(addDoc(collection(db, 'rsvps'), { name: 'A', email: 'a@x.com' }))
  })

  it('rejects a malformed anonymous rsvp missing a required field', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(addDoc(collection(db, 'rsvps'), { name: 'A' }))
  })

  it('does not let an anonymous visitor read rsvps back', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDocs(collection(db, 'rsvps')))
  })
})

describe('catch-all deny', () => {
  it('denies any collection not explicitly listed in the rules, even for a super admin', async () => {
    await seedUser('root2', { isSuperAdmin: true, permissions: {} })
    const db = testEnv.authenticatedContext('root2').firestore()
    await assertFails(setDoc(doc(db, 'somethingUnlisted', 'x'), { a: 1 }))
  })
})

import { useState, useEffect, useMemo } from 'react'
import { loadFirestore, getCurrentAdminEmail } from '../firebase'
import { restGetDoc, restGetCollection } from '../lib/firestoreRest'
import { isTrashEnabled, softDelete, backupToSheet } from '../utils/trash'

// Module-level cache so remounting a page (e.g. switching dashboards and
// coming back) renders cached data instantly instead of showing a loading
// flash while a brand-new listener/snapshot round-trip completes.
const collectionCache = new Map()
const documentCache = new Map()

// Generic hook — pass collection name, get data + helpers.
//
// `options` controls how data is read:
//  - enabled: false skips reading entirely (e.g. admin-only data on public pages)
//  - live: true (default) subscribes via the Firestore SDK (`onSnapshot`),
//    loaded on demand — use for authenticated/admin views that need realtime updates.
//    live: false does a single lightweight REST fetch with no SDK download at
//    all — use for public pages where a page refresh is an acceptable way to
//    see updates.
// A bare boolean for `options` is treated as `enabled` for backwards compat.
export function useCollection(collectionName, fallback = [], options = true) {
  const { enabled = true, live = true, includeDeleted = false, once = false } = typeof options === 'boolean' ? { enabled: options } : options
  const cached = collectionCache.get(collectionName)
  const [rawData, setRawData] = useState(cached ?? fallback)
  const [loading, setLoading] = useState(!cached)
  // Memoized so the returned array keeps a stable reference across renders
  // when rawData hasn't actually changed — otherwise every consumer with
  // data/events/etc. in a useEffect dependency array re-fires every render.
  const data = useMemo(
    () => (includeDeleted ? rawData : rawData.filter(d => !d?.deletedAt)),
    [rawData, includeDeleted]
  )

  useEffect(() => {
    if (!enabled) {
      setRawData(fallback)
      setLoading(false)
      return
    }
    let cancelled = false
    let unsub

    if (once) {
      // One-time authenticated SDK read — no persistent listener. Use for
      // glance views (e.g. the Profile task list) that don't need realtime
      // updates but still read auth-gated collections the REST path can't.
      loadFirestore().then(({ mod, db }) => {
        if (cancelled) return
        mod.getDocs(mod.collection(db, collectionName)).then(snap => {
          if (cancelled) return
          const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }))
          collectionCache.set(collectionName, docs)
          setRawData(docs)
          setLoading(false)
        }).catch(err => {
          console.error(`Firestore getDocs error [${collectionName}]:`, err)
          if (!cancelled) setLoading(false)
        })
      })
    } else if (live) {
      loadFirestore().then(({ mod, db }) => {
        if (cancelled) return
        const ref = mod.collection(db, collectionName)
        unsub = mod.onSnapshot(ref, (snap) => {
          const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }))
          collectionCache.set(collectionName, docs)
          setRawData(docs)
          setLoading(false)
        }, (err) => {
          console.error(`Firestore error [${collectionName}]:`, err)
          setLoading(false)
        })
      })
    } else {
      restGetCollection(collectionName).then(docs => {
        if (cancelled) return
        collectionCache.set(collectionName, docs)
        setRawData(docs)
        setLoading(false)
      }).catch(err => {
        console.error(`Firestore REST error [${collectionName}]:`, err)
        if (!cancelled) setLoading(false)
      })
    }

    return () => { cancelled = true; if (unsub) unsub() }
  }, [collectionName, enabled, live, once])

  const save = async (item) => {
    if (!item.id) throw new Error(`save() called without id in collection "${collectionName}"`)
    const { mod, db } = await loadFirestore()
    const ref = mod.doc(db, collectionName, item.id)
    await mod.setDoc(ref, item)
    if (isTrashEnabled(collectionName)) {
      backupToSheet(collectionName, item.id, 'save', item, await getCurrentAdminEmail())
    }
  }

  // Soft-deletes (tags deletedAt/deletedBy + backs up the full record) for
  // collections in TRASH_COLLECTIONS so a super admin can restore it from
  // the Trash view within 7 days; everything else hard-deletes as before.
  const remove = async (id) => {
    if (isTrashEnabled(collectionName)) {
      const existing = rawData.find(d => d.id === id)
      await softDelete(collectionName, id, existing)
      return
    }
    const { mod, db } = await loadFirestore()
    await mod.deleteDoc(mod.doc(db, collectionName, id))
  }

  const saveMany = async (items) => {
    const { mod, db } = await loadFirestore()
    const batch = mod.writeBatch(db)
    items.forEach(item => {
      const ref = mod.doc(db, collectionName, item.id)
      batch.set(ref, item)
    })
    await batch.commit()
  }

  return { data, loading, save, remove, saveMany }
}

// Single document hook — for settings like dueRates.
// See useCollection() above for what `options.live` means.
export function useDocument(collectionName, docId, fallback = {}, options = {}) {
  const { live = true } = options
  const cacheKey = `${collectionName}/${docId}`
  const cached = documentCache.get(cacheKey)
  const [data, setData] = useState(cached ?? fallback)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    let cancelled = false
    let unsub

    if (live) {
      loadFirestore().then(({ mod, db }) => {
        if (cancelled) return
        const ref = mod.doc(db, collectionName, docId)
        unsub = mod.onSnapshot(ref, (snap) => {
          const next = snap.exists() ? snap.data() : fallback
          documentCache.set(cacheKey, next)
          setData(next)
          setLoading(false)
        }, (err) => {
          console.error(`Firestore doc error [${collectionName}/${docId}]:`, err)
          setLoading(false)
        })
      })
    } else {
      restGetDoc(collectionName, docId).then(next => {
        if (cancelled) return
        const resolved = next ?? fallback
        documentCache.set(cacheKey, resolved)
        setData(resolved)
        setLoading(false)
      }).catch(err => {
        console.error(`Firestore REST doc error [${collectionName}/${docId}]:`, err)
        if (!cancelled) setLoading(false)
      })
    }

    return () => { cancelled = true; if (unsub) unsub() }
  }, [collectionName, docId, live])

  const save = async (newData) => {
    const { mod, db } = await loadFirestore()
    const ref = mod.doc(db, collectionName, docId)
    await mod.setDoc(ref, newData)
  }

  return { data, loading, save }
}

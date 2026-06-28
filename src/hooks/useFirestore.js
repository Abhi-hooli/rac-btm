import { useState, useEffect } from 'react'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore'
import { db } from '../firebase'

// Generic hook — pass collection name, get live data + helpers.
// Pass enabled=false to skip subscribing (e.g. admin-only data on public pages).
export function useCollection(collectionName, fallback = [], enabled = true) {
  const [data, setData] = useState(fallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) {
      setData(fallback)
      setLoading(false)
      return
    }
    const ref = collection(db, collectionName)
    const unsub = onSnapshot(ref, (snap) => {
      const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }))
      setData(docs)
      setLoading(false)
    }, (err) => {
      console.error(`Firestore error [${collectionName}]:`, err)
      setLoading(false)
    })
    return () => unsub()
  }, [collectionName, enabled])

  const save = async (item) => {
    const ref = doc(db, collectionName, item.id)
    await setDoc(ref, item)
  }

  const remove = async (id) => {
    await deleteDoc(doc(db, collectionName, id))
  }

  const saveMany = async (items) => {
    const batch = writeBatch(db)
    items.forEach(item => {
      const ref = doc(db, collectionName, item.id)
      batch.set(ref, item)
    })
    await batch.commit()
  }

  return { data, loading, save, remove, saveMany }
}

// Single document hook — for settings like dueRates
export function useDocument(collectionName, docId, fallback = {}) {
  const [data, setData] = useState(fallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ref = doc(db, collectionName, docId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setData(snap.data())
      } else {
        setData(fallback)
      }
      setLoading(false)
    }, (err) => {
      console.error(`Firestore doc error [${collectionName}/${docId}]:`, err)
      setLoading(false)
    })
    return () => unsub()
  }, [collectionName, docId])

  const save = async (newData) => {
    const ref = doc(db, collectionName, docId)
    await setDoc(ref, newData)
  }

  return { data, loading, save }
}
// Lightweight, SDK-free reads of public Firestore data via the REST API.
// Used for anonymous/public page loads so visitors never have to download
// the ~600kB Firestore SDK just to read a handful of public settings/content
// documents. Security is enforced the same way as the SDK — by Firestore
// Security Rules — these calls only work where firestore.rules already
// allows `read: if true`.

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

function valueToJs(value) {
  if (value == null) return null
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('mapValue' in value) return fieldsToObject(value.mapValue.fields || {})
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(valueToJs)
  if ('geoPointValue' in value) return value.geoPointValue
  return null
}

function fieldsToObject(fields) {
  const obj = {}
  for (const key in fields) obj[key] = valueToJs(fields[key])
  return obj
}

function docIdFromName(name) {
  return name.split('/').pop()
}

// One-time fetch of a single document. Returns null if it doesn't exist.
export async function restGetDoc(collectionName, docId) {
  const res = await fetch(`${BASE}/${collectionName}/${docId}?key=${API_KEY}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Firestore REST error [${collectionName}/${docId}]: ${res.status}`)
  const json = await res.json()
  return fieldsToObject(json.fields || {})
}

// One-time fetch of an entire collection (paginated internally).
export async function restGetCollection(collectionName) {
  const docs = []
  let pageToken
  do {
    const url = new URL(`${BASE}/${collectionName}`)
    url.searchParams.set('key', API_KEY)
    url.searchParams.set('pageSize', '300')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Firestore REST error [${collectionName}]: ${res.status}`)
    const json = await res.json()
    for (const d of json.documents || []) {
      docs.push({ ...fieldsToObject(d.fields || {}), id: docIdFromName(d.name) })
    }
    pageToken = json.nextPageToken
  } while (pageToken)
  return docs
}

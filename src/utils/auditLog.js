import { getCurrentIdToken } from '../firebase'

// The Apps Script webhook URL used to live in the client bundle (a
// VITE_-prefixed env var) — anyone could extract it and POST forged audit
// entries. This now goes through a Netlify Function that holds the real URL
// server-side and only forwards for an authenticated caller — see
// netlify/functions/audit-log.js.
export async function logAction({ admin, action, module, item, details }) {
  try {
    const idToken = await getCurrentIdToken()
    if (!idToken) return
    await fetch('/.netlify/functions/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ admin, action, module, item, details }),
    })
  } catch (err) {
    console.warn('Audit log failed:', err)
  }
}

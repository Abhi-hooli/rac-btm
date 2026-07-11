import { verifyCaller } from './_auth.js'

// Proxies to the Apps Script audit-log webhook. The real URL lives only in
// this server-side env var (AUDIT_LOG_URL, no VITE_ prefix) — see
// src/utils/auditLog.js for the client side of this.
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  const caller = await verifyCaller(event)
  if (!caller) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) }

  const url = process.env.AUDIT_LOG_URL
  if (url) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: event.body,
      })
    } catch (err) {
      console.warn('Audit log forward failed:', err)
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
}

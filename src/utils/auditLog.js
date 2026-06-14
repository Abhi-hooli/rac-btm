const AUDIT_URL = import.meta.env.VITE_AUDIT_LOG_URL

export async function logAction({ admin, action, module, item, details }) {
  if (!AUDIT_URL) return
  try {
    await fetch(AUDIT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin, action, module, item, details }),
    })
  } catch (err) {
    console.warn('Audit log failed:', err)
  }
}

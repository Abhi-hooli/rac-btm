const AUDIT_URL = import.meta.env.VITE_AUDIT_LOG_URL

export async function logAction({ admin, action, module, item, details }) {
  if (!AUDIT_URL) return
  try {
    // Get IP from public API
    let ip = '—'
    try {
      const res = await fetch('https://api.ipify.org?format=json')
      const data = await res.json()
      ip = data.ip
    } catch {}

    const params = new URLSearchParams({
      admin:   admin   || '—',
      action:  action  || '—',
      module:  module  || '—',
      item:    item    || '—',
      details: details || '—',
      ip,
    })
    await fetch(`${AUDIT_URL}?${params.toString()}`, {
      method: 'GET',
      mode:   'no-cors',
    })
  } catch (err) {
    console.warn('Audit log failed:', err)
  }
}
import { verifyCaller } from './_auth.js'

// Proxies to CallMeBot. The phone number + API key live only in these
// server-side env vars (CALLMEBOT_PHONE / CALLMEBOT_APIKEY, no VITE_
// prefix) — previously they were bundled into the public client JS, which
// let anyone extract the API key and spam that WhatsApp number directly.
// See src/utils/whatsapp.js for the client side of this.
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  const caller = await verifyCaller(event)
  if (!caller) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) }

  const phone = process.env.CALLMEBOT_PHONE
  const apiKey = process.env.CALLMEBOT_APIKEY
  if (!phone || !apiKey) return { statusCode: 200, body: JSON.stringify({ ok: true }) }

  let message = ''
  try {
    message = JSON.parse(event.body || '{}').message || ''
  } catch {
    // ignore — falls through to the empty-message check below
  }
  if (!message) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'message required' }) }

  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&apikey=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(message)}`
    await fetch(url)
  } catch (err) {
    console.warn('WhatsApp notify failed:', err)
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
}

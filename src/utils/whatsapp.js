import { getCurrentIdToken } from '../firebase'

// Free WhatsApp notifications via CallMeBot (https://www.callmebot.com/blog/free-api-whatsapp-messages/).
// Requires one-time opt-in: WhatsApp "I allow callmebot to send me messages"
// to +34 644 84 71 45, which replies with the apikey used below.
//
// The phone/apikey used to live in the client bundle (VITE_-prefixed env
// vars) — anyone could extract them from devtools and spam that number
// directly. This now goes through a Netlify Function that holds them
// server-side and only forwards for an authenticated caller — see
// netlify/functions/whatsapp-notify.js.
export async function sendWhatsAppNotification(message) {
  try {
    const idToken = await getCurrentIdToken()
    if (!idToken) return
    await fetch('/.netlify/functions/whatsapp-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ message }),
    })
  } catch (err) {
    console.warn('WhatsApp notification failed:', err)
  }
}

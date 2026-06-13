import type { Config } from '@netlify/functions'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { Resend } from 'resend'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db     = getFirestore()
const resend = new Resend(process.env.RESEND_API_KEY)
const GROUP_EMAIL = process.env.GOOGLE_GROUP_EMAIL!
const FROM_EMAIL  = process.env.FROM_EMAIL || 'reminders@rotaract.btm.org.in'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function formatTime(time24: string) {
  if (!time24) return ''
  const [h, m] = time24.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}
export default async () => {
  try {
    const now         = new Date()
    const in24hrs     = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const todayStr    = now.toISOString().split('T')[0]
    const tomorrowStr = in24hrs.toISOString().split('T')[0]

    const snapshot = await db.collection('events')
      .where('date', '==', tomorrowStr)
      .get()

    if (snapshot.empty) {
      console.log(`No events on ${tomorrowStr}`)
      return new Response('No events tomorrow', { status: 200 })
    }

    const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

    for (const event of events) {
      const alreadySent = await db.collection('remindersSent')
        .doc(`${event.id}_${todayStr}`)
        .get()

      if (alreadySent.exists) continue

      const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#D31145,#1a73e8);padding:32px 40px;text-align:center;">
          <p style="margin:0 0 6px;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:2px;text-transform:uppercase;">Rotaract Bengaluru BTM</p>
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">Event Reminder</h1>
          <p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Tomorrow's event — don't miss it!</p>
        </td></tr>
        ${event.image ? `<tr><td><img src="${event.image}" style="width:100%;height:220px;object-fit:cover;display:block;"></td></tr>` : ''}
        <tr><td style="padding:36px 40px;">
          ${event.type ? `<div style="display:inline-block;background:#fff3cd;color:#856404;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:16px;">${event.type}</div>` : ''}
          <h2 style="margin:0 0 24px;color:#1a1a2e;font-size:24px;font-weight:800;">${event.title}</h2>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:32px;">📅</td>
                <td><span style="color:#666;font-size:12px;">Date</span><br><strong style="color:#1a1a2e;font-size:15px;">${formatDate(event.date)}</strong></td>
              </tr></table>
            </td></tr>
            ${event.time ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;"><table cellpadding="0" cellspacing="0"><tr><td style="width:32px;">🕐</td><td><span style="color:#666;font-size:12px;">Time</span><br><strong style="color:#1a1a2e;font-size:15px;">${formatTime(event.time)}</strong></td></tr></table></td></tr>` : ''}
            ${event.location ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;"><table cellpadding="0" cellspacing="0"><tr><td style="width:32px;">📍</td><td><span style="color:#666;font-size:12px;">Location</span><br><strong style="color:#1a1a2e;font-size:15px;">${event.location}</strong></td></tr></table></td></tr>` : ''}
          </table>
          ${event.description ? `<p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.7;">${event.description}</p>` : ''}
        </td></tr>
        <tr><td style="background:#f8f9fa;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;color:#999;font-size:12px;">Rotaract Club of Bengaluru BTM — RID 3191</p>
          <p style="margin:6px 0 0;color:#bbb;font-size:11px;">Create. Lead. Inspire.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      GROUP_EMAIL,
        subject: `⏰ Tomorrow: ${event.title} — Rotaract BTM`,
        html,
      })

      await db.collection('remindersSent')
        .doc(`${event.id}_${todayStr}`)
        .set({ sentAt: new Date().toISOString(), eventId: event.id, eventTitle: event.title })

      console.log(`Reminder sent for: ${event.title}`)
    }

    return new Response(`Done`, { status: 200 })
  } catch (err) {
    console.error('Reminder error:', err)
    return new Response('Error', { status: 500 })
  }
}

export const config: Config = {
  schedule: '0 * * * *'
}
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'
import { logAction } from '../../utils/auditLog'

const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'
const cardClass  = 'bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/8 p-6'

// Auto Rotary monthly theme by month number
const ROTARY_MONTHLY_THEMES = {
  1:  'Vocational Service Month',
  2:  'Peacebuilding and Conflict Prevention Month',
  3:  'Water, Sanitation, and Hygiene Month',
  4:  'Environmental Month',
  5:  'Youth Service Month',
  6:  'Rotary Fellowships Month',
  7:  'Maternal and Child Health Month',
  8:  'Membership and New Club Development Month',
  9:  'Basic Education and Literacy Month',
  10: 'Economic and Community Development Month',
  11: 'The Rotary Foundation Month',
  12: 'Disease Prevention and Treatment Month',
}

function getMonthYear(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return {
    month:    d.toLocaleString('en-IN', { month: 'long' }),
    year:     d.getFullYear(),
    key:      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    monthNum: d.getMonth() + 1,
  }
}
function filterByMonth(items, field, key) {
  return items.filter(i => (i[field] || '').startsWith(key))
}
function getBirthdaysThisMonth(leaders, monthNum) {
  return leaders
    .filter(l => l.birthdate && (new Date(l.birthdate).getMonth() + 1) === monthNum)
    .map(l => ({ name: l.name || '', date: new Date(l.birthdate).getDate(), type: 'birthday' }))
}
function getWeddingAnniversariesThisMonth(leaders, monthNum) {
  return leaders
    .filter(l => l.weddingAnniversary && (new Date(l.weddingAnniversary).getMonth() + 1) === monthNum)
    .map(l => {
      const years = new Date().getFullYear() - new Date(l.weddingAnniversary).getFullYear()
      return { name: l.name || '', date: new Date(l.weddingAnniversary).getDate(), years, type: 'anniversary' }
    })
}

// ── HTML builder ───────────────────────────────────────────────────────────────
function buildNewsletterHTML(data) {
  const {
    month, year, heroImage, clubTagline,
    rotaryTheme, rotaryThemeNote,
    presidentName, presidentTitle, presidentPhoto, presidentMessage,
    additionalMessages,
    projects, events, stats,
    birthdays, anniversaries,
    sections, closingNote,
  } = data

  const show = k => sections[k] !== false

  const ord = n => {
    const s = ['th','st','nd','rd'], v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  const avatarDiv = (name, photo, size = 72, gradient = 'linear-gradient(135deg,#D31145,#1a1a2e)') =>
    photo
      ? `<div style="flex-shrink:0;width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;border:3px solid #D31145;box-shadow:0 0 0 3px rgba(211,17,69,0.1);"><img src="${photo}" crossorigin="anonymous" alt="${name}" style="width:100%;height:100%;object-fit:cover;" /></div>`
      : `<div style="flex-shrink:0;width:${size}px;height:${size}px;border-radius:50%;background:${gradient};display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-size:${Math.round(size * 0.37)}px;font-weight:800;color:#fff;border:3px solid rgba(211,17,69,0.2);">${(name || '?').charAt(0).toUpperCase()}</div>`

  const messageBlock = (name, title, photo, message) => `
    <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:16px;">
      ${avatarDiv(name, photo, 60)}
      <div style="flex:1;">
        <div style="font-family:'Sora',sans-serif;font-size:15px;font-weight:800;color:#1a1a2e;">${name || 'Member'}</div>
        <div style="font-size:12px;color:#D31145;font-weight:600;margin-top:2px;">${title || ''}</div>
      </div>
    </div>
    <div style="position:relative;padding:18px 22px;background:#fdf5f7;border-radius:12px;border-left:4px solid #D31145;">
      <div style="font-size:26px;color:#D31145;line-height:0.5;margin-bottom:8px;font-family:'Georgia',serif;opacity:0.35;">"</div>
      <div style="font-size:13px;color:#333;line-height:1.85;white-space:pre-line;">${message}</div>
      <div style="font-size:26px;color:#D31145;line-height:0.5;margin-top:8px;text-align:right;font-family:'Georgia',serif;opacity:0.35;">"</div>
    </div>`

  const projectCards = projects.slice(0, 6).map(p => `
    <div style="margin-bottom:28px;border-bottom:1px solid #f0f0f0;padding-bottom:28px;">
      ${p.newsletterImage ? `<div style="border-radius:10px;overflow:hidden;margin-bottom:14px;height:180px;"><img src="${p.newsletterImage}" crossorigin="anonymous" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;" /></div>` : ''}
      <div style="display:inline-block;background:#fff0f3;color:#D31145;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-bottom:8px;">${p.avenue || p.category || 'Service'}</div>
      <div style="font-size:17px;font-weight:800;color:#1a1a2e;line-height:1.3;margin-bottom:6px;">${p.title}</div>
      ${p.description ? `<div style="font-size:13px;color:#555;line-height:1.75;margin-bottom:10px;">${p.description.slice(0, 220)}${p.description.length > 220 ? '…' : ''}</div>` : ''}
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        ${p.participants  ? `<div style="font-size:12px;color:#888;"><span style="color:#D31145;margin-right:4px;">●</span>${p.participants} Participants</div>` : ''}
        ${p.volunteerHours? `<div style="font-size:12px;color:#888;"><span style="color:#D31145;margin-right:4px;">●</span>${p.volunteerHours}h Volunteered</div>` : ''}
        ${p.beneficiaries ? `<div style="font-size:12px;color:#888;"><span style="color:#D31145;margin-right:4px;">●</span>${p.beneficiaries} Beneficiaries</div>` : ''}
      </div>
    </div>`).join('')

  const eventCards = events.slice(0, 5).map(e => {
    const dt = new Date(e.date)
    return `
    <div style="display:flex;gap:16px;align-items:flex-start;padding:16px 0;border-bottom:1px solid #f0f0f0;">
      <div style="min-width:52px;text-align:center;background:#D31145;color:#fff;border-radius:10px;padding:8px 6px;flex-shrink:0;">
        <div style="font-size:22px;font-weight:900;line-height:1;">${dt.getDate()}</div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;">${dt.toLocaleString('en-IN', { month: 'short' })}</div>
      </div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:700;color:#1a1a2e;margin-bottom:4px;">${e.title}</div>
        <div style="font-size:12px;color:#888;display:flex;gap:12px;flex-wrap:wrap;">
          ${e.time     ? `<span>⏰ ${e.time}</span>` : ''}
          ${e.location ? `<span>📍 ${e.location}</span>` : ''}
          ${e.type     ? `<span style="color:#D31145;font-weight:600;">${e.type}</span>` : ''}
        </div>
        ${e.description ? `<div style="font-size:12px;color:#999;margin-top:5px;line-height:1.5;">${e.description.slice(0, 100)}${e.description.length > 100 ? '…' : ''}</div>` : ''}
      </div>
    </div>`
  }).join('')

  const bdayRows = birthdays.map(b => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(211,17,69,0.08);">
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#D31145,#ff6b8a);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">${(b.name || '?').charAt(0).toUpperCase()}</div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:700;color:#1a1a2e;">${b.name}</div>${b.date ? `<div style="font-size:11px;color:#D31145;">${ord(b.date)} ${month}</div>` : ''}</div>
      <div style="font-size:20px;">🎂</div>
    </div>`).join('')

  const annivRows = anniversaries.map(a => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(247,168,27,0.12);">
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#F7A81B,#f59e0b);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">${(a.name || '?').charAt(0).toUpperCase()}</div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:700;color:#1a1a2e;">${a.name}</div><div style="font-size:11px;color:#F7A81B;">${a.years > 0 ? `${a.years} year${a.years !== 1 ? 's' : ''} together 💍` : 'Anniversary this month!'}</div></div>
      <div style="font-size:20px;">💍</div>
    </div>`).join('')

  const extraMessages = (additionalMessages || [])
    .filter(m => m.message?.trim())
    .map(m => `
    <div style="padding:0 40px 28px;border-bottom:1px solid #f0f0f0;">
      ${messageBlock(m.name, m.title, m.photo, m.message)}
    </div>`).join('')

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rotaract BTM — ${month} ${year} Newsletter</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Arial,sans-serif;color:#333;background:#e8e8e8;-webkit-font-smoothing:antialiased}
  .outer{padding:28px 0;background:#e8e8e8}
  .wrapper{max-width:600px;margin:0 auto;background:#fff;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.12)}
  /* ── Print / PDF ── */
  @media print {
    @page { size:A4; margin:0; }
    html,body { background:#fff!important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .outer { padding:0!important; background:#fff!important; }
    .wrapper { max-width:100%!important; width:100%!important; box-shadow:none!important; border-radius:0!important; }
    .no-break { page-break-inside:avoid; break-inside:avoid; }
  }
</style>
</head><body><div class="outer"><div class="wrapper">

<!-- HEADER -->
<div style="position:relative;min-height:280px;overflow:hidden;display:flex;align-items:flex-end;">
  <div style="position:absolute;inset:0;background:linear-gradient(135deg,#0d1b3e 0%,#1a1a2e 50%,#2a1a3e 100%);"></div>
  ${heroImage ? `<img src="${heroImage}" crossorigin="anonymous" alt="Cover" onerror="this.style.display='none'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />` : ''}
  <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(10,15,40,0.97) 0%,rgba(10,15,40,0.5) 55%,rgba(10,15,40,0.1) 100%);"></div>
  <div style="position:relative;padding:44px 40px 36px;width:100%;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <div style="height:2px;width:32px;background:#D31145;border-radius:1px;"></div>
      <div style="font-size:9px;color:rgba(255,255,255,0.45);letter-spacing:3px;text-transform:uppercase;font-weight:600;">Rotary International District 3191</div>
    </div>
    <div style="font-family:'Sora',sans-serif;font-size:34px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:6px;">Rotaract<br>Bengaluru BTM</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:14px;">${clubTagline || 'Create. Lead. Inspire.'}</div>
    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:6px 14px;">
      <div style="width:6px;height:6px;border-radius:50%;background:#F7A81B;"></div>
      <div style="font-size:12px;color:rgba(255,255,255,0.8);font-weight:600;">${month} ${year} Edition</div>
    </div>
  </div>
</div>

${show('rotaryTheme') && rotaryTheme ? `
<!-- ROTARY THEME -->
<div class="no-break" style="background:linear-gradient(135deg,#F7A81B,#f59e0b);padding:18px 40px;">
  <div style="font-size:9px;color:rgba(255,255,255,0.75);letter-spacing:2.5px;text-transform:uppercase;font-weight:700;margin-bottom:4px;">✦ Rotary Monthly Theme — ${month}</div>
  <div style="font-family:'Sora',sans-serif;font-size:17px;font-weight:800;color:#fff;">"${rotaryTheme}"</div>
  ${rotaryThemeNote ? `<div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">${rotaryThemeNote}</div>` : ''}
</div>` : ''}

${show('stats') ? `
<!-- STATS -->
<div style="display:grid;grid-template-columns:repeat(4,1fr);background:#D31145;">
  ${stats.map((s, i) => `<div style="padding:18px 10px;text-align:center;${i < stats.length - 1 ? 'border-right:1px solid rgba(255,255,255,0.15);' : ''}">
    <div style="font-family:'Sora',sans-serif;font-size:24px;font-weight:900;color:#fff;line-height:1;">${s.value}</div>
    <div style="font-size:9px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.8px;margin-top:4px;">${s.label}</div>
  </div>`).join('')}
</div>` : ''}

${show('presidentCorner') && presidentMessage ? `
<!-- PRESIDENT'S CORNER -->
<div class="no-break" style="padding:36px 40px;border-bottom:1px solid #f0f0f0;">
  <div style="font-size:9px;color:#D31145;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:6px;">Leadership</div>
  <div style="font-family:'Sora',sans-serif;font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:20px;">President's Corner</div>
  ${messageBlock(presidentName || 'Club President', presidentTitle || 'President, Rotaract BTM', presidentPhoto, presidentMessage)}
</div>` : ''}

${show('presidentCorner') && extraMessages ? extraMessages : ''}

${show('projects') && projects.length > 0 ? `
<!-- PROJECTS -->
<div style="padding:36px 40px;border-bottom:1px solid #f0f0f0;">
  <div style="font-size:9px;color:#D31145;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:6px;">This Month</div>
  <div style="font-family:'Sora',sans-serif;font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:20px;">Project Highlights</div>
  ${projectCards}
</div>` : ''}

${show('events') && events.length > 0 ? `
<!-- EVENTS -->
<div style="padding:36px 40px;border-bottom:1px solid #f0f0f0;background:#fafafa;">
  <div style="font-size:9px;color:#D31145;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:6px;">Don't Miss</div>
  <div style="font-family:'Sora',sans-serif;font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:16px;">Upcoming Events</div>
  ${eventCards}
</div>` : ''}

${show('celebrations') && (birthdays.length > 0 || anniversaries.length > 0) ? `
<!-- CELEBRATIONS -->
<div style="padding:36px 40px;border-bottom:1px solid #f0f0f0;">
  <div style="font-size:9px;color:#D31145;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:6px;">Celebrating Our Members</div>
  <div style="font-family:'Sora',sans-serif;font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:20px;">Birthdays &amp; Anniversaries</div>
  ${birthdays.length > 0 ? `
  <div style="margin-bottom:24px;">
    <div style="font-size:10px;font-weight:700;color:#D31145;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">🎂 Birthdays this month</div>
    ${bdayRows}
  </div>` : ''}
  ${anniversaries.length > 0 ? `
  <div>
    <div style="font-size:10px;font-weight:700;color:#F7A81B;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">💍 Wedding Anniversaries</div>
    ${annivRows}
  </div>` : ''}
</div>` : ''}

${closingNote ? `
<!-- CLOSING THOUGHT -->
<div style="padding:36px 40px;background:#f8f9fa;border-bottom:1px solid #f0f0f0;text-align:center;">
  <div style="font-family:'Sora',sans-serif;font-size:15px;font-weight:700;color:#1a1a2e;margin-bottom:10px;">A Thought to Carry Forward</div>
  <div style="font-size:14px;color:#555;line-height:1.85;font-style:italic;max-width:440px;margin:0 auto;">${closingNote}</div>
</div>` : ''}

<!-- FOOTER -->
<div style="background:#1a1a2e;padding:36px 40px;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
    <div style="width:4px;height:28px;background:#D31145;border-radius:2px;flex-shrink:0;"></div>
    <div>
      <div style="font-family:'Sora',sans-serif;font-size:16px;font-weight:800;color:#fff;">Rotaract Club of Bengaluru BTM</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:2px;">Rotary International District 3191</div>
    </div>
  </div>
  <div style="height:1px;background:rgba(255,255,255,0.08);margin:20px 0;"></div>
  <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px;">
    <div style="font-size:12px;color:rgba(255,255,255,0.4);">📧 racbtm@gmail.com</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.4);">📸 @rotaractbtm</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.4);">💼 Rotaract BTM on LinkedIn</div>
  </div>
  <div style="font-size:11px;color:rgba(255,255,255,0.2);">${month} ${year} · Create. Lead. Inspire.</div>
</div>

</div></div></body></html>`
}

// ── A4 Magazine PDF builder ────────────────────────────────────────────────────
function buildPDFHTML(data) {
  const { month, year, heroImage, clubTagline, rotaryTheme, rotaryThemeNote, presidentName, presidentTitle, presidentPhoto, presidentMessage, additionalMessages, projects, events, stats, birthdays, anniversaries, sections, closingNote } = data
  const show = k => sections[k] !== false

  const ord = n => { const s=['th','st','nd','rd'],v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]) }

  const avatar = (name, photo, size=56, grad='linear-gradient(135deg,#D31145,#1a1a2e)') =>
    photo
      ? `<img src="${photo}" crossorigin="anonymous" alt="${name}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2.5px solid #D31145;flex-shrink:0;" />`
      : `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${grad};color:#fff;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*.38)}px;font-weight:800;flex-shrink:0;">${(name||'?').charAt(0).toUpperCase()}</div>`

  const msgBlock = (name, title, photo, msg) => `
    <div style="page-break-inside:avoid;break-inside:avoid;margin-bottom:22px;">
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px;">
        ${avatar(name, photo, 52)}
        <div>
          <div style="font-family:'Sora',sans-serif;font-size:14px;font-weight:800;color:#1a1a2e;">${name||'Member'}</div>
          <div style="font-size:11px;color:#D31145;font-weight:600;margin-top:1px;">${title||''}</div>
        </div>
      </div>
      <div style="padding:16px 20px;background:#fdf5f7;border-radius:10px;border-left:4px solid #D31145;">
        <div style="font-size:22px;color:#D31145;line-height:0.5;margin-bottom:6px;font-family:Georgia,serif;opacity:0.3;">"</div>
        <div style="font-size:12.5px;color:#333;line-height:1.85;white-space:pre-line;">${msg}</div>
      </div>
    </div>`

  const projCards = projects.slice(0,6).map(p=>`
    <div style="page-break-inside:avoid;break-inside:avoid;margin-bottom:24px;border-bottom:1px solid #f0f0f0;padding-bottom:24px;">
      ${p.newsletterImage?`<div style="height:160px;border-radius:8px;overflow:hidden;margin-bottom:12px;"><img src="${p.newsletterImage}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;" /></div>`:''}
      <div style="display:inline-block;background:#fff0f3;color:#D31145;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:2px 8px;border-radius:20px;margin-bottom:6px;">${p.avenue||p.category||'Service'}</div>
      <div style="font-family:'Sora',sans-serif;font-size:15px;font-weight:800;color:#1a1a2e;margin-bottom:5px;">${p.title}</div>
      ${p.description?`<div style="font-size:12px;color:#555;line-height:1.7;">${p.description.slice(0,200)}${p.description.length>200?'…':''}</div>`:''}
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;">
        ${p.participants?`<span style="font-size:11px;color:#888;"><span style="color:#D31145;">●</span> ${p.participants} Participants</span>`:''}
        ${p.volunteerHours?`<span style="font-size:11px;color:#888;"><span style="color:#D31145;">●</span> ${p.volunteerHours}h Volunteered</span>`:''}
      </div>
    </div>`).join('')

  const evCards = events.slice(0,5).map(e=>{
    const dt=new Date(e.date)
    return `<div style="display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #f0f0f0;page-break-inside:avoid;">
      <div style="min-width:44px;text-align:center;background:#D31145;color:#fff;border-radius:8px;padding:7px 5px;flex-shrink:0;">
        <div style="font-size:19px;font-weight:900;line-height:1;">${dt.getDate()}</div>
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;">${dt.toLocaleString('en-IN',{month:'short'})}</div>
      </div>
      <div>
        <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:3px;">${e.title}</div>
        <div style="font-size:11px;color:#888;">${e.time?`⏰ ${e.time} &nbsp;`:''}${e.location?`📍 ${e.location}`:''}</div>
      </div>
    </div>`}).join('')

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Arial,sans-serif;color:#333;background:#fff;-webkit-font-smoothing:antialiased}
  @page{size:A4 portrait;margin:0}
  html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cover{width:794px;height:1123px;position:relative;overflow:hidden;background:#0d1b3e;page-break-after:always;break-after:page}
  .content{width:794px;padding:0}
  .section{padding:32px 48px;border-bottom:1px solid #eee;page-break-inside:avoid;break-inside:avoid}
  .running-head{display:flex;align-items:center;justify-content:space-between;padding:16px 48px;background:#1a1a2e;}
  img{-webkit-print-color-adjust:exact;print-color-adjust:exact}
</style>
</head><body>

<!-- ═══ COVER PAGE ═══ -->
<div class="cover">
  <!-- base dark bg always present so cover looks good even if image fails to load -->
  <div style="position:absolute;inset:0;background:linear-gradient(135deg,#0d1b3e 0%,#1a1a2e 60%,#2a1a3e 100%);"></div>
  ${heroImage?`<img src="${heroImage}" crossorigin="anonymous" onerror="this.style.display='none'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />`:''}
  <!-- gradient overlay -->
  <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(10,15,40,0.15) 0%,rgba(10,15,40,0.25) 35%,rgba(10,15,40,0.88) 65%,rgba(10,15,40,0.99) 100%);"></div>
  <!-- diagonal accent -->
  <div style="position:absolute;top:0;right:0;width:220px;height:220px;background:linear-gradient(135deg,rgba(211,17,69,0.35),transparent);"></div>
  <!-- top bar -->
  <div style="position:absolute;top:32px;left:48px;right:48px;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:3px;height:18px;background:#D31145;border-radius:1px;"></div>
      <div style="font-size:10px;color:rgba(255,255,255,0.65);letter-spacing:2.5px;text-transform:uppercase;font-weight:600;">Rotaract Club of Bengaluru BTM</div>
    </div>
    <div style="font-size:9px;color:rgba(255,255,255,0.45);letter-spacing:2px;text-transform:uppercase;">R.I. District 3191</div>
  </div>
  <!-- main cover content -->
  <div style="position:absolute;bottom:0;left:0;right:0;padding:0 48px 52px;">
    <!-- issue badge -->
    <div style="display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,0.2);border-radius:20px;padding:6px 16px;margin-bottom:28px;background:rgba(255,255,255,0.08);">
      <div style="width:6px;height:6px;border-radius:50%;background:#F7A81B;"></div>
      <div style="font-size:10px;color:rgba(255,255,255,0.75);letter-spacing:2.5px;text-transform:uppercase;font-weight:600;">Monthly Newsletter</div>
    </div>
    <!-- giant month + year -->
    <div style="font-family:'Sora',sans-serif;font-size:80px;font-weight:900;color:#fff;line-height:0.88;letter-spacing:-3px;margin-bottom:16px;">${month}<br><span style="color:#F7A81B;">${year}</span></div>
    <!-- tagline -->
    <div style="font-size:13px;color:rgba(255,255,255,0.5);letter-spacing:3.5px;text-transform:uppercase;margin-bottom:36px;">${clubTagline||'Create. Lead. Inspire.'}</div>
    <!-- divider -->
    <div style="height:1px;background:linear-gradient(90deg,rgba(255,255,255,0.25),rgba(255,255,255,0.05));margin-bottom:28px;"></div>
    <!-- theme + stats row -->
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;">
      ${rotaryTheme?`<div>
        <div style="font-size:8px;color:#F7A81B;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin-bottom:5px;">✦ Rotary Monthly Theme</div>
        <div style="font-family:'Sora',sans-serif;font-size:16px;font-weight:800;color:#fff;line-height:1.3;max-width:320px;">"${rotaryTheme}"</div>
        ${rotaryThemeNote?`<div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;">${rotaryThemeNote}</div>`:''}
      </div>`:'<div></div>'}
      ${show('stats')?`<div style="display:flex;gap:28px;text-align:center;flex-shrink:0;">
        ${stats.filter(s=>s.value&&s.value!=='—').map(s=>`
        <div>
          <div style="font-family:'Sora',sans-serif;font-size:22px;font-weight:900;color:#fff;line-height:1;">${s.value}</div>
          <div style="font-size:8px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.5px;margin-top:3px;">${s.label}</div>
        </div>`).join('')}
      </div>`:''}
    </div>
    <!-- red bottom accent -->
    <div style="margin-top:28px;height:3px;background:linear-gradient(90deg,#D31145,#F7A81B,transparent);border-radius:2px;"></div>
  </div>
</div>

<!-- ═══ CONTENT PAGES ═══ -->
<div class="content">

  <!-- Running header -->
  <div class="running-head">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:3px;height:16px;background:#D31145;border-radius:1px;"></div>
      <div style="font-family:'Sora',sans-serif;font-size:12px;font-weight:800;color:#fff;">Rotaract Bengaluru BTM</div>
    </div>
    <div style="font-size:10px;color:rgba(255,255,255,0.45);">${month} ${year} Newsletter</div>
  </div>

  ${show('rotaryTheme')&&rotaryTheme?`
  <!-- Rotary theme strip -->
  <div style="background:linear-gradient(135deg,#F7A81B,#f59e0b);padding:14px 48px;">
    <div style="font-size:8px;color:rgba(255,255,255,0.75);letter-spacing:2.5px;text-transform:uppercase;font-weight:700;margin-bottom:3px;">✦ Rotary Monthly Theme — ${month}</div>
    <div style="font-family:'Sora',sans-serif;font-size:16px;font-weight:800;color:#fff;">"${rotaryTheme}"</div>
  </div>`:''}

  ${show('stats')?`
  <!-- Stats strip -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);background:#D31145;">
    ${stats.map((s,i)=>`<div style="padding:16px 10px;text-align:center;${i<3?'border-right:1px solid rgba(255,255,255,0.15);':''}">
      <div style="font-family:'Sora',sans-serif;font-size:22px;font-weight:900;color:#fff;line-height:1;">${s.value}</div>
      <div style="font-size:8px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.8px;margin-top:3px;">${s.label}</div>
    </div>`).join('')}
  </div>`:''}

  ${show('presidentCorner')&&presidentMessage?`
  <!-- President's corner -->
  <div class="section">
    <div style="font-size:8px;color:#D31145;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:5px;">Leadership</div>
    <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:#1a1a2e;margin-bottom:18px;">President's Corner</div>
    ${msgBlock(presidentName||'Club President', presidentTitle||'President, Rotaract BTM', presidentPhoto, presidentMessage)}
    ${(additionalMessages||[]).filter(m=>m.message?.trim()).map(m=>msgBlock(m.name,m.title,m.photo,m.message)).join('')}
  </div>`:''}

  ${show('projects')&&projects.length>0?`
  <!-- Projects -->
  <div class="section">
    <div style="font-size:8px;color:#D31145;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:5px;">This Month</div>
    <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:#1a1a2e;margin-bottom:18px;">Project Highlights</div>
    ${projCards}
  </div>`:''}

  ${show('events')&&events.length>0?`
  <!-- Events -->
  <div class="section" style="background:#fafafa;">
    <div style="font-size:8px;color:#D31145;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:5px;">Don't Miss</div>
    <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:#1a1a2e;margin-bottom:14px;">Upcoming Events</div>
    ${evCards}
  </div>`:''}

  ${show('celebrations')&&(birthdays.length>0||anniversaries.length>0)?`
  <!-- Celebrations -->
  <div class="section">
    <div style="font-size:8px;color:#D31145;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:5px;">Celebrating Our Members</div>
    <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:#1a1a2e;margin-bottom:16px;">Birthdays &amp; Anniversaries</div>
    ${birthdays.length>0?`
    <div style="margin-bottom:20px;">
      <div style="font-size:9px;font-weight:700;color:#D31145;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">🎂 Birthdays this month</div>
      ${birthdays.map(b=>`<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(211,17,69,0.07);">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#D31145,#ff6b8a);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">${(b.name||'?').charAt(0).toUpperCase()}</div>
        <div style="flex:1;"><div style="font-size:12px;font-weight:700;color:#1a1a2e;">${b.name}</div>${b.date?`<div style="font-size:10px;color:#D31145;">${ord(b.date)} ${month}</div>`:''}</div>
        <div style="font-size:18px;">🎂</div>
      </div>`).join('')}
    </div>`:''}
    ${anniversaries.length>0?`
    <div>
      <div style="font-size:9px;font-weight:700;color:#F7A81B;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">💍 Wedding Anniversaries</div>
      ${anniversaries.map(a=>`<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(247,168,27,0.1);">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#F7A81B,#f59e0b);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">${(a.name||'?').charAt(0).toUpperCase()}</div>
        <div style="flex:1;"><div style="font-size:12px;font-weight:700;color:#1a1a2e;">${a.name}</div><div style="font-size:10px;color:#F7A81B;">${a.years>0?`${a.years} year${a.years!==1?'s':''} together 💍`:'Anniversary this month!'}</div></div>
        <div style="font-size:18px;">💍</div>
      </div>`).join('')}
    </div>`:''}
  </div>`:''}

  ${closingNote?`
  <!-- Closing thought -->
  <div class="section" style="background:#f8f9fa;text-align:center;">
    <div style="font-family:'Sora',sans-serif;font-size:14px;font-weight:700;color:#1a1a2e;margin-bottom:8px;">A Thought to Carry Forward</div>
    <div style="font-size:13px;color:#555;line-height:1.85;font-style:italic;max-width:480px;margin:0 auto;">${closingNote}</div>
  </div>`:''}

  <!-- Footer -->
  <div style="background:#1a1a2e;padding:28px 48px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
      <div style="width:3px;height:24px;background:#D31145;border-radius:2px;flex-shrink:0;"></div>
      <div>
        <div style="font-family:'Sora',sans-serif;font-size:14px;font-weight:800;color:#fff;">Rotaract Club of Bengaluru BTM</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;">Rotary International District 3191</div>
      </div>
    </div>
    <div style="height:1px;background:rgba(255,255,255,0.08);margin:14px 0;"></div>
    <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:12px;">
      <div style="font-size:11px;color:rgba(255,255,255,0.4);">📧 racbtm@gmail.com</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);">📸 @rotaractbtm</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);">💼 Rotaract BTM on LinkedIn</div>
    </div>
    <div style="font-size:10px;color:rgba(255,255,255,0.2);">${month} ${year} · Create. Lead. Inspire.</div>
  </div>

</div>
</body></html>`
}

// ── Toggle Switch ──────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-rotary-blue' : 'bg-gray-200 dark:bg-white/10'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  )
}

// ── Accordion section ──────────────────────────────────────────────────────────
function AccordionSection({ title, icon, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-100 dark:border-white/10 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
        <div className="flex items-center gap-2.5">
          <span>{icon}</span>
          <span className="font-semibold text-sm text-rotary-charcoal dark:text-white">{title}</span>
          {badge != null && <span className="text-xs bg-rotary-blue/10 text-rotary-blue px-2 py-0.5 rounded-full font-semibold">{badge}</span>}
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 py-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function NewsletterGenerator({ isAdmin, onBack }) {
  const { data: allProjects = [] } = useCollection('projects')
  const { data: events = [] }      = useCollection('events')
  const { data: leaders = [] }     = useCollection('leaders')
  const { data: meetings = [] }    = useCollection('attendance_meetings')
  const { save: saveBlog }         = useCollection('blogs')

  const [monthOffset, setMonthOffset] = useState(0)
  const [previewHTML, setPreviewHTML] = useState('')
  const [pushing,     setPushing]     = useState(false)
  const [pushed,      setPushed]      = useState(false)
  const [exporting,   setExporting]   = useState(false)
  const [shareURL,    setShareURL]    = useState('')
  const [copied,      setCopied]      = useState(false)

  const { month, year, key: monthKey, monthNum } = getMonthYear(monthOffset)

  // Header
  const [heroImage,   setHeroImage]   = useState('')
  const [clubTagline, setClubTagline] = useState('Create. Lead. Inspire.')
  const [customTitle, setCustomTitle] = useState('')

  // Rotary theme — auto-filled by month, user can override
  const [rotaryTheme,     setRotaryTheme]     = useState(ROTARY_MONTHLY_THEMES[monthNum] || '')
  const [rotaryThemeNote, setRotaryThemeNote] = useState('')

  useEffect(() => {
    setRotaryTheme(ROTARY_MONTHLY_THEMES[monthNum] || '')
  }, [monthNum])

  // President
  const [presidentName,    setPresidentName]    = useState('')
  const [presidentTitle,   setPresidentTitle]   = useState('President, Rotaract BTM')
  const [presidentPhoto,   setPresidentPhoto]   = useState('')
  const [presidentMessage, setPresidentMessage] = useState('')

  // Additional messages (secretary, director, etc.)
  const [additionalMessages, setAdditionalMessages] = useState([])
  const addExtraMessage = () => setAdditionalMessages(p => [...p, { id: Date.now(), name: '', title: '', photo: '', message: '' }])
  const updateExtraMsg  = (id, field, val) => setAdditionalMessages(p => p.map(m => m.id === id ? { ...m, [field]: val } : m))
  const removeExtraMsg  = id => setAdditionalMessages(p => p.filter(m => m.id !== id))

  // Closing note
  const [closingNote, setClosingNote] = useState('')

  // Section toggles
  const [sections, setSections] = useState({
    rotaryTheme: true, stats: true, presidentCorner: true,
    projects: true, events: true, celebrations: true,
  })
  const toggleSection = key => setSections(s => ({ ...s, [key]: !s[key] }))

  // Auto-pulled data
  const monthProjects  = filterByMonth(allProjects, 'startDate', monthKey)
  const monthMeetings  = filterByMonth(meetings, 'date', monthKey)
  const upcomingEvents = events
    .filter(e => e.date && new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)
  const volunteerHours = monthProjects.reduce((s, p) => s + Number(p.volunteerHours || 0), 0)
  const participants   = monthProjects.reduce((s, p) => s + Number(p.participants || 0), 0)

  // Per-project images
  const [projectImages, setProjectImages] = useState({})
  const setProjectImage = (id, url) => setProjectImages(prev => ({ ...prev, [id]: url }))

  // Celebrations
  const autoBdays  = getBirthdaysThisMonth(leaders, monthNum)
  const autoAnnivs = getWeddingAnniversariesThisMonth(leaders, monthNum)
  const [editedBdays,   setEditedBdays]   = useState(null)
  const [editedAnnivs,  setEditedAnnivs]  = useState(null)
  const [newBdayName,   setNewBdayName]   = useState('')
  const [newAnnivName,  setNewAnnivName]  = useState('')
  const [newAnnivYears, setNewAnnivYears] = useState('')
  const birthdays     = editedBdays  ?? autoBdays
  const anniversaries = editedAnnivs ?? autoAnnivs
  const initBdays  = () => { if (!editedBdays)  setEditedBdays([...autoBdays]) }
  const initAnnivs = () => { if (!editedAnnivs) setEditedAnnivs([...autoAnnivs]) }
  const addBday    = () => { if (!newBdayName.trim()) return; initBdays(); setEditedBdays(p => [...(p || autoBdays), { name: newBdayName.trim(), date: '', type: 'birthday' }]); setNewBdayName('') }
  const removeBday = i => { initBdays();  setEditedBdays(p  => (p || autoBdays).filter((_, j) => j !== i)) }
  const addAnniv   = () => { if (!newAnnivName.trim()) return; initAnnivs(); setEditedAnnivs(p => [...(p || autoAnnivs), { name: newAnnivName.trim(), years: parseInt(newAnnivYears) || 0, date: '', type: 'anniversary' }]); setNewAnnivName(''); setNewAnnivYears('') }
  const removeAnniv= i => { initAnnivs(); setEditedAnnivs(p => (p || autoAnnivs).filter((_, j) => j !== i)) }

  const stats = [
    { label: 'Projects',   value: monthProjects.length  || '—' },
    { label: 'Events',     value: upcomingEvents.length || '—' },
    { label: 'Members',    value: leaders.length        || '—' },
    { label: 'Vol. Hours', value: volunteerHours > 0 ? `${volunteerHours}h` : (monthMeetings.length || '—') },
  ]

  const buildData = useCallback(() => ({
    month, year, heroImage, clubTagline,
    rotaryTheme, rotaryThemeNote,
    presidentName, presidentTitle, presidentPhoto, presidentMessage,
    additionalMessages,
    projects: monthProjects.map(p => ({ ...p, newsletterImage: projectImages[p.id] || p.image || '' })),
    events: upcomingEvents,
    stats, birthdays, anniversaries,
    sections, closingNote,
  }), [month, year, heroImage, clubTagline, rotaryTheme, rotaryThemeNote, presidentName, presidentTitle, presidentPhoto, presidentMessage, additionalMessages, monthProjects, projectImages, upcomingEvents, stats, birthdays, anniversaries, sections, closingNote])

  const handleGenerate = () => {
    const html = buildNewsletterHTML(buildData())
    setPreviewHTML(html)
  }

  const loadHtml2pdf = () =>
    new Promise((resolve, reject) => {
      if (window.html2pdf) { resolve(); return }
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      s.onload = resolve; s.onerror = reject
      document.head.appendChild(s)
    })

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      await loadHtml2pdf()
      const data = buildData()
      const pdfHtml = buildPDFHTML(data)

      const wrap = document.createElement('div')
      wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;'
      wrap.innerHTML = pdfHtml
      document.body.appendChild(wrap)

      await window.html2pdf().set({
        margin:      0,
        filename:    `Rotaract-BTM-${data.month}-${data.year}-Newsletter.pdf`,
        image:       { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale:           2,
          useCORS:         true,
          allowTaint:      true,
          logging:         false,
          backgroundColor: '#ffffff',
          width:           794,
          windowWidth:     794,
        },
        jsPDF:     { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from(wrap).save()

      document.body.removeChild(wrap)
    } catch (e) {
      console.error('PDF export failed:', e)
      alert('PDF export failed. Please try Download HTML instead.')
    }
    setExporting(false)
  }

  const handleDownloadHTML = () => {
    const data = buildData()
    const html = buildNewsletterHTML(data)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = `Rotaract-BTM-${data.month}-${data.year}-Newsletter.html`
    a.click()
  }

  const handlePushToBlog = async () => {
    setPushing(true)
    const slug  = `newsletter-${monthKey}`
    const html  = buildNewsletterHTML(buildData())
    const title = customTitle || `${month} ${year} Newsletter — Rotaract BTM`
    await saveBlog({
      id:           `newsletter-${monthKey}-${Date.now()}`,
      title,
      slug,
      excerpt:      `Rotaract Bengaluru BTM's monthly newsletter for ${month} ${year}. ${monthProjects.length} projects · ${upcomingEvents.length} upcoming events.`,
      content:      html,
      coverImage:   heroImage || '',
      category:     'Newsletter',
      author:       'Rotaract BTM',
      published:    true,
      publishedAt:  new Date().toISOString(),
      createdAt:    new Date().toISOString(),
      isNewsletter: true,
    })
    logAction({ admin: 'admin', action: 'PUBLISH', module: 'Newsletter', item: title, details: `Newsletter pushed for ${month} ${year}` })
    const url = `${window.location.origin}/blog#blog/${slug}`
    setShareURL(url)
    setPushing(false)
    setPushed(true)
  }

  const copyShareURL = () => {
    navigator.clipboard.writeText(shareURL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-rotary-navy pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div className="flex items-start gap-3 mb-8" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={onBack} className="mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#D31145' }} />
              <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: '#D31145' }}>Newsletter Generator</p>
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal dark:text-white">Monthly Newsletter</h2>
            <p className="text-sm text-gray-400 dark:text-white/40 mt-1">Build · Preview · Export / Publish</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_440px] gap-6 items-start">

          {/* ══ LEFT: CONTROLS ══ */}
          <div className="space-y-3">

            {/* Month selector */}
            <motion.div className={cardClass} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3">
                <button onClick={() => setMonthOffset(o => o - 1)}
                  className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex-1 text-center">
                  <p className="font-display font-bold text-xl text-rotary-charcoal dark:text-white">{month} {year}</p>
                  <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">{monthProjects.length} projects · {monthMeetings.length} meetings · {upcomingEvents.length} upcoming events</p>
                </div>
                <button onClick={() => setMonthOffset(o => o + 1)}
                  className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </motion.div>

            {/* Section toggles */}
            <motion.div className={cardClass} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <h3 className="font-display font-bold text-sm mb-3">Sections to include</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'rotaryTheme',     label: 'Rotary Theme' },
                  { key: 'stats',           label: 'Stats Strip' },
                  { key: 'presidentCorner', label: "Messages" },
                  { key: 'projects',        label: 'Project Highlights' },
                  { key: 'events',          label: 'Upcoming Events' },
                  { key: 'celebrations',    label: 'Birthdays & Anniversaries' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04]">
                    <span className="text-sm text-rotary-charcoal dark:text-white">{label}</span>
                    <Toggle value={sections[key]} onChange={() => toggleSection(key)} />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Branding */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
              <AccordionSection title="Header & Branding" icon="🖼" defaultOpen>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Cover Image URL</label>
                  <input className={inputClass} placeholder="https://your-cover-photo.jpg" value={heroImage} onChange={e => setHeroImage(e.target.value)} />
                  {heroImage && (
                    <div className="mt-2">
                      <img
                        src={heroImage} alt="" crossOrigin="anonymous"
                        className="w-full h-24 object-cover rounded-lg"
                        onError={e => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.classList.remove('hidden')
                        }}
                        onLoad={e => {
                          e.target.style.display = ''
                          e.target.nextSibling.classList.add('hidden')
                        }}
                      />
                      <p className="hidden text-xs text-amber-600 dark:text-amber-400 mt-1 leading-relaxed">
                        ⚠️ Image blocked by CORS — use <strong>Firebase Storage</strong>, Google Drive (shared), or Cloudinary. The preview and PDF may not show this image.
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Club Tagline</label>
                  <input className={inputClass} value={clubTagline} onChange={e => setClubTagline(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Newsletter Title (for Blog only)</label>
                  <input className={inputClass} placeholder={`${month} ${year} Newsletter — Rotaract BTM`} value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
                </div>
              </AccordionSection>
            </motion.div>

            {/* Rotary theme — auto-filled */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
              <AccordionSection title="Rotary Monthly Theme" icon="✦" badge={rotaryTheme ? '✓' : null} defaultOpen>
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rotary-gold/10 border border-rotary-gold/20">
                  <span className="text-rotary-gold mt-0.5">✦</span>
                  <p className="text-xs text-rotary-charcoal dark:text-white/70">Auto-filled for <strong>{month}</strong> — you can edit if needed</p>
                </div>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Theme</label>
                  <input className={inputClass} value={rotaryTheme} onChange={e => setRotaryTheme(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Context / note (optional)</label>
                  <input className={inputClass} placeholder="e.g. RI President's theme for 2025–26" value={rotaryThemeNote} onChange={e => setRotaryThemeNote(e.target.value)} />
                </div>
              </AccordionSection>
            </motion.div>

            {/* President's corner + additional messages */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
              <AccordionSection title="Messages" icon="🎙" badge={(presidentMessage ? 1 : 0) + additionalMessages.filter(m => m.message).length || null} defaultOpen>

                {/* President */}
                <div className="pb-4 border-b border-gray-100 dark:border-white/10">
                  <p className="text-xs font-bold text-rotary-charcoal dark:text-white uppercase tracking-wider mb-3" style={{ color: '#D31145' }}>President's Message</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Name</label>
                      <input className={inputClass} placeholder="Rtr. Name" value={presidentName} onChange={e => setPresidentName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Title</label>
                      <input className={inputClass} placeholder="President, Rotaract BTM" value={presidentTitle} onChange={e => setPresidentTitle(e.target.value)} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Photo URL (optional)</label>
                    <div className="flex gap-2">
                      <input className={inputClass} placeholder="https://photo-url.jpg" value={presidentPhoto} onChange={e => setPresidentPhoto(e.target.value)} />
                      {presidentPhoto && <img src={presidentPhoto} alt="" className="w-10 h-10 rounded-full object-cover border-2 flex-shrink-0" style={{ borderColor: '#D31145' }} onError={e => e.target.style.display = 'none'} />}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Message</label>
                    <textarea className={inputClass} rows={4} placeholder="Write the president's message..." value={presidentMessage} onChange={e => setPresidentMessage(e.target.value)} />
                  </div>
                </div>

                {/* Additional messages */}
                {additionalMessages.map((m, idx) => (
                  <div key={m.id} className="pb-4 border-b border-gray-100 dark:border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-rotary-blue">Member #{idx + 1}</p>
                      <button onClick={() => removeExtraMsg(m.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Remove</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Name</label>
                        <input className={inputClass} placeholder="Rtr. Name" value={m.name} onChange={e => updateExtraMsg(m.id, 'name', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Title / Role</label>
                        <input className={inputClass} placeholder="Secretary, Director..." value={m.title} onChange={e => updateExtraMsg(m.id, 'title', e.target.value)} />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Photo URL (optional)</label>
                      <div className="flex gap-2">
                        <input className={inputClass} placeholder="https://photo-url.jpg" value={m.photo} onChange={e => updateExtraMsg(m.id, 'photo', e.target.value)} />
                        {m.photo && <img src={m.photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-rotary-blue flex-shrink-0" onError={e => e.target.style.display = 'none'} />}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Message</label>
                      <textarea className={inputClass} rows={3} placeholder="Their message..." value={m.message} onChange={e => updateExtraMsg(m.id, 'message', e.target.value)} />
                    </div>
                  </div>
                ))}

                <button type="button" onClick={addExtraMessage}
                  className="w-full py-2.5 rounded-lg border-2 border-dashed border-gray-200 dark:border-white/10 text-sm text-gray-400 dark:text-white/30 hover:border-rotary-blue hover:text-rotary-blue transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Another Message (Secretary, Director, etc.)
                </button>
              </AccordionSection>
            </motion.div>

            {/* Project images */}
            {monthProjects.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
                <AccordionSection title="Project Images" icon="📸" badge={monthProjects.length}>
                  {monthProjects.map(p => (
                    <div key={p.id}>
                      <label className="text-xs font-semibold text-rotary-charcoal dark:text-white block mb-1 truncate">{p.title}</label>
                      <div className="flex gap-2">
                        <input className={inputClass} placeholder="https://image-url.jpg"
                          value={projectImages[p.id] || p.image || ''}
                          onChange={e => setProjectImage(p.id, e.target.value)} />
                        {(projectImages[p.id] || p.image) && (
                          <img src={projectImages[p.id] || p.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" onError={e => e.target.style.display = 'none'} />
                        )}
                      </div>
                    </div>
                  ))}
                </AccordionSection>
              </motion.div>
            )}

            {/* Celebrations */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <AccordionSection title="Birthdays & Anniversaries" icon="🎂" badge={birthdays.length + anniversaries.length || null}>
                <p className="text-xs text-gray-400 dark:text-white/30">{autoBdays.length} birthdays · {autoAnnivs.length} wedding anniversaries auto-pulled from member profiles</p>

                {/* Birthdays */}
                <div>
                  <p className="text-xs font-semibold text-rotary-charcoal dark:text-white mb-2">🎂 Birthdays</p>
                  <div className="space-y-1.5 mb-2">
                    {birthdays.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5">
                        <span className="text-sm flex-1 text-rotary-charcoal dark:text-white">{b.name}{b.date ? ` · ${b.date}th` : ''}</span>
                        <button onClick={() => removeBday(i)} className="text-gray-300 hover:text-red-400 transition-colors text-xs">✕</button>
                      </div>
                    ))}
                    {birthdays.length === 0 && <p className="text-xs text-gray-300 dark:text-white/20 italic">None this month</p>}
                  </div>
                  <div className="flex gap-2">
                    <input className={inputClass} placeholder="Add name" value={newBdayName} onChange={e => setNewBdayName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBday()} />
                    <button onClick={addBday} className="px-3 py-2 rounded-lg text-sm font-semibold text-white shrink-0" style={{ background: '#D31145' }}>Add</button>
                  </div>
                </div>

                {/* Wedding anniversaries */}
                <div>
                  <p className="text-xs font-semibold text-rotary-charcoal dark:text-white mb-2">💍 Wedding Anniversaries</p>
                  <div className="space-y-1.5 mb-2">
                    {anniversaries.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5">
                        <span className="text-sm flex-1 text-rotary-charcoal dark:text-white">{a.name}{a.years ? ` · ${a.years}yr` : ''}</span>
                        <button onClick={() => removeAnniv(i)} className="text-gray-300 hover:text-red-400 transition-colors text-xs">✕</button>
                      </div>
                    ))}
                    {anniversaries.length === 0 && <p className="text-xs text-gray-300 dark:text-white/20 italic">None this month</p>}
                  </div>
                  <div className="flex gap-2">
                    <input className={inputClass} placeholder="Member name" value={newAnnivName} onChange={e => setNewAnnivName(e.target.value)} />
                    <input className={`${inputClass} w-20`} type="number" placeholder="Yrs" value={newAnnivYears} onChange={e => setNewAnnivYears(e.target.value)} />
                    <button onClick={addAnniv} className="px-3 py-2 rounded-lg text-sm font-semibold text-white shrink-0 bg-rotary-blue">Add</button>
                  </div>
                </div>
              </AccordionSection>
            </motion.div>

            {/* Closing note */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}>
              <AccordionSection title="Closing Thought (optional)" icon="💬">
                <textarea className={inputClass} rows={3} placeholder='"Service above self." — A quote, inspiration, or call-to-action to close the newsletter...' value={closingNote} onChange={e => setClosingNote(e.target.value)} />
              </AccordionSection>
            </motion.div>

            {/* Stats summary */}
            <motion.div className={`${cardClass} !p-4`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}>
              <p className="text-xs font-semibold text-rotary-slate dark:text-white/40 uppercase tracking-wider mb-3">Auto-pulled for {month} {year}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Projects',       value: monthProjects.length,  color: 'text-rotary-blue' },
                  { label: 'Events',         value: upcomingEvents.length, color: 'text-rotary-gold' },
                  { label: 'Members',        value: leaders.length,        color: 'text-emerald-600' },
                  { label: 'Vol. hours',     value: `${volunteerHours}h`,  color: 'text-violet-600' },
                  { label: 'Participants',   value: participants,           color: 'text-amber-600' },
                  { label: 'Celebrations',   value: birthdays.length + anniversaries.length, color: 'text-pink-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                    <span className="text-xs text-gray-500 dark:text-white/40">{label}</span>
                    <span className={`text-xs font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Generate */}
            <motion.button onClick={handleGenerate}
              className="w-full py-4 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
              style={{ background: 'linear-gradient(135deg,#D31145,#b50e38)', boxShadow: '0 8px 24px rgba(211,17,69,0.25)' }}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Newsletter
            </motion.button>
          </div>

          {/* ══ RIGHT: PREVIEW ══ */}
          <div className="space-y-4 lg:sticky lg:top-28">

            {previewHTML ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={handleExportPDF} disabled={exporting}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-rotary-charcoal dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-60">
                    {exporting
                      ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                    {exporting ? 'Generating…' : 'Export PDF'}
                  </button>
                  <button onClick={handleDownloadHTML}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-rotary-charcoal dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download HTML
                  </button>
                  <button onClick={handlePushToBlog} disabled={pushing || pushed}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-semibold transition-all text-white disabled:opacity-70"
                    style={{ background: pushed ? '#22c55e' : '#1a73e8' }}>
                    {pushing ? (
                      <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Publishing…</>
                    ) : pushed ? (
                      <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Published!</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>Push to Blog</>
                    )}
                  </button>
                </div>

                {/* Shareable link — shown after publish */}
                {shareURL && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span className="text-sm font-semibold text-green-700 dark:text-green-400">Published! Share this newsletter</span>
                    </div>
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-white/10 border border-green-200 dark:border-green-500/20 text-xs text-gray-600 dark:text-white/70 truncate font-mono select-all">
                        {shareURL}
                      </div>
                      <button onClick={copyShareURL}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${copied ? 'bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <a href={`https://wa.me/?text=${encodeURIComponent(`📰 Rotaract BTM ${month} ${year} Newsletter is live! Read it here: ${shareURL}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-semibold hover:opacity-90 transition-opacity">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        WhatsApp
                      </a>
                      <a href={shareURL} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rotary-blue text-white text-xs font-semibold hover:opacity-90 transition-opacity">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Open
                      </a>
                    </div>
                  </motion.div>
                )}

                {/* Iframe preview — actual newsletter HTML */}
                <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10">
                  <div className="px-4 py-3 bg-white dark:bg-rotary-navy-light border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-semibold text-rotary-charcoal dark:text-white">Live Preview</span>
                    <span className="text-xs text-gray-400 dark:text-white/30 ml-auto">Scroll to see full newsletter</span>
                  </div>
                  <iframe
                    srcDoc={previewHTML}
                    title="Newsletter Preview"
                    className="w-full border-0 block"
                    style={{ height: 640 }}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>

                <p className="text-xs text-center text-gray-400 dark:text-white/30">
                  Download HTML to use in email (Gmail, Mailchimp) · Print/PDF to share as file
                </p>
              </motion.div>
            ) : (
              <div className={`${cardClass} flex flex-col items-center justify-center py-24 text-center`}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#fff0f3' }}>
                  <svg className="w-8 h-8" style={{ color: '#D31145' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <p className="font-display font-bold text-lg text-rotary-charcoal dark:text-white mb-1">Newsletter preview</p>
                <p className="text-sm text-gray-400 dark:text-white/30 max-w-[220px]">Fill in the content on the left, then hit Preview Newsletter</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

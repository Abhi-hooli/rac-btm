// Post-build prerender step.
//
// This is a pure client-rendered SPA (see src/main.jsx — createRoot().render()
// into an empty <div id="root">). Crawlers that don't fully execute JS (and
// even Google's first-pass crawl) see a blank page for every route, which is
// a major reason the site struggles to get indexed/ranked despite correct
// meta tags, robots.txt, and sitemap.xml.
//
// This script boots the built app in a headless browser, visits each public
// route, waits for real content to render, and writes the fully-rendered
// HTML to dist/<route>/index.html. Netlify serves an exact-path static file
// before falling back to the SPA redirect (see netlify.toml), so crawlers
// hitting these routes get real content immediately; real users still get
// the normal client-rendered app on top (main.jsx re-renders into #root).
//
// Defensive by design: any failure here must NOT fail the overall build.
// Worst case (Playwright unavailable, browser launch fails, etc.) is that we
// silently skip prerendering and ship the same dist/ as before this script
// existed.

import { existsSync, mkdirSync, writeFileSync, cpSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const distDir = join(root, 'dist')

const ROUTES = ['/', '/projects', '/blog', '/gallery', '/team', '/calendar', '/archives', '/contact']
const PORT = 4174
const BASE_URL = `http://localhost:${PORT}`

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {}
    await new Promise(r => setTimeout(r, 300))
  }
  return false
}

async function main() {
  if (!existsSync(distDir)) {
    console.warn('[prerender] dist/ not found — skipping (run after `vite build`).')
    return
  }

  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.warn('[prerender] playwright not installed — skipping prerender, dist/ ships as plain SPA.')
    return
  }

  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  })

  try {
    const up = await waitForServer(BASE_URL)
    if (!up) {
      console.warn('[prerender] preview server did not start in time — skipping prerender.')
      return
    }

    const browser = await chromium.launch()
    try {
      for (const route of ROUTES) {
        try {
          // Use a real Googlebot UA so the app's own bot-detection (src/App.jsx,
          // BOT_UA_PATTERN) bypasses Maintenance Mode and the intro splash —
          // the same path a real crawler takes. That way this snapshot always
          // reflects real content, independent of whatever the live
          // Maintenance Mode toggle happens to be set to.
          const page = await browser.newPage({
            userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          })
          await page.addInitScript(() => sessionStorage.setItem('introShown', '1'))
          // 'networkidle' never resolves on some routes (open analytics beacons /
          // long-lived listeners), so wait for 'load' and then give React a fixed
          // window to finish rendering data fetched client-side after that.
          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'load', timeout: 15000 })
          await page.waitForTimeout(2500)
          const html = await page.content()
          await page.close()

          const outDir = route === '/' ? distDir : join(distDir, route.slice(1))
          mkdirSync(outDir, { recursive: true })
          writeFileSync(join(outDir, 'index.html'), html)
          console.log(`[prerender] wrote ${route === '/' ? '/' : route + '/'}index.html`)
        } catch (err) {
          console.warn(`[prerender] failed for ${route}:`, err.message)
        }
      }
    } finally {
      await browser.close()
    }
  } catch (err) {
    console.warn('[prerender] unexpected error — dist/ still valid as plain SPA:', err.message)
  } finally {
    preview.kill()
  }
}

main().catch(err => {
  console.warn('[prerender] fatal error swallowed — dist/ still valid as plain SPA:', err.message)
})

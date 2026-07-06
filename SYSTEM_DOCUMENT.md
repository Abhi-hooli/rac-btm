# System Document — Rotaract Club of Bengaluru BTM Web Application

**Version:** 1.0  
**Date:** June 2026  
**Club:** Rotaract Club of Bengaluru BTM  
**District:** Rotary International District 3191  
**Live URL:** https://rotaract.btm.org.in

---

## 1. Project Overview

The Rotaract Club of Bengaluru BTM website is a full-stack Progressive Web Application (PWA) built for a youth service club based in BTM Layout, Bangalore. It serves two audiences:

- **Public visitors** — learn about the club, view events, projects, the team, and a photo gallery; contact the club; read the blog.
- **Admin members** — manage all site content and access internal operational tools (treasurer portal, attendance tracker, minutes of meetings, RSVP management, analytics, etc.).

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Framework | React 18 with Vite 5 |
| Language | JavaScript (ES Modules / JSX) |
| Styling | Tailwind CSS 3 |
| Animations | Framer Motion 11 |
| Backend / Database | Firebase (Firestore + Authentication) |
| Hosting | Netlify |
| Email (contact form) | EmailJS |
| Newsletter email send | Resend |
| Error monitoring | Sentry (`@sentry/react`) |
| Analytics | Google Analytics 4 (GA4) via `gtag` |
| Rich text editing | React Quill |
| Excel export | xlsx (SheetJS) |
| PDF generation | jsPDF |
| Print support | react-to-print |
| Icons | Lucide React |

---

## 3. Architecture

The app is a **Single Page Application (SPA)** with client-side routing implemented manually via `window.history.pushState`. There is no Next.js or React Router server-side rendering. Netlify is configured with a fallback redirect (`/* → /index.html`) so all routes work on direct load or refresh.

```
src/
├── App.jsx                  # Root component — routing, auth state, maintenance mode
├── main.jsx                 # React entry point + Sentry init
├── firebase.js              # Firebase init, login/logout helpers, user creation
├── components/
│   ├── intro/               # IntroAnimation (shown once on first load)
│   ├── layout/              # Navbar, Footer
│   ├── sections/            # All page-level components (see Section 5)
│   └── ui/                  # Reusable UI: AdminLogin, Button, Card, etc.
├── hooks/
│   ├── useFirestore.js      # useCollection + useDocument (real-time Firestore)
│   ├── useSEO.js            # Per-page meta / Open Graph / canonical tags
│   ├── useInView.js         # Intersection Observer for scroll animations
│   └── useScrollProgress.js # Scroll progress bar
├── utils/
│   └── auditLog.js          # POST to webhook on every admin action
└── styles/
    └── index.css            # Tailwind directives + custom CSS
```

All page-level sections are **lazily loaded** (`React.lazy` + `Suspense`) to keep the initial JS bundle small.

---

## 4. Routing

Routes are mapped in `App.jsx` using a plain JavaScript object. There is no React Router.

| URL Path | Page Key | Access |
|---|---|---|
| `/` | `home` | Public |
| `/projects` | `allProjects` | Public |
| `/team` | `ourTeam` | Public |
| `/calendar` | `calendar` | Public |
| `/archives` | `archives` | Public |
| `/contact` | `contact` | Public |
| `/documents` | `documents` | Public |
| `/blog` | `blog` | Public |
| `/gallery` | `gallery` | Public |
| `/privacy` | `privacy` | Public |
| `/treasurer` | `treasurer` | Admin (`treasurer` permission) |
| `/attendance` | `attendance` | Admin (`attendance` permission) |
| `/mom` | `mom` | Admin (`mom` permission) |
| `/rsvp-admin` | `rsvpAdmin` | Admin (`rsvp` permission) |
| `/analytics` | `analytics` | Admin (`analytics` permission) |
| `/users` | `users` | Admin (`userManagement` permission) |
| `/newsletter` | `newsletter` | Any authenticated admin |

Navigation is handled by `goToPage(key)` which pushes to `window.history` and scrolls to top.

---

## 5. Pages & Features

### 5.1 Public Pages (Home)

The home page (`/`) is a single scrolling page composed of multiple sections rendered in order:

| Section | Description |
|---|---|
| **Hero** | Full-screen banner with headline, CTA buttons, and hero image (admin can edit image) |
| **About** | Club introduction — mission statement (admin-editable) |
| **Impact** | Animated stats counters (members, projects, hours, etc.) — admin-editable |
| **Projects** | Highlighted recent projects with "View All" and "Archives" links |
| **Events** | Upcoming events with RSVP button per event |
| **Leadership** | Club leadership card with "Meet the Team" link |
| **Gallery Preview** | Photo grid preview with "View All Gallery" link |
| **Testimonials** | Member testimonials — admin-editable |
| **JoinCTA** | Call-to-action to join or contact the club |
| **Footer** | Links, social media, copyright |

### 5.2 All Projects (`/projects`)

Displays the full list of community service projects. Admins can add, edit, and delete project cards including title, avenue, date, description, and image.

### 5.3 Our Team (`/team`)

Displays club members with name, role, team tier (BOD / Core Team / Member), and photo. Admins can manage the full team list.

### 5.4 Calendar (`/calendar`)

Displays upcoming events in a visual calendar / list view. Members can RSVP directly from the event listing.

### 5.5 Archives (`/archives`)

Historical record of past projects and events from previous Rotary years, searchable and filterable.

### 5.6 Blog (`/blog`)

Rich-text blog with React Quill editor. Admins write and publish posts; public can read them.

### 5.7 Gallery (`/gallery`)

Photo gallery grouped by album / event. Gallery-permission admins can upload, organise, and delete photos.

### 5.8 Contact (`/contact`)

Displays contact email, Instagram link, and location. Includes a contact form powered by EmailJS / Web3Forms. Submissions are stored in the `contacts` Firestore collection.

### 5.9 Documents (`/documents`)

Public document library where admins can upload PDFs and links (meeting guidelines, reporting templates, etc.).

### 5.10 Privacy Policy (`/privacy`)

Static privacy policy page.

---

## 6. Admin Features

### 6.1 Authentication & Session

- Login is via Firebase Authentication (email + password).
- On login, the user record in Firestore `users` collection is fetched to retrieve permissions.
- Super-admins have `isSuperAdmin: true` in Firestore and receive all permissions automatically.
- Permissions and login timestamp are stored in `sessionStorage` (cleared on tab/browser close).
- **Sessions auto-expire after 30 minutes** with a countdown timer; a browser alert warns on expiry.
- Logout clears `sessionStorage` and calls `firebase.auth().signOut()`.

### 6.2 Maintenance Mode

- Toggled by any authenticated admin from the Navbar.
- Stored in Firestore `settings/site.maintenanceMode`.
- When enabled, all public traffic sees a `MaintenancePage` with an optional resume time countdown.
- Logged-in admins bypass maintenance mode and see the full site.
- An optional `maintenanceEndTime` (ISO timestamp) shows a countdown timer to visitors.

### 6.3 Treasurer Dashboard (`/treasurer`)

- Tracks annual membership dues per member (due amount, amount paid, payment mode, date, notes).
- Calculates pending dues, total collected, and event expenditures.
- Supports sponsorship income tracking.
- Exports a dues report to CSV (UTF-8 BOM for Excel compatibility).
- Exports a full financial report to PDF via jsPDF.
- Date-range filtering for all views.
- Firestore collection: `treasury`

### 6.4 Attendance Tracker (`/attendance`)

- Tracks attendance for meetings and events (GBM, BOD, Core Team, Fellowship, Project).
- Member list is sourced from the `leaders` Firestore collection.
- Each attendance record stores: title, type, date, list of present member IDs.
- Calculates per-member attendance percentage with colour-coded status (green ≥75%, amber ≥50%, red <50%).
- Exports a full attendance matrix to Excel (XLSX) with two sheets: by-meeting and by-member.
- Integrates with the MoM Tracker — "Create MoM" button from an attendance record pre-fills meeting details.
- Firestore collection: `attendance`

### 6.5 Minutes of Meeting (MoM) Tracker (`/mom`)

- Records meeting minutes: title, date, attendees, agenda items, decisions, and action items.
- Action items have assignees, deadlines, and status (Pending / In Progress / Done).
- Optional link from Attendance Tracker pre-populates meeting title and date.
- Firestore collection: `mom`

### 6.6 Event RSVP Admin (`/rsvp-admin`)

- Shows all RSVPs across events — name, email, phone, event title, timestamp.
- Admins can delete individual RSVP records.
- Firestore collection: `rsvps`

### 6.7 Club Analytics Dashboard (`/analytics`)

- Aggregates data from projects, events, attendance, and treasury into KPI cards.
- Shows: total projects, total events, total members, active members, average attendance %, total funds collected.
- Attendance trend bar chart (month-by-month).
- Club Health Score (0–100) derived from attendance, project count, and membership dues.
- Avenue-wise project distribution.
- Exports a full analytics PDF report via jsPDF.
- Firestore collections read: `projects`, `events`, `leaders`, `attendance`, `treasury`

### 6.8 Club Documents (`/documents`)

- Admins upload document links (URL + title + description).
- Public can view and download linked documents.
- Firestore collection: `documents`

### 6.9 Newsletter Generator (`/newsletter`)

- Builds a monthly Rotaract newsletter automatically from Firestore data.
- Auto-selects current month's events, projects, birthdays (from member birthdates), and Rotary monthly theme.
- Editable rich-text newsletter body via React Quill.
- Sends to newsletter subscribers via Resend email API.
- Subscriber list managed via Firestore `subscribers` collection.
- Firestore collections read: `events`, `projects`, `leaders`, `subscribers`

### 6.10 User Management (`/users`)

- Super-admin and users with `userManagement` permission can create, edit, and delete admin accounts.
- Creates Firebase Auth users via a secondary Firebase app instance (to avoid signing out the current admin).
- Sends password-reset/setup email to new users via Firebase `sendPasswordResetEmail`.
- Role presets with predefined permission bundles:

| Role | Permissions |
|---|---|
| President | All permissions |
| Secretary | attendance, mom, rsvp, gallery |
| Treasurer | treasurer, analytics |
| SAA | attendance |
| Admin | All permissions |

- Firestore collection: `users`

### 6.11 Audit Log

Every admin action (login, logout, CRUD operations, maintenance toggle) is logged by calling `logAction()` in `src/utils/auditLog.js`, which POSTs structured JSON to an external webhook URL (`VITE_AUDIT_LOG_URL` env var). Log entries include: admin email, action code, module, item name, and freeform details string. The audit log is also stored in Firestore (`auditLog` collection, accessible only to authenticated admins).

---

## 7. Firestore Data Model

| Collection | Access | Description |
|---|---|---|
| `projects` | Public read / Auth write | Community service projects |
| `events` | Public read / Auth write | Club events with RSVP |
| `leaders` | Public read / Auth write | Team members and board |
| `gallery` | Public read / Auth write | Photo gallery albums and images |
| `testimonials` | Public read / Auth write | Member testimonials |
| `blogs` | Public read / Auth write | Blog posts |
| `settings` | Public read / Auth write | Site settings (maintenance mode, etc.) |
| `partners` | Public read / Auth write | Partner organisations |
| `impact` | Public read / Auth write | Impact counter values |
| `rsvps` | Auth read / Public create (validated) | Event RSVPs |
| `subscribers` | Auth read-delete / Public create (validated) | Newsletter subscribers |
| `contacts` | Auth read / Public create (validated) | Contact form submissions |
| `users` | Auth only | Admin user records and permissions |
| `attendance` | Auth only | Meeting attendance records |
| `treasury` | Auth only | Financial records and dues |
| `mom` | Auth only | Minutes of meetings |
| `auditLog` | Auth only | Admin action log |

Public-create collections (rsvps, subscribers, contacts) use Firestore security rules to validate field types and enforce size limits before allowing anonymous writes.

---

## 8. Security

### 8.1 Firestore Rules

See `firestore.rules`. Key points:
- Public collections allow read by anyone; writes require Firebase Auth.
- RSVP, subscriber, and contact forms allow anonymous creates with field-level validation.
- All admin collections (users, attendance, treasury, mom, auditLog) require authentication for all operations.
- A catch-all `/{document=**}` rule denies everything not explicitly permitted.

### 8.2 HTTP Security Headers (Netlify)

All responses include:

| Header | Value |
|---|---|
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| X-XSS-Protection | 1; mode=block |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload |
| Content-Security-Policy | Strict allowlist for Firebase, EmailJS, Google Analytics, fonts |

### 8.3 Admin Session Security

- Sessions stored in `sessionStorage` only (lost on tab close — no persistent tokens in localStorage).
- 30-minute auto-logout with timer.
- New admin users are created via a secondary Firebase app instance so the creating admin's session is not invalidated.
- All admin actions are logged to the audit log.

---

## 9. SEO & PWA

### 9.1 SEO

- `useSEO` hook (`src/hooks/useSEO.js`) dynamically updates `<title>`, meta description, keywords, Open Graph tags, Twitter Card tags, and canonical link on every page navigation.
- `public/sitemap.xml` lists all public routes for search indexing.
- `public/robots.txt` is configured to allow all crawlers.
- Domain: `https://rotaract.btm.org.in`

### 9.2 PWA

- `public/manifest.json` defines the app as a PWA with name, theme colour, and icons.
- App is installable on Android and iOS (standalone display mode).

---

## 10. Performance

- **Code splitting:** All page sections use `React.lazy()` and `Suspense` for lazy loading.
- **Build chunks:** Vite bundles third-party libraries into separate chunks:
  - `react-vendor` — React + React DOM
  - `firebase` — Firebase SDK
  - `framer-motion`
  - `xlsx`
  - Per-page component chunks
- **Netlify caching:**
  - `/assets/*` — `Cache-Control: max-age=31536000, immutable` (hashed filenames)
  - PNG / SVG / PDF — `max-age=86400`
- **Scroll animations** use `IntersectionObserver` via `useInView` hook to defer heavy renders.

---

## 11. Environment Variables

All sensitive configuration is stored in `.env` (gitignored). Required variables:

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firestore project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_AUDIT_LOG_URL` | Webhook URL for audit log POSTs |

EmailJS and Sentry DSN keys are embedded in component-level code or injected at build time. Set these in Netlify's environment variable dashboard for production builds.

---

## 12. Deployment

**Platform:** Netlify (automatic deploys from the `main` git branch)

**Build command:** `npm run build` (runs `vite build`)  
**Publish directory:** `dist/`  
**SPA redirect:** Netlify `_redirects` file + `netlify.toml` redirect rule ensures all client-side routes work on direct access.

**Deploy steps:**
1. Push to `main` branch on GitHub/Git remote.
2. Netlify auto-triggers a build.
3. Vite builds to `dist/`.
4. Netlify deploys `dist/` globally on its CDN.

---

## 13. Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file with all VITE_ variables (see Section 11)

# 3. Start dev server
npm run dev
# → http://localhost:5173

# 4. Production build
npm run build

# 5. Preview production build locally
npm run preview
```

---

## 14. Admin User Roles Reference

| Role | analytics | attendance | mom | treasurer | rsvp | gallery | userManagement |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| President / Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Secretary | | ✓ | ✓ | | ✓ | ✓ | |
| Treasurer | ✓ | | | ✓ | | | |
| SAA | | ✓ | | | | | |
| Super Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Super-admins also bypass all permission checks and see the maintenance mode toggle.

---

## 15. Key Contact

**Club email:** racbtm@gmail.com  
**Location:** BTM Layout, Bengaluru, Karnataka  
**District:** Rotary International District 3191  
**Developer:** Abhi (GitHub: Abhi-hooli)

import { useEffect } from 'react'

const BASE_URL = 'https://rotaract.btm.org.in'
const OG_IMAGE = `${BASE_URL}/og-image.png`

const PAGE_META = {
  home: {
    title: 'Rotaract Club of Bengaluru BTM | Create. Lead. Inspire.',
    description:
      'Rotaract Club of Bengaluru BTM — empowering young professionals and students through community service, leadership development, and fellowship in BTM Layout, Bengaluru.',
    canonical: `${BASE_URL}/`,
  },
  allProjects: {
    title: 'Projects | Rotaract Club of Bengaluru BTM',
    description:
      'Explore community service projects by Rotaract Club of Bengaluru BTM — health camps, education drives, environmental initiatives, and more in BTM Layout.',
    canonical: `${BASE_URL}/projects`,
  },
  blog: {
    title: 'Blog | Rotaract Club of Bengaluru BTM',
    description:
      'Stories, updates, and insights from Rotaract Club of Bengaluru BTM members on service, leadership, and community impact.',
    canonical: `${BASE_URL}/blog`,
  },
  gallery: {
    title: 'Gallery | Rotaract Club of Bengaluru BTM',
    description:
      'Browse photos and memories from Rotaract Club of Bengaluru BTM events, service projects, and fellowship activities.',
    canonical: `${BASE_URL}/gallery`,
  },
  ourTeam: {
    title: 'Our Team | Rotaract Club of Bengaluru BTM',
    description:
      'Meet the board of directors and members of Rotaract Club of Bengaluru BTM — the faces driving community change in Bengaluru.',
    canonical: `${BASE_URL}/team`,
  },
  calendar: {
    title: 'Events Calendar | Rotaract Club of Bengaluru BTM',
    description:
      'Stay updated with upcoming events, meetings, and service activities of Rotaract Club of Bengaluru BTM.',
    canonical: `${BASE_URL}/calendar`,
  },
  archives: {
    title: 'Archives | Rotaract Club of Bengaluru BTM',
    description:
      'Explore the history and past achievements of Rotaract Club of Bengaluru BTM through our project and event archives.',
    canonical: `${BASE_URL}/archives`,
  },
  contact: {
    title: 'Contact Us | Rotaract Club of Bengaluru BTM',
    description:
      'Get in touch with Rotaract Club of Bengaluru BTM for membership inquiries, collaborations, sponsorships, or any queries.',
    canonical: `${BASE_URL}/contact`,
  },
  documents: {
    title: 'Club Documents | Rotaract Club of Bengaluru BTM',
    description:
      'Access official documents, reports, and resources from Rotaract Club of Bengaluru BTM.',
    canonical: `${BASE_URL}/documents`,
  },
}

function setMetaTag(attr, value, content) {
  let el = document.querySelector(`meta[${attr}="${value}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, value)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function useSEO(page) {
  useEffect(() => {
    const meta = PAGE_META[page]
    if (!meta) return

    document.title = meta.title

    setMetaTag('name', 'description', meta.description)
    setMetaTag('property', 'og:title', meta.title)
    setMetaTag('property', 'og:description', meta.description)
    setMetaTag('property', 'og:url', meta.canonical)
    setMetaTag('property', 'og:image', OG_IMAGE)
    setMetaTag('name', 'twitter:title', meta.title)
    setMetaTag('name', 'twitter:description', meta.description)
    setMetaTag('name', 'twitter:image', OG_IMAGE)
    setCanonical(meta.canonical)
  }, [page])
}

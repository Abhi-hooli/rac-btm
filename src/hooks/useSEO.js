import { useEffect } from 'react'

const BASE_URL = 'https://rotaract.btm.org.in'
const OG_IMAGE = `${BASE_URL}/og-image.png`

const PAGE_META = {
  home: {
    title: 'Rotaract Club of Bengaluru BTM | Youth Club in Bangalore',
    description:
      'Rotaract Club of Bengaluru BTM — youth service club in BTM Layout, Bangalore. Empowering young professionals & students through community service, leadership & fellowship. Rotary International District 3191, Karnataka.',
    keywords:
      'Rotaract Bangalore, Rotaract Bengaluru, Rotaract club in Bangalore, Rotaract BTM, youth club Bangalore, community service Bangalore, volunteer Bangalore, Rotary District 3191',
    canonical: `${BASE_URL}/`,
  },
  allProjects: {
    title: 'Community Service Projects in Bangalore | Rotaract BTM',
    description:
      'Explore community service projects by Rotaract Club of Bengaluru BTM in Bangalore — health camps, education drives, blood donation, environmental initiatives, and social impact projects in Karnataka.',
    keywords:
      'community service projects Bangalore, volunteer projects Bangalore, Rotaract BTM projects, social service Bangalore, NGO projects Bangalore, youth service projects Karnataka',
    canonical: `${BASE_URL}/projects`,
  },
  blog: {
    title: 'Blog | Rotaract Club of Bengaluru BTM | Bangalore',
    description:
      'Stories, updates, and insights from Rotaract Club of Bengaluru BTM — community service, youth leadership, fellowship, and social impact in Bangalore, Karnataka.',
    keywords:
      'Rotaract Bangalore blog, youth leadership Bangalore, community service stories Bangalore, Rotaract BTM updates, Rotary youth Bangalore',
    canonical: `${BASE_URL}/blog`,
  },
  gallery: {
    title: 'Photos & Gallery | Rotaract BTM Events in Bangalore',
    description:
      'Browse photos and memories from Rotaract Club of Bengaluru BTM events, community service projects, and fellowship activities in Bangalore, Karnataka.',
    keywords:
      'Rotaract BTM photos, Rotaract Bangalore events gallery, youth events Bangalore photos, community service Bangalore pictures',
    canonical: `${BASE_URL}/gallery`,
  },
  ourTeam: {
    title: 'Our Team | Rotaract Club of Bengaluru BTM | Bangalore',
    description:
      'Meet the board of directors and members of Rotaract Club of Bengaluru BTM — young leaders driving community change in Bangalore, Karnataka. Rotary International District 3191.',
    keywords:
      'Rotaract BTM team Bangalore, Rotaract Bangalore members, Rotaract board Bangalore, youth leaders Bangalore, Rotary District 3191 team',
    canonical: `${BASE_URL}/team`,
  },
  calendar: {
    title: 'Upcoming Events in Bangalore | Rotaract Club BTM',
    description:
      'Stay updated with upcoming events, community service activities, and meetings of Rotaract Club of Bengaluru BTM in Bangalore. Youth events, volunteering, and fellowship in Karnataka.',
    keywords:
      'Rotaract events Bangalore, youth events BTM Layout, community events Bangalore, volunteer events Bangalore, Rotaract BTM calendar',
    canonical: `${BASE_URL}/calendar`,
  },
  archives: {
    title: 'Project Archives | Rotaract Club of Bengaluru BTM History',
    description:
      'Explore years of community service history — past projects, events, and achievements of Rotaract Club of Bengaluru BTM in Bangalore. Rotary International District 3191, Karnataka.',
    keywords:
      'Rotaract BTM history, Rotaract Bangalore past projects, Rotaract archives, community service history Bangalore, Rotary District 3191 projects',
    canonical: `${BASE_URL}/archives`,
  },
  contact: {
    title: 'Join Rotaract in Bangalore | Contact Rotaract BTM',
    description:
      'Join Rotaract Club of Bengaluru BTM or contact us for membership, collaborations, and sponsorships. Youth aged 18–30 welcome. Based in BTM Layout, Bangalore. Rotary International District 3191.',
    keywords:
      'join Rotaract Bangalore, contact Rotaract BTM, Rotaract membership Bangalore, volunteer Bangalore, join youth club Bangalore, Rotaract BTM Layout contact',
    canonical: `${BASE_URL}/contact`,
  },
  documents: {
    title: 'Club Documents | Rotaract Club of Bengaluru BTM',
    description:
      'Access official documents, reports, and resources from Rotaract Club of Bengaluru BTM, Bangalore. Rotary International District 3191, Karnataka.',
    keywords:
      'Rotaract BTM documents, Rotaract Bangalore reports, Rotary District 3191 documents',
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
    setMetaTag('name', 'keywords', meta.keywords)
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

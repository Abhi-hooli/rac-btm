import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'

const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

const CATEGORIES = ['All', 'Newsletter', 'Club News', 'Project Story', 'Event Recap', 'Impact Report', 'Announcement']

const emptyForm = {
    title: '', slug: '', excerpt: '', content: '',
    coverImage: '', category: 'Club News', author: '',
    published: false,
}

// ── Slug generator ────────────────────────────────────────────────────────────
function toSlug(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ── Reading time ──────────────────────────────────────────────────────────────
function readingTime(html) {
    const text = html.replace(/<[^>]+>/g, '')
    const words = text.trim().split(/\s+/).length
    return Math.max(1, Math.ceil(words / 200))
}

// ── Rich Text Editor (dynamic import) ────────────────────────────────────────
function RichEditor({ value, onChange }) {
    const [ReactQuill, setReactQuill] = useState(null)

    useEffect(() => {
        import('react-quill').then(mod => {
            setReactQuill(() => mod.default)
            import('react-quill/dist/quill.snow.css')
        })
    }, [])

    if (!ReactQuill) return (
        <div className="w-full h-48 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center text-sm text-rotary-slate dark:text-white/40">
            Loading editor...
        </div>
    )

    return (
        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
            <ReactQuill
                theme="snow"
                value={value}
                onChange={onChange}
                modules={{
                    toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['blockquote', 'link', 'image'],
                        ['clean'],
                    ],
                }}
                style={{ minHeight: 300, background: 'white' }}
            />
        </div>
    )
}

// ── Single Post View ──────────────────────────────────────────────────────────
function PostView({ post, onBack }) {
    const shareUrl = `${window.location.origin}${window.location.pathname}#blog/${post.slug || post.id}`

    const handleShare = () => {
        navigator.clipboard.writeText(shareUrl)
        alert('Link copied!')
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Back button */}
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-rotary-slate dark:text-white/50 hover:text-rotary-blue transition-colors mb-8">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Blog
            </button>

            {/* Cover image */}
            {post.coverImage && (
                <div className="w-full h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                </div>
            )}

            {/* Meta */}
            <div className="max-w-3xl mx-auto">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rotary-blue/10 text-rotary-blue dark:bg-rotary-blue/20">
                        {post.category}
                    </span>
                    <span className="text-xs text-rotary-slate dark:text-white/40">
                        {readingTime(post.content || '')} min read
                    </span>
                </div>

                <h1 className="font-display font-bold text-3xl md:text-4xl text-rotary-navy dark:text-white mb-4 leading-tight">
                    {post.title}
                </h1>

                <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-100 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-rotary-blue/10 dark:bg-rotary-blue/20 flex items-center justify-center text-rotary-blue font-bold text-sm">
                            {(post.author || 'R').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-rotary-charcoal dark:text-white">{post.author || 'Rotaract BTM'}</p>
                            <p className="text-xs text-rotary-slate dark:text-white/40">
                                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleShare}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm text-rotary-slate dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share
                    </button>
                </div>

                {/* Content */}
                <div
                    className="prose prose-lg dark:prose-invert max-w-none text-rotary-charcoal dark:text-white/80 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                    style={{ lineHeight: 1.8 }}
                />

                {/* SEO excerpt as meta-like description */}
                {post.excerpt && (
                    <div className="mt-12 p-6 rounded-xl bg-rotary-blue/5 dark:bg-rotary-blue/10 border border-rotary-blue/10">
                        <p className="text-sm font-semibold text-rotary-blue mb-1">About this post</p>
                        <p className="text-sm text-rotary-slate dark:text-white/50">{post.excerpt}</p>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

// ── Admin Editor ──────────────────────────────────────────────────────────────
function PostEditor({ post, onSave, onCancel }) {
    const [form, setForm] = useState(post || emptyForm)
    const [saving, setSaving] = useState(false)

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

    const handleTitleChange = (e) => {
        set('title', e.target.value)
        if (!form.slug || form.slug === toSlug(form.title)) {
            set('slug', toSlug(e.target.value))
        }
    }

    const handleSave = async (publish = null) => {
        if (!form.title || !form.content) return
        setSaving(true)
        const data = {
            ...form,
            slug: form.slug || toSlug(form.title),
            published: publish !== null ? publish : form.published,
            publishedAt: (publish || form.published) ? (form.publishedAt || new Date().toISOString()) : null,
            updatedAt: new Date().toISOString(),
        }
        await onSave(data)
        setSaving(false)
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm p-6 md:p-8">

            <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-xl">{post ? 'Edit Post' : 'New Post'}</h3>
                <button onClick={onCancel} className="text-rotary-slate dark:text-white/40 hover:text-rotary-charcoal dark:hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="space-y-4">
                {/* Title */}
                <input className={inputClass} placeholder="Post Title *" value={form.title} onChange={handleTitleChange} />

                {/* Slug + Category row */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">URL Slug</label>
                        <input className={inputClass} placeholder="post-url-slug" value={form.slug}
                            onChange={e => set('slug', toSlug(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Category</label>
                        <select className={inputClass} value={form.category} onChange={e => set('category', e.target.value)}>
                            {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {/* Author + Cover image */}
                <div className="grid md:grid-cols-2 gap-4">
                    <input className={inputClass} placeholder="Author name" value={form.author}
                        onChange={e => set('author', e.target.value)} />
                    <input className={inputClass} placeholder="Cover image URL" value={form.coverImage}
                        onChange={e => set('coverImage', e.target.value)} />
                </div>

                {/* Excerpt (SEO) */}
                <div>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">
                        Excerpt <span className="text-rotary-blue">(used for SEO meta description — keep under 160 chars)</span>
                    </label>
                    <textarea className={inputClass} rows={2} placeholder="Short description of the post..."
                        value={form.excerpt} onChange={e => set('excerpt', e.target.value)} />
                    <p className="text-xs text-rotary-slate dark:text-white/30 mt-1">{form.excerpt.length}/160</p>
                </div>

                {/* Rich text editor */}
                <div>
                    <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Content *</label>
                    <RichEditor value={form.content} onChange={val => set('content', val)} />
                </div>

                {/* Cover image preview */}
                {form.coverImage && (
                    <div className="h-40 rounded-xl overflow-hidden">
                        <img src={form.coverImage} alt="cover preview" className="w-full h-full object-cover" />
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                    <button onClick={() => handleSave(true)} disabled={saving || !form.title || !form.content}
                        className="px-6 py-2.5 rounded-lg bg-rotary-blue text-white font-semibold text-sm hover:bg-rotary-blue-dark disabled:opacity-50 transition-colors">
                        {saving ? 'Saving...' : '🌐 Publish'}
                    </button>
                    <button onClick={() => handleSave(false)} disabled={saving || !form.title}
                        className="px-6 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 text-rotary-charcoal dark:text-white font-semibold text-sm hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50 transition-colors">
                        💾 Save Draft
                    </button>
                    <button onClick={onCancel}
                        className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

// ── Blog Card ─────────────────────────────────────────────────────────────────
function BlogCard({ post, onClick, onEdit, onDelete, isAdmin }) {
    return (
        <motion.div
            className="group bg-white dark:bg-rotary-navy-light rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-lg dark:hover:shadow-none hover:border-gray-200 dark:hover:border-white/10 transition-all duration-300 cursor-pointer"
            whileHover={{ y: -3 }}
            onClick={() => onClick(post)}
        >
            {/* Cover */}
            <div className="relative h-48 bg-gradient-to-br from-rotary-blue/20 to-rotary-gold/20 overflow-hidden">
                {post.coverImage ? (
                    <img src={post.coverImage} alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-rotary-blue/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                    </div>
                )}
                {/* Category badge */}
                <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 text-rotary-navy">
                        {post.category}
                    </span>
                </div>
                {/* Draft badge */}
                {!post.published && (
                    <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400 text-amber-900">Draft</span>
                    </div>
                )}
                {post.isNewsletter && (
                    <div className="absolute bottom-3 left-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rotary-blue text-white">📰 Newsletter</span>
                    </div>
                )}
                {/* Admin controls */}
                {isAdmin && (
                    <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => onEdit(post)}
                            className="w-7 h-7 rounded-lg bg-white/90 text-rotary-navy flex items-center justify-center hover:bg-white transition-colors shadow">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button onClick={() => onDelete(post.id)}
                            className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-5">
                <h3 className="font-display font-bold text-lg text-rotary-navy dark:text-white mb-2 line-clamp-2 leading-snug group-hover:text-rotary-blue transition-colors">
                    {post.title}
                </h3>
                {post.excerpt && (
                    <p className="text-sm text-rotary-slate dark:text-white/50 line-clamp-2 leading-relaxed mb-4">{post.excerpt}</p>
                )}
                <div className="flex items-center justify-between text-xs text-rotary-slate dark:text-white/30">
                    <span>{post.author || 'Rotaract BTM'}</span>
                    <div className="flex items-center gap-3">
                        <span>{readingTime(post.content || '')} min read</span>
                        <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Draft'}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// ── Main Blog Page ────────────────────────────────────────────────────────────
export default function Blog({ isAdmin, onBack }) {
    const { data: allPosts, loading, save, remove } = useCollection('blogs')
    const [activeCategory, setActiveCategory] = useState('All')
    const [selectedPost, setSelectedPost] = useState(null)
    const [editingPost, setEditingPost] = useState(null)
    const [showEditor, setShowEditor] = useState(false)
    const [search, setSearch] = useState('')

    // Auto-open post from URL hash e.g. #blog/my-post-slug
    useEffect(() => {
        const hash = window.location.hash.replace('#blog/', '')
        if (hash && hash !== 'blog') {
            const found = allPosts.find(p => p.slug === hash || p.id === hash)
            if (found) setSelectedPost(found)
        }
    }, [allPosts])

    const posts = allPosts.filter(p => isAdmin ? true : p.published)

    const filtered = posts.filter(p => {
        const matchCat = activeCategory === 'All' || p.category === activeCategory
        const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.excerpt || '').toLowerCase().includes(search.toLowerCase())
        return matchCat && matchSearch
    }).sort((a, b) => new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0))

    const handleSave = async (data) => {
        await save({ ...data, id: data.id || Date.now().toString(), createdAt: data.createdAt || new Date().toISOString() })
        setShowEditor(false)
        setEditingPost(null)
    }

    const handleDelete = async (id) => {
        if (confirm('Delete this post permanently?')) await remove(id)
    }

    const handleEdit = (post) => {
        setEditingPost(post)
        setShowEditor(true)
        setSelectedPost(null)
    }

    // Single post view
    if (selectedPost) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-rotary-navy pt-5 pb-16">
                <div className="section-padding max-w-4xl mx-auto">
                    <PostView post={selectedPost} onBack={() => setSelectedPost(null)} />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pt-20">
            <div className="section-padding max-w-7xl mx-auto pt-8">

                {/* Header */}
                <motion.div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="heading-lg">Our <span className="text-gradient">Blog</span></h1>
                            <p className="text-rotary-slate dark:text-white/50 text-sm mt-0.5">
                                Stories, updates and impact from Rotaract Bengaluru BTM
                            </p>
                        </div>
                    </div>
                    {isAdmin && (
                        <button onClick={() => { setEditingPost(null); setShowEditor(true) }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Post
                        </button>
                    )}
                </motion.div>¸

                {/* Editor */}
                <AnimatePresence>
                    {showEditor && (
                        <div className="mb-10">
                            <PostEditor
                                post={editingPost}
                                onSave={handleSave}
                                onCancel={() => { setShowEditor(false); setEditingPost(null) }}
                            />
                        </div>
                    )}
                </AnimatePresence>

                {/* Search + filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rotary-slate dark:text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input className={`${inputClass} pl-10`} placeholder="Search posts..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeCategory === cat ? 'bg-rotary-blue text-white' : 'bg-gray-100 dark:bg-white/5 text-rotary-charcoal dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-rotary-blue/30 border-t-rotary-blue rounded-full animate-spin" />
                    </div>
                )}

                {/* Grid */}
                {!loading && filtered.length > 0 && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((post, i) => (
                            <motion.div key={post.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: i * 0.05 }}>
                                <BlogCard
                                    post={post}
                                    onClick={setSelectedPost}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    isAdmin={isAdmin}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && filtered.length === 0 && (
                    <div className="text-center py-24">
                        <svg className="w-12 h-12 text-rotary-slate/20 dark:text-white/10 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        <p className="text-rotary-slate dark:text-white/30 text-lg font-medium">No posts yet</p>
                        {isAdmin && <p className="text-sm text-rotary-slate dark:text-white/20 mt-1">Click "New Post" to write your first blog post.</p>}
                    </div>
                )}

                {/* Post count */}
                {!loading && filtered.length > 0 && (
                    <p className="text-center text-xs text-rotary-slate dark:text-white/30 mt-10">
                        {filtered.length} post{filtered.length !== 1 ? 's' : ''} {activeCategory !== 'All' ? `in ${activeCategory}` : ''}
                    </p>
                )}
            </div>
        </div>
    )
}
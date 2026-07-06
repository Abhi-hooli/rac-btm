import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'

const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rotary-blue/30 text-sm'

export default function Gallery({ isAdmin, permissions, onBack }) {
  const { data: albums, save, remove } = useCollection('gallery')
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [newPhotoUrl, setNewPhotoUrl] = useState('')
  const [newPhotoCaption, setNewPhotoCaption] = useState('')
  const [form, setForm] = useState({ title: '', description: '', coverImage: '', date: '', order: 0 })

  const canEdit = isAdmin || permissions?.gallery

  const sorted = [...albums].sort((a, b) => (a.order || 0) - (b.order || 0))

  // Keyboard nav for lightbox
  useEffect(() => {
    if (!lightboxPhoto) return
    const photos = selectedAlbum?.photos || []
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightboxPhoto(null)
      if (e.key === 'ArrowRight') {
        const next = (lightboxIndex + 1) % photos.length
        setLightboxIndex(next)
        setLightboxPhoto(photos[next])
      }
      if (e.key === 'ArrowLeft') {
        const prev = (lightboxIndex - 1 + photos.length) % photos.length
        setLightboxIndex(prev)
        setLightboxPhoto(photos[prev])
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxPhoto, lightboxIndex, selectedAlbum])

  const openLightbox = (photo, index) => {
    setLightboxPhoto(photo)
    setLightboxIndex(index)
  }

  const resetForm = () => {
    setForm({ title: '', description: '', coverImage: '', date: '', order: 0 })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSaveAlbum = async () => {
    if (!form.title) return
    const id = editingId || Date.now().toString()
    const existing = albums.find(a => a.id === id)
    await save({ ...existing, ...form, id, photos: existing?.photos || [], createdAt: existing?.createdAt || new Date().toISOString() })
    resetForm()
  }

  const handleEditAlbum = (album) => {
    setForm({ title: album.title, description: album.description || '', coverImage: album.coverImage || '', date: album.date || '', order: album.order || 0 })
    setEditingId(album.id)
    setShowForm(true)
  }

  const addPhoto = async () => {
    if (!newPhotoUrl || !selectedAlbum) return
    const photo = { id: Date.now().toString(), url: newPhotoUrl, caption: newPhotoCaption }
    const updated = { ...selectedAlbum, photos: [...(selectedAlbum.photos || []), photo] }
    await save(updated)
    setSelectedAlbum(updated)
    setNewPhotoUrl('')
    setNewPhotoCaption('')
  }

  const deletePhoto = async (photoId) => {
    if (!selectedAlbum) return
    const updated = { ...selectedAlbum, photos: (selectedAlbum.photos || []).filter(p => p.id !== photoId) }
    await save(updated)
    setSelectedAlbum(updated)
  }

  // ── Album Grid ──
  if (!selectedAlbum) return (
    <div className="min-h-screen pt-5">
      <div className="section-padding max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="heading-lg">Our <span className="text-gradient">Gallery</span></h1>
              <p className="text-rotary-slate dark:text-white/50 text-sm mt-1">{albums.length} album{albums.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {canEdit && (
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rotary-blue text-white text-sm font-semibold hover:bg-rotary-blue-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Album
            </button>
          )}
        </div>

        {/* Add/Edit Album Form */}
        <AnimatePresence>
          {canEdit && showForm && (
            <motion.div
              className="mb-8 bg-white dark:bg-rotary-navy-light rounded-xl p-6 border border-gray-100 dark:border-white/5 shadow-sm"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            >
              <h3 className="font-display font-semibold text-base mb-4">{editingId ? 'Edit Album' : 'New Album'}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <input className={inputClass} placeholder="Album Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Date</label>
                  <input className={inputClass} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <input className={`${inputClass} sm:col-span-2`} placeholder="Cover Image URL (WordPress)" value={form.coverImage} onChange={e => setForm({ ...form, coverImage: e.target.value })} />
                {form.coverImage && (
                  <div className="sm:col-span-2 h-32 rounded-lg overflow-hidden">
                    <img src={form.coverImage} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <textarea className={`${inputClass} sm:col-span-2`} rows={2} placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                <div>
                  <label className="text-xs text-rotary-slate dark:text-white/40 block mb-1">Display Order</label>
                  <input className={inputClass} type="number" min="0" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleSaveAlbum} disabled={!form.title} className="px-5 py-2 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm disabled:opacity-50 hover:bg-rotary-gold-light transition-colors">
                  {editingId ? 'Save Changes' : 'Create Album'}
                </button>
                <button onClick={resetForm} className="px-5 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Album Grid */}
        {albums.length === 0 ? (
          <div className="text-center py-24 text-rotary-slate dark:text-white/30">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-lg font-medium">No albums yet</p>
            {canEdit && <p className="text-sm mt-1">Click "New Album" to create your first gallery.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((album, i) => (
              <motion.div
                key={album.id}
                className="group relative rounded-2xl overflow-hidden cursor-pointer bg-gray-100 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:shadow-lg transition-all"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => setSelectedAlbum(album)}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  {album.coverImage ? (
                    <img src={album.coverImage} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-rotary-blue/20 to-rotary-gold/20 flex items-center justify-center">
                      <svg className="w-12 h-12 text-rotary-slate/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-display font-bold text-white text-lg leading-tight">{album.title}</h3>
                  <p className="text-white/60 text-xs mt-1">
                    {(album.photos || []).length} photo{(album.photos || []).length !== 1 ? 's' : ''}
                    {album.date && ` · ${new Date(album.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
                  </p>
                </div>
                {canEdit && (
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleEditAlbum(album)} className="w-7 h-7 rounded-lg bg-white/80 text-rotary-charcoal flex items-center justify-center hover:bg-white transition-colors shadow">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setDeleteId(album.id)} className="w-7 h-7 rounded-lg bg-red-500/80 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Album Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <motion.div className="relative bg-white dark:bg-rotary-navy-light rounded-2xl shadow-2xl p-6 w-full max-w-sm" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="font-display font-bold text-lg mb-1">Delete Album?</h3>
              <p className="text-sm text-gray-400 dark:text-white/50 mb-6">This will permanently delete the album and all its photos.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold">Cancel</button>
                <button onClick={async () => { await remove(deleteId); setDeleteId(null) }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  // ── Single Album View ──
  const photos = selectedAlbum.photos || []
  return (
    <div className="min-h-screen pt-5">
      <div className="section-padding max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedAlbum(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="heading-lg">{selectedAlbum.title}</h1>
              {selectedAlbum.description && <p className="text-rotary-slate dark:text-white/50 text-sm mt-1">{selectedAlbum.description}</p>}
              <p className="text-rotary-slate dark:text-white/40 text-xs mt-1">
                {photos.length} photo{photos.length !== 1 ? 's' : ''}
                {selectedAlbum.date && ` · ${new Date(selectedAlbum.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              </p>
            </div>
          </div>
        </div>

        {/* Admin: Add Photo */}
        {canEdit && (
          <div className="mb-8 bg-white dark:bg-rotary-navy-light rounded-xl p-5 border border-gray-100 dark:border-white/5">
            <h3 className="font-display font-semibold text-sm mb-3">Add Photo</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input className={inputClass} placeholder="Photo URL (WordPress) *" value={newPhotoUrl} onChange={e => setNewPhotoUrl(e.target.value)} />
              <input className={`${inputClass} sm:w-56`} placeholder="Caption (optional)" value={newPhotoCaption} onChange={e => setNewPhotoCaption(e.target.value)} />
              <button onClick={addPhoto} disabled={!newPhotoUrl} className="px-5 py-2.5 rounded-lg bg-rotary-gold text-rotary-navy font-semibold text-sm disabled:opacity-50 hover:bg-rotary-gold-light transition-colors shrink-0">
                + Add Photo
              </button>
            </div>
            {newPhotoUrl && (
              <div className="mt-3 h-24 w-36 rounded-lg overflow-hidden">
                <img src={newPhotoUrl} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* Photo Grid */}
        {photos.length === 0 ? (
          <div className="text-center py-20 text-rotary-slate dark:text-white/30">
            <p className="text-lg font-medium">No photos yet</p>
            {canEdit && <p className="text-sm mt-1">Add photos using the form above.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer bg-gray-100 dark:bg-white/5"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                onClick={() => openLightbox(photo, i)}
              >
                <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                {photo.caption && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <p className="text-white text-xs font-medium">{photo.caption}</p>
                  </div>
                )}
                {canEdit && (
                  <button
                    onClick={e => { e.stopPropagation(); deletePhoto(photo.id) }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightboxPhoto(null)}
          >
            {/* Close */}
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-4 text-white/50 text-sm z-10">
              {lightboxIndex + 1} / {photos.length}
            </div>

            {/* Prev */}
            {photos.length > 1 && (
              <button
                className="absolute left-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
                onClick={e => { e.stopPropagation(); const prev = (lightboxIndex - 1 + photos.length) % photos.length; setLightboxIndex(prev); setLightboxPhoto(photos[prev]) }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}

            {/* Image */}
            <motion.img
              key={lightboxPhoto.id}
              src={lightboxPhoto.url}
              alt={lightboxPhoto.caption || ''}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={e => e.stopPropagation()}
            />

            {/* Next */}
            {photos.length > 1 && (
              <button
                className="absolute right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
                onClick={e => { e.stopPropagation(); const next = (lightboxIndex + 1) % photos.length; setLightboxIndex(next); setLightboxPhoto(photos[next]) }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            )}

            {/* Caption */}
            {lightboxPhoto.caption && (
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white/70 text-sm">{lightboxPhoto.caption}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
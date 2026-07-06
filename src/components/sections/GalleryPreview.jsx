import { motion } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'

export default function GalleryPreview({ onViewAll }) {
  // Read-only display — always use the lightweight REST read, no SDK needed.
  const { data: albums, loading } = useCollection('gallery', [], { live: false })

  if (loading || albums.length === 0) return null

  const latest = [...albums]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 3)

  return (
    <section className="section-padding bg-white dark:bg-rotary-navy">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-rotary-gold font-semibold mb-4 block text-sm uppercase tracking-wider">
            Photo Gallery
          </span>
          <h2 className="heading-lg mb-4">
            Moments &amp; <span className="text-gradient">Memories</span>
          </h2>
          <p className="text-rotary-slate dark:text-white/50 max-w-2xl mx-auto">
            A glimpse into our journey — events, projects and celebrations.
          </p>
        </motion.div>

        {/* Album Preview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {latest.map((album, i) => (
            <motion.div
              key={album.id}
              className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/3] bg-gray-100 dark:bg-white/5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.02 }}
              onClick={onViewAll}
            >
              {album.coverImage ? (
                <img
                  src={album.coverImage}
                  alt={album.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-rotary-blue/20 to-rotary-gold/20 flex items-center justify-center">
                  <svg className="w-12 h-12 text-rotary-slate/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-display font-bold text-white text-lg leading-tight">{album.title}</h3>
                <p className="text-white/60 text-xs mt-1">
                  {(album.photos || []).length} photo{(album.photos || []).length !== 1 ? 's' : ''}
                  {album.date && ` · ${new Date(album.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
                </p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <motion.button
            onClick={onViewAll}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl border-2 border-rotary-blue text-rotary-blue font-semibold text-sm hover:bg-rotary-blue hover:text-white transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            View All Photos
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.button>
        </div>
      </div>
    </section>
  )
}
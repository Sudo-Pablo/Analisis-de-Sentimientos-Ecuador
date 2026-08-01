import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Archive, Facebook, Video, ExternalLink, MessageSquare, Heart,
  Calendar, Loader2, AlertCircle,
} from 'lucide-react'
import { getCategoryLabel } from '../utils/resolveSearchCategory'

const formatDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const PlatformBadge = ({ platform, dark }) => {
  const isFacebook = platform === 'facebook'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isFacebook
          ? dark
            ? 'bg-[#1877F2]/20 text-[#93c5fd]'
            : 'bg-[#1877F2]/10 text-[#1877F2]'
          : dark
            ? 'bg-[#ff0050]/20 text-[#fda4af]'
            : 'bg-[#ff0050]/10 text-[#c9185a]'
      }`}
    >
      {isFacebook ? <Facebook size={12} /> : <Video size={12} />}
      {isFacebook ? 'Facebook' : 'TikTok'}
    </span>
  )
}

const HistoricalPostCard = ({ post, dark }) => (
  <div
    className={`rounded-xl border p-4 text-left transition-colors ${
      dark
        ? 'border-slate-700/60 bg-slate-900/40 hover:bg-slate-900/60'
        : 'border-slate-200 bg-white hover:bg-slate-50'
    }`}
  >
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="flex items-start justify-between gap-3 mb-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          className="flex items-center gap-2 flex-wrap"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <PlatformBadge platform={post.platform} dark={dark} />
          {post.author_name && (
            <span className={`text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
              {post.author_name}
            </span>
          )}
        </motion.div>
        {(post.post_time || post.collected_at) && (
          <span className={`inline-flex items-center gap-1 text-xs shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            <Calendar size={12} />
            {formatDate(post.post_time || post.collected_at)}
          </span>
        )}
      </motion.div>

      <p className={`text-sm line-clamp-3 mb-3 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
        {post.text || 'Sin texto disponible'}
      </p>

      <div className={`flex items-center justify-between gap-3 text-xs ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <span className="inline-flex items-center gap-1">
            <Heart size={12} />
            {post.likes?.toLocaleString?.() ?? post.likes ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare size={12} />
            {post.comments_count?.toLocaleString?.() ?? post.comments_count ?? 0}
          </span>
        </motion.div>
        {post.post_url && (
          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 font-medium ${
              dark ? 'text-[#60a5fa] hover:text-[#93c5fd]' : 'text-[#1877F2] hover:text-[#2563eb]'
            }`}
          >
            Ver publicación
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </motion.div>
  </div>
)

const HistoricalPostsSection = ({
  category,
  keyword,
  posts = [],
  total = 0,
  loading = false,
  loadingMore = false,
  error = null,
  hasMore = false,
  onLoadMore,
  dark = false,
}) => {
  const [expanded, setExpanded] = useState(true)

  if (!category && !loading) return null

  const categoryLabel = getCategoryLabel(category)
  const title = `Publicaciones anteriores en ${categoryLabel}`

  return (
    <motion.section
      id="historical-posts-section"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="mt-8 text-left"
    >
      <div
        className={`rounded-2xl border overflow-hidden ${
          dark ? 'border-slate-700/60 bg-slate-900/30' : 'border-slate-200 bg-white'
        }`}
      >
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={`w-full flex items-center justify-between gap-4 px-5 py-4 text-left ${
            dark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <motion.div className={`p-2 rounded-xl ${dark ? 'bg-slate-800 text-[#67e8f9]' : 'bg-slate-100 text-slate-700'}`}>
              <Archive size={18} />
            </motion.div>
            <div>
              <h3 className={`text-base font-semibold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
                {title}
              </h3>
              <p className={`text-sm mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                {keyword
                  ? `Contenido guardado relacionado con "${keyword}"`
                  : 'Contenido guardado en la base de datos'}
              </p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
          }`}>
            {loading ? '...' : total}
          </span>
        </button>

        {expanded && (
          <div className={`px-5 pb-5 border-t ${dark ? 'border-slate-700/60' : 'border-slate-100'}`}>
            {loading && (
              <motion.div
                className={`flex items-center justify-center gap-2 py-10 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Loader2 size={18} className="animate-spin" />
                Cargando publicaciones guardadas...
              </motion.div>
            )}

            {!loading && error && (
              <motion.div
                className={`flex items-center gap-2 py-8 text-sm ${dark ? 'text-red-300' : 'text-red-600'}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}

            {!loading && !error && posts.length === 0 && (
              <motion.p
                className={`py-8 text-sm text-center ${dark ? 'text-slate-400' : 'text-slate-500'}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                Aún no hay publicaciones guardadas en la categoría {categoryLabel}.
              </motion.p>
            )}

            {!loading && !error && posts.length > 0 && (
              <motion.div
                className="grid gap-3 mt-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {posts.map((post) => (
                  <HistoricalPostCard key={`${post.platform}-${post.post_id}`} post={post} dark={dark} />
                ))}
              </motion.div>
            )}

            {!loading && !error && hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dark
                      ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-60'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60'
                  }`}
                >
                  {loadingMore && <Loader2 size={16} className="animate-spin" />}
                  Ver más
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.section>
  )
}

export default HistoricalPostsSection

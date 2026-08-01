import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Loader2, MessageSquare, Smile, Frown, Clock, ExternalLink, Hash,
  AlertCircle, CheckCircle, Globe, Newspaper, Square, X, Sparkles
} from 'lucide-react'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import ThemedPageShell from '../components/ThemedPageShell'
import SearchParamsCollapse from '../components/SearchParamsCollapse'
import SearchResultsGrid, { buildSentimentChartData } from '../components/SearchResultsGrid'
import Badge from '../components/Badge'
import SearchInProgressStatus from '../components/SearchInProgressStatus'
import IndependentSearchTour from '../components/IndependentSearchTour'
import { searchFacebook, getFacebookStatus, logSearchEvent, cancelSearch, createSearchId, SearchStoppedError } from '../services/api'
import { requestFacebookTourRestart, EXPAND_FACEBOOK_PARAMS_EVENT } from '../utils/onboarding'
import { SEARCH_LIMIT_MAX, parseLimitInput, resolveSearchLimit } from '../utils/searchLimits'
const SENTIMENT_BORDER = {
  positivo: 'border-l-emerald-500',
  negativo: 'border-l-red-500',
  neutral: 'border-l-slate-400',
}

const SENTIMENT_FILTER_LABELS = {
  positivo: 'Positivos',
  negativo: 'Negativos',
  neutral: 'Neutrales',
}

const normalizeSentiment = (sentiment) => {
  const s = String(sentiment || 'neutral').toLowerCase()
  if (s.startsWith('pos')) return 'positivo'
  if (s.startsWith('neg')) return 'negativo'
  return 'neutral'
}

const extractPostTags = (text = '') => {
  const raw = String(text || '')
  const hashtags = [...raw.matchAll(/#([\w\u00C0-\u024F]+)/gu)].map((m) => m[1])
  const mentions = [...raw.matchAll(/@([\w.\u00C0-\u024F]+)/gu)].map((m) => m[1])
  const unique = []
  const seen = new Set()
  for (const tag of [...hashtags.map((t) => `#${t}`), ...mentions.map((t) => `@${t}`)]) {
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(tag)
  }
  const cleanText = raw
    .replace(/#[\w\u00C0-\u024F]+/gu, ' ')
    .replace(/@[\w.\u00C0-\u024F]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { tags: unique.slice(0, 8), cleanText: cleanText || raw }
}

const BuscadorFacebook = () => {
  const [keyword, setKeyword] = useState('')
  const [maxPosts, setMaxPosts] = useState(5)
  const [maxComments, setMaxComments] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [selectedSentiment, setSelectedSentiment] = useState(null)
  const [status, setStatus] = useState(null)
  const abortRef = useRef(null)
  const searchIdRef = useRef(null)
  useEffect(() => {
    loadStatus()
  }, [])
  const loadStatus = async () => {
    try {
      const data = await getFacebookStatus()
      setStatus(data)
    } catch {
      setStatus({
        available: true,
        recommended_method: 'ppr',
        methods: {
          ppr: { available: false, recommended: true },
          apify: { available: false, recommended: false },
        },
      })
    }
  }
  const serviceAvailable = status?.available ?? true
  const handleStop = async () => {
    const searchId = searchIdRef.current
    if (searchId) {
      await cancelSearch(searchId)
    }
    abortRef.current?.abort()
  }
  const handleSearch = async (e) => {
    e.preventDefault()
    if (!keyword.trim()) {
      setError('Por favor ingresa una palabra clave')
      return
    }
    if (!serviceAvailable) {
      setError('El servicio de Facebook no está disponible')
      return
    }
    const postsLimit = resolveSearchLimit(maxPosts)
    const commentsLimit = resolveSearchLimit(maxComments)
    if (postsLimit === null || commentsLimit === null) {
      setError(`Indica un número entre 1 y ${SEARCH_LIMIT_MAX} en los parámetros de búsqueda`)
      return
    }
    setLoading(true)
    setError(null)
    setResults(null)
    setSelectedSentiment(null)
    const searchId = createSearchId()
    searchIdRef.current = searchId
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const data = await searchFacebook({
        keyword: keyword.trim(),
        categoria: null,
        method: 'ppr',
        max_posts: postsLimit,
        max_comments_per_post: commentsLimit,
        search_type: 'posts',
        location: 'Ecuador',
        dual_search: true,
        search_id: searchId,
      }, { signal: controller.signal })
      logSearchEvent({ keyword: keyword.trim(), source: 'facebook', category: null })
      setResults(data)
    } catch (err) {
      if (err?.name === 'AbortError' || err instanceof SearchStoppedError || err?.stopped) {
        setError('Búsqueda detenida')
        setResults(null)
      } else {
        setError(err.message || 'Error al buscar en Facebook')
      }
    } finally {
      setLoading(false)
      searchIdRef.current = null
      abortRef.current = null
    }
  }
  const normalizeComment = (comment) => ({
    author: comment.author || comment.commenter_name || comment.user_name || 'facebook_user',
    text: comment.text || comment.original_text || comment.cleaned_text || '',
    likes: comment.likes ?? comment.comment_likes ?? 0,
    createdAt: comment.created_at || comment.comment_time || comment.collected_at || null,
    sentiment: comment.sentiment || 'neutral',
    confidence: comment.confidence ?? 0,
  })
  const facebookComments = (results?.comments || []).map(normalizeComment)

  const { barData, pieData } = buildSentimentChartData(results?.sentiment_summary)

  const filteredComments = selectedSentiment
    ? facebookComments.filter((c) => normalizeSentiment(c.sentiment) === selectedSentiment)
    : facebookComments
  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 backdrop-blur-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1877F2]/40 focus:border-[#1877F2]/50 disabled:opacity-50'
  const labelClass = 'block text-sm font-semibold text-slate-800 mb-1'
  return (
    <ThemedPageShell theme="facebook">
      <PageHeader
        dark
        title="Buscador Facebook"
        description="Búsqueda por palabra clave y análisis de sentimientos en publicaciones"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2 mr-14 lg:mr-16">
            <button
              type="button"
              onClick={requestFacebookTourRestart}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
                         text-[11px] lg:text-xs font-semibold text-[#a5f3fc]
                         bg-slate-900/75 border border-[#67e8f9]/35 backdrop-blur-md
                         hover:bg-slate-800/90 hover:border-[#67e8f9]/55 hover:text-white
                         shadow-lg shadow-black/20 transition-colors"
              aria-label="Reiniciar tutorial del buscador Facebook"
            >
              <Sparkles size={13} strokeWidth={2.25} />
              Tutorial
            </button>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${serviceAvailable ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30' : 'bg-red-500/15 text-red-200 border-red-400/30'}`}>
              {serviceAvailable ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {serviceAvailable ? 'Servicio disponible' : 'Servicio no disponible'}
            </div>
          </div>
        }
      />
      <div className="rounded-2xl border border-white/50 bg-white/40 backdrop-blur-md p-5 lg:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
        <form onSubmit={handleSearch} className="space-y-4">
          <div id="tour-facebook-search">
            <label className={labelClass}>Palabra clave</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1877F2]" size={20} />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ej: seguridad ecuador, gobierno nacional..."
                className={`${inputClass} pl-10 text-base lg:text-lg`}
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {loading ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold transition-all active:scale-[0.98] shadow-md shrink-0"
              >
                <Square size={18} fill="currentColor" />
                Detener
              </button>
            ) : (
              <button
                type="submit"
                disabled={!serviceAvailable}
                className="flex items-center gap-2 px-6 py-2.5 gradient-facebook text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-md"
              >
                <Search size={20} />
                Buscar y Analizar
              </button>
            )}
            {loading && (
              <SearchInProgressStatus
                keyword={keyword}
                estimatedTime="Puede tardar entre 1 y 3 minutos"
                accentClass="text-[#1877F2]"
                borderClass="border-[#1877F2]/25"
                bgClass="bg-[#1877F2]/8"
                dotClass="bg-[#1877F2]"
              />
            )}
          </div>
          <SearchParamsCollapse
            theme="facebook"
            id="tour-facebook-params"
            expandEvent={EXPAND_FACEBOOK_PARAMS_EVENT}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Máx. publicaciones</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={maxPosts}
                  onChange={(e) => {
                    const next = parseLimitInput(e.target.value)
                    if (next !== null) setMaxPosts(next)
                  }}
                  placeholder={`1 – ${SEARCH_LIMIT_MAX}`}
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>Máx. comentarios/publicación</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={maxComments}
                  onChange={(e) => {
                    const next = parseLimitInput(e.target.value)
                    if (next !== null) setMaxComments(next)
                  }}
                  placeholder={`1 – ${SEARCH_LIMIT_MAX}`}
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>
          </SearchParamsCollapse>
        </form>
      </div>
      {error && (
        <div className="bg-red-500/15 border border-red-400/40 backdrop-blur-sm p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-red-100">
            <AlertCircle size={20} />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}
      <AnimatePresence>
        {results && (
          <motion.div
            className="space-y-5 lg:space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
              <StatCard title="Publicaciones encontradas" value={results.posts_found || 0} icon={Newspaper} color="primary" index={0} />
              <StatCard title="Comentarios analizados" value={results.comments_analyzed || 0} icon={MessageSquare} color="neutral" index={1} />
              <StatCard
                title="Sentimiento positivo"
                value={`${results.sentiment_summary?.positive_pct ?? 0}%`}
                subtitle={`${results.sentiment_summary?.positive ?? 0} comentarios`}
                icon={Smile}
                color="positive"
                index={2}
              />
              {((results.sentiment_summary?.negative ?? 0) > 0 || (results.sentiment_summary?.negative_pct ?? 0) > 0) ? (
                <StatCard
                  title="Sentimiento negativo"
                  value={`${results.sentiment_summary?.negative_pct ?? 0}%`}
                  subtitle={`${results.sentiment_summary?.negative ?? 0} comentarios`}
                  icon={Frown}
                  color="negative"
                  index={3}
                />
              ) : (
                <StatCard
                  title="Sentimiento neutral"
                  value={`${results.sentiment_summary?.neutral_pct ?? 0}%`}
                  subtitle={`${results.sentiment_summary?.neutral ?? 0} comentarios`}
                  icon={MessageSquare}
                  color="neutral"
                  index={3}
                />
              )}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-sm border ${
              results.saved_to_db
                ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100'
                : results.db_save_pending
                  ? 'bg-sky-500/15 border-sky-400/30 text-sky-100'
                  : 'bg-amber-500/15 border-amber-400/30 text-amber-100'
            }`}>
              {results.saved_to_db ? (
                <CheckCircle size={18} />
              ) : results.db_save_pending ? (
                <Clock size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span className="text-sm">
                {results.saved_to_db
                  ? 'Resultados guardados en base de datos'
                  : results.db_save_pending
                    ? 'Guardando en base de datos en segundo plano'
                    : 'No se pudo confirmar guardado en base de datos'}
              </span>
            </div>
            {results.posts_found === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-dashed border-white/40 bg-white/25 backdrop-blur-sm">
                <Globe className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-medium text-slate-900">No se encontraron posts</h3>
                <p className="mt-2 text-slate-600">Prueba con otra palabra clave o ajusta los parámetros</p>
              </div>
            ) : (
              <SearchResultsGrid
                barData={barData}
                pieData={pieData}
                showCharts={results.comments_analyzed > 0}
                selectedSentiment={selectedSentiment}
                onSentimentSelect={setSelectedSentiment}
                contentTitle={`Publicaciones encontradas (${results.posts?.length || 0})`}
                contentChildren={
                  <div className="max-h-64 overflow-y-auto scrollbar-hide space-y-3 pr-1">
                    {(results.posts || []).map((post, idx) => {
                      const { tags, cleanText } = extractPostTags(post.text)
                      return (
                      <div key={idx} className="rounded-xl p-3 border border-white/50 bg-white/55 backdrop-blur-sm border-l-4 border-l-[#1877F2]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-900">{post.page_name || post.author}</p>
                              {post.topic && (
                                <span className="px-2 py-0.5 rounded-full text-xs capitalize bg-slate-100 text-slate-600">
                                  {post.topic}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-800 mt-1 line-clamp-3">{cleanText}</p>
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {tags.map((tag, i) => (
                                  <span
                                    key={`${tag}-${i}`}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-[#1877F2]/10 text-[#0f4c9e] text-xs rounded-full"
                                  >
                                    {tag.startsWith('#') ? <Hash size={10} /> : null}
                                    {tag.startsWith('#') ? tag.slice(1) : tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 text-xs text-slate-600 shrink-0">
                            <span className="flex items-center gap-1"><MessageSquare size={12} />{post.comments_count?.toLocaleString() || 0}</span>
                            {post.url && (
                              <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-[#1877F2] hover:text-[#0f4c9e]">
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                }
                commentsTitle={
                  selectedSentiment
                    ? `Comentarios ${SENTIMENT_FILTER_LABELS[selectedSentiment]} (${filteredComments.length})`
                    : `Comentarios Analizados (${facebookComments.length})`
                }
                commentsChildren={
                  <>
                    {selectedSentiment && (
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs text-slate-600">
                          Filtro activo: solo comentarios {SENTIMENT_FILTER_LABELS[selectedSentiment]}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedSentiment(null)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shrink-0"
                        >
                          <X size={12} strokeWidth={2.5} />
                          Quitar filtro
                        </button>
                      </div>
                    )}
                    {filteredComments.length > 0 ? (
                      filteredComments.map((comment, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl p-3 border border-white/50 bg-white/55 backdrop-blur-sm border-l-4 ${SENTIMENT_BORDER[comment.sentiment] || SENTIMENT_BORDER.neutral}`}
                        >
                          <p className="text-sm text-slate-900 font-medium mb-1">{comment.author}</p>
                          <p className="text-sm text-slate-800 mb-2 line-clamp-3">{comment.text}</p>
                          <div className="flex items-center justify-between text-xs gap-2">
                            <Badge sentiment={comment.sentiment} />
                            <span className="text-slate-700 shrink-0">
                              {comment.createdAt
                                ? new Date(comment.createdAt).toLocaleDateString('es-ES')
                                : comment.likes
                                  ? `${comment.likes} likes`
                                  : ''}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600 py-4 text-center">
                        {selectedSentiment
                          ? `No hay comentarios ${SENTIMENT_FILTER_LABELS[selectedSentiment]} en esta búsqueda.`
                          : 'No hay comentarios para mostrar.'}
                      </p>
                    )}
                  </>
                }
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <IndependentSearchTour platform="facebook" />
    </ThemedPageShell>
  )
}
export default BuscadorFacebook

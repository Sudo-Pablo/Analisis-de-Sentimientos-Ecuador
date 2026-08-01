import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Loader2, Video, MessageSquare, Smile, Frown, Clock, Hash,
  ThumbsUp, ExternalLink, AlertCircle, CheckCircle, Music2, Square, X, Sparkles
} from 'lucide-react'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import ThemedPageShell from '../components/ThemedPageShell'
import SearchParamsCollapse from '../components/SearchParamsCollapse'
import SearchResultsGrid, { buildSentimentChartData } from '../components/SearchResultsGrid'
import Badge from '../components/Badge'
import SearchInProgressStatus from '../components/SearchInProgressStatus'
import IndependentSearchTour from '../components/IndependentSearchTour'
import { searchTikTok, getTikTokStatus, logSearchEvent, cancelSearch, createSearchId, SearchStoppedError } from '../services/api'
import { requestTikTokTourRestart, EXPAND_TIKTOK_PARAMS_EVENT } from '../utils/onboarding'
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

const BuscadorTikTok = () => {
  const [keyword, setKeyword] = useState('')
  const [maxVideos, setMaxVideos] = useState(5)
  const [maxComments, setMaxComments] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [selectedSentiment, setSelectedSentiment] = useState(null)
  const [serviceAvailable, setServiceAvailable] = useState(null)
  const abortRef = useRef(null)
  const searchIdRef = useRef(null)
  useEffect(() => {
    checkServiceStatus()
  }, [])
  const checkServiceStatus = async () => {
    try {
      const status = await getTikTokStatus()
      setServiceAvailable(status.available)
    } catch {
      setServiceAvailable(false)
    }
  }
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
    const videosLimit = resolveSearchLimit(maxVideos)
    const commentsLimit = resolveSearchLimit(maxComments)
    if (videosLimit === null || commentsLimit === null) {
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
      const data = await searchTikTok({
        keyword: keyword.trim(),
        categoria: null,
        max_videos: videosLimit,
        max_comments_per_video: commentsLimit,
        search_id: searchId,
      }, { signal: controller.signal })
      logSearchEvent({ keyword: keyword.trim(), source: 'tiktok', category: null })
      setResults(data)
    } catch (err) {
      if (err?.name === 'AbortError' || err instanceof SearchStoppedError || err?.stopped) {
        setError('Búsqueda detenida')
        setResults(null)
      } else {
        setError(err.message || 'Error al buscar en TikTok')
      }
    } finally {
      setLoading(false)
      searchIdRef.current = null
      abortRef.current = null
    }
  }
  const { barData, pieData } = buildSentimentChartData(results?.sentiment_summary)

  const allComments = results?.comments || []
  const filteredComments = selectedSentiment
    ? allComments.filter((c) => normalizeSentiment(c.sentiment) === selectedSentiment)
    : allComments
  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 backdrop-blur-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#ff0050]/40 focus:border-[#ff0050]/50 disabled:opacity-50'
  const labelClass = 'block text-sm font-semibold text-slate-800 mb-1'
  return (
    <ThemedPageShell theme="tiktok">
      <PageHeader
        dark
        title="Buscador TikTok"
        description="Busca videos por palabra clave y analiza sentimientos en comentarios"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2 mr-14 lg:mr-16">
            <button
              type="button"
              onClick={requestTikTokTourRestart}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
                         text-[11px] lg:text-xs font-semibold text-[#a5f3fc]
                         bg-slate-900/75 border border-[#67e8f9]/35 backdrop-blur-md
                         hover:bg-slate-800/90 hover:border-[#67e8f9]/55 hover:text-white
                         shadow-lg shadow-black/20 transition-colors"
              aria-label="Reiniciar tutorial del buscador TikTok"
            >
              <Sparkles size={13} strokeWidth={2.25} />
              Tutorial
            </button>
            {serviceAvailable !== null && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                serviceAvailable
                  ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
                  : 'bg-red-500/15 text-red-200 border-red-400/30'
              }`}>
                {serviceAvailable ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {serviceAvailable ? 'Servicio disponible' : 'Servicio no disponible'}
              </div>
            )}
          </div>
        }
      />
      <div className="rounded-2xl border border-white/50 bg-white/40 backdrop-blur-md p-5 lg:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
        <form onSubmit={handleSearch} className="space-y-4">
          <div id="tour-tiktok-search">
            <label className={labelClass}>Palabra clave</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ff0050]" size={20} />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ej: seguridad ecuador, salud pública..."
                className={`${inputClass} pl-10 text-base lg:text-lg`}
                disabled={loading || !serviceAvailable}
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
                className="flex items-center gap-2 px-6 py-2.5 gradient-tiktok text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-md"
              >
                <Search size={20} />
                Buscar y Analizar
              </button>
            )}
            {loading && (
              <SearchInProgressStatus
                keyword={keyword}
                estimatedTime="Puede tardar entre 1 y 2 minutos"
                accentClass="text-[#ff0050]"
                borderClass="border-[#ff0050]/25"
                bgClass="bg-[#ff0050]/8"
                dotClass="bg-[#ff0050]"
              />
            )}
          </div>
          <SearchParamsCollapse
            theme="tiktok"
            id="tour-tiktok-params"
            expandEvent={EXPAND_TIKTOK_PARAMS_EVENT}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Máx. videos</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={maxVideos}
                  onChange={(e) => {
                    const next = parseLimitInput(e.target.value)
                    if (next !== null) setMaxVideos(next)
                  }}
                  placeholder={`1 – ${SEARCH_LIMIT_MAX}`}
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>Máx. comentarios/video</label>
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
              <StatCard title="Videos Encontrados" value={results.videos_found || 0} icon={Video} color="purple" index={0} />
              <StatCard title="Comentarios Analizados" value={results.comments_analyzed || 0} icon={MessageSquare} color="blue" index={1} />
              <StatCard
                title="Sentimiento Positivo"
                value={`${results.sentiment_summary?.positive_pct ?? 0}%`}
                subtitle={`${results.sentiment_summary?.positive ?? 0} comentarios`}
                icon={Smile}
                color="green"
                index={2}
              />
              {((results.sentiment_summary?.negative ?? 0) > 0 || (results.sentiment_summary?.negative_pct ?? 0) > 0) ? (
                <StatCard
                  title="Sentimiento Negativo"
                  value={`${results.sentiment_summary?.negative_pct ?? 0}%`}
                  subtitle={`${results.sentiment_summary?.negative ?? 0} comentarios`}
                  icon={Frown}
                  color="negative"
                  index={3}
                />
              ) : (
                <StatCard
                  title="Sentimiento Neutral"
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
                    : 'Los resultados no se pudieron guardar'}
              </span>
            </div>
            {results.videos_found === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-dashed border-white/40 bg-white/25 backdrop-blur-sm">
                <Music2 className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-medium text-slate-900">No se encontraron videos</h3>
                <p className="mt-2 text-slate-600">Prueba con otra palabra clave</p>
              </div>
            ) : (
              <SearchResultsGrid
                barData={barData}
                pieData={pieData}
                showCharts={results.comments_analyzed > 0}
                selectedSentiment={selectedSentiment}
                onSentimentSelect={setSelectedSentiment}
                contentTitle={`Videos Encontrados (${results.videos?.length || 0})`}
                contentChildren={
                  <div className="max-h-64 overflow-y-auto scrollbar-hide space-y-3 pr-1">
                    {(results.videos || []).map((video, idx) => (
                      <div key={idx} className="rounded-xl p-3 border border-white/50 bg-white/55 backdrop-blur-sm border-l-4 border-l-[#ff0050]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-900">@{video.author}</p>
                              {video.topic && (
                                <span className="px-2 py-0.5 rounded-full text-xs capitalize bg-slate-100 text-slate-600">
                                  {video.topic}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-800 mt-1 line-clamp-2">{video.text}</p>
                            {video.hashtags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {video.hashtags.slice(0, 4).map((tag, i) => (
                                  <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-[#ff0050]/10 text-[#9d174d] text-xs rounded-full">
                                    <Hash size={10} />{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 text-xs text-slate-600 shrink-0">
                            <span className="flex items-center gap-1"><ThumbsUp size={12} />{video.likes?.toLocaleString()}</span>
                            <span className="flex items-center gap-1"><MessageSquare size={12} />{video.comments_count?.toLocaleString()}</span>
                            {video.url && (
                              <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-[#ff0050]">
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                }
                commentsTitle={
                  selectedSentiment
                    ? `Comentarios ${SENTIMENT_FILTER_LABELS[selectedSentiment]} (${filteredComments.length})`
                    : `Comentarios Analizados (${allComments.length})`
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
                          <p className="text-sm text-slate-900 font-medium mb-1">@{comment.author}</p>
                          <p className="text-sm text-slate-800 mb-2 line-clamp-3">{comment.text}</p>
                          <div className="flex items-center justify-between text-xs gap-2">
                            <Badge sentiment={comment.sentiment} />
                            <span className="text-slate-700 shrink-0">
                              {comment.created_at
                                ? new Date(comment.created_at).toLocaleDateString('es-ES')
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
      <IndependentSearchTour platform="tiktok" />
    </ThemedPageShell>
  )
}
export default BuscadorTikTok

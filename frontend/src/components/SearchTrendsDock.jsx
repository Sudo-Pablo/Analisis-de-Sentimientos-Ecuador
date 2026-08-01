import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, TrendingUp, RefreshCw, ExternalLink, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { getSearchTrends } from '../services/api'

const POLL_MS = 30000

const TOPIC_ACCENTS = {
  Politica: 'from-[#1877F2]/30 to-[#1877F2]/5 text-[#93c5fd] border-[#1877F2]/40',
  Economia: 'from-amber-500/30 to-amber-500/5 text-amber-200 border-amber-500/40',
  Salud: 'from-emerald-500/30 to-emerald-500/5 text-emerald-200 border-emerald-500/40',
  Seguridad: 'from-rose-500/30 to-rose-500/5 text-rose-200 border-rose-500/40',
  Educacion: 'from-violet-500/30 to-violet-500/5 text-violet-200 border-violet-500/40',
  Social: 'from-orange-500/30 to-orange-500/5 text-orange-200 border-orange-500/40',
}

const topicClass = (category) =>
  TOPIC_ACCENTS[category] || 'from-slate-500/30 to-slate-500/5 text-slate-300 border-slate-500/40'

const topicHref = (topic) => {
  if (topic.topic_id) return `/analisis-tema?topic=${topic.topic_id}`
  return `/analisis-tema?name=${encodeURIComponent(topic.category)}`
}

const SearchTrendsDock = ({ onSelectKeyword, disabled = false, refreshKey = 0, minimized = false }) => {
  const [popular, setPopular] = useState([])
  const [hotTopics, setHotTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(!minimized)

  useEffect(() => {
    setExpanded(!minimized)
  }, [minimized])

  useEffect(() => {
    const onExpand = () => setExpanded(true)
    window.addEventListener('onboarding:expand-trends', onExpand)
    return () => window.removeEventListener('onboarding:expand-trends', onExpand)
  }, [])

  const loadTrends = useCallback(async ({ manual = false } = {}) => {
    if (manual) setRefreshing(true)
    try {
      const data = await getSearchTrends({
        popularDays: 0,
        hotDays: 0,
        popularLimit: 5,
        hotLimit: 4,
      })
      setPopular(data.popular || [])
      setHotTopics((data.hot_topics || []).filter((t) => Number(t.count) > 0).slice(0, 4))
      setError(null)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar tendencias')
    } finally {
      setLoading(false)
      if (manual) {
        setTimeout(() => setRefreshing(false), 450)
      }
    }
  }, [])

  useEffect(() => {
    loadTrends()
    const id = setInterval(() => loadTrends(), POLL_MS)
    return () => clearInterval(id)
  }, [loadTrends, refreshKey])

  const hasContent = popular.length > 0 || hotTopics.length > 0
  const maxHotCount = Math.max(...hotTopics.map((t) => Number(t.count) || 0), 1)
  const isCollapsed = minimized && !expanded

  return (
    <motion.div
      id="tour-search-trends"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.45 }}
      className="mt-6 w-full max-w-3xl mx-auto"
      layout
    >
      <motion.div
        layout
        className={`rounded-2xl border border-slate-700/50 bg-slate-900/55 backdrop-blur-xl shadow-xl shadow-black/20 overflow-hidden ${
          isCollapsed ? 'p-3 lg:px-4 lg:py-3' : 'p-4 lg:p-5'
        }`}
      >
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full flex items-center justify-between gap-3 text-left group"
            aria-expanded="false"
          >
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp size={16} className="text-[#67e8f9] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold bg-gradient-to-r from-[#60a5fa] via-[#67e8f9] to-[#f472b6] bg-clip-text text-transparent truncate">
                  Lo más Buscado
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Minimizado · toca para ver tendencias
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-sm text-slate-400 group-hover:text-slate-200 shrink-0">
              Expandir
              <ChevronDown size={16} />
            </span>
          </button>
        ) : (
          <>
            <div className="relative mb-5">
              <div className="text-center px-10">
                <div className="inline-flex items-center justify-center gap-2 mb-1.5">
                  <TrendingUp size={22} className="text-[#67e8f9]" />
                  <h3 className="text-xl lg:text-2xl font-bold tracking-tight bg-gradient-to-r from-[#60a5fa] via-[#67e8f9] to-[#f472b6] bg-clip-text text-transparent">
                    Lo más Buscado
                  </h3>
                </div>
                <p className="text-sm lg:text-base text-slate-300 max-w-lg mx-auto leading-relaxed">
                  Información de los temas más relevantes para los usuarios
                </p>
              </div>
              <div className="absolute right-0 top-0 flex items-center gap-1">
                {minimized && (
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
                    aria-label="Minimizar tendencias"
                  >
                    <ChevronUp size={16} />
                  </button>
                )}
                <motion.button
                  type="button"
                  onClick={() => loadTrends({ manual: true })}
                  disabled={loading || refreshing}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors disabled:opacity-40"
                  aria-label="Actualizar tendencias"
                  whileHover={{ scale: 1.08, rotate: 20 }}
                  whileTap={{ scale: 0.92, rotate: -20 }}
                >
                  <motion.span
                    className="block"
                    animate={
                      refreshing || loading
                        ? { rotate: 360 }
                        : { rotate: [0, 0, 15, -15, 0] }
                    }
                    transition={
                      refreshing || loading
                        ? { duration: 0.7, repeat: Infinity, ease: 'linear' }
                        : { duration: 3.5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.7, 0.8, 0.9, 1] }
                    }
                  >
                    <RefreshCw size={16} />
                  </motion.span>
                </motion.button>
              </div>
            </div>

            {error && !hasContent && (
              <p className="text-sm text-slate-400 text-center py-2">{error}</p>
            )}

            {!error && !hasContent && !loading && (
              <p className="text-sm text-slate-400 text-center py-3">
                Aún no hay búsquedas registradas. Sea el primero en explorar un tema.
              </p>
            )}

            <AnimatePresence mode="wait">
              {hasContent && (
                <motion.div
                  key={`${popular.map((p) => p.keyword).join('|')}-${hotTopics.map((t) => `${t.category}:${t.count}`).join('|')}-${refreshKey}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5"
                >
                  <div className="text-left min-w-0">
                    <p className="text-xs lg:text-sm uppercase tracking-wider text-slate-400 mb-3 font-semibold flex items-center gap-1.5">
                      <Search size={14} className="text-[#67e8f9]" />
                      Búsquedas más realizadas
                    </p>
                    <div className="space-y-2">
                      {popular.slice(0, 5).map((item, index) => (
                        <button
                          key={item.keyword}
                          type="button"
                          disabled={disabled}
                          onClick={() => onSelectKeyword?.(item.keyword)}
                          className="w-full group flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left text-base
                                     bg-slate-800/80 border border-slate-600/50 text-slate-100
                                     hover:border-[#00f2ea]/50 hover:bg-slate-800 hover:text-white
                                     disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          title={
                            item.has_snapshot
                              ? 'Hay resultados guardados: se mostrarán al instante'
                              : 'Sin resultados guardados: se realizará una búsqueda nueva'
                          }
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700/80 text-[#67e8f9] text-sm font-bold tabular-nums shrink-0">
                            {index + 1}
                          </span>
                          <span className="flex-1 min-w-0 truncate font-medium">{item.keyword}</span>
                          {item.has_snapshot && (
                            <span className="text-[10px] uppercase tracking-wide font-semibold text-cyan-300/90 bg-cyan-500/15 border border-cyan-400/30 px-1.5 py-0.5 rounded shrink-0">
                              Guardado
                            </span>
                          )}
                          <span className="text-sm text-slate-400 group-hover:text-slate-300 tabular-nums shrink-0">
                            {item.count}
                          </span>
                        </button>
                      ))}
                      {popular.length === 0 && (
                        <p className="text-sm text-slate-500 py-2">Sin búsquedas aún</p>
                      )}
                    </div>
                  </div>

                  <div className="text-left min-w-0">
                    <p className="text-xs lg:text-sm uppercase tracking-wider text-slate-400 mb-3 font-semibold flex items-center gap-1.5">
                      <Flame size={14} className="text-orange-400" />
                      Hot topics · Ranking
                    </p>
                    <div className="space-y-2">
                      {hotTopics.map((topic, index) => {
                        const rank = topic.rank || index + 1
                        const barWidth = Math.max(8, (Number(topic.count) / maxHotCount) * 100)
                        return (
                          <Link
                            key={topic.category}
                            to={topicHref(topic)}
                            className={`block rounded-xl border bg-gradient-to-br px-3.5 py-3 transition-all
                                        hover:scale-[1.01] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#67e8f9]/60
                                        ${topicClass(topic.category)}`}
                            title={`Ver análisis histórico de ${topic.category}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <p className="text-base font-semibold capitalize truncate flex items-center gap-1.5 min-w-0">
                                <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-black/20 px-1.5 text-xs font-bold tabular-nums">
                                  #{rank}
                                </span>
                                <span className="truncate">{topic.category}</span>
                                <ExternalLink size={14} className="opacity-50 shrink-0" />
                              </p>
                              <span className="text-sm font-semibold opacity-90 shrink-0 tabular-nums">
                                {topic.share_pct}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-black/20 overflow-hidden mb-1.5">
                              <div
                                className="h-full rounded-full bg-white/50"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <p className="text-sm opacity-85">
                              {Number(topic.count).toLocaleString('es-ES')} comentarios analizados
                            </p>
                          </Link>
                        )
                      })}
                      {hotTopics.length === 0 && (
                        <p className="text-sm text-slate-500 py-2">Sin categorías aún</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

export default SearchTrendsDock

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessagesSquare, History, RefreshCw } from 'lucide-react'
import SocialHeroBackground from './SocialHeroBackground'
import TypewriterSearch from './TypewriterSearch'
import SearchTrendsDock from './SearchTrendsDock'
import UnifiedSearchResults from './UnifiedSearchResults'
import HistoricalPostsSection from './HistoricalPostsSection'
import {
  searchBothNetworks,
  logSearchEvent,
  saveSearchSnapshot,
  getSearchSnapshot,
  cancelSearch,
  createSearchId,
  getPostsByCategory,
  SearchStoppedError,
} from '../services/api'
import {
  resolveSearchCategory,
  collectCurrentPostIds,
} from '../utils/resolveSearchCategory'

const TITLE_WORDS = ['Voces', 'del', 'Pueblo', 'Ecuatoriano']
const HISTORICAL_PAGE_SIZE = 8

const wordVariants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: 0.15 + i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
}

const HeroLanding = () => {
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [facebook, setFacebook] = useState(null)
  const [tiktok, setTiktok] = useState(null)
  const [facebookError, setFacebookError] = useState(null)
  const [tiktokError, setTiktokError] = useState(null)
  const [stoppedMessage, setStoppedMessage] = useState(null)
  const [stoppedFading, setStoppedFading] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const [trendsRefreshKey, setTrendsRefreshKey] = useState(0)
  const [resolvedCategory, setResolvedCategory] = useState(null)
  const [historicalPosts, setHistoricalPosts] = useState([])
  const [historicalTotal, setHistoricalTotal] = useState(0)
  const [historicalLoading, setHistoricalLoading] = useState(false)
  const [historicalLoadingMore, setHistoricalLoadingMore] = useState(false)
  const [historicalError, setHistoricalError] = useState(null)
  const [excludePostIds, setExcludePostIds] = useState([])
  const abortRef = useRef(null)
  const historicalAbortRef = useRef(null)
  const searchIdRef = useRef(null)

  const resetHistoricalState = useCallback(() => {
    historicalAbortRef.current?.abort()
    setResolvedCategory(null)
    setHistoricalPosts([])
    setHistoricalTotal(0)
    setHistoricalLoading(false)
    setHistoricalLoadingMore(false)
    setHistoricalError(null)
    setExcludePostIds([])
  }, [])

  const fetchHistoricalPosts = useCallback(async ({
    category,
    excludeIds = [],
    offset = 0,
    append = false,
    signal = null,
  }) => {
    if (!category) return

    if (append) {
      setHistoricalLoadingMore(true)
    } else {
      setHistoricalLoading(true)
      setHistoricalError(null)
    }

    try {
      const response = await getPostsByCategory({
        category,
        limit: HISTORICAL_PAGE_SIZE,
        offset,
        excludePostIds: excludeIds,
        signal,
      })

      setResolvedCategory(response.category)
      setHistoricalTotal(response.total)
      setHistoricalPosts((current) => (
        append ? [...current, ...response.posts] : response.posts
      ))
    } catch (err) {
      if (err?.name === 'AbortError') return
      setHistoricalError(err.message || 'No se pudieron cargar los posts guardados')
      if (!append) {
        setHistoricalPosts([])
        setHistoricalTotal(0)
      }
    } finally {
      if (append) {
        setHistoricalLoadingMore(false)
      } else {
        setHistoricalLoading(false)
      }
    }
  }, [])

  const handleStop = useCallback(async () => {
    const searchId = searchIdRef.current
    if (searchId) {
      await cancelSearch(searchId)
    }
    abortRef.current?.abort()
    historicalAbortRef.current?.abort()
    resetHistoricalState()
  }, [resetHistoricalState])

  const applySearchResults = useCallback(async ({
    query,
    fbData,
    ttData,
    fbError = null,
    ttError = null,
    cached = false,
  }) => {
    setFacebook(fbData)
    setFacebookError(fbError)
    setTiktok(ttData)
    setTiktokError(ttError)
    setFromCache(cached)
    logSearchEvent({ keyword: query, source: 'unified' })
    setTrendsRefreshKey((k) => k + 1)

    if (!cached && (fbData || ttData)) {
      saveSearchSnapshot({
        keyword: query,
        source: 'unified',
        facebook: fbData,
        tiktok: ttData,
        facebook_error: fbError,
        tiktok_error: ttError,
      })
    }

    const category = resolveSearchCategory({
      keyword: query,
      facebook: fbData,
      tiktok: ttData,
    })
    const currentPostIds = collectCurrentPostIds(fbData, ttData)

    setResolvedCategory(category)
    setExcludePostIds(currentPostIds)

    const historicalController = new AbortController()
    historicalAbortRef.current = historicalController

    fetchHistoricalPosts({
      category,
      excludeIds: currentPostIds,
      signal: historicalController.signal,
    })
  }, [fetchHistoricalPosts])

  const handleSearch = useCallback(async (query, options = {}) => {
    const preferCache = Boolean(options?.preferCache)
    setKeyword(query)
    setFacebook(null)
    setTiktok(null)
    setFacebookError(null)
    setTiktokError(null)
    setStoppedMessage(null)
    setStoppedFading(false)
    setFromCache(false)
    resetHistoricalState()
    setLoading(true)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById('unified-search-results')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        })
      })
    })

    try {
      if (preferCache) {
        const snapshot = await getSearchSnapshot(query)
        if (snapshot && (snapshot.facebook || snapshot.tiktok)) {
          await applySearchResults({
            query,
            fbData: snapshot.facebook || null,
            ttData: snapshot.tiktok || null,
            fbError: snapshot.facebook_error || null,
            ttError: snapshot.tiktok_error || null,
            cached: true,
          })
          return
        }
      }

      const searchId = createSearchId()
      searchIdRef.current = searchId
      const controller = new AbortController()
      abortRef.current = controller

      const { facebook: fbResult, tiktok: ttResult } = await searchBothNetworks({
        keyword: query,
        searchId,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      await applySearchResults({
        query,
        fbData: fbResult.data,
        ttData: ttResult.data,
        fbError: fbResult.error,
        ttError: ttResult.error,
        cached: false,
      })
    } catch (err) {
      if (err?.name === 'AbortError' || err instanceof SearchStoppedError || err?.stopped) {
        setStoppedMessage('Búsqueda detenida')
        setFacebook(null)
        setTiktok(null)
        setFacebookError(null)
        setTiktokError(null)
        setFromCache(false)
        resetHistoricalState()
      } else {
        setFacebookError(err.message || 'Error en la búsqueda unificada')
      }
    } finally {
      setLoading(false)
      searchIdRef.current = null
      abortRef.current = null
    }
  }, [applySearchResults, resetHistoricalState])

  const handlePopularSelect = useCallback((query) => {
    handleSearch(query, { preferCache: true })
  }, [handleSearch])

  const handleLoadMoreHistorical = useCallback(() => {
    if (!resolvedCategory || historicalLoadingMore) return

    fetchHistoricalPosts({
      category: resolvedCategory,
      excludeIds: excludePostIds,
      offset: historicalPosts.length,
      append: true,
    })
  }, [
    resolvedCategory,
    excludePostIds,
    historicalPosts.length,
    historicalLoadingMore,
    fetchHistoricalPosts,
  ])

  useEffect(() => {
    if (!stoppedMessage) {
      setStoppedFading(false)
      return undefined
    }
    setStoppedFading(false)
    const timer = setTimeout(() => setStoppedFading(true), 5000)
    return () => clearTimeout(timer)
  }, [stoppedMessage])

  const handleStoppedFadeComplete = useCallback(() => {
    setStoppedMessage(null)
    setKeyword('')
    setStoppedFading(false)
    setFromCache(false)
    resetHistoricalState()
  }, [resetHistoricalState])

  const hasMoreHistorical = historicalPosts.length < historicalTotal

  return (
    <section
      id="hero-landing"
      className="relative z-0 w-full min-h-[92vh] flex flex-col justify-center px-4 lg:px-10 py-12 lg:py-16 pb-28 lg:pb-32 overflow-x-hidden"
    >
      <SocialHeroBackground />

      <motion.div
        className="relative max-w-5xl mx-auto w-full text-center z-10 pb-10 lg:pb-12"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-[#1877F2] via-[#00f2ea] to-[#ff0050] shadow-lg shadow-blue-900/40 mb-6"
        >
          <MessagesSquare size={28} className="text-white" strokeWidth={1.75} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-xs font-bold uppercase tracking-[0.25em] mb-4"
        >
          <span className="text-[#60a5fa]">Nuestro Territorio</span>
          <span className="text-slate-500 mx-2">·</span>
          <span className="text-[#67e8f9]">Nuestra Opinión</span>
        </motion.p>

        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-slate-100 tracking-tight leading-[1.1] mb-4">
          {TITLE_WORDS.map((word, i) => (
            <motion.span
              key={word}
              custom={i}
              variants={wordVariants}
              initial="hidden"
              animate="visible"
              className={`inline-block mr-[0.25em] ${
                i === 0
                  ? 'bg-gradient-to-r from-[#1877F2] via-[#00f2ea] to-[#ff0050] bg-clip-text text-transparent'
                  : ''
              }`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="text-slate-400 text-sm lg:text-lg max-w-2xl mx-auto mb-10"
        >
          Descubre la opinión ciudadana en{' '}
          <span className="text-[#1877F2] font-semibold">Redes</span>
          {' '}
          <span className="text-[#c9185a] font-semibold">Sociales</span>
          {' '}sobre los temas que importan a todos.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <TypewriterSearch onSearch={handleSearch} onStop={handleStop} loading={loading} />
        </motion.div>

        <UnifiedSearchResults
          keyword={keyword}
          facebook={facebook}
          tiktok={tiktok}
          facebookError={facebookError}
          tiktokError={tiktokError}
          loading={loading}
          stoppedMessage={stoppedMessage}
          stoppedFading={stoppedFading}
          onStoppedFadeComplete={handleStoppedFadeComplete}
          onStop={handleStop}
          dark
        />

        {fromCache && !loading && (facebook || tiktok) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 mx-auto max-w-3xl rounded-2xl border border-cyan-400/40
                       bg-gradient-to-r from-cyan-500/15 via-slate-900/40 to-blue-500/15
                       px-4 py-3.5 text-left shadow-lg shadow-cyan-950/20 backdrop-blur-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                                 bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-300/30">
                  <History size={20} strokeWidth={2.25} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cyan-50 leading-snug">
                    Resultados provenientes de búsquedas anteriores
                  </p>
                  <p className="text-xs text-cyan-100/75 mt-0.5 leading-relaxed">
                    Estás viendo datos ya guardados. Puedes actualizarlos para obtener información nueva.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSearch(keyword)}
                className="inline-flex items-center justify-center gap-2 shrink-0
                           px-3.5 py-2 rounded-xl text-xs font-semibold
                           text-slate-950 bg-cyan-300 hover:bg-cyan-200
                           transition-colors shadow-md shadow-cyan-900/30"
              >
                <RefreshCw size={14} strokeWidth={2.5} />
                Haz clic aquí para actualizar esta búsqueda
              </button>
            </div>
          </motion.div>
        )}

        {(resolvedCategory || historicalLoading) && (
          <HistoricalPostsSection
            category={resolvedCategory}
            keyword={keyword}
            posts={historicalPosts}
            total={historicalTotal}
            loading={historicalLoading}
            loadingMore={historicalLoadingMore}
            error={historicalError}
            hasMore={hasMoreHistorical}
            onLoadMore={handleLoadMoreHistorical}
            dark
          />
        )}

        <SearchTrendsDock
          onSelectKeyword={handlePopularSelect}
          disabled={loading}
          refreshKey={trendsRefreshKey}
          minimized={loading || Boolean(keyword)}
        />
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-slate-200/80 pointer-events-none" />
    </section>
  )
}

export default HeroLanding

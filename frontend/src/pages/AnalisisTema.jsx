import { useEffect, useState, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Smile, Meh, Frown, MessageSquare, BarChart3, MessageSquareOff, X, Sparkles } from 'lucide-react'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import PageHeader from '../components/PageHeader'
import LoadingState from '../components/LoadingState'
import SentimentBar from '../components/SentimentBar'
import EmptyState from '../components/EmptyState'
import ThemedPageShell from '../components/ThemedPageShell'
import SearchResultsGrid, { buildSentimentChartData } from '../components/SearchResultsGrid'
import TopicAnalysisTour from '../components/TopicAnalysisTour'
import MetricsPeriodFilter, {
  TOPIC_PERIOD_DESCRIPTIONS,
  METRICS_PERIOD_LABELS,
} from '../components/MetricsPeriodFilter'
import { getDashboard, getTopics, getComments } from '../services/api'
import { formatNumber } from '../utils/formatters'
import { requestTopicTourRestart } from '../utils/onboarding'

const DATE_FILTER_STORAGE_KEY = 'analisis-tema-date-filter'

const SENTIMENT_BORDER = (sentiment) => {
  const s = (sentiment || 'neutral').toLowerCase()
  if (s.startsWith('pos')) return 'border-l-emerald-500'
  if (s.startsWith('neg')) return 'border-l-red-500'
  return 'border-l-slate-400'
}

const capitalizeTopic = (name) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1) : ''

const SENTIMENT_FILTER_LABELS = {
  positivo: 'Positivos',
  negativo: 'Negativos',
  neutral: 'Neutrales',
}

const TOPIC_DESCRIPTIONS = {
  economia:
    'Opinión pública sobre la economía ecuatoriana: empleo, precios, inflación, dólar y medidas económicas del país.',
  educacion:
    'Percepción ciudadana sobre el sistema educativo, universidades, colegios y políticas de educación en Ecuador.',
  politica:
    'Comentarios sobre el gobierno, la Asamblea, elecciones y el debate político nacional en redes sociales.',
  salud:
    'Opiniones sobre el sistema de salud, hospitales, el IESS, medicinas y la atención médica en Ecuador.',
  seguridad:
    'Percepción ciudadana sobre delincuencia, policía, violencia, narcotráfico y políticas de seguridad.',
  social:
    'Comentarios sobre temas sociales, turismo, comunidad y convivencia ciudadana en el país.',
}

const getTopicDescription = (topic) => {
  if (!topic) return 'Sin descripción disponible'
  if (topic.description) return topic.description
  const key = (topic.name || '').trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return TOPIC_DESCRIPTIONS[key] || 'Sin descripción disponible'
}

const sameTopicId = (a, b) => Number(a) === Number(b)

const toISODate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getDateRangeForPeriod = (days) => {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  return { dateFrom: toISODate(from), dateTo: toISODate(to) }
}

const readStoredDateFilter = () => {
  try {
    const raw = sessionStorage.getItem(DATE_FILTER_STORAGE_KEY)
    if (!raw) return { dateFrom: '', dateTo: '', metricsPeriod: 30 }
    const parsed = JSON.parse(raw)
    const period = parsed.metricsPeriod
    const metricsPeriod =
      period === null || [0, 7, 30].includes(period) ? period : 30
    return {
      dateFrom: typeof parsed.dateFrom === 'string' ? parsed.dateFrom : '',
      dateTo: typeof parsed.dateTo === 'string' ? parsed.dateTo : '',
      metricsPeriod,
    }
  } catch {
    return { dateFrom: '', dateTo: '', metricsPeriod: 30 }
  }
}

const AnalisisTema = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const stored = useMemo(() => readStoredDateFilter(), [])
  const [topics, setTopics] = useState([])
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [metricsPeriod, setMetricsPeriod] = useState(stored.metricsPeriod)
  const [dateFrom, setDateFrom] = useState(stored.dateFrom)
  const [dateTo, setDateTo] = useState(stored.dateTo)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedSentiment, setSelectedSentiment] = useState(null)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const loadRequestId = useRef(0)
  const commentsRequestId = useRef(0)

  const hasCustomRange = Boolean(dateFrom || dateTo)

  // Persistir el filtro de fechas/periodo para toda la página (todas las categorías).
  useEffect(() => {
    try {
      sessionStorage.setItem(
        DATE_FILTER_STORAGE_KEY,
        JSON.stringify({ dateFrom, dateTo, metricsPeriod }),
      )
    } catch {
      /* ignore quota / private mode */
    }
  }, [dateFrom, dateTo, metricsPeriod])

  const handleDateFromChange = (value) => {
    setSelectedSentiment(null)
    setMetricsPeriod(null)
    setDateFrom(value)
    if (value && dateTo && value > dateTo) {
      setDateTo(value)
    }
  }

  const handleDateToChange = (value) => {
    setSelectedSentiment(null)
    setMetricsPeriod(null)
    setDateTo(value)
    if (value && dateFrom && value < dateFrom) {
      setDateFrom(value)
    }
  }

  const handlePeriodChange = (days) => {
    setSelectedSentiment(null)
    setMetricsPeriod(days)
    if (days === 0) {
      setDateFrom('')
      setDateTo('')
      return
    }
    const range = getDateRangeForPeriod(days)
    setDateFrom(range.dateFrom)
    setDateTo(range.dateTo)
  }

  const handleClearDates = () => {
    setSelectedSentiment(null)
    setDateFrom('')
    setDateTo('')
    setMetricsPeriod(30)
  }

  // Cargar temas una sola vez; sincronizar selección desde la URL sin re-fetch.
  useEffect(() => {
    let cancelled = false

    const loadTopics = async () => {
      try {
        const topicsData = await getTopics()
        if (cancelled) return

        setTopics(topicsData)

        const topicIdFromUrl = searchParams.get('topic')
        const nameFromUrl = searchParams.get('name') || searchParams.get('categoria')

        let nextTopic = null
        if (topicIdFromUrl) {
          nextTopic = topicsData.find((t) => sameTopicId(t.id, topicIdFromUrl)) || null
        }
        if (!nextTopic && nameFromUrl) {
          const target = nameFromUrl.trim().toLowerCase()
          nextTopic = topicsData.find((t) => (t.name || '').trim().toLowerCase() === target) || null
        }
        if (!nextTopic && topicsData.length > 0) {
          nextTopic = topicsData[0]
        }

        if (nextTopic) {
          setSelectedTopic((prev) =>
            prev && sameTopicId(prev.id, nextTopic.id) ? prev : nextTopic,
          )
          const desired = String(nextTopic.id)
          if (searchParams.get('topic') !== desired) {
            setSearchParams({ topic: desired }, { replace: true })
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    loadTopics()
    return () => {
      cancelled = true
    }
    // Solo al montar: la URL se sincroniza en handleTopicChange / al resolver name→id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Si el usuario llega con ?topic= desde otra página (hot topics), sincronizar sin recargar la lista.
  useEffect(() => {
    const topicIdFromUrl = searchParams.get('topic')
    if (!topicIdFromUrl || topics.length === 0) return

    const topic = topics.find((t) => sameTopicId(t.id, topicIdFromUrl))
    if (!topic) return

    setSelectedTopic((prev) =>
      prev && sameTopicId(prev.id, topic.id) ? prev : topic,
    )
  }, [searchParams, topics])

  // Limpiar filtro de sentimiento al cambiar de tema (URL o pills).
  const topicParam = searchParams.get('topic')
  useEffect(() => {
    setSelectedSentiment(null)
  }, [topicParam])

  // Cargar métricas del dashboard (independiente del filtro de sentimiento).
  useEffect(() => {
    if (!selectedTopic) return

    const topicId = selectedTopic.id
    const requestId = ++loadRequestId.current
    const daysForQuery = hasCustomRange ? 0 : (metricsPeriod ?? 30)
    const startDate = dateFrom || null
    const endDate = dateTo || null

    const loadDashboard = async () => {
      try {
        setLoading(true)
        setError(null)

        const dashboard = await getDashboard(daysForQuery, {
          topicId,
          start_date: startDate,
          end_date: endDate,
        })

        if (requestId !== loadRequestId.current) return
        setDashboardData(dashboard)
      } catch (err) {
        if (requestId !== loadRequestId.current) return
        setError(err.message)
      } finally {
        if (requestId === loadRequestId.current) {
          setLoading(false)
        }
      }
    }

    loadDashboard()
  }, [selectedTopic?.id, metricsPeriod, dateFrom, dateTo, hasCustomRange, reloadToken])

  // Cargar comentarios: con filtro de sentimiento en el API (máx. 50).
  useEffect(() => {
    if (!selectedTopic) return

    const topicId = selectedTopic.id
    const requestId = ++commentsRequestId.current
    const daysForQuery = hasCustomRange ? 0 : (metricsPeriod ?? 30)
    const startDate = dateFrom || null
    const endDate = dateTo || null

    const loadComments = async () => {
      try {
        setCommentsLoading(true)

        const commentsData = await getComments({
          topicId,
          days: daysForQuery,
          limit: 50,
          start_date: startDate,
          end_date: endDate,
          sentiment: selectedSentiment || undefined,
        })

        if (requestId !== commentsRequestId.current) return
        setComments(Array.isArray(commentsData) ? commentsData : [])
      } catch (err) {
        if (requestId !== commentsRequestId.current) return
        setError(err.message)
      } finally {
        if (requestId === commentsRequestId.current) {
          setCommentsLoading(false)
        }
      }
    }

    loadComments()
  }, [
    selectedTopic?.id,
    metricsPeriod,
    dateFrom,
    dateTo,
    hasCustomRange,
    reloadToken,
    selectedSentiment,
  ])

  const handleTopicChange = (topicId) => {
    const topic = topics.find((t) => sameTopicId(t.id, topicId))
    if (!topic) return

    setSelectedSentiment(null)
    setSelectedTopic((prev) =>
      prev && sameTopicId(prev.id, topic.id) ? prev : topic,
    )
    // Solo cambia el tema en la URL; el filtro de fechas/periodo se mantiene.
    setSearchParams({ topic: String(topic.id) }, { replace: true })
  }

  const metrics = useMemo(() => {
    if (!dashboardData?.sentiment_distribution) {
      return {
        total: 0, positive: 0, neutral: 0, negative: 0,
        positivePercent: 0, neutralPercent: 0, negativePercent: 0,
      }
    }

    const dist = dashboardData.sentiment_distribution
    const positive = dist.positive || 0
    const neutral = dist.neutral || 0
    const negative = dist.negative || 0
    const total = positive + neutral + negative

    return {
      total,
      positive,
      neutral,
      negative,
      positivePercent: total > 0 ? ((positive / total) * 100).toFixed(1) : 0,
      neutralPercent: total > 0 ? ((neutral / total) * 100).toFixed(1) : 0,
      negativePercent: total > 0 ? ((negative / total) * 100).toFixed(1) : 0,
    }
  }, [dashboardData])

  const { barData, pieData } = buildSentimentChartData({
    positive: metrics.positive,
    negative: metrics.negative,
    neutral: metrics.neutral,
  })

  const dominantSentiment =
    metrics.positive >= metrics.negative && metrics.positive >= metrics.neutral ? 'positivo'
      : metrics.negative >= metrics.positive && metrics.negative >= metrics.neutral ? 'negativo'
        : 'neutral'

  const periodLabel = useMemo(() => {
    if (dateFrom && dateTo) {
      const from = new Date(`${dateFrom}T00:00:00`).toLocaleDateString('es-ES')
      const to = new Date(`${dateTo}T00:00:00`).toLocaleDateString('es-ES')
      return `Del ${from} al ${to}`
    }
    if (dateFrom) {
      return `Desde el ${new Date(`${dateFrom}T00:00:00`).toLocaleDateString('es-ES')}`
    }
    if (dateTo) {
      return `Hasta el ${new Date(`${dateTo}T00:00:00`).toLocaleDateString('es-ES')}`
    }
    return METRICS_PERIOD_LABELS[metricsPeriod] ?? METRICS_PERIOD_LABELS[30]
  }, [dateFrom, dateTo, metricsPeriod])

  const topicDescription = useMemo(() => {
    const topicName = selectedTopic ? capitalizeTopic(selectedTopic.name) : 'el tema seleccionado'
    if (dateFrom && dateTo) {
      const from = new Date(`${dateFrom}T00:00:00`).toLocaleDateString('es-ES')
      const to = new Date(`${dateTo}T00:00:00`).toLocaleDateString('es-ES')
      return `Análisis detallado de sentimientos para ${topicName} — del ${from} al ${to}`
    }
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00`).toLocaleDateString('es-ES')
      return `Análisis detallado de sentimientos para ${topicName} — desde el ${from}`
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T00:00:00`).toLocaleDateString('es-ES')
      return `Análisis detallado de sentimientos para ${topicName} — hasta el ${to}`
    }
    return TOPIC_PERIOD_DESCRIPTIONS[metricsPeriod] || TOPIC_PERIOD_DESCRIPTIONS[30]
  }, [dateFrom, dateTo, metricsPeriod, selectedTopic])

  const emptyPeriodHint = hasCustomRange
    ? `No hay análisis guardados para ${selectedTopic ? capitalizeTopic(selectedTopic.name) : 'este tema'} en el período ${periodLabel.toLowerCase()}. El filtro de fechas sigue activo para todas las categorías; pruebe ampliar el rango o limpie las fechas.`
    : `No hay comentarios para este tema en el período seleccionado (${periodLabel}).`

  if (loading && !selectedTopic) {
    return (
      <ThemedPageShell theme="topics">
        <LoadingState message="Cargando temas…" dark />
      </ThemedPageShell>
    )
  }

  if (error && !selectedTopic) {
    return (
      <ThemedPageShell theme="topics">
        <div className="bg-red-500/15 border border-red-400/40 backdrop-blur-sm p-6 rounded-2xl">
          <h3 className="text-red-100 font-semibold mb-2">Error al cargar los datos</h3>
          <p className="text-red-200 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary mt-4"
          >
            Reintentar
          </button>
        </div>
      </ThemedPageShell>
    )
  }

  const topicPills = (
    <div id="tour-topic-pills" className="flex flex-wrap gap-2">
      {topics.map((topic) => {
        const isSelected = sameTopicId(selectedTopic?.id, topic.id)
        return (
          <button
            key={topic.id}
            type="button"
            onClick={() => handleTopicChange(String(topic.id))}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              isSelected
                ? 'bg-[#67e8f9]/20 text-[#a5f3fc] border border-[#67e8f9]/45 shadow-sm'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/60 hover:text-slate-200'
            }`}
          >
            {capitalizeTopic(topic.name)}
          </button>
        )
      })}
    </div>
  )

  return (
    <ThemedPageShell theme="topics">
      <PageHeader
        dark
        filterBelowTitle
        title="Análisis por tema"
        description={topicDescription}
        titleAction={
          <button
            type="button"
            onClick={requestTopicTourRestart}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shrink-0
                       text-[11px] lg:text-xs font-semibold text-[#a5f3fc]
                       bg-slate-900/75 border border-[#67e8f9]/35 backdrop-blur-md
                       hover:bg-slate-800/90 hover:border-[#67e8f9]/55 hover:text-white
                       shadow-lg shadow-black/20 transition-colors mr-14 lg:mr-16"
            aria-label="Reiniciar tutorial de análisis por tema"
          >
            <Sparkles size={13} strokeWidth={2.25} />
            Tutorial
          </button>
        }
        filter={
          <div id="tour-topic-filters" className="space-y-2">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-200"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-200"
                />
              </div>
              {hasCustomRange && (
                <button
                  type="button"
                  onClick={handleClearDates}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 border border-slate-600/60 hover:text-white hover:border-slate-500 transition-colors"
                >
                  Limpiar fechas
                </button>
              )}
            </div>

            <MetricsPeriodFilter
              value={metricsPeriod}
              onChange={handlePeriodChange}
              dark
            />
            {hasCustomRange && (
              <p className="text-xs text-slate-400">
                Filtro de fechas activo para todas las categorías: {periodLabel}
              </p>
            )}
          </div>
        }
        action={topics.length > 0 ? topicPills : null}
      />
      {loading && selectedTopic && (
        <LoadingState message={`Cargando datos de ${capitalizeTopic(selectedTopic.name)}…`} dark />
      )}

      {error && selectedTopic && !loading && (
        <div className="bg-red-500/15 border border-red-400/40 backdrop-blur-sm p-6 rounded-2xl">
          <h3 className="text-red-100 font-semibold mb-2">Error al cargar los datos</h3>
          <p className="text-red-200 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className="btn-primary mt-4"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && selectedTopic && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
            <StatCard title="Total de comentarios" value={formatNumber(metrics.total)} icon={MessageSquare} color="primary" index={0} />
            <StatCard title="Comentarios positivos" value={`${metrics.positivePercent}%`} subtitle={`${formatNumber(metrics.positive)} comentarios`} icon={Smile} color="positive" index={1} />
            <StatCard title="Comentarios neutrales" value={`${metrics.neutralPercent}%`} subtitle={`${formatNumber(metrics.neutral)} comentarios`} icon={Meh} color="neutral" index={2} />
            <StatCard title="Comentarios negativos" value={`${metrics.negativePercent}%`} subtitle={`${formatNumber(metrics.negative)} comentarios`} icon={Frown} color="negative" index={3} />
          </div>

          <div id="tour-topic-results">
            <SearchResultsGrid
            barData={barData}
            pieData={pieData}
            showCharts={metrics.total > 0}
            selectedSentiment={selectedSentiment}
            onSentimentSelect={setSelectedSentiment}
            contentTitle={`Resumen — ${capitalizeTopic(selectedTopic.name)}`}
            contentChildren={
              <div className="space-y-4 p-1">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-[#67e8f9]" />
                  <div>
                    <h4 className="font-bold text-slate-900">
                      {capitalizeTopic(selectedTopic.name)}
                    </h4>
                    <p className="text-sm text-slate-800">{getTopicDescription(selectedTopic)}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-900 font-medium">Sentimiento dominante</span>
                    <Badge sentiment={dominantSentiment} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-900 font-medium">Total de publicaciones analizadas</span>
                    <span className="font-semibold text-slate-900">{formatNumber(dashboardData?.total_posts || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-900 font-medium">Período</span>
                    <span className="text-slate-900 font-medium">{periodLabel}</span>
                  </div>
                </div>
                {metrics.total === 0 ? (
                  <p className="text-sm text-slate-600 leading-relaxed">{emptyPeriodHint}</p>
                ) : (
                  <SentimentBar
                    positivePercent={Number(metrics.positivePercent)}
                    neutralPercent={Number(metrics.neutralPercent)}
                    negativePercent={Number(metrics.negativePercent)}
                  />
                )}
              </div>
            }
            commentsTitle={
              selectedSentiment
                ? `Últimos ${comments.length} comentarios ${SENTIMENT_FILTER_LABELS[selectedSentiment]} relacionados a ${capitalizeTopic(selectedTopic.name)}`
                : `Últimos ${comments.length} comentarios relacionados a ${capitalizeTopic(selectedTopic.name)}`
            }
            commentsChildren={
              <>
                {selectedSentiment && (
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs text-slate-600">
                      Filtro activo: solo comentarios {SENTIMENT_FILTER_LABELS[selectedSentiment]}
                      {comments.length >= 50 ? ' (máx. 50)' : ''}
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
                {commentsLoading ? (
                  <p className="text-sm text-slate-600 py-6 text-center">
                    Cargando comentarios{selectedSentiment ? ` ${SENTIMENT_FILTER_LABELS[selectedSentiment]}` : ''}…
                  </p>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`rounded-xl p-3 border border-white/50 bg-white/55 backdrop-blur-sm border-l-4 ${SENTIMENT_BORDER(comment.sentiment?.sentiment)}`}
                    >
                      <p className="text-sm text-slate-900 font-medium mb-2 line-clamp-3">
                        {comment.cleaned_text || comment.original_text}
                      </p>
                      <div className="flex items-center justify-between text-xs gap-2">
                        <Badge sentiment={comment.sentiment?.sentiment || 'neutral'} />
                        <span className="text-slate-700 shrink-0">
                          {new Date(comment.comment_time || comment.collected_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={MessageSquareOff}
                    title={selectedSentiment ? 'Sin comentarios con este filtro' : 'Sin comentarios'}
                    description={
                      selectedSentiment
                        ? `No hay comentarios ${SENTIMENT_FILTER_LABELS[selectedSentiment]} para este tema en el período seleccionado.`
                        : emptyPeriodHint
                    }
                  />
                )}
              </>
            }
          />
          </div>
        </>
      )}

      <TopicAnalysisTour enabled={!loading && !!selectedTopic && topics.length > 0} />
    </ThemedPageShell>
  )
}

export default AnalisisTema

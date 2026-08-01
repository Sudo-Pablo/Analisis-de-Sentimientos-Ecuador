import { useEffect, useState, useMemo, useCallback } from 'react'
import { Smile, Meh, Frown, MessageSquare } from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { AnimatePresence, motion } from 'framer-motion'
import HeroLanding from '../components/HeroLanding'
import HeroScrollCue from '../components/HeroScrollCue'
import OnboardingTour from '../components/OnboardingTour'
import {
  METRICS_SECTION_ID,
  OPEN_METRICS_EVENT,
  scrollToMetricsElement,
} from '../utils/smoothScroll'
import StatCard from '../components/StatCard'
import ChartCard from '../components/ChartCard'
import Badge from '../components/Badge'
import PageHeader from '../components/PageHeader'
import MetricsPeriodFilter, { METRICS_PERIOD_DESCRIPTIONS } from '../components/MetricsPeriodFilter'
import LoadingState from '../components/LoadingState'
import { getDashboard } from '../services/api'
import { formatNumber } from '../utils/formatters'
import { useFilters } from '../context/FilterContext'

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

const METRICS_BG_STYLE = {
  background: `
    radial-gradient(ellipse 90% 55% at 15% 0%, rgba(24, 119, 242, 0.14), transparent 52%),
    radial-gradient(ellipse 70% 45% at 85% 2%, rgba(255, 0, 80, 0.1), transparent 48%),
    radial-gradient(ellipse 80% 50% at 50% 8%, rgba(103, 232, 249, 0.08), transparent 55%),
    linear-gradient(
      to bottom,
      #121826 0%,
      #141c2e 10%,
      #1a2438 22%,
      #1e2a40 35%,
      #243048 46%,
      #2a3650 55%,
      #3d4f68 62%,
      #5a6d86 72%,
      #7d8fa3 82%,
      #a8b4c4 90%,
      #d0d8e4 96%,
      #eef2f7 100%
    )
  `,
}

const TOPIC_BAR_COLORS = {
  Politica: '#1877F2',
  Economia: '#f59e0b',
  Salud: '#10b981',
  Seguridad: '#f43f5e',
  Educacion: '#8b5cf6',
  Social: '#f97316',
}

const SENTIMENT_PIE_COLORS = {
  Positivo: '#10b981',
  Neutral: '#94a3b8',
  Negativo: '#ef4444',
}

const topicBarColor = (name) => {
  if (!name) return '#94a3b8'
  const key = Object.keys(TOPIC_BAR_COLORS).find(
    (k) => k.toLowerCase() === String(name).trim().toLowerCase(),
  )
  return TOPIC_BAR_COLORS[key] || '#94a3b8'
}

const renderSentimentPieLabel = ({ cx, cy, midAngle, outerRadius, name, percent, value }) => {
  if (!value) return null
  const RADIAN = Math.PI / 180
  const radius = outerRadius * 1.18
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const pct = ((percent || 0) * 100).toFixed(0)
  return (
    <text
      x={x}
      y={y}
      fill="#0f172a"
      fontSize={12}
      fontWeight={600}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
    >
      {`${name} ${value} (${pct}%)`}
    </text>
  )
}

const Dashboard = () => {
  const { filters, updateFilter } = useFilters()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [metricsPeriod, setMetricsPeriod] = useState(30)
  const [metricsExpanded, setMetricsExpanded] = useState(false)

  const hasCustomRange = Boolean(filters.dateFrom || filters.dateTo)

  const handleDateFromChange = (value) => {
    // Edición manual: deja de ser un preset de período.
    setMetricsPeriod(null)
    updateFilter('dateFrom', value)
    // Si "desde" queda después de "hasta", ajustar "hasta" para mantener coherencia.
    if (value && filters.dateTo && value > filters.dateTo) {
      updateFilter('dateTo', value)
    }
  }

  const handleDateToChange = (value) => {
    setMetricsPeriod(null)
    updateFilter('dateTo', value)
    // Si "hasta" queda antes de "desde", ajustar "desde" para mantener coherencia.
    if (value && filters.dateFrom && value < filters.dateFrom) {
      updateFilter('dateFrom', value)
    }
  }

  const handlePeriodChange = (days) => {
    setMetricsPeriod(days)
    if (days === 0) {
      updateFilter('dateFrom', '')
      updateFilter('dateTo', '')
      return
    }
    const { dateFrom, dateTo } = getDateRangeForPeriod(days)
    updateFilter('dateFrom', dateFrom)
    updateFilter('dateTo', dateTo)
  }

  const handleClearDates = () => {
    updateFilter('dateFrom', '')
    updateFilter('dateTo', '')
    setMetricsPeriod(30)
  }

  const openMetrics = useCallback((shouldScroll = true) => {
    setMetricsExpanded(true)
    if (shouldScroll) {
      requestAnimationFrame(() => {
        setTimeout(() => scrollToMetricsElement(), 80)
      })
    }
  }, [])

  const toggleMetrics = useCallback(() => {
    setMetricsExpanded((prev) => {
      const next = !prev
      if (next) {
        requestAnimationFrame(() => {
          setTimeout(() => scrollToMetricsElement(), 80)
        })
      }
      return next
    })
  }, [])

  useEffect(() => {
    const onOpenMetrics = (event) => {
      openMetrics(event.detail?.scroll !== false)
    }
    window.addEventListener(OPEN_METRICS_EVENT, onOpenMetrics)
    return () => window.removeEventListener(OPEN_METRICS_EVENT, onOpenMetrics)
  }, [openMetrics])

  useEffect(() => {
    if (!metricsExpanded) return
    loadData()
  }, [metricsExpanded, filters.socialNetwork, filters.topic, filters.dateFrom, filters.dateTo, metricsPeriod])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Con rango personalizado: days=0 (no limitar por botones) + start/end.
      // Sin rango: usar el período de los 3 botones.
      const apiFilters = {
        platform: filters.socialNetwork,
        topicId: filters.topic,
        start_date: filters.dateFrom || null,
        end_date: filters.dateTo || null,
      }

      const daysForQuery = hasCustomRange ? 0 : (metricsPeriod ?? 30)
      const dashboard = await getDashboard(daysForQuery, apiFilters)
      setDashboardData(dashboard)
    } catch (err) {
      console.error('Error al cargar datos:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Los datos ya vienen filtrados del backend (plataforma, tema y fechas).
  const filteredData = useMemo(() => {
    if (!dashboardData) {
      return {
        recentComments: [],
        topicsBreakdown: [],
        sentimentDistribution: { positive: 0, negative: 0, neutral: 0, total: 0 },
        totalComments: 0,
        totalPosts: 0,
        socialNetworks: []
      }
    }

    const positive = dashboardData.sentiment_distribution?.positive || 0
    const negative = dashboardData.sentiment_distribution?.negative || 0
    const neutral = dashboardData.sentiment_distribution?.neutral || 0
    // Siempre la suma de los tres etiquetados (también con filtros de fecha).
    const total = positive + negative + neutral
    const sentimentDistribution = { positive, negative, neutral, total }

    return {
      recentComments: dashboardData.recent_comments || [],
      topicsBreakdown: dashboardData.topics_breakdown || [],
      sentimentDistribution,
      totalComments: total,
      totalPosts: dashboardData.total_posts || 0,
      socialNetworks: dashboardData.social_networks || []
    }
  }, [dashboardData])

  const metricsDescription = useMemo(() => {
    if (filters.dateFrom && filters.dateTo) {
      const from = new Date(`${filters.dateFrom}T00:00:00`).toLocaleDateString('es-ES')
      const to = new Date(`${filters.dateTo}T00:00:00`).toLocaleDateString('es-ES')
      return `Resumen histórico de sentimientos en redes sociales — del ${from} al ${to}`
    }
    if (filters.dateFrom) {
      const from = new Date(`${filters.dateFrom}T00:00:00`).toLocaleDateString('es-ES')
      return `Resumen histórico de sentimientos en redes sociales — desde el ${from}`
    }
    if (filters.dateTo) {
      const to = new Date(`${filters.dateTo}T00:00:00`).toLocaleDateString('es-ES')
      return `Resumen histórico de sentimientos en redes sociales — hasta el ${to}`
    }
    return METRICS_PERIOD_DESCRIPTIONS[metricsPeriod] || METRICS_PERIOD_DESCRIPTIONS[30]
  }, [filters.dateFrom, filters.dateTo, metricsPeriod])

  const kpis = dashboardData ? {
    positive: { 
      value: formatNumber(filteredData.sentimentDistribution?.positive || 0),
      change: 0
    },
    neutral: { 
      value: formatNumber(filteredData.sentimentDistribution?.neutral || 0),
      change: 0
    },
    negative: { 
      value: formatNumber(filteredData.sentimentDistribution?.negative || 0),
      change: 0
    },
    total: { 
      value: formatNumber(filteredData.totalComments || 0),
      change: 0
    }
  } : null

  const getSentimentBorder = (sentiment) => {
    const s = (sentiment || 'neutral').toLowerCase()
    if (s.startsWith('pos')) return 'border-l-emerald-500'
    if (s.startsWith('neg')) return 'border-l-red-500'
    return 'border-l-slate-400'
  }

  const sentimentPieData = useMemo(() => {
    const dist = filteredData.sentimentDistribution
    return [
      { name: 'Positivo', value: dist.positive || 0, color: SENTIMENT_PIE_COLORS.Positivo },
      { name: 'Neutral', value: dist.neutral || 0, color: SENTIMENT_PIE_COLORS.Neutral },
      { name: 'Negativo', value: dist.negative || 0, color: SENTIMENT_PIE_COLORS.Negativo },
    ].filter((d) => d.value > 0)
  }, [filteredData.sentimentDistribution])

  return (
    <div className="relative">
      <OnboardingTour />
      <HeroLanding />

      <section
        id="dashboard-metrics"
        className={`relative z-20 scroll-mt-24 ${
          metricsExpanded ? '-mt-20 lg:-mt-28' : '-mt-10 lg:-mt-14 pb-10'
        }`}
      >
        <div className="relative z-30 flex justify-center w-full px-4 pt-2 pb-4">
          <HeroScrollCue expanded={metricsExpanded} onToggle={toggleMetrics} />
        </div>

        <AnimatePresence initial={false}>
          {metricsExpanded && (
            <motion.div
              id={METRICS_SECTION_ID}
              key="metrics-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mx-4 lg:mx-10 rounded-t-[2rem] lg:rounded-t-[2.5rem] overflow-hidden
                         shadow-[0_-24px_64px_rgba(15,23,42,0.45)] border-t border-slate-700/40 scroll-mt-24"
            >
        <div
          id="tour-metrics-overview"
          className="pt-8 lg:pt-10 pb-8 lg:pb-12 px-4 lg:px-10 space-y-5 lg:space-y-8"
          style={METRICS_BG_STYLE}
        >
        <PageHeader
          dark
          filter={
            <div id="tour-metrics-filters" className="space-y-2">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    max={filters.dateTo || undefined}
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
                    value={filters.dateTo}
                    min={filters.dateFrom || undefined}
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
            </div>
          }
          title="Resumen Histórico"
          description={metricsDescription}
        />

        {loading && <LoadingState message="Cargando métricas..." dark />}

        {error && (
          <div className="card-base border-l-4 border-l-red-500 p-6">
            <h3 className="text-red-800 font-semibold mb-2">Error al cargar datos</h3>
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={loadData} className="btn-primary mt-4 bg-red-600 hover:from-red-600 hover:to-red-700">
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && kpis && (
          <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        <StatCard title="Comentarios Positivos" value={kpis.positive.value} change={kpis.positive.change} icon={Smile} color="positive" index={0} />
        <StatCard title="Comentarios Neutrales" value={kpis.neutral.value} change={kpis.neutral.change} icon={Meh} color="neutral" index={1} />
        <StatCard title="Comentarios Negativos" value={kpis.negative.value} change={kpis.negative.change} icon={Frown} color="negative" index={2} />
        <StatCard title="Total Comentarios" value={kpis.total.value} change={kpis.total.change} icon={MessageSquare} color="primary" index={3} />
      </div>

      {/* Gráficos (izquierda) + comentarios (derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 lg:items-start">
        <div className="flex flex-col gap-4 lg:gap-6">
          <ChartCard title="Distribución de Sentimientos" delay={0.1} muted>
            {sentimentPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart margin={{ top: 20, right: 28, bottom: 20, left: 28 }}>
                  <Pie
                    data={sentimentPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderSentimentPieLabel}
                    outerRadius={90}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {sentimentPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      const total = filteredData.sentimentDistribution.total || 0
                      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                      return [`${value} (${pct}%)`, name]
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-sm text-slate-700 font-medium">
                No hay comentarios en este período.
              </div>
            )}
          </ChartCard>

          <ChartCard title="Distribución de Comentarios por Tema" delay={0.15} muted>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={filteredData.topicsBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.35)" />
                <XAxis
                  dataKey="topic_name"
                  tick={{ fontSize: 11, fill: '#0f172a', fontWeight: 600 }}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }} />
                <Tooltip />
                <Bar dataKey="total" name="Comentarios" radius={[4, 4, 0, 0]}>
                  {(filteredData.topicsBreakdown || []).map((entry) => (
                    <Cell
                      key={`topic-bar-${entry.topic_id || entry.topic_name}`}
                      fill={topicBarColor(entry.topic_name)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard
          title="Comentarios Recientes Analizados"
          delay={0.2}
          muted
        >
          <div className="space-y-3 max-h-[44rem] overflow-y-auto scrollbar-hide pr-1">
            {filteredData.recentComments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-xl p-3 border border-white/50 bg-white/55 backdrop-blur-sm border-l-4 ${getSentimentBorder(comment.sentiment?.sentiment)}`}
              >
                <p className="text-sm text-slate-900 font-medium mb-2 line-clamp-3">
                  {comment.cleaned_text || comment.original_text}
                </p>
                <div className="flex items-center justify-between text-xs gap-2">
                  <Badge sentiment={comment.sentiment?.sentiment || 'neutral'} />
                  <span className="text-slate-800 font-medium shrink-0">
                    {new Date(comment.comment_time || comment.collected_at).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>
            ))}
            {filteredData.recentComments.length === 0 && (
              <p className="text-sm text-slate-800 font-medium text-center py-8">No hay comentarios en este período.</p>
            )}
          </div>
        </ChartCard>
      </div>          </>
        )}
        </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}

export default Dashboard